const hre = require("hardhat");

async function main() {
    const [account] = await hre.ethers.getSigners();
    const deployment = require("../deployments/localhost.json");

    const MockStablecoin = await hre.ethers.getContractAt(
        "MockStablecoin",
        deployment.contracts.mockStablecoin
    );

    const balance = await MockStablecoin.balanceOf(account.address);

    console.log("\n💰 Account Balance Check");
    console.log("=".repeat(50));
    console.log("Account:", account.address);
    console.log("mUSDT Balance:", hre.ethers.utils.formatUnits(balance, 6), "mUSDT");
    console.log("=".repeat(50) + "\n");

    if (balance.eq(0)) {
        console.log("❌ No mUSDT! You need mUSDT to fund loans.");
        console.log("\n💡 The deployment minted mUSDT to the deployer.");
        console.log("   Are you using the same account that deployed?");
    } else {
        console.log("✅ You have mUSDT to fund loans!");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
