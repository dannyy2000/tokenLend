'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { LoadingButton } from '@/components/ui/Spinner';
import { useToast, ToastContainer } from '@/components/ui/Toast';
import { VerificationBadge } from '@/components/ui/VerificationBadge';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import { TrendingUp, Wallet, Clock, Plus, AlertCircle, CheckCircle2, XCircle, ShieldAlert, ShieldCheck, Filter, X, SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';
import { useAccount, useChainId, usePublicClient } from 'wagmi';
import { useRepayLoan, useGetUserLoans, useGetAsset, useGetUSDTBalance } from '@/lib/hooks';
import { getDefaultStablecoin, getStablecoinDecimals, getContractAddresses, LoanManagerABI, AssetTokenABI } from '@/lib/contracts';
import { parseUnits, formatUnits } from 'viem';
import * as loanAPI from '@/lib/api/loans';
import { checkCanCreateLoan } from '@/lib/api/verification';

interface Loan {
    id: string;
    assetType: string;
    assetName: string;
    assetValue: number;
    ltv: number;
    principal: number;
    totalRepayment: number;
    amountRepaid: number;
    interestRate: number;
    duration: number;
    startDate: string;
    dueDate: string;
    status: 'active' | 'funded' | 'repaid' | 'defaulted';
    lender?: string;
}

export function BorrowerDashboard() {
    const { address, isConnected } = useAccount();
    const chainId = useChainId();
    const publicClient = usePublicClient();
    const addresses = getContractAddresses(chainId);
    const { toast, toasts, removeToast } = useToast();
    const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
    const [isRepayModalOpen, setIsRepayModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [repaymentStep, setRepaymentStep] = useState<'approve' | 'repay'>('approve');
    const lastProcessedHash = useRef<string | null>(null);
    const [loans, setLoans] = useState<Loan[]>([]);
    const [isLoadingLoans, setIsLoadingLoans] = useState(true);

    // Filter and sort state
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        status: 'all',
        assetType: 'all',
        minAmount: '',
        maxAmount: '',
    });
    const [sortBy, setSortBy] = useState<'date-new' | 'date-old' | 'amount-high' | 'amount-low' | 'status'>('date-new');

    // Verification state
    const [verificationStatus, setVerificationStatus] = useState<{
        canCreate: boolean;
        reason?: string;
        requiresAction?: string;
        verificationStatus?: string;
        hasBusinessProfile?: boolean;
    }>({
        canCreate: false
    });
    const [isCheckingVerification, setIsCheckingVerification] = useState(true);

    // Real blockchain hooks
    const {
        approveRepayment,
        makeRepayment,
        isPending,
        isConfirming,
        isSuccess,
        hash,
        error,
    } = useRepayLoan();

    // Get USDT balance
    const { balance: usdtBalance, isLoading: isLoadingBalance } = useGetUSDTBalance();

    // Check verification status
    const checkVerification = async () => {
        if (!address) return;

        try {
            setIsCheckingVerification(true);
            const result = await checkCanCreateLoan(address);

            if (result.success) {
                setVerificationStatus({
                    canCreate: result.canCreate || false,
                    reason: result.reason,
                    requiresAction: result.requiresAction,
                    verificationStatus: result.verificationStatus,
                    hasBusinessProfile: result.hasBusinessProfile
                });
            }
        } catch (err) {
            console.error('Failed to check verification:', err);
        } finally {
            setIsCheckingVerification(false);
        }
    };

    // Fetch loans from blockchain (source of truth)
    const fetchLoans = async () => {
        if (!address || !addresses?.loanManager) return;

        try {
            setIsLoadingLoans(true);

            // Always fetch from blockchain as source of truth
            console.log('📡 Fetching loans from blockchain...');
            const { readContract } = await import('wagmi/actions');
            const { config } = await import('@/lib/web3/config');

            // Get borrower's loan IDs
            const borrowerLoanIds = await readContract(config, {
                address: addresses.loanManager,
                abi: LoanManagerABI.abi,
                functionName: 'getBorrowerLoans',
                args: [address],
            }) as bigint[];

            console.log('📋 Found loan IDs:', borrowerLoanIds.map(id => id.toString()));

            if (borrowerLoanIds.length === 0) {
                console.log('ℹ️ No loans found on blockchain');
                setLoans([]);
                return;
            }

            // Fetch each loan's details
            const loanPromises = borrowerLoanIds.map(async (loanId) => {
                const loanData = await readContract(config, {
                    address: addresses.loanManager,
                    abi: LoanManagerABI.abi,
                    functionName: 'getLoan',
                    args: [loanId],
                }) as any;

                const startDate = loanData.startTime > 0n
                    ? new Date(Number(loanData.startTime) * 1000)
                    : null;
                const dueDate = startDate && loanData.duration
                    ? new Date(startDate.getTime() + Number(loanData.duration) * 1000)
                    : null;

                const principal = Number(formatUnits(loanData.principal || 0n, 6));
                const totalRepayment = Number(formatUnits(loanData.totalRepayment || 0n, 6));
                const amountRepaid = Number(formatUnits(loanData.amountRepaid || 0n, 6));
                const hasLender = loanData.lender !== '0x0000000000000000000000000000000000000000';

                // Determine status based on repayment
                let status: 'active' | 'funded' | 'repaid' | 'defaulted' = 'active';
                if (amountRepaid >= totalRepayment && totalRepayment > 0) {
                    status = 'repaid';
                } else if (hasLender) {
                    status = 'funded';
                }

                // Fetch asset data for proper type and LTV
                let assetType = 'asset';
                let assetName = `Asset #${loanData.assetTokenId.toString()}`;
                let assetValue = principal * 2; // Fallback estimate
                let ltv = 50; // Fallback estimate

                try {
                    const assetData = await readContract(config, {
                        address: addresses.assetToken,
                        abi: AssetTokenABI.abi,
                        functionName: 'getAsset',
                        args: [loanData.assetTokenId],
                    }) as any;

                    assetType = assetData.assetType || 'asset';
                    assetName = `${assetData.assetType || 'Asset'} #${loanData.assetTokenId.toString()}`;
                    assetValue = Number(formatUnits(assetData.aiValuation, 18));
                    ltv = assetValue > 0 ? (principal / assetValue) * 100 : 0;
                } catch (err) {
                    console.error(`Failed to fetch asset data for loan ${loanId}:`, err);
                }

                return {
                    id: loanId.toString(),
                    assetType,
                    assetName,
                    assetValue,
                    ltv,
                    principal,
                    totalRepayment,
                    amountRepaid,
                    interestRate: Number(loanData.interestRate || 0n) / 100,
                    duration: Number(loanData.duration || 0n) / (24 * 60 * 60),
                    startDate: startDate ? startDate.toISOString().split('T')[0] : '',
                    dueDate: dueDate ? dueDate.toISOString().split('T')[0] : '',
                    status,
                    lender: hasLender
                        ? `${loanData.lender.slice(0, 6)}...${loanData.lender.slice(-4)}`
                        : undefined,
                };
            });

            const fetchedLoans = await Promise.all(loanPromises);
            console.log('✅ Fetched loans from blockchain:', fetchedLoans);
            setLoans(fetchedLoans);
        } catch (err) {
            console.error('❌ Failed to fetch loans:', err);
            setLoans([]);
        } finally {
            setIsLoadingLoans(false);
        }
    };

    // Check verification and fetch loans on mount and when address changes
    useEffect(() => {
        checkVerification();
        fetchLoans();
    }, [address]);

    // Filter and sort loans (active + pending only)
    const filteredAndSortedLoans = (() => {
        // Only show active and funded loans in the main view
        let filtered = loans.filter(loan => loan.status === 'active' || loan.status === 'funded');

        // Apply filters
        if (filters.status !== 'all') {
            filtered = filtered.filter(loan => loan.status === filters.status);
        }

        if (filters.assetType !== 'all') {
            filtered = filtered.filter(loan => loan.assetType.toLowerCase() === filters.assetType.toLowerCase());
        }

        if (filters.minAmount) {
            filtered = filtered.filter(loan => loan.principal >= Number(filters.minAmount));
        }

        if (filters.maxAmount) {
            filtered = filtered.filter(loan => loan.principal <= Number(filters.maxAmount));
        }

        // Apply sorting
        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'date-new':
                    return new Date(b.startDate || '').getTime() - new Date(a.startDate || '').getTime();
                case 'date-old':
                    return new Date(a.startDate || '').getTime() - new Date(b.startDate || '').getTime();
                case 'amount-high':
                    return b.principal - a.principal;
                case 'amount-low':
                    return a.principal - b.principal;
                case 'status':
                    const statusOrder = { active: 0, funded: 1, repaid: 2, defaulted: 3 };
                    return (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
                default:
                    return 0;
            }
        });

        return filtered;
    })();

    // Transaction history (completed loans - repaid or defaulted)
    const transactionHistory = loans
        .filter(loan => loan.status === 'repaid' || loan.status === 'defaulted')
        .sort((a, b) => new Date(b.startDate || '').getTime() - new Date(a.startDate || '').getTime());

    const clearFilters = () => {
        setFilters({
            status: 'all',
            assetType: 'all',
            minAmount: '',
            maxAmount: '',
        });
    };

    const hasActiveFilters = () => {
        return filters.status !== 'all' ||
               filters.assetType !== 'all' ||
               filters.minAmount || filters.maxAmount;
    };

    const stats = {
        totalBorrowed: loans.filter((l) => l.status === 'funded' || l.status === 'repaid').reduce((sum, loan) => sum + loan.principal, 0),
        totalRepaid: loans.reduce((sum, loan) => sum + loan.amountRepaid, 0),
        activeLoans: loans.filter((l) => l.status === 'funded').length,
        pendingLoans: loans.filter((l) => l.status === 'active').length,
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'funded':
                return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
            case 'active':
                return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
            case 'repaid':
                return 'text-green-400 bg-green-500/10 border-green-500/20';
            case 'defaulted':
                return 'text-red-400 bg-red-500/10 border-red-500/20';
            default:
                return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'funded':
                return <Clock className="w-4 h-4" />;
            case 'active':
                return <AlertCircle className="w-4 h-4" />;
            case 'repaid':
                return <CheckCircle2 className="w-4 h-4" />;
            case 'defaulted':
                return <XCircle className="w-4 h-4" />;
            default:
                return null;
        }
    };

    const handleRepayLoan = (loan: Loan) => {
        setSelectedLoan(loan);
        setIsRepayModalOpen(true);
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
                const loanName = selectedLoan?.assetName || 'loan';
                console.log('✅ Repayment successful for:', loanName);
                setIsLoading(false);
                setIsRepayModalOpen(false);

                toast.success(`🔗 Successfully repaid ${loanName} on blockchain!`);

                // Sync repayment to backend
                const syncRepayment = async () => {
                    if (!selectedLoan) return;

                    try {
                        const remainingAmount = selectedLoan.totalRepayment - selectedLoan.amountRepaid;
                        await loanAPI.repayLoan(Number(selectedLoan.id), {
                            amount: remainingAmount,
                            txHash: hash,
                        });
                        console.log('✅ Repayment synced to backend');
                    } catch (err) {
                        console.error('⚠️ Failed to sync repayment to backend:', err);
                        // Don't fail the UI if backend sync fails
                    }
                };

                syncRepayment();

                // Refetch loan data after a delay
                setTimeout(() => {
                    console.log('🔄 Refetching loans after repayment...');
                    fetchLoans();
                }, 3000);

                // Reset state
                setSelectedLoan(null);
                setRepaymentStep('approve');
            }
        }
    }, [isSuccess, hash, repaymentStep, selectedLoan, toast]);

    const confirmRepayment = async () => {
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
            // Calculate remaining amount to repay
            const remainingAmount = selectedLoan.totalRepayment - selectedLoan.amountRepaid;
            const amount = parseUnits(remainingAmount.toString(), decimals);

            if (repaymentStep === 'approve') {
                // Step 1: Approve stablecoin spending
                await approveRepayment(stablecoin, amount);
            } else {
                // Step 2: Make repayment
                await makeRepayment(BigInt(selectedLoan.id), amount);
            }
        } catch (err: any) {
            console.error('Repayment error:', err);
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
                        Connect your wallet to view your loans and borrowing activity
                    </p>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <ToastContainer toasts={toasts} onRemove={removeToast} />

            {/* Verification Banner */}
            {!isCheckingVerification && !verificationStatus.canCreate && (
                <Card variant="glass" className="mb-6 border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/10">
                    <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                            <div className="flex-shrink-0">
                                <ShieldAlert className="w-8 h-8 text-amber-400" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-white mb-2">
                                    Business Verification Required
                                </h3>
                                <p className="text-white/70 mb-4">
                                    {verificationStatus.reason || 'Please complete your business profile to request loans.'}
                                </p>
                                <div className="flex flex-wrap items-center gap-3">
                                    <Link href="/onboarding/borrower">
                                        <Button size="sm">
                                            <ShieldCheck className="w-4 h-4 mr-2" />
                                            Verify Business Profile
                                        </Button>
                                    </Link>
                                    {verificationStatus.verificationStatus && (
                                        <VerificationBadge
                                            status={verificationStatus.verificationStatus as any}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Success Banner for Verified Users */}
            {!isCheckingVerification && verificationStatus.canCreate && (
                <Card variant="glass" className="mb-6 border-green-500/30 bg-gradient-to-br from-green-500/10 to-emerald-500/10">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <ShieldCheck className="w-6 h-6 text-green-400" />
                            <div className="flex-1">
                                <p className="text-white font-medium">
                                    Your business is verified! You can now request loans.
                                </p>
                            </div>
                            <VerificationBadge status="verified" />
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-4xl font-bold text-white mb-2">My Loans</h1>
                    <p className="text-gray-400">Manage your active loans and borrowing history</p>
                </div>
                {verificationStatus.canCreate ? (
                    <Link href="/borrow/upload">
                        <Button size="lg">
                            <Plus className="w-5 h-5 mr-2" />
                            New Loan
                        </Button>
                    </Link>
                ) : (
                    <Button
                        size="lg"
                        disabled
                        title="Complete business verification to create loans"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        New Loan
                    </Button>
                )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
                <Card variant="gradient" className="border-emerald-500/20">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm">USDT Balance</CardTitle>
                            <Wallet className="w-5 h-5 text-emerald-400" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        {isLoadingBalance ? (
                            <div className="flex items-center gap-2">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-500"></div>
                                <p className="text-sm text-gray-400">Loading...</p>
                            </div>
                        ) : (
                            <p className="text-2xl font-bold text-white">{formatCurrency(usdtBalance)}</p>
                        )}
                    </CardContent>
                </Card>

                <Card variant="gradient">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm">Total Borrowed</CardTitle>
                            <TrendingUp className="w-5 h-5 text-indigo-400" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold text-white">{formatCurrency(stats.totalBorrowed)}</p>
                    </CardContent>
                </Card>

                <Card variant="gradient">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm">Total Repaid</CardTitle>
                            <CheckCircle2 className="w-5 h-5 text-green-400" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold text-white">{formatCurrency(stats.totalRepaid)}</p>
                    </CardContent>
                </Card>

                <Card variant="gradient">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm">Active Loans</CardTitle>
                            <Clock className="w-5 h-5 text-blue-400" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold text-white">{stats.activeLoans}</p>
                    </CardContent>
                </Card>

                <Card variant="gradient">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm">Pending</CardTitle>
                            <AlertCircle className="w-5 h-5 text-amber-400" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold text-white">{stats.pendingLoans}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Loans List */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-white">Your Loans</h2>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowFilters(!showFilters)}
                            className={hasActiveFilters() ? 'border-indigo-500/50 bg-indigo-500/10' : ''}
                        >
                            <SlidersHorizontal className="w-4 h-4 mr-2" />
                            Filters
                            {hasActiveFilters() && (
                                <span className="ml-2 px-1.5 py-0.5 text-xs bg-indigo-500 text-white rounded-full">
                                    •
                                </span>
                            )}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => fetchLoans()}>
                            Refresh
                        </Button>
                    </div>
                </div>

                {/* Filter Panel */}
                {showFilters && (
                    <Card variant="glass" className="border-indigo-500/30">
                        <CardContent className="p-6">
                            <div className="space-y-6">
                                {/* Filter Header */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Filter className="w-5 h-5 text-indigo-400" />
                                        <h3 className="text-lg font-semibold text-white">Filter & Sort Loans</h3>
                                    </div>
                                    {hasActiveFilters() && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={clearFilters}
                                            className="text-gray-400 hover:text-white"
                                        >
                                            <X className="w-4 h-4 mr-1" />
                                            Clear All
                                        </Button>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {/* Sort By */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">
                                            Sort By
                                        </label>
                                        <select
                                            value={sortBy}
                                            onChange={(e) => setSortBy(e.target.value as any)}
                                            className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        >
                                            <option value="date-new">Newest First</option>
                                            <option value="date-old">Oldest First</option>
                                            <option value="amount-high">Amount: High to Low</option>
                                            <option value="amount-low">Amount: Low to High</option>
                                            <option value="status">Status</option>
                                        </select>
                                    </div>

                                    {/* Status Filter */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">
                                            Status
                                        </label>
                                        <select
                                            value={filters.status}
                                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                            className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        >
                                            <option value="all">All Statuses</option>
                                            <option value="active">Pending Funding</option>
                                            <option value="funded">Active/Funded</option>
                                            <option value="repaid">Repaid</option>
                                            <option value="defaulted">Defaulted</option>
                                        </select>
                                    </div>

                                    {/* Asset Type */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">
                                            Asset Type
                                        </label>
                                        <select
                                            value={filters.assetType}
                                            onChange={(e) => setFilters({ ...filters, assetType: e.target.value })}
                                            className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        >
                                            <option value="all">All Asset Types</option>
                                            <option value="car">Car</option>
                                            <option value="phone">Phone</option>
                                            <option value="laptop">Laptop</option>
                                            <option value="machinery">Machinery</option>
                                            <option value="asset">Other Asset</option>
                                        </select>
                                    </div>

                                    {/* Loan Amount Range */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">
                                            Loan Amount (USDT)
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                placeholder="Min"
                                                value={filters.minAmount}
                                                onChange={(e) => setFilters({ ...filters, minAmount: e.target.value })}
                                                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            />
                                            <span className="text-gray-500">-</span>
                                            <input
                                                type="number"
                                                placeholder="Max"
                                                value={filters.maxAmount}
                                                onChange={(e) => setFilters({ ...filters, maxAmount: e.target.value })}
                                                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            />
                                        </div>
                                    </div>

                                    {/* Results Count */}
                                    <div className="flex items-end md:col-span-2 lg:col-span-1">
                                        <div className="w-full p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-lg">
                                            <p className="text-sm text-gray-400">Showing Results</p>
                                            <p className="text-2xl font-bold text-white">
                                                {filteredAndSortedLoans.length} / {loans.length}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {isLoadingLoans ? (
                    <Card variant="glass" className="text-center py-16">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-500 mx-auto mb-4"></div>
                        <h3 className="text-xl font-bold text-white mb-2">Loading Loans...</h3>
                    </Card>
                ) : loans.length === 0 ? (
                    <Card variant="glass" className="text-center py-16">
                        <TrendingUp className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                        <h3 className="text-xl font-bold text-white mb-2">No Loans Yet</h3>
                        <p className="text-gray-400 mb-8">
                            {verificationStatus.canCreate
                                ? 'Upload an asset to get started with your first loan'
                                : 'Complete business verification to start requesting loans'}
                        </p>
                        {verificationStatus.canCreate ? (
                            <Link href="/borrow/upload">
                                <Button size="lg">Upload Asset</Button>
                            </Link>
                        ) : (
                            <Link href="/onboarding/borrower">
                                <Button size="lg">
                                    <ShieldCheck className="w-5 h-5 mr-2" />
                                    Verify Business
                                </Button>
                            </Link>
                        )}
                    </Card>
                ) : filteredAndSortedLoans.length === 0 ? (
                    <Card variant="glass" className="text-center py-16">
                        <AlertCircle className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                        <h3 className="text-xl font-bold text-white mb-2">No Loans Match Your Filters</h3>
                        <p className="text-gray-400 mb-4">Try adjusting your filter criteria</p>
                        <Button variant="outline" size="sm" onClick={clearFilters}>
                            Clear Filters
                        </Button>
                    </Card>
                ) : (
                    filteredAndSortedLoans.map((loan) => (
                        <Card key={loan.id} variant="glass" className="hover:border-indigo-500/50 transition-colors">
                            <CardContent className="p-6">
                                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                    {/* Left: Asset Info */}
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-3 mb-2">
                                            <h3 className="text-xl font-bold text-white">{loan.assetName}</h3>
                                            <span
                                                className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                                                    loan.status
                                                )}`}
                                            >
                                                {getStatusIcon(loan.status)}
                                                <span className="capitalize">{loan.status}</span>
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400">
                                            <span className="inline-flex items-center gap-1.5">
                                                <span className="text-gray-500">Principal:</span>
                                                <span className="font-semibold text-white">{formatCurrency(loan.principal)}</span>
                                            </span>
                                            <span className="text-gray-600">•</span>
                                            <span className="inline-flex items-center gap-1.5">
                                                <span className="text-gray-500">Rate:</span>
                                                <span className="font-semibold text-white">{loan.interestRate}% APR</span>
                                            </span>
                                            <span className="text-gray-600">•</span>
                                            <span className="inline-flex items-center gap-1.5">
                                                <span className="text-gray-500">Duration:</span>
                                                <span className="font-semibold text-white">{loan.duration} days</span>
                                            </span>
                                            {loan.lender && (
                                                <>
                                                    <span className="text-gray-600">•</span>
                                                    <span className="inline-flex items-center gap-1.5">
                                                        <span className="text-gray-500">Lender:</span>
                                                        <span className="font-mono font-semibold text-indigo-400">{loan.lender}</span>
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right: Progress & Actions */}
                                    <div className="flex flex-col items-end space-y-3">
                                        {loan.status === 'funded' && (
                                            <>
                                                <div className="text-right">
                                                    <p className="text-sm text-gray-400">Repayment Progress</p>
                                                    <p className="text-lg font-bold text-white">
                                                        {formatCurrency(loan.amountRepaid)} / {formatCurrency(loan.totalRepayment)}
                                                    </p>
                                                </div>
                                                <div className="w-48 h-2 bg-slate-800 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                                                        style={{ width: `${(loan.amountRepaid / loan.totalRepayment) * 100}%` }}
                                                    />
                                                </div>
                                                <div className="flex gap-2">
                                                    <Link href={`/borrow/loan/${loan.id}`}>
                                                        <Button size="sm" variant="outline">
                                                            View Details
                                                        </Button>
                                                    </Link>
                                                    <Button size="sm" onClick={() => handleRepayLoan(loan)}>
                                                        Make Payment
                                                    </Button>
                                                </div>
                                            </>
                                        )}
                                        {loan.status === 'active' && (
                                            <div className="text-right">
                                                <p className="text-sm text-gray-400 mb-2">Waiting for lender</p>
                                                <Link href={`/borrow/loan/${loan.id}`}>
                                                    <Button size="sm" variant="outline">
                                                        View Details
                                                    </Button>
                                                </Link>
                                            </div>
                                        )}
                                        {loan.status === 'repaid' && (
                                            <div className="text-right">
                                                <p className="text-sm text-green-400 mb-2 font-semibold">✅ Fully Repaid</p>
                                                <p className="text-xs text-gray-400 mb-2">
                                                    Repaid: {formatCurrency(loan.amountRepaid)}
                                                </p>
                                                <Link href={`/borrow/loan/${loan.id}`}>
                                                    <Button size="sm" variant="outline">
                                                        View Details
                                                    </Button>
                                                </Link>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* Transaction History */}
            {transactionHistory.length > 0 && (
                <div className="space-y-4 mt-12">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-white">Transaction History</h2>
                            <p className="text-gray-400 text-sm mt-1">Completed and past loans</p>
                        </div>
                        <div className="text-sm text-gray-400">
                            {transactionHistory.length} {transactionHistory.length === 1 ? 'transaction' : 'transactions'}
                        </div>
                    </div>

                    <div className="space-y-3">
                        {transactionHistory.map((loan) => (
                            <Card key={loan.id} variant="glass" className="opacity-80 hover:opacity-100 transition-opacity">
                                <CardContent className="p-5">
                                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                        {/* Left: Asset Info */}
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-3 mb-2">
                                                <h3 className="text-lg font-semibold text-white">{loan.assetName}</h3>
                                                <span
                                                    className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                                                        loan.status
                                                    )}`}
                                                >
                                                    {getStatusIcon(loan.status)}
                                                    <span className="capitalize">{loan.status}</span>
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400">
                                                <span className="inline-flex items-center gap-1.5">
                                                    <span className="text-gray-500">Principal:</span>
                                                    <span className="font-semibold text-white">{formatCurrency(loan.principal)}</span>
                                                </span>
                                                <span className="text-gray-600">•</span>
                                                <span className="inline-flex items-center gap-1.5">
                                                    <span className="text-gray-500">Total Repaid:</span>
                                                    <span className="font-semibold text-white">{formatCurrency(loan.amountRepaid)}</span>
                                                </span>
                                                <span className="text-gray-600">•</span>
                                                <span className="inline-flex items-center gap-1.5">
                                                    <span className="text-gray-500">Rate:</span>
                                                    <span className="font-semibold text-white">{loan.interestRate}% APR</span>
                                                </span>
                                                <span className="text-gray-600">•</span>
                                                <span className="inline-flex items-center gap-1.5">
                                                    <span className="text-gray-500">Duration:</span>
                                                    <span className="font-semibold text-white">{loan.duration} days</span>
                                                </span>
                                            </div>
                                        </div>

                                        {/* Right: Summary */}
                                        <div className="flex flex-col items-end space-y-2">
                                            {loan.status === 'repaid' && (
                                                <div className="text-right">
                                                    <p className="text-xs text-gray-500 mb-1">Loan Completed</p>
                                                    <p className="text-sm font-semibold text-green-400">
                                                        ✓ Fully Repaid
                                                    </p>
                                                    <p className="text-xs text-gray-400 mt-1">
                                                        Due: {formatDate(loan.dueDate)}
                                                    </p>
                                                </div>
                                            )}
                                            {loan.status === 'defaulted' && (
                                                <div className="text-right">
                                                    <p className="text-xs text-gray-500 mb-1">Loan Status</p>
                                                    <p className="text-sm font-semibold text-red-400">
                                                        ⚠ Defaulted
                                                    </p>
                                                    <p className="text-xs text-gray-400 mt-1">
                                                        Due: {formatDate(loan.dueDate)}
                                                    </p>
                                                </div>
                                            )}
                                            <Link href={`/borrow/loan/${loan.id}`}>
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
                </div>
            )}

            {/* Repayment Modal */}
            <Modal
                isOpen={isRepayModalOpen}
                onClose={() => setIsRepayModalOpen(false)}
                title="Repay Loan"
                description="Review repayment details and confirm"
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
                                <span className="text-gray-400">Principal:</span>
                                <span className="font-semibold text-white">{formatCurrency(selectedLoan.principal)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Total Repayment:</span>
                                <span className="font-semibold text-white">{formatCurrency(selectedLoan.totalRepayment)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Already Paid:</span>
                                <span className="font-semibold text-green-400">{formatCurrency(selectedLoan.amountRepaid)}</span>
                            </div>
                            <div className="border-t border-gray-700 pt-3">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Remaining Amount:</span>
                                    <span className="font-semibold text-indigo-400">
                                        {formatCurrency(selectedLoan.totalRepayment - selectedLoan.amountRepaid)}
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
                                    : `Repay ${formatCurrency(selectedLoan.totalRepayment - selectedLoan.amountRepaid)} (Step 2/2)`}
                            </LoadingButton>
                        </ModalFooter>
                    </div>
                )}
            </Modal>
        </div>
    );
}
