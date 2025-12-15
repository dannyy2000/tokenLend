import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http } from 'wagmi';
import { mantleSepoliaTestnet, mantle } from 'wagmi/chains';

export const config = getDefaultConfig({
    appName: 'TokenLend',
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
    chains: [mantleSepoliaTestnet, mantle],
    transports: {
        [mantleSepoliaTestnet.id]: http(process.env.NEXT_PUBLIC_MANTLE_TESTNET_RPC),
        [mantle.id]: http(process.env.NEXT_PUBLIC_MANTLE_MAINNET_RPC),
    },
    ssr: true,
});
