# Loan Repayment Guide

## Overview

TokenLend's loan repayment system allows borrowers to repay their loans (partial or full) and automatically unlocks collateral NFTs upon full repayment. This guide covers how repayment works from both technical and user perspectives.

---

## How Loan Repayment Works

### For Borrowers

**Two-Step Blockchain Process:**

1. **Approve** - Grant the LoanManager contract permission to spend your stablecoins
2. **Repay** - Transfer the repayment amount to the lender

**Repayment Options:**
- **Partial Repayment**: Pay less than the full amount owed
- **Full Repayment**: Pay the complete `totalRepayment` amount to close the loan

---

## Interest Calculation

TokenLend uses **simple interest** calculated upfront at loan creation:

### Formula

```
interest = (principal × interestRate × duration) / (10000 × 365 days)
totalRepayment = principal + interest
```

### Example

- **Principal**: 100,000 mUSDT
- **Interest Rate**: 1000 basis points (10% APR)
- **Duration**: 90 days

```
interest = (100,000 × 1000 × 90 days) / (10000 × 365 days)
         = 9,000,000,000 / 3,650,000
         = 2,465 mUSDT

totalRepayment = 100,000 + 2,465 = 102,465 mUSDT
```

**Key Points:**
- Interest is fixed at loan creation (no variable rates)
- Interest does NOT compound
- Early repayment does NOT reduce interest (interest is pre-calculated)

---

## Repayment Flow

### Step-by-Step Process

#### 1. **Check Loan Details**

Visit your borrower dashboard or loan detail page to see:
- Total amount owed (`totalRepayment`)
- Amount already repaid (`amountRepaid`)
- Remaining balance (`totalRepayment - amountRepaid`)
- Due date

#### 2. **Initiate Repayment**

Click "Make Payment" button in the borrower dashboard.

#### 3. **Enter Repayment Amount**

- Minimum: Any amount > 0
- Maximum: Remaining balance
- Suggested: Full remaining balance

#### 4. **Approve Transaction (MetaMask Popup #1)**

- Contract: MockStablecoin (mUSDT)
- Action: Approve spending
- Amount: Your repayment amount
- Gas fee: ~0.0001 MNT

**What this does**: Gives LoanManager permission to transfer your mUSDT.

#### 5. **Confirm Repayment (MetaMask Popup #2)**

- Contract: LoanManager
- Action: Make repayment
- Gas fee: ~0.0002 MNT

**What this does**: Transfers mUSDT from your wallet to the lender.

#### 6. **Repayment Confirmed**

- Transaction hash displayed
- Loan status updated
- If full repayment: Collateral NFT automatically unlocked

---

## Partial vs Full Repayment

### Partial Repayment

**When to use:**
- You want to reduce debt but can't pay in full yet
- Testing the repayment system
- Managing cash flow

**What happens:**
- `amountRepaid` increases by your payment amount
- Loan status remains "Active"
- Collateral stays locked
- You can make multiple partial payments

**Example:**
```
Total Owed: 102,465 mUSDT
First Payment: 50,000 mUSDT
Remaining: 52,465 mUSDT
Status: Still Active

Second Payment: 52,465 mUSDT
Remaining: 0 mUSDT
Status: Repaid ✅
```

### Full Repayment

**When to use:**
- You want to close the loan and retrieve your collateral
- Loan is about to expire

**What happens:**
- Loan status changes to "Repaid"
- Collateral NFT automatically unlocks
- You regain full control of your asset NFT
- Loan removed from active loans list

**Condition:**
```solidity
if (amountRepaid >= totalRepayment) {
    status = LoanStatus.Repaid;
    assetToken.unlockAsset(assetTokenId);
}
```

---

## Collateral Unlock Process

### Automatic Unlock

When you make the final repayment:

1. Smart contract checks: `amountRepaid >= totalRepayment`
2. If true:
   - Loan status → "Repaid"
   - `AssetToken.unlockAsset(tokenId)` called
   - NFT ownership remains with you
   - NFT can now be transferred or used as collateral again

### Manual Verification

After full repayment, verify on the blockchain:

