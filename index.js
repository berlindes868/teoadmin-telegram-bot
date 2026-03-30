require("dotenv").config();
const { Telegraf } = require("telegraf");
const {
  BOT_NAME,
  ALLOWED_DOMAINS,
  ALLOWED_USERNAMES,
  BLACKLIST_KEYWORDS,
  FAQ,
  FLOOD_LIMIT,
  FLOOD_WINDOW_MS,
  MEDIA_SPAM_LIMIT,
  MEDIA_SPAM_WINDOW_MS,
  NEW_MEMBER_PROTECT_HOURS,
  FIRST_MUTE_SECONDS,
  REPEAT_MUTE_SECONDS,
  LOG_FILE,
} = require("./config");

const {
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
} = require("./db");

const {
  writeLog,
  parseDurationToSeconds,
  formatUser,
} = require("./utils");

if (!process.env.BOT_TOKEN) {
  console.log("Thiếu BOT_TOKEN trong file .env");
  process.exit(1);
}

const bot = new Telegraf(process.env.BOT_TOKEN);

const messageHistory = new Map();
const mediaHistory = new Map();

function userKey(chatId, userId) {
  return `${chatId}_${userId}`;
}

function hasBlockedLink(text) {
  if (!text) return false;
  const lower = text.toLowerCase();

  for (const item of ALLOWED_DOMAINS) {
    if (lower.includes(item.toLowerCase())) return false;
  }

  return (
    /https?:\/\/\S+/i.test(lower) ||
    /www\.\S+/i.test(lower) ||
    /t\.me\/\S+/i.test(lower) ||
    /telegram\.me\/\S+/i.test(lower)
  );
}

function hasBlockedUsername(text) {
  if (!text) return false;
  const lower = text.toLowerCase();

  for (const item of ALLOWED_USERNAMES) {
    if (lower.includes(item.toLowerCase())) return false;
  }

  return /@\w{5,}/.test(text);
}

function hasBlacklistedKeyword(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return BLACKLIST_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()));
}

function isFlood(chatId, userId) {
  const key = userKey(chatId, userId);
  const now = Date.now();
  const arr = messageHistory.get(key) || [];
  const filtered = arr.filter((t) => now - t < FLOOD_WINDOW_MS);
  filtered.push(now);
  messageHistory.set(key, filtered);
  return filtered.length > FLOOD_LIMIT;
}

function isMediaSpam(chatId, userId) {
  const key = userKey(chatId, userId);
  const now = Date.now();
  const arr = mediaHistory.get(key) || [];
  const filtered = arr.filter((t) => now - t < MEDIA_SPAM_WINDOW_MS);
  filtered.push(now);
  mediaHistory.set(key, filtered);
  return filtered.length > MEDIA_SPAM_LIMIT;
}

function isProtectedNewMember(chatId, userId) {
  const joinedAt = getJoinTime(chatId, userId);
  if (!joinedAt) return false;
  return Date.now() - joinedAt < NEW_MEMBER_PROTECT_HOURS * 3600 * 1000;
}

async function isAdmin(ctx, targetUserId = null) {
  try {
    const admins = await ctx.getChatAdministrators();
    const id = targetUserId || ctx.from.id;
    return admins.some((a) => a.user.id === id);
  } catch (e) {
    console.log("Lỗi check admin:", e.message);
    return false;
  }
}

async function canBypass(ctx) {
  if (!ctx.from) return true;
  if (await isAdmin(ctx)) return true;
  if (isWhitelisted(ctx.chat.id, ctx.from.id)) return true;
  return false;
}

async function deleteMessageSafe(ctx) {
  try {
    await ctx.deleteMessage();
  } catch (e) {
    console.log("Không xóa được tin:", e.message);
  }
}

async function muteUser(ctx, targetUserId, seconds) {
  try {
    const until = Math.floor(Date.now() / 1000) + seconds;
    await ctx.restrictChatMember(targetUserId, {
      permissions: {
        can_send_messages: false,
      },
      until_date: until,
    });
    return true;
  } catch (e) {
    console.log("Không mute được:", e.message);
    return false;
  }
}

