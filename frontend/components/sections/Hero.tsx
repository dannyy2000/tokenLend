'use client';

import { Button } from '@/components/ui/Button';
import { ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export function Hero() {
    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
            {/* Subtle background elements */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
            </div>

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                >
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 glass-card px-5 py-2.5 mb-8">
                        <Sparkles className="w-4 h-4 text-indigo-400" />
                        <span className="text-sm text-gray-300 font-medium tracking-wide">AI-Powered Asset Valuation</span>
                    </div>

                    {/* Main heading */}
                    <h1 className="text-5xl md:text-7xl font-bold mb-8 leading-tight">
                        Unlock Liquidity from
                        <br />
                        <span className="gradient-text">Your Real-World Assets</span>
                    </h1>

                    {/* Subheading */}
                    <p className="text-xl md:text-2xl text-gray-400 mb-12 max-w-3xl mx-auto leading-relaxed">
                        Get instant loans backed by your phones, laptops, cars, and more.
                        AI-powered valuations ensure fair terms for borrowers and lenders.
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link href="/onboarding/borrower">
                            <Button size="lg" className="w-full sm:w-auto">
                                Get Started as Borrower
                                <ArrowRight className="ml-2 w-5 h-5" />
                            </Button>
                        </Link>
                        <Link href="/onboarding/lender">
                            <Button size="lg" variant="outline" className="w-full sm:w-auto">
                                Become a Lender
                            </Button>
                        </Link>
                    </div>

                    {/* Trust indicators */}
                    <div className="mt-16 flex flex-wrap items-center justify-center gap-8 text-sm text-gray-500">
                        <div className="flex items-center gap-2.5">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            <span className="font-medium">Secured by Smart Contracts</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            <span className="font-medium">AI-Verified Assets</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            <span className="font-medium">Built on Mantle</span>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
