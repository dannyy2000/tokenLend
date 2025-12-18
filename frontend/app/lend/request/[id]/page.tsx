'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { useToast, ToastContainer } from '@/components/ui/Toast';
import { LoadingButton, LoadingState } from '@/components/ui/Spinner';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import {
    ArrowLeft,
    DollarSign,
    Calendar,
    TrendingUp,
    Shield,
    User,
    AlertCircle,
    Image as ImageIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { useGetLoan } from '@/lib/hooks';
import { formatUnits } from 'viem';

export default function LoanRequestDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { address, isConnected } = useAccount();
    const { toast, toasts, removeToast } = useToast();
    const [isFundModalOpen, setIsFundModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Fetch real loan data from blockchain
    const loanId = params.id ? BigInt(params.id as string) : undefined;
    const { loan: blockchainLoan, isLoading: isLoadingLoan } = useGetLoan(loanId);

    // Debug: Log the actual loan data
    console.log('🔍 Loan ID:', params.id);
    console.log('🔍 Blockchain Loan Data:', blockchainLoan);
    console.log('🔍 Loading:', isLoadingLoan);

    // Convert blockchain data to UI format
    const loanRequest = blockchainLoan ? {
        id: params.id as string,
        borrower: `${blockchainLoan.borrower.slice(0, 6)}...${blockchainLoan.borrower.slice(-4)}`,
        assetType: 'asset',
        assetName: `Asset #${blockchainLoan.assetTokenId?.toString() || '0'}`,
        assetDescription: 'Asset tokenized on blockchain',
        assetValue: Number(formatUnits(blockchainLoan.principal || 0n, 6)) * 1.5, // Estimate
        requestedAmount: Number(formatUnits(blockchainLoan.principal || 0n, 6)),
        interestRate: Number(blockchainLoan.interestRate || 0n) / 100,
        duration: Number(blockchainLoan.duration || 0n) / (24 * 60 * 60),
        ltv: 66.7,
        createdAt: new Date().toISOString().split('T')[0],
        status: 'active',
        images: [],
        aiValuation: {
            estimatedValue: Number(formatUnits(blockchainLoan.principal || 0n, 6)) * 1.5,
            confidence: 85,
            condition: 'Good',
            marketPrice: Number(formatUnits(blockchainLoan.principal || 0n, 6)) * 1.6,
        },
    } : null;

    const expectedReturn = loanRequest ? loanRequest.requestedAmount * (1 + (loanRequest.interestRate / 100) * (loanRequest.duration / 365)) : 0;
    const expectedProfit = loanRequest ? expectedReturn - loanRequest.requestedAmount : 0;

    const handleFundLoan = () => {
        setIsFundModalOpen(true);
    };

    const confirmFunding = async () => {
        setIsLoading(true);
        // Simulate blockchain transaction
        setTimeout(() => {
            setIsLoading(false);
            setIsFundModalOpen(false);
            toast.success('Loan funded successfully!');
            setTimeout(() => {
                router.push('/lend');
            }, 2000);
        }, 2000);
    };

    if (!isConnected) {
        return (
            <main className="min-h-screen">
                <Navbar />
                <div className="pt-24 pb-12">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <Card variant="glass" className="text-center py-16">
                            <h2 className="text-2xl font-bold text-white mb-2">Connect Your Wallet</h2>
                            <p className="text-gray-400">Connect your wallet to view loan details</p>
                        </Card>
                    </div>
                </div>
            </main>
        );
    }

    if (isLoadingLoan) {
        return (
            <main className="min-h-screen">
                <Navbar />
                <div className="pt-24 pb-12">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <Card variant="glass" className="text-center py-16">
                            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mb-4"></div>
                            <p className="text-gray-400">Loading loan details...</p>
                        </Card>
                    </div>
                </div>
            </main>
        );
    }

    if (!loanRequest) {
        return (
            <main className="min-h-screen">
                <Navbar />
                <div className="pt-24 pb-12">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <Card variant="glass" className="text-center py-16">
                            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                            <h2 className="text-2xl font-bold text-white mb-2">Loan Not Found</h2>
                            <p className="text-gray-400 mb-6">This loan doesn't exist or has been removed</p>
                            <Link href="/lend">
                                <Button>Back to Dashboard</Button>
                            </Link>
                        </Card>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen">
            <Navbar />
            <ToastContainer toasts={toasts} onRemove={removeToast} />
            <div className="pt-24 pb-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Back Button */}
                    <Link href="/lend">
                        <Button variant="ghost" size="sm" className="mb-6">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Dashboard
                        </Button>
                    </Link>

                    {/* Header */}
                    <div className="flex items-start justify-between mb-8">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h1 className="text-4xl font-bold text-white">{loanRequest.assetName}</h1>
                                <Badge variant="info">Active</Badge>
                            </div>
                            <p className="text-gray-400">Loan Request #{loanRequest.id}</p>
                        </div>
                        <Button size="lg" onClick={handleFundLoan}>
                            Fund This Loan
                        </Button>
                    </div>

                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* Main Content */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Asset Images */}
                            <Card variant="glass">
                                <CardHeader>
                                    <CardTitle>Asset Images</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-3 gap-4">
                                        {loanRequest.images.map((img, idx) => (
                                            <div
                                                key={idx}
                                                className="aspect-square rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700"
                                            >
                                                <ImageIcon className="w-12 h-12 text-gray-600" />
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Asset Details */}
                            <Card variant="glass">
                                <CardHeader>
                                    <CardTitle>Asset Details</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-sm text-gray-400 mb-1">Description</p>
                                            <p className="text-white">{loanRequest.assetDescription}</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-sm text-gray-400 mb-1">Asset Type</p>
                                                <p className="text-white capitalize">{loanRequest.assetType}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-400 mb-1">Condition</p>
                                                <p className="text-white">{loanRequest.aiValuation.condition}</p>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* AI Valuation */}
                            <Card variant="glass">
                                <CardHeader>
                                    <CardTitle>AI Valuation Report</CardTitle>
                                    <CardDescription>Powered by GPT-4 Vision</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-slate-900/50 rounded-xl p-4">
                                            <p className="text-sm text-gray-400 mb-1">Estimated Value</p>
                                            <p className="text-2xl font-bold text-white">
                                                {formatCurrency(loanRequest.aiValuation.estimatedValue)}
                                            </p>
                                        </div>
                                        <div className="bg-slate-900/50 rounded-xl p-4">
                                            <p className="text-sm text-gray-400 mb-1">Market Price</p>
                                            <p className="text-2xl font-bold text-white">
                                                {formatCurrency(loanRequest.aiValuation.marketPrice)}
                                            </p>
                                        </div>
                                        <div className="bg-slate-900/50 rounded-xl p-4">
                                            <p className="text-sm text-gray-400 mb-1">Confidence Score</p>
                                            <p className="text-2xl font-bold text-green-400">
                                                {loanRequest.aiValuation.confidence}%
                                            </p>
                                        </div>
                                        <div className="bg-slate-900/50 rounded-xl p-4">
                                            <p className="text-sm text-gray-400 mb-1">LTV Ratio</p>
                                            <p className="text-2xl font-bold text-indigo-400">{loanRequest.ltv.toFixed(1)}%</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            {/* Loan Terms */}
                            <Card variant="gradient">
                                <CardHeader>
                                    <CardTitle>Loan Terms</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            <DollarSign className="w-5 h-5 text-indigo-400" />
                                            <div className="flex-1">
                                                <p className="text-sm text-gray-400">Requested Amount</p>
                                                <p className="text-xl font-bold text-white">
                                                    {formatCurrency(loanRequest.requestedAmount)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <TrendingUp className="w-5 h-5 text-green-400" />
                                            <div className="flex-1">
                                                <p className="text-sm text-gray-400">Interest Rate</p>
                                                <p className="text-xl font-bold text-white">{loanRequest.interestRate}% APR</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Calendar className="w-5 h-5 text-blue-400" />
                                            <div className="flex-1">
                                                <p className="text-sm text-gray-400">Duration</p>
                                                <p className="text-xl font-bold text-white">{loanRequest.duration} days</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Shield className="w-5 h-5 text-purple-400" />
                                            <div className="flex-1">
                                                <p className="text-sm text-gray-400">Collateral</p>
                                                <p className="text-xl font-bold text-white">
                                                    {formatCurrency(loanRequest.assetValue)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Expected Returns */}
                            <Card variant="glass" className="border-green-500/20">
                                <CardHeader>
                                    <CardTitle className="text-green-400">Expected Returns</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Principal</span>
                                            <span className="font-semibold text-white">
                                                {formatCurrency(loanRequest.requestedAmount)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Interest</span>
                                            <span className="font-semibold text-green-400">{formatCurrency(expectedProfit)}</span>
                                        </div>
                                        <div className="h-px bg-slate-700" />
                                        <div className="flex justify-between">
                                            <span className="text-white font-semibold">Total Return</span>
                                            <span className="font-bold text-xl text-green-400">{formatCurrency(expectedReturn)}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Borrower Info */}
                            <Card variant="glass">
                                <CardHeader>
                                    <CardTitle>Borrower Information</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center gap-3">
                                        <User className="w-5 h-5 text-indigo-400" />
                                        <div className="flex-1">
                                            <p className="text-sm text-gray-400">Wallet Address</p>
                                            <p className="font-mono text-white">{loanRequest.borrower}</p>
                                        </div>
                                    </div>
                                    <div className="mt-4 bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
                                        <p className="text-xs text-blue-200">
                                            Listed {formatDate(loanRequest.createdAt)}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>

                            <Button size="lg" className="w-full" onClick={handleFundLoan}>
                                Fund {formatCurrency(loanRequest.requestedAmount)}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Fund Loan Modal */}
            <Modal
                isOpen={isFundModalOpen}
                onClose={() => setIsFundModalOpen(false)}
                title="Confirm Funding"
                description="Review the loan details before confirming"
                size="md"
            >
                <div className="space-y-6">
                    <div className="bg-slate-900/50 rounded-xl p-4 space-y-3">
                        <div className="flex justify-between">
                            <span className="text-gray-400">Loan Amount:</span>
                            <span className="font-semibold text-white">{formatCurrency(loanRequest.requestedAmount)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">Interest Rate:</span>
                            <span className="font-semibold text-green-400">{loanRequest.interestRate}% APR</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">Duration:</span>
                            <span className="font-semibold text-white">{loanRequest.duration} days</span>
                        </div>
                        <div className="h-px bg-slate-700" />
                        <div className="flex justify-between">
                            <span className="text-white font-semibold">Expected Return:</span>
                            <span className="font-semibold text-green-400">{formatCurrency(expectedReturn)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-white font-semibold">Expected Profit:</span>
                            <span className="font-semibold text-green-400">{formatCurrency(expectedProfit)}</span>
                        </div>
                    </div>

                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                        <div className="flex gap-2">
                            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-amber-200">
                                <p className="font-semibold mb-1">Important</p>
                                <p>
                                    By funding this loan, you agree to transfer {formatCurrency(loanRequest.requestedAmount)}{' '}
                                    to the borrower. Funds will be locked until the loan is repaid or defaults.
                                </p>
                            </div>
                        </div>
                    </div>

                    <ModalFooter>
                        <Button variant="outline" onClick={() => setIsFundModalOpen(false)} disabled={isLoading}>
                            Cancel
                        </Button>
                        <LoadingButton isLoading={isLoading} onClick={confirmFunding}>
                            {isLoading ? 'Processing...' : 'Confirm Funding'}
                        </LoadingButton>
                    </ModalFooter>
                </div>
            </Modal>
        </main>
    );
}
