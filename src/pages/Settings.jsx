import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

export default function Settings() {
    const navigate = useNavigate();

    const handleLogout = () => {
        base44.auth.logout('/');
    };

    return (
        <div className="flex-1 overflow-y-auto bg-[#f6f8fb]">
            <div className="max-w-xl mx-auto px-5 py-10 space-y-6">
                <h1 className="text-2xl font-bold text-[#1e3a5f]">Settings</h1>

                <div className="bg-white rounded-2xl border shadow-sm p-6 space-y-4">
                    <h2 className="font-semibold text-[#1e3a5f]">Account</h2>
                    <Button variant="outline" onClick={() => navigate('/pricing')}>
                        Manage subscription
                    </Button>
                    <div className="pt-2 border-t">
                        <Button variant="destructive" size="sm" onClick={handleLogout}>
                            Sign out
                        </Button>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border shadow-sm p-6 space-y-2">
                    <h2 className="font-semibold text-[#1e3a5f] mb-3">About</h2>
                    <p className="text-sm text-muted-foreground">RTO Readability — AQF Assessment Tool v24</p>
                    <p className="text-xs text-muted-foreground">Scores are AI estimates. Always review with a qualified assessor before submission.</p>
                </div>
            </div>
        </div>
    );
}