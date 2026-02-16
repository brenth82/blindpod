import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

/**
 * Called by the browser to kick off an OPML import.
 * Validates auth, creates the job record, and schedules the background action.
 * Returns immediately with the jobId so the browser can subscribe for updates.
 */
export const startImport = mutation({
  args: {
    feeds: v.array(v.object({ url: v.string(), title: v.string() })),
    markAllListened: v.boolean(),
  },
  handler: async (ctx, { feeds, markAllListened }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const jobId = await ctx.db.insert("importJobs", {
      userId,
      status: "pending",
      total: feeds.length,
      succeeded: 0,
      failedTitles: [],
      startedAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, (internal as any).podcastActions.processOpmlImport, {
      jobId,
      feeds,
      markAllListened,
      userId,
    });

    return jobId;
  },
});

/**
 * Reactive query — the browser subscribes to this for live progress updates.
 * Returns null if the job doesn't exist or belongs to a different user.
 */
export const getImportJob = query({
  args: { jobId: v.id("importJobs") },
  handler: async (ctx, { jobId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const job = await ctx.db.get(jobId);
    if (!job || job.userId !== userId) return null;
    return job;
  },
});

/**
 * Internal — only called by processOpmlImport to push progress back to the DB.
 */
export const updateJob = internalMutation({
  args: {
    jobId: v.id("importJobs"),
    status: v.optional(v.union(v.literal("running"), v.literal("done"))),
    succeeded: v.optional(v.number()),
    failedTitles: v.optional(v.array(v.string())),
    completedAt: v.optional(v.number()),
  },
  handler: async (ctx, { jobId, status, succeeded, failedTitles, completedAt }) => {
    const patch: Record<string, unknown> = {};
    if (status !== undefined) patch.status = status;
    if (succeeded !== undefined) patch.succeeded = succeeded;
    if (failedTitles !== undefined) patch.failedTitles = failedTitles;
    if (completedAt !== undefined) patch.completedAt = completedAt;
    await ctx.db.patch(jobId, patch);
  },
});
