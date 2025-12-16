# TokenLend Frontend

## Table of Contents
- [Overview](#overview)
- [Architecture & User Flow](#architecture--user-flow)
- [Authentication System](#authentication-system)
- [Currency Display](#currency-display)
- [AI Valuation](#ai-valuation)
- [What's Built](#whats-built)
- [What's Needed](#whats-needed)
- [Setup Instructions](#setup-instructions)

---

## Overview

TokenLend is a decentralized RWA-backed SME lending platform built for the Mantle Hackathon.

### Tech Stack
- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v3
- **Web3**: wagmi v3, RainbowKit, viem, ethers v6
- **Backend**: Express.js, MongoDB, JWT authentication
- **AI**: OpenAI GPT-4 Vision API for asset valuation
- **Blockchain**: Mantle Network, Solidity 0.8.20

---

## Architecture & User Flow

### How Users Access the Platform

**There is NO separate borrower/lender selection**. The platform uses a **unified account system**:

1. **Single User Account** - Users connect wallet OR sign up with email/password
2. **Role-Based Navigation**:
   - Same wallet address can use both borrower AND lender features
   - Clicking "Borrow" (navbar) → Borrower dashboard (/borrow)
   - Clicking "Lend" (navbar) → Lender dashboard (/lend)
   - **Same account, different interfaces based on what user wants to do**

### User Journey Example
User connects wallet → Can browse loans to fund (lender) AND upload assets to borrow (borrower)

**Key Point**: Users don't "sign up as borrower or lender" - they use different parts of the platform based on their needs at that moment.

---

## Authentication System

### Dual Authentication (Both Work Together)

#### 1. Web3 Wallet (Primary - For Blockchain)
- Connect MetaMask/wallet via RainbowKit
- Used for: transactions, reading blockchain data, loan interactions

#### 2. Email/Password + JWT (Backend)
- Traditional login for backend API access
- Used for: AI valuation, user profiles, KYC, off-chain data

### How They Work Together
1. User connects wallet → Gets blockchain address
2. User logs in with email → Gets JWT token for backend
3. Backend links wallet to email account
4. Frontend uses wallet for transactions + JWT for API calls

### Current Status
- ✅ Backend has full JWT auth
- ⚠️ Frontend NOT connected to backend auth yet (only wallet connection works)

---

## Currency Display

### The Naira (NGN) Question

**Yes, you're seeing NGN because it's dummy/mock data!**

#### Current State
```typescript
// All mock data shows NGN amounts (₦200,000, etc.)
formatCurrency(200000) // → ₦200,000
```

#### Actual Smart Contract Design
- Uses stablecoins (USDT, USDC, MNT) on blockchain
- Values stored in wei (smallest unit)
- 1 USDT = $1 USD approximately

#### What Should Happen
When connected to real contracts, amounts will display as:
```typescript
formatCurrency(500, 'USD') // → $500 (USDT)
```

#### Why NGN in Mock Data?
- Testing with realistic Nigerian SME loan sizes
- Easy numbers during development  
- **Will be replaced with USDT/USD when contracts integrated**

---

## AI Valuation

### Current Setup
- Backend uses OpenAI GPT-4 Vision API
- Analyzes asset images for condition + value estimation
- Returns: condition score, damage notes, estimated value, red flags

### Why You Skipped It
**OpenAI API requires paid credits**
- No API key = API calls fail
- Backend has built-in fallback mode that returns safe defaults:
  ```javascript
  {
    physicalCondition: "good",
    conditionScore: 0.70,
    confidence: 0.0,
    redFlags: ["AI analysis not performed (testing mode)"]
  }
  ```

### Workaround Options
1. **Use Fallback Mode** (Current) - Works without API key
2. **Fund OpenAI Account** - Add $5-10, costs ~$0.01-0.03 per image
3. **Mock Endpoint** - Create test endpoint with dummy AI responses

### Current Status
- ✅ AI service fully built
- ⚠️ Not funded, using fallback
- **Recommendation**: Use fallback for demo, mention "AI powered by GPT-4 Vision" in presentation

---

## What's Built

### ✅ Completed

#### Smart Contracts
- ✅ AssetToken.sol (ERC-721 NFT collateral)
- ✅ LoanManager.sol (Loan lifecycle)
- ✅ AssetToken tests
- ⚠️ Needs: LoanManager tests, Mantle deployment

#### Backend API  
- ✅ JWT authentication (signup/login/profile)
- ✅ AI valuation engine (GPT-4 Vision)
- ✅ User management with KYC
- ⚠️ Needs: IPFS integration, loan tracking endpoints

#### Frontend
- ✅ Landing page with hero
- ✅ Responsive navbar with wallet connect
- ✅ Borrower dashboard (view loans, stats)
- ✅ Lender dashboard (browse loans, fund, track)
- ✅ Asset upload flow (multi-step)
- ✅ Loan request form
- ✅ AI valuation display
- ✅ UI components library (Input, Modal, Toast, Badge, Spinner, etc.)
- ✅ Loan detail pages
- ⚠️ Needs: Smart contract hooks, backend API integration

---

## What's Needed

### 🔴 Critical (Required for Demo)

1. **Smart Contract Integration**
   - Extract ABIs from compiled contracts
   - Create wagmi hooks (useCreateLoan, useFundLoan, useRepayLoan)
   - Replace all mock data with blockchain data

2. **Deploy Contracts to Mantle**
   - Write deployment script
   - Deploy to Mantle testnet
   - Get contract addresses
   - Update frontend config

3. **Backend API Client**
   - Create axios instance with JWT
   - Build API services (auth, valuation, assets)
   - Create login/signup pages
   - JWT token storage

### 🟡 Important

4. **Repayment Interface** - Transaction handling for payments
5. **State Management** - Zustand store for global state
6. **API Proxy Routes** - Next.js /api routes

### 🟢 Nice to Have

7. **Error Handling** - Comprehensive error states
8. **Testing** - Unit + integration tests
9. **Mobile Testing** - Responsive design verification

---

## Setup Instructions

### 1. Install Dependencies
```bash
cd frontend
npm install --legacy-peer-deps
```

### 2. Environment Variables
Create `.env.local`:
```bash
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
NEXT_PUBLIC_API_URL=http://localhost:5000/api

# Will add after contract deployment:
# NEXT_PUBLIC_ASSET_TOKEN_ADDRESS=
# NEXT_PUBLIC_LOAN_MANAGER_ADDRESS=
```

### 3. Run Development
```bash
npm run dev
```
Visit: http://localhost:3000

### 4. Test Pages
- Homepage: `/`
- Borrow: `/borrow`
- Lend: `/lend`
- Upload Asset: `/borrow/upload`
- UI Demo: `/components-demo`

---

## Next Priority

**Estimated 6-8 hours to working demo:**

1. Deploy contracts (30 min)
2. Smart contract integration (2-3 hours)  
3. Backend integration (2 hours)
4. Testing (1 hour)
5. Polish (1 hour)

---

## Key Answers

**Q: Do users select borrower or lender?**  
A: No! Same account accesses both via navbar. Click "Borrow" or "Lend".

**Q: Why Naira?**  
A: Mock data only. Real app uses USDT stablecoins.

**Q: AI not working?**  
A: Needs OpenAI credits. Fallback mode works fine for testing.

**Q: How to access account?**  
A: Connect wallet for blockchain + login for backend features.

**Q: What's next?**  
A: Deploy contracts, integrate with wagmi hooks, connect backend API.

---

Built for Mantle Hackathon 2026
