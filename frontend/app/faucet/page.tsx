'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useFaucet } from '@/lib/hooks';
import { useAccount } from 'wagmi';
import { Coins, CheckCircle2, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

export default function FaucetPage() {
    const { address, isConnected } = useAccount();
    const { mintTestUSDT, isPending, isConfirming, isSuccess, isError, error, hash } = useFaucet();
    const [amount, setAmount] = useState(10000);
    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => {
        if (isSuccess) {
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 5000);
        }
    }, [isSuccess]);

    const handleMint = async () => {
        try {
            await mintTestUSDT(amount);
        } catch (err: any) {
            console.error('Faucet error:', err);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 pt-24 pb-16">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-12"
                >
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 mb-6">
                        <Coins className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-5xl font-bold text-white mb-4">
                        Test USDT Faucet
                    </h1>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                        Get free test USDT to explore the platform and fund loans.
                        Perfect for judges and testers!
                    </p>
                </motion.div>

                {/* Main Faucet Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <Card variant="glass" className="max-w-2xl mx-auto">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Sparkles className="w-6 h-6 text-indigo-400" />
                                Get Test Tokens
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {!isConnected ? (
                                <div className="text-center py-8">
                                    <AlertCircle className="w-16 h-16 mx-auto mb-4 text-amber-500" />
                                    <h3 className="text-xl font-semibold text-white mb-2">
                                        Connect Your Wallet
                                    </h3>
                                    <p className="text-gray-400">
                                        Please connect your wallet to receive test USDT
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {/* Amount Selection */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-3">
                                            Select Amount
                                        </label>
                                        <div className="grid grid-cols-3 gap-3">
                                            {[1000, 5000, 10000].map((amt) => (
                                                <button
                                                    key={amt}
                                                    onClick={() => setAmount(amt)}
                                                    className={`px-4 py-3 rounded-lg font-semibold transition-all ${
                                                        amount === amt
                                                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white scale-105'
                                                            : 'bg-slate-800 text-gray-400 hover:bg-slate-700'
                                                    }`}
                                                >
                                                    {amt.toLocaleString()} USDT
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Custom Amount */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">
                                            Or Enter Custom Amount
                                        </label>
                                        <input
                                            type="number"
                                            value={amount}
                                            onChange={(e) => setAmount(Number(e.target.value))}
                                            min={100}
                                            max={100000}
                                            className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            placeholder="Enter amount"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            Max: 100,000 USDT per request
                                        </p>
                                    </div>

                                    {/* Wallet Info */}
                                    <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                                        <p className="text-sm text-gray-400 mb-1">Your Wallet</p>
                                        <p className="text-sm font-mono text-white">
                                            {address?.slice(0, 6)}...{address?.slice(-4)}
                                        </p>
                                    </div>

                                    {/* Mint Button */}
                                    <Button
                                        size="lg"
                                        className="w-full"
                                        onClick={handleMint}
                                        disabled={isPending || isConfirming || !amount}
                                    >
                                        {isPending || isConfirming ? (
                                            <>
                                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                                {isPending ? 'Confirming...' : 'Minting...'}
                                            </>
                                        ) : (
                                            <>
                                                <Coins className="w-5 h-5 mr-2" />
                                                Get {amount.toLocaleString()} Test USDT
                                            </>
                                        )}
                                    </Button>

                                    {/* Success Message */}
                                    {showSuccess && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg"
                                        >
                                            <div className="flex items-start gap-3">
                                                <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
                                                <div className="flex-1">
                                                    <p className="font-semibold text-green-400 mb-1">
                                                        Success! USDT Received
                                                    </p>
                                                    <p className="text-sm text-green-300 mb-2">
                                                        {amount.toLocaleString()} USDT has been sent to your wallet
                                                    </p>
                                                    {hash && (
                                                        <a
                                                            href={`https://sepolia.mantlescan.xyz/tx/${hash}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-xs text-indigo-400 hover:text-indigo-300 underline"
                                                        >
                                                            View Transaction
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* Error Message */}
                                    {isError && error && (
                                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                                            <div className="flex items-start gap-3">
                                                <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="font-semibold text-red-400 mb-1">
                                                        Transaction Failed
                                                    </p>
                                                    <p className="text-sm text-red-300">
                                                        {error.message || 'An error occurred. Please try again.'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Info Cards */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8"
                >
                    <Card variant="glass">
                        <CardContent className="p-6 text-center">
                            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-indigo-500/20 flex items-center justify-center">
                                <Coins className="w-6 h-6 text-indigo-400" />
                            </div>
                            <h3 className="font-semibold text-white mb-2">Unlimited Requests</h3>
                            <p className="text-sm text-gray-400">
                                Get as much test USDT as you need for testing
                            </p>
                        </CardContent>
                    </Card>

                    <Card variant="glass">
                        <CardContent className="p-6 text-center">
                            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-purple-500/20 flex items-center justify-center">
                                <Sparkles className="w-6 h-6 text-purple-400" />
                            </div>
                            <h3 className="font-semibold text-white mb-2">Instant Transfer</h3>
                            <p className="text-sm text-gray-400">
                                Tokens arrive in your wallet immediately
                            </p>
                        </CardContent>
                    </Card>

                    <Card variant="glass">
                        <CardContent className="p-6 text-center">
                            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-green-500/20 flex items-center justify-center">
                                <CheckCircle2 className="w-6 h-6 text-green-400" />
                            </div>
                            <h3 className="font-semibold text-white mb-2">Test Network</h3>
                            <p className="text-sm text-gray-400">
                                Safe to test - these are test tokens only
                            </p>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Instructions */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mt-8"
                >
                    <Card variant="glass">
                        <CardHeader>
                            <CardTitle>How to Use Test USDT</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ol className="space-y-3 text-gray-300">
                                <li className="flex items-start gap-3">
                                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-500 text-white text-sm font-semibold flex items-center justify-center">
                                        1
                                    </span>
                                    <span>
                                        <strong className="text-white">Get Test USDT</strong> - Click the button above to mint tokens to your wallet
                                    </span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-500 text-white text-sm font-semibold flex items-center justify-center">
                                        2
                                    </span>
                                    <span>
                                        <strong className="text-white">Explore Loans</strong> - Browse available loan requests in the lender marketplace
                                    </span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-500 text-white text-sm font-semibold flex items-center justify-center">
                                        3
                                    </span>
                                    <span>
                                        <strong className="text-white">Fund a Loan</strong> - Use your test USDT to fund loans and earn interest
                                    </span>
                                </li>
                            </ol>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </div>
    );
}
