/**
 * Hook to fund a loan
 * Used by lenders to provide capital for a loan request
 */

import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { LoanManagerABI, MockStablecoinABI, getContractAddresses } from '@/lib/contracts';
import { useChainId } from 'wagmi';

export function useFundLoan() {
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
     * Approve stablecoin spending (must be called before fundLoan)
     * @param stablecoinAddress - Address of the stablecoin contract
     * @param amount - Amount to approve (in wei)
     */
    const approveStablecoin = async (stablecoinAddress: `0x${string}`, amount: bigint) => {
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
     * Fund a loan
     * @param loanId - ID of the loan to fund
     */
    const fundLoan = async (loanId: bigint) => {
        if (!addresses?.loanManager) {
            throw new Error('LoanManager contract not deployed on this network');
        }

        await writeContract({
            address: addresses.loanManager,
            abi: LoanManagerABI.abi,
            functionName: 'fundLoan',
            args: [loanId],
        });
    };

    return {
        approveStablecoin,
        fundLoan,
        hash,
        isPending,
        isConfirming,
        isSuccess,
        isError,
        error,
    };
}
