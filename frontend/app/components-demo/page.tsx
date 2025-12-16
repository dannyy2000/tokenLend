'use client';

import { useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import {
    Input,
    Select,
    Textarea,
    Button,
    Modal,
    ModalFooter,
    Badge,
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    useToast,
    ToastContainer,
    Spinner,
    LoadingState,
    LoadingButton,
} from '@/components/ui';

export default function ComponentsDemo() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { toast, toasts, removeToast } = useToast();

    const handleSubmit = () => {
        setIsLoading(true);
        setTimeout(() => {
            setIsLoading(false);
            toast.success('Form submitted successfully!');
        }, 2000);
    };

    return (
        <main className="min-h-screen">
            <Navbar />
            <div className="pt-24 pb-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h1 className="text-4xl font-bold text-white mb-8">UI Components Demo</h1>

                    {/* Toast Container */}
                    <ToastContainer toasts={toasts} onRemove={removeToast} />

                    <div className="grid gap-8">
                        {/* Form Components */}
                        <Card variant="glass">
                            <CardHeader>
                                <CardTitle>Form Components</CardTitle>
                                <CardDescription>Input, Select, and Textarea examples</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-6">
                                    <Input
                                        label="Email Address"
                                        type="email"
                                        placeholder="Enter your email"
                                        helperText="We'll never share your email"
                                        required
                                    />

                                    <Input
                                        label="Amount"
                                        type="number"
                                        placeholder="0.00"
                                        error="Amount must be greater than 0"
                                    />

                                    <Select
                                        label="Asset Type"
                                        options={[
                                            { value: 'smartphone', label: 'Smartphone' },
                                            { value: 'laptop', label: 'Laptop' },
                                            { value: 'car', label: 'Car' },
                                            { value: 'machinery', label: 'Machinery' },
                                        ]}
                                        helperText="Select the type of asset"
                                    />

                                    <Textarea
                                        label="Description"
                                        placeholder="Describe your asset..."
                                        helperText="Provide detailed information about the asset"
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Buttons & Loading */}
                        <Card variant="glass">
                            <CardHeader>
                                <CardTitle>Buttons & Loading States</CardTitle>
                                <CardDescription>Different button variants and loading indicators</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-6">
                                    <div className="flex flex-wrap gap-3">
                                        <Button>Primary Button</Button>
                                        <Button variant="secondary">Secondary</Button>
                                        <Button variant="outline">Outline</Button>
                                        <Button variant="ghost">Ghost</Button>
                                        <Button variant="destructive">Destructive</Button>
                                    </div>

                                    <div className="flex flex-wrap gap-3">
                                        <Button size="sm">Small</Button>
                                        <Button size="default">Default</Button>
                                        <Button size="lg">Large</Button>
                                    </div>

                                    <div className="flex flex-wrap gap-3 items-center">
                                        <LoadingButton
                                            isLoading={isLoading}
                                            onClick={handleSubmit}
                                        >
                                            {isLoading ? 'Submitting...' : 'Submit Form'}
                                        </LoadingButton>
                                        <Spinner size="sm" />
                                        <Spinner size="md" />
                                        <Spinner size="lg" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Badges */}
                        <Card variant="glass">
                            <CardHeader>
                                <CardTitle>Badges</CardTitle>
                                <CardDescription>Status indicators and labels</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-3">
                                    <Badge variant="default">Default</Badge>
                                    <Badge variant="success">Success</Badge>
                                    <Badge variant="error">Error</Badge>
                                    <Badge variant="warning">Warning</Badge>
                                    <Badge variant="info">Info</Badge>
                                    <Badge variant="outline">Outline</Badge>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Modal */}
                        <Card variant="glass">
                            <CardHeader>
                                <CardTitle>Modal Dialog</CardTitle>
                                <CardDescription>Popup dialog example</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button onClick={() => setIsModalOpen(true)}>
                                    Open Modal
                                </Button>

                                <Modal
                                    isOpen={isModalOpen}
                                    onClose={() => setIsModalOpen(false)}
                                    title="Confirm Action"
                                    description="Are you sure you want to proceed with this action?"
                                    size="md"
                                >
                                    <p className="text-gray-300 mb-4">
                                        This is an example modal dialog. You can put any content here.
                                    </p>
                                    <ModalFooter>
                                        <Button
                                            variant="outline"
                                            onClick={() => setIsModalOpen(false)}
                                        >
                                            Cancel
                                        </Button>
                                        <Button onClick={() => {
                                            setIsModalOpen(false);
                                            toast.success('Action confirmed!');
                                        }}>
                                            Confirm
                                        </Button>
                                    </ModalFooter>
                                </Modal>
                            </CardContent>
                        </Card>

                        {/* Toasts */}
                        <Card variant="glass">
                            <CardHeader>
                                <CardTitle>Toast Notifications</CardTitle>
                                <CardDescription>Different notification types</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-3">
                                    <Button onClick={() => toast.success('Success message!')}>
                                        Show Success
                                    </Button>
                                    <Button onClick={() => toast.error('Error occurred!')}>
                                        Show Error
                                    </Button>
                                    <Button onClick={() => toast.warning('Warning message!')}>
                                        Show Warning
                                    </Button>
                                    <Button onClick={() => toast.info('Info message!')}>
                                        Show Info
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Loading States */}
                        <Card variant="glass">
                            <CardHeader>
                                <CardTitle>Loading States</CardTitle>
                                <CardDescription>Different loading indicators</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <LoadingState message="Loading data..." />
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </main>
    );
}
