/**
 * Hook to get asset details from AssetToken contract
 */

import { useReadContract, useChainId } from 'wagmi';
import { AssetTokenABI, getContractAddresses } from '@/lib/contracts';

export function useGetAsset(tokenId: bigint | undefined) {
    const chainId = useChainId();
    const addresses = getContractAddresses(chainId);

    const { data, isLoading, isError, error, refetch } = useReadContract({
        address: addresses?.assetToken,
        abi: AssetTokenABI.abi,
        functionName: 'getAsset',
        args: tokenId !== undefined ? [tokenId] : undefined,
        query: {
            enabled: !!addresses?.assetToken && tokenId !== undefined,
        },
    });

    return {
        asset: data,
        isLoading,
        isError,
        error,
        refetch,
    };
}
