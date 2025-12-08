const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const network = hre.network.name;

  console.log("\n🎮 TokenLend Interaction Script\n");
  console.log("Network:", network, "\n");

  // Load deployment data
  const deploymentFile = path.join(__dirname, "..", "deployments", `${network}.json`);

  if (!fs.existsSync(deploymentFile)) {
    console.error(`❌ No deployment file found for network: ${network}`);
    console.error(`   Please run deployment first: npx hardhat run scripts/deploy.js --network ${network}\n`);
    process.exit(1);
  }

  const deploymentData = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
  const { contracts } = deploymentData;

  console.log("📋 Loaded Deployment:");
  console.log("   AssetToken:  ", contracts.assetToken);
  console.log("   LoanManager: ", contracts.loanManager);
  if (contracts.mockStablecoin) {
    console.log("   MockStablecoin:", contracts.mockStablecoin, "\n");
  }

  // Get signers
  const [deployer, borrower, lender] = await hre.ethers.getSigners();

  console.log("👥 Accounts:");
  console.log("   Deployer:", deployer.address);
  console.log("   Borrower:", borrower.address);
  console.log("   Lender:  ", lender.address, "\n");

  // Get contract instances
  const AssetToken = await hre.ethers.getContractFactory("AssetToken");
  const assetToken = AssetToken.attach(contracts.assetToken);

  const LoanManager = await hre.ethers.getContractFactory("LoanManager");
  const loanManager = LoanManager.attach(contracts.loanManager);

  let mockStablecoin;
  if (contracts.mockStablecoin) {
    const MockStablecoin = await hre.ethers.getContractFactory("MockStablecoin");
    mockStablecoin = MockStablecoin.attach(contracts.mockStablecoin);
  }

  // ========================================
  // EXAMPLE INTERACTION FLOW
  // ========================================

  console.log("═══════════════════════════════════════════════════════════");
  console.log("🚀 Starting Example Loan Flow");
  console.log("═══════════════════════════════════════════════════════════\n");

  // Step 1: Mint test tokens to lender (if MockStablecoin exists)
  if (mockStablecoin) {
    console.log("1️⃣  Minting test tokens to lender...");
    const mintAmount = hre.ethers.utils.parseUnits("10000", 6); // 10,000 USDT
    await mockStablecoin.mint(lender.address, mintAmount);
    const lenderBalance = await mockStablecoin.balanceOf(lender.address);
    console.log("   ✅ Lender balance:", hre.ethers.utils.formatUnits(lenderBalance, 6), "mUSDT\n");
  }

  // Step 2: Mint an asset NFT for borrower
  console.log("2️⃣  Minting asset NFT for borrower...");
  const assetType = "smartphone";
  const aiValuation = hre.ethers.utils.parseEther("500"); // $500 USD
  const maxLTV = 7000; // 70% LTV
  const tokenURI = "ipfs://QmExample123"; // Example IPFS URI

  const mintTx = await assetToken.mintAsset(
    borrower.address,
    assetType,
    aiValuation,
    maxLTV,
    tokenURI
  );
  await mintTx.wait();

  const assetTokenId = 0; // First token
  const asset = await assetToken.getAsset(assetTokenId);
  const maxLoanAmount = await assetToken.getMaxLoanAmount(assetTokenId);

  console.log("   ✅ Asset NFT minted:");
  console.log("      Token ID:", assetTokenId);
  console.log("      Type:", asset.assetType);
  console.log("      Valuation:", hre.ethers.utils.formatEther(asset.aiValuation), "USD");
  console.log("      Max LTV:", asset.maxLTV / 100, "%");
  console.log("      Max Loan Amount:", hre.ethers.utils.formatEther(maxLoanAmount), "USD\n");

  // Step 3: Create loan request
  console.log("3️⃣  Creating loan request...");
  const loanAmount = hre.ethers.utils.parseUnits("300", 6); // $300 (below max LTV)
  const interestRate = 1000; // 10% annual
  const duration = 30 * 24 * 60 * 60; // 30 days in seconds
  const stablecoin = contracts.mockStablecoin || hre.ethers.constants.AddressZero;

  const createLoanTx = await loanManager.connect(borrower).createLoan(
    assetTokenId,
    loanAmount,
    interestRate,
    duration,
    stablecoin
  );
  const receipt = await createLoanTx.wait();

  // Get loan ID from event
  const loanCreatedEvent = receipt.logs.find(
    log => log.fragment && log.fragment.name === "LoanCreated"
  );
  const loanId = loanCreatedEvent ? loanCreatedEvent.args[0] : 0n;

  const loan = await loanManager.getLoan(loanId);

  console.log("   ✅ Loan created:");
  console.log("      Loan ID:", loanId.toString());
  console.log("      Principal:", hre.ethers.utils.formatUnits(loan.principal, 6), "USDT");
  console.log("      Interest Rate:", loan.interestRate / 100, "%");
  console.log("      Duration:", loan.duration / (24 * 60 * 60), "days");
  console.log("      Total Repayment:", hre.ethers.utils.formatUnits(loan.totalRepayment, 6), "USDT\n");

  // Step 4: Fund the loan (lender)
  if (mockStablecoin) {
    console.log("4️⃣  Funding loan...");

    // Approve LoanManager to spend lender's tokens
    const approveTx = await mockStablecoin.connect(lender).approve(
      contracts.loanManager,
      loan.principal
    );
    await approveTx.wait();

    // Fund the loan
    const fundTx = await loanManager.connect(lender).fundLoan(loanId);
    await fundTx.wait();

    const updatedLoan = await loanManager.getLoan(loanId);
    console.log("   ✅ Loan funded:");
    console.log("      Lender:", updatedLoan.lender);
    console.log("      Start Time:", new Date(Number(updatedLoan.startTime) * 1000).toLocaleString(), "\n");
  }

  // Step 5: Make partial repayment (borrower)
  if (mockStablecoin) {
    console.log("5️⃣  Making partial repayment...");

    // Give borrower some tokens to repay
    await mockStablecoin.mint(borrower.address, loan.totalRepayment);

    const repaymentAmount = loan.totalRepayment / 2n; // Pay 50%

    // Approve LoanManager to spend borrower's tokens
    const approveTx = await mockStablecoin.connect(borrower).approve(
      contracts.loanManager,
      repaymentAmount
    );
    await approveTx.wait();

    // Make repayment
    const repayTx = await loanManager.connect(borrower).makeRepayment(loanId, repaymentAmount);
    await repayTx.wait();

    const updatedLoan = await loanManager.getLoan(loanId);
    const remaining = updatedLoan.totalRepayment - updatedLoan.amountRepaid;

    console.log("   ✅ Repayment made:");
    console.log("      Amount Paid:", hre.ethers.utils.formatUnits(repaymentAmount, 6), "USDT");
    console.log("      Total Repaid:", hre.ethers.utils.formatUnits(updatedLoan.amountRepaid, 6), "USDT");
    console.log("      Remaining:", hre.ethers.utils.formatUnits(remaining, 6), "USDT");
    console.log("      Status:", getLoanStatus(updatedLoan.status), "\n");
  }

  console.log("═══════════════════════════════════════════════════════════");
  console.log("✅ Example flow completed successfully!");
  console.log("═══════════════════════════════════════════════════════════\n");

  // Print contract addresses for reference
  console.log("📌 Contract Addresses:");
  console.log("   AssetToken:  ", contracts.assetToken);
  console.log("   LoanManager: ", contracts.loanManager);
  if (contracts.mockStablecoin) {
    console.log("   MockStablecoin:", contracts.mockStablecoin);
  }
  console.log();
}

function getLoanStatus(status) {
  const statuses = ["Active", "Repaid", "Liquidated", "Defaulted"];
  return statuses[status] || "Unknown";
}

// Execute interaction
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Interaction failed:", error);
    process.exit(1);
  });
