import * as React from 'react';
import { cn } from '@/lib/utils/format';

interface SpinnerProps {
    size?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
}

const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-3',
    xl: 'w-12 h-12 border-4',
};

export function Spinner({ size = 'md', className }: SpinnerProps) {
    return (
        <div
            className={cn(
                "inline-block rounded-full border-indigo-500 border-t-transparent animate-spin",
                sizeClasses[size],
                className
            )}
            role="status"
            aria-label="Loading"
        >
            <span className="sr-only">Loading...</span>
        </div>
    );
}

// Full page loading overlay
interface LoadingOverlayProps {
    message?: string;
}

export function LoadingOverlay({ message = 'Loading...' }: LoadingOverlayProps) {
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="glass-card text-center p-8">
                <Spinner size="xl" className="mx-auto mb-4" />
                <p className="text-white text-lg font-medium">{message}</p>
            </div>
        </div>
    );
}

// Inline loading state
interface LoadingStateProps {
    message?: string;
    className?: string;
}

export function LoadingState({ message = 'Loading...', className }: LoadingStateProps) {
    return (
        <div className={cn("flex flex-col items-center justify-center py-12", className)}>
            <Spinner size="lg" className="mb-4" />
            <p className="text-gray-400">{message}</p>
        </div>
    );
}

// Button with loading state
interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    isLoading?: boolean;
    children: React.ReactNode;
}

export function LoadingButton({ isLoading, children, disabled, className, ...props }: LoadingButtonProps) {
    return (
        <button
            disabled={isLoading || disabled}
            className={cn(
                "inline-flex items-center justify-center gap-2",
                className
            )}
            {...props}
        >
            {isLoading && <Spinner size="sm" />}
            {children}
        </button>
    );
}
