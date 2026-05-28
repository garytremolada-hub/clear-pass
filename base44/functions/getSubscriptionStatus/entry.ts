import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!user.subscription_id) {
            return Response.json({ status: 'none', plan: null });
        }

        const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
        const subscription = await stripe.subscriptions.retrieve(user.subscription_id);
        const priceId = subscription.items.data[0]?.price?.id;

        const PRICE_PLANS = {
            'price_1TbuaxQ5wgeMopoEu0MnJTsf': 'starter',
            'price_1TbuaxQ5wgeMopoEQlMDOwEW': 'professional',
        };

        return Response.json({
            status: subscription.status,
            plan: PRICE_PLANS[priceId] || 'unknown',
            currentPeriodEnd: subscription.current_period_end,
        });
    } catch (error) {
        console.error('getSubscriptionStatus error:', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});