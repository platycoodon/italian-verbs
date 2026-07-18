// Cloudflare D1 数据库 schema
// 在 wrangler 中执行：npx wrangler d1 execute italian-verbs-db --file=schema.sql

DROP TABLE IF EXISTS errors;
DROP TABLE IF EXISTS users;

CREATE TABLE IF NOT EXISTS users (
  id         TEXT PRIMARY KEY,
  email      TEXT UNIQUE NOT NULL,
  password   TEXT NOT NULL,
  name       TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS errors (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL,
  verb_infinitive TEXT NOT NULL,
  tense_id        TEXT NOT NULL,
  tense_label     TEXT NOT NULL,
  person_id       TEXT NOT NULL,
  person_label    TEXT NOT NULL,
  gender          TEXT DEFAULT 'm',
  user_answer     TEXT NOT NULL,
  correct_answer  TEXT NOT NULL,
  created_at      TEXT DEFAULT (datetime('now')),
  reviewed_at     TEXT
);

CREATE INDEX idx_errors_user ON errors(user_id);
