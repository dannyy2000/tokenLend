'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Loader2, CheckCircle2, AlertTriangle, TrendingUp, Shield, Coins } from 'lucide-react';
import { formatCurrency, formatPercentage } from '@/lib/utils/format';
import Link from 'next/link';
import { motion } from 'framer-motion';

interface ValuationDisplayProps {
    valuation: any | null;
    isLoading: boolean;
    assetData: any;
}

export function ValuationDisplay({ valuation, isLoading, assetData }: ValuationDisplayProps) {
    if (isLoading) {
        return (
            <Card variant="glass" className="max-w-3xl mx-auto">
                <div className="text-center py-16">
                    <Loader2 className="w-16 h-16 mx-auto mb-4 text-indigo-500 animate-spin" />
                    <h3 className="text-2xl font-bold text-white mb-2">Analyzing Your Asset...</h3>
                    <p className="text-gray-400 mb-8">
                        Our AI is examining your images and calculating the optimal loan terms
                    </p>
                    <div className="max-w-md mx-auto space-y-3">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">Verifying asset details</span>
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">Analyzing condition</span>
                            <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
                        </div>
                        <div className="flex items-center justify-between text-sm text-gray-600">
                            <span>Calculating LTV</span>
                            <div className="w-5 h-5" />
                        </div>
                    </div>
                </div>
            </Card>
        );
    }

    if (!valuation) {
        return (
            <Card variant="glass" className="max-w-3xl mx-auto">
                <div className="text-center py-16">
                    <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-amber-500" />
                    <h3 className="text-2xl font-bold text-white mb-2">Valuation Failed</h3>
                    <p className="text-gray-400 mb-8">
                        We couldn't process your asset. Please try again or contact support.
                    </p>
                    <Button onClick={() => window.location.reload()}>Try Again</Button>
                </div>
            </Card>
        );
    }

    const { asset, valuation: val, condition, loanTerms, riskBreakdown } = valuation;

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* Success Header */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
            >
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/20 mb-4">
                    <CheckCircle2 className="w-10 h-10 text-green-500" />
                </div>
                <h2 className="text-4xl font-bold text-white mb-2">Valuation Complete!</h2>
                <p className="text-xl text-gray-400">
                    Your {asset.brand} {asset.detectedModel} has been verified
                </p>
            </motion.div>

            {/* Main Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card variant="gradient">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">Asset Value</CardTitle>
                            <TrendingUp className="w-6 h-6 text-emerald-400" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold text-white">
                            {formatCurrency(val.conditionAdjustedValue)}
                        </p>
                        <p className="text-sm text-gray-400 mt-1">
                            Market: {formatCurrency(val.currentMarketValue)}
                        </p>
                    </CardContent>
                </Card>

                <Card variant="gradient">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">Max Loan Amount</CardTitle>
                            <Coins className="w-6 h-6 text-indigo-400" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold gradient-text">
                            {formatCurrency(loanTerms.maxLoanAmount)}
                        </p>
                        <p className="text-sm text-gray-400 mt-1">
                            LTV: {loanTerms.maxLTVPercent}
                        </p>
                    </CardContent>
                </Card>

                <Card variant="gradient">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">Condition Score</CardTitle>
                            <Shield className="w-6 h-6 text-purple-400" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold text-white">
                            {(condition.score * 100).toFixed(0)}%
                        </p>
                        <p className="text-sm text-gray-400 mt-1 capitalize">
                            {condition.rating} condition
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Condition Details */}
            <Card variant="glass">
                <CardHeader>
                    <CardTitle>AI Condition Assessment</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-gray-400">Condition Score</span>
                                <span className="text-sm font-semibold text-white">
                                    {(condition.score * 100).toFixed(0)}%
                                </span>
                            </div>
                            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                                    style={{ width: `${condition.score * 100}%` }}
                                />
                            </div>
                        </div>

                        {condition.notes && condition.notes.length > 0 && (
                            <div>
                                <p className="text-sm font-medium text-gray-300 mb-2">Condition Notes:</p>
                                <ul className="space-y-1">
                                    {condition.notes.map((note: string, index: number) => (
                                        <li key={index} className="text-sm text-gray-400 flex items-start">
                                            <span className="mr-2">•</span>
                                            <span>{note}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {condition.redFlags && condition.redFlags.length > 0 && (
                            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                                <p className="text-sm font-medium text-amber-400 mb-1">⚠️ Warnings:</p>
                                <ul className="space-y-1">
                                    {condition.redFlags.map((flag: string, index: number) => (
                                        <li key={index} className="text-sm text-amber-300">
                                            • {flag}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div className="text-xs text-gray-500">
                            AI Confidence: {(condition.confidence * 100).toFixed(0)}%
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* LTV Breakdown */}
            <Card variant="glass">
                <CardHeader>
                    <CardTitle>Loan-to-Value Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-400">Base LTV ({asset.type})</span>
                            <span className="text-sm font-semibold text-white">{riskBreakdown.baseLTV}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-400">Condition Adjustment</span>
                            <span className="text-sm font-semibold text-white">{riskBreakdown.conditionAdjustment}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-400">Age Adjustment</span>
                            <span className="text-sm font-semibold text-white">{riskBreakdown.ageAdjustment}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-400">Liquidity Adjustment</span>
                            <span className="text-sm font-semibold text-white">{riskBreakdown.liquidityAdjustment}</span>
                        </div>
                        <div className="h-px bg-gray-700 my-2" />
                        <div className="flex items-center justify-between">
                            <span className="text-base font-semibold text-white">Final LTV</span>
                            <span className="text-lg font-bold gradient-text">{riskBreakdown.finalLTV}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Recommended Terms */}
            <Card variant="glass">
                <CardHeader>
                    <CardTitle>Recommended Loan Terms</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-gray-400 mb-1">Duration</p>
                            <p className="text-lg font-semibold text-white">{loanTerms.recommendedDuration} days</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-400 mb-1">Interest Rate</p>
                            <p className="text-lg font-semibold text-white">
                                {loanTerms.recommendedInterestRate / 100}% APR
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/borrow/request" className="flex-1">
                    <Button size="lg" className="w-full">
                        Request Loan
                    </Button>
                </Link>
                <Link href="/borrow/upload" className="flex-1">
                    <Button size="lg" variant="outline" className="w-full">
                        Upload Another Asset
                    </Button>
                </Link>
            </div>

            {/* Info */}
            <div className="text-center text-sm text-gray-500">
                <p>Valuation ID: {valuation.valuationId}</p>
                <p className="mt-1">Valid for 24 hours</p>
            </div>
        </div>
    );
}
