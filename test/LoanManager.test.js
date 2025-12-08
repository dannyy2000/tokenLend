const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("LoanManager", function () {
    let assetToken;
    let loanManager;
    let mockStablecoin;
    let owner, borrower, lender, feeRecipient, otherAccount;

    const PLATFORM_FEE = 100; // 1%
    const ASSET_VALUATION = ethers.utils.parseUnits("1000", 18); // $1000
    const MAX_LTV = 7000; // 70%
    const LOAN_AMOUNT = ethers.utils.parseUnits("700", 6); // $700 in 6 decimals (USDT)
    const INTEREST_RATE = 1000; // 10% annual
    const LOAN_DURATION = 30 * 24 * 60 * 60; // 30 days

    beforeEach(async function () {
        [owner, borrower, lender, feeRecipient, otherAccount] = await ethers.getSigners();

        // Deploy AssetToken
        const AssetToken = await ethers.getContractFactory("AssetToken");
        assetToken = await AssetToken.deploy();

        // Deploy LoanManager
        const LoanManager = await ethers.getContractFactory("LoanManager");
        loanManager = await LoanManager.deploy(
            assetToken.address,
            feeRecipient.address,
            PLATFORM_FEE
        );

        // Deploy MockStablecoin
        const MockStablecoin = await ethers.getContractFactory("MockStablecoin");
        mockStablecoin = await MockStablecoin.deploy("Mock USDT", "USDT", 6);

        // Authorize LoanManager in AssetToken
        await assetToken.setAuthorizedManager(loanManager.address, true);

        // Add stablecoin support
        await loanManager.addSupportedStablecoin(mockStablecoin.address);

        // Mint stablecoins to lender
        await mockStablecoin.mint(lender.address, ethers.utils.parseUnits("10000", 6));
    });

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            expect(await loanManager.owner()).to.equal(owner.address);
        });

        it("Should set correct AssetToken address", async function () {
            expect(await loanManager.assetToken()).to.equal(assetToken.address);
        });

        it("Should set correct fee recipient", async function () {
            expect(await loanManager.feeRecipient()).to.equal(feeRecipient.address);
        });

        it("Should set correct platform fee", async function () {
            expect(await loanManager.platformFee()).to.equal(PLATFORM_FEE);
        });

        it("Should fail with invalid asset token address", async function () {
            const LoanManager = await ethers.getContractFactory("LoanManager");
            await expect(
                LoanManager.deploy(ethers.constants.AddressZero, feeRecipient.address, PLATFORM_FEE)
            ).to.be.revertedWith("Invalid asset token address");
        });

        it("Should fail with invalid fee recipient", async function () {
            const LoanManager = await ethers.getContractFactory("LoanManager");
            await expect(
                LoanManager.deploy(assetToken.address, ethers.constants.AddressZero, PLATFORM_FEE)
            ).to.be.revertedWith("Invalid fee recipient");
        });

        it("Should fail with platform fee too high", async function () {
            const LoanManager = await ethers.getContractFactory("LoanManager");
            await expect(
                LoanManager.deploy(assetToken.address, feeRecipient.address, 1001)
            ).to.be.revertedWith("Platform fee too high");
        });
    });

    describe("Stablecoin Management", function () {
        it("Should add supported stablecoin", async function () {
            const newStablecoin = await (await ethers.getContractFactory("MockStablecoin")).deploy("USDC", "USDC", 6);

            await expect(loanManager.addSupportedStablecoin(newStablecoin.address))
                .to.emit(loanManager, "StablecoinAdded")
                .withArgs(newStablecoin.address);

            expect(await loanManager.supportedStablecoins(newStablecoin.address)).to.equal(true);
        });

        it("Should remove supported stablecoin", async function () {
            await expect(loanManager.removeSupportedStablecoin(mockStablecoin.address))
                .to.emit(loanManager, "StablecoinRemoved")
                .withArgs(mockStablecoin.address);

            expect(await loanManager.supportedStablecoins(mockStablecoin.address)).to.equal(false);
        });

        it("Should fail to add stablecoin if not owner", async function () {
            const newStablecoin = await (await ethers.getContractFactory("MockStablecoin")).deploy("USDC", "USDC", 6);

            await expect(
                loanManager.connect(borrower).addSupportedStablecoin(newStablecoin.address)
            ).to.be.revertedWithCustomError(loanManager, "OwnableUnauthorizedAccount");
        });

        it("Should fail to add zero address stablecoin", async function () {
            await expect(
                loanManager.addSupportedStablecoin(ethers.constants.AddressZero)
            ).to.be.revertedWith("Invalid stablecoin address");
        });
    });

    describe("Loan Creation", function () {
        let assetTokenId;

        beforeEach(async function () {
            // Mint an asset for the borrower
            await assetToken.mintAsset(
                borrower.address,
                "phone",
                ASSET_VALUATION,
                MAX_LTV,
                "ipfs://test"
            );
            assetTokenId = 0;
        });

        it("Should create a loan successfully", async function () {
            await expect(
                loanManager.connect(borrower).createLoan(
                    assetTokenId,
                    LOAN_AMOUNT,
                    INTEREST_RATE,
                    LOAN_DURATION,
                    mockStablecoin.address
                )
            )
                .to.emit(loanManager, "LoanCreated")
                .withArgs(0, borrower.address, ethers.constants.AddressZero, assetTokenId, LOAN_AMOUNT, INTEREST_RATE, LOAN_DURATION);

            // Check loan details
            const loan = await loanManager.getLoan(0);
            expect(loan.borrower).to.equal(borrower.address);
            expect(loan.assetTokenId).to.equal(assetTokenId);
            expect(loan.principal).to.equal(LOAN_AMOUNT);
            expect(loan.interestRate).to.equal(INTEREST_RATE);
            expect(loan.duration).to.equal(LOAN_DURATION);
            expect(loan.status).to.equal(0); // LoanStatus.Active
            expect(loan.lender).to.equal(ethers.constants.AddressZero); // Not funded yet

            // Check asset is locked
            const asset = await assetToken.getAsset(assetTokenId);
            expect(asset.isLocked).to.equal(true);
            expect(asset.loanId).to.equal(0);
        });

        it("Should calculate interest correctly", async function () {
            await loanManager.connect(borrower).createLoan(
                assetTokenId,
                LOAN_AMOUNT,
                INTEREST_RATE,
                LOAN_DURATION,
                mockStablecoin.address
            );

            const loan = await loanManager.getLoan(0);

            // Calculate expected interest: (principal * rate * duration) / (10000 * 365 days)
            const expectedInterest = LOAN_AMOUNT.mul(INTEREST_RATE).mul(LOAN_DURATION).div(10000 * 365 * 24 * 60 * 60);
            const expectedTotal = LOAN_AMOUNT.add(expectedInterest);

            expect(loan.totalRepayment).to.equal(expectedTotal);
        });

        it("Should fail if stablecoin not supported", async function () {
            const unsupportedToken = await (await ethers.getContractFactory("MockStablecoin")).deploy("BAD", "BAD", 6);

            await expect(
                loanManager.connect(borrower).createLoan(
                    assetTokenId,
                    LOAN_AMOUNT,
                    INTEREST_RATE,
                    LOAN_DURATION,
                    unsupportedToken.address
                )
            ).to.be.revertedWith("Stablecoin not supported");
        });

        it("Should fail if not asset owner", async function () {
            await expect(
                loanManager.connect(otherAccount).createLoan(
                    assetTokenId,
                    LOAN_AMOUNT,
                    INTEREST_RATE,
                    LOAN_DURATION,
                    mockStablecoin.address
                )
            ).to.be.revertedWith("Not asset owner");
        });

        it("Should fail if asset already locked", async function () {
            await loanManager.connect(borrower).createLoan(
                assetTokenId,
                LOAN_AMOUNT,
                INTEREST_RATE,
                LOAN_DURATION,
                mockStablecoin.address
            );

            await expect(
                loanManager.connect(borrower).createLoan(
                    assetTokenId,
                    LOAN_AMOUNT,
                    INTEREST_RATE,
                    LOAN_DURATION,
                    mockStablecoin.address
                )
            ).to.be.revertedWith("Asset already locked");
        });

        it("Should fail if principal is zero", async function () {
            await expect(
                loanManager.connect(borrower).createLoan(
                    assetTokenId,
                    0,
                    INTEREST_RATE,
                    LOAN_DURATION,
                    mockStablecoin.address
                )
            ).to.be.revertedWith("Principal must be greater than 0");
        });

        it("Should fail if duration is zero", async function () {
            await expect(
                loanManager.connect(borrower).createLoan(
                    assetTokenId,
                    LOAN_AMOUNT,
                    INTEREST_RATE,
                    0,
                    mockStablecoin.address
                )
            ).to.be.revertedWith("Duration must be greater than 0");
        });

        it("Should fail if interest rate too high", async function () {
            await expect(
                loanManager.connect(borrower).createLoan(
                    assetTokenId,
                    LOAN_AMOUNT,
                    10001, // >100%
                    LOAN_DURATION,
                    mockStablecoin.address
                )
            ).to.be.revertedWith("Interest rate too high");
        });

        it("Should fail if loan exceeds max LTV", async function () {
            const maxLoan = await assetToken.getMaxLoanAmount(assetTokenId);
            const excessiveLoan = maxLoan + ethers.utils.parseUnits("1", 18);

            await expect(
                loanManager.connect(borrower).createLoan(
                    assetTokenId,
                    excessiveLoan,
                    INTEREST_RATE,
                    LOAN_DURATION,
                    mockStablecoin.address
                )
            ).to.be.revertedWith("Loan exceeds max LTV");
        });

        it("Should add loan to borrower's loan list", async function () {
            await loanManager.connect(borrower).createLoan(
                assetTokenId,
                LOAN_AMOUNT,
                INTEREST_RATE,
                LOAN_DURATION,
                mockStablecoin.address
            );

            const borrowerLoans = await loanManager.getBorrowerLoans(borrower.address);
            expect(borrowerLoans.length).to.equal(1);
            expect(borrowerLoans[0]).to.equal(0);
        });
    });

    describe("Loan Funding", function () {
        let assetTokenId;
        let loanId;

        beforeEach(async function () {
            // Mint asset and create loan
            await assetToken.mintAsset(
                borrower.address,
                "phone",
                ASSET_VALUATION,
                MAX_LTV,
                "ipfs://test"
            );
            assetTokenId = 0;

            await loanManager.connect(borrower).createLoan(
                assetTokenId,
                LOAN_AMOUNT,
                INTEREST_RATE,
                LOAN_DURATION,
                mockStablecoin.address
            );
            loanId = 0;

            // Approve stablecoin transfer
            await mockStablecoin.connect(lender).approve(
                loanManager.address,
                LOAN_AMOUNT
            );
        });

        it("Should fund loan successfully", async function () {
            const lenderBalanceBefore = await mockStablecoin.balanceOf(lender.address);
            const borrowerBalanceBefore = await mockStablecoin.balanceOf(borrower.address);
            const feeRecipientBalanceBefore = await mockStablecoin.balanceOf(feeRecipient.address);

            await expect(loanManager.connect(lender).fundLoan(loanId))
                .to.emit(loanManager, "LoanFunded")
                .withArgs(loanId, lender.address, LOAN_AMOUNT);

            // Check loan updated
            const loan = await loanManager.getLoan(loanId);
            expect(loan.lender).to.equal(lender.address);
            expect(loan.startTime).to.be.greaterThan(0);

            // Check balances
            const fee = LOAN_AMOUNT.mul(PLATFORM_FEE).div(10000);
            const amountToBorrower = LOAN_AMOUNT.sub(fee);

            expect(await mockStablecoin.balanceOf(lender.address)).to.equal(lenderBalanceBefore.sub(LOAN_AMOUNT));
            expect(await mockStablecoin.balanceOf(borrower.address)).to.equal(borrowerBalanceBefore.add(amountToBorrower));
            expect(await mockStablecoin.balanceOf(feeRecipient.address)).to.equal(feeRecipientBalanceBefore.add(fee));
        });

        it("Should fail if loan already funded", async function () {
            await loanManager.connect(lender).fundLoan(loanId);

            // Another lender tries to fund
            await mockStablecoin.mint(otherAccount.address, LOAN_AMOUNT);
            await mockStablecoin.connect(otherAccount).approve(loanManager.address, LOAN_AMOUNT);

            await expect(
                loanManager.connect(otherAccount).fundLoan(loanId)
            ).to.be.revertedWith("Loan already funded");
        });

        it("Should fail if loan not active", async function () {
            // Fund and repay loan
            await loanManager.connect(lender).fundLoan(loanId);

            const loan = await loanManager.getLoan(loanId);
            await mockStablecoin.mint(borrower.address, loan.totalRepayment);
            await mockStablecoin.connect(borrower).approve(loanManager.address, loan.totalRepayment);
            await loanManager.connect(borrower).makeRepayment(loanId, loan.totalRepayment);

            // Try to fund repaid loan
            await mockStablecoin.mint(otherAccount.address, LOAN_AMOUNT);
            await mockStablecoin.connect(otherAccount).approve(loanManager.address, LOAN_AMOUNT);

            await expect(
                loanManager.connect(otherAccount).fundLoan(loanId)
            ).to.be.revertedWith("Loan not active");
        });
    });

    describe("Loan Repayment", function () {
        let assetTokenId;
        let loanId;

        beforeEach(async function () {
            // Mint asset, create loan, and fund it
            await assetToken.mintAsset(
                borrower.address,
                "phone",
                ASSET_VALUATION,
                MAX_LTV,
                "ipfs://test"
            );
            assetTokenId = 0;

            await loanManager.connect(borrower).createLoan(
                assetTokenId,
                LOAN_AMOUNT,
                INTEREST_RATE,
                LOAN_DURATION,
                mockStablecoin.address
            );
            loanId = 0;

            await mockStablecoin.connect(lender).approve(loanManager.address, LOAN_AMOUNT);
            await loanManager.connect(lender).fundLoan(loanId);

            // Mint repayment tokens to borrower
            const loan = await loanManager.getLoan(loanId);
            await mockStablecoin.mint(borrower.address, loan.totalRepayment);
        });

        it("Should make partial repayment", async function () {
            const loan = await loanManager.getLoan(loanId);
            const partialAmount = loan.totalRepayment.div(2);

            await mockStablecoin.connect(borrower).approve(loanManager.address, partialAmount);

            const lenderBalanceBefore = await mockStablecoin.balanceOf(lender.address);

            await expect(loanManager.connect(borrower).makeRepayment(loanId, partialAmount))
                .to.emit(loanManager, "RepaymentMade")
                .withArgs(loanId, borrower.address, partialAmount, loan.totalRepayment.sub(partialAmount));

            // Check loan updated
            const updatedLoan = await loanManager.getLoan(loanId);
            expect(updatedLoan.amountRepaid).to.equal(partialAmount);
            expect(updatedLoan.status).to.equal(0); // Still Active

            // Check lender received payment
            expect(await mockStablecoin.balanceOf(lender.address)).to.equal(lenderBalanceBefore.add(partialAmount));

            // Asset should still be locked
            const asset = await assetToken.getAsset(assetTokenId);
            expect(asset.isLocked).to.equal(true);
        });

        it("Should make full repayment and unlock collateral", async function () {
            const loan = await loanManager.getLoan(loanId);

            await mockStablecoin.connect(borrower).approve(loanManager.address, loan.totalRepayment);

            await expect(loanManager.connect(borrower).makeRepayment(loanId, loan.totalRepayment))
                .to.emit(loanManager, "RepaymentMade")
                .to.emit(loanManager, "LoanRepaid")
                .withArgs(loanId, borrower.address);

            // Check loan status
            const updatedLoan = await loanManager.getLoan(loanId);
            expect(updatedLoan.status).to.equal(1); // LoanStatus.Repaid
            expect(updatedLoan.amountRepaid).to.equal(loan.totalRepayment);

            // Check asset unlocked
            const asset = await assetToken.getAsset(assetTokenId);
            expect(asset.isLocked).to.equal(false);
            expect(asset.loanId).to.equal(0);
        });

        it("Should fail if not borrower", async function () {
            const loan = await loanManager.getLoan(loanId);

            await mockStablecoin.mint(otherAccount.address, loan.totalRepayment);
            await mockStablecoin.connect(otherAccount).approve(loanManager.address, loan.totalRepayment);

            await expect(
                loanManager.connect(otherAccount).makeRepayment(loanId, loan.totalRepayment)
            ).to.be.revertedWith("Not borrower");
        });

        it("Should fail if amount is zero", async function () {
            await expect(
                loanManager.connect(borrower).makeRepayment(loanId, 0)
            ).to.be.revertedWith("Amount must be greater than 0");
        });

        it("Should fail if amount exceeds remaining", async function () {
            const loan = await loanManager.getLoan(loanId);
            const excessAmount = loan.totalRepayment + ethers.utils.parseUnits("1", 6);

            await mockStablecoin.connect(borrower).approve(loanManager.address, excessAmount);

            await expect(
                loanManager.connect(borrower).makeRepayment(loanId, excessAmount)
            ).to.be.revertedWith("Amount exceeds remaining");
        });

        it("Should fail if loan not funded", async function () {
            // Create a new unfunded loan
            await assetToken.mintAsset(
                borrower.address,
                "car",
                ASSET_VALUATION,
                MAX_LTV,
                "ipfs://test2"
            );

            await loanManager.connect(borrower).createLoan(
                1, // new asset
                LOAN_AMOUNT,
                INTEREST_RATE,
                LOAN_DURATION,
                mockStablecoin.address
            );

            await expect(
                loanManager.connect(borrower).makeRepayment(1, LOAN_AMOUNT)
            ).to.be.revertedWith("Loan not funded yet");
        });
    });

    describe("Loan Liquidation", function () {
        let assetTokenId;
        let loanId;

        beforeEach(async function () {
            // Mint asset, create loan, and fund it
            await assetToken.mintAsset(
                borrower.address,
                "phone",
                ASSET_VALUATION,
                MAX_LTV,
                "ipfs://test"
            );
            assetTokenId = 0;

            await loanManager.connect(borrower).createLoan(
                assetTokenId,
                LOAN_AMOUNT,
                INTEREST_RATE,
                LOAN_DURATION,
                mockStablecoin.address
            );
            loanId = 0;

            // Approve LoanManager to transfer asset NFT (needed for liquidation)
            await assetToken.connect(borrower).approve(loanManager.address, assetTokenId);

            await mockStablecoin.connect(lender).approve(loanManager.address, LOAN_AMOUNT);
            await loanManager.connect(lender).fundLoan(loanId);
        });

        it("Should liquidate loan after grace period", async function () {
            const loan = await loanManager.getLoan(loanId);
            const gracePeriod = await loanManager.liquidationGracePeriod();

            // Fast forward past loan duration + grace period
            await time.increase(loan.duration.toNumber() + gracePeriod.toNumber() + 1);

            await expect(loanManager.connect(otherAccount).liquidateLoan(loanId))
                .to.emit(loanManager, "LoanLiquidated")
                .withArgs(loanId, otherAccount.address, assetTokenId);

            // Check loan status
            const updatedLoan = await loanManager.getLoan(loanId);
            expect(updatedLoan.status).to.equal(2); // LoanStatus.Liquidated

            // Check asset transferred to lender
            expect(await assetToken.ownerOf(assetTokenId)).to.equal(lender.address);

            // Check asset unlocked
            const asset = await assetToken.getAsset(assetTokenId);
            expect(asset.isLocked).to.equal(false);
        });

        it("Should fail if grace period not expired", async function () {
            const loan = await loanManager.getLoan(loanId);

            // Fast forward only to loan duration (not past grace period)
            await time.increase(loan.duration.toNumber());

            await expect(
                loanManager.connect(otherAccount).liquidateLoan(loanId)
            ).to.be.revertedWith("Grace period not expired");
        });

        it("Should fail if loan already repaid", async function () {
            const loan = await loanManager.getLoan(loanId);

            // Repay loan
            await mockStablecoin.mint(borrower.address, loan.totalRepayment);
            await mockStablecoin.connect(borrower).approve(loanManager.address, loan.totalRepayment);
            await loanManager.connect(borrower).makeRepayment(loanId, loan.totalRepayment);

            // Try to liquidate
            const gracePeriod = await loanManager.liquidationGracePeriod();
            await time.increase(loan.duration.toNumber() + gracePeriod.toNumber() + 1);

            await expect(
                loanManager.connect(otherAccount).liquidateLoan(loanId)
            ).to.be.revertedWith("Loan not active");
        });

        it("Should fail if loan not funded", async function () {
            // Create unfunded loan
            await assetToken.mintAsset(
                borrower.address,
                "car",
                ASSET_VALUATION,
                MAX_LTV,
                "ipfs://test2"
            );

            await loanManager.connect(borrower).createLoan(
                1,
                LOAN_AMOUNT,
                INTEREST_RATE,
                LOAN_DURATION,
                mockStablecoin.address
            );

            await expect(
                loanManager.connect(otherAccount).liquidateLoan(1)
            ).to.be.revertedWith("Loan not funded yet");
        });

        it("Should not liquidate if partially repaid within grace period", async function () {
            const loan = await loanManager.getLoan(loanId);
            const partialAmount = loan.totalRepayment.div(2);

            // Make partial repayment
            await mockStablecoin.mint(borrower.address, partialAmount);
            await mockStablecoin.connect(borrower).approve(loanManager.address, partialAmount);
            await loanManager.connect(borrower).makeRepayment(loanId, partialAmount);

            // Fast forward past grace period
            const gracePeriod = await loanManager.liquidationGracePeriod();
            await time.increase(loan.duration.toNumber() + gracePeriod.toNumber() + 1);

            // Liquidation should still work if not fully repaid
            await expect(loanManager.connect(otherAccount).liquidateLoan(loanId))
                .to.emit(loanManager, "LoanLiquidated");
        });
    });

    describe("Admin Functions", function () {
        it("Should update platform fee", async function () {
            const newFee = 200; // 2%
            await loanManager.setPlatformFee(newFee);
            expect(await loanManager.platformFee()).to.equal(newFee);
        });

        it("Should fail to set fee too high", async function () {
            await expect(
                loanManager.setPlatformFee(1001)
            ).to.be.revertedWith("Fee too high");
        });

        it("Should update fee recipient", async function () {
            const newRecipient = otherAccount.address;
            await loanManager.setFeeRecipient(newRecipient);
            expect(await loanManager.feeRecipient()).to.equal(newRecipient);
        });

        it("Should fail to set zero address as fee recipient", async function () {
            await expect(
                loanManager.setFeeRecipient(ethers.constants.AddressZero)
            ).to.be.revertedWith("Invalid address");
        });

        it("Should update liquidation grace period", async function () {
            const newPeriod = 14 * 24 * 60 * 60; // 14 days
            await loanManager.setLiquidationGracePeriod(newPeriod);
            expect(await loanManager.liquidationGracePeriod()).to.equal(newPeriod);
        });

        it("Should fail if not owner", async function () {
            await expect(
                loanManager.connect(borrower).setPlatformFee(200)
            ).to.be.revertedWithCustomError(loanManager, "OwnableUnauthorizedAccount");

            await expect(
                loanManager.connect(borrower).setFeeRecipient(otherAccount.address)
            ).to.be.revertedWithCustomError(loanManager, "OwnableUnauthorizedAccount");

            await expect(
                loanManager.connect(borrower).setLiquidationGracePeriod(14 * 24 * 60 * 60)
            ).to.be.revertedWithCustomError(loanManager, "OwnableUnauthorizedAccount");
        });
    });

    describe("Utility Functions", function () {
        let assetTokenId;
        let loanId;

        beforeEach(async function () {
            await assetToken.mintAsset(
                borrower.address,
                "phone",
                ASSET_VALUATION,
                MAX_LTV,
                "ipfs://test"
            );
            assetTokenId = 0;

            await loanManager.connect(borrower).createLoan(
                assetTokenId,
                LOAN_AMOUNT,
                INTEREST_RATE,
                LOAN_DURATION,
                mockStablecoin.address
            );
            loanId = 0;
        });

        it("Should check if loan is overdue", async function () {
            // Not overdue before funding
            expect(await loanManager.isLoanOverdue(loanId)).to.equal(false);

            // Fund loan
            await mockStablecoin.connect(lender).approve(loanManager.address, LOAN_AMOUNT);
            await loanManager.connect(lender).fundLoan(loanId);

            // Still not overdue
            expect(await loanManager.isLoanOverdue(loanId)).to.equal(false);

            // Fast forward past duration
            const loan = await loanManager.getLoan(loanId);
            await time.increase(loan.duration.toNumber() + 1);

            // Now overdue
            expect(await loanManager.isLoanOverdue(loanId)).to.equal(true);
        });

        it("Should get borrower loans", async function () {
            // Create another loan
            await assetToken.mintAsset(
                borrower.address,
                "car",
                ASSET_VALUATION,
                MAX_LTV,
                "ipfs://test2"
            );

            await loanManager.connect(borrower).createLoan(
                1,
                LOAN_AMOUNT,
                INTEREST_RATE,
                LOAN_DURATION,
                mockStablecoin.address
            );

            const loans = await loanManager.getBorrowerLoans(borrower.address);
            expect(loans.length).to.equal(2);
            expect(loans[0]).to.equal(0);
            expect(loans[1]).to.equal(1);
        });
    });
});
