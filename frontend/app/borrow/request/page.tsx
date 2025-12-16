import { LoanRequestForm } from '@/components/features/LoanRequestForm';
import { Navbar } from '@/components/layout/Navbar';

export default function LoanRequestPage() {
    return (
        <main className="min-h-screen">
            <Navbar />
            <div className="pt-24 pb-12">
                <LoanRequestForm />
            </div>
        </main>
    );
}
