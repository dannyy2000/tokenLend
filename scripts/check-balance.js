const hre = require("hardhat");

async function main() {
  const network = hre.network.name;
  console.log(`\n💰 Checking balances on ${network}...\n`);

  // Load deployment addresses
  const deploymentFile = `./deployments/${network}.json`;
  const deployment = require(deploymentFile);

  const mockStablecoinAddress = deployment.contracts.mockStablecoin;
  const walletAddress = "0x133b345dcb54838fa841E6E85bC5b9CEA07E946D";

  // Get MockStablecoin contract
  const MockStablecoin = await hre.ethers.getContractFactory("MockStablecoin");
  const mockStablecoin = MockStablecoin.attach(mockStablecoinAddress);

  // Check balance
  const balance = await mockStablecoin.balanceOf(walletAddress);
  const decimals = await mockStablecoin.decimals();
  const formattedBalance = hre.ethers.utils.formatUnits(balance, decimals);

  console.log(`Wallet: ${walletAddress}`);
  console.log(`mUSDT Balance: ${formattedBalance} mUSDT\n`);

  if (balance.eq(0)) {
    console.log("⚠️  Balance is 0. Would you like to mint tokens?\n");
  } else {
    console.log("✅ Wallet has mUSDT tokens!\n");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
