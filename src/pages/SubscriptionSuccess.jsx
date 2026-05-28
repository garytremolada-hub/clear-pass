import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SubscriptionSuccess() {
    const [countdown, setCountdown] = useState(5);

    useEffect(() => {
        const timer = setInterval(() => {
            setCountdown(c => {
                if (c <= 1) {
                    clearInterval(timer);
                    window.location.href = '/';
                }
                return c - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="min-h-screen bg-background flex items-center justify-center px-4">
            <div className="max-w-md w-full text-center space-y-6">
                <div className="flex justify-center">
                    <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center">
                        <CheckCircle2 className="h-10 w-10 text-green-600" />
                    </div>
                </div>
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold text-[#1e3a5f] dark:text-foreground">You're all set!</h1>
                    <p className="text-muted-foreground">
                        Your subscription is now active. You have full access to all features.
                    </p>
                </div>
                <Button asChild className="bg-[#1e3a5f] hover:bg-[#152d4d] text-white w-full">
                    <Link to="/">Start using the tool</Link>
                </Button>
                <p className="text-xs text-muted-foreground">Redirecting in {countdown}s…</p>
            </div>
        </div>
    );
}