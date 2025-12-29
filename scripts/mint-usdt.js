const hre = require("hardhat");

async function main() {
  const network = hre.network.name;
  console.log(`\n💰 Minting mUSDT on ${network}...\n`);

  const mockStablecoinAddress = "0x458Bc92f5dA2527475D63B3fEb56fC9085F82128";
  const walletAddress = "0x133b345dcb54838fa841E6E85bC5b9CEA07E946D";
  const amountToMint = hre.ethers.utils.parseUnits("1000000", 6); // 1M mUSDT

  // Get MockStablecoin contract
  const MockStablecoin = await hre.ethers.getContractFactory("MockStablecoin");
  const mockStablecoin = MockStablecoin.attach(mockStablecoinAddress);

  console.log("📋 Details:");
  console.log("  Contract:", mockStablecoinAddress);
  console.log("  Recipient:", walletAddress);
  console.log("  Amount:", hre.ethers.utils.formatUnits(amountToMint, 6), "mUSDT\n");

  // Check current balance
  const balanceBefore = await mockStablecoin.balanceOf(walletAddress);
  console.log("💼 Balance Before:", hre.ethers.utils.formatUnits(balanceBefore, 6), "mUSDT");

  // Mint tokens
  console.log("\n⏳ Minting tokens...");
  const tx = await mockStablecoin.mint(walletAddress, amountToMint);
  await tx.wait();
  console.log("✅ Transaction confirmed:", tx.hash);

  // Check new balance
  const balanceAfter = await mockStablecoin.balanceOf(walletAddress);
  console.log("\n💼 Balance After:", hre.ethers.utils.formatUnits(balanceAfter, 6), "mUSDT");
  console.log("\n🎉 Successfully minted mUSDT!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
