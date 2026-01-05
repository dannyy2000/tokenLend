import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "TokenLend - RWA-Backed SME Lending",
  description: "Unlock liquidity from your real-world assets with AI-powered valuations",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{__html: `
          // Suppress wagmi ethereum provider error in development
          if (typeof window !== 'undefined') {
            const originalError = console.error;
            console.error = (...args) => {
              if (args[0]?.toString?.().includes('ethereum') && args[0]?.toString?.().includes('getter')) {
                return; // Suppress this specific error
              }
              originalError.apply(console, args);
            };
          }
        `}} />
      </head>
      <body className={`${inter.className} ${inter.variable}`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