async function unmuteUser(ctx, targetUserId) {
  try {
    await ctx.restrictChatMember(targetUserId, {
      permissions: {
        can_send_messages: true,
        can_send_audios: true,
        can_send_documents: true,
        can_send_photos: true,
        can_send_videos: true,
        can_send_video_notes: true,
        can_send_voice_notes: true,
        can_send_polls: true,
        can_send_other_messages: true,
        can_add_web_page_previews: true,
        can_invite_users: true,
      },
    });
    return true;
  } catch (e) {
    console.log("Không bỏ mute được:", e.message);
    return false;
  }
}

async function banUser(ctx, targetUserId) {
  try {
    await ctx.banChatMember(targetUserId);
    return true;
  } catch (e) {
    console.log("Không ban được:", e.message);
    return false;
  }
}

async function punish(ctx, reason) {
  const count = increaseViolation(ctx.chat.id, ctx.from.id);
  const userText = formatUser(ctx.from);

  await deleteMessageSafe(ctx);

  writeLog(LOG_FILE, `CHAT ${ctx.chat.id} | USER ${userText} | COUNT ${count} | REASON ${reason}`);
  addAdminLog(ctx.chat.id, BOT_NAME, "AUTO_PUNISH", userText, `${reason} | count=${count}`);

  if (count === 1) {
    await ctx.reply(`⚠️ ${userText}, cảnh báo: ${reason}`);
  } else if (count === 2) {
    const ok = await muteUser(ctx, ctx.from.id, FIRST_MUTE_SECONDS);
    if (ok) {
      await ctx.reply(`🔇 ${userText} đã bị mute 10 phút vì ${reason}`);
    }
  } else {
    const ok = await muteUser(ctx, ctx.from.id, REPEAT_MUTE_SECONDS);
    if (ok) {
      await ctx.reply(`⛔ ${userText} đã bị mute 1 ngày vì tái phạm: ${reason}`);
    }
  }
}

function repliedUser(ctx) {
  return ctx.message?.reply_to_message?.from || null;
}

async function requireAdmin(ctx) {
  if (!["group", "supergroup"].includes(ctx.chat.type)) {
    await ctx.reply("Lệnh này chỉ dùng trong group.");
    return false;
  }

  if (!(await isAdmin(ctx))) {
    await ctx.reply("Chỉ admin mới dùng được lệnh này.");
    return false;
  }

  return true;
}

function getFeature(chatId, key, defaultValue = "on") {
  return getSetting(chatId, key, defaultValue);
}

function isFeatureOn(chatId, key) {
  return getFeature(chatId, key, "on") === "on";
}

// ===== LỆNH CƠ BẢN =====

bot.start(async (ctx) => {
  await ctx.reply(`${BOT_NAME} PRO MAX đã hoạt động ✅`);
});

bot.command("ping", async (ctx) => {
  await ctx.reply("pong");
});

bot.command("id", async (ctx) => {
  await ctx.reply(`Chat ID: ${ctx.chat.id}`);
});

bot.command("help", async (ctx) => {
  await ctx.reply(
    "Lệnh cơ bản:\n" +
    "/ping\n" +
    "/id\n" +
    "/help\n\n" +
    "Lệnh admin:\n" +
    "/warn (reply user)\n" +
    "/mute 10m (reply user)\n" +
    "/unmute (reply user)\n" +
    "/ban (reply user)\n" +
    "/wl_add (reply user)\n" +
    "/wl_remove (reply user)\n" +
    "/wl_list\n" +
    "/resetviolation (reply user)\n" +
    "/logs\n" +
    "/feature link on|off\n" +
    "/feature keyword on|off\n" +
    "/feature forward on|off\n" +
    "/feature media on|off\n" +
    "/feature flood on|off"
  );
});

