'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingButton } from '@/components/ui/Spinner';
import { Loader2, CheckCircle2, AlertTriangle, TrendingUp, Shield, Coins } from 'lucide-react';
import { formatCurrency, formatPercentage } from '@/lib/utils/format';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useMintAsset, useCreateLoan } from '@/lib/hooks';
import { useAccount, useChainId, usePublicClient } from 'wagmi';
import { getDefaultStablecoin, getStablecoinDecimals } from '@/lib/contracts';
import { parseUnits } from 'viem';
import * as loanAPI from '@/lib/api/loans';

interface ValuationDisplayProps {
    valuation: any | null;
    isLoading: boolean;
    assetData: any;
}

export function ValuationDisplay({ valuation, isLoading, assetData }: ValuationDisplayProps) {
    const router = useRouter();
    const { address, isConnected } = useAccount();
    const chainId = useChainId();
    const publicClient = usePublicClient();
    const [step, setStep] = useState<'valuation' | 'minting' | 'creating' | 'complete'>('valuation');
    const [mintedTokenId, setMintedTokenId] = useState<bigint | null>(null);
    const [loanId, setLoanId] = useState<bigint | null>(null);

    // Loan customization state
    const [showCustomizeModal, setShowCustomizeModal] = useState(false);
    const [customPrincipal, setCustomPrincipal] = useState<number>(0);
    const [customDuration, setCustomDuration] = useState<number>(30);

    // Mint asset hook
    const {
        mintAsset,
        isPending: isMintPending,
        isConfirming: isMintConfirming,
        isSuccess: isMintSuccess,
        hash: mintHash,
        error: mintError,
    } = useMintAsset();

    // Create loan hook
    const {
        createLoan,
        isPending: isLoanPending,
        isConfirming: isLoanConfirming,
        isSuccess: isLoanSuccess,
        hash: loanHash,
        error: loanError,
    } = useCreateLoan();

    // Watch for mint errors
    useEffect(() => {
        if (mintError) {
            console.error('❌ Mint error from hook:', mintError);
            alert(`Minting failed: ${mintError.message}`);
            setStep('valuation');
        }
    }, [mintError]);

    // Watch for loan errors
    useEffect(() => {
        if (loanError) {
            console.error('❌ Loan error from hook:', loanError);
            alert(`Loan creation failed: ${loanError.message}`);
            setStep('valuation');
        }
    }, [loanError]);

    // Watch for successful mint
    useEffect(() => {
        if (isMintSuccess && step === 'minting' && mintHash) {
            console.log('✅ Asset minted successfully');
            console.log('Mint hash:', mintHash);

            // Get the token ID from the transaction receipt
            const getTokenIdAndCreateLoan = async () => {
                try {
                    // Fetch the transaction receipt
                    const receipt = await publicClient?.getTransactionReceipt({ hash: mintHash });

                    if (!receipt) {
                        throw new Error('Failed to get transaction receipt');
                    }

                    console.log('📝 Transaction receipt:', receipt);

                    // Parse the Transfer event to get the token ID
                    // Transfer event signature: Transfer(address indexed from, address indexed to, uint256 indexed tokenId)
                    // The tokenId is the 3rd topic (index 2)
                    const transferLog = receipt.logs.find(
                        (log) => log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
                    );

                    if (!transferLog || !transferLog.topics[3]) {
                        // Fallback: use the first minted token (likely 0, 1, 2...)
                        console.warn('⚠️ Could not find Transfer event, using fallback token ID');
                        const fallbackTokenId = BigInt(0); // Start from 0
                        setMintedTokenId(fallbackTokenId);
                        setStep('creating');
                        createLoanWithMintedAsset(fallbackTokenId);
                        return;
                    }

                    // Token ID is in the 4th topic (index 3) as a uint256
                    const tokenId = BigInt(transferLog.topics[3]);
                    console.log('🎫 Minted Token ID:', tokenId.toString());

                    setMintedTokenId(tokenId);
                    setStep('creating');
                    createLoanWithMintedAsset(tokenId);
                } catch (err) {
                    console.error('❌ Error getting token ID:', err);
                    alert('Failed to get minted token ID. Please try creating the loan manually.');
                    setStep('valuation');
                }
            };

            getTokenIdAndCreateLoan();
        }
    }, [isMintSuccess, step, mintHash]);

    // Watch for successful loan creation
    useEffect(() => {
        if (isLoanSuccess && step === 'creating' && loanHash && mintedTokenId !== null) {
            console.log('✅ Loan created successfully on blockchain');
            console.log('Loan hash:', loanHash);

            // Sync loan to backend database
            const syncToBackend = async () => {
                try {
                    const stablecoin = getDefaultStablecoin(chainId);
                    if (!stablecoin) return;

                    // Get transaction receipt to find the loan ID
                    const receipt = await publicClient?.getTransactionReceipt({ hash: loanHash });
                    if (!receipt) return;

                    // Parse LoanCreated event to get loan ID
                    // Event signature: LoanCreated(uint256 indexed loanId, address indexed borrower, address indexed lender, ...)
                    // Event signature hash for LoanCreated(uint256,address,address,uint256,uint256,uint256,uint256)
                    const loanCreatedEventSig = '0x8b9ce9b6e1e3b3b3e3b3b3b3b3b3b3b3b3b3b3b3b3b3b3b3b3b3b3b3b3b3b3b3'; // Placeholder

                    // Find the LoanCreated event log
                    const loanCreatedLog = receipt.logs.find((log) => {
                        // Look for logs from the LoanManager contract with the expected topic count
                        return log.topics.length === 4; // 1 event sig + 3 indexed params (loanId, borrower, lender)
                    });

                    // Parse loan ID from event or use fallback
                    let loanId: number;
                    if (!loanCreatedLog || !loanCreatedLog.topics[1]) {
                        console.warn('⚠️ Could not find LoanCreated event, using token ID as fallback');
                        loanId = Number(mintedTokenId);
                    } else {
                        // Parse loan ID from first indexed topic (topic[1])
                        loanId = Number(BigInt(loanCreatedLog.topics[1]));
                    }

                    console.log('📊 Syncing loan to backend...', { loanId });

                    await loanAPI.createLoan({
                        loanId,
                        borrower: address!,
                        assetTokenId: Number(mintedTokenId),
                        principal: customPrincipal,
                        interestRate: valuation.loanTerms.recommendedInterestRate || 1000,
                        duration: customDuration,
                        stablecoin,
                        txHash: loanHash,
                        blockNumber: Number(receipt.blockNumber),
                        valuationId: valuation.valuationId,
                        chainId
                    });

                    console.log('✅ Loan synced to backend successfully');
                } catch (err) {
                    console.error('⚠️ Failed to sync loan to backend:', err);
                    // Don't fail the UI if backend sync fails
                }
            };

            syncToBackend();
            setStep('complete');
        }
    }, [isLoanSuccess, step, loanHash, mintedTokenId]);

    const createLoanWithMintedAsset = async (tokenId: bigint) => {
        if (!valuation || !isConnected) return;

        try {
            const stablecoin = getDefaultStablecoin(chainId);
            if (!stablecoin) {
                alert('No stablecoin configured for this network');
                return;
            }

            const decimals = getStablecoinDecimals(chainId, stablecoin);

            // Use AI-recommended interest rate (borrower can't set their own rate)
            const interestRateBasisPoints = valuation.loanTerms.recommendedInterestRate || 1000;

            // Use customized principal and duration, but AI interest rate
            await createLoan(
                tokenId,
                customPrincipal,
                interestRateBasisPoints,
                customDuration,
                stablecoin,
                decimals
            );
        } catch (err: any) {
            console.error('Create loan error:', err);
            alert(err.message || 'Loan creation failed');
            setStep('valuation');
        }
    };

    const handleShowCustomizeModal = () => {
        if (!valuation || !isConnected) {
            alert('Please connect your wallet first');
            return;
        }

        // Set default values from AI recommendations
        setCustomPrincipal(valuation.loanTerms.maxLoanAmount);
        setCustomDuration(valuation.loanTerms.recommendedDuration || 30);
        setShowCustomizeModal(true);
    };

    const handleConfirmAndMint = async () => {
        // Validate inputs
        if (customPrincipal <= 0) {
            alert('Loan amount must be greater than 0');
            return;
        }

        if (customPrincipal > valuation.loanTerms.maxLoanAmount) {
            alert(`Loan amount cannot exceed max of ${formatCurrency(valuation.loanTerms.maxLoanAmount)}`);
            return;
        }

        if (customDuration <= 0) {
            alert('Duration must be greater than 0 days');
            return;
        }

        // Close modal and start minting
        setShowCustomizeModal(false);
        handleCreateLoanWithAI();
    };

    const handleCreateLoanWithAI = async () => {
        console.log('🚀 Starting loan creation with AI valuation...');
        console.log('Connected:', isConnected, 'Address:', address);
        console.log('Valuation data:', valuation);
        console.log('Asset data:', assetData);

        if (!valuation || !isConnected) {
            alert('Please connect your wallet first');
            return;
        }

        setStep('minting');

        try {
            // Step 1: Mint AssetToken NFT with AI valuation data
            // Note: mintAsset expects raw number, it will convert to wei (18 decimals) internally
            const aiValuationAmount = valuation.valuation.conditionAdjustedValue; // Raw Naira amount
            const maxLTV = valuation.loanTerms.maxLTV; // Already in basis points

            const tokenURI = `ipfs://valuation/${valuation.valuationId}`;

            console.log('📝 Minting params:', {
                assetType: assetData.assetType || 'smartphone',
                aiValuation: aiValuationAmount,
                maxLTV: maxLTV,
                borrower: address,
                uri: tokenURI
            });

            await mintAsset(
                assetData.assetType || 'smartphone', // assetType
                aiValuationAmount, // aiValuation (raw number)
                maxLTV, // maxLTV
                address!, // borrower
                tokenURI // uri
            );

            console.log('✅ Mint transaction sent!');
            // Step 2 will be triggered by useEffect when mint succeeds
        } catch (err: any) {
            console.error('❌ Mint asset error:', err);
            alert(err.message || 'Asset minting failed');
            setStep('valuation');
        }
    };
    if (isLoading) {
        return (
            <Card variant="glass" className="max-w-3xl mx-auto">
                <div className="text-center py-16">
                    <Loader2 className="w-16 h-16 mx-auto mb-4 text-indigo-500 animate-spin" />
                    <h3 className="text-2xl font-bold text-white mb-2">Analyzing Your Asset...</h3>
                    <p className="text-gray-400 mb-8">
                        Our AI is examining your images and calculating the optimal loan terms
                    </p>
                    <div className="max-w-md mx-auto space-y-3">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">Verifying asset details</span>
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">Analyzing condition</span>
                            <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
                        </div>
                        <div className="flex items-center justify-between text-sm text-gray-600">
                            <span>Calculating LTV</span>
                            <div className="w-5 h-5" />
                        </div>
                    </div>
                </div>
            </Card>
        );
    }

    if (!valuation) {
        return (
            <Card variant="glass" className="max-w-3xl mx-auto">
                <div className="text-center py-16">
                    <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-amber-500" />
                    <h3 className="text-2xl font-bold text-white mb-2">Valuation Failed</h3>
                    <p className="text-gray-400 mb-8">
                        We couldn't process your asset. Please try again or contact support.
                    </p>
                    <Button onClick={() => window.location.reload()}>Try Again</Button>
                </div>
            </Card>
        );
    }

    const { asset, valuation: val, condition, loanTerms, riskBreakdown } = valuation;

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* Success Header */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
            >
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/20 mb-4">
                    <CheckCircle2 className="w-10 h-10 text-green-500" />
                </div>
                <h2 className="text-4xl font-bold text-white mb-2">Valuation Complete!</h2>
                <p className="text-xl text-gray-400">
                    Your {asset.brand} {asset.detectedModel} has been verified
                </p>
            </motion.div>

            {/* Main Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card variant="gradient">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">Asset Value</CardTitle>
                            <TrendingUp className="w-6 h-6 text-emerald-400" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold text-white">
                            {formatCurrency(val.conditionAdjustedValue)}
                        </p>
                        <p className="text-sm text-gray-400 mt-1">
                            Market: {formatCurrency(val.currentMarketValue)}
                        </p>
                    </CardContent>
                </Card>

                <Card variant="gradient">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">Max Loan Amount</CardTitle>
                            <Coins className="w-6 h-6 text-indigo-400" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold gradient-text">
                            {formatCurrency(loanTerms.maxLoanAmount)}
                        </p>
                        <p className="text-sm text-gray-400 mt-1">
                            LTV: {loanTerms.maxLTVPercent}
                        </p>
                    </CardContent>
                </Card>

                <Card variant="gradient">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">Condition Score</CardTitle>
                            <Shield className="w-6 h-6 text-purple-400" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold text-white">
                            {(condition.score * 100).toFixed(0)}%
                        </p>
                        <p className="text-sm text-gray-400 mt-1 capitalize">
                            {condition.rating} condition
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Condition Details */}
            <Card variant="glass">
                <CardHeader>
                    <CardTitle>AI Condition Assessment</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-gray-400">Condition Score</span>
                                <span className="text-sm font-semibold text-white">
                                    {(condition.score * 100).toFixed(0)}%
                                </span>
                            </div>
                            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                                    style={{ width: `${condition.score * 100}%` }}
                                />
                            </div>
                        </div>

                        {condition.notes && condition.notes.length > 0 && (
                            <div>
                                <p className="text-sm font-medium text-gray-300 mb-2">Condition Notes:</p>
                                <ul className="space-y-1">
                                    {condition.notes.map((note: string, index: number) => (
                                        <li key={index} className="text-sm text-gray-400 flex items-start">
                                            <span className="mr-2">•</span>
                                            <span>{note}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {condition.redFlags && condition.redFlags.length > 0 && (
                            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                                <p className="text-sm font-medium text-amber-400 mb-1">⚠️ Warnings:</p>
                                <ul className="space-y-1">
                                    {condition.redFlags.map((flag: string, index: number) => (
                                        <li key={index} className="text-sm text-amber-300">
                                            • {flag}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div className="text-xs text-gray-500">
                            AI Confidence: {(condition.confidence * 100).toFixed(0)}%
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* LTV Breakdown */}
            <Card variant="glass">
                <CardHeader>
                    <CardTitle>Loan-to-Value Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-400">Base LTV ({asset.type})</span>
                            <span className="text-sm font-semibold text-white">{riskBreakdown.baseLTV}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-400">Condition Adjustment</span>
                            <span className="text-sm font-semibold text-white">{riskBreakdown.conditionAdjustment}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-400">Age Adjustment</span>
                            <span className="text-sm font-semibold text-white">{riskBreakdown.ageAdjustment}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-400">Liquidity Adjustment</span>
                            <span className="text-sm font-semibold text-white">{riskBreakdown.liquidityAdjustment}</span>
                        </div>
                        <div className="h-px bg-gray-700 my-2" />
                        <div className="flex items-center justify-between">
                            <span className="text-base font-semibold text-white">Final LTV</span>
                            <span className="text-lg font-bold gradient-text">{riskBreakdown.finalLTV}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Recommended Terms */}
            <Card variant="glass">
                <CardHeader>
                    <CardTitle>Recommended Loan Terms</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-gray-400 mb-1">Duration</p>
                            <p className="text-lg font-semibold text-white">{loanTerms.recommendedDuration} days</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-400 mb-1">Interest Rate</p>
                            <p className="text-lg font-semibold text-white">
                                {loanTerms.recommendedInterestRate / 100}% APR
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Actions */}
            {step === 'complete' ? (
                <Card variant="glass" className="bg-green-500/10 border-green-500/20">
                    <CardContent className="p-6">
                        <div className="text-center">
                            <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-500" />
                            <h3 className="text-2xl font-bold text-white mb-2">Loan Created Successfully!</h3>
                            <p className="text-gray-400 mb-6">
                                Your asset has been tokenized and your loan request is now live
                            </p>
                            {loanHash && (
                                <div className="mb-6">
                                    <p className="text-sm text-gray-500 mb-2">Transaction Hash:</p>
                                    <code className="text-xs text-indigo-400 bg-slate-900/50 px-4 py-2 rounded-lg break-all block">
                                        {loanHash}
                                    </code>
                                </div>
                            )}
                            <div className="flex flex-col sm:flex-row gap-4">
                                <Link href="/borrow" className="flex-1">
                                    <Button size="lg" className="w-full">View My Loans</Button>
                                </Link>
                                <Link href="/lend" className="flex-1">
                                    <Button size="lg" variant="outline" className="w-full">Browse Lenders</Button>
                                </Link>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="flex flex-col sm:flex-row gap-4">
                    <LoadingButton
                        className="flex-1"
                        onClick={handleShowCustomizeModal}
                        isLoading={step === 'minting' || step === 'creating'}
                        disabled={!isConnected || step !== 'valuation'}
                    >
                        {step === 'minting' && 'Minting Asset NFT...'}
                        {step === 'creating' && 'Creating Loan Request...'}
                        {step === 'valuation' && '🚀 Create Loan with AI Valuation'}
                    </LoadingButton>
                    <Link href="/borrow/upload" className="flex-1">
                    <Button size="lg" variant="outline" className="w-full">
                        Upload Another Asset
                    </Button>
                </Link>
            </div>
            )}

            {/* Customize Loan Modal */}
            {showCustomizeModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <Card variant="glass" className="max-w-lg w-full">
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <span>Customize Loan Terms</span>
                                <button
                                    onClick={() => setShowCustomizeModal(false)}
                                    className="text-gray-400 hover:text-white transition-colors"
                                >
                                    ✕
                                </button>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <p className="text-sm text-gray-400">
                                Adjust how much you want to borrow. The AI has calculated the maximum safe amount based on your asset's value.
                            </p>

                            {/* Principal Amount with Slider */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <label className="text-sm font-medium text-gray-300">
                                        Loan Amount
                                    </label>
                                    <span className="text-2xl font-bold gradient-text">
                                        {formatCurrency(customPrincipal)}
                                    </span>
                                </div>

                                {/* Slider */}
                                <div className="space-y-2">
                                    <input
                                        type="range"
                                        value={customPrincipal}
                                        onChange={(e) => setCustomPrincipal(Number(e.target.value))}
                                        max={valuation.loanTerms.maxLoanAmount}
                                        min={Math.min(10000, valuation.loanTerms.maxLoanAmount * 0.1)}
                                        step={1000}
                                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer
                                                 [&::-webkit-slider-thumb]:appearance-none
                                                 [&::-webkit-slider-thumb]:w-5
                                                 [&::-webkit-slider-thumb]:h-5
                                                 [&::-webkit-slider-thumb]:rounded-full
                                                 [&::-webkit-slider-thumb]:bg-gradient-to-r
                                                 [&::-webkit-slider-thumb]:from-indigo-500
                                                 [&::-webkit-slider-thumb]:to-purple-500
                                                 [&::-webkit-slider-thumb]:cursor-pointer
                                                 [&::-webkit-slider-thumb]:shadow-lg
                                                 [&::-webkit-slider-thumb]:hover:scale-110
                                                 [&::-webkit-slider-thumb]:transition-transform"
                                    />

                                    {/* Min/Max Labels */}
                                    <div className="flex justify-between text-xs text-gray-500">
                                        <span>Min: {formatCurrency(Math.min(10000, valuation.loanTerms.maxLoanAmount * 0.1))}</span>
                                        <span>Max: {formatCurrency(valuation.loanTerms.maxLoanAmount)}</span>
                                    </div>

                                    {/* Percentage Bar */}
                                    <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-200"
                                            style={{ width: `${(customPrincipal / valuation.loanTerms.maxLoanAmount) * 100}%` }}
                                        />
                                    </div>
                                    <p className="text-xs text-center text-gray-500">
                                        {((customPrincipal / valuation.loanTerms.maxLoanAmount) * 100).toFixed(0)}% of maximum
                                    </p>
                                </div>
                            </div>

                            {/* Duration */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Loan Duration (days)
                                </label>
                                <input
                                    type="number"
                                    value={customDuration}
                                    onChange={(e) => setCustomDuration(Number(e.target.value))}
                                    min={1}
                                    max={365}
                                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Enter duration in days"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    AI Recommended: {valuation.loanTerms.recommendedDuration || 30} days
                                </p>
                            </div>

                            {/* Summary */}
                            <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                                <p className="text-sm font-medium text-white mb-2">Loan Summary</p>
                                <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">You'll receive:</span>
                                        <span className="text-white font-semibold">{formatCurrency(customPrincipal)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Duration:</span>
                                        <span className="text-white">{customDuration} days</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Interest Rate:</span>
                                        <span className="text-white">
                                            {(valuation.loanTerms.recommendedInterestRate || 1000) / 100}% APR
                                            <span className="text-xs text-gray-500 ml-1">(AI Set)</span>
                                        </span>
                                    </div>
                                    <div className="h-px bg-gray-700 my-2" />
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Total to repay:</span>
                                        <span className="text-white font-bold">
                                            {formatCurrency(customPrincipal * (1 + ((valuation.loanTerms.recommendedInterestRate || 1000) / 10000) * (customDuration / 365)))}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3">
                                <Button
                                    size="lg"
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => setShowCustomizeModal(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    size="lg"
                                    className="flex-1"
                                    onClick={handleConfirmAndMint}
                                >
                                    Confirm & Create Loan
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Info */}
            <div className="text-center text-sm text-gray-500">
                <p>Valuation ID: {valuation.valuationId}</p>
                <p className="mt-1">Valid for 24 hours</p>
            </div>
        </div>
    );
}
