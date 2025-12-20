'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ImageUpload } from './ImageUpload';
import { AssetDetailsForm } from './AssetDetailsForm';
import { ValuationDisplay } from './ValuationDisplay';
import { CheckCircle2 } from 'lucide-react';

type Step = 'upload' | 'details' | 'valuation' | 'complete';

interface AssetData {
    images: File[];
    assetType: string;
    brand: string;
    model: string;
    variant?: string;
    purchaseDate: string;
    serialNumber?: string;
}

interface ValuationResult {
    valuationId: string;
    asset: {
        detectedModel: string;
        confirmedMatch: boolean;
        type: string;
        brand: string;
    };
    valuation: {
        currentMarketValue: number;
        depreciatedValue: number;
        conditionAdjustedValue: number;
        currency: string;
    };
    condition: {
        rating: string;
        score: number;
        notes: string[];
        confidence: number;
        redFlags: string[];
    };
    loanTerms: {
        maxLTV: number;
        maxLTVPercent: string;
        maxLoanAmount: number;
        recommendedDuration: number;
        recommendedInterestRate: number;
    };
    riskBreakdown: {
        baseLTV: string;
        conditionAdjustment: string;
        ageAdjustment: string;
        liquidityAdjustment: string;
        finalLTV: string;
    };
}

export function AssetUploadFlow() {
    const [currentStep, setCurrentStep] = useState<Step>('upload');
    const [assetData, setAssetData] = useState<Partial<AssetData>>({});
    const [valuation, setValuation] = useState<ValuationResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const steps = [
        { id: 'upload', label: 'Upload Images', number: 1 },
        { id: 'details', label: 'Asset Details', number: 2 },
        { id: 'valuation', label: 'AI Valuation', number: 3 },
    ];

    const handleImagesUploaded = (files: File[]) => {
        setAssetData({ ...assetData, images: files });
        setCurrentStep('details');
    };

    const handleDetailsSubmitted = async (details: Omit<AssetData, 'images'>) => {
        setAssetData({ ...assetData, ...details });
        setCurrentStep('valuation');
        setIsLoading(true);

        try {
            // Convert images to base64
            const imagePromises = assetData.images?.map((file) => {
                return new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
            }) || [];

            const base64Images = await Promise.all(imagePromises);

            // Call backend API for valuation
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/valuations`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    assetType: details.assetType,
                    brand: details.brand,
                    model: details.model,
                    variant: details.variant || '',
                    purchaseDate: details.purchaseDate,
                    serialNumber: details.serialNumber || '',
                    images: base64Images,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Valuation failed');
            }

            setValuation(result);
        } catch (error) {
            console.error('Valuation error:', error);
            // For demo purposes, use mock data
            setValuation({
                valuationId: 'val_demo_123',
                asset: {
                    detectedModel: details.model,
                    confirmedMatch: true,
                    type: details.assetType,
                    brand: details.brand,
                },
                valuation: {
                    currentMarketValue: 650000,
                    depreciatedValue: 585000,
                    conditionAdjustedValue: 497250,
                    currency: 'NGN',
                },
                condition: {
                    rating: 'good',
                    score: 0.85,
                    notes: ['Minor scratches on edges', 'Normal wear'],
                    confidence: 0.92,
                    redFlags: [],
                },
                loanTerms: {
                    maxLTV: 4361,
                    maxLTVPercent: '43.61%',
                    maxLoanAmount: 216781,
                    recommendedDuration: 30,
                    recommendedInterestRate: 1000,
                },
                riskBreakdown: {
                    baseLTV: '70.00%',
                    conditionAdjustment: '85.00%',
                    ageAdjustment: '95.00%',
                    liquidityAdjustment: '100.00%',
                    finalLTV: '56.43%',
                },
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Progress Steps */}
            <div className="mb-12">
                <div className="flex items-center justify-center space-x-4">
                    {steps.map((step, index) => (
                        <div key={step.id} className="flex items-center">
                            <div className="flex flex-col items-center">
                                <div
                                    className={`w-12 h-12 rounded-full flex items-center justify-center font-bold transition-all ${currentStep === step.id
                                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white scale-110'
                                            : steps.findIndex((s) => s.id === currentStep) > index
                                                ? 'bg-green-500 text-white'
                                                : 'bg-slate-800 text-gray-400'
                                        }`}
                                >
                                    {steps.findIndex((s) => s.id === currentStep) > index ? (
                                        <CheckCircle2 className="w-6 h-6" />
                                    ) : (
                                        step.number
                                    )}
                                </div>
                                <span className="text-sm text-gray-400 mt-2">{step.label}</span>
                            </div>
                            {index < steps.length - 1 && (
                                <div
                                    className={`w-24 h-1 mx-4 transition-all ${steps.findIndex((s) => s.id === currentStep) > index
                                            ? 'bg-green-500'
                                            : 'bg-slate-800'
                                        }`}
                                />
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Step Content */}
            <AnimatePresence mode="wait">
                {currentStep === 'upload' && (
                    <motion.div
                        key="upload"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                    >
                        <ImageUpload onImagesUploaded={handleImagesUploaded} />
                    </motion.div>
                )}

                {currentStep === 'details' && (
                    <motion.div
                        key="details"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                    >
                        <AssetDetailsForm
                            onSubmit={handleDetailsSubmitted}
                            onBack={() => setCurrentStep('upload')}
                            images={assetData.images || []}
                        />
                    </motion.div>
                )}

                {currentStep === 'valuation' && (
                    <motion.div
                        key="valuation"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                    >
                        <ValuationDisplay
                            valuation={valuation}
                            isLoading={isLoading}
                            assetData={assetData as AssetData}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
