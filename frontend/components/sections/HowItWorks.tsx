'use client';

import { motion } from 'framer-motion';
import { Upload, Brain, Coins, CheckCircle2 } from 'lucide-react';

export function HowItWorks() {
    const steps = [
        {
            number: '01',
            icon: Upload,
            title: 'Upload Asset',
            description: 'Take photos and provide details about your asset (phone, laptop, car, etc.)',
        },
        {
            number: '02',
            icon: Brain,
            title: 'AI Valuation',
            description: 'Our AI analyzes condition, market value, and calculates your max loan amount',
        },
        {
            number: '03',
            icon: Coins,
            title: 'Request Loan',
            description: 'Choose your loan amount and terms. Asset is tokenized and locked as collateral',
        },
        {
            number: '04',
            icon: CheckCircle2,
            title: 'Get Funded & Repay',
            description: 'Lender funds your loan. Repay on time to unlock your asset NFT',
        },
    ];

    return (
        <section className="relative py-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                        How It <span className="gradient-text">Works</span>
                    </h2>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                        Four simple steps to unlock liquidity from your assets
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {steps.map((step, index) => (
                        <motion.div
                            key={step.number}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            viewport={{ once: true }}
                            className="relative"
                        >
                            {/* Connector line */}
                            {index < steps.length - 1 && (
                                <div className="hidden lg:block absolute top-20 left-full w-full h-0.5 bg-gradient-to-r from-indigo-500/50 to-purple-500/50 -translate-x-1/2" />
                            )}

                            <div className="glass-card text-center relative z-10">
                                <div className="text-6xl font-bold gradient-text mb-4">{step.number}</div>
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 mb-4">
                                    <step.icon className="w-8 h-8 text-white" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">{step.title}</h3>
                                <p className="text-gray-400 text-sm">{step.description}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
