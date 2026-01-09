/**
 * Mint test USDT tokens for testing repayments
 * Usage: node scripts/mintTestTokens.js <recipient_address> <amount>
 */

const { ethers } = require('hardhat');

async function main() {
    // Get environment variables
    const recipient = process.env.RECIPIENT_ADDRESS;
    const amountInUSDT = process.env.AMOUNT || '10000'; // Default 10,000 USDT

    if (!recipient) {
        console.error('❌ Error: Please provide recipient address');
        console.log('Usage: RECIPIENT_ADDRESS=0x123... AMOUNT=5000 npx hardhat run scripts/mintTestTokens.js --network mantleTestnet');
        process.exit(1);
    }

    console.log('\n🪙 Minting Test USDT Tokens');
    console.log('═══════════════════════════════════════\n');

    // MockStablecoin address on Mantle Sepolia
    const MOCK_USDT_ADDRESS = '0x54aF4970919944464beFD9244F4Ff9f16dCc2365';

    // USDT has 6 decimals
    const amount = ethers.utils.parseUnits(amountInUSDT, 6);

    // Get signer
    const [signer] = await ethers.getSigners();
    console.log('📝 Signer:', signer.address);
    console.log('👤 Recipient:', recipient);
    console.log('💰 Amount:', amountInUSDT, 'USDT\n');

    // Get MockStablecoin contract
    const MockStablecoin = await ethers.getContractAt(
        'MockStablecoin',
        MOCK_USDT_ADDRESS
    );

    // Check current balance
    const balanceBefore = await MockStablecoin.balanceOf(recipient);
    console.log('📊 Current balance:', ethers.utils.formatUnits(balanceBefore, 6), 'USDT');

    // Mint tokens using faucet function
    console.log('\n⏳ Minting tokens...');
    const tx = await MockStablecoin.connect(signer).mint(recipient, amount);

    console.log('📤 Transaction hash:', tx.hash);
    console.log('⏳ Waiting for confirmation...');

    await tx.wait();

    // Check new balance
    const balanceAfter = await MockStablecoin.balanceOf(recipient);
    console.log('\n✅ Tokens minted successfully!');
    console.log('📊 New balance:', ethers.utils.formatUnits(balanceAfter, 6), 'USDT');
    console.log('💵 Minted:', ethers.utils.formatUnits(amount, 6), 'USDT\n');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    });