// ===== LỆNH ADMIN =====

bot.command("warn", async (ctx) => {
  if (!(await requireAdmin(ctx))) return;
  const target = repliedUser(ctx);
  if (!target) return ctx.reply("Hãy reply vào tin nhắn người cần cảnh báo.");
  if (await isAdmin(ctx, target.id)) return ctx.reply("Không thể cảnh báo admin.");

  const count = increaseViolation(ctx.chat.id, target.id);
  const actor = formatUser(ctx.from);
  const targetText = formatUser(target);

  writeLog(LOG_FILE, `CHAT ${ctx.chat.id} | ADMIN ${actor} | WARN ${targetText} | COUNT ${count}`);
  addAdminLog(ctx.chat.id, actor, "WARN", targetText, `count=${count}`);

  await ctx.reply(`⚠️ ${targetText} đã bị cảnh báo. Tổng vi phạm: ${count}`);
});

bot.command("mute", async (ctx) => {
  if (!(await requireAdmin(ctx))) return;
  const target = repliedUser(ctx);
  if (!target) return ctx.reply("Hãy reply vào tin nhắn người cần mute.");
  if (await isAdmin(ctx, target.id)) return ctx.reply("Không thể mute admin.");

  const parts = ctx.message.text.trim().split(/\s+/);
  const durationText = parts[1] || "10m";
  const seconds = parseDurationToSeconds(durationText);
  if (!seconds) return ctx.reply("Sai thời gian. Ví dụ: /mute 10m hoặc /mute 1h");

  const ok = await muteUser(ctx, target.id, seconds);
  if (!ok) return;

  const actor = formatUser(ctx.from);
  const targetText = formatUser(target);

  writeLog(LOG_FILE, `CHAT ${ctx.chat.id} | ADMIN ${actor} | MUTE ${targetText} | ${durationText}`);
  addAdminLog(ctx.chat.id, actor, "MUTE", targetText, durationText);

  await ctx.reply(`🔇 ${targetText} đã bị mute ${durationText}`);
});

bot.command("unmute", async (ctx) => {
  if (!(await requireAdmin(ctx))) return;
  const target = repliedUser(ctx);
  if (!target) return ctx.reply("Hãy reply vào tin nhắn người cần bỏ mute.");

  const ok = await unmuteUser(ctx, target.id);
  if (!ok) return;

  const actor = formatUser(ctx.from);
  const targetText = formatUser(target);

  writeLog(LOG_FILE, `CHAT ${ctx.chat.id} | ADMIN ${actor} | UNMUTE ${targetText}`);
  addAdminLog(ctx.chat.id, actor, "UNMUTE", targetText, "");

  await ctx.reply(`✅ ${targetText} đã được bỏ mute`);
});

bot.command("ban", async (ctx) => {
  if (!(await requireAdmin(ctx))) return;
  const target = repliedUser(ctx);
  if (!target) return ctx.reply("Hãy reply vào tin nhắn người cần ban.");
  if (await isAdmin(ctx, target.id)) return ctx.reply("Không thể ban admin.");

  const ok = await banUser(ctx, target.id);
  if (!ok) return;

  const actor = formatUser(ctx.from);
  const targetText = formatUser(target);

  writeLog(LOG_FILE, `CHAT ${ctx.chat.id} | ADMIN ${actor} | BAN ${targetText}`);
  addAdminLog(ctx.chat.id, actor, "BAN", targetText, "");

  await ctx.reply(`🚫 ${targetText} đã bị ban khỏi nhóm`);
});

bot.command("wl_add", async (ctx) => {
  if (!(await requireAdmin(ctx))) return;
  const target = repliedUser(ctx);
  if (!target) return ctx.reply("Hãy reply vào tin nhắn người cần thêm whitelist.");

  addWhitelistUser(ctx.chat.id, target.id, ctx.from.id);

  const actor = formatUser(ctx.from);
  const targetText = formatUser(target);

  writeLog(LOG_FILE, `CHAT ${ctx.chat.id} | ADMIN ${actor} | WL_ADD ${targetText}`);
  addAdminLog(ctx.chat.id, actor, "WL_ADD", targetText, "");

  await ctx.reply(`✅ Đã thêm ${targetText} vào whitelist`);
});

