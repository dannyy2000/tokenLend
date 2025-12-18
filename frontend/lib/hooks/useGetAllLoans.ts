/**
 * Hook to fetch all loans from the blockchain
 */

import { useState, useEffect } from 'react';
import { useReadContract, useChainId, usePublicClient } from 'wagmi';
import { LoanManagerABI, getContractAddresses } from '@/lib/contracts';

export interface LoanData {
    loanId: bigint;
    borrower: string;
    lender: string;
    assetTokenId: bigint;
    principal: bigint;
    interestRate: bigint;
    duration: bigint;
    startTime: bigint;
    totalRepayment: bigint;
    amountRepaid: bigint;
    status: number;
    stablecoin: string;
}

/**
 * Hook to get all available loan requests (unfunded loans)
 */
export function useGetAvailableLoans() {
    const chainId = useChainId();
    const addresses = getContractAddresses(chainId);
    const publicClient = usePublicClient();
    const [loans, setLoans] = useState<LoanData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const [refetchTrigger, setRefetchTrigger] = useState(0);

    useEffect(() => {
        async function fetchLoans() {
            if (!addresses?.loanManager || !publicClient) {
                setLoans([]);
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            setError(null);

            try {
                const availableLoans: LoanData[] = [];

                // Try to fetch loans starting from 0 until we hit an error
                // Since there's no public nextLoanId function, we'll try up to 100 loans
                for (let i = 0; i < 100; i++) {
                    try {
                        const loan = await publicClient.readContract({
                            address: addresses.loanManager,
                            abi: LoanManagerABI.abi,
                            functionName: 'getLoan',
                            args: [BigInt(i)],
                        }) as any;

                        // Check if loan is valid (borrower is not zero address)
                        if (loan.borrower === '0x0000000000000000000000000000000000000000') {
                            // Empty loan, we've reached the end
                            break;
                        }

                        // Only include unfunded loans (lender == address(0) and status is Active)
                        if (loan.lender === '0x0000000000000000000000000000000000000000' && loan.status === 0) {
                            availableLoans.push(loan as LoanData);
                        }
                    } catch (err) {
                        // If we can't fetch a loan, we've reached the end
                        break;
                    }
                }

                setLoans(availableLoans);
            } catch (err) {
                setError(err as Error);
                console.error('Error fetching available loans:', err);
            } finally {
                setIsLoading(false);
            }
        }

        fetchLoans();
    }, [addresses?.loanManager, publicClient, refetchTrigger]);

    const refetch = () => {
        setRefetchTrigger(prev => prev + 1);
    };

    return {
        loans,
        isLoading,
        error,
        refetch,
    };
}

/**
 * Hook to get funded loans for a specific lender
 */
export function useGetLenderLoans(lenderAddress?: string) {
    const chainId = useChainId();
    const addresses = getContractAddresses(chainId);
    const publicClient = usePublicClient();
    const [loans, setLoans] = useState<LoanData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [refetchTrigger, setRefetchTrigger] = useState(0);

    useEffect(() => {
        async function fetchLoans() {
            if (!addresses?.loanManager || !publicClient || !lenderAddress) {
                setLoans([]);
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            setError(null);

            try {
                const lenderLoans: LoanData[] = [];

                // Try to fetch loans starting from 0 until we hit an error
                for (let i = 0; i < 100; i++) {
                    try {
                        const loan = await publicClient.readContract({
                            address: addresses.loanManager,
                            abi: LoanManagerABI.abi,
                            functionName: 'getLoan',
                            args: [BigInt(i)],
                        }) as any;

                        // Check if loan is valid (borrower is not zero address)
                        if (loan.borrower === '0x0000000000000000000000000000000000000000') {
                            // Empty loan, we've reached the end
                            break;
                        }

                        // Only include loans funded by this lender
                        if (loan.lender.toLowerCase() === lenderAddress.toLowerCase()) {
                            lenderLoans.push(loan as LoanData);
                        }
                    } catch (err) {
                        // If we can't fetch a loan, we've reached the end
                        break;
                    }
                }

                setLoans(lenderLoans);
                console.log(`Found ${lenderLoans.length} loans for lender ${lenderAddress}`);
            } catch (err) {
                setError(err as Error);
                console.error('Error fetching lender loans:', err);
            } finally {
                setIsLoading(false);
            }
        }

        fetchLoans();
    }, [addresses?.loanManager, publicClient, refetchTrigger, lenderAddress]);

    const refetch = () => {
        setRefetchTrigger(prev => prev + 1);
    };

    return {
        loans,
        isLoading,
        error,
        refetch,
    };
}
