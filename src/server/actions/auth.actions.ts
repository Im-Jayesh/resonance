"use server";

import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { AuthService } from "@/server/services/auth.service";
import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
});

export async function signUpAction(data: z.infer<typeof signupSchema>) {
  const parsed = signupSchema.safeParse(data);
  if (!parsed.success) return { error: "Invalid input" };

  const email = parsed.data.email.trim().toLowerCase();
  const password = parsed.data.password;
  const name = parsed.data.name.trim();

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return { error: "User with this email already exists" };

    const hashedPassword = await AuthService.hashPassword(password);

    await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
    });

    const otp = await AuthService.generateOtp(email);
    await AuthService.sendOtpEmail(email, otp);

    return { success: "Account created. Please verify your email.", email };
  } catch (error: any) {
    console.error("Signup error details:", error);
    return { error: `Failed to create account: ${error.message}` };
  }
}

const verifyOtpSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

export async function verifyOtpAction(data: z.infer<typeof verifyOtpSchema>) {
  const parsed = verifyOtpSchema.safeParse(data);
  if (!parsed.success) return { error: "Invalid input" };

  const { email, code } = parsed.data;

  const isValid = await AuthService.verifyOtp(email, code);
  if (!isValid) return { error: "Invalid or expired OTP" };

  await prisma.user.update({
    where: { email },
    data: { emailVerified: new Date() },
  });

  return { success: "Email verified successfully. You can now log in." };
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function loginAction(data: z.infer<typeof loginSchema>) {
  const parsed = loginSchema.safeParse(data);
  if (!parsed.success) return { error: "Invalid input" };

  try {
    await signIn("credentials", {
      ...parsed.data,
      redirect: false,
    });
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid credentials" };
    }
    throw error;
  }
}
