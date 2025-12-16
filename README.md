# TokenLend - RWA-Backed SME Lending Platform

<div align="center">

**Unlock liquidity from real-world assets through AI-powered decentralized lending**

Built for Mantle Hackathon 2026 | Tracks: RWA/RealFi, DeFi & Composability, AI & Oracles

[Live Demo](#) | [Documentation](./PROJECT.md) | [Smart Contracts](./contracts/)

</div>

---

## 🌟 Overview

TokenLend is a decentralized lending platform that enables SMEs in emerging markets to access stablecoin loans using their real-world assets (RWA) as collateral. By combining blockchain technology with AI-powered asset valuation, TokenLend bridges the gap between physical assets and digital finance.

### The Problem

- **700+ million SMEs globally** struggle to access affordable credit
- Banks require extensive documentation and formal collateral
- **$5.2 trillion credit gap** in emerging markets (IFC, 2021)
- Physical assets (phones, equipment, inventory) sit idle as untapped liquidity
- Traditional lending lacks transparency and fair risk assessment

### Our Solution

TokenLend allows SMEs to:
1. **Upload** real-world assets (phones, laptops, machinery, vehicles)
2. **Get instant valuation** through AI-powered assessment
3. **Receive tokenized collateral** as ERC-721 NFTs
4. **Access stablecoin loans** (USDT, USDC, MNT) up to safe LTV limits
5. **Repay flexibly** and unlock collateral
6. **Build credit history** on-chain for future access

Lenders benefit from:
- **Transparent risk scoring** via AI assessment
- **Verifiable collateral** through tokenized assets
- **Secure lending** with automated liquidation
- **Attractive returns** through competitive interest rates
- **Global opportunities** without geographic barriers

---

## 🎯 Key Features

### For Borrowers (SMEs)

**🖼️ Asset Tokenization**
- Upload photos of real-world assets
- AI analyzes condition, authenticity, and value
- Mint ERC-721 NFT representing asset ownership
- Collateral locked on-chain during loan period

**💰 Flexible Borrowing**
- Request loans up to asset's Loan-to-Value (LTV) limit
- Choose loan duration and interest rate
- Multi-stablecoin support (USDT, USDC, MNT)
- Transparent fee structure (no hidden costs)

**📊 Dashboard & Tracking**
- View all active and past loans
- Track repayment progress
- Monitor collateral status
- Build on-chain credit history

**🔓 Collateral Management**
- Repay anytime to unlock assets
- Automatic collateral release on full repayment
- Grace period before liquidation
- Notifications for payment dues

### For Lenders

**🔍 Browse Investment Opportunities**
- Explore available loan requests
- Filter by asset type, LTV, interest rate
- View detailed AI valuation reports
- Assess borrower risk scores

**🛡️ Secure Lending**
- Collateral locked in smart contracts
- Automated interest accrual
- Liquidation rights after default + grace period
- Multi-stablecoin investment options

**📈 Portfolio Management**
- Track all funded loans
- Monitor repayment status
- View earnings and interest accrued
- Diversify across asset types

**🤖 AI-Powered Risk Assessment**
- GPT-4 Vision analyzes asset images
- Condition scoring (mint to poor)
- Damage detection and red flags
- Market price estimation

---

## 🏗️ Architecture

### Technology Stack

**Blockchain Layer**
- **Network**: Mantle (Layer 2, low fees, high throughput)
- **Smart Contracts**: Solidity 0.8.20
- **Standards**: ERC-721 (Asset NFTs), ERC-20 (Stablecoins)
- **Security**: OpenZeppelin, ReentrancyGuard, SafeERC20

**AI & Backend**
- **AI Engine**: OpenAI GPT-4 Vision API
- **Backend**: Node.js, Express.js
- **Database**: MongoDB (user profiles, KYC, valuations)
- **Authentication**: JWT + Web3 wallet signatures
- **Storage**: IPFS (asset images, metadata)

**Frontend**
- **Framework**: Next.js 15 (React 19, TypeScript)
- **Styling**: Tailwind CSS v3
- **Web3**: wagmi v3, RainbowKit, viem, ethers v6
- **State Management**: Zustand
- **UI**: Custom component library with glass morphism design

### System Flow

```
1. ASSET UPLOAD & VALUATION
   Borrower uploads asset photos
          ↓
   Backend stores on IPFS
          ↓
   GPT-4 Vision analyzes images
          ↓
   Returns: condition, value, LTV
          ↓
   Smart contract mints Asset NFT

2. LOAN REQUEST
   Borrower creates loan request
          ↓
   Specifies: principal, rate, duration
          ↓
   Smart contract validates against LTV
          ↓
   Loan posted to marketplace

3. LOAN FUNDING
   Lender browses requests
          ↓
   Reviews AI valuation & terms
          ↓
   Funds loan with stablecoins
          ↓
   Asset NFT locked as collateral
          ↓
   Funds transferred to borrower

4. REPAYMENT
   Borrower makes payments
          ↓
   Interest calculated on-chain
          ↓
   Smart contract tracks balance
          ↓
   On full repayment: Asset NFT unlocked

5. DEFAULT & LIQUIDATION
   Payment overdue + grace period passed
          ↓
   Lender initiates liquidation
          ↓
   Asset NFT transferred to lender
          ↓
   Lender can claim physical asset
```

---

## 🔐 Smart Contracts

### AssetToken.sol (ERC-721)
Tokenizes real-world assets as NFT collateral.

**Key Functions:**
- `mintAsset()` - Create NFT with AI valuation metadata
- `lockAsset()` - Lock collateral when loan funded
- `unlockAsset()` - Release collateral on repayment
- `getMaxLoanAmount()` - Calculate max borrowable based on LTV

**Asset Metadata:**
```solidity
struct Asset {
    string assetType;        // "phone", "laptop", "car", etc.
    uint256 aiValuation;     // AI-estimated value (USD, scaled)
    uint256 maxLTV;          // Max loan-to-value ratio (basis points)
    uint256 createdAt;       // Timestamp
    address borrower;        // Asset owner
    bool isLocked;           // Collateral status
    uint256 loanId;          // Associated loan ID (if locked)
}
```

### LoanManager.sol
Manages full loan lifecycle from creation to settlement.

**Key Functions:**
- `createLoan()` - Borrower initiates loan request
- `fundLoan()` - Lender provides capital
- `makeRepayment()` - Borrower pays principal + interest
- `liquidateLoan()` - Seize collateral on default

**Loan Structure:**
```solidity
struct Loan {
    uint256 loanId;
    address borrower;
    address lender;
    uint256 assetTokenId;    // Collateral NFT
    uint256 principal;       // Loan amount
    uint256 interestRate;    // Annual rate (basis points, e.g., 1000 = 10%)
    uint256 duration;        // Loan term (seconds)
    uint256 startTime;       // Funding timestamp
    uint256 totalRepayment;  // Principal + interest
    uint256 amountRepaid;    // Cumulative payments
    LoanStatus status;       // Active, Repaid, Liquidated
    address stablecoin;      // USDT/USDC/MNT address
}
```

**Interest Calculation:**
- Simple interest: `(principal × rate × duration) / (10000 × 365 days)`
- Pro-rated for custom durations
- No compounding

**Security Features:**
- ReentrancyGuard on all financial functions
- Ownable for admin controls
- SafeERC20 for token transfers
- Transfer prevention on locked NFTs
- 7-day grace period before liquidation

---

## 🤖 AI Valuation Engine

### How It Works

1. **Image Analysis**
   - Borrower uploads 1-5 photos of asset
   - Images stored on IPFS
   - GPT-4 Vision processes images

2. **Assessment Criteria**
   - **Authenticity**: Matches user-provided model/brand?
   - **Condition**: Physical state (scratches, damage, wear)
   - **Functionality**: Working condition (if visible)
   - **Red Flags**: Stock photos, mismatched descriptions

3. **Condition Scoring**
   - `1.0` = Mint/New (perfect, no wear)
   - `0.9-0.95` = Excellent (minimal wear, like new)
   - `0.8-0.89` = Good (light wear, fully functional)
   - `0.6-0.79` = Fair (moderate wear, cosmetic damage)
   - `0.4-0.59` = Poor (heavy wear, visible damage)
   - `<0.4` = Very Poor (severe damage, questionable functionality)

4. **Value Estimation**
   - Cross-reference market price APIs
   - Apply depreciation based on age
   - Adjust for condition score
   - Conservative valuation approach

5. **LTV Calculation**
   - Asset value × condition score × safety margin
   - Typical LTV: 50-70% depending on asset type
   - Lower LTV for higher-risk categories

### AI Response Format

```json
{
  "matches": true,
  "detectedModel": "iPhone 14 Pro 128GB",
  "detectedBrand": "Apple",
  "physicalCondition": "excellent",
  "conditionScore": 0.92,
  "damageNotes": ["minor scratch on bottom edge"],
  "confidence": 0.94,
  "redFlags": [],
  "isStockPhoto": false,
  "estimatedValue": 850.00,
  "maxLoanAmount": 595.00,
  "recommendedLTV": 70
}
```

---

## 💳 Stablecoin Support

### Supported Currencies

**USDT (Tether)** - 6 decimals
- Most liquid stablecoin globally
- Preferred by international lenders

**USDC (USD Coin)** - 6 decimals
- Regulated, fully backed
- Popular in institutional finance

**MNT (Mantle Token)** - 18 decimals
- Native Mantle network token
- Lowest gas fees

### Multi-Currency Lending

- Borrowers specify preferred stablecoin
- Lenders can fund in any supported currency
- Exchange rate handled off-chain if needed
- All contracts store values in smallest unit (wei)

### Fiat Off-Ramp (Future)

- Partner with local exchanges for NGN conversion
- Enable cash withdrawals in emerging markets
- Maintain stablecoin backing on-chain

---

## 📱 User Interface

### Design Philosophy

**Glass Morphism Aesthetic**
- Translucent cards with backdrop blur
- Gradient accents (indigo to purple)
- Dark theme optimized for readability
- Modern, professional appearance

**Responsive & Accessible**
- Mobile-first design
- Touch-friendly interface
- WCAG accessibility standards
- Fast loading times

**Component Library**
- Input, Select, Textarea (form controls)
- Button (5 variants, 3 sizes)
- Modal (dialog system)
- Toast (notifications)
- Badge (status indicators)
- Card (container layouts)
- Spinner (loading states)

### User Experience

**Borrower Journey**
1. Connect wallet
2. Click "Borrow" in navbar
3. Upload asset photos
4. View AI valuation
5. Set loan terms
6. Submit request
7. Wait for funding
8. Receive stablecoins
9. Make repayments
10. Reclaim collateral

**Lender Journey**
1. Connect wallet
2. Click "Lend" in navbar
3. Browse loan marketplace
4. Review asset details
5. Check AI assessment
6. Fund selected loan
7. Track repayments
8. Earn interest
9. (If default) Claim collateral

### Dashboard Features

**Borrower Dashboard**
- Active loans overview
- Total borrowed & repaid
- Payment schedules
- Collateral status
- Quick action buttons

**Lender Dashboard**
- Available opportunities
- Funded loan portfolio
- Total invested & earned
- Interest tracking
- Performance metrics

---

## 🔒 Security & Trust

### Smart Contract Security

- **Audited Patterns**: OpenZeppelin battle-tested libraries
- **Reentrancy Protection**: NonReentrant modifier on all state-changing functions
- **Access Control**: Role-based permissions (Ownable)
- **Safe Math**: Built-in overflow protection (Solidity 0.8+)
- **Token Safety**: SafeERC20 for all transfers

### Risk Mitigation

**For Lenders:**
- Collateral exceeds loan value (LTV < 100%)
- AI-verified asset authentication
- Automatic liquidation mechanism
- Grace period for borrower emergencies
- On-chain transparency

**For Borrowers:**
- No credit check required
- Fair AI-based valuation
- Flexible repayment terms
- Collateral returned on completion
- Privacy-preserving design

### KYC & Compliance

- Optional KYC for larger loans
- Document verification
- AML screening
- Regulatory compliance framework
- User data encryption

---

## 🌍 Impact & Use Cases

### Target Users

**Small & Medium Enterprises (SMEs)**
- Retail shop owners
- Manufacturers
- Service providers
- Freelancers
- Gig economy workers

**Geographic Focus**
- Nigeria (primary)
- Sub-Saharan Africa
- Southeast Asia
- Latin America
- Emerging markets globally

### Real-World Scenarios

**Example 1: Phone Shop Owner (Nigeria)**
- Owns 20 smartphones worth $10,000
- Needs $6,000 for inventory restocking
- Uploads phones → AI values at $10,500
- Gets loan of $6,000 (60% LTV) at 15% APR for 60 days
- Repays $6,150 after selling inventory
- Unlocks phones, expands business

**Example 2: Tailor (Kenya)**
- Owns industrial sewing machine worth $2,000
- Needs $1,200 for fabric purchase
- Uploads machine → AI values at $1,950
- Gets loan of $1,200 (62% LTV) at 12% APR for 45 days
- Repays $1,218 after completing orders
- Unlocks machine, continues operations

**Example 3: Delivery Driver (Philippines)**
- Owns motorcycle worth $3,500
- Needs $2,000 for vehicle maintenance
- Uploads motorcycle → AI values at $3,400
- Gets loan of $2,000 (59% LTV) at 18% APR for 30 days
- Repays $2,030 after working
- Unlocks motorcycle, back to earning

---

## 🚀 Getting Started

### For Borrowers

1. **Visit TokenLend Platform**
   ```
   https://tokenlend.app
   ```

2. **Connect Wallet**
   - Click "Connect Wallet"
   - Approve MetaMask/WalletConnect
   - Mantle network auto-configured

3. **Upload Asset**
   - Click "Borrow" → "Upload Asset"
   - Take 3-5 clear photos
   - Fill asset details
   - Submit for AI analysis

4. **Create Loan Request**
   - Review AI valuation
   - Set loan amount (up to max LTV)
   - Choose interest rate & duration
   - Submit request to marketplace

5. **Receive Funding**
   - Wait for lender to fund
   - Stablecoins sent to your wallet
   - Collateral NFT locked

6. **Repay Loan**
   - View repayment schedule
   - Make payments anytime
   - Track progress on dashboard
   - Unlock collateral on completion

### For Lenders

1. **Connect Wallet**
   - Same as borrowers

2. **Browse Marketplace**
   - Click "Lend" → See available loans
   - Filter by asset type, rate, LTV
   - Sort by risk/return

3. **Review Loan Details**
   - Click loan to see full details
   - Check AI assessment
   - Verify collateral value
   - Assess borrower (optional KYC)

4. **Fund Loan**
   - Click "Fund Loan"
   - Approve stablecoin transfer
   - Confirm transaction
   - Loan activated

5. **Track Investment**
   - Monitor on "My Investments" tab
   - View repayment progress
   - Track interest earned
   - (If default) Initiate liquidation

---

## 📊 Tokenomics & Fees

### Platform Fees

**Loan Origination Fee**: 1-3% (deducted from principal at funding)
- Small loans (<$500): 3%
- Medium loans ($500-$2,000): 2%
- Large loans (>$2,000): 1%

**Repayment Fee**: 0% (no penalty for early repayment)

**Liquidation Fee**: 5% (deducted from collateral value)

### Fee Distribution

- **70%**: Platform treasury (development, operations)
- **20%**: Insurance fund (cover defaults beyond collateral value)
- **10%**: Community rewards (future governance token holders)

### Interest Rates

**Set by Market Dynamics**
- Borrowers propose rate
- Lenders decide if acceptable
- Competitive marketplace ensures fair rates

**Typical Ranges**
- Low-risk assets (phones, laptops): 10-15% APR
- Medium-risk (vehicles, machinery): 15-20% APR
- High-risk (inventory, perishables): 20-30% APR

---

## 🛠️ Development

### Prerequisites

```bash
Node.js >= 18
npm or yarn
Git
MetaMask wallet
Mantle testnet MNT (from faucet)
```

### Installation

```bash
# Clone repository
git clone https://github.com/your-org/tokenlend.git
cd tokenlend

# Install dependencies
npm install --legacy-peer-deps

# Setup environment
cp .env.example .env.local
# Edit .env.local with your API keys

# Run development server
npm run dev
```

### Project Structure

```
tokenlend/
├── contracts/              # Solidity smart contracts
│   ├── AssetToken.sol
│   ├── LoanManager.sol
│   └── MockStablecoin.sol
├── backend/                # Express.js API
│   └── src/
│       ├── controllers/
│       ├── services/
│       ├── models/
│       └── routes/
├── frontend/               # Next.js application
│   ├── app/                # Pages (Next.js App Router)
│   ├── components/         # React components
│   ├── lib/                # Utilities, hooks, services
│   └── public/             # Static assets
├── test/                   # Smart contract tests
└── scripts/                # Deployment scripts
```

### Testing

```bash
# Smart contract tests
npx hardhat test

# Frontend tests
npm run test

# E2E tests
npm run test:e2e
```

### Deployment

```bash
# Deploy to Mantle testnet
npx hardhat run scripts/deploy.js --network mantleTestnet

# Verify contracts
npx hardhat verify --network mantleTestnet <CONTRACT_ADDRESS>
```

---

## 🗺️ Roadmap

### Phase 1: MVP (Current)
- [x] Smart contracts (AssetToken + LoanManager)
- [x] AI valuation engine (GPT-4 Vision)
- [x] Frontend UI (all pages)
- [ ] Smart contract integration
- [ ] Mantle testnet deployment
- [ ] Demo deployment

### Phase 2: Beta Launch
- [ ] IPFS integration for images
- [ ] KYC verification flow
- [ ] Email/SMS notifications
- [ ] Transaction history
- [ ] User profiles
- [ ] Security audit

### Phase 3: Mainnet
- [ ] Deploy to Mantle mainnet
- [ ] Real stablecoin support
- [ ] Fiat on/off-ramps
- [ ] Mobile apps (iOS/Android)
- [ ] Multi-language support
- [ ] Community governance

### Phase 4: Scale
- [ ] Expand to more asset types
- [ ] Institutional lender partnerships
- [ ] Credit scoring system
- [ ] Secondary loan marketplace
- [ ] Insurance products
- [ ] DAO governance

---

## 🤝 Contributing

We welcome contributions from the community!

### How to Contribute

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Development Guidelines

- Follow existing code style
- Write tests for new features
- Update documentation
- Keep commits atomic and descriptive

### Bug Reports

Use GitHub Issues with:
- Clear description
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable

---

## 📄 License

This project is licensed under the MIT License. See [LICENSE](./LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Mantle Network** for blockchain infrastructure
- **OpenAI** for GPT-4 Vision API
- **OpenZeppelin** for secure smart contract libraries
- **RainbowKit** for wallet connection UX
- **Vercel** for frontend hosting

---

## 📞 Contact

- **Website**: https://tokenlend.app
- **Email**: hello@tokenlend.app
- **Twitter**: @TokenLend
- **Discord**: [Join Community](https://discord.gg/tokenlend)
- **GitHub**: [tokenlend](https://github.com/your-org/tokenlend)

---

## 🏆 Hackathon

Built for **Mantle Hackathon 2026**

**Tracks:**
- 🏦 RWA/RealFi - Tokenizing real-world assets
- 🔗 DeFi & Composability - Lending protocol on Mantle
- 🤖 AI & Oracles - GPT-4 Vision for asset valuation
- 🎨 UX/Demo - Polished user experience

---

<div align="center">

**Empowering SMEs. Securing Lenders. Building Trust.**

Made with ❤️ for the next billion DeFi users

</div>