```bash
# Check loan status
cast call <LOAN_MANAGER_ADDRESS> "loans(uint256)(uint8)" <LOAN_ID> --rpc-url https://rpc.sepolia.mantle.xyz

# 0 = Active, 1 = Repaid, 2 = Liquidated

# Check if asset is locked
cast call <ASSET_TOKEN_ADDRESS> "lockedAssets(uint256)(bool)" <TOKEN_ID> --rpc-url https://rpc.sepolia.mantle.xyz

# false = unlocked ✅
```

---

## Transaction Flow Diagram

```
┌─────────────┐
│  Borrower   │
│   Wallet    │
└──────┬──────┘
       │
       │ 1. Approve mUSDT spending
       ▼
┌────────────────┐
│ MockStablecoin │
│   (mUSDT)      │
└────────┬───────┘
         │
         │ 2. Approval confirmed
         ▼
┌─────────────────┐
│  LoanManager    │
│   Contract      │
└────────┬────────┘
         │
         │ 3. makeRepayment(loanId, amount)
         ▼
┌────────────────┐     ┌──────────────┐
│ Transfer mUSDT │────▶│    Lender    │
│  to Lender     │     │    Wallet    │
└────────┬───────┘     └──────────────┘
         │
         │ 4. Update amountRepaid
         ▼
┌────────────────┐
│ Check if Full? │
└────────┬───────┘
         │
    ┌────┴────┐
    │   YES   │
    ▼         │
┌─────────────────┐
│ Unlock Asset NFT│
│ Status = Repaid │
└─────────────────┘
         │
    ┌────┴────┐
    │   NO    │
    ▼
┌─────────────────┐
│ Status = Active │
│ Wait for more   │
│   payments      │
└─────────────────┘
```

---

## Smart Contract Functions

### `makeRepayment(uint256 loanId, uint256 amount)`

**Location**: `LoanManager.sol` lines 219-245

**Requirements:**
- Caller must be the borrower
- Loan must be Active
- Loan must be funded (lender ≠ 0x0)
- Amount must be ≤ remaining balance
- Borrower must have sufficient mUSDT balance
- Borrower must have approved LoanManager to spend amount

**Events Emitted:**
- `RepaymentMade(loanId, borrower, amount, remaining)`
- `LoanRepaid(loanId, borrower)` (if full repayment)

**Source Code:**
```solidity
function makeRepayment(uint256 loanId, uint256 amount) external nonReentrant {
    Loan storage loan = loans[loanId];

    require(loan.status == LoanStatus.Active, "Loan not active");
    require(msg.sender == loan.borrower, "Not the borrower");
    require(loan.lender != address(0), "Loan not funded");

    uint256 remaining = loan.totalRepayment - loan.amountRepaid;
    require(amount <= remaining, "Amount exceeds remaining balance");

    // Transfer repayment to lender
    IERC20(loan.stablecoin).transferFrom(msg.sender, loan.lender, amount);

    loan.amountRepaid += amount;

    emit RepaymentMade(loanId, msg.sender, amount, loan.totalRepayment - loan.amountRepaid);

    // If fully repaid, unlock collateral
    if (loan.amountRepaid >= loan.totalRepayment) {
        loan.status = LoanStatus.Repaid;
        assetToken.unlockAsset(loan.assetTokenId);
        emit LoanRepaid(loanId, msg.sender);
    }
}
```

---

## Frontend Integration

### React Hook: `useRepayLoan`

**Location**: `/frontend/lib/hooks/useRepayLoan.ts`

**Usage:**
```typescript
import { useRepayLoan } from '@/lib/hooks';

function RepaymentModal({ loanId, stablecoinAddress, repaymentAmount }) {
  const { approveRepayment, makeRepayment, isApproving, isRepaying } = useRepayLoan();

  const handleRepay = async () => {
    // Step 1: Approve
    await approveRepayment(stablecoinAddress, repaymentAmount);

    // Step 2: Repay
    await makeRepayment(loanId, repaymentAmount);
  };

  return (
    <button onClick={handleRepay} disabled={isApproving || isRepaying}>
      {isApproving ? 'Approving...' : isRepaying ? 'Repaying...' : 'Make Payment'}
    </button>
  );
}
```

### Backend Sync

After blockchain transaction confirms, frontend syncs to backend:

```typescript
// PUT /api/loans/:loanId/repay
await fetch(`${API_URL}/api/loans/${loanId}/repay`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amount: repaymentAmount,
    transactionHash: tx.hash
  })
});
```

---

## Troubleshooting

### Common Issues

#### ❌ "Insufficient Allowance"

**Problem**: Approval amount too low or not confirmed

**Solution**:
1. Check approval transaction confirmed
2. Ensure approved amount ≥ repayment amount
3. Try re-approving with higher amount

#### ❌ "Insufficient Funds"

**Problem**: Not enough mUSDT in wallet

**Solution**:
1. Check mUSDT balance: `await mockStablecoin.balanceOf(address)`
2. Get more mUSDT from deployer or mint more

#### ❌ "Amount Exceeds Remaining Balance"

**Problem**: Trying to repay more than owed

**Solution**:
1. Check `loan.totalRepayment - loan.amountRepaid`
2. Reduce repayment amount to exact remaining balance

#### ❌ "Loan Not Active"

**Problem**: Loan already repaid or liquidated

**Solution**:
1. Check loan status
2. If repaid: Collateral already unlocked
3. If liquidated: Loan defaulted, collateral transferred to lender

#### ❌ "Not the Borrower"

**Problem**: Wrong wallet connected

**Solution**:
1. Switch to borrower wallet in MetaMask
2. Verify connected address matches `loan.borrower`

---

## Testing Repayment

### Test Scenarios

#### 1. Full Repayment
```bash
# Setup
Loan Amount: 100,000 mUSDT
Total Owed: 102,465 mUSDT

# Test
1. Make payment of 102,465 mUSDT
2. Verify loan status = Repaid
3. Verify NFT unlocked
4. Verify lender received funds
```

#### 2. Partial Repayments
```bash
# Test
1. Pay 50,000 mUSDT
   - Verify amountRepaid = 50,000
   - Verify loan still Active
   - Verify NFT still locked

2. Pay remaining 52,465 mUSDT
   - Verify loan status = Repaid
   - Verify NFT unlocked
```

#### 3. Overpayment Attempt
```bash
# Test
1. Try to pay 150,000 mUSDT (more than owed)
2. Expect: Transaction reverts
3. Error: "Amount exceeds remaining balance"
```

---

## API Endpoints

### Backend Repayment Endpoint

**PUT /api/loans/:loanId/repay**

**Request Body:**
```json
{
  "amount": "102465000000",
  "transactionHash": "0xabc123..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "loanId": "1",
    "amountRepaid": "102465000000",
    "status": "repaid",
    "transactionHash": "0xabc123..."
  }
}
```

---

## Best Practices

### For Borrowers

1. **Pay on Time**: Avoid liquidation (check due date)
2. **Full Repayment**: Pay full amount to unlock collateral
3. **Check Balance**: Ensure sufficient mUSDT before repaying
4. **Gas Fees**: Keep some MNT for transaction fees
5. **Verify Unlock**: After full payment, check NFT is unlocked

### For Developers

1. **Error Handling**: Wrap transactions in try-catch
2. **Transaction Confirmation**: Wait for blockchain confirmation
3. **Backend Sync**: Always sync blockchain state to backend
4. **Status Display**: Show clear repayment progress (X / Y paid)
5. **Testing**: Test with small amounts first

---

## Security Considerations

1. **Reentrancy Protection**: `nonReentrant` modifier prevents attacks
2. **Overflow Protection**: Solidity 0.8+ has built-in checks
3. **Authorization**: Only borrower can repay their own loan
4. **Direct Transfer**: Funds go directly to lender (no intermediary)
5. **Atomic Unlock**: Collateral unlock happens in same transaction

---

## Summary

✅ **Repayment is fully implemented and functional**
✅ **Supports both partial and full repayments**
✅ **Automatic collateral unlock on full repayment**
✅ **Simple interest calculation (fixed at creation)**
✅ **Two-step approval + repayment process**
✅ **Backend sync for UI state management**

**Ready to test!** Follow the steps in this guide to make your first repayment.
