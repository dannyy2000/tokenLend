/**
 * Hook to mint test USDT from faucet
 * For judges and testing purposes
 */

import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { getContractAddresses } from '@/lib/contracts';
import { useChainId } from 'wagmi';
import { parseUnits } from 'viem';

// MockStablecoin ABI (just the faucet function)
const MOCK_STABLECOIN_ABI = [
    {
        inputs: [{ internalType: 'uint256', name: 'amount', type: 'uint256' }],
        name: 'faucet',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
] as const;

export function useFaucet() {
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
     * Mint test USDT from faucet
     * @param amount - Amount in USDT (will be converted to proper decimals)
     */
    const mintTestUSDT = async (amount: number = 10000) => {
        if (!addresses?.mockStablecoin) {
            throw new Error('Mock stablecoin not deployed on this network');
        }

        // Convert to 6 decimals (USDT standard)
        const amountWithDecimals = parseUnits(amount.toString(), 6);

        await writeContract({
            address: addresses.mockStablecoin as `0x${string}`,
            abi: MOCK_STABLECOIN_ABI,
            functionName: 'faucet',
            args: [amountWithDecimals],
        });
    };

    return {
        mintTestUSDT,
        hash,
        isPending,
        isConfirming,
        isSuccess,
        isError,
        error,
    };
}
