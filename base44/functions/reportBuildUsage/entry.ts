import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import Stripe from 'npm:stripe@14.21.0';
import { FAIR_USE_ALLOWANCE } from '../../shared/billingConfig.js';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Find or create usage record for this user + billing period
    const existing = await base44.asServiceRole.entities.BuildUsage.filter({
      user_id: user.id,
      period,
    });

    let count, chargedCount;

    if (existing.length > 0) {
      const usage = existing[0];
      count = usage.count + 1;
      chargedCount = count > FAIR_USE_ALLOWANCE ? usage.charged_count + 1 : usage.charged_count;

      await base44.asServiceRole.entities.BuildUsage.update(usage.id, {
        count,
        charged_count: chargedCount,
      });
    } else {
      count = 1;
      chargedCount = count > FAIR_USE_ALLOWANCE ? 1 : 0;

      await base44.asServiceRole.entities.BuildUsage.create({
        user_id: user.id,
        period,
        count,
        charged_count: chargedCount,
      });
    }

    // Report overage to Stripe metered billing
    if (count > FAIR_USE_ALLOWANCE && user.metered_item_id) {
      try {
        const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
        await stripe.subscriptionItems.createUsageRecord(user.metered_item_id, {
          quantity: 1,
          action: 'increment',
        });
      } catch (stripeErr) {
        console.error('Stripe usage report failed:', stripeErr.message);
        // Non-blocking — usage is still tracked in the DB
      }
    }

    const remaining = Math.max(0, FAIR_USE_ALLOWANCE - count);
    const overage = Math.max(0, count - FAIR_USE_ALLOWANCE);

    return Response.json({
      count,
      allowance: FAIR_USE_ALLOWANCE,
      remaining,
      overage,
      metered: count > FAIR_USE_ALLOWANCE,
    });
  } catch (error) {
    console.error('reportBuildUsage error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}