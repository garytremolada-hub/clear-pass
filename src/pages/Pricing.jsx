import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PRICE_ID = 'price_1TbueJQ5wgeMopoE3lOl0XzB';

const FEATURES = [
    'Readability scoring (Grade Level & Reading Ease)',
    'Text rewriting to any AQF target level',
    'Assessment audit against Unit of Competency',
    'Assessment builder from UoC (10 builds/month included)',
    'Work library — save and revisit results',
    'AQF level 1–10 mapping',
    'Cohort profile customisation',
    'Unlimited sessions',
];

export default function Pricing() {
    const [loading, setLoading] = useState(false);
    const [portalLoading, setPortalLoading] = useState(false);
    const [subscription, setSubscription] = useState(null);
    const [checkingStatus, setCheckingStatus] = useState(true);

    useEffect(() => {
        base44.functions.invoke('getSubscriptionStatus', {})
            .then(res => setSubscription(res.data))
            .catch(() => setSubscription(null))
            .finally(() => setCheckingStatus(false));
    }, []);

    const handleSubscribe = async () => {
        if (window.self !== window.top) {
            alert('Checkout only works from the published app, not the preview. Please open your published app URL to subscribe.');
            return;
        }
        setLoading(true);
        const res = await base44.functions.invoke('createCheckoutSession', { priceId: PRICE_ID });
        if (res.data?.url) {
            window.location.href = res.data.url;
        } else {
            alert('Could not start checkout. Please try again.');
            setLoading(false);
        }
    };

    const handleManageBilling = async () => {
        if (window.self !== window.top) {
            alert('Billing portal only works from the published app.');
            return;
        }
        setPortalLoading(true);
        const res = await base44.functions.invoke('createPortalSession', {});
        if (res.data?.url) {
            window.location.href = res.data.url;
        }
        setPortalLoading(false);
    };

    const isActive = subscription?.status === 'active';

    return (
        <div className="min-h-screen bg-background py-16 px-4">
            <div className="max-w-lg mx-auto">

                {/* Header */}
                <div className="text-center mb-10 space-y-3">
                    <h1 className="text-4xl font-bold text-[#1e3a5f] dark:text-foreground">Full Access</h1>
                    <p className="text-muted-foreground text-base">
                        Everything you need to make your assessments audit-ready.
                    </p>
                </div>

                {/* Active subscription banner */}
                {!checkingStatus && isActive && (
                    <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
                        <div>
                            <p className="font-semibold text-green-800">✓ Your subscription is active</p>
                            <p className="text-sm text-green-700">
                                Renews {new Date(subscription.currentPeriodEnd * 1000).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleManageBilling}
                            disabled={portalLoading}
                            className="border-green-600 text-green-700 hover:bg-green-50"
                        >
                            {portalLoading ? 'Loading...' : 'Manage billing'}
                        </Button>
                    </div>
                )}

                {/* Plan card */}
                <div className="bg-white dark:bg-card rounded-2xl shadow-sm border-2 border-[#1e3a5f] overflow-hidden">
                    <div className="p-8 space-y-7">
                        {/* Price */}
                        <div className="text-center">
                            <div className="flex items-end justify-center gap-1">
                                <span className="text-5xl font-bold text-[#1e3a5f] dark:text-foreground">$200</span>
                                <span className="text-muted-foreground mb-1.5 text-lg">AUD / month</span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">Cancel anytime</p>
                            <p className="text-xs text-muted-foreground mt-2">$15 per additional build beyond 10</p>
                        </div>

                        {/* Features */}
                        <ul className="space-y-3">
                            {FEATURES.map(f => (
                                <li key={f} className="flex items-start gap-3 text-sm text-foreground/80">
                                    <Check className="h-4 w-4 shrink-0 mt-0.5 text-[#1e3a5f]" />
                                    {f}
                                </li>
                            ))}
                        </ul>

                        {/* CTA */}
                        <Button
                            className="w-full bg-[#1e3a5f] hover:bg-[#152d4d] text-white h-12 text-base"
                            disabled={loading || checkingStatus || isActive}
                            onClick={handleSubscribe}
                        >
                            {loading ? 'Redirecting to checkout...' : isActive ? 'Already subscribed' : 'Subscribe now'}
                        </Button>
                    </div>
                </div>

                <p className="text-center text-xs text-muted-foreground mt-6">
                    Payments processed securely by Stripe.<br />
                    Price is in Australian Dollars (AUD). GST included.
                </p>
            </div>
        </div>
    );
}