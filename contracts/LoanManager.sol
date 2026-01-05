// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./AssetToken.sol";

/**
 * @title LoanManager
 * @dev Manages loan creation, repayment, and liquidation
 * Coordinates between borrowers, lenders, and asset collateral
 */
contract LoanManager is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Loan status enum
    enum LoanStatus {
        Active,
        Repaid,
        Liquidated,
        Defaulted
    }

    // Loan structure
    struct Loan {
        uint256 loanId;
        address borrower;
        address lender;
        uint256 assetTokenId;
        uint256 principal;           // Loan amount
        uint256 interestRate;        // Annual interest rate in basis points (e.g., 1000 = 10%)
        uint256 duration;            // Loan duration in seconds
        uint256 startTime;           // When loan was created
        uint256 totalRepayment;      // Principal + interest
        uint256 amountRepaid;        // Amount paid back so far
        LoanStatus status;
        address stablecoin;          // Address of stablecoin used (USDT, MNT, etc.)
    }

    // State variables
    AssetToken public assetToken;
    uint256 private _nextLoanId;

    // Mapping from loan ID to loan details
    mapping(uint256 => Loan) public loans;

    // Mapping from borrower to their loan IDs
    mapping(address => uint256[]) public borrowerLoans;

    // Mapping from asset token ID to loan ID (for tracking collateral)
    mapping(uint256 => uint256) public assetToLoan;

    // Supported stablecoins
    mapping(address => bool) public supportedStablecoins;

    // Platform fee (in basis points, e.g., 100 = 1%)
    uint256 public platformFee;
    address public feeRecipient;

    // Liquidation threshold (days after loan expiry before liquidation)
    uint256 public liquidationGracePeriod = 7 days;

    // Events
    event LoanCreated(
        uint256 indexed loanId,
        address indexed borrower,
        address indexed lender,
        uint256 assetTokenId,
        uint256 principal,
        uint256 interestRate,
        uint256 duration
    );
    event LoanFunded(uint256 indexed loanId, address indexed lender, uint256 amount);
    event RepaymentMade(uint256 indexed loanId, address indexed borrower, uint256 amount, uint256 remaining);
    event LoanRepaid(uint256 indexed loanId, address indexed borrower);
    event LoanLiquidated(uint256 indexed loanId, address indexed liquidator, uint256 assetTokenId);
    event StablecoinAdded(address indexed stablecoin);
    event StablecoinRemoved(address indexed stablecoin);

    constructor(
        address _assetToken,
        address _feeRecipient,
        uint256 _platformFee
    ) Ownable(msg.sender) {
        require(_assetToken != address(0), "Invalid asset token address");
        require(_feeRecipient != address(0), "Invalid fee recipient");
        require(_platformFee <= 1000, "Platform fee too high"); // Max 10%

        assetToken = AssetToken(_assetToken);
        feeRecipient = _feeRecipient;
        platformFee = _platformFee;
    }

    /**
     * @dev Add supported stablecoin
     */
    function addSupportedStablecoin(address stablecoin) external onlyOwner {
        require(stablecoin != address(0), "Invalid stablecoin address");
        supportedStablecoins[stablecoin] = true;
        emit StablecoinAdded(stablecoin);
    }

    /**
     * @dev Remove supported stablecoin
     */
    function removeSupportedStablecoin(address stablecoin) external onlyOwner {
        supportedStablecoins[stablecoin] = false;
        emit StablecoinRemoved(stablecoin);
    }

    /**
     * @dev Create a loan request
     * @param assetTokenId The NFT token ID representing the collateral
     * @param principal The amount to borrow
     * @param interestRate Annual interest rate in basis points
     * @param duration Loan duration in seconds
     * @param stablecoin Address of stablecoin to borrow
     */
    function createLoan(
        uint256 assetTokenId,
        uint256 principal,
        uint256 interestRate,
        uint256 duration,
        address stablecoin
    ) external nonReentrant returns (uint256) {
        require(supportedStablecoins[stablecoin], "Stablecoin not supported");
        require(principal > 0, "Principal must be greater than 0");
        require(duration > 0, "Duration must be greater than 0");
        require(interestRate <= 10000, "Interest rate too high"); // Max 100%

        // Verify borrower owns the asset
        require(assetToken.ownerOf(assetTokenId) == msg.sender, "Not asset owner");

        // Verify asset is not already locked
        AssetToken.Asset memory asset = assetToken.getAsset(assetTokenId);
        require(!asset.isLocked, "Asset already locked");

        // Verify loan amount doesn't exceed max LTV
        uint256 maxLoanAmount = assetToken.getMaxLoanAmount(assetTokenId);
        require(principal <= maxLoanAmount, "Loan exceeds max LTV");

        // Calculate total repayment (principal + interest)
        uint256 interest = (principal * interestRate * duration) / (10000 * 365 days);
        uint256 totalRepayment = principal + interest;

        // Create loan
        uint256 loanId = _nextLoanId++;

        loans[loanId] = Loan({
            loanId: loanId,
            borrower: msg.sender,
            lender: address(0), // Will be set when funded
            assetTokenId: assetTokenId,
            principal: principal,
            interestRate: interestRate,
            duration: duration,
            startTime: 0, // Will be set when funded
            totalRepayment: totalRepayment,
            amountRepaid: 0,
            status: LoanStatus.Active,
            stablecoin: stablecoin
        });

        borrowerLoans[msg.sender].push(loanId);
        assetToLoan[assetTokenId] = loanId;

        // Lock the asset
        assetToken.lockAsset(assetTokenId, loanId);

        emit LoanCreated(
            loanId,
            msg.sender,
            address(0),
            assetTokenId,
            principal,
            interestRate,
            duration
        );

        return loanId;
    }

    /**
     * @dev Create a loan with lazy minting - mints asset NFT and creates loan in one transaction
     * @param assetType Type of asset (e.g., "smartphone", "car", "laptop")
     * @param aiValuation AI-determined asset value (scaled by 1e18)
     * @param maxLTV Maximum loan-to-value ratio in basis points
     * @param uri IPFS or metadata URI for the asset
     * @param principal The amount to borrow
     * @param interestRate Annual interest rate in basis points
     * @param duration Loan duration in seconds
     * @param stablecoin Address of stablecoin to borrow
     */
    function createLoanWithMinting(
        string memory assetType,
        uint256 aiValuation,
        uint256 maxLTV,
        string memory uri,
        uint256 principal,
        uint256 interestRate,
        uint256 duration,
        address stablecoin
    ) external nonReentrant returns (uint256 loanId, uint256 tokenId) {
        require(supportedStablecoins[stablecoin], "Stablecoin not supported");
        require(principal > 0, "Principal must be greater than 0");
        require(duration > 0, "Duration must be greater than 0");
        require(interestRate <= 10000, "Interest rate too high"); // Max 100%

        // Step 1: Mint the asset NFT to the borrower
        tokenId = assetToken.mintAsset(
            msg.sender,  // Borrower gets the NFT
            assetType,
            aiValuation,
            maxLTV,
            uri
        );

        // Step 2: Verify loan amount doesn't exceed max LTV
        uint256 maxLoanAmount = assetToken.getMaxLoanAmount(tokenId);
        require(principal <= maxLoanAmount, "Loan exceeds max LTV");

        // Step 3: Calculate total repayment (principal + interest)
        uint256 interest = (principal * interestRate * duration) / (10000 * 365 days);
        uint256 totalRepayment = principal + interest;

        // Step 4: Create the loan
        loanId = _nextLoanId++;

        loans[loanId] = Loan({
            loanId: loanId,
            borrower: msg.sender,
            lender: address(0), // Will be set when funded
            assetTokenId: tokenId,
            principal: principal,
            interestRate: interestRate,
            duration: duration,
            startTime: 0, // Will be set when funded
            totalRepayment: totalRepayment,
            amountRepaid: 0,
            status: LoanStatus.Active,
            stablecoin: stablecoin
        });

        borrowerLoans[msg.sender].push(loanId);
        assetToLoan[tokenId] = loanId;

        // Step 5: Lock the asset as collateral
        assetToken.lockAsset(tokenId, loanId);

        emit LoanCreated(
            loanId,
            msg.sender,
            address(0),
            tokenId,
            principal,
            interestRate,
            duration
        );

        return (loanId, tokenId);
    }

    /**
     * @dev Fund a loan (called by lender)
     */
    function fundLoan(uint256 loanId) external nonReentrant {
        Loan storage loan = loans[loanId];
        require(loan.status == LoanStatus.Active, "Loan not active");
        require(loan.lender == address(0), "Loan already funded");
        require(loan.startTime == 0, "Loan already started");

        // Transfer principal from lender to contract
        IERC20(loan.stablecoin).safeTransferFrom(msg.sender, address(this), loan.principal);

        // Calculate platform fee
        uint256 fee = (loan.principal * platformFee) / 10000;
        uint256 amountToBorrower = loan.principal - fee;

        // Transfer fee to recipient
        if (fee > 0) {
            IERC20(loan.stablecoin).safeTransfer(feeRecipient, fee);
        }

        // Transfer principal to borrower
        IERC20(loan.stablecoin).safeTransfer(loan.borrower, amountToBorrower);

        // Update loan
        loan.lender = msg.sender;
        loan.startTime = block.timestamp;

        emit LoanFunded(loanId, msg.sender, loan.principal);
    }

    /**
     * @dev Make a repayment
     */
    function makeRepayment(uint256 loanId, uint256 amount) external nonReentrant {
        Loan storage loan = loans[loanId];
        require(loan.status == LoanStatus.Active, "Loan not active");
        require(loan.startTime > 0, "Loan not funded yet");
        require(msg.sender == loan.borrower, "Not borrower");
        require(amount > 0, "Amount must be greater than 0");

        uint256 remaining = loan.totalRepayment - loan.amountRepaid;
        require(amount <= remaining, "Amount exceeds remaining");

        // Transfer repayment from borrower to lender
        IERC20(loan.stablecoin).safeTransferFrom(msg.sender, loan.lender, amount);

        loan.amountRepaid += amount;

        emit RepaymentMade(loanId, msg.sender, amount, remaining - amount);

        // Check if loan is fully repaid
        if (loan.amountRepaid >= loan.totalRepayment) {
            loan.status = LoanStatus.Repaid;

            // Unlock collateral
            assetToken.unlockAsset(loan.assetTokenId);

            emit LoanRepaid(loanId, msg.sender);
        }
    }

    /**
     * @dev Liquidate a defaulted loan
     * Can be called by anyone after grace period expires
     */
    function liquidateLoan(uint256 loanId) external nonReentrant {
        Loan storage loan = loans[loanId];
        require(loan.status == LoanStatus.Active, "Loan not active");
        require(loan.startTime > 0, "Loan not funded yet");

        // Check if loan is past due with grace period
        uint256 deadline = loan.startTime + loan.duration + liquidationGracePeriod;
        require(block.timestamp > deadline, "Grace period not expired");
        require(loan.amountRepaid < loan.totalRepayment, "Loan already repaid");

        // Mark as liquidated
        loan.status = LoanStatus.Liquidated;

        // Transfer asset NFT to lender
        assetToken.unlockAsset(loan.assetTokenId);
        assetToken.safeTransferFrom(loan.borrower, loan.lender, loan.assetTokenId);

        emit LoanLiquidated(loanId, msg.sender, loan.assetTokenId);
    }

    /**
     * @dev Get loan details
     */
    function getLoan(uint256 loanId) external view returns (Loan memory) {
        return loans[loanId];
    }

    /**
     * @dev Get all loans for a borrower
     */
    function getBorrowerLoans(address borrower) external view returns (uint256[] memory) {
        return borrowerLoans[borrower];
    }

    /**
     * @dev Check if loan is overdue
     */
    function isLoanOverdue(uint256 loanId) external view returns (bool) {
        Loan memory loan = loans[loanId];
        if (loan.status != LoanStatus.Active || loan.startTime == 0) {
            return false;
        }
        return block.timestamp > loan.startTime + loan.duration;
    }

    /**
     * @dev Update platform fee
     */
    function setPlatformFee(uint256 _platformFee) external onlyOwner {
        require(_platformFee <= 1000, "Fee too high"); // Max 10%
        platformFee = _platformFee;
    }

    /**
     * @dev Update fee recipient
     */
    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        require(_feeRecipient != address(0), "Invalid address");
        feeRecipient = _feeRecipient;
    }

    /**
     * @dev Update liquidation grace period
     */
    function setLiquidationGracePeriod(uint256 _gracePeriod) external onlyOwner {
        liquidationGracePeriod = _gracePeriod;
    }
}
