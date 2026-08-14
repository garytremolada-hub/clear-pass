import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

Deno.serve(async (req) => {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    let event;
    try {
        event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    try {
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;
            const userId = session.metadata?.user_id;
            const subscriptionId = session.subscription;

            if (userId && subscriptionId) {
                // Fetch subscription details
                const subscription = await stripe.subscriptions.retrieve(subscriptionId);
                const flatItem = subscription.items.data.find(
                    item => item.price.recurring?.usage_type !== 'metered'
                );
                const meteredItem = subscription.items.data.find(
                    item => item.price.recurring?.usage_type === 'metered'
                );
                const priceId = flatItem?.price?.id;
                const productId = flatItem?.price?.product;
                const meteredItemId = meteredItem?.id;

                console.log(`Subscription created for user ${userId}: ${subscriptionId}, price: ${priceId}, meteredItem: ${meteredItemId}`);

                // Update user with subscription info
                await base44.asServiceRole.entities.User.update(userId, {
                    subscription_status: 'active',
                    subscription_id: subscriptionId,
                    subscription_price_id: priceId,
                    subscription_product_id: productId,
                    metered_item_id: meteredItemId,
                });
            }
        }

        if (event.type === 'customer.subscription.deleted' || event.type === 'customer.subscription.updated') {
            const subscription = event.data.object;
            // Find user by subscription_id
            const users = await base44.asServiceRole.entities.User.filter({ subscription_id: subscription.id });
            if (users.length > 0) {
                const status = subscription.status === 'active' ? 'active' : 'inactive';
                await base44.asServiceRole.entities.User.update(users[0].id, {
                    subscription_status: status,
                });
                console.log(`Updated subscription status to ${status} for user ${users[0].id}`);
            }
        }
    } catch (err) {
        console.error('Webhook handler error:', err.message);
    }

    return Response.json({ received: true });
});