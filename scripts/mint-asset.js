const hre = require("hardhat");

async function main() {
    console.log("🎨 Minting Asset NFT...\n");

    const [deployer] = await hre.ethers.getSigners();
    console.log("Minting for:", deployer.address);

    // Get deployed contract addresses
    const deploymentPath = "./deployments/localhost.json";
    const deployment = require("." + deploymentPath);

    const AssetToken = await hre.ethers.getContractAt(
        "AssetToken",
        deployment.contracts.assetToken
    );

    console.log("AssetToken address:", deployment.contracts.assetToken);

    // Mint an asset NFT
    console.log("\n📝 Minting asset...");
    const tx = await AssetToken.mintAsset(
        deployer.address,       // borrower
        "smartphone",           // assetType
        hre.ethers.utils.parseEther("450"),  // aiValuation (450 USD in wei)
        7000,                   // maxLTV (70% in basis points)
        "ipfs://QmTest123"      // uri (placeholder)
    );

    const receipt = await tx.wait();
    console.log("✅ Asset minted! Transaction:", receipt.hash);

    // Get the token ID from the event
    const event = receipt.logs.find(log => {
        try {
            return AssetToken.interface.parseLog(log).name === "AssetMinted";
        } catch {
            return false;
        }
    });

    if (event) {
        const parsed = AssetToken.interface.parseLog(event);
        const tokenId = parsed.args.tokenId;
        console.log("🎉 Asset Token ID:", tokenId.toString());
        console.log("\n✅ Now you can create a loan with assetTokenId:", tokenId.toString());
    }

    // Check asset details
    const asset = await AssetToken.getAsset(0);
    console.log("\n📊 Asset Details:");
    console.log("  Type:", asset.assetType);
    console.log("  Valuation:", hre.ethers.utils.formatEther(asset.aiValuation), "ETH equivalent");
    console.log("  Max LTV:", asset.maxLTV.toString(), "basis points");
    console.log("  Owner:", asset.borrower);
    console.log("  Locked:", asset.isLocked);

    const maxLoan = await AssetToken.getMaxLoanAmount(0);
    console.log("  Max Loan Amount:", hre.ethers.utils.formatUnits(maxLoan, 6), "USDT");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
