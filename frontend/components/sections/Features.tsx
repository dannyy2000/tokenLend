'use client';

import { motion } from 'framer-motion';
import { Smartphone, TrendingUp, Shield, Zap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';

export function Features() {
    const features = [
        {
            icon: Smartphone,
            title: 'Upload Your Assets',
            description: 'Take photos of your phones, laptops, cars, or machinery. Our AI analyzes condition and market value instantly.',
            gradient: 'from-indigo-500 to-purple-500',
        },
        {
            icon: TrendingUp,
            title: 'AI-Powered Valuation',
            description: 'Get fair, transparent valuations using GPT Vision and market data. Know your max loan amount in seconds.',
            gradient: 'from-purple-500 to-pink-500',
        },
        {
            icon: Shield,
            title: 'Secure Smart Contracts',
            description: 'Your assets are tokenized as NFTs and locked as collateral. Fully transparent and trustless on Mantle.',
            gradient: 'from-emerald-500 to-teal-500',
        },
        {
            icon: Zap,
            title: 'Instant Liquidity',
            description: 'Get funded in minutes. Repay on your terms. Unlock your collateral when done. Simple and fast.',
            gradient: 'from-amber-500 to-orange-500',
        },
    ];

    return (
        <section className="relative py-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                        Why Choose <span className="gradient-text">TokenLend</span>
                    </h2>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                        Combining AI, blockchain, and real-world assets for a revolutionary lending experience
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {features.map((feature, index) => (
                        <motion.div
                            key={feature.title}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            viewport={{ once: true }}
                        >
                            <Card variant="glass" className="h-full hover:scale-105 transition-transform duration-300">
                                <CardHeader>
                                    <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradient} mb-4`}>
                                        <feature.icon className="w-7 h-7 text-white" />
                                    </div>
                                    <CardTitle>{feature.title}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <CardDescription className="text-base">{feature.description}</CardDescription>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
