'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Slider } from '@/components/ui/Slider';
import { formatCurrency, formatPercentage } from '@/lib/utils/format';
import { AlertCircle, CheckCircle2, Loader2, Shield, TrendingUp, Calendar, Percent } from 'lucide-react';
import { useAccount, useChainId } from 'wagmi';
import Link from 'next/link';
import { useCreateLoan } from '@/lib/hooks';
import { getDefaultStablecoin, getStablecoinDecimals } from '@/lib/contracts';

export function LoanRequestForm() {
    const { address, isConnected } = useAccount();
    const chainId = useChainId();
    const [loanAmount, setLoanAmount] = useState(100000);
    const [duration, setDuration] = useState(30);
    const [assetTokenId, setAssetTokenId] = useState<string>('1'); // Updated to use Asset #1
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    // Real blockchain hook
    const {
        createLoan,
        isPending,
        isConfirming,
        isSuccess,
        hash,
        error,
    } = useCreateLoan();

    // Mock valuation data - in production, fetch from backend
    const mockValuation = {
        valuationId: 'val_demo_123',
        assetValue: 497250,
        maxLoanAmount: 216781,
        maxLTV: 0.4361,
        conditionScore: 0.85,
        asset: {
            type: 'smartphone',
            brand: 'Apple',
            model: 'iPhone 14',
        },
    };

    const interestRate = 0.10; // 10% APR
    const totalInterest = (loanAmount * interestRate * duration) / 365;
    const totalRepayment = loanAmount + totalInterest;
    const dailyPayment = totalRepayment / duration;

    // Watch for successful transaction
    useEffect(() => {
        if (isSuccess) {
            setIsSubmitting(false);
            setSubmitted(true);
        }
    }, [isSuccess]);

    const handleSubmit = async () => {
        if (!isConnected) {
            alert('Please connect your wallet first');
            return;
        }

        setIsSubmitting(true);

        try {
            // Get stablecoin for this network
            const stablecoin = getDefaultStablecoin(chainId);
            if (!stablecoin) {
                alert('No stablecoin configured for this network');
                setIsSubmitting(false);
                return;
            }

            const decimals = getStablecoinDecimals(chainId, stablecoin);
            const interestRateBasisPoints = 1000; // 10% APR

            // 🔗 REAL BLOCKCHAIN TRANSACTION
            await createLoan(
                BigInt(assetTokenId), // Asset NFT ID (demo: using 0, user would select their asset)
                loanAmount, // Principal amount
                interestRateBasisPoints, // 10% = 1000 basis points
                duration, // Duration in days
                stablecoin, // Stablecoin address
                decimals // Stablecoin decimals
            );

            // Transaction submitted! isSuccess will trigger useEffect above
        } catch (err: any) {
            console.error('Create loan error:', err);
            alert(err.message || 'Transaction failed');
            setIsSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                <Card variant="glass" className="text-center py-16">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/20 mb-6">
                        <CheckCircle2 className="w-10 h-10 text-green-500" />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-4">🔗 Loan Created on Blockchain!</h2>
                    <p className="text-xl text-gray-400 mb-4">
                        Your loan request for {formatCurrency(loanAmount)} is now live
                    </p>
                    {hash && (
                        <div className="mb-8">
                            <p className="text-sm text-gray-500 mb-2">Transaction Hash:</p>
                            <code className="text-xs text-indigo-400 bg-slate-900/50 px-4 py-2 rounded-lg break-all">
                                {hash}
                            </code>
                        </div>
                    )}
                    <div className="space-y-4 max-w-md mx-auto mb-8">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">Asset tokenized as NFT</span>
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">Collateral locked</span>
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">Listed for lenders</span>
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link href="/borrow">
                            <Button size="lg">View My Dashboard</Button>
                        </Link>
                        <Link href="/borrow/upload">
                            <Button size="lg" variant="outline">Upload Another Asset</Button>
                        </Link>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
                <h1 className="text-4xl font-bold text-white mb-4">Request a Loan</h1>
                <p className="text-xl text-gray-400">
                    Choose your loan amount and terms based on your asset valuation
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Form */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Asset Info */}
                    <Card variant="glass">
                        <CardHeader>
                            <CardTitle>Your Asset</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-lg font-semibold text-white">
                                        {mockValuation.asset.brand} {mockValuation.asset.model}
                                    </p>
                                    <p className="text-sm text-gray-400">Valuation ID: {mockValuation.valuationId}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-gray-400">Asset Value</p>
                                    <p className="text-xl font-bold text-white">
                                        {formatCurrency(mockValuation.assetValue)}
                                    </p>
                                </div>
                            </div>
                            <div className="mt-4 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-400">Max Loan Amount</span>
                                    <span className="text-sm font-semibold text-indigo-400">
                                        {formatCurrency(mockValuation.maxLoanAmount)} ({formatPercentage(mockValuation.maxLTV)} LTV)
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Loan Amount Slider */}
                    <Card variant="glass">
                        <CardHeader>
                            <CardTitle>Loan Amount</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="mb-6">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-gray-400">Amount</span>
                                    <span className="text-3xl font-bold gradient-text">
                                        {formatCurrency(loanAmount)}
                                    </span>
                                </div>
                                <Slider
                                    value={[loanAmount]}
                                    onValueChange={(value) => setLoanAmount(value[0])}
                                    min={10000}
                                    max={mockValuation.maxLoanAmount}
                                    step={5000}
                                    className="mb-2"
                                />
                                <div className="flex items-center justify-between text-xs text-gray-500">
                                    <span>₦10,000</span>
                                    <span>{formatCurrency(mockValuation.maxLoanAmount)}</span>
                                </div>
                            </div>
                            {loanAmount > mockValuation.maxLoanAmount * 0.9 && (
                                <div className="flex items-start space-x-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                                    <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-amber-300">
                                        You're requesting close to your maximum. Consider a lower amount for better approval chances.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Duration Selector */}
                    <Card variant="glass">
                        <CardHeader>
                            <CardTitle>Loan Duration</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-3 gap-3 mb-4">
                                {[30, 60, 90].map((days) => (
                                    <button
                                        key={days}
                                        onClick={() => setDuration(days)}
                                        className={`p-4 rounded-xl border-2 transition-all ${duration === days
                                                ? 'border-indigo-500 bg-indigo-500/10 text-white'
                                                : 'border-gray-700 hover:border-gray-600 text-gray-400'
                                            }`}
                                    >
                                        <p className="text-2xl font-bold">{days}</p>
                                        <p className="text-xs">days</p>
                                    </button>
                                ))}
                            </div>
                            <div className="text-sm text-gray-400">
                                Recommended: 30 days for {mockValuation.asset.type}s
                            </div>
                        </CardContent>
                    </Card>

                    {/* Wallet Connection */}
                    {!isConnected && (
                        <Card variant="glass" className="border-2 border-amber-500/50">
                            <CardContent className="py-6">
                                <div className="flex items-center space-x-3">
                                    <AlertCircle className="w-6 h-6 text-amber-400" />
                                    <div className="flex-1">
                                        <p className="font-semibold text-white">Wallet Not Connected</p>
                                        <p className="text-sm text-gray-400">Connect your wallet to submit loan request</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Summary Sidebar */}
                <div className="space-y-6">
                    <Card variant="gradient">
                        <CardHeader>
                            <CardTitle>Loan Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <TrendingUp className="w-5 h-5 text-gray-400" />
                                    <span className="text-sm text-gray-400">Principal</span>
                                </div>
                                <span className="font-semibold text-white">{formatCurrency(loanAmount)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <Percent className="w-5 h-5 text-gray-400" />
                                    <span className="text-sm text-gray-400">Interest Rate</span>
                                </div>
                                <span className="font-semibold text-white">{interestRate * 100}% APR</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <Calendar className="w-5 h-5 text-gray-400" />
                                    <span className="text-sm text-gray-400">Duration</span>
                                </div>
                                <span className="font-semibold text-white">{duration} days</span>
                            </div>
                            <div className="h-px bg-gray-700" />
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-400">Total Interest</span>
                                <span className="font-semibold text-white">{formatCurrency(totalInterest)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="font-semibold text-white">Total Repayment</span>
                                <span className="text-xl font-bold gradient-text">{formatCurrency(totalRepayment)}</span>
                            </div>
                            <div className="p-3 bg-slate-800/50 rounded-lg">
                                <p className="text-xs text-gray-400 mb-1">Daily Payment</p>
                                <p className="text-lg font-bold text-white">{formatCurrency(dailyPayment)}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card variant="glass">
                        <CardHeader>
                            <div className="flex items-center space-x-2">
                                <Shield className="w-5 h-5 text-indigo-400" />
                                <CardTitle className="text-base">Collateral</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <div className="flex items-start space-x-2">
                                <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                <span className="text-gray-400">Asset will be tokenized as NFT</span>
                            </div>
                            <div className="flex items-start space-x-2">
                                <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                <span className="text-gray-400">NFT locked in smart contract</span>
                            </div>
                            <div className="flex items-start space-x-2">
                                <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                <span className="text-gray-400">Unlocked upon full repayment</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Button
                        size="lg"
                        className="w-full"
                        onClick={handleSubmit}
                        disabled={!isConnected || isSubmitting}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                Creating Loan...
                            </>
                        ) : (
                            'Submit Loan Request'
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