bot.command("wl_remove", async (ctx) => {
  if (!(await requireAdmin(ctx))) return;
  const target = repliedUser(ctx);
  if (!target) return ctx.reply("Hãy reply vào tin nhắn người cần xóa whitelist.");

  removeWhitelistUser(ctx.chat.id, target.id);

  const actor = formatUser(ctx.from);
  const targetText = formatUser(target);

  writeLog(LOG_FILE, `CHAT ${ctx.chat.id} | ADMIN ${actor} | WL_REMOVE ${targetText}`);
  addAdminLog(ctx.chat.id, actor, "WL_REMOVE", targetText, "");

  await ctx.reply(`✅ Đã xóa ${targetText} khỏi whitelist`);
});

bot.command("wl_list", async (ctx) => {
  if (!(await requireAdmin(ctx))) return;

  const rows = listWhitelisted(ctx.chat.id);
  if (!rows.length) return ctx.reply("Whitelist đang trống.");

  const text = rows
    .slice(0, 30)
    .map((r, i) => `${i + 1}. user_id=${r.user_id} | added_at=${r.added_at}`)
    .join("\n");

  await ctx.reply(`Danh sách whitelist:\n${text}`);
});

bot.command("resetviolation", async (ctx) => {
  if (!(await requireAdmin(ctx))) return;
  const target = repliedUser(ctx);
  if (!target) return ctx.reply("Hãy reply vào tin nhắn người cần reset vi phạm.");

  resetViolation(ctx.chat.id, target.id);

  const actor = formatUser(ctx.from);
  const targetText = formatUser(target);

  writeLog(LOG_FILE, `CHAT ${ctx.chat.id} | ADMIN ${actor} | RESET_VIOLATION ${targetText}`);
  addAdminLog(ctx.chat.id, actor, "RESET_VIOLATION", targetText, "");

  await ctx.reply(`✅ Đã reset số lần vi phạm của ${targetText}`);
  });

bot.command("logs", async (ctx) => {
  if (!(await requireAdmin(ctx))) return;

  const rows = getRecentAdminLogs(ctx.chat.id, 10);
  if (!rows.length) return ctx.reply("Chưa có log nào.");

  const text = rows
    .map(
      (r, i) =>
        `${i + 1}. [${r.created_at}] ${r.actor} | ${r.action} | ${r.target || "-"} | ${r.detail || "-"}`
    )
    .join("\n");

  await ctx.reply(`10 log gần nhất:\n${text}`);
});

bot.command("feature", async (ctx) => {
  if (!(await requireAdmin(ctx))) return;

  const parts = ctx.message.text.trim().split(/\s+/);
  const key = parts[1];
  const value = parts[2];

  const allowedKeys = ["link", "keyword", "forward", "media", "flood"];
  const allowedValues = ["on", "off"];

  if (!allowedKeys.includes(key) || !allowedValues.includes(value)) {
    return ctx.reply(
      "Dùng như sau:\n/feature link on\n/feature keyword off\n/feature forward on\n/feature media on\n/feature flood on"
    );
  }

  setSetting(ctx.chat.id, key, value);

  const actor = formatUser(ctx.from);
  writeLog(LOG_FILE, `CHAT ${ctx.chat.id} | ADMIN ${actor} | FEATURE ${key}=${value}`);
  addAdminLog(ctx.chat.id, actor, "FEATURE", key, value);

  await ctx.reply(`✅ Đã cập nhật feature ${key} = ${value}`);
});

