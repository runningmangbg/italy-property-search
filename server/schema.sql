CREATE TABLE IF NOT EXISTS properties (
  id text PRIMARY KEY,
  data jsonb NOT NULL,
  content_hash text NOT NULL,
  imported_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS property_snapshots (
  id bigserial PRIMARY KEY,
  property_id text NOT NULL REFERENCES properties(id),
  source_revision text NOT NULL,
  observed_at timestamptz NOT NULL,
  data jsonb NOT NULL,
  content_hash text NOT NULL,
  UNIQUE(property_id, source_revision, content_hash)
);
CREATE TABLE IF NOT EXISTS decisions (
  property_id text PRIMARY KEY REFERENCES properties(id),
  status text NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Interested', 'On hold', 'Closed')),
  favourite boolean NOT NULL DEFAULT false,
  revision integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS feedback_events (
  id bigserial PRIMARY KEY,
  request_id uuid NOT NULL UNIQUE,
  property_id text NOT NULL REFERENCES properties(id),
  revision integer NOT NULL,
  previous_status text NOT NULL,
  status text NOT NULL,
  favourite boolean NOT NULL,
  comment text NOT NULL DEFAULT '',
  actor_id text NOT NULL,
  actor_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS feedback_property_history ON feedback_events(property_id, id DESC);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash text PRIMARY KEY,
  user_id text NOT NULL,
  user_name text NOT NULL,
  csrf text NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS media (
  property_id text NOT NULL REFERENCES properties(id),
  image_index integer NOT NULL,
  mime_type text NOT NULL,
  bytes bytea NOT NULL,
  content_hash text NOT NULL,
  PRIMARY KEY(property_id, image_index)
);
CREATE TABLE IF NOT EXISTS project_meta (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS import_runs (
  source_revision text PRIMARY KEY,
  imported_at timestamptz NOT NULL DEFAULT now(),
  property_count integer NOT NULL,
  manifest_hash text NOT NULL
);
