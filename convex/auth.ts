import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { ResendOTP } from "./ResendOTP";
import { ResendOTPPasswordReset } from "./ResendOTPPasswordReset";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password({ verify: ResendOTP, reset: ResendOTPPasswordReset })],
  signIn: {
    // Lower than the default (10) to limit brute-force on passwords and OTP codes
    maxFailedAttempsPerHour: 5,
  },
});
