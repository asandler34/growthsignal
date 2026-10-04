-- GrowthSignal initial schema
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz,
  stripe_customer_id text UNIQUE,
  free_visibility_used_at timestamptz,
  email_opt_out boolean NOT NULL DEFAULT false
);

CREATE TABLE login_tokens (
  token_hash text PRIMARY KEY,
  email text NOT NULL,
  next_path text,
  claim_scan_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  used_at timestamptz
);
CREATE INDEX login_tokens_email_idx ON login_tokens (email, created_at);

CREATE TABLE sessions (
  id_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);
CREATE INDEX sessions_user_idx ON sessions (user_id);

CREATE TABLE sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url text NOT NULL,
  domain text NOT NULL,
  business_name text,
  category text,
  city text,
  region text,
  country text NOT NULL DEFAULT 'US',
  services text[] NOT NULL DEFAULT '{}',
  facts jsonb NOT NULL DEFAULT '{}'::jsonb,
  facts_confirmed_at timestamptz,
  verification_token text NOT NULL DEFAULT encode(gen_random_bytes(12), 'hex'),
  verified_at timestamptz,
  share_token text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  UNIQUE (user_id, domain)
);

CREATE TABLE prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  text text NOT NULL,
  intent text NOT NULL DEFAULT 'discovery',
  source text NOT NULL DEFAULT 'generated', -- generated | owner
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX prompts_site_idx ON prompts (site_id);

CREATE TABLE competitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  name text NOT NULL,
  domain text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid REFERENCES sites(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'preview', -- preview | account | scheduled
  url text NOT NULL,
  domain text NOT NULL,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'queued', -- queued | running | complete | failed
  progress jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text,
  score integer,
  report jsonb,
  requester_ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz
);
CREATE INDEX scans_site_idx ON scans (site_id, created_at DESC);
CREATE INDEX scans_user_idx ON scans (user_id, created_at DESC);

CREATE TABLE visibility_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trigger text NOT NULL DEFAULT 'manual', -- manual | scheduled | free
  status text NOT NULL DEFAULT 'queued',
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  summary jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX visibility_runs_site_idx ON visibility_runs (site_id, created_at DESC);

CREATE TABLE visibility_samples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES visibility_runs(id) ON DELETE CASCADE,
  provider text NOT NULL,
  model text,
  prompt text NOT NULL,
  intent text NOT NULL DEFAULT 'discovery',
  repeat_index integer NOT NULL DEFAULT 0,
  location jsonb,
  status text NOT NULL, -- ok | unavailable | error
  answer_excerpt text,
  citations jsonb NOT NULL DEFAULT '[]'::jsonb,
  mentioned boolean,
  cited boolean,
  competitor_mentions jsonb NOT NULL DEFAULT '[]'::jsonb,
  error text,
  cost_cents numeric(10,4) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX visibility_samples_run_idx ON visibility_samples (run_id);

CREATE TABLE subscriptions (
  stripe_subscription_id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan text NOT NULL,
  interval text,
  status text NOT NULL,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_event_created bigint NOT NULL DEFAULT 0
);
CREATE INDEX subscriptions_user_idx ON subscriptions (user_id);

CREATE TABLE stripe_events (
  id text PRIMARY KEY,
  type text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  error text
);

CREATE TABLE usage_counters (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period text NOT NULL, -- YYYY-MM
  metric text NOT NULL,
  count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, period, metric)
);

CREATE TABLE ai_spend (
  day date PRIMARY KEY,
  cents numeric(12,4) NOT NULL DEFAULT 0
);

CREATE TABLE rate_limits (
  key text NOT NULL,
  window_start timestamptz NOT NULL,
  count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (key, window_start)
);

CREATE TABLE jobs (
  id bigserial PRIMARY KEY,
  type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'queued', -- queued | running | done | failed
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 3,
  run_at timestamptz NOT NULL DEFAULT now(),
  locked_until timestamptz,
  last_error text,
  dedupe_key text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX jobs_ready_idx ON jobs (status, run_at);

CREATE TABLE inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  email text NOT NULL,
  website text,
  topic text,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE email_log (
  id bigserial PRIMARY KEY,
  to_email text NOT NULL,
  template text NOT NULL,
  status text NOT NULL,
  provider_id text,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
