'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { SMEOnboarding } from '@/components/features/SMEOnboarding';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';

export default function BorrowerOnboardingPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();

  useEffect(() => {
    // Check if wallet is connected
    if (!isConnected) {
      router.push('/');
      return;
    }
  }, [isConnected, router]);

  const handleComplete = () => {
    // Redirect to borrow dashboard after successful verification
    router.push('/borrow');
  };

  if (!isConnected || !address) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            Wallet Not Connected
          </h2>
          <p className="text-white/60 mb-6">
            Please connect your wallet to continue
          </p>
          <Button onClick={() => router.push('/')}>
            Go to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12">
      <SMEOnboarding walletAddress={address} onComplete={handleComplete} />
    </div>
  );
}
