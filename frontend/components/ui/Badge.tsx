import * as React from 'react';
import { cn } from '@/lib/utils/format';

export type BadgeVariant = 'default' | 'success' | 'error' | 'warning' | 'info' | 'outline';

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: BadgeVariant;
    children: React.ReactNode;
}

const variantStyles = {
    default: 'bg-slate-700/50 text-gray-300 border-slate-600',
    success: 'bg-green-500/10 text-green-400 border-green-500/20',
    error: 'bg-red-500/10 text-red-400 border-red-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    info: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    outline: 'bg-transparent text-gray-300 border-slate-600',
};

export function Badge({ variant = 'default', className, children, ...props }: BadgeProps) {
    return (
        <div
            className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full",
                "text-xs font-medium border",
                "transition-colors duration-200",
                variantStyles[variant],
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}
