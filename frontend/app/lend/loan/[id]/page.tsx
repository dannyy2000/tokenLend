'use client';

import { useParams } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import {
    ArrowLeft,
    DollarSign,
    Calendar,
    TrendingUp,
    User,
    Clock,
    CheckCircle2,
    AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { useGetLoan, useGetAsset } from '@/lib/hooks';
import { formatUnits } from 'viem';

export default function FundedLoanDetailPage() {
    const params = useParams();
    const { address, isConnected } = useAccount();

    // Fetch real loan data from blockchain
    const loanId = params.id ? BigInt(params.id as string) : undefined;
    const { loan: blockchainLoan, isLoading: isLoadingLoan } = useGetLoan(loanId);

    // Fetch asset details
    const assetTokenId = blockchainLoan?.assetTokenId;
    const { asset: assetDetails, isLoading: isLoadingAsset } = useGetAsset(assetTokenId);

    // Debug logs
    console.log('🔍 Funded Loan ID:', params.id);
    console.log('🔍 Funded Blockchain Loan:', blockchainLoan);
    console.log('🔍 Asset Details:', assetDetails);

    // Calculate due date
    const dueDate = blockchainLoan?.startTime && blockchainLoan.startTime > 0n
        ? new Date((Number(blockchainLoan.startTime) + Number(blockchainLoan.duration)) * 1000).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];

    // Convert blockchain data to UI format
    const loan = blockchainLoan ? {
        id: params.id as string,
        borrower: `${blockchainLoan.borrower.slice(0, 6)}...${blockchainLoan.borrower.slice(-4)}`,
        assetType: assetDetails?.assetType || 'asset',
        assetName: assetDetails?.assetType
            ? `${assetDetails.assetType.charAt(0).toUpperCase() + assetDetails.assetType.slice(1)} (Asset #${blockchainLoan.assetTokenId?.toString() || '0'})`
            : `Asset #${blockchainLoan.assetTokenId?.toString() || '0'}`,
        assetDescription: 'Real-world asset tokenized on blockchain',
        principal: Number(formatUnits(blockchainLoan.principal || 0n, 6)),
        totalRepayment: Number(formatUnits(blockchainLoan.totalRepayment || 0n, 6)),
        amountRepaid: Number(formatUnits(blockchainLoan.amountRepaid || 0n, 6)),
        interestRate: Number(blockchainLoan.interestRate || 0n) / 100,
        duration: Number(blockchainLoan.duration || 0n) / (24 * 60 * 60),
        startDate: blockchainLoan.startTime && blockchainLoan.startTime > 0n
            ? new Date(Number(blockchainLoan.startTime) * 1000).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0],
        dueDate: dueDate,
        status: blockchainLoan.status === 1 ? 'repaid' : blockchainLoan.status === 2 ? 'defaulted' : 'active',
        assetValue: Number(formatUnits(blockchainLoan.principal || 0n, 6)) * 1.5,
        ltv: 66.7,
        nextPaymentDue: dueDate, // Same as due date since it's a single payment loan
        nextPaymentAmount: Number(formatUnits((blockchainLoan.totalRepayment || 0n) - (blockchainLoan.amountRepaid || 0n), 6)),
    } : null;

    const repaymentProgress = loan ? (loan.amountRepaid / loan.totalRepayment) * 100 : 0;
    const interestEarned = loan && loan.amountRepaid - loan.principal > 0 ? loan.amountRepaid - loan.principal : 0;
    const remainingBalance = loan ? loan.totalRepayment - loan.amountRepaid : 0;

    // Real payment history - these are single-payment loans, so we only show if there's been a repayment
    const paymentHistory = loan && loan.amountRepaid > 0 ? [
        {
            id: '1',
            date: new Date().toISOString().split('T')[0], // Current date as we don't track payment timestamp
            amount: loan.amountRepaid,
            status: loan.status === 'repaid' ? 'completed' : 'partial',
        },
    ] : [];

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return 'info';
            case 'repaid':
                return 'success';
            case 'defaulted':
                return 'error';
            case 'completed':
                return 'success';
            case 'partial':
                return 'warning';
            default:
                return 'default';
        }
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

    if (isLoadingLoan || isLoadingAsset) {
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

    if (!loan) {
        return (
            <main className="min-h-screen">
                <Navbar />
                <div className="pt-24 pb-12">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <Card variant="glass" className="text-center py-16">
                            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                            <h2 className="text-2xl font-bold text-white mb-2">Loan Not Found</h2>
                            <p className="text-gray-400 mb-6">This loan doesn't exist</p>
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
                                <h1 className="text-4xl font-bold text-white">{loan.assetName}</h1>
                                <Badge variant={getStatusColor(loan.status)}>
                                    <span className="capitalize">{loan.status}</span>
                                </Badge>
                            </div>
                            <p className="text-gray-400">Loan #{loan.id}</p>
                        </div>
                    </div>

                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* Main Content */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Repayment Progress */}
                            <Card variant="glass">
                                <CardHeader>
                                    <CardTitle>Repayment Progress</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-400">Progress</span>
                                            <span className="text-2xl font-bold text-white">{repaymentProgress.toFixed(1)}%</span>
                                        </div>
                                        <div className="w-full h-4 bg-slate-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
                                                style={{ width: `${repaymentProgress}%` }}
                                            />
                                        </div>
                                        <div className="grid grid-cols-3 gap-4 pt-2">
                                            <div className="bg-slate-900/50 rounded-xl p-4">
                                                <p className="text-sm text-gray-400 mb-1">Paid</p>
                                                <p className="text-xl font-bold text-green-400">{formatCurrency(loan.amountRepaid)}</p>
                                            </div>
                                            <div className="bg-slate-900/50 rounded-xl p-4">
                                                <p className="text-sm text-gray-400 mb-1">Remaining</p>
                                                <p className="text-xl font-bold text-white">{formatCurrency(remainingBalance)}</p>
                                            </div>
                                            <div className="bg-slate-900/50 rounded-xl p-4">
                                                <p className="text-sm text-gray-400 mb-1">Total</p>
                                                <p className="text-xl font-bold text-indigo-400">
                                                    {formatCurrency(loan.totalRepayment)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Next Payment */}
                            <Card variant="glass" className="border-amber-500/20">
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle>Next Payment Due</CardTitle>
                                        <Clock className="w-5 h-5 text-amber-400" />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-gray-400 mb-1">Amount</p>
                                            <p className="text-2xl font-bold text-white">
                                                {formatCurrency(loan.nextPaymentAmount)}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm text-gray-400 mb-1">Due Date</p>
                                            <p className="text-xl font-bold text-amber-400">{formatDate(loan.nextPaymentDue)}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Payment History */}
                            <Card variant="glass">
                                <CardHeader>
                                    <CardTitle>Payment History</CardTitle>
                                    <CardDescription>Recent payments from borrower</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {paymentHistory.map((payment) => (
                                            <div
                                                key={payment.id}
                                                className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                                                    <div>
                                                        <p className="font-semibold text-white">{formatCurrency(payment.amount)}</p>
                                                        <p className="text-sm text-gray-400">{formatDate(payment.date)}</p>
                                                    </div>
                                                </div>
                                                <Badge variant={getStatusColor(payment.status)}>
                                                    <span className="capitalize">{payment.status}</span>
                                                </Badge>
                                            </div>
                                        ))}
                                        {paymentHistory.length === 0 && loan && (
                                            <div className="text-center py-8">
                                                <Clock className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                                                <p className="text-gray-400 mb-1">Single Payment Loan</p>
                                                <p className="text-sm text-gray-500">Full payment of {formatCurrency(loan.totalRepayment)} due on {formatDate(loan.dueDate)}</p>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Asset Details */}
                            <Card variant="glass">
                                <CardHeader>
                                    <CardTitle>Collateral Details</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-sm text-gray-400 mb-1">Asset Description</p>
                                            <p className="text-white">{loan.assetDescription}</p>
                                        </div>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="bg-slate-900/50 rounded-xl p-4">
                                                <p className="text-sm text-gray-400 mb-1">Asset Type</p>
                                                <p className="text-white capitalize">{loan.assetType}</p>
                                            </div>
                                            <div className="bg-slate-900/50 rounded-xl p-4">
                                                <p className="text-sm text-gray-400 mb-1">Asset Value</p>
                                                <p className="text-white">{formatCurrency(loan.assetValue)}</p>
                                            </div>
                                            <div className="bg-slate-900/50 rounded-xl p-4">
                                                <p className="text-sm text-gray-400 mb-1">LTV Ratio</p>
                                                <p className="text-white">{loan.ltv.toFixed(1)}%</p>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            {/* Loan Details */}
                            <Card variant="gradient">
                                <CardHeader>
                                    <CardTitle>Loan Details</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            <DollarSign className="w-5 h-5 text-indigo-400" />
                                            <div className="flex-1">
                                                <p className="text-sm text-gray-400">Principal</p>
                                                <p className="text-xl font-bold text-white">{formatCurrency(loan.principal)}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <TrendingUp className="w-5 h-5 text-green-400" />
                                            <div className="flex-1">
                                                <p className="text-sm text-gray-400">Interest Rate</p>
                                                <p className="text-xl font-bold text-white">{loan.interestRate}% APR</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Calendar className="w-5 h-5 text-blue-400" />
                                            <div className="flex-1">
                                                <p className="text-sm text-gray-400">Duration</p>
                                                <p className="text-xl font-bold text-white">{loan.duration} days</p>
                                            </div>
                                        </div>
                                        <div className="h-px bg-slate-700" />
                                        <div>
                                            <p className="text-sm text-gray-400 mb-1">Start Date</p>
                                            <p className="text-white">{formatDate(loan.startDate)}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-400 mb-1">Due Date</p>
                                            <p className="text-white">{formatDate(loan.dueDate)}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Earnings */}
                            <Card variant="glass" className="border-green-500/20">
                                <CardHeader>
                                    <CardTitle className="text-green-400">Your Earnings</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Principal</span>
                                            <span className="font-semibold text-white">{formatCurrency(loan.principal)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Interest Earned</span>
                                            <span className="font-semibold text-green-400">{formatCurrency(interestEarned)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Expected Interest</span>
                                            <span className="font-semibold text-white">
                                                {formatCurrency(loan.totalRepayment - loan.principal)}
                                            </span>
                                        </div>
                                        <div className="h-px bg-slate-700" />
                                        <div className="flex justify-between">
                                            <span className="text-white font-semibold">Total Expected</span>
                                            <span className="font-bold text-xl text-green-400">
                                                {formatCurrency(loan.totalRepayment)}
                                            </span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Borrower Info */}
                            <Card variant="glass">
                                <CardHeader>
                                    <CardTitle>Borrower</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center gap-3">
                                        <User className="w-5 h-5 text-indigo-400" />
                                        <div className="flex-1">
                                            <p className="text-sm text-gray-400 mb-1">Wallet Address</p>
                                            <p className="font-mono text-white break-all">{loan.borrower}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Action Buttons */}
                            <div className="space-y-3">
                                <Button variant="outline" size="lg" className="w-full">
                                    Download Report
                                </Button>
                                <Button variant="ghost" size="lg" className="w-full">
                                    Contact Support
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
