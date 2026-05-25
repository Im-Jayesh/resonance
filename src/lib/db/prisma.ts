import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

if (!process.env.DATABASE_URL) {
  console.error("❌ CRITICAL: DATABASE_URL is not set in process.env");
} else {
  console.log("✅ DATABASE_URL is present on server startup.");
}

// Prisma 6 uses the stable Rust-based library engine by default.
// It automatically reads DATABASE_URL from the environment.
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
