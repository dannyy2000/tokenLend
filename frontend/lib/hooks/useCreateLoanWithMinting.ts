/**
 * Hook to create a loan with lazy minting (mint + create loan in one transaction)
 */

import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { LoanManagerABI, getContractAddresses } from '@/lib/contracts';
import { useChainId } from 'wagmi';
import { parseUnits } from 'viem';

export function useCreateLoanWithMinting() {
    const chainId = useChainId();
    const addresses = getContractAddresses(chainId);

    const {
        data: hash,
        isPending,
        writeContract,
        error,
    } = useWriteContract();

    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
        hash,
    });

    /**
     * Create a loan with lazy minting
     * @param assetType - Type of asset (e.g., "smartphone", "car", "laptop")
     * @param aiValuation - AI valuation in local currency (will be converted to wei)
     * @param maxLTV - Max LTV in basis points (e.g., 7000 = 70%)
     * @param uri - IPFS or metadata URI
     * @param principal - Loan amount in local currency
     * @param interestRate - Interest rate in basis points (e.g., 1000 = 10%)
     * @param duration - Loan duration in days
     * @param stablecoin - Stablecoin address
     * @param stablecoinDecimals - Decimals for the stablecoin (usually 6)
     */
    const createLoanWithMinting = async (
        assetType: string,
        aiValuation: number,
        maxLTV: number,
        uri: string,
        principal: number,
        interestRate: number,
        duration: number,
        stablecoin: `0x${string}`,
        stablecoinDecimals: number = 6
    ) => {
        if (!addresses?.loanManager) {
            throw new Error('LoanManager contract not found for this network');
        }

        // Convert values to contract format
        const aiValuationWei = parseUnits(aiValuation.toString(), 18); // Asset valuations are 18 decimals
        const principalWei = parseUnits(principal.toString(), stablecoinDecimals); // Stablecoin decimals
        const durationSeconds = duration * 24 * 60 * 60; // Convert days to seconds

        console.log('📝 Creating loan with lazy minting:', {
            assetType,
            aiValuation: aiValuationWei.toString(),
            maxLTV,
            uri,
            principal: principalWei.toString(),
            interestRate,
            durationSeconds,
            stablecoin,
        });

        return writeContract({
            address: addresses.loanManager,
            abi: LoanManagerABI.abi,
            functionName: 'createLoanWithMinting',
            args: [
                assetType,
                aiValuationWei,
                maxLTV,
                uri,
                principalWei,
                interestRate,
                durationSeconds,
                stablecoin,
            ],
        });
    };

    return {
        createLoanWithMinting,
        isPending,
        isConfirming,
        isSuccess,
        hash,
        error,
    };
}
