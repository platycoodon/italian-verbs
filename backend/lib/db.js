// 数据库层 — SQLite（better-sqlite3）

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', 'italian-verbs.db');

let db;

export function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initTables();
  }
  return db;
}

function initTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id         TEXT PRIMARY KEY,
      email      TEXT UNIQUE NOT NULL,
      password   TEXT NOT NULL,
      name       TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS errors (
      id              TEXT PRIMARY KEY,
      user_id         TEXT NOT NULL REFERENCES users(id),
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

    CREATE INDEX IF NOT EXISTS idx_errors_user ON errors(user_id);
  `);
}

// ── 用户 ──
export function createUser({ id, email, password, name }) {
  const stmt = getDb().prepare(
    'INSERT INTO users (id, email, password, name) VALUES (?, ?, ?, ?)'
  );
  stmt.run(id, email, password, name || '');
}

export function findUserByEmail(email) {
  return getDb().prepare('SELECT * FROM users WHERE email = ?').get(email);
}

export function findUserById(id) {
  return getDb().prepare('SELECT id, email, name, created_at FROM users WHERE id = ?').get(id);
}

// ── 错题 ──
export function getErrors(userId) {
  return getDb().prepare(
    'SELECT * FROM errors WHERE user_id = ? ORDER BY created_at DESC'
  ).all(userId);
}

export function addError({ id, userId, verbInfinitive, tenseId, tenseLabel, personId, personLabel, gender, userAnswer, correctAnswer }) {
  const stmt = getDb().prepare(
    `INSERT INTO errors (id, user_id, verb_infinitive, tense_id, tense_label, person_id, person_label, gender, user_answer, correct_answer)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  stmt.run(id, userId, verbInfinitive, tenseId, tenseLabel, personId, personLabel, gender || 'm', userAnswer, correctAnswer);
}

export function removeError(id) {
  getDb().prepare('DELETE FROM errors WHERE id = ?').run(id);
}

export function clearErrors(userId) {
  getDb().prepare('DELETE FROM errors WHERE user_id = ?').run(userId);
}
