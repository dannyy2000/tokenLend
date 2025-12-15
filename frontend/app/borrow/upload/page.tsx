import { AssetUploadFlow } from '@/components/features/AssetUploadFlow';
import { Navbar } from '@/components/layout/Navbar';

export default function UploadPage() {
    return (
        <main className="min-h-screen">
            <Navbar />
            <div className="pt-24 pb-12">
                <AssetUploadFlow />
            </div>
        </main>
    );
}
