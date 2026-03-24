const redis = require("./redisClient");

// ─── Key helpers ────────────────────────────────────────────────────────────
const K = {
  room:         (id) => `room:${id}`,
  participants: (id) => `participants:${id}`,
  messages:     (id) => `messages:${id}`,
  code:         (id) => `code:${id}`,
};

// In-memory timers (cleared on room expiry / manual end)
const roomTimers = new Map();

// ─── Room ID generator (e.g. "A3BZ9K") ───────────────────────────────────────
function generateRoomId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "";
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

// ─── Random room name generator ───────────────────────────────────────────────
const ROOM_ADJECTIVES = [
  "Blazing", "Sneaky", "Cosmic", "Cursed", "Chaotic", "Lazy", "Hungry",
  "Sleepy", "Frantic", "Haunted", "Flying", "Broken", "Caffeinated",
  "Jugaadu", "Desi", "Unstoppable", "Legendary", "Notorious", "Salty",
  "Turbocharged", "Delirious", "Midnight", "Yolo", "Panicked", "Silent",
];
const ROOM_NOUNS = [
  "Debuggers", "Stack Overflow", "Merge Conflict", "Git Pushers", "Segfault",
  "Null Pointers", "Memory Leak", "Keyboard Warriors", "Loop Breakers",
  "Syntax Errors", "404 Squad", "Terminal Monkeys", "Runtime Errors",
  "Code Monkeys", "Infinite Loopers", "Deadlock Gang", "Race Condition",
  "Backenders", "Div Wreckers", "CSS Fighters", "Off-by-One Club",
  "Production Breakers", "Import Brigade", "Regex Wizards", "Todo Deleters",
];
function generateRoomName() {
  const adj  = ROOM_ADJECTIVES[Math.floor(Math.random() * ROOM_ADJECTIVES.length)];
  const noun = ROOM_NOUNS[Math.floor(Math.random() * ROOM_NOUNS.length)];
  return `${adj} ${noun}`;
}

// ─── Room CRUD ────────────────────────────────────────────────────────────────
async function createRoom({ hostId, hostName, roomType, timeout, roomName = null }) {
  const roomId    = generateRoomId();
  const now       = Date.now();
  const expiresAt = now + timeout * 60 * 1000;
  const finalName = (roomName && roomName.trim()) ? roomName.trim() : generateRoomName();

  const room = { roomId, hostId, hostName, roomType, timeout, roomName: finalName, createdAt: now, expiresAt, status: "active", problemLink: null };
  await redis.set(K.room(roomId), JSON.stringify(room));
  return room;
}

async function getRoom(roomId) {
  const data = await redis.get(K.room(roomId));
  return data ? JSON.parse(data) : null;
}

async function updateRoom(roomId, updates) {
  const room = await getRoom(roomId);
  if (!room) return null;
  const updated = { ...room, ...updates };
  await redis.set(K.room(roomId), JSON.stringify(updated));
  return updated;
}

async function deleteRoom(roomId) {
  await Promise.all([
    redis.del(K.room(roomId)),
    redis.del(K.participants(roomId)),
    redis.del(K.messages(roomId)),
    redis.del(K.code(roomId)),
  ]);
}

// ─── Participants ─────────────────────────────────────────────────────────────
async function addParticipant(roomId, participant) {
  await redis.rPush(K.participants(roomId), JSON.stringify(participant));
}

async function removeParticipant(roomId, guestId) {
  const all = await getParticipants(roomId);
  const filtered = all.filter((p) => p.guestId !== guestId);
  await redis.del(K.participants(roomId));
  for (const p of filtered) await redis.rPush(K.participants(roomId), JSON.stringify(p));
}

async function getParticipants(roomId) {
  const data = await redis.lRange(K.participants(roomId), 0, -1);
  return data.map((d) => JSON.parse(d));
}

// ─── Messages ─────────────────────────────────────────────────────────────────
async function addMessage(roomId, message) {
  await redis.rPush(K.messages(roomId), JSON.stringify(message));
}

async function getMessages(roomId) {
  const data = await redis.lRange(K.messages(roomId), 0, -1);
  return data.map((d) => JSON.parse(d));
}

async function replaceMessages(roomId, messages) {
  await redis.del(K.messages(roomId));
  for (const m of messages) {
    await redis.rPush(K.messages(roomId), JSON.stringify(m));
  }
}

async function toggleMessageReaction(roomId, messageId, emoji, guestId) {
  const messages = await getMessages(roomId);
  const idx = messages.findIndex((m) => m.id === messageId);
  if (idx === -1) return null;

  const msg = { ...messages[idx] };
  const reactions = { ...(msg.reactions || {}) };
  const users = Array.isArray(reactions[emoji]) ? [...reactions[emoji]] : [];

  const existingIdx = users.indexOf(guestId);
  if (existingIdx >= 0) {
    users.splice(existingIdx, 1);
  } else {
    users.push(guestId);
  }

  if (users.length > 0) reactions[emoji] = users;
  else delete reactions[emoji];

  msg.reactions = reactions;
  messages[idx] = msg;
  await replaceMessages(roomId, messages);

  return { messageId: msg.id, reactions: msg.reactions };
}

// ─── Code ─────────────────────────────────────────────────────────────────────
async function getCode(roomId) {
  return (await redis.get(K.code(roomId))) || "";
}

async function setCode(roomId, code) {
  await redis.set(K.code(roomId), code);
}

// ─── Timers ───────────────────────────────────────────────────────────────────
function setRoomTimer(roomId, delayMs, callback) {
  clearRoomTimer(roomId);
  const timer = setTimeout(callback, Math.max(delayMs, 0));
  roomTimers.set(roomId, timer);
}

function clearRoomTimer(roomId) {
  if (roomTimers.has(roomId)) {
    clearTimeout(roomTimers.get(roomId));
    roomTimers.delete(roomId);
  }
}

module.exports = {
  createRoom,
  getRoom,
  updateRoom,
  deleteRoom,
  addParticipant,
  removeParticipant,
  getParticipants,
  addMessage,
  getMessages,
  toggleMessageReaction,
  getCode,
  setCode,
  setRoomTimer,
  clearRoomTimer,
};
