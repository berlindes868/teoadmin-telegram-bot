const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");
const { DB_FILE } = require("./config");

const dbPath = path.resolve(DB_FILE);
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

db.exec(`
CREATE TABLE IF NOT EXISTS violations (
  chat_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (chat_id, user_id)
);

CREATE TABLE IF NOT EXISTS whitelist_users (
  chat_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  added_by TEXT,
  added_at TEXT NOT NULL,
  PRIMARY KEY (chat_id, user_id)
);

CREATE TABLE IF NOT EXISTS settings (
  chat_id TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  PRIMARY KEY (chat_id, key)
);

CREATE TABLE IF NOT EXISTS member_joins (
  chat_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  joined_at INTEGER NOT NULL,
  PRIMARY KEY (chat_id, user_id)
);

CREATE TABLE IF NOT EXISTS admin_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id TEXT NOT NULL,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  target TEXT,
  detail TEXT,
  created_at TEXT NOT NULL
);
`);

function nowIso() {
  return new Date().toISOString();
}

function getViolationCount(chatId, userId) {
  const row = db
    .prepare(`SELECT count FROM violations WHERE chat_id = ? AND user_id = ?`)
    .get(String(chatId), String(userId));
  return row ? row.count : 0;
}

function increaseViolation(chatId, userId) {
  const current = getViolationCount(chatId, userId);
  const next = current + 1;

  db.prepare(`
    INSERT INTO violations (chat_id, user_id, count, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(chat_id, user_id)
    DO UPDATE SET count = excluded.count, updated_at = excluded.updated_at
  `).run(String(chatId), String(userId), next, nowIso());

  return next;
}

function resetViolation(chatId, userId) {
  db.prepare(`DELETE FROM violations WHERE chat_id = ? AND user_id = ?`)
    .run(String(chatId), String(userId));
}

function addWhitelistUser(chatId, userId, addedBy) {
  db.prepare(`
    INSERT INTO whitelist_users (chat_id, user_id, added_by, added_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(chat_id, user_id)
    DO NOTHING
  `).run(String(chatId), String(userId), String(addedBy || ""), nowIso());
}

function removeWhitelistUser(chatId, userId) {
  db.prepare(`DELETE FROM whitelist_users WHERE chat_id = ? AND user_id = ?`)
    .run(String(chatId), String(userId));
}

function isWhitelisted(chatId, userId) {
  const row = db.prepare(`
    SELECT 1 FROM whitelist_users WHERE chat_id = ? AND user_id = ?
  `).get(String(chatId), String(userId));
  return !!row;
}

function listWhitelisted(chatId) {
  return db.prepare(`
    SELECT user_id, added_by, added_at
    FROM whitelist_users
    WHERE chat_id = ?
    ORDER BY added_at DESC
  `).all(String(chatId));
}

function setJoinTime(chatId, userId, joinedAt) {
  db.prepare(`
    INSERT INTO member_joins (chat_id, user_id, joined_at)
    VALUES (?, ?, ?)
    ON CONFLICT(chat_id, user_id)
    DO UPDATE SET joined_at = excluded.joined_at
  `).run(String(chatId), String(userId), joinedAt);
}

function getJoinTime(chatId, userId) {
  const row = db.prepare(`
    SELECT joined_at FROM member_joins
    WHERE chat_id = ? AND user_id = ?
  `).get(String(chatId), String(userId));
  return row ? row.joined_at : null;
}

function setSetting(chatId, key, value) {
  db.prepare(`
    INSERT INTO settings (chat_id, key, value)
    VALUES (?, ?, ?)
    ON CONFLICT(chat_id, key)
    DO UPDATE SET value = excluded.value
  `).run(String(chatId), key, String(value));
}

function getSetting(chatId, key, defaultValue = null) {
  const row = db.prepare(`
    SELECT value FROM settings WHERE chat_id = ? AND key = ?
  `).get(String(chatId), key);
  return row ? row.value : defaultValue;
}

function addAdminLog(chatId, actor, action, target = "", detail = "") {
  db.prepare(`
    INSERT INTO admin_logs (chat_id, actor, action, target, detail, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(String(chatId), actor, action, target, detail, nowIso());
}

function getRecentAdminLogs(chatId, limit = 10) {
  return db.prepare(`
    SELECT actor, action, target, detail, created_at
    FROM admin_logs
    WHERE chat_id = ?
    ORDER BY id DESC
    LIMIT ?
  `).all(String(chatId), limit);
}

module.exports = {
  db,
  getViolationCount,
  increaseViolation,
  resetViolation,
  addWhitelistUser,
  removeWhitelistUser,
  isWhitelisted,
  listWhitelisted,
  setJoinTime,
  getJoinTime,
  setSetting,
  getSetting,
  addAdminLog,
  getRecentAdminLogs,
};