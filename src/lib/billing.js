'use strict';
// Stripe Checkout for new subscriptions, Stripe Customer Portal for changes and cancellation, and a
// verified, idempotent webhook that is the only writer of subscription state.
const Stripe = require('stripe');
const db = require('../db');
const { config } = require('../config');
const log = require('./log');
const { PAID } = require('./plans');
const { sendEmail } = require('./email');

let client = null;
function stripe() {
  if (!config.stripe.secretKey) return null;
  if (config.stripe.secretKey.startsWith('sk_live') && !config.stripe.allowLive) return null;
  if (!client) client = new Stripe(config.stripe.secretKey, { maxNetworkRetries: 2, timeout: 20000 });
  return client;
}
function billingStatus() {
  const k = config.stripe.secretKey;
  if (!k) return { enabled: false, reason: 'Stripe is not configured yet.' };
  if (k.startsWith('sk_live') && !config.stripe.allowLive) return { enabled: false, reason: 'Live billing is locked until the owner authorizes it.' };
  const missing = Object.entries(config.stripe.prices).filter(([, v]) => !v).map(([k2]) => k2);
  return { enabled: true, mode: k.startsWith('sk_live') ? 'live' : 'test', missingPrices: missing, webhookConfigured: !!config.stripe.webhookSecret };
}

function priceToPlan(priceId) {
  for (const [key, val] of Object.entries(config.stripe.prices)) {
    if (val && val === priceId) { const [plan, interval] = key.split('_'); return { plan, interval: interval === 'annual' ? 'year' : 'month' }; }
  }
  return null;
}

async function ensureCustomer(user) {
  if (user.stripe_customer_id) return user.stripe_customer_id;
  const s = stripe();
  const customer = await s.customers.create({ email: user.email, metadata: { user_id: user.id } }, { idempotencyKey: `customer-${user.id}` });
  await db.query('UPDATE users SET stripe_customer_id = $2 WHERE id = $1 AND stripe_customer_id IS NULL', [user.id, customer.id]);
  const fresh = await db.one('SELECT stripe_customer_id FROM users WHERE id = $1', [user.id]);
  return fresh.stripe_customer_id;
}

async function createCheckout(user, plan, interval) {
  const s = stripe();
  if (!s) throw Object.assign(new Error(billingStatus().reason), { status: 503 });
  if (!PAID.includes(plan)) throw Object.assign(new Error('Unknown plan'), { status: 400 });
  const price = config.stripe.prices[`${plan}_${interval === 'annual' ? 'annual' : 'monthly'}`];
  if (!price) throw Object.assign(new Error('This plan is not available for purchase yet.'), { status: 503 });
  const existing = await db.one(`SELECT 1 FROM subscriptions WHERE user_id = $1 AND status IN ('active','trialing','past_due')`, [user.id]);
  if (existing) return { portal: true, url: await createPortal(user) };
  const customer = await ensureCustomer(user);
  const session = await s.checkout.sessions.create({
    mode: 'subscription',
    customer,
    client_reference_id: user.id,
    line_items: [{ price, quantity: 1 }],
    subscription_data: { metadata: { user_id: user.id, plan } },
    allow_promotion_codes: true,
    billing_address_collection: 'auto',
    success_url: `${config.baseUrl}/app?checkout=success`,
    cancel_url: `${config.baseUrl}/app/billing?checkout=canceled`,
  });
  return { url: session.url };
}

async function createPortal(user) {
  const s = stripe();
  if (!s) throw Object.assign(new Error(billingStatus().reason), { status: 503 });
  if (!user.stripe_customer_id) throw Object.assign(new Error('No billing account yet.'), { status: 400 });
  const session = await s.billingPortal.sessions.create({ customer: user.stripe_customer_id, return_url: `${config.baseUrl}/app/billing` });
  return session.url;
}

function verifyEvent(rawBody, signature) {
  if (!config.stripe.webhookSecret) throw Object.assign(new Error('Webhook secret not configured'), { status: 503 });
  // constructEvent checks the HMAC signature and a 5 minute timestamp tolerance.
  return Stripe.webhooks.constructEvent(rawBody, signature, config.stripe.webhookSecret);
}

async function handleEvent(event) {
  const fresh = await db.one('INSERT INTO stripe_events (id, type) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING RETURNING id', [event.id, event.type]);
  if (!fresh) {
    const prior = await db.one('SELECT processed_at FROM stripe_events WHERE id = $1', [event.id]);
    if (prior && prior.processed_at) return { duplicate: true };
  }
  try {
    await processEvent(event);
    await db.query('UPDATE stripe_events SET processed_at = now(), error = NULL WHERE id = $1', [event.id]);
    return { processed: true };
  } catch (e) {
    await db.query('UPDATE stripe_events SET error = $2 WHERE id = $1', [event.id, e.message.slice(0, 500)]);
    throw e;
  }
}

async function userForCustomer(customerId, metaUserId) {
  let user = customerId ? await db.one('SELECT * FROM users WHERE stripe_customer_id = $1', [customerId]) : null;
  if (!user && metaUserId && /^[0-9a-f-]{36}$/i.test(metaUserId)) {
    user = await db.one('SELECT * FROM users WHERE id = $1', [metaUserId]);
    if (user && customerId && !user.stripe_customer_id) {
      await db.query('UPDATE users SET stripe_customer_id = $2 WHERE id = $1', [user.id, customerId]);
      user.stripe_customer_id = customerId;
    }
  }
  return user;
}

async function processEvent(event) {
  const obj = event.data.object;
  switch (event.type) {
    case 'checkout.session.completed': {
      if (obj.mode !== 'subscription') return;
      await userForCustomer(obj.customer, obj.client_reference_id);
      return;
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const user = await userForCustomer(obj.customer, obj.metadata && obj.metadata.user_id);
      if (!user) { log.warn('billing.unknown_customer', { customer: obj.customer, event: event.id }); return; }
      const item = obj.items && obj.items.data && obj.items.data[0];
      const mapped = item ? priceToPlan(item.price.id) : null;
      const plan = mapped ? mapped.plan : (obj.metadata && PAID.includes(obj.metadata.plan) ? obj.metadata.plan : null);
      if (!plan) { log.warn('billing.unknown_price', { price: item && item.price.id, event: event.id }); return; }
      const periodEnd = obj.current_period_end || (item && item.current_period_end) || null;
      const status = event.type === 'customer.subscription.deleted' ? 'canceled' : obj.status;
      const prev = await db.one('SELECT * FROM subscriptions WHERE stripe_subscription_id = $1', [obj.id]);
      const res = await db.one(
        `INSERT INTO subscriptions (stripe_subscription_id, user_id, plan, interval, status, current_period_end, cancel_at_period_end, last_event_created, updated_at)
         VALUES ($1,$2,$3,$4,$5,to_timestamp($6),$7,$8, now())
         ON CONFLICT (stripe_subscription_id) DO UPDATE SET plan = EXCLUDED.plan, interval = EXCLUDED.interval, status = EXCLUDED.status,
           current_period_end = EXCLUDED.current_period_end, cancel_at_period_end = EXCLUDED.cancel_at_period_end,
           last_event_created = EXCLUDED.last_event_created, updated_at = now()
         WHERE subscriptions.last_event_created <= EXCLUDED.last_event_created
         RETURNING *`,
        [obj.id, user.id, plan, mapped ? mapped.interval : (item && item.price.recurring && item.price.recurring.interval) || null, status, periodEnd, !!obj.cancel_at_period_end, event.created]);
      if (!res) return; // stale, out of order event
      const link = `${config.baseUrl}/app`;
      const planName = plan.charAt(0).toUpperCase() + plan.slice(1);
      if ((!prev || !['active', 'trialing'].includes(prev.status)) && ['active', 'trialing'].includes(status)) {
        await sendEmail(user.email, 'subscription_started', { plan: planName, link }).catch(() => {});
        await require('../jobs/handlers').startPaidMonitoring(user.id).catch(e => log.warn('billing.start_monitoring_failed', { error: e.message }));
      }
      const endsAt = periodEnd ? new Date(periodEnd * 1000).toDateString() : null;
      if (status === 'canceled' && prev && prev.status !== 'canceled') await sendEmail(user.email, 'subscription_canceled', { link, endsAt: null }).catch(() => {});
      else if (obj.cancel_at_period_end && !(prev && prev.cancel_at_period_end)) await sendEmail(user.email, 'subscription_canceled', { link, endsAt }).catch(() => {});
      return;
    }
    case 'invoice.payment_failed':
      log.warn('billing.payment_failed', { customer: obj.customer, invoice: obj.id });
      return;
    default:
      return;
  }
}

module.exports = { stripe, billingStatus, createCheckout, createPortal, verifyEvent, handleEvent, priceToPlan };
