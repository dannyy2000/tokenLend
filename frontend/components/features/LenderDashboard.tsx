'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { useToast, ToastContainer } from '@/components/ui/Toast';
import { LoadingButton } from '@/components/ui/Spinner';
import { LenderBadge } from '@/components/ui/VerificationBadge';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import { TrendingUp, Wallet, DollarSign, AlertCircle, CheckCircle2, Clock, Eye, Info, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useAccount, useChainId, usePublicClient } from 'wagmi';
import { useFundLoan } from '@/lib/hooks';
import { getDefaultStablecoin, getStablecoinDecimals, getContractAddresses, LoanManagerABI } from '@/lib/contracts';
import { parseUnits } from 'viem';
import * as loanAPI from '@/lib/api/loans';
import { getLenderProfile } from '@/lib/api/verification';

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
    const publicClient = usePublicClient();
    const addresses = getContractAddresses(chainId);
    const { toast, toasts, removeToast } = useToast();
    const [selectedLoan, setSelectedLoan] = useState<LoanRequest | null>(null);
    const [isFundModalOpen, setIsFundModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [fundingStep, setFundingStep] = useState<'approve' | 'fund'>('approve');
    const lastProcessedHash = useRef<string | null>(null);
    const [availableLoans, setAvailableLoans] = useState<LoanRequest[]>([]);
    const [fundedLoans, setFundedLoans] = useState<FundedLoan[]>([]);
    const [isLoadingAvailable, setIsLoadingAvailable] = useState(true);
    const [isLoadingFunded, setIsLoadingFunded] = useState(true);

    // Lender profile state (optional)
    const [lenderProfile, setLenderProfile] = useState<{
        riskAcknowledged: boolean;
        hasProfile: boolean;
    }>({
        riskAcknowledged: false,
        hasProfile: false
    });
    const [showWelcomeBanner, setShowWelcomeBanner] = useState(false);

    // Real blockchain hooks
    const {
        approveStablecoin,
        fundLoan,
        isPending,
        isConfirming,
        isSuccess,
        hash,
        error,
    } = useFundLoan();

    // Fetch available loans from blockchain
    const fetchAvailableLoans = async () => {
        if (!addresses?.loanManager) return;

        try {
            setIsLoadingAvailable(true);
            console.log('📡 Fetching available loans from blockchain...');

            const { readContract } = await import('wagmi/actions');
            const { config } = await import('@/lib/web3/config');
            const { formatUnits } = await import('viem');

            // Try fetching loan IDs 0-99 (reasonable range for hackathon)
            // Filter out any that don't exist
            const MAX_LOANS = 100;
            const loanPromises = [];

            for (let i = 0; i < MAX_LOANS; i++) {
                loanPromises.push(
                    readContract(config, {
                        address: addresses.loanManager,
                        abi: LoanManagerABI.abi,
                        functionName: 'getLoan',
                        args: [BigInt(i)],
                    }).catch(() => null) // Return null if loan doesn't exist
                );
            }

            const allLoansRaw = await Promise.all(loanPromises);
            // Filter out null values and empty loans (borrower = zero address means loan doesn't exist)
            const allLoans = allLoansRaw.filter((loan: any) =>
                loan !== null && loan.borrower !== '0x0000000000000000000000000000000000000000'
            );

            console.log(`📊 Found ${allLoans.length} total loans in system`);

            // Filter for active loans (lender is zero address) and exclude current user's loans
            const activeLoans = allLoans
                .filter((loan: any) => {
                    const isActive = loan.lender === '0x0000000000000000000000000000000000000000';
                    const isNotMyLoan = !address || loan.borrower.toLowerCase() !== address.toLowerCase();
                    return isActive && isNotMyLoan;
                })
                .map((loan: any) => {
                    // Calculate LTV estimate
                    const principalNum = Number(formatUnits(loan.principal, 6));
                    const estimatedAssetValue = principalNum * 2; // Rough estimate based on typical LTV
                    const ltv = (principalNum / estimatedAssetValue) * 100;

                    return {
                        id: loan.loanId.toString(),
                        borrower: `${loan.borrower.slice(0, 6)}...${loan.borrower.slice(-4)}`,
                        assetType: 'asset',
                        assetName: `Asset #${loan.assetTokenId.toString()}`,
                        assetValue: estimatedAssetValue,
                        requestedAmount: principalNum,
                        interestRate: Number(loan.interestRate) / 100,
                        duration: Number(loan.duration) / (24 * 60 * 60),
                        ltv,
                        createdAt: new Date().toISOString().split('T')[0], // We don't have creation time on-chain
                        status: 'active' as const,
                    };
                });

            console.log(`✅ Found ${activeLoans.length} available loans`);
            setAvailableLoans(activeLoans);
        } catch (err) {
            console.error('❌ Failed to fetch available loans:', err);
            setAvailableLoans([]);
        } finally {
            setIsLoadingAvailable(false);
        }
    };

    // Fetch funded loans from blockchain
    const fetchFundedLoans = async () => {
        if (!address || !addresses?.loanManager) return;

        try {
            setIsLoadingFunded(true);
            console.log('📡 Fetching funded loans from blockchain...');

            const { readContract } = await import('wagmi/actions');
            const { config } = await import('@/lib/web3/config');
            const { formatUnits } = await import('viem');

            // Try fetching loan IDs 0-99 (reasonable range for hackathon)
            const MAX_LOANS = 100;
            const loanPromises = [];

            for (let i = 0; i < MAX_LOANS; i++) {
                loanPromises.push(
                    readContract(config, {
                        address: addresses.loanManager,
                        abi: LoanManagerABI.abi,
                        functionName: 'getLoan',
                        args: [BigInt(i)],
                    }).catch(() => null) // Return null if loan doesn't exist
                );
            }

            const allLoansRaw = await Promise.all(loanPromises);
            // Filter out null values and empty loans (borrower = zero address means loan doesn't exist)
            const allLoans = allLoansRaw.filter((loan: any) =>
                loan !== null && loan.borrower !== '0x0000000000000000000000000000000000000000'
            );

            // Filter for loans where current user is the lender
            const myFundedLoans = allLoans
                .filter((loan: any) => {
                    return loan.lender.toLowerCase() === address.toLowerCase();
                })
                .map((loan: any) => {
                    const startDate = loan.startTime > 0n
                        ? new Date(Number(loan.startTime) * 1000)
                        : null;
                    const dueDate = startDate && loan.duration
                        ? new Date(startDate.getTime() + Number(loan.duration) * 1000)
                        : null;

                    const principal = Number(formatUnits(loan.principal, 6));
                    const totalRepayment = Number(formatUnits(loan.totalRepayment, 6));
                    const amountRepaid = Number(formatUnits(loan.amountRepaid, 6));

                    // Determine status based on repayment
                    let status: 'active' | 'repaid' | 'defaulted' = 'active';
                    if (amountRepaid >= totalRepayment && totalRepayment > 0) {
                        status = 'repaid';
                    }
                    // TODO: Check if loan is defaulted based on due date

                    return {
                        id: loan.loanId.toString(),
                        borrower: `${loan.borrower.slice(0, 6)}...${loan.borrower.slice(-4)}`,
                        assetType: 'asset',
                        assetName: `Asset #${loan.assetTokenId.toString()}`,
                        principal,
                        totalRepayment,
                        amountRepaid,
                        interestRate: Number(loan.interestRate) / 100,
                        duration: Number(loan.duration) / (24 * 60 * 60),
                        startDate: startDate ? startDate.toISOString().split('T')[0] : '',
                        dueDate: dueDate ? dueDate.toISOString().split('T')[0] : '',
                        status,
                    };
                });

            console.log(`✅ Found ${myFundedLoans.length} funded loans`);
            setFundedLoans(myFundedLoans);
        } catch (err) {
            console.error('❌ Failed to fetch funded loans:', err);
            setFundedLoans([]);
        } finally {
            setIsLoadingFunded(false);
        }
    };

    // Check lender profile (optional, for showing badges)
    const checkLenderProfile = async () => {
        if (!address) return;

        try {
            const result = await getLenderProfile(address);

            if (result.success && result.data) {
                const hasProfile = !!result.data.lenderProfile;
                const riskAcknowledged = result.data.lenderProfile?.riskAcknowledged || false;

                setLenderProfile({
                    riskAcknowledged,
                    hasProfile
                });

                // Show welcome banner if they haven't completed onboarding
                setShowWelcomeBanner(!hasProfile);
            } else {
                // No profile yet - show welcome banner
                setShowWelcomeBanner(true);
            }
        } catch (err) {
            console.error('Failed to check lender profile:', err);
            // Show welcome banner on error (assume new user)
            setShowWelcomeBanner(true);
        }
    };

    // Fetch loans on mount and when address changes
    useEffect(() => {
        fetchAvailableLoans();
    }, []);

    useEffect(() => {
        if (address) {
            fetchFundedLoans();
            checkLenderProfile();
        }
    }, [address]);

    const stats = {
        totalFunded: fundedLoans.reduce((sum, loan) => sum + loan.principal, 0),
        activeInvestments: fundedLoans.filter((l) => l.status === 'active').length,
        interestEarned: fundedLoans.reduce(
            (sum, loan) => sum + (loan.amountRepaid - loan.principal > 0 ? loan.amountRepaid - loan.principal : 0),
            0
        ),
        availableLoans: availableLoans.filter((l) => l.status === 'active').length,
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

    // Watch for successful transactions (only process each hash once)
    useEffect(() => {
        if (isSuccess && hash && hash !== lastProcessedHash.current) {
            lastProcessedHash.current = hash;

            if (fundingStep === 'approve') {
                // Approval successful, move to funding
                console.log('✅ Approval successful, moving to fund step');
                setFundingStep('fund');
                setIsLoading(false);
            } else if (fundingStep === 'fund') {
                // Funding successful!
                const loanName = selectedLoan?.assetName || 'loan';
                console.log('✅ Funding successful for:', loanName);
                setIsLoading(false);
                setIsFundModalOpen(false);

                // Show success message once
                toast.success(`🔗 Successfully funded ${loanName} on blockchain!`);

                // Sync funding to backend
                const syncFunding = async () => {
                    if (!selectedLoan || !address) return;

                    try {
                        await loanAPI.fundLoan(Number(selectedLoan.id), {
                            lender: address,
                            txHash: hash,
                        });
                        console.log('✅ Funding synced to backend');
                    } catch (err) {
                        console.error('⚠️ Failed to sync funding to backend:', err);
                        // Don't fail the UI if backend sync fails
                    }
                };

                syncFunding();

                // Refetch loan data after a delay to allow blockchain to update
                setTimeout(() => {
                    console.log('🔄 Refetching loans after funding...');
                    fetchAvailableLoans();
                    fetchFundedLoans();
                }, 3000);

                // Reset state
                setSelectedLoan(null);
                setFundingStep('approve');
            }
        }
    }, [isSuccess, hash, fundingStep, selectedLoan, toast, address]);

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

            {/* Welcome Banner for New Lenders */}
            {showWelcomeBanner && (
                <Card variant="glass" className="mb-6 border-indigo-500/30 bg-gradient-to-br from-indigo-500/10 to-purple-500/10">
                    <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                            <div className="flex-shrink-0">
                                <Info className="w-8 h-8 text-indigo-400" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-white mb-2">
                                    Welcome to TokenLend!
                                </h3>
                                <p className="text-white/70 mb-4">
                                    Start funding SME loans backed by real-world assets. Complete lender onboarding to learn about risks and become an accredited lender.
                                </p>
                                <div className="flex flex-wrap items-center gap-3">
                                    <Link href="/onboarding/lender">
                                        <Button size="sm" variant="outline">
                                            <ShieldCheck className="w-4 h-4 mr-2" />
                                            Complete Onboarding (Optional)
                                        </Button>
                                    </Link>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => setShowWelcomeBanner(false)}
                                    >
                                        Dismiss
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-4xl font-bold text-white">Lender Dashboard</h1>
                    <LenderBadge riskAcknowledged={lenderProfile.riskAcknowledged} />
                </div>
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
                    <Button variant="outline" size="sm" onClick={() => fetchAvailableLoans()}>
                        Refresh
                    </Button>
                </div>

                {isLoadingAvailable ? (
                    <Card variant="glass" className="text-center py-16">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mb-4"></div>
                        <p className="text-gray-400">Loading available loans...</p>
                    </Card>
                ) : availableLoans.length === 0 ? (
                    <Card variant="glass" className="text-center py-16">
                        <AlertCircle className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                        <h3 className="text-xl font-bold text-white mb-2">No Loan Requests Available</h3>
                        <p className="text-gray-400">Check back later for new lending opportunities</p>
                    </Card>
                ) : (
                    <div className="grid gap-4">
                        {availableLoans.map((loan) => (
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

                {isLoadingFunded ? (
                    <Card variant="glass" className="text-center py-16">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mb-4"></div>
                        <p className="text-gray-400">Loading funded loans...</p>
                    </Card>
                ) : fundedLoans.length === 0 ? (
                    <Card variant="glass" className="text-center py-16">
                        <TrendingUp className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                        <h3 className="text-xl font-bold text-white mb-2">No Funded Loans Yet</h3>
                        <p className="text-gray-400">Fund a loan to start earning interest</p>
                    </Card>
                ) : (
                    <div className="grid gap-4">
                        {fundedLoans.map((loan) => (
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
                                    <p className="font-semibold mb-1">Funding Process</p>
                                    <p className="mb-2">
                                        <strong>Step 1:</strong> Approve mUSDT (Mock USDT for testing)<br />
                                        <strong>Step 2:</strong> Fund the loan
                                    </p>
                                    <p className="text-xs text-amber-300">
                                        Note: mUSDT is a test token. In production, this would be real USDT.
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
                                    ? `Approve mUSDT (Step 1/2)`
                                    : `Fund ${formatCurrency(selectedLoan.requestedAmount)} (Step 2/2)`}
                            </LoadingButton>
                        </ModalFooter>
                    </div>
                )}
            </Modal>
        </div>
    );
}
