const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const network = hre.network.name;

  console.log("\n🔍 Starting contract verification...\n");
  console.log("Network:", network, "\n");

  // Load deployment data
  const deploymentFile = path.join(__dirname, "..", "deployments", `${network}.json`);

  if (!fs.existsSync(deploymentFile)) {
    console.error(`❌ No deployment file found for network: ${network}`);
    console.error(`   Expected file: ${deploymentFile}`);
    console.error(`   Please run deployment first: npx hardhat run scripts/deploy.js --network ${network}\n`);
    process.exit(1);
  }

  const deploymentData = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
  const { contracts, config } = deploymentData;

  console.log("📋 Found deployment data:");
  console.log("   Chain ID:", deploymentData.chainId);
  console.log("   Deployed by:", deploymentData.deployer);
  console.log("   Timestamp:", deploymentData.timestamp, "\n");

  // Verify AssetToken
  if (contracts.assetToken) {
    console.log("1️⃣  Verifying AssetToken...");
    try {
      await hre.run("verify:verify", {
        address: contracts.assetToken,
        constructorArguments: []
      });
      console.log("   ✅ AssetToken verified\n");
    } catch (error) {
      if (error.message.includes("Already Verified")) {
        console.log("   ℹ️  AssetToken already verified\n");
      } else {
        console.error("   ❌ Error verifying AssetToken:", error.message, "\n");
      }
    }
  }

  // Verify LoanManager
  if (contracts.loanManager && contracts.assetToken) {
    console.log("2️⃣  Verifying LoanManager...");
    try {
      await hre.run("verify:verify", {
        address: contracts.loanManager,
        constructorArguments: [
          contracts.assetToken,
          config.feeRecipient,
          config.platformFee
        ]
      });
      console.log("   ✅ LoanManager verified\n");
    } catch (error) {
      if (error.message.includes("Already Verified")) {
        console.log("   ℹ️  LoanManager already verified\n");
      } else {
        console.error("   ❌ Error verifying LoanManager:", error.message, "\n");
      }
    }
  }

  // Verify MockStablecoin (if deployed)
  if (contracts.mockStablecoin) {
    console.log("3️⃣  Verifying MockStablecoin...");
    try {
      await hre.run("verify:verify", {
        address: contracts.mockStablecoin,
        constructorArguments: [
          config.mockStablecoin.name,
          config.mockStablecoin.symbol,
          config.mockStablecoin.decimals
        ]
      });
      console.log("   ✅ MockStablecoin verified\n");
    } catch (error) {
      if (error.message.includes("Already Verified")) {
        console.log("   ℹ️  MockStablecoin already verified\n");
      } else {
        console.error("   ❌ Error verifying MockStablecoin:", error.message, "\n");
      }
    }
  }

  console.log("═══════════════════════════════════════════════════════════");
  console.log("✅ Verification process completed!\n");

  // Print explorer links
  const explorerUrl = getExplorerUrl(network);
  if (explorerUrl) {
    console.log("🔗 View on Block Explorer:");
    console.log(`   AssetToken:     ${explorerUrl}/address/${contracts.assetToken}`);
    console.log(`   LoanManager:    ${explorerUrl}/address/${contracts.loanManager}`);
    if (contracts.mockStablecoin) {
      console.log(`   MockStablecoin: ${explorerUrl}/address/${contracts.mockStablecoin}`);
    }
    console.log();
  }
}

function getExplorerUrl(network) {
  const explorers = {
    mantleTestnet: "https://sepolia.mantlescan.xyz",
    mantleMainnet: "https://mantlescan.xyz",
    mainnet: "https://mantlescan.xyz"
  };
  return explorers[network] || null;
}

// Execute verification
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Verification failed:", error);
    process.exit(1);
  });
