'use client';

import { useParams } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { LoadingButton } from '@/components/ui/Spinner';
import { useToast, ToastContainer } from '@/components/ui/Toast';
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
import { useState, useEffect, useRef } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { useGetLoan, useGetAsset, useRepayLoan } from '@/lib/hooks';
import { getDefaultStablecoin, getStablecoinDecimals } from '@/lib/contracts';
import { parseUnits, formatUnits } from 'viem';

export default function BorrowerLoanDetailPage() {
    const params = useParams();
    const { address, isConnected } = useAccount();
    const chainId = useChainId();
    const { toast, toasts, removeToast } = useToast();
    const [isRepayModalOpen, setIsRepayModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [repaymentStep, setRepaymentStep] = useState<'approve' | 'repay'>('approve');
    const lastProcessedHash = useRef<string | null>(null);

    // Fetch real loan data from blockchain
    const loanId = params.id ? BigInt(params.id as string) : undefined;
    const { loan: blockchainLoan, isLoading: isLoadingLoan, refetch: refetchLoan } = useGetLoan(loanId);

    // Fetch asset details
    const assetTokenId = blockchainLoan?.assetTokenId;
    const { asset: assetDetails, isLoading: isLoadingAsset } = useGetAsset(assetTokenId);

    // Repayment hooks
    const {
        approveRepayment,
        makeRepayment,
        isPending,
        isConfirming,
        isSuccess,
        hash,
        error,
    } = useRepayLoan();

    // Calculate due date
    const dueDate = blockchainLoan?.startTime && blockchainLoan.startTime > 0n
        ? new Date((Number(blockchainLoan.startTime) + Number(blockchainLoan.duration)) * 1000).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];

    // Convert blockchain data to UI format
    const loan = blockchainLoan ? {
        id: params.id as string,
        borrower: `${blockchainLoan.borrower.slice(0, 6)}...${blockchainLoan.borrower.slice(-4)}`,
        lender: blockchainLoan.lender !== '0x0000000000000000000000000000000000000000'
            ? `${blockchainLoan.lender.slice(0, 6)}...${blockchainLoan.lender.slice(-4)}`
            : 'Not funded yet',
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
            : 'Pending funding',
        dueDate: dueDate,
        status: blockchainLoan.status === 1 ? 'repaid' : blockchainLoan.status === 2 ? 'defaulted' : blockchainLoan.lender !== '0x0000000000000000000000000000000000000000' ? 'active' : 'pending',
        assetValue: Number(formatUnits(assetDetails?.aiValuation || blockchainLoan.principal || 0n, 6)),
        ltv: assetDetails?.aiValuation ? (Number(formatUnits(blockchainLoan.principal || 0n, 6)) / Number(formatUnits(assetDetails.aiValuation, 6))) * 100 : 66.7,
    } : null;

    const repaymentProgress = loan ? (loan.amountRepaid / loan.totalRepayment) * 100 : 0;
    const remainingBalance = loan ? loan.totalRepayment - loan.amountRepaid : 0;

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return 'info';
            case 'repaid':
                return 'success';
            case 'defaulted':
                return 'error';
            case 'pending':
                return 'warning';
            default:
                return 'default';
        }
    };

    // Watch for successful transactions
    useEffect(() => {
        if (isSuccess && hash && hash !== lastProcessedHash.current) {
            lastProcessedHash.current = hash;

            if (repaymentStep === 'approve') {
                console.log('✅ Approval successful, moving to repay step');
                setRepaymentStep('repay');
                setIsLoading(false);
            } else if (repaymentStep === 'repay') {
                console.log('✅ Repayment successful');
                setIsLoading(false);
                setIsRepayModalOpen(false);

                toast.success(`🔗 Successfully repaid loan on blockchain!`);

                setTimeout(() => {
                    refetchLoan();
                }, 3000);

                setRepaymentStep('approve');
            }
        }
    }, [isSuccess, hash, repaymentStep, refetchLoan, toast]);

    const confirmRepayment = async () => {
        if (!loan) return;

        setIsLoading(true);

        try {
            const stablecoin = getDefaultStablecoin(chainId);
            if (!stablecoin) {
                toast.error('No stablecoin configured for this network');
                setIsLoading(false);
                return;
            }

            const decimals = getStablecoinDecimals(chainId, stablecoin);
            const amount = parseUnits(remainingBalance.toString(), decimals);

            if (repaymentStep === 'approve') {
                await approveRepayment(stablecoin, amount);
            } else {
                await makeRepayment(BigInt(loan.id), amount);
            }
        } catch (err: any) {
            console.error('Repayment error:', err);
            toast.error(err.message || 'Transaction failed');
            setIsLoading(false);
        }
    };

    if (!isConnected) {
        return (
            <main className="min-h-screen">
                <Navbar />
                <div className="pt-24 pb-12">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <ToastContainer toasts={toasts} onRemove={removeToast} />
                        <Card variant="glass" className="text-center py-16">
                            <h2 className="text-2xl font-bold text-white mb-2">Connect Your Wallet</h2>
                            <p className="text-gray-400">Connect your wallet to view loan details</p>
                        </Card>
                    </div>
                </div>
            </main>
        );
    }

    if (isLoadingLoan || !loan) {
        return (
            <main className="min-h-screen">
                <Navbar />
                <div className="pt-24 pb-12">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <ToastContainer toasts={toasts} onRemove={removeToast} />
                        <Card variant="glass" className="text-center py-16">
                            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mb-4"></div>
                            <p className="text-gray-400">Loading loan details...</p>
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
                    <ToastContainer toasts={toasts} onRemove={removeToast} />

                    {/* Back Button */}
                    <div className="mb-8">
                        <Link href="/borrow">
                            <Button variant="outline" size="sm">
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back to My Loans
                            </Button>
                        </Link>
                    </div>

                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h1 className="text-4xl font-bold text-white">{loan.assetName}</h1>
                                <Badge variant={getStatusColor(loan.status)}>
                                    <span className="capitalize">{loan.status}</span>
                                </Badge>
                            </div>
                            <p className="text-gray-400">Loan ID: #{loan.id}</p>
                        </div>
                        {loan.status === 'active' && (
                            <Button size="lg" onClick={() => setIsRepayModalOpen(true)}>
                                Make Payment
                            </Button>
                        )}
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        <Card variant="gradient">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm">Borrowed Amount</CardTitle>
                                    <DollarSign className="w-5 h-5 text-indigo-400" />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl font-bold text-white">{formatCurrency(loan.principal)}</p>
                            </CardContent>
                        </Card>

                        <Card variant="gradient">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm">Total to Repay</CardTitle>
                                    <TrendingUp className="w-5 h-5 text-red-400" />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl font-bold text-white">{formatCurrency(loan.totalRepayment)}</p>
                            </CardContent>
                        </Card>

                        <Card variant="gradient">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm">Already Paid</CardTitle>
                                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl font-bold text-white">{formatCurrency(loan.amountRepaid)}</p>
                            </CardContent>
                        </Card>

                        <Card variant="gradient">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm">Remaining Balance</CardTitle>
                                    <Clock className="w-5 h-5 text-amber-400" />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl font-bold text-white">{formatCurrency(remainingBalance)}</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Main Content Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Left Column */}
                        <div className="lg:col-span-2 space-y-8">
                            {/* Loan Details */}
                            <Card variant="glass">
                                <CardHeader>
                                    <CardTitle>Loan Details</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="bg-slate-900/50 rounded-xl p-4">
                                            <p className="text-sm text-gray-400 mb-1">Interest Rate</p>
                                            <p className="text-xl font-bold text-white">{loan.interestRate}% APR</p>
                                        </div>
                                        <div className="bg-slate-900/50 rounded-xl p-4">
                                            <p className="text-sm text-gray-400 mb-1">Duration</p>
                                            <p className="text-xl font-bold text-white">{loan.duration} days</p>
                                        </div>
                                        <div className="bg-slate-900/50 rounded-xl p-4">
                                            <p className="text-sm text-gray-400 mb-1">Start Date</p>
                                            <p className="text-xl font-bold text-white">{loan.status === 'pending' ? loan.startDate : formatDate(loan.startDate)}</p>
                                        </div>
                                        <div className="bg-slate-900/50 rounded-xl p-4">
                                            <p className="text-sm text-gray-400 mb-1">Due Date</p>
                                            <p className="text-xl font-bold text-white">{loan.status === 'pending' ? 'TBD' : formatDate(loan.dueDate)}</p>
                                        </div>
                                    </div>

                                    <div className="mt-6 space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-400">Lender</span>
                                            <span className="font-mono text-indigo-400">{loan.lender}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-400">Borrower (You)</span>
                                            <span className="font-mono text-indigo-400">{loan.borrower}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Repayment Progress */}
                            {loan.status === 'active' && (
                                <Card variant="glass">
                                    <CardHeader>
                                        <CardTitle>Repayment Progress</CardTitle>
                                        <CardDescription>Track your loan repayment</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            <div>
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-sm text-gray-400">Progress</span>
                                                    <span className="text-sm font-semibold text-white">{repaymentProgress.toFixed(1)}%</span>
                                                </div>
                                                <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                                                        style={{ width: `${repaymentProgress}%` }}
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 pt-4">
                                                <div className="bg-slate-900/50 rounded-xl p-4">
                                                    <p className="text-sm text-gray-400 mb-1">Total Paid</p>
                                                    <p className="text-xl font-bold text-green-400">{formatCurrency(loan.amountRepaid)}</p>
                                                </div>
                                                <div className="bg-slate-900/50 rounded-xl p-4">
                                                    <p className="text-sm text-gray-400 mb-1">Remaining</p>
                                                    <p className="text-xl font-bold text-amber-400">{formatCurrency(remainingBalance)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>

                        {/* Right Column */}
                        <div className="space-y-8">
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
                                        <div className="grid grid-cols-1 gap-4">
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

                            {/* Status Card */}
                            <Card variant="glass">
                                <CardHeader>
                                    <CardTitle>Loan Status</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {loan.status === 'pending' && (
                                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                                                <div className="flex gap-2">
                                                    <Clock className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                                                    <div>
                                                        <p className="font-semibold text-amber-200 mb-1">Waiting for Lender</p>
                                                        <p className="text-sm text-amber-300">
                                                            Your loan request is waiting to be funded by a lender.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        {loan.status === 'active' && (
                                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                                                <div className="flex gap-2">
                                                    <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                                                    <div>
                                                        <p className="font-semibold text-blue-200 mb-1">Active Loan</p>
                                                        <p className="text-sm text-blue-300">
                                                            Repayment due by {formatDate(loan.dueDate)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        {loan.status === 'repaid' && (
                                            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                                                <div className="flex gap-2">
                                                    <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                                                    <div>
                                                        <p className="font-semibold text-green-200 mb-1">Loan Repaid</p>
                                                        <p className="text-sm text-green-300">
                                                            You have successfully repaid this loan!
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Repayment Modal */}
                    <Modal
                        isOpen={isRepayModalOpen}
                        onClose={() => setIsRepayModalOpen(false)}
                        title="Repay Loan"
                        description="Review repayment details and confirm"
                        size="md"
                    >
                        <div className="space-y-6">
                            <div className="bg-slate-900/50 rounded-xl p-4 space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Asset:</span>
                                    <span className="font-semibold text-white">{loan.assetName}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Principal:</span>
                                    <span className="font-semibold text-white">{formatCurrency(loan.principal)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Total Repayment:</span>
                                    <span className="font-semibold text-white">{formatCurrency(loan.totalRepayment)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Already Paid:</span>
                                    <span className="font-semibold text-green-400">{formatCurrency(loan.amountRepaid)}</span>
                                </div>
                                <div className="border-t border-gray-700 pt-3">
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Remaining Amount:</span>
                                        <span className="font-semibold text-indigo-400">
                                            {formatCurrency(remainingBalance)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                                <div className="flex gap-2">
                                    <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                                    <div className="text-sm text-amber-200">
                                        <p className="font-semibold mb-1">Repayment Process</p>
                                        <p className="mb-2">
                                            <strong>Step 1:</strong> Approve mUSDT (Mock USDT for testing)<br />
                                            <strong>Step 2:</strong> Make repayment
                                        </p>
                                        <p className="text-xs text-amber-300">
                                            Note: This will repay the full remaining amount.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <ModalFooter>
                                <Button variant="outline" onClick={() => setIsRepayModalOpen(false)} disabled={isLoading}>
                                    Cancel
                                </Button>
                                <LoadingButton isLoading={isLoading || isPending || isConfirming} onClick={confirmRepayment}>
                                    {isPending
                                        ? 'Signing...'
                                        : isConfirming
                                        ? 'Confirming...'
                                        : isLoading
                                        ? 'Processing...'
                                        : repaymentStep === 'approve'
                                        ? `Approve mUSDT (Step 1/2)`
                                        : `Repay ${formatCurrency(remainingBalance)} (Step 2/2)`}
                                </LoadingButton>
                            </ModalFooter>
                        </div>
                    </Modal>
                </div>
            </div>
        </main>
    );
}
