import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http } from 'wagmi';
import { mantleSepoliaTestnet, mantle } from 'wagmi/chains';
import { Chain } from 'wagmi/chains';

// Local Hardhat network
const hardhat: Chain = {
    id: 31337,
    name: 'Hardhat Local',
    nativeCurrency: {
        decimals: 18,
        name: 'Ethereum',
        symbol: 'ETH',
    },
    rpcUrls: {
        default: { http: ['http://127.0.0.1:8545'] },
        public: { http: ['http://127.0.0.1:8545'] },
    },
    testnet: true,
};

export const config = getDefaultConfig({
    appName: 'TokenLend',
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
    chains: [mantleSepoliaTestnet, hardhat, mantle],
    transports: {
        [hardhat.id]: http('http://127.0.0.1:8545'),
        [mantleSepoliaTestnet.id]: http(process.env.NEXT_PUBLIC_MANTLE_TESTNET_RPC),
        [mantle.id]: http(process.env.NEXT_PUBLIC_MANTLE_MAINNET_RPC),
    },
    ssr: true,
});
