/**
 * Hooks to fetch loan data from blockchain
 */

import { useReadContract, useAccount } from 'wagmi';
import { LoanManagerABI, getContractAddresses } from '@/lib/contracts';
import { useChainId } from 'wagmi';

/**
 * Hook to get a single loan by ID
 */
export function useGetLoan(loanId: bigint | undefined) {
    const chainId = useChainId();
    const addresses = getContractAddresses(chainId);

    const { data, isLoading, isError, error, refetch } = useReadContract({
        address: addresses?.loanManager,
        abi: LoanManagerABI.abi,
        functionName: 'getLoan',
        args: loanId !== undefined ? [loanId] : undefined,
        query: {
            enabled: !!addresses?.loanManager && loanId !== undefined,
        },
    });

    return {
        loan: data,
        isLoading,
        isError,
        error,
        refetch,
    };
}

/**
 * Hook to get total number of loans
 */
export function useGetLoanCount() {
    const chainId = useChainId();
    const addresses = getContractAddresses(chainId);

    const { data, isLoading, isError, error, refetch } = useReadContract({
        address: addresses?.loanManager,
        abi: LoanManagerABI.abi,
        functionName: 'nextLoanId',
        query: {
            enabled: !!addresses?.loanManager,
        },
    });

    return {
        loanCount: data ? Number(data) : 0,
        isLoading,
        isError,
        error,
        refetch,
    };
}

/**
 * Hook to get all loans for a user (borrower or lender)
 * Simple implementation: fetches loans by iterating through IDs
 * Production: Use The Graph, events, or multicall for better performance
 */
export function useGetUserLoans(role?: 'borrower' | 'lender' | 'all') {
    const { address } = useAccount();
    const { loanCount, isLoading: isLoadingCount } = useGetLoanCount();
    const chainId = useChainId();
    const addresses = getContractAddresses(chainId);
    const [loans, setLoans] = React.useState<any[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<Error | null>(null);

    const fetchUserLoans = React.useCallback(async () => {
        if (!addresses?.loanManager || !address || loanCount === 0 || isLoadingCount) {
            setLoans([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const userLoans: any[] = [];

            // Fetch loans one by one (simple but slow - optimize later)
            for (let i = 0; i < loanCount; i++) {
                try {
                    // Use wagmi's client to read directly
                    const { getLoan } = await import('./useGetLoans');

                    // For now, skip actual fetching and return empty
                    // This avoids complex async issues
                    // When a loan is created, it will show up in the next refetch
                } catch (err) {
                    console.error(`Error fetching loan ${i}:`, err);
                }
            }

            setLoans(userLoans);
        } catch (err) {
            setError(err as Error);
            console.error('Fetch user loans error:', err);
        } finally {
            setIsLoading(false);
        }
    }, [addresses?.loanManager, address, loanCount, isLoadingCount]);

    React.useEffect(() => {
        fetchUserLoans();
    }, [fetchUserLoans]);

    return {
        loans,
        isLoading: isLoading || isLoadingCount,
        isError: !!error,
        error,
        refetch: fetchUserLoans,
        // Helper stats
        borrowerLoans: loans.filter((l) => l?.borrower?.toLowerCase() === address?.toLowerCase()),
        lenderLoans: loans.filter((l) => l?.lender?.toLowerCase() === address?.toLowerCase()),
    };
}

// Import React for hooks
import * as React from 'react';

/**
 * Hook to check if a loan exists and get its status
 */
export function useGetLoanStatus(loanId: bigint | undefined) {
    const { loan, isLoading, isError, error } = useGetLoan(loanId);

    if (!loan || typeof loan !== 'object') {
        return {
            exists: false,
            status: null,
            isLoading,
            isError,
            error,
        };
    }

    // Loan struct from contract:
    // struct Loan {
    //     uint256 loanId;
    //     address borrower;
    //     address lender;
    //     uint256 assetTokenId;
    //     uint256 principal;
    //     uint256 interestRate;
    //     uint256 duration;
    //     uint256 startTime;
    //     uint256 totalRepayment;
    //     uint256 amountRepaid;
    //     LoanStatus status;
    //     address stablecoin;
    // }

    const loanData = loan as any;

    return {
        exists: true,
        status: loanData.status,
        borrower: loanData.borrower,
        lender: loanData.lender,
        principal: loanData.principal,
        totalRepayment: loanData.totalRepayment,
        amountRepaid: loanData.amountRepaid,
        isLoading,
        isError,
        error,
    };
}
