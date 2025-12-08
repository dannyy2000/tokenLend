# TOKENLEND — RWA-Backed SME Lending Platform

## Hackathon Information
- **Event**: Mantle Hackathon 2026
- **Tracks**: RWA/RealFi, DeFi & Composability, AI & Oracles, UX/Demo

## Executive Summary
TokenLend is a decentralized, AI-driven lending platform enabling SMEs to unlock liquidity using their real-world assets (RWA) as collateral. Borrowers can access stablecoin loans backed by tokenized assets, while lenders gain secure, verifiable exposure to vetted collateral. TokenLend supports global stablecoins, off-ramp to local fiat, and uses AI underwriting to assess borrower reliability and asset value.

## Problem Statement
- SMEs in emerging markets struggle to access affordable credit
- Banks require formal collateral and cumbersome documentation
- Physical assets are underutilized for liquidity
- Traditional lending lacks transparency, risk scoring, and global reach

## Solution
- Collateralize real-world assets (phones, cars, inventory, machinery)
- AI underwriting evaluates asset and borrower data to calculate maximum safe Loan-to-Value (LTV)
- Tokenized assets issued as proof of collateral for tracking and locking
- Stablecoin lending (USDT/MNT) with optional NGN off-ramp
- Smart contracts manage collateral lock/unlock and liquidation on default
- Transparent AI risk scoring for lenders

## Key Features
1. SME Onboarding & KYC
2. Asset Upload & AI Valuation
3. Tokenized Collateral (ERC-721)
4. Loan Request & LTV Calculation
5. Lending & Interest Management
6. Repayment Flow & Collateral Unlock
7. On/Off Ramp Integration

## AI Underwriting Details
- **Borrower data**: revenue, POS settlements, transaction history
- **Asset data**: photos, market APIs, depreciation, serial numbers
- **Output**: LTV recommendation and risk score
- **Ensures**: safe borrowing limits

## Technical Architecture

### Frontend
- Web/Mobile app, asset upload, loan dashboard, repayment tracking

### Backend
- AI valuation engine
- Borrower/asset database
- LTV/interest calculator
- Loan management API

### Blockchain/Smart Contract Layer
- Tokenized collateral
- Collateral locking/unlocking
- Loan settlement & liquidation
- Stablecoin transfers

### Integration Layer
- Stablecoin wallets (USDT/MNT)
- Optional NGN off-ramp
- Notifications

## Loan Flow
1. Borrower uploads asset → AI valuation → token generated
2. Borrower requests loan ≤ LTV limit
3. Lender funds loan → smart contract locks collateral
4. Borrower repays principal + interest → collateral token released
5. Default → collateral token liquidated → proceeds to lender

---

# DEVELOPMENT ROADMAP

## Phase 1: Smart Contracts ✅ (IN PROGRESS)

### ✅ Completed
- [x] **AssetToken.sol** - ERC-721 NFT for RWA collateral
  - Asset metadata (type, AI valuation, max LTV)
  - Lock/unlock mechanism
  - Transfer prevention for locked assets
  - Authorized manager pattern

- [x] **LoanManager.sol** - Core lending logic
  - Loan creation with asset collateral
  - Loan funding by lenders
  - Repayment with interest calculation
  - Liquidation mechanism
  - Multi-stablecoin support
  - Platform fee system
  - Grace period before liquidation

- [x] **MockStablecoin.sol** - Testing token

- [x] **AssetToken.test.js** - Comprehensive test suite
  - Minting tests
  - Lock/unlock tests
  - Transfer prevention tests
  - Max loan amount calculation

### 🔄 In Progress / Next Steps
- [ ] **LoanManager Tests** - Complete test coverage for loan lifecycle
  - Loan creation tests
  - Funding tests
  - Repayment tests
  - Liquidation tests
  - Edge cases and security tests

- [ ] **AI Oracle Integration** (if needed on-chain)
  - Chainlink oracle for asset valuation
  - Price feeds for stablecoins

- [ ] **Security Audit Prep**
  - Reentrancy protection review
  - Access control review
  - Edge case handling

- [ ] **Deployment Scripts**
  - Hardhat deployment scripts
  - Mantle testnet deployment
  - Contract verification

## Phase 2: AI Valuation Engine
- [ ] Asset classification model
- [ ] Price estimation model
- [ ] Risk scoring model
- [ ] API endpoints for valuation
- [ ] Integration with smart contracts

## Phase 3: Backend API
- [ ] User authentication & KYC
- [ ] Asset upload and storage (IPFS)
- [ ] AI valuation service integration
- [ ] Loan management endpoints
- [ ] Notification service
- [ ] Off-ramp integration (NGN)

