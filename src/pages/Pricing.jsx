import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const PLANS = [
    {
        name: 'Starter',
        price: '$29',
        period: '/month',
        description: 'For individual assessors and trainers.',
        priceId: 'price_1TbuaxQ5wgeMopoEu0MnJTsf',
        features: [
            'Readability scoring (FKGL / FRE)',
            'Text rewriting to target level',
            'Assessment audit against UoC',
            'Work library (save results)',
            'AQF level mapping',
        ],
        color: '#1e3a5f',
        highlight: false,
    },
    {
        name: 'Professional',
        price: '$79',
        period: '/month',
        description: 'For RTO teams and compliance managers.',
        priceId: 'price_1TbuaxQ5wgeMopoEQlMDOwEW',
        features: [
            'Everything in Starter',
            'Assessment builder from UoC',
            'Bulk document upload',
            'Team cohort profiles',
            'Priority support',
        ],
        color: '#7c3aed',
        highlight: true,
    },
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

    const handleSubscribe = async (priceId) => {
        // Block if running inside an iframe (preview mode)
        if (window.self !== window.top) {
            alert('Checkout only works from the published app, not the preview. Please open your published app URL to subscribe.');
            return;
        }

        setLoading(priceId);
        const res = await base44.functions.invoke('createCheckoutSession', { priceId });
        if (res.data?.url) {
            window.location.href = res.data.url;
        } else {
            alert('Could not start checkout. Please try again.');
        }
        setLoading(false);
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
            <div className="max-w-4xl mx-auto">

                {/* Header */}
                <div className="text-center mb-12 space-y-3">
                    <h1 className="text-4xl font-bold text-[#1e3a5f] dark:text-foreground">Simple, transparent pricing</h1>
                    <p className="text-muted-foreground text-lg">
                        Make your assessments audit-ready. Cancel anytime.
                    </p>
                </div>

                {/* Active subscription banner */}
                {!checkingStatus && isActive && (
                    <div className="mb-8 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
                        <div>
                            <p className="font-semibold text-green-800">
                                ✓ You're on the <span className="capitalize">{subscription.plan}</span> plan
                            </p>
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

                {/* Plan cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {PLANS.map(plan => (
                        <div
                            key={plan.name}
                            className={cn(
                                'bg-white dark:bg-card rounded-2xl shadow-sm border flex flex-col',
                                plan.highlight && 'ring-2 ring-[#7c3aed]'
                            )}
                        >
                            {plan.highlight && (
                                <div className="text-center py-1.5 rounded-t-2xl text-xs font-semibold text-white" style={{ backgroundColor: plan.color }}>
                                    Most popular
                                </div>
                            )}
                            <div className="p-7 flex flex-col flex-1 space-y-6">
                                <div>
                                    <h2 className="text-xl font-bold" style={{ color: plan.color }}>{plan.name}</h2>
                                    <p className="text-muted-foreground text-sm mt-1">{plan.description}</p>
                                    <div className="mt-4 flex items-end gap-1">
                                        <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                                        <span className="text-muted-foreground mb-1">{plan.period}</span>
                                    </div>
                                </div>

                                <ul className="space-y-2.5 flex-1">
                                    {plan.features.map(f => (
                                        <li key={f} className="flex items-start gap-2 text-sm text-foreground/80">
                                            <Check className="h-4 w-4 shrink-0 mt-0.5" style={{ color: plan.color }} />
                                            {f}
                                        </li>
                                    ))}
                                </ul>

                                <Button
                                    className="w-full text-white"
                                    style={{ backgroundColor: plan.color }}
                                    disabled={loading === plan.priceId || checkingStatus}
                                    onClick={() => handleSubscribe(plan.priceId)}
                                >
                                    {loading === plan.priceId
                                        ? 'Redirecting...'
                                        : isActive && subscription.plan === plan.name.toLowerCase()
                                            ? 'Current plan'
                                            : 'Subscribe'}
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>

                <p className="text-center text-xs text-muted-foreground mt-8">
                    Payments processed securely by Stripe. Cancel anytime from your billing portal.<br />
                    Prices in USD. GST may apply for Australian customers.
                </p>
            </div>
        </div>
    );
}