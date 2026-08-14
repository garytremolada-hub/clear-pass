import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import Stripe from 'npm:stripe@14.21.0';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

    // Create the overage product
    const product = await stripe.products.create({
      name: 'Clearpass Build Overage',
      description: 'Per-build charge for builds beyond the monthly fair-use allowance',
    });

    // Create a metered price: $15.00 AUD per build, monthly billing
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: 1500,
      currency: 'aud',
      recurring: {
        interval: 'month',
        usage_type: 'metered',
      },
      nickname: 'Build overage (metered)',
    });

    return Response.json({
      priceId: price.id,
      productId: product.id,
      message: 'Metered price created. Copy the priceId into createCheckoutSession and reportBuildUsage.',
    });
  } catch (error) {
    console.error('setupMeteredPrice error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}