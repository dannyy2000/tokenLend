# TokenLend Deployment Scripts

This directory contains deployment and interaction scripts for the TokenLend platform.

## Scripts Overview

### 1. `deploy.js` - Main Deployment Script
Deploys all TokenLend contracts to the specified network.

**What it deploys:**
- MockStablecoin (testing networks only)
- AssetToken (ERC-721 NFT for collateral)
- LoanManager (core lending logic)

**What it does:**
- Deploys contracts in the correct order
- Authorizes LoanManager in AssetToken
- Adds MockStablecoin as supported stablecoin
- Saves deployment addresses to `deployments/{network}.json`
- Provides verification commands

**Usage:**
```bash
# Local Hardhat network
npx hardhat run scripts/deploy.js --network hardhat

# Mantle Testnet
npx hardhat run scripts/deploy.js --network mantleTestnet

# Mantle Mainnet
npx hardhat run scripts/deploy.js --network mantleMainnet
```

**Configuration:**
Edit these values in `deploy.js` before deployment:
```javascript
const config = {
  platformFee: 100,           // 1% platform fee (in basis points)
  feeRecipient: deployer.address, // Change to treasury address
  mockStablecoin: {
    name: "Mock USDT",
    symbol: "mUSDT",
    decimals: 6,
    initialSupply: hre.ethers.utils.parseUnits("1000000", 6)
  }
};
```

---

### 2. `verify.js` - Contract Verification Script
Verifies deployed contracts on the block explorer (Mantlescan).

**Prerequisites:**
- Contracts must be deployed first
- `MANTLE_API_KEY` must be set in `.env`

**Usage:**
```bash
# Verify on Mantle Testnet
npx hardhat run scripts/verify.js --network mantleTestnet

# Verify on Mantle Mainnet
npx hardhat run scripts/verify.js --network mantleMainnet
```

**What it does:**
- Reads deployment data from `deployments/{network}.json`
- Verifies AssetToken, LoanManager, and MockStablecoin
- Provides explorer links to view contracts

---

### 3. `interact.js` - Interaction Demo Script
Demonstrates a complete loan flow using the deployed contracts.

**What it demonstrates:**
1. Minting test tokens to lender
2. Minting an asset NFT for borrower
3. Creating a loan request
4. Funding the loan (lender)
5. Making partial repayment (borrower)

**Usage:**
```bash
# Run on local network
npx hardhat run scripts/interact.js --network hardhat

# Run on Mantle Testnet
npx hardhat run scripts/interact.js --network mantleTestnet
```

**Note:** This script requires deployed contracts and uses test accounts from Hardhat's default signers.

---

## Deployment Workflow

### For Testing (Local/Testnet)

1. **Deploy contracts:**
   ```bash
   npx hardhat run scripts/deploy.js --network mantleTestnet
   ```

2. **Verify contracts (testnet only):**
   ```bash
   npx hardhat run scripts/verify.js --network mantleTestnet
   ```

3. **Test interactions:**
   ```bash
   npx hardhat run scripts/interact.js --network mantleTestnet
   ```

### For Production (Mainnet)

1. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env and add:
   # - PRIVATE_KEY (deployer wallet)
   # - MANTLE_API_KEY (for verification)
   ```

2. **Update deployment config:**
   - Set `feeRecipient` to your treasury address
   - Adjust `platformFee` if needed
   - Remove MockStablecoin deployment logic (or skip it)

3. **Deploy:**
   ```bash
   npx hardhat run scripts/deploy.js --network mantleMainnet
   ```

4. **Add real stablecoins:**
   After deployment, manually add real stablecoins (USDT, USDC, MNT) to LoanManager:
   ```bash
   # Use Hardhat console or create a custom script
   npx hardhat console --network mantleMainnet

   > const loanManager = await ethers.getContractAt("LoanManager", "0x...")
   > await loanManager.addSupportedStablecoin("0x...") // USDT address
   > await loanManager.addSupportedStablecoin("0x...") // USDC address
   ```

5. **Verify contracts:**
   ```bash
   npx hardhat run scripts/verify.js --network mantleMainnet
   ```

---

## Deployment Addresses

After deployment, addresses are saved in:
```
deployments/
  ├── hardhat.json        # Local network
  ├── mantleTestnet.json  # Testnet
  └── mantleMainnet.json  # Mainnet
```

**Example deployment file:**
```json
{
  "network": "mantleTestnet",
  "chainId": "5003",
  "deployer": "0x...",
  "timestamp": "2024-12-08T...",
  "contracts": {
    "assetToken": "0x...",
    "loanManager": "0x...",
    "mockStablecoin": "0x..."
  },
  "config": {
    "platformFee": 100,
    "feeRecipient": "0x..."
  }
}
```

---

## Network Configuration

Networks are configured in `hardhat.config.js`:

```javascript
networks: {
  mantleTestnet: {
    url: "https://rpc.sepolia.mantle.xyz",
    chainId: 5003,
    accounts: [process.env.PRIVATE_KEY]
  },
  mantleMainnet: {
    url: "https://rpc.mantle.xyz",
    chainId: 5000,
    accounts: [process.env.PRIVATE_KEY]
  }
}
```

---

## Stablecoin Addresses on Mantle

### Mantle Mainnet
- **USDT**: TBD (add after researching)
- **USDC**: TBD (add after researching)
- **MNT**: Native token

### Mantle Testnet
- Use MockStablecoin for testing
- Get testnet MNT from: https://faucet.testnet.mantle.xyz

---

## Troubleshooting

### "Deployment file not found"
- Run `deploy.js` first before running `verify.js` or `interact.js`

### "Not authorized" error
- Ensure LoanManager is authorized in AssetToken (deployment script does this automatically)

### "Stablecoin not supported" error
- Add stablecoin to LoanManager using `addSupportedStablecoin()`

### Verification fails
- Ensure `MANTLE_API_KEY` is set in `.env`
- Check that constructor arguments match exactly
- Wait a few minutes after deployment before verifying

---

## Security Checklist

Before mainnet deployment:

- [ ] Change `feeRecipient` to secure treasury address
- [ ] Review and adjust `platformFee` (default: 1%)
- [ ] Remove or comment out MockStablecoin deployment
- [ ] Add real stablecoin addresses
- [ ] Conduct security audit
- [ ] Test on testnet first
- [ ] Verify all contracts on block explorer
- [ ] Transfer ownership if needed (AssetToken, LoanManager)

---

## Additional Resources

- **Mantle Docs**: https://docs.mantle.xyz
- **Hardhat Docs**: https://hardhat.org/docs
- **Block Explorer**: https://mantlescan.xyz
- **Testnet Explorer**: https://sepolia.mantlescan.xyz
- **Faucet**: https://faucet.testnet.mantle.xyz
