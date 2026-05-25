import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: "https://example.upstash.io", // Placeholder if not in env
  token: "placeholder",
});

// Real implementation would use env variables
// export const redis = Redis.fromEnv();
