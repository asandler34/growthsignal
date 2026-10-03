'use strict';
// Single source of truth for plans, prices and limits. Server enforcement, the pricing page and the
// product FAQ all read from here, so marketing promises cannot drift from what the product does.
// Prices are in US cents. See docs/unit-economics.md for the reasoning behind each limit.

const PLANS = {
  free: {
    id: 'free',
    name: 'Free scan',
    tagline: 'See where your website stands.',
    priceMonthly: 0,
    priceAnnual: 0,
    sites: 1,
    pagesPerScan: 6,
    manualScansPerMonth: 3,
    scheduledScan: null,
    prompts: 3,
    platforms: 1,
    repeats: 1,
    visibilityRunsPerMonth: 0, // one lifetime "first look" run per account, see freeFirstLook
    freeFirstLook: true,
    scheduledVisibility: null,
    competitors: 0,
    historyMonths: 1,
    fixKit: false,
    shareLink: false,
  },
  check: {
    id: 'check',
    name: 'Check',
    tagline: 'Monitor your foundation and your AI answers every month.',
    priceMonthly: 900,
    priceAnnual: 9000,
    sites: 1,
    pagesPerScan: 15,
    manualScansPerMonth: 5,
    scheduledScan: 'weekly',
    prompts: 5,
    platforms: 2,
    repeats: 2,
    visibilityRunsPerMonth: 1,
    scheduledVisibility: 'monthly',
    competitors: 0,
    historyMonths: 12,
    fixKit: false,
    shareLink: true,
  },
  improve: {
    id: 'improve',
    name: 'Improve',
    tagline: 'Fix what is missing and verify the change.',
    priceMonthly: 2900,
    priceAnnual: 29000,
    sites: 1,
    pagesPerScan: 30,
    manualScansPerMonth: 20,
    scheduledScan: 'weekly',
    prompts: 10,
    platforms: 3,
    repeats: 2,
    visibilityRunsPerMonth: 2,
    scheduledVisibility: 'monthly',
    competitors: 2,
    historyMonths: 24,
    fixKit: true,
    shareLink: true,
  },
  grow: {
    id: 'grow',
    name: 'Grow',
    tagline: 'Track up to three sites and your competitors, and close the gaps.',
    priceMonthly: 5900,
    priceAnnual: 59000,
    sites: 3,
    pagesPerScan: 50,
    manualScansPerMonth: 60,
    scheduledScan: 'weekly',
    prompts: 15,
    platforms: 4,
    repeats: 2,
    visibilityRunsPerMonth: 4,
    scheduledVisibility: 'biweekly',
    competitors: 5,
    historyMonths: 24,
    fixKit: true,
    shareLink: true,
  },
};

const PAID = ['check', 'improve', 'grow'];
const ACTIVE_STATUSES = ['active', 'trialing', 'past_due'];

function getPlan(id) { return PLANS[id] || PLANS.free; }

function publicPlans() {
  return Object.values(PLANS).map(p => ({ ...p }));
}

module.exports = { PLANS, PAID, ACTIVE_STATUSES, getPlan, publicPlans };
