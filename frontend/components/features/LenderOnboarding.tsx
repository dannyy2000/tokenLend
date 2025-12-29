'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { acknowledgeLenderRisk } from '@/lib/api/verification';

interface LenderOnboardingProps {
  walletAddress: string;
  onComplete?: () => void;
}

export function LenderOnboarding({ walletAddress, onComplete }: LenderOnboardingProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [riskAcknowledged, setRiskAcknowledged] = useState(false);

  const handleContinue = async () => {
    setLoading(true);
    setError('');

    try {
      // Always save the lender profile, even if risk not acknowledged
      const result = await acknowledgeLenderRisk(walletAddress, riskAcknowledged);

      if (result.success) {
        // Redirect to lender marketplace
        if (onComplete) {
          onComplete();
        } else {
          router.push('/lend');
        }
      } else {
        setError(result.error || 'Failed to update lender profile');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-3">
            Welcome, Lender!
          </h2>
          <p className="text-white/60 text-lg">
            Start funding SME loans backed by real-world assets
          </p>
        </div>

        {/* Risk Disclosure */}
        <div className="p-6 bg-white/5 border border-white/10 rounded-lg space-y-4">
          <h3 className="text-xl font-semibold text-white">
            How TokenLend Works for Lenders
          </h3>

          <div className="space-y-3 text-white/70">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-semibold text-sm">
                1
              </div>
              <div>
                <p className="font-medium text-white">Browse Loan Requests</p>
                <p className="text-sm">SMEs submit collateral and request loans. Assets are valued using AI.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-semibold text-sm">
                2
              </div>
              <div>
                <p className="font-medium text-white">Fund Loans</p>
                <p className="text-sm">Choose loans to fund based on collateral value, LTV, and loan terms.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-semibold text-sm">
                3
              </div>
              <div>
                <p className="font-medium text-white">Earn Interest</p>
                <p className="text-sm">Receive principal + interest when borrowers repay. Collateral liquidated if loan defaults.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Risk Warning */}
        <div className="p-6 bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-lg">
          <div className="flex gap-3 mb-4">
            <svg className="w-6 h-6 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h4 className="font-semibold text-amber-400 mb-2">Important Risk Disclosure</h4>
              <ul className="space-y-2 text-sm text-white/70">
                <li className="flex gap-2">
                  <span className="text-amber-400">•</span>
                  <span>Lending carries risk. Borrowers may default on loans.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-400">•</span>
                  <span>Collateral value may decrease over time or be difficult to liquidate.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-400">•</span>
                  <span>This is a hackathon demo. Do not use real funds for testing.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-400">•</span>
                  <span>Smart contracts have not been audited. Use at your own risk.</span>
                </li>
              </ul>
            </div>
          </div>

          <label className="flex items-start gap-3 cursor-pointer mt-4">
            <input
              type="checkbox"
              checked={riskAcknowledged}
              onChange={(e) => setRiskAcknowledged(e.target.checked)}
              className="mt-1 w-5 h-5 rounded border-white/20 bg-white/10 text-indigo-500 focus:ring-2 focus:ring-indigo-500"
            />
            <div>
              <p className="text-white font-medium">
                I understand and acknowledge these risks (Optional)
              </p>
              <p className="text-white/50 text-sm mt-1">
                Acknowledging risks shows you're a serious lender and may increase borrower confidence.
              </p>
            </div>
          </label>
        </div>

        {/* Security Features */}
        <div className="p-6 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-lg">
          <h4 className="font-semibold text-green-400 mb-3">Built-in Protections</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-white/70">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>AI-powered asset valuation (GPT-4 Vision)</span>
            </div>
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Conservative LTV ratios (60-75%)</span>
            </div>
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Assets locked as collateral on-chain</span>
            </div>
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>7-day grace period before liquidation</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Action Button */}
        <Button
          onClick={handleContinue}
          className="w-full text-lg py-6"
          disabled={loading}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Spinner size="sm" />
              Setting up profile...
            </span>
          ) : (
            'Continue to Marketplace'
          )}
        </Button>

        <p className="text-center text-white/50 text-sm">
          You can start funding loans immediately. No verification required for lenders.
        </p>
      </div>
    </div>
  );
}
