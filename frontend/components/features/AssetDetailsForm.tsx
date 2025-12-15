'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ArrowLeft } from 'lucide-react';
import Image from 'next/image';

interface AssetDetailsFormProps {
    onSubmit: (details: {
        assetType: string;
        brand: string;
        model: string;
        variant?: string;
        purchaseDate: string;
        serialNumber?: string;
    }) => void;
    onBack: () => void;
    images: File[];
}

export function AssetDetailsForm({ onSubmit, onBack, images }: AssetDetailsFormProps) {
    const [formData, setFormData] = useState({
        assetType: '',
        brand: '',
        model: '',
        variant: '',
        purchaseDate: '',
        serialNumber: '',
    });

    const assetTypes = [
        { value: 'smartphone', label: '📱 Smartphone' },
        { value: 'laptop', label: '💻 Laptop' },
        { value: 'car', label: '🚗 Car' },
        { value: 'machinery', label: '⚙️ Machinery' },
        { value: 'inventory', label: '📦 Inventory' },
    ];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    const isFormValid = formData.assetType && formData.brand && formData.model && formData.purchaseDate;

    return (
        <Card variant="glass" className="max-w-3xl mx-auto">
            <div className="mb-8">
                <button
                    onClick={onBack}
                    className="flex items-center text-gray-400 hover:text-white transition-colors mb-4"
                >
                    <ArrowLeft className="w-5 h-5 mr-2" />
                    Back to Images
                </button>
                <h2 className="text-3xl font-bold text-white mb-2">Asset Details</h2>
                <p className="text-gray-400">
                    Provide information about your asset for accurate AI valuation
                </p>
            </div>

            {/* Image Preview */}
            <div className="mb-8 p-4 bg-slate-800/50 rounded-xl">
                <p className="text-sm text-gray-400 mb-3">Uploaded Images ({images.length})</p>
                <div className="flex gap-2 overflow-x-auto">
                    {images.slice(0, 5).map((file, index) => (
                        <div key={index} className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-slate-700">
                            <Image
                                src={URL.createObjectURL(file)}
                                alt={`Preview ${index + 1}`}
                                fill
                                className="object-cover"
                            />
                        </div>
                    ))}
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Asset Type */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Asset Type *
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {assetTypes.map((type) => (
                            <button
                                key={type.value}
                                type="button"
                                onClick={() => setFormData({ ...formData, assetType: type.value })}
                                className={`p-4 rounded-xl border-2 transition-all ${formData.assetType === type.value
                                        ? 'border-indigo-500 bg-indigo-500/10 text-white'
                                        : 'border-gray-700 hover:border-gray-600 text-gray-400'
                                    }`}
                            >
                                <span className="text-lg">{type.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Brand */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Brand *
                    </label>
                    <input
                        type="text"
                        value={formData.brand}
                        onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                        placeholder="e.g., Apple, Samsung, Toyota"
                        className="w-full px-4 py-3 bg-slate-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
                        required
                    />
                </div>

                {/* Model */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Model *
                    </label>
                    <input
                        type="text"
                        value={formData.model}
                        onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                        placeholder="e.g., iPhone 14, MacBook Pro, Camry"
                        className="w-full px-4 py-3 bg-slate-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
                        required
                    />
                </div>

                {/* Variant */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Variant (Optional)
                    </label>
                    <input
                        type="text"
                        value={formData.variant}
                        onChange={(e) => setFormData({ ...formData, variant: e.target.value })}
                        placeholder="e.g., 128GB, i7 16GB RAM, 2022 LE"
                        className="w-full px-4 py-3 bg-slate-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                </div>

                {/* Purchase Date */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Purchase Date *
                    </label>
                    <input
                        type="date"
                        value={formData.purchaseDate}
                        onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                        max={new Date().toISOString().split('T')[0]}
                        className="w-full px-4 py-3 bg-slate-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-indigo-500 transition-colors"
                        required
                    />
                </div>

                {/* Serial Number */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Serial Number (Optional)
                    </label>
                    <input
                        type="text"
                        value={formData.serialNumber}
                        onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                        placeholder="e.g., ABC123456789"
                        className="w-full px-4 py-3 bg-slate-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Helps verify authenticity and improve valuation accuracy
                    </p>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end pt-4">
                    <Button
                        type="submit"
                        size="lg"
                        disabled={!isFormValid}
                    >
                        Get AI Valuation
                    </Button>
                </div>
            </form>
        </Card>
    );
}
