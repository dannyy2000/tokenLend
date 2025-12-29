'use client';

import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Button } from '../ui/Button';
import { VerificationBadge, LenderBadge } from '../ui/VerificationBadge';
import { Wallet, Menu, X, ChevronDown } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { getVerificationStatus } from '@/lib/api/verification';

export function Navbar() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const { address, isConnected } = useAccount();
    const [verificationData, setVerificationData] = useState<{
        role?: string;
        verificationStatus?: string;
        canCreateLoan?: boolean;
        canFundLoan?: boolean;
        riskAcknowledged?: boolean;
    }>({});

    // Check verification status when wallet connects
    useEffect(() => {
        const checkStatus = async () => {
            if (!address || !isConnected) {
                setVerificationData({});
                return;
            }

            try {
                const result = await getVerificationStatus(address);

                if (result.success && result.data) {
                    setVerificationData(result.data);
                }
            } catch (err) {
                console.error('Failed to check verification:', err);
            }
        };

        checkStatus();
    }, [address, isConnected]);

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center space-x-2">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                            <Wallet className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-xl font-bold gradient-text">TokenLend</span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center space-x-6">
                        <Link
                            href="/borrow"
                            className="text-gray-300 hover:text-white transition-colors font-medium px-3 py-2 rounded-lg hover:bg-slate-800/50"
                        >
                            Borrow
                        </Link>
                        <Link
                            href="/lend"
                            className="text-gray-300 hover:text-white transition-colors font-medium px-3 py-2 rounded-lg hover:bg-slate-800/50"
                        >
                            Lend
                        </Link>

                        {/* Show verification badges when connected */}
                        {isConnected && (
                            <div className="flex items-center gap-2">
                                {verificationData.role === 'borrower' && verificationData.verificationStatus && (
                                    <VerificationBadge
                                        status={verificationData.verificationStatus as any}
                                        className="text-xs"
                                    />
                                )}
                                {(verificationData.role === 'lender' || verificationData.role === 'both') && (
                                    <LenderBadge
                                        riskAcknowledged={verificationData.riskAcknowledged}
                                        className="text-xs"
                                    />
                                )}
                            </div>
                        )}

                        <div className="ml-2">
                            <ConnectButton />
                        </div>
                    </div>

                    {/* Mobile menu button */}
                    <button
                        className="md:hidden text-white"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    >
                        {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>
            </div>

            {/* Mobile menu */}
            {mobileMenuOpen && (
                <div className="md:hidden glass-card m-4">
                    <div className="flex flex-col space-y-2 p-4">
                        {/* Verification Status (Mobile) */}
                        {isConnected && (
                            <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b border-slate-700/50">
                                {verificationData.role === 'borrower' && verificationData.verificationStatus && (
                                    <VerificationBadge
                                        status={verificationData.verificationStatus as any}
                                        className="text-xs"
                                    />
                                )}
                                {(verificationData.role === 'lender' || verificationData.role === 'both') && (
                                    <LenderBadge
                                        riskAcknowledged={verificationData.riskAcknowledged}
                                        className="text-xs"
                                    />
                                )}
                            </div>
                        )}

                        <Link
                            href="/borrow"
                            className="text-gray-300 hover:text-white transition-colors font-medium px-4 py-3 rounded-lg hover:bg-slate-800/50"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            Borrow
                        </Link>
                        <Link
                            href="/lend"
                            className="text-gray-300 hover:text-white transition-colors font-medium px-4 py-3 rounded-lg hover:bg-slate-800/50"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            Lend
                        </Link>

                        {/* Quick access to onboarding if not verified */}
                        {isConnected && !verificationData.canCreateLoan && (
                            <Link
                                href="/onboarding/borrower"
                                className="text-amber-400 hover:text-amber-300 transition-colors font-medium px-4 py-3 rounded-lg hover:bg-amber-500/10 border border-amber-500/20"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                Verify Business →
                            </Link>
                        )}

                        <div className="pt-2 border-t border-slate-700/50">
                            <ConnectButton />
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
}
