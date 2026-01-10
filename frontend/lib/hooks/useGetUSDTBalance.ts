/**
 * Hook to get user's USDT balance
 * Reads from MockStablecoin contract
 */

import { useReadContract, useChainId, useAccount } from 'wagmi';
import { getContractAddresses } from '@/lib/contracts';
import { formatUnits } from 'viem';

// MockStablecoin ABI (just the balanceOf function)
const MOCK_STABLECOIN_ABI = [
    {
        inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
        name: 'balanceOf',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
] as const;

export function useGetUSDTBalance() {
    const chainId = useChainId();
    const { address } = useAccount();
    const addresses = getContractAddresses(chainId);

    const { data, isLoading, isError, error, refetch } = useReadContract({
        address: addresses?.mockStablecoin as `0x${string}`,
        abi: MOCK_STABLECOIN_ABI,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
        query: {
            enabled: !!addresses?.mockStablecoin && !!address,
            // Refetch every 10 seconds to keep balance updated
            refetchInterval: 10000,
        },
    });

    // Convert balance from wei (6 decimals for USDT) to number
    const balance = data ? Number(formatUnits(data, 6)) : 0;

    return {
        balance,
        balanceRaw: data,
        isLoading,
        isError,
        error,
        refetch,
    };
}