bot.on("new_chat_members", async (ctx) => {
  try {
    for (const member of ctx.message.new_chat_members) {
      setJoinTime(ctx.chat.id, member.id, Date.now());
      writeLog(LOG_FILE, `CHAT ${ctx.chat.id} | NEW_MEMBER ${formatUser(member)}`);
      addAdminLog(ctx.chat.id, BOT_NAME, "NEW_MEMBER", formatUser(member), "");
    }

    await ctx.reply(
      "👋 Chào mừng thành viên mới.\nVui lòng không spam, không gửi link ngoài, không quảng cáo nhóm khác."
    );
  } catch (e) {
    console.log("Lỗi new_chat_members:", e.message);
  }
});

bot.on("message", async (ctx, next) => {
  try {
    if (!["group", "supergroup"].includes(ctx.chat.type)) return next();
    if (!ctx.from) return next();
    if (await canBypass(ctx)) return next();

    if (isFeatureOn(ctx.chat.id, "forward")) {
      const msg = ctx.message;
      const hasForward =
        !!msg.forward_from ||
        !!msg.forward_from_chat ||
        !!msg.forward_sender_name ||
        !!msg.is_automatic_forward;

      if (hasForward) {
        return await punish(ctx, "forward nội dung lạ vào nhóm");
      }
    }

    return next();
  } catch (e) {
    console.log("Lỗi anti-forward:", e.message);
    return next();
  }
});

bot.on("text", async (ctx) => {
  try {
    if (!["group", "supergroup"].includes(ctx.chat.type)) return;
    if (await canBypass(ctx)) return;

    const text = ctx.message.text || "";

    if (isFeatureOn(ctx.chat.id, "flood") && isProtectedNewMember(ctx.chat.id, ctx.from.id) && isFlood(ctx.chat.id, ctx.from.id)) {
      return await punish(ctx, "spam quá nhanh khi mới vào nhóm");
    }

    if (isFeatureOn(ctx.chat.id, "link") && isProtectedNewMember(ctx.chat.id, ctx.from.id) && hasBlockedLink(text)) {
      return await punish(ctx, "gửi link ngoài khi mới vào nhóm");
    }

    if (isFeatureOn(ctx.chat.id, "flood") && isFlood(ctx.chat.id, ctx.from.id)) {
      return await punish(ctx, "spam quá nhiều tin nhắn");
    }

    if (isFeatureOn(ctx.chat.id, "link") && hasBlockedLink(text)) {
      return await punish(ctx, "gửi link ngoài nhóm");
    }

    if (isFeatureOn(ctx.chat.id, "link") && hasBlockedUsername(text)) {
      return await punish(ctx, "gửi username hoặc quảng cáo nhóm khác");
    }

    if (isFeatureOn(ctx.chat.id, "keyword") && hasBlacklistedKeyword(text)) {
      return await punish(ctx, "gửi từ khóa bị cấm");
    }

    const lower = text.toLowerCase();
    for (const key of Object.keys(FAQ)) {
      if (lower.includes(key)) {
        return await ctx.reply(FAQ[key]);
      }
    }
  } catch (e) {
    console.log("Lỗi xử lý text:", e.message);
  }
});

bot.on(["photo", "video", "document"], async (ctx) => {
  try {
    if (!["group", "supergroup"].includes(ctx.chat.type)) return;
    if (await canBypass(ctx)) return;

    if (isFeatureOn(ctx.chat.id, "media") && isMediaSpam(ctx.chat.id, ctx.from.id)) {
      return await punish(ctx, "spam ảnh/video/tài liệu quá nhiều");
    }
  } catch (e) {
    console.log("Lỗi anti-media:", e.message);
  }
});

// =========================
// KHỞI ĐỘNG BOT + HTTP SERVER CHO RENDER
// =========================

bot.launch();
console.log(`${BOT_NAME} PRO MAX đang chạy...`);

const http = require("http");
const PORT = process.env.PORT || 10000;

http
  .createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Bot is running");
  })
  .listen(PORT, "0.0.0.0", () => {
    console.log(`HTTP server listening on port ${PORT}`);
  });

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));