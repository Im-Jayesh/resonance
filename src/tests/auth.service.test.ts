import { describe, it, expect, vi } from "vitest";
import { AuthService } from "@/server/services/auth.service";
import bcrypt from "bcryptjs";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    verificationOtp: {
      create: vi.fn().mockResolvedValue({}),
      findFirst: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn().mockResolvedValue({}),
    },
  },
}));

describe("AuthService", () => {
  it("should hash a password correctly", async () => {
    const password = "password123";
    const hashed = await AuthService.hashPassword(password);
    expect(hashed).not.toBe(password);
    const matches = await bcrypt.compare(password, hashed);
    expect(matches).toBe(true);
  });

  it("should generate a 6-digit OTP", async () => {
    const email = "test@example.com";
    const otp = await AuthService.generateOtp(email);
    expect(otp).toHaveLength(6);
    expect(Number(otp)).toBeGreaterThanOrEqual(100000);
    expect(Number(otp)).toBeLessThanOrEqual(999999);
  });
});
