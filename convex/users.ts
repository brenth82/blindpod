import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import { Resend as ResendAPI } from "resend";
import { RandomReader, generateRandomString } from "@oslojs/crypto/random";
import { Scrypt } from "lucia";

export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db.get(userId);
  },
});

export const getUserProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    return profile ?? { notifyOnNewEpisodes: false };
  },
});

export const updateNotificationPreference = mutation({
  args: { notifyOnNewEpisodes: v.boolean() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        notifyOnNewEpisodes: args.notifyOnNewEpisodes,
      });
    } else {
      await ctx.db.insert("userProfiles", {
        userId,
        notifyOnNewEpisodes: args.notifyOnNewEpisodes,
      });
    }
  },
});

// ── Email change ────────────────────────────────────────────────────────────

export const _getUserByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();
  },
});

export const _storePendingEmailChange = internalMutation({
  args: {
    userId: v.id("users"),
    newEmail: v.string(),
    code: v.string(),
    expiry: v.number(),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();

    if (profile) {
      await ctx.db.patch(profile._id, {
        pendingEmail: args.newEmail,
        pendingEmailCode: args.code,
        pendingEmailExpiry: args.expiry,
      });
    } else {
      await ctx.db.insert("userProfiles", {
        userId: args.userId,
        notifyOnNewEpisodes: false,
        pendingEmail: args.newEmail,
        pendingEmailCode: args.code,
        pendingEmailExpiry: args.expiry,
      });
    }
  },
});

/**
 * Sends a verification OTP to the new email address and stores the pending
 * change. The user must then call confirmEmailChange with the code.
 */
export const requestEmailChange = action({
  args: { newEmail: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const already = await ctx.runQuery(internal.users._getUserByEmail, {
      email: args.newEmail,
    });
    if (already) throw new ConvexError("That email address is already in use.");

    const random: RandomReader = {
      read(bytes) {
        crypto.getRandomValues(bytes);
      },
    };
    const code = generateRandomString(random, "0123456789", 8);
    const expiry = Date.now() + 3_600_000; // 1 hour

    await ctx.runMutation(internal.users._storePendingEmailChange, {
      userId,
      newEmail: args.newEmail,
      code,
      expiry,
    });

    const resend = new ResendAPI(process.env.AUTH_RESEND_KEY);
    const { error } = await resend.emails.send({
      from: "Blindpod <noreply@validhit.com>",
      to: [args.newEmail],
      subject: "Confirm your new Blindpod email address",
      text: `Your Blindpod email change code is: ${code}\n\nThis code expires in 1 hour.\n\nIf you did not request this change, you can ignore this email.`,
    });
    if (error) throw new ConvexError(`Failed to send verification email: ${error.message}`);
  },
});

/**
 * Verifies the OTP and updates the email in both the users record and the
 * Password-provider authAccounts record (providerAccountId = email).
 */
export const confirmEmailChange = mutation({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (
      !profile?.pendingEmail ||
      !profile?.pendingEmailCode ||
      !profile?.pendingEmailExpiry
    ) {
      throw new ConvexError("No pending email change found.");
    }

    if (Date.now() > profile.pendingEmailExpiry) {
      throw new ConvexError("Verification code has expired.");
    }

    if (args.code !== profile.pendingEmailCode) {
      throw new ConvexError("Invalid verification code.");
    }

    const newEmail = profile.pendingEmail;

    // Update the users record
    await ctx.db.patch(userId, { email: newEmail });

    // Update the Password-provider account so sign-in still works with the new email
    const account = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) =>
        q.eq("userId", userId).eq("provider", "password")
      )
      .first();
    if (account) {
      await ctx.db.patch(account._id, { providerAccountId: newEmail });
    }

    // Clear pending fields
    await ctx.db.patch(profile._id, {
      pendingEmail: undefined,
      pendingEmailCode: undefined,
      pendingEmailExpiry: undefined,
    });
  },
});

export const cleanupExpiredEmailChanges = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const profiles = await ctx.db.query("userProfiles").collect();
    let cleaned = 0;
    for (const profile of profiles) {
      if (profile.pendingEmailExpiry !== undefined && now > profile.pendingEmailExpiry) {
        await ctx.db.patch(profile._id, {
          pendingEmail: undefined,
          pendingEmailCode: undefined,
          pendingEmailExpiry: undefined,
        });
        cleaned++;
      }
    }
    return cleaned;
  },
});

// ── Account deletion ────────────────────────────────────────────────────────

/**
 * Deletes the currently authenticated user and all data associated with them:
 * - userProfile
 * - listenedEpisodes
 * - subscriptions
 * - podcasts (and their episodes) that have no remaining subscribers
 * - auth records: authAccounts, authVerificationCodes, authSessions, authRefreshTokens
 * - the user record itself
 */
export const deleteCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // --- App data ---

    const profiles = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const p of profiles) await ctx.db.delete(p._id);

    const listened = await ctx.db
      .query("listenedEpisodes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const l of listened) await ctx.db.delete(l._id);

    const subscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const podcastIds = subscriptions.map((s) => s.podcastId);
    for (const s of subscriptions) await ctx.db.delete(s._id);

    for (const podcastId of podcastIds) {
      const remainingSubscriber = await ctx.db
        .query("subscriptions")
        .withIndex("by_podcast", (q) => q.eq("podcastId", podcastId))
        .first();
      if (!remainingSubscriber) {
        const episodes = await ctx.db
          .query("episodes")
          .withIndex("by_podcast", (q) => q.eq("podcastId", podcastId))
          .collect();
        for (const ep of episodes) await ctx.db.delete(ep._id);
        await ctx.db.delete(podcastId);
      }
    }

    // --- Auth data ---

    const accounts = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => q.eq("userId", userId))
      .collect();
    for (const account of accounts) {
      const codes = await ctx.db
        .query("authVerificationCodes")
        .withIndex("accountId", (q) => q.eq("accountId", account._id))
        .collect();
      for (const code of codes) await ctx.db.delete(code._id);
      await ctx.db.delete(account._id);
    }

    const sessions = await ctx.db
      .query("authSessions")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .collect();
    for (const session of sessions) {
      const tokens = await ctx.db
        .query("authRefreshTokens")
        .withIndex("sessionIdAndParentRefreshTokenId", (q) =>
          q.eq("sessionId", session._id)
        )
        .collect();
      for (const token of tokens) await ctx.db.delete(token._id);
      await ctx.db.delete(session._id);
    }

    await ctx.db.delete(userId);
  },
});

export const changePassword = mutation({
  args: {
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, { currentPassword, newPassword }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const email = (user as any).email as string;

    const account = await ctx.db
      .query("authAccounts")
      .withIndex("providerAndAccountId", (q) =>
        q.eq("provider", "password").eq("providerAccountId", email)
      )
      .unique();

    if (!account?.secret) throw new Error("Account not found");

    const valid = await new Scrypt().verify(account.secret, currentPassword);
    if (!valid) throw new Error("Invalid current password");

    if (newPassword.length < 8) throw new Error("New password too short");

    const newHash = await new Scrypt().hash(newPassword);
    await ctx.db.patch(account._id, { secret: newHash });
  },
});
