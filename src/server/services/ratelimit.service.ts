import { redis } from "@/lib/cache/redis";

export class RateLimitService {
  static async check(key: string, limit: number, windowInSeconds: number) {
    // Basic fixed window rate limiting
    const current = await redis.incr(key);
    if (current === 1) {
      await redis.expire(key, windowInSeconds);
    }
    return current <= limit;
  }
}