## Phase 4: Frontend Application
- [ ] Landing page
- [ ] User registration/login
- [ ] Asset upload flow
- [ ] Loan request interface
- [ ] Lender dashboard
- [ ] Borrower dashboard
- [ ] Repayment tracking
- [ ] Wallet integration (MetaMask, etc.)

## Phase 5: Testing & Deployment
- [ ] Integration testing
- [ ] User acceptance testing
- [ ] Security audit
- [ ] Mantle mainnet deployment
- [ ] Demo preparation

---

# CURRENT SMART CONTRACT ARCHITECTURE

## AssetToken.sol
**Type**: ERC-721 NFT Contract
**Purpose**: Tokenize real-world assets as collateral

**Key Functions**:
- `mintAsset()` - Create NFT for asset with AI valuation
- `lockAsset()` - Lock asset when loan is created
- `unlockAsset()` - Unlock asset when loan is repaid
- `getMaxLoanAmount()` - Calculate max borrowable amount based on LTV
- `setAuthorizedManager()` - Authorize LoanManager contract

**Asset Struct**:
```solidity
struct Asset {
    string assetType;        // "phone", "car", "machinery"
    uint256 aiValuation;     // USD value (scaled by 1e18)
    uint256 maxLTV;          // Max LTV ratio (basis points)
    uint256 createdAt;       // Timestamp
    address borrower;        // Asset owner
    bool isLocked;           // Collateral status
    uint256 loanId;          // Associated loan ID
}
```

## LoanManager.sol
**Type**: Loan Management Contract
**Purpose**: Handle loan lifecycle from creation to repayment/liquidation

**Key Functions**:
- `createLoan()` - Borrower creates loan request
- `fundLoan()` - Lender funds the loan
- `makeRepayment()` - Borrower makes payment
- `liquidateLoan()` - Liquidate defaulted loan
- `addSupportedStablecoin()` - Add accepted stablecoins

**Loan Struct**:
```solidity
struct Loan {
    uint256 loanId;
    address borrower;
    address lender;
    uint256 assetTokenId;    // Collateral NFT
    uint256 principal;       // Loan amount
    uint256 interestRate;    // Annual rate (basis points)
    uint256 duration;        // Loan term (seconds)
    uint256 startTime;       // When funded
    uint256 totalRepayment;  // Principal + interest
    uint256 amountRepaid;    // Paid so far
    LoanStatus status;       // Active/Repaid/Liquidated
    address stablecoin;      // USDT/MNT/etc.
}
```

**Loan Statuses**:
- `Active` - Loan is ongoing
- `Repaid` - Fully paid back
- `Liquidated` - Collateral seized
- `Defaulted` - Past due (unused currently)

---

# TECHNICAL DECISIONS

## Stablecoin Support
- Primary: USDT, USDC, MNT (Mantle native)
- Flexible multi-stablecoin architecture
- MockStablecoin for testing only

## Interest Calculation
- Simple interest model: `(principal * rate * duration) / (10000 * 365 days)`
- Rate in basis points (1000 = 10%)
- Pro-rata for custom durations

## Liquidation
- 7-day grace period after loan expiry
- Lender receives collateral NFT
- No partial liquidation (full seizure)

## Platform Economics
- Platform fee: up to 10% (configurable)
- Fee deducted from principal at funding
- Fee goes to designated recipient

## Security Features
- ReentrancyGuard on all financial functions
- Ownable for admin functions
- SafeERC20 for token transfers
- Transfer prevention on locked assets

---

# NEXT IMMEDIATE TASKS

## Testing
1. Write comprehensive LoanManager tests
2. Test full loan lifecycle end-to-end
3. Test liquidation scenarios
4. Test multi-stablecoin support

## Contract Improvements (if needed)
1. Consider partial repayments
2. Add loan extension mechanism
3. Add early repayment discount
4. Add borrower/lender reputation system

## Deployment Preparation
1. Write deployment scripts
2. Configure for Mantle testnet
3. Verify contracts on block explorer
4. Document deployed addresses

---

# RESOURCES & REFERENCES

## Mantle Network
- Testnet RPC: https://rpc.testnet.mantle.xyz
- Mainnet RPC: https://rpc.mantle.xyz
- Explorer: https://explorer.mantle.xyz
- Faucet: https://faucet.testnet.mantle.xyz

## Stablecoins on Mantle
- USDT: [To be added]
- USDC: [To be added]
- MNT: Native token

## Development Stack
- Hardhat
- OpenZeppelin Contracts
- Ethers.js
- Chai (testing)
