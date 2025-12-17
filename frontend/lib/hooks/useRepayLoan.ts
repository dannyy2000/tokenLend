/**
 * Hook to make loan repayments
 * Used by borrowers to pay back principal + interest
 */

import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { LoanManagerABI, MockStablecoinABI, getContractAddresses } from '@/lib/contracts';
import { useChainId } from 'wagmi';

export function useRepayLoan() {
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
     * Approve stablecoin spending for repayment (must be called before makeRepayment)
     * @param stablecoinAddress - Address of the stablecoin contract
     * @param amount - Amount to approve (in wei)
     */
    const approveRepayment = async (stablecoinAddress: `0x${string}`, amount: bigint) => {
        if (!addresses?.loanManager) {
            throw new Error('LoanManager contract not deployed on this network');
        }

        await writeContract({
            address: stablecoinAddress,
            abi: MockStablecoinABI.abi,
            functionName: 'approve',
            args: [addresses.loanManager, amount],
        });
    };

    /**
     * Make a repayment on a loan
     * @param loanId - ID of the loan to repay
     * @param amount - Amount to repay (in wei)
     */
    const makeRepayment = async (loanId: bigint, amount: bigint) => {
        if (!addresses?.loanManager) {
            throw new Error('LoanManager contract not deployed on this network');
        }

        await writeContract({
            address: addresses.loanManager,
            abi: LoanManagerABI.abi,
            functionName: 'makeRepayment',
            args: [loanId, amount],
        });
    };

    return {
        approveRepayment,
        makeRepayment,
        hash,
        isPending,
        isConfirming,
        isSuccess,
        isError,
        error,
    };
}
