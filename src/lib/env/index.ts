// Simplified env loader to avoid Turbopack issues
export const env = {
  DATABASE_URL: process.env.DATABASE_URL || "",
  AUTH_SECRET: process.env.AUTH_SECRET || "development_secret_only_for_dev",
  EMAIL_USER: process.env.EMAIL_USER || "",
  EMAIL_PASS: process.env.EMAIL_PASS || "",
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
  NODE_ENV: process.env.NODE_ENV || "development",
};

if (!env.DATABASE_URL && process.env.NODE_ENV !== "test") {
  console.warn("⚠️ DATABASE_URL is missing from environment variables.");
}
