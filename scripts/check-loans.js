const hre = require("hardhat");

async function main() {
    console.log("📊 Checking Loans on Blockchain...\n");

    const [account] = await hre.ethers.getSigners();
    console.log("Checking from account:", account.address);

    // Get deployed contract addresses
    const deploymentPath = "./deployments/localhost.json";
    const deployment = require("." + deploymentPath);

    const LoanManager = await hre.ethers.getContractAt(
        "LoanManager",
        deployment.contracts.loanManager
    );

    console.log("LoanManager address:", deployment.contracts.loanManager);
    console.log("\n" + "=".repeat(80) + "\n");

    // Try to fetch loans
    let loanId = 0;
    let foundLoans = 0;

    while (loanId < 10) {
        try {
            const loan = await LoanManager.getLoan(loanId);

            // Check if loan exists (borrower is not zero address)
            if (loan.borrower === "0x0000000000000000000000000000000000000000") {
                console.log(`No more loans found. Total: ${foundLoans}\n`);
                break;
            }

            foundLoans++;

            console.log(`📋 LOAN #${loanId}`);
            console.log("  Borrower:", loan.borrower);
            console.log("  Lender:", loan.lender === "0x0000000000000000000000000000000000000000" ? "UNFUNDED" : loan.lender);
            console.log("  Asset Token ID:", loan.assetTokenId.toString());
            console.log("  Principal:", hre.ethers.utils.formatUnits(loan.principal, 6), "USDT");
            console.log("  Interest Rate:", (loan.interestRate / 100).toString() + "%");
            console.log("  Duration:", (loan.duration / 86400).toString(), "days");
            console.log("  Total Repayment:", hre.ethers.utils.formatUnits(loan.totalRepayment, 6), "USDT");
            console.log("  Amount Repaid:", hre.ethers.utils.formatUnits(loan.amountRepaid, 6), "USDT");

            const statusNames = ["Active", "Repaid", "Liquidated", "Defaulted"];
            console.log("  Status:", statusNames[loan.status] || "Unknown");

            if (loan.startTime > 0) {
                const startDate = new Date(loan.startTime * 1000);
                console.log("  Start Time:", startDate.toLocaleString());
            } else {
                console.log("  Start Time: Not funded yet");
            }

            console.log("\n" + "-".repeat(80) + "\n");

            loanId++;
        } catch (err) {
            console.log(`\nError fetching loan ${loanId}:`, err.message);
            break;
        }
    }

    if (foundLoans === 0) {
        console.log("❌ No loans found on the blockchain.");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
