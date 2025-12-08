const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("\n🚀 Starting TokenLend deployment...\n");

  const [deployer] = await hre.ethers.getSigners();
  const network = hre.network.name;

  console.log("📋 Deployment Details:");
  console.log("  Network:", network);
  console.log("  Deployer:", deployer.address);
  console.log("  Balance:", hre.ethers.utils.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "ETH\n");

  // Deployment configuration
  const config = {
    platformFee: 100, // 1% (in basis points)
    feeRecipient: deployer.address, // Can be changed to treasury address
    mockStablecoin: {
      name: "Mock USDT",
      symbol: "mUSDT",
      decimals: 6,
      initialSupply: hre.ethers.utils.parseUnits("1000000", 6) // 1M tokens for testing
    }
  };

  const deployments = {};

  // 1. Deploy MockStablecoin (only for testing networks)
  if (network === "hardhat" || network === "localhost" || network === "mantleTestnet") {
    console.log("📝 Deploying MockStablecoin...");
    const MockStablecoin = await hre.ethers.getContractFactory("MockStablecoin");
    const mockStablecoin = await MockStablecoin.deploy(
      config.mockStablecoin.name,
      config.mockStablecoin.symbol,
      config.mockStablecoin.decimals
    );
    await mockStablecoin.deployed();

    console.log("  ✅ MockStablecoin deployed to:", mockStablecoin.address);

    // Mint initial supply to deployer for testing
    console.log("  💰 Minting initial supply to deployer...");
    await mockStablecoin.mint(deployer.address, config.mockStablecoin.initialSupply);
    console.log("  ✅ Minted", hre.ethers.utils.formatUnits(config.mockStablecoin.initialSupply, config.mockStablecoin.decimals), config.mockStablecoin.symbol, "\n");

    deployments.mockStablecoin = mockStablecoin.address;
  } else {
    console.log("⚠️  Skipping MockStablecoin deployment on mainnet (use real stablecoins)\n");
  }

  // 2. Deploy AssetToken
  console.log("📝 Deploying AssetToken...");
  const AssetToken = await hre.ethers.getContractFactory("AssetToken");
  const assetToken = await AssetToken.deploy();
  await assetToken.deployed();

  console.log("  ✅ AssetToken deployed to:", assetToken.address, "\n");
  deployments.assetToken = assetToken.address;

  // 3. Deploy LoanManager
  console.log("📝 Deploying LoanManager...");
  const LoanManager = await hre.ethers.getContractFactory("LoanManager");
  const loanManager = await LoanManager.deploy(
    assetToken.address,
    config.feeRecipient,
    config.platformFee
  );
  await loanManager.deployed();

  console.log("  ✅ LoanManager deployed to:", loanManager.address);
  console.log("     Fee Recipient:", config.feeRecipient);
  console.log("     Platform Fee:", config.platformFee / 100, "%\n");
  deployments.loanManager = loanManager.address;

  // 4. Authorize LoanManager in AssetToken
  console.log("🔐 Authorizing LoanManager in AssetToken...");
  const authTx = await assetToken.setAuthorizedManager(loanManager.address, true);
  await authTx.wait();
  console.log("  ✅ LoanManager authorized\n");

  // 5. Add supported stablecoins to LoanManager
  if (deployments.mockStablecoin) {
    console.log("💵 Adding MockStablecoin as supported stablecoin...");
    const addStablecoinTx = await loanManager.addSupportedStablecoin(deployments.mockStablecoin);
    await addStablecoinTx.wait();
    console.log("  ✅ MockStablecoin added as supported stablecoin\n");
  }

  // For mainnet/testnet, you would add real stablecoins here
  // Example:
  // const USDT_ADDRESS = "0x..."; // Real USDT address on Mantle
  // await loanManager.addSupportedStablecoin(USDT_ADDRESS);

  // 6. Save deployment addresses
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }

  const deploymentFile = path.join(deploymentsDir, `${network}.json`);
  const deploymentData = {
    network: network,
    chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: deployments,
    config: config
  };

  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentData, null, 2));
  console.log("💾 Deployment addresses saved to:", deploymentFile, "\n");

  // 7. Print summary
  console.log("✅ Deployment Summary:");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("AssetToken:     ", deployments.assetToken);
  console.log("LoanManager:    ", deployments.loanManager);
  if (deployments.mockStablecoin) {
    console.log("MockStablecoin: ", deployments.mockStablecoin);
  }
  console.log("═══════════════════════════════════════════════════════════");
  console.log("\n🎉 Deployment completed successfully!\n");

  // 8. Next steps
  console.log("📌 Next Steps:");
  if (network !== "hardhat" && network !== "localhost") {
    console.log("  1. Verify contracts on block explorer:");
    console.log(`     npx hardhat verify --network ${network} ${deployments.assetToken}`);
    console.log(`     npx hardhat verify --network ${network} ${deployments.loanManager} ${deployments.assetToken} ${config.feeRecipient} ${config.platformFee}`);
    if (deployments.mockStablecoin) {
      console.log(`     npx hardhat verify --network ${network} ${deployments.mockStablecoin} "${config.mockStablecoin.name}" "${config.mockStablecoin.symbol}" ${config.mockStablecoin.decimals}`);
    }
  }
  console.log("  2. Update frontend with contract addresses");
  console.log("  3. For mainnet: Add real stablecoin addresses (USDT, USDC, MNT)");
  console.log("  4. Test the deployment with interaction scripts\n");

  return deployments;
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
