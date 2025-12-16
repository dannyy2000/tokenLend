'use client';

import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Button } from '../ui/Button';
import { Wallet, Menu, X } from 'lucide-react';
import { useState } from 'react';

export function Navbar() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
                        <Link
                            href="/dashboard"
                            className="text-gray-300 hover:text-white transition-colors font-medium px-3 py-2 rounded-lg hover:bg-slate-800/50"
                        >
                            Dashboard
                        </Link>
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
                        <Link
                            href="/dashboard"
                            className="text-gray-300 hover:text-white transition-colors font-medium px-4 py-3 rounded-lg hover:bg-slate-800/50"
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            Dashboard
                        </Link>
                        <div className="pt-2 border-t border-slate-700/50">
                            <ConnectButton />
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
}
