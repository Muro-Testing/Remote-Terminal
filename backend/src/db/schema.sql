CREATE TABLE IF NOT EXISTS executions (
  id TEXT PRIMARY KEY,
  command TEXT NOT NULL,
  cwd TEXT,
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
  exit_code INTEGER,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  created_by TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS execution_logs (
  id TEXT PRIMARY KEY,
  execution_id TEXT NOT NULL,
  stream TEXT NOT NULL CHECK (stream IN ('stdout', 'stderr', 'system')),
  chunk TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (execution_id) REFERENCES executions (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  metadata_json TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  actor_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  revoked_at TEXT
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  repo_url TEXT NOT NULL,
  branch TEXT,
  local_path TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE INDEX IF NOT EXISTS idx_execution_logs_execution_id
ON execution_logs (execution_id);

CREATE INDEX IF NOT EXISTS idx_executions_started_at
ON executions (started_at DESC);

CREATE INDEX IF NOT EXISTS idx_sessions_expires_at
ON sessions (expires_at DESC);

CREATE INDEX IF NOT EXISTS idx_projects_updated_at
ON projects (updated_at DESC);
