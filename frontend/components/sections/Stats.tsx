'use client';

import { motion } from 'framer-motion';
import { TrendingUp, Users, CheckCircle } from 'lucide-react';

export function Stats() {
    const stats = [
        {
            icon: TrendingUp,
            value: '₦2.5M+',
            label: 'Total Value Locked',
            color: 'from-indigo-500 to-purple-500',
        },
        {
            icon: Users,
            value: '500+',
            label: 'Active Users',
            color: 'from-purple-500 to-pink-500',
        },
        {
            icon: CheckCircle,
            value: '98%',
            label: 'Success Rate',
            color: 'from-emerald-500 to-teal-500',
        },
    ];

    return (
        <section className="relative py-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {stats.map((stat, index) => (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            viewport={{ once: true }}
                            className="glass-card text-center"
                        >
                            <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${stat.color} mb-4`}>
                                <stat.icon className="w-8 h-8 text-white" />
                            </div>
                            <h3 className="text-4xl font-bold text-white mb-2">{stat.value}</h3>
                            <p className="text-gray-400">{stat.label}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
