const fs = require("fs");
const path = require("path");

function ensureFile(filePath) {
  const fullPath = path.resolve(filePath);
  const dir = path.dirname(fullPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(fullPath)) {
    fs.writeFileSync(fullPath, "", "utf8");
  }
}

function writeLog(filePath, text) {
  ensureFile(filePath);
  const time = new Date().toISOString();
  fs.appendFileSync(filePath, `[${time}] ${text}\n`, "utf8");
}

function parseDurationToSeconds(input) {
  if (!input) return null;
  const text = String(input).trim().toLowerCase();
  const match = text.match(/^(\d+)([mhd])$/);
  if (!match) return null;

  const num = Number(match[1]);
  const unit = match[2];

  if (unit === "m") return num * 60;
  if (unit === "h") return num * 3600;
  if (unit === "d") return num * 86400;
  return null;
}

function formatUser(user) {
  if (!user) return "unknown";
  if (user.username) return `@${user.username}`;
  return [user.first_name, user.last_name].filter(Boolean).join(" ") || String(user.id);
}

function escapeMarkdown(text) {
  return String(text).replace(/[_*[\]()~`>#+\-=|{}.!]/g, "\\$&");
}

module.exports = {
  ensureFile,
  writeLog,
  parseDurationToSeconds,
  formatUser,
  escapeMarkdown,
};