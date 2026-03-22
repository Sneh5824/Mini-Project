const { createClient } = require("redis");

const client = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

client.on("connect", () => console.log("[Redis] Connected"));
client.on("ready",   () => console.log("[Redis] Ready"));
client.on("error",   (err) => console.error("[Redis]", err.message));
client.on("reconnecting", () => console.log("[Redis] Reconnecting..."));

(async () => {
  try {
    await client.connect();
  } catch (err) {
    console.error("[Redis] Failed to connect:", err.message);
    process.exit(1);
  }
})();

module.exports = client;
