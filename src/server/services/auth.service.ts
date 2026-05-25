import { prisma } from "@/lib/db/prisma";
import bcrypt from "bcryptjs";
import { sendEmail } from "@/lib/email";

export class AuthService {
  static async hashPassword(password: string) {
    return bcrypt.hash(password, 10);
  }

  static async generateOtp(email: string) {
    // Delete any existing OTPs for this email to avoid confusion
    await prisma.verificationOtp.deleteMany({ where: { email } });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.verificationOtp.create({
      data: {
        email,
        code,
        expiresAt,
      },
    });

    return code;
  }

  static async verifyOtp(email: string, code: string) {
    const otp = await prisma.verificationOtp.findFirst({
      where: {
        email,
        code,
        expiresAt: { gt: new Date() },
      },
    });

    if (!otp) return false;

    // Delete the OTP after successful verification
    await prisma.verificationOtp.delete({ where: { id: otp.id } });
    return true;
  }

  static async sendOtpEmail(email: string, code: string) {
    console.log(`[AUTH] Attempting to send OTP to ${email}: ${code}`);
    
    const result = await sendEmail({
      to: email,
      subject: "Your Resonance Verification Code",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #333;">Welcome to Resonance</h2>
          <p>Please use the following code to verify your email address:</p>
          <div style="background: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; border-radius: 5px; margin: 20px 0;">
            ${code}
          </div>
          <p style="color: #666; font-size: 14px;">This code will expire in 10 minutes.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #999; font-size: 12px;">If you didn't request this code, please ignore this email.</p>
        </div>
      `,
    });

    if (!result.success) {
      console.error("Critical: Failed to send OTP email to", email);
    }
    
    return result;
  }
}
