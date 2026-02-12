import Resend from "@auth/core/providers/resend";
import { Resend as ResendAPI } from "resend";
import { RandomReader, generateRandomString } from "@oslojs/crypto/random";

export const ResendOTP = Resend({
  id: "resend-otp",
  apiKey: process.env.AUTH_RESEND_KEY,
  async generateVerificationToken() {
    const random: RandomReader = {
      read(bytes) {
        crypto.getRandomValues(bytes);
      },
    };
    return generateRandomString(random, "0123456789", 8);
  },
  async sendVerificationRequest({ identifier: email, provider, token }) {
    const resend = new ResendAPI(provider.apiKey);
    const { error } = await resend.emails.send({
      from: "Blindpod <noreply@validhit.com>",
      to: [email],
      subject: "Verify your Blindpod account",
      text: `Your Blindpod verification code is: ${token}\n\nThis code expires in 1 hour.\n\nIf you did not request this, you can ignore this email.`,
    });
    if (error) {
      throw new Error("Failed to send verification email");
    }
  },
});
