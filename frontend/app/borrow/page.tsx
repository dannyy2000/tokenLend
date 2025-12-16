import { BorrowerDashboard } from '@/components/features/BorrowerDashboard';
import { Navbar } from '@/components/layout/Navbar';

export default function BorrowPage() {
    return (
        <main className="min-h-screen">
            <Navbar />
            <div className="pt-24 pb-12">
                <BorrowerDashboard />
            </div>
        </main>
    );
}
