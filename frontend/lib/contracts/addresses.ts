/**
 * Smart Contract Addresses
 *
 * This file contains deployed contract addresses for different networks.
 * Update these addresses after deploying to each network.
 */

export type ContractAddresses = {
    assetToken: `0x${string}`;
    loanManager: `0x${string}`;
    mockStablecoin: `0x${string}`;
    // Real stablecoins (for production)
    usdt?: `0x${string}`;
    usdc?: `0x${string}`;
};

/**
 * Contract addresses by chain ID
 */
export const CONTRACTS: Record<number, ContractAddresses> = {
    // Local Hardhat Network
    31337: {
        assetToken: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9',
        loanManager: '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707',
        mockStablecoin: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
    },

    // Mantle Sepolia Testnet
    5003: {
        assetToken: '0xC1B27b3088E42DDa3ec1e6cFDAF75326eF119d9b',
        loanManager: '0xe3f280493a9F02336B618Ef4d5Bd76a71a642150',
        mockStablecoin: '0x458Bc92f5dA2527475D63B3fEb56fC9085F82128',
    },

    // Mantle Mainnet
    5000: {
        assetToken: '0x0000000000000000000000000000000000000000', // TODO: Deploy and update
        loanManager: '0x0000000000000000000000000000000000000000', // TODO: Deploy and update
        mockStablecoin: '0x0000000000000000000000000000000000000000',
        // Real stablecoins on Mantle mainnet
        usdt: '0x201EBa5CC46D216Ce6DC03F6a759e8E766e956aE', // Real USDT on Mantle
        usdc: '0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9', // Real USDC on Mantle
    },
} as const;

/**
 * Get contract addresses for the current chain
 */
export function getContractAddresses(chainId: number): ContractAddresses | null {
    return CONTRACTS[chainId] || null;
}

/**
 * Check if contracts are deployed on the given chain
 */
export function areContractsDeployed(chainId: number): boolean {
    const addresses = CONTRACTS[chainId];
    if (!addresses) return false;

    // Check if addresses are not placeholder zeros
    return (
        addresses.assetToken !== '0x0000000000000000000000000000000000000000' &&
        addresses.loanManager !== '0x0000000000000000000000000000000000000000'
    );
}

/**
 * Default stablecoin to use for each network
 */
export function getDefaultStablecoin(chainId: number): `0x${string}` | null {
    const addresses = CONTRACTS[chainId];
    if (!addresses) return null;

    // Use real stablecoins on mainnet if available
    if (chainId === 5000 && addresses.usdt) {
        return addresses.usdt;
    }

    // Use mock stablecoin on testnets and local
    return addresses.mockStablecoin;
}

/**
 * Get stablecoin decimals
 */
export function getStablecoinDecimals(chainId: number, stablecoinAddress: string): number {
    // MNT has 18 decimals, most stablecoins have 6
    if (stablecoinAddress.toLowerCase() === '0x0000000000000000000000000000000000000000') {
        return 18; // MNT native token
    }

    const addresses = CONTRACTS[chainId];
    if (!addresses) return 6;

    // Check if it's mock stablecoin
    if (stablecoinAddress.toLowerCase() === addresses.mockStablecoin?.toLowerCase()) {
        return 6; // Mock USDT has 6 decimals
    }

    // Real USDT/USDC have 6 decimals
    return 6;
}
