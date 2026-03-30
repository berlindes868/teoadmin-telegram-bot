module.exports = {
  BOT_NAME: "Guard Bot",

  ALLOWED_DOMAINS: [
    "t.me/BAOCODE8K2026",
    "t.me/aviator8kbet",
  ],

  ALLOWED_USERNAMES: [
    "@aviator8kbet",
    "@BAOCODE8K2026",
    "@TEOADMIN_BOT",
  ],

  BLACKLIST_KEYWORDS: [
    "kiếm tiền nhanh",
    "join nhóm này",
    "liên hệ telegram khác",
    "kết bạn zalo",
    "sex",
    "cờ bạc",
  ],

  FAQ: {
    "quy định": "Quy định nhóm: không spam, không gửi link ngoài, không quảng cáo nhóm khác, không kéo member.",
    "luật nhóm": "Luật nhóm: không spam, không gửi link ngoài, không quảng cáo nhóm khác, không kéo member.",
    "admin": "Nếu cần hỗ trợ, vui lòng liên hệ admin của nhóm.",
    "hỗ trợ": "Nếu cần hỗ trợ, hãy nhắn admin.",
    "vì sao bị xóa tin": "Tin nhắn có thể bị xóa nếu chứa link, username ngoài nhóm, forward lạ, từ khóa cấm hoặc spam quá nhanh.",
  },

  FLOOD_LIMIT: 5,
  FLOOD_WINDOW_MS: 10000,

  MEDIA_SPAM_LIMIT: 3,
  MEDIA_SPAM_WINDOW_MS: 20000,

  NEW_MEMBER_PROTECT_HOURS: 24,

  FIRST_MUTE_SECONDS: 10 * 60,
  REPEAT_MUTE_SECONDS: 24 * 60 * 60,

  LOG_FILE: "logs/moderation.log",
  DB_FILE: "data/bot.db",
};