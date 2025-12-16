'use client';

import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils/format';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    description?: string;
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
    showClose?: boolean;
}

const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-7xl',
};

export function Modal({
    isOpen,
    onClose,
    title,
    description,
    children,
    size = 'md',
    showClose = true
}: ModalProps) {
    return (
        <Dialog.Root open={isOpen} onOpenChange={onClose}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 animate-fadeIn" />
                <Dialog.Content
                    className={cn(
                        "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50",
                        "w-[95vw] glass-card shadow-2xl animate-fadeIn",
                        "max-h-[90vh] overflow-y-auto",
                        sizeClasses[size]
                    )}
                >
                    <div className="flex items-start justify-between mb-6">
                        <div className="flex-1">
                            {title && (
                                <Dialog.Title className="text-2xl font-bold text-white mb-2">
                                    {title}
                                </Dialog.Title>
                            )}
                            {description && (
                                <Dialog.Description className="text-gray-400">
                                    {description}
                                </Dialog.Description>
                            )}
                        </div>
                        {showClose && (
                            <Dialog.Close asChild>
                                <button
                                    className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-slate-700/50"
                                    aria-label="Close"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </Dialog.Close>
                        )}
                    </div>
                    <div className="mt-4">
                        {children}
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

// Modal Footer Component
export function ModalFooter({
    children,
    className
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={cn("flex items-center justify-end gap-3 mt-6 pt-6 border-t border-slate-700/50", className)}>
            {children}
        </div>
    );
}
