/**
 * Contract ABIs and Addresses
 * Central export for all contract-related imports
 */

import AssetTokenABI from './abis/AssetToken.json';
import LoanManagerABI from './abis/LoanManager.json';
import MockStablecoinABI from './abis/MockStablecoin.json';

export { AssetTokenABI, LoanManagerABI, MockStablecoinABI };
export * from './addresses';

// Export ABI types for TypeScript
export type { ContractAddresses } from './addresses';
