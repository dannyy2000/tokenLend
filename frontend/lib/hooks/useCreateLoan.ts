/**
 * Hook to create a loan request
 * Used by borrowers to request a loan against their asset NFT
 */

import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { LoanManagerABI, getContractAddresses } from '@/lib/contracts';
import { useChainId } from 'wagmi';
import { parseUnits } from 'viem';

export function useCreateLoan() {
    const chainId = useChainId();
    const addresses = getContractAddresses(chainId);

    const {
        writeContract,
        data: hash,
        isPending,
        isError,
        error,
    } = useWriteContract();

    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
        hash,
    });

    /**
     * Create a loan request
     * @param assetTokenId - ID of the asset NFT to use as collateral
     * @param principal - Loan amount in stablecoin units (e.g., 500 for 500 USDT)
     * @param interestRate - Annual interest rate in basis points (e.g., 1000 = 10%)
     * @param duration - Loan duration in days
     * @param stablecoin - Address of the stablecoin to borrow
     * @param decimals - Decimals of the stablecoin (6 for USDT/USDC, 18 for MNT)
     */
    const createLoan = async (
        assetTokenId: bigint,
        principal: number,
        interestRate: number,
        duration: number,
        stablecoin: `0x${string}`,
        decimals: number = 6
    ) => {
        if (!addresses?.loanManager) {
            throw new Error('LoanManager contract not deployed on this network');
        }

        // Convert principal to wei based on decimals
        const principalWei = parseUnits(principal.toString(), decimals);

        // Convert duration from days to seconds
        const durationSeconds = BigInt(duration * 24 * 60 * 60);

        await writeContract({
            address: addresses.loanManager,
            abi: LoanManagerABI.abi,
            functionName: 'createLoan',
            args: [assetTokenId, principalWei, BigInt(interestRate), durationSeconds, stablecoin],
        });
    };

    return {
        createLoan,
        hash,
        isPending,
        isConfirming,
        isSuccess,
        isError,
        error,
    };
}
