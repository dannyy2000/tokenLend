/**
 * Hook to mint Asset NFT
 * Used when borrower uploads an asset and wants to tokenize it
 */

import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { AssetTokenABI, getContractAddresses } from '@/lib/contracts';
import { useChainId } from 'wagmi';
import { parseUnits } from 'viem';

export function useMintAsset() {
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
     * Mint an asset NFT
     * @param assetType - Type of asset ("phone", "laptop", "car", etc.)
     * @param aiValuation - AI estimated value in USD (will be scaled to 18 decimals)
     * @param maxLTV - Maximum loan-to-value ratio in basis points (e.g., 7000 = 70%)
     * @param borrower - Address of the borrower (asset owner)
     */
    const mintAsset = async (
        assetType: string,
        aiValuation: number,
        maxLTV: number,
        borrower: `0x${string}`
    ) => {
        if (!addresses?.assetToken) {
            throw new Error('AssetToken contract not deployed on this network');
        }

        // Convert USD value to wei (18 decimals for consistency)
        const valuationWei = parseUnits(aiValuation.toString(), 18);

        await writeContract({
            address: addresses.assetToken,
            abi: AssetTokenABI.abi,
            functionName: 'mintAsset',
            args: [borrower, assetType, valuationWei, BigInt(maxLTV)],
        });
    };

    return {
        mintAsset,
        hash,
        isPending,
        isConfirming,
        isSuccess,
        isError,
        error,
    };
}
