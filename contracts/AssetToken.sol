// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AssetToken
 * @dev ERC-721 token representing real-world assets used as collateral
 * Each token represents a unique asset (phone, car, inventory, machinery, etc.)
 */
contract AssetToken is ERC721, ERC721URIStorage, Ownable {
    uint256 private _nextTokenId;

    // Asset metadata
    struct Asset {
        string assetType;        // e.g., "phone", "car", "machinery"
        uint256 aiValuation;     // AI-determined asset value in USD (scaled by 1e18)
        uint256 maxLTV;          // Maximum Loan-to-Value ratio (in basis points, e.g., 7000 = 70%)
        uint256 createdAt;       // Timestamp when asset was tokenized
        address borrower;        // Owner of the asset
        bool isLocked;           // True if asset is currently locked as collateral
        uint256 loanId;          // ID of active loan (0 if not locked)
    }

    // Mapping from token ID to asset details
    mapping(uint256 => Asset) public assets;

    // Authorized contracts that can lock/unlock assets (e.g., LoanManager)
    mapping(address => bool) public authorizedManagers;

    // Events
    event AssetMinted(uint256 indexed tokenId, address indexed borrower, string assetType, uint256 aiValuation);
    event AssetLocked(uint256 indexed tokenId, uint256 indexed loanId);
    event AssetUnlocked(uint256 indexed tokenId);
    event ManagerAuthorized(address indexed manager, bool status);

    constructor() ERC721("TokenLend Asset", "TLA") Ownable(msg.sender) {}

    /**
     * @dev Mint a new asset token with AI valuation data
     */
    function mintAsset(
        address borrower,
        string memory assetType,
        uint256 aiValuation,
        uint256 maxLTV,
        string memory uri
    ) external onlyOwner returns (uint256) {
        require(borrower != address(0), "Invalid borrower address");
        require(aiValuation > 0, "Valuation must be greater than 0");
        require(maxLTV > 0 && maxLTV <= 10000, "Invalid LTV ratio");

        uint256 tokenId = _nextTokenId++;

        _safeMint(borrower, tokenId);
        _setTokenURI(tokenId, uri);

        assets[tokenId] = Asset({
            assetType: assetType,
            aiValuation: aiValuation,
            maxLTV: maxLTV,
            createdAt: block.timestamp,
            borrower: borrower,
            isLocked: false,
            loanId: 0
        });

        emit AssetMinted(tokenId, borrower, assetType, aiValuation);

        return tokenId;
    }

    /**
     * @dev Lock an asset as collateral for a loan (only authorized managers)
     */
    function lockAsset(uint256 tokenId, uint256 loanId) external {
        require(authorizedManagers[msg.sender], "Not authorized");
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        require(!assets[tokenId].isLocked, "Asset already locked");

        assets[tokenId].isLocked = true;
        assets[tokenId].loanId = loanId;

        emit AssetLocked(tokenId, loanId);
    }

    /**
     * @dev Unlock an asset after loan is repaid (only authorized managers)
     */
    function unlockAsset(uint256 tokenId) external {
        require(authorizedManagers[msg.sender], "Not authorized");
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        require(assets[tokenId].isLocked, "Asset not locked");

        assets[tokenId].isLocked = false;
        assets[tokenId].loanId = 0;

        emit AssetUnlocked(tokenId);
    }

    /**
     * @dev Authorize or revoke a manager contract
     */
    function setAuthorizedManager(address manager, bool status) external onlyOwner {
        authorizedManagers[manager] = status;
        emit ManagerAuthorized(manager, status);
    }

    /**
     * @dev Get asset details
     */
    function getAsset(uint256 tokenId) external view returns (Asset memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return assets[tokenId];
    }

    /**
     * @dev Calculate maximum loan amount for an asset
     */
    function getMaxLoanAmount(uint256 tokenId) external view returns (uint256) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        Asset memory asset = assets[tokenId];
        return (asset.aiValuation * asset.maxLTV) / 10000;
    }

    /**
     * @dev Prevent transfers of locked assets
     */
    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721)
        returns (address)
    {
        if (tokenId < _nextTokenId) {
            require(!assets[tokenId].isLocked, "Cannot transfer locked asset");
        }
        return super._update(to, tokenId, auth);
    }

    // Override required by Solidity for multiple inheritance
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
