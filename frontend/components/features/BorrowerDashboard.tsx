'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import { TrendingUp, Wallet, Clock, Plus, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useAccount } from 'wagmi';

interface Loan {
    id: string;
    assetType: string;
    assetName: string;
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

    // Mock data - in production, fetch from smart contracts
    const mockLoans: Loan[] = [
        {
            id: '1',
            assetType: 'smartphone',
            assetName: 'iPhone 14 128GB',
            principal: 200000,
            totalRepayment: 206575,
            amountRepaid: 103287,
            interestRate: 10,
            duration: 30,
            startDate: '2024-12-01',
            dueDate: '2024-12-31',
            status: 'funded',
            lender: '0x742d...4e89',
        },
        {
            id: '2',
            assetType: 'laptop',
            assetName: 'MacBook Pro M1',
            principal: 150000,
            totalRepayment: 154110,
            amountRepaid: 0,
            interestRate: 10,
            duration: 30,
            startDate: '',
            dueDate: '',
            status: 'active',
        },
    ];

    const stats = {
        totalBorrowed: mockLoans.reduce((sum, loan) => sum + loan.principal, 0),
        totalRepaid: mockLoans.reduce((sum, loan) => sum + loan.amountRepaid, 0),
        activeLoans: mockLoans.filter((l) => l.status === 'funded').length,
        pendingLoans: mockLoans.filter((l) => l.status === 'active').length,
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

    if (!isConnected) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-4xl font-bold text-white mb-2">My Loans</h1>
                    <p className="text-gray-400">Manage your active loans and borrowing history</p>
                </div>
                <Link href="/borrow/upload">
                    <Button size="lg">
                        <Plus className="w-5 h-5 mr-2" />
                        New Loan
                    </Button>
                </Link>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
                <h2 className="text-2xl font-bold text-white">Your Loans</h2>
                {mockLoans.length === 0 ? (
                    <Card variant="glass" className="text-center py-16">
                        <TrendingUp className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                        <h3 className="text-xl font-bold text-white mb-2">No Loans Yet</h3>
                        <p className="text-gray-400 mb-8">
                            Upload an asset to get started with your first loan
                        </p>
                        <Link href="/borrow/upload">
                            <Button size="lg">Upload Asset</Button>
                        </Link>
                    </Card>
                ) : (
                    mockLoans.map((loan) => (
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
                                                    <Button size="sm">Make Payment</Button>
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
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
