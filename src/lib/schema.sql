-- LifeScore schema. Plain SQL, portable to Postgres with minimal edits.
-- All timestamps are ISO-8601 UTC strings. All "day" columns are 'YYYY-MM-DD'
-- in the *user's* local timezone, computed server-side at write time so that
-- streaks and daily totals match what the user actually experienced.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  avatar_hue    INTEGER NOT NULL DEFAULT 250,
  timezone      TEXT NOT NULL DEFAULT 'UTC',
  is_admin      INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- ---------------------------------------------------------------------------
-- Global activity taxonomy. This is the shared vocabulary: one row per
-- canonical activity, hierarchical via parent_id.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS activities (
  id               TEXT PRIMARY KEY,          -- ACT_00123
  name             TEXT NOT NULL,
  slug             TEXT NOT NULL UNIQUE,
  parent_id        TEXT REFERENCES activities(id) ON DELETE SET NULL,
  category         TEXT NOT NULL,             -- top-level category slug
  base_xp_per_hour REAL NOT NULL,
  unit             TEXT NOT NULL DEFAULT 'hour',
  icon             TEXT NOT NULL DEFAULT '✨',
  description      TEXT NOT NULL DEFAULT '',
  keywords         TEXT NOT NULL DEFAULT '',  -- space-separated, for matching
  status           TEXT NOT NULL DEFAULT 'active',  -- active | proposed | merged | disabled
  merged_into      TEXT REFERENCES activities(id) ON DELETE SET NULL,
  scoring_version  INTEGER NOT NULL DEFAULT 1,
  origin           TEXT NOT NULL DEFAULT 'seed',    -- seed | derived
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_activities_parent   ON activities(parent_id);
CREATE INDEX IF NOT EXISTS idx_activities_category ON activities(category);
CREATE INDEX IF NOT EXISTS idx_activities_status   ON activities(status);

-- Alternate names that map onto a canonical activity. The cheapest hit in the
-- resolver cascade after an exact slug/name match.
CREATE TABLE IF NOT EXISTS activity_aliases (
  alias       TEXT PRIMARY KEY,               -- normalized text
  activity_id TEXT NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  source      TEXT NOT NULL DEFAULT 'seed',   -- seed | llm | admin
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_aliases_activity ON activity_aliases(activity_id);

-- Per-user phrasing memory. Improves classification only; never affects XP.
CREATE TABLE IF NOT EXISTS user_activity_memory (
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  phrase      TEXT NOT NULL,                  -- stemmed tokens, space-joined
  activity_id TEXT NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  hits        INTEGER NOT NULL DEFAULT 1,
  last_used   TEXT NOT NULL,
  PRIMARY KEY (user_id, phrase)
);
CREATE INDEX IF NOT EXISTS idx_memory_user ON user_activity_memory(user_id);

-- ---------------------------------------------------------------------------
-- Activity logs: the actual scored entries. XP is written by the server only.
-- base_xp_per_hour and scoring_version are SNAPSHOTS taken at scoring time, so
-- historical entries never change when the taxonomy is re-priced.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS activity_logs (
  id                     TEXT PRIMARY KEY,
  user_id                TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_id            TEXT NOT NULL REFERENCES activities(id),
  raw_text               TEXT NOT NULL,
  duration_minutes       INTEGER NOT NULL,
  xp                     INTEGER NOT NULL,
  base_xp_per_hour       REAL NOT NULL,
  scoring_version        INTEGER NOT NULL,
  resolution_method      TEXT NOT NULL,       -- exact | alias | memory | keyword | llm | manual
  confidence             REAL NOT NULL DEFAULT 1.0,
  local_day              TEXT NOT NULL,       -- YYYY-MM-DD in user's timezone
  created_at             TEXT NOT NULL,
  updated_at             TEXT NOT NULL
);
-- Leaderboards and dashboards are all (user, day) range scans.
CREATE INDEX IF NOT EXISTS idx_logs_user_day    ON activity_logs(user_id, local_day);
CREATE INDEX IF NOT EXISTS idx_logs_day         ON activity_logs(local_day);
CREATE INDEX IF NOT EXISTS idx_logs_user_created ON activity_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_activity    ON activity_logs(activity_id);

-- ---------------------------------------------------------------------------
-- Groups
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS groups (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  invite_code TEXT NOT NULL UNIQUE,
  owner_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji       TEXT NOT NULL DEFAULT '🏆',
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS group_members (
  group_id  TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role      TEXT NOT NULL DEFAULT 'member',   -- owner | member
  joined_at TEXT NOT NULL,
  PRIMARY KEY (group_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_gm_user  ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_gm_group ON group_members(group_id);

-- ---------------------------------------------------------------------------
-- Achievements
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_achievements (
  user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,
  earned_at      TEXT NOT NULL,
  PRIMARY KEY (user_id, achievement_id)
);

-- Activities the resolver wanted but couldn't confidently place. Reviewed by an
-- admin; nothing is scored from this table.
CREATE TABLE IF NOT EXISTS proposed_activities (
  id          TEXT PRIMARY KEY,
  raw_text    TEXT NOT NULL,
  suggested_name TEXT NOT NULL,
  parent_id   TEXT REFERENCES activities(id) ON DELETE SET NULL,
  user_id     TEXT REFERENCES users(id) ON DELETE SET NULL,
  status      TEXT NOT NULL DEFAULT 'pending',
  created_at  TEXT NOT NULL
);
