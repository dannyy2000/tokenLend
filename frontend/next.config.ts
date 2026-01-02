import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack configuration for Next.js 16+
  turbopack: {
    resolveAlias: {
      // Resolve fallbacks for node modules not available in browser
      fs: false,
      net: false,
      tls: false,
      crypto: false,
    },
  },

  webpack: (config) => {
    // Resolve fallbacks for node modules not available in browser
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
    };

    return config;
  },

  // Externalize server-only packages to prevent bundling issues
  serverExternalPackages: [
    'pino',
    'pino-pretty',
    'thread-stream',
  ],

  experimental: {
    // Optimize package imports
    optimizePackageImports: ['@rainbow-me/rainbowkit', 'wagmi', 'viem'],
  },
};

export default nextConfig;
