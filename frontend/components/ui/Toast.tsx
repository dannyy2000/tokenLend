'use client';

import * as React from 'react';
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils/format';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
    message: string;
    type?: ToastType;
    duration?: number;
    onClose: () => void;
}

const toastStyles = {
    success: {
        bg: 'bg-green-500/10 border-green-500/50',
        icon: CheckCircle2,
        iconColor: 'text-green-400',
    },
    error: {
        bg: 'bg-red-500/10 border-red-500/50',
        icon: AlertCircle,
        iconColor: 'text-red-400',
    },
    info: {
        bg: 'bg-blue-500/10 border-blue-500/50',
        icon: Info,
        iconColor: 'text-blue-400',
    },
    warning: {
        bg: 'bg-amber-500/10 border-amber-500/50',
        icon: AlertTriangle,
        iconColor: 'text-amber-400',
    },
};

export function Toast({ message, type = 'info', duration = 5000, onClose }: ToastProps) {
    React.useEffect(() => {
        if (duration) {
            const timer = setTimeout(onClose, duration);
            return () => clearTimeout(timer);
        }
    }, [duration, onClose]);

    const style = toastStyles[type];
    const Icon = style.icon;

    return (
        <div
            className={cn(
                "flex items-start gap-3 p-4 rounded-xl border backdrop-blur-md",
                "shadow-xl min-w-[300px] max-w-md animate-fadeIn",
                style.bg
            )}
        >
            <Icon className={cn("w-5 h-5 flex-shrink-0 mt-0.5", style.iconColor)} />
            <p className="text-white text-sm flex-1">{message}</p>
            <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors flex-shrink-0"
                aria-label="Close"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}

// Toast Container
interface ToastContainerProps {
    toasts: Array<{ id: string; message: string; type: ToastType }>;
    onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
    return (
        <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3">
            {toasts.map((toast) => (
                <Toast
                    key={toast.id}
                    message={toast.message}
                    type={toast.type}
                    onClose={() => onRemove(toast.id)}
                />
            ))}
        </div>
    );
}

// Hook to use Toast
export function useToast() {
    const [toasts, setToasts] = React.useState<Array<{ id: string; message: string; type: ToastType }>>([]);

    const addToast = React.useCallback((message: string, type: ToastType = 'info') => {
        const id = Math.random().toString(36).substring(7);
        setToasts((prev) => [...prev, { id, message, type }]);
    }, []);

    const removeToast = React.useCallback((id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    const toast = React.useMemo(
        () => ({
            success: (message: string) => addToast(message, 'success'),
            error: (message: string) => addToast(message, 'error'),
            info: (message: string) => addToast(message, 'info'),
            warning: (message: string) => addToast(message, 'warning'),
        }),
        [addToast]
    );

    return { toast, toasts, removeToast };
}
