import { LenderDashboard } from '@/components/features/LenderDashboard';
import { Navbar } from '@/components/layout/Navbar';

export default function LendPage() {
    return (
        <main className="min-h-screen">
            <Navbar />
            <div className="pt-24 pb-12">
                <LenderDashboard />
            </div>
        </main>
    );
}
