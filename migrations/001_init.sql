-- Initial schema for the Mani World CRM persistence layer.
--
-- Each domain module keeps its state as a JSONB blob keyed by id (see
-- src/modules/postgresRepository.ts), so no per-field columns are required
-- and the schema stays in sync with src/types/domain.ts automatically.
-- Apply against Postgres or Supabase (Supabase is Postgres-compatible).

CREATE TABLE IF NOT EXISTS leads (
  id text PRIMARY KEY,
  data jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS message_scripts (
  id text PRIMARY KEY,
  data jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS video_sessions (
  id text PRIMARY KEY,
  data jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS channel_registry (
  id text PRIMARY KEY,
  data jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS interaction_log (
  id text PRIMARY KEY,
  data jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Encrypted integration credentials (Twilio, WhatsApp, Telegram, Vapi, Zoom,
-- Apollo, ...). Field values are AES-256-GCM encrypted by the application
-- layer (src/modules/credentialsStore.ts) before being stored here, so this
-- table never holds plaintext secrets.
CREATE TABLE IF NOT EXISTS integration_credentials (
  id text PRIMARY KEY,
  data jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Manager-defined markets on top of the 5 built-in MarketType values, so a
-- new business line can be added from the dashboard without a code change
-- (see src/modules/marketRegistry.ts).
CREATE TABLE IF NOT EXISTS custom_markets (
  id text PRIMARY KEY,
  data jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
