'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { useToast, ToastContainer } from '@/components/ui/Toast';
import { LoadingButton } from '@/components/ui/Spinner';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import { TrendingUp, Wallet, DollarSign, AlertCircle, CheckCircle2, Clock, Eye } from 'lucide-react';
import Link from 'next/link';
import { useAccount, useChainId } from 'wagmi';
import { useFundLoan } from '@/lib/hooks';
import { getDefaultStablecoin, getStablecoinDecimals } from '@/lib/contracts';
import { parseUnits } from 'viem';

interface LoanRequest {
    id: string;
    borrower: string;
    assetType: string;
    assetName: string;
    assetValue: number;
    requestedAmount: number;
    interestRate: number;
    duration: number;
    ltv: number;
    createdAt: string;
    status: 'active' | 'funded' | 'cancelled';
}

interface FundedLoan {
    id: string;
    borrower: string;
    assetType: string;
    assetName: string;
    principal: number;
    totalRepayment: number;
    amountRepaid: number;
    interestRate: number;
    duration: number;
    startDate: string;
    dueDate: string;
    status: 'active' | 'repaid' | 'defaulted';
}

export function LenderDashboard() {
    const { address, isConnected } = useAccount();
    const chainId = useChainId();
    const { toast, toasts, removeToast } = useToast();
    const [selectedLoan, setSelectedLoan] = useState<LoanRequest | null>(null);
    const [isFundModalOpen, setIsFundModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [fundingStep, setFundingStep] = useState<'approve' | 'fund'>('approve');

    // Real blockchain hook
    const {
        approveStablecoin,
        fundLoan,
        isPending,
        isConfirming,
        isSuccess,
        hash,
        error,
    } = useFundLoan();

    // Mock data - in production, fetch from smart contracts
    const mockAvailableLoans: LoanRequest[] = [
        {
            id: '1',
            borrower: '0x1234...5678',
            assetType: 'smartphone',
            assetName: 'Samsung Galaxy S23 Ultra 256GB',
            assetValue: 450000,
            requestedAmount: 300000,
            interestRate: 12,
            duration: 60,
            ltv: 66.7,
            createdAt: '2024-12-15',
            status: 'active',
        },
        {
            id: '2',
            borrower: '0xabcd...efgh',
            assetType: 'laptop',
            assetName: 'Dell XPS 15',
            requestedAmount: 250000,
            assetValue: 400000,
            interestRate: 10,
            duration: 45,
            ltv: 62.5,
            createdAt: '2024-12-14',
            status: 'active',
        },
        {
            id: '3',
            borrower: '0x9876...4321',
            assetType: 'machinery',
            assetName: 'Industrial Sewing Machine',
            requestedAmount: 500000,
            assetValue: 800000,
            interestRate: 15,
            duration: 90,
            ltv: 62.5,
            createdAt: '2024-12-13',
            status: 'active',
        },
    ];

    const mockFundedLoans: FundedLoan[] = [
        {
            id: '4',
            borrower: '0x5555...6666',
            assetType: 'smartphone',
            assetName: 'iPhone 14 Pro 128GB',
            principal: 200000,
            totalRepayment: 206575,
            amountRepaid: 103287,
            interestRate: 10,
            duration: 30,
            startDate: '2024-12-01',
            dueDate: '2024-12-31',
            status: 'active',
        },
        {
            id: '5',
            borrower: '0x7777...8888',
            assetType: 'laptop',
            assetName: 'MacBook Pro M2',
            principal: 350000,
            totalRepayment: 360411,
            amountRepaid: 360411,
            interestRate: 10,
            duration: 30,
            startDate: '2024-11-15',
            dueDate: '2024-12-15',
            status: 'repaid',
        },
    ];

    const stats = {
        totalFunded: mockFundedLoans.reduce((sum, loan) => sum + loan.principal, 0),
        activeInvestments: mockFundedLoans.filter((l) => l.status === 'active').length,
        interestEarned: mockFundedLoans.reduce(
            (sum, loan) => sum + (loan.amountRepaid - loan.principal > 0 ? loan.amountRepaid - loan.principal : 0),
            0
        ),
        availableLoans: mockAvailableLoans.filter((l) => l.status === 'active').length,
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return 'info';
            case 'repaid':
                return 'success';
            case 'defaulted':
                return 'error';
            case 'funded':
                return 'success';
            case 'cancelled':
                return 'error';
            default:
                return 'default';
        }
    };

    const handleFundLoan = (loan: LoanRequest) => {
        setSelectedLoan(loan);
        setIsFundModalOpen(true);
    };

    // Watch for successful transactions
    useEffect(() => {
        if (isSuccess) {
            if (fundingStep === 'approve') {
                // Approval successful, move to funding
                setFundingStep('fund');
                toast.success('Stablecoin approved! Now funding loan...');
                setIsLoading(false);
            } else {
                // Funding successful!
                setIsLoading(false);
                setIsFundModalOpen(false);
                toast.success(`🔗 Successfully funded ${selectedLoan?.assetName} on blockchain!`);
                setSelectedLoan(null);
                setFundingStep('approve'); // Reset for next time
            }
        }
    }, [isSuccess, fundingStep, selectedLoan, toast]);

    const confirmFunding = async () => {
        if (!selectedLoan) return;

        setIsLoading(true);

        try {
            const stablecoin = getDefaultStablecoin(chainId);
            if (!stablecoin) {
                toast.error('No stablecoin configured for this network');
                setIsLoading(false);
                return;
            }

            const decimals = getStablecoinDecimals(chainId, stablecoin);
            const amount = parseUnits(selectedLoan.requestedAmount.toString(), decimals);

            if (fundingStep === 'approve') {
                // Step 1: Approve stablecoin spending
                await approveStablecoin(stablecoin, amount);
                // Success will trigger useEffect to move to fund step
            } else {
                // Step 2: Fund the loan
                await fundLoan(BigInt(selectedLoan.id));
                // Success will trigger useEffect to close modal
            }
        } catch (err: any) {
            console.error('Fund loan error:', err);
            toast.error(err.message || 'Transaction failed');
            setIsLoading(false);
        }
    };

    if (!isConnected) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <ToastContainer toasts={toasts} onRemove={removeToast} />
                <Card variant="glass" className="text-center py-16">
                    <Wallet className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <h2 className="text-2xl font-bold text-white mb-2">Connect Your Wallet</h2>
                    <p className="text-gray-400 mb-8">
                        Connect your wallet to start lending and earning interest
                    </p>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <ToastContainer toasts={toasts} onRemove={removeToast} />

            {/* Header */}
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-white mb-2">Lender Dashboard</h1>
                <p className="text-gray-400">Browse loan requests and manage your investments</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <Card variant="gradient">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm">Total Funded</CardTitle>
                            <DollarSign className="w-5 h-5 text-indigo-400" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold text-white">{formatCurrency(stats.totalFunded)}</p>
                    </CardContent>
                </Card>

                <Card variant="gradient">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm">Active Investments</CardTitle>
                            <Clock className="w-5 h-5 text-blue-400" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold text-white">{stats.activeInvestments}</p>
                    </CardContent>
                </Card>

                <Card variant="gradient">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm">Interest Earned</CardTitle>
                            <TrendingUp className="w-5 h-5 text-green-400" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold text-white">{formatCurrency(stats.interestEarned)}</p>
                    </CardContent>
                </Card>

                <Card variant="gradient">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm">Available Loans</CardTitle>
                            <AlertCircle className="w-5 h-5 text-amber-400" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold text-white">{stats.availableLoans}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Available Loan Requests */}
            <div className="space-y-4 mb-12">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-white">Available Loan Requests</h2>
                    <Button variant="outline" size="sm">
                        Filter
                    </Button>
                </div>

                {mockAvailableLoans.length === 0 ? (
                    <Card variant="glass" className="text-center py-16">
                        <AlertCircle className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                        <h3 className="text-xl font-bold text-white mb-2">No Loan Requests Available</h3>
                        <p className="text-gray-400">Check back later for new lending opportunities</p>
                    </Card>
                ) : (
                    <div className="grid gap-4">
                        {mockAvailableLoans.map((loan) => (
                            <Card key={loan.id} variant="glass" className="hover:border-indigo-500/50 transition-colors">
                                <CardContent className="p-6">
                                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                                        {/* Left: Loan Info */}
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-3 mb-3">
                                                <h3 className="text-xl font-bold text-white">{loan.assetName}</h3>
                                                <Badge variant={getStatusColor(loan.status)}>
                                                    <span className="capitalize">{loan.status}</span>
                                                </Badge>
                                            </div>

                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                                <div>
                                                    <p className="text-gray-500 mb-1">Requested Amount</p>
                                                    <p className="font-semibold text-white">{formatCurrency(loan.requestedAmount)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-500 mb-1">Interest Rate</p>
                                                    <p className="font-semibold text-green-400">{loan.interestRate}% APR</p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-500 mb-1">Duration</p>
                                                    <p className="font-semibold text-white">{loan.duration} days</p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-500 mb-1">LTV Ratio</p>
                                                    <p className="font-semibold text-indigo-400">{loan.ltv.toFixed(1)}%</p>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-400">
                                                <span className="inline-flex items-center gap-1.5">
                                                    <span className="text-gray-500">Asset Value:</span>
                                                    <span className="font-semibold text-white">{formatCurrency(loan.assetValue)}</span>
                                                </span>
                                                <span className="text-gray-600">•</span>
                                                <span className="inline-flex items-center gap-1.5">
                                                    <span className="text-gray-500">Borrower:</span>
                                                    <span className="font-mono font-semibold text-indigo-400">{loan.borrower}</span>
                                                </span>
                                                <span className="text-gray-600">•</span>
                                                <span className="inline-flex items-center gap-1.5">
                                                    <span className="text-gray-500">Listed:</span>
                                                    <span className="font-semibold text-white">{formatDate(loan.createdAt)}</span>
                                                </span>
                                            </div>
                                        </div>

                                        {/* Right: Actions */}
                                        <div className="flex flex-col gap-3 lg:items-end">
                                            <div className="text-right">
                                                <p className="text-sm text-gray-400 mb-1">Expected Return</p>
                                                <p className="text-2xl font-bold text-green-400">
                                                    {formatCurrency(
                                                        loan.requestedAmount * (1 + (loan.interestRate / 100) * (loan.duration / 365))
                                                    )}
                                                </p>
                                            </div>
                                            <div className="flex gap-2">
                                                <Link href={`/lend/request/${loan.id}`}>
                                                    <Button variant="outline" size="sm">
                                                        <Eye className="w-4 h-4 mr-1" />
                                                        View Details
                                                    </Button>
                                                </Link>
                                                <Button size="sm" onClick={() => handleFundLoan(loan)}>
                                                    Fund Loan
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Funded Loans */}
            <div className="space-y-4">
                <h2 className="text-2xl font-bold text-white">My Funded Loans</h2>

                {mockFundedLoans.length === 0 ? (
                    <Card variant="glass" className="text-center py-16">
                        <TrendingUp className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                        <h3 className="text-xl font-bold text-white mb-2">No Funded Loans Yet</h3>
                        <p className="text-gray-400">Fund a loan to start earning interest</p>
                    </Card>
                ) : (
                    <div className="grid gap-4">
                        {mockFundedLoans.map((loan) => (
                            <Card key={loan.id} variant="glass" className="hover:border-indigo-500/50 transition-colors">
                                <CardContent className="p-6">
                                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                                        {/* Left: Loan Info */}
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-3 mb-2">
                                                <h3 className="text-xl font-bold text-white">{loan.assetName}</h3>
                                                <Badge variant={getStatusColor(loan.status)}>
                                                    <span className="capitalize">{loan.status}</span>
                                                </Badge>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400">
                                                <span className="inline-flex items-center gap-1.5">
                                                    <span className="text-gray-500">Principal:</span>
                                                    <span className="font-semibold text-white">{formatCurrency(loan.principal)}</span>
                                                </span>
                                                <span className="text-gray-600">•</span>
                                                <span className="inline-flex items-center gap-1.5">
                                                    <span className="text-gray-500">Rate:</span>
                                                    <span className="font-semibold text-green-400">{loan.interestRate}% APR</span>
                                                </span>
                                                <span className="text-gray-600">•</span>
                                                <span className="inline-flex items-center gap-1.5">
                                                    <span className="text-gray-500">Borrower:</span>
                                                    <span className="font-mono font-semibold text-indigo-400">{loan.borrower}</span>
                                                </span>
                                                <span className="text-gray-600">•</span>
                                                <span className="inline-flex items-center gap-1.5">
                                                    <span className="text-gray-500">Due:</span>
                                                    <span className="font-semibold text-white">{formatDate(loan.dueDate)}</span>
                                                </span>
                                            </div>
                                        </div>

                                        {/* Right: Progress & Actions */}
                                        <div className="flex flex-col items-end space-y-3">
                                            {loan.status === 'active' && (
                                                <>
                                                    <div className="text-right">
                                                        <p className="text-sm text-gray-400">Repayment Progress</p>
                                                        <p className="text-lg font-bold text-white">
                                                            {formatCurrency(loan.amountRepaid)} / {formatCurrency(loan.totalRepayment)}
                                                        </p>
                                                    </div>
                                                    <div className="w-48 h-2 bg-slate-800 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
                                                            style={{ width: `${(loan.amountRepaid / loan.totalRepayment) * 100}%` }}
                                                        />
                                                    </div>
                                                </>
                                            )}
                                            {loan.status === 'repaid' && (
                                                <div className="text-right">
                                                    <p className="text-sm text-gray-400">Total Received</p>
                                                    <p className="text-lg font-bold text-green-400">
                                                        {formatCurrency(loan.totalRepayment)}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        Profit: {formatCurrency(loan.totalRepayment - loan.principal)}
                                                    </p>
                                                </div>
                                            )}
                                            <Link href={`/lend/loan/${loan.id}`}>
                                                <Button size="sm" variant="outline">
                                                    View Details
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Fund Loan Modal */}
            <Modal
                isOpen={isFundModalOpen}
                onClose={() => setIsFundModalOpen(false)}
                title="Fund Loan"
                description="Review loan details and confirm funding"
                size="md"
            >
                {selectedLoan && (
                    <div className="space-y-6">
                        <div className="bg-slate-900/50 rounded-xl p-4 space-y-3">
                            <div className="flex justify-between">
                                <span className="text-gray-400">Asset:</span>
                                <span className="font-semibold text-white">{selectedLoan.assetName}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Loan Amount:</span>
                                <span className="font-semibold text-white">{formatCurrency(selectedLoan.requestedAmount)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Interest Rate:</span>
                                <span className="font-semibold text-green-400">{selectedLoan.interestRate}% APR</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Duration:</span>
                                <span className="font-semibold text-white">{selectedLoan.duration} days</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Expected Return:</span>
                                <span className="font-semibold text-green-400">
                                    {formatCurrency(
                                        selectedLoan.requestedAmount *
                                            (1 + (selectedLoan.interestRate / 100) * (selectedLoan.duration / 365))
                                    )}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Expected Profit:</span>
                                <span className="font-semibold text-green-400">
                                    {formatCurrency(
                                        selectedLoan.requestedAmount *
                                            ((selectedLoan.interestRate / 100) * (selectedLoan.duration / 365))
                                    )}
                                </span>
                            </div>
                        </div>

                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                            <div className="flex gap-2">
                                <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                                <div className="text-sm text-amber-200">
                                    <p className="font-semibold mb-1">Important Notice</p>
                                    <p>
                                        Make sure you have reviewed the asset details and borrower information before funding
                                        this loan. Funds will be transferred immediately upon confirmation.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <ModalFooter>
                            <Button variant="outline" onClick={() => setIsFundModalOpen(false)} disabled={isLoading}>
                                Cancel
                            </Button>
                            <LoadingButton isLoading={isLoading || isPending || isConfirming} onClick={confirmFunding}>
                                {isPending
                                    ? 'Signing...'
                                    : isConfirming
                                    ? 'Confirming...'
                                    : isLoading
                                    ? 'Processing...'
                                    : fundingStep === 'approve'
                                    ? `Approve USDT`
                                    : `Fund ${formatCurrency(selectedLoan.requestedAmount)}`}
                            </LoadingButton>
                        </ModalFooter>
                    </div>
                )}
            </Modal>
        </div>
    );
}
