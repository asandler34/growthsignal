'use strict';
// Central configuration. Every secret is read from the environment and stays server side.

function bool(v, d = false) {
  if (v === undefined || v === '') return d;
  return ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase());
}
function int(v, d) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : d;
}

const env = process.env;
const isProd = env.NODE_ENV === 'production';

const config = {
  isProd,
  isTest: env.NODE_ENV === 'test',
  port: int(env.PORT, 3000),
  baseUrl: (env.BASE_URL || `http://localhost:${int(env.PORT, 3000)}`).replace(/\/$/, ''),
  databaseUrl: env.DATABASE_URL || 'postgres://postgres@localhost:5432/growthsignal',
  databaseSsl: bool(env.DATABASE_SSL, false),
  // web | worker | all. "all" runs the HTTP server and the job worker in one process.
  role: env.ROLE || 'all',
  sessionSecret: env.SESSION_SECRET || (isProd ? '' : 'dev-only-session-secret-change-me'),
  operatorEmail: env.OPERATOR_EMAIL || '',
  trustProxy: bool(env.TRUST_PROXY, isProd),

  email: {
    provider: env.EMAIL_PROVIDER || (isProd ? '' : 'console'), // resend | postmark | console (dev only)
    from: env.EMAIL_FROM || 'GrowthSignal <hello@growthsignal.ai>',
    resendKey: env.RESEND_API_KEY || '',
    postmarkToken: env.POSTMARK_SERVER_TOKEN || '',
  },

  stripe: {
    secretKey: env.STRIPE_SECRET_KEY || '',
    webhookSecret: env.STRIPE_WEBHOOK_SECRET || '',
    prices: {
      check_monthly: env.STRIPE_PRICE_CHECK_MONTHLY || '',
      check_annual: env.STRIPE_PRICE_CHECK_ANNUAL || '',
      improve_monthly: env.STRIPE_PRICE_IMPROVE_MONTHLY || '',
      improve_annual: env.STRIPE_PRICE_IMPROVE_ANNUAL || '',
      grow_monthly: env.STRIPE_PRICE_GROW_MONTHLY || '',
      grow_annual: env.STRIPE_PRICE_GROW_ANNUAL || '',
    },
    // Live keys are refused unless this is explicitly enabled by the owner.
    allowLive: bool(env.STRIPE_ALLOW_LIVE, false),
  },

  ai: {
    openaiKey: env.OPENAI_API_KEY || '',
    openaiModel: env.OPENAI_MODEL || 'gpt-5-mini',
    anthropicKey: env.ANTHROPIC_API_KEY || '',
    anthropicModel: env.ANTHROPIC_MODEL || 'claude-haiku-4-5',
    geminiKey: env.GEMINI_API_KEY || '',
    geminiModel: env.GEMINI_MODEL || 'gemini-2.5-flash',
    perplexityKey: env.PERPLEXITY_API_KEY || '',
    perplexityModel: env.PERPLEXITY_MODEL || 'sonar',
    // Optional override for tests: route provider calls to a local stub server.
    baseUrlOverride: env.AI_BASE_URL_OVERRIDE || '',
    // Hard daily spend ceiling across all customers, in US cents.
    dailyBudgetCents: int(env.AI_DAILY_BUDGET_CENTS, 2000),
    timeoutMs: int(env.AI_TIMEOUT_MS, 60000),
  },

  scanner: {
    userAgent: env.SCANNER_USER_AGENT || 'GrowthSignalBot/1.0 (+https://growthsignal.ai/bot)',
    timeoutMs: int(env.SCANNER_TIMEOUT_MS, 10000),
    maxBytes: int(env.SCANNER_MAX_BYTES, 2 * 1024 * 1024),
    maxRedirects: 5,
    // Only for automated tests against local fixture servers. Never enable in production.
    allowPrivateNetworks: isProd ? false : env.SCANNER_ALLOW_PRIVATE === 'loopback' ? 'loopback' : bool(env.SCANNER_ALLOW_PRIVATE, false),
  },

  limits: {
    anonScansPerIpPerHour: int(env.ANON_SCANS_PER_IP_PER_HOUR, 5),
    anonScansPerDay: int(env.ANON_SCANS_PER_DAY, 500),
    loginEmailsPerHour: int(env.LOGIN_EMAILS_PER_HOUR, 5),
  },

  worker: {
    pollMs: int(env.WORKER_POLL_MS, 1000),
    concurrency: int(env.WORKER_CONCURRENCY, 3),
    schedulerIntervalMs: int(env.SCHEDULER_INTERVAL_MS, 10 * 60 * 1000),
  },
};

function validateForProduction() {
  const problems = [];
  if (!config.isProd) return problems;
  if (!config.sessionSecret || config.sessionSecret.length < 32) problems.push('SESSION_SECRET must be at least 32 characters');
  if (!/^https:\/\//.test(config.baseUrl)) problems.push('BASE_URL must be https in production');
  if (!config.email.provider || config.email.provider === 'console') problems.push('EMAIL_PROVIDER must be resend or postmark in production');
  if (config.stripe.secretKey.startsWith('sk_live') && !config.stripe.allowLive) problems.push('Live Stripe key present but STRIPE_ALLOW_LIVE is not set; refusing live billing');
  return problems;
}

module.exports = { config, validateForProduction };
