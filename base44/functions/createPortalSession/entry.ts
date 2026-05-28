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
            return Response.json({ error: 'No active subscription' }, { status: 400 });
        }

        const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
        const subscription = await stripe.subscriptions.retrieve(user.subscription_id);

        const portalSession = await stripe.billingPortal.sessions.create({
            customer: subscription.customer,
            return_url: `${req.headers.get('origin')}/pricing`,
        });

        return Response.json({ url: portalSession.url });
    } catch (error) {
        console.error('createPortalSession error:', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});