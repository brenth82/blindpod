import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  // Auth tables managed by @convex-dev/auth (users, sessions, accounts, etc.)
  ...authTables,

  // App-specific user preferences, keyed to the auth user by userId
  userProfiles: defineTable({
    userId: v.id("users"),
    notifyOnNewEpisodes: v.boolean(),
  }).index("by_user", ["userId"]),

  podcasts: defineTable({
    rssUrl: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    author: v.optional(v.string()),
    lastFetchedAt: v.number(),
  }).index("by_rss_url", ["rssUrl"]),

  episodes: defineTable({
    podcastId: v.id("podcasts"),
    guid: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    audioUrl: v.string(),
    durationSeconds: v.optional(v.number()),
    publishedAt: v.number(),
    isArchivedFromFeed: v.boolean(),
  })
    .index("by_podcast", ["podcastId"])
    .index("by_podcast_guid", ["podcastId", "guid"]),

  subscriptions: defineTable({
    userId: v.id("users"),
    podcastId: v.id("podcasts"),
    notificationsEnabled: v.boolean(),
    subscribedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_podcast", ["userId", "podcastId"]),

  listenedEpisodes: defineTable({
    userId: v.id("users"),
    episodeId: v.id("episodes"),
    listenedAt: v.number(),
    positionSeconds: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_episode", ["userId", "episodeId"]),
});
