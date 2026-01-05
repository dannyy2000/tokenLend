/**
 * Custom Hooks - Central Export
 * All custom hooks for contract interactions and data fetching
 */

// Contract interaction hooks (write operations)
export { useMintAsset } from './useMintAsset';
export { useCreateLoan } from './useCreateLoan';
export { useCreateLoanWithMinting } from './useCreateLoanWithMinting';
export { useFundLoan } from './useFundLoan';
export { useRepayLoan } from './useRepayLoan';

// Data fetching hooks (read operations)
export { useGetLoan, useGetLoanCount, useGetUserLoans, useGetLoanStatus } from './useGetLoans';
export { useGetAvailableLoans, useGetLenderLoans, useGetBorrowerLoans } from './useGetAllLoans';
export { useGetAsset } from './useGetAsset';
