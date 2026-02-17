import { internalMutation } from "./_generated/server";

/**
 * One-shot cleanup: removes duplicate authAccounts rows that share the same
 * (provider, providerAccountId). Keeps the row with emailVerified=true,
 * or the most recently created one if neither/both are verified.
 *
 * Run via: npx convex run internal/maintenance:deduplicateAuthAccounts [--prod]
 */
export const deduplicateAuthAccounts = internalMutation({
  args: {},
  handler: async (ctx) => {
    const accounts = await ctx.db.query("authAccounts").collect();

    // Group by composite key (provider, providerAccountId)
    const groups = new Map<string, typeof accounts>();
    for (const account of accounts) {
      const key = `${account.provider}::${account.providerAccountId}`;
      const existing = groups.get(key) ?? [];
      existing.push(account);
      groups.set(key, existing);
    }

    let deleted = 0;
    for (const group of groups.values()) {
      if (group.length <= 1) continue;

      // Prefer verified accounts; among ties prefer newest
      group.sort((a, b) => {
        const aVerified = (a as any).emailVerified ? 1 : 0;
        const bVerified = (b as any).emailVerified ? 1 : 0;
        if (bVerified !== aVerified) return bVerified - aVerified;
        return b._creationTime - a._creationTime;
      });

      // Delete all but the first (best) one
      for (const dup of group.slice(1)) {
        // Also clean up any verification codes referencing this account
        const codes = await ctx.db
          .query("authVerificationCodes")
          .withIndex("accountId", (q) => q.eq("accountId", dup._id))
          .collect();
        for (const code of codes) await ctx.db.delete(code._id);

        await ctx.db.delete(dup._id);
        deleted++;
      }
    }

    console.log(`Deleted ${deleted} duplicate authAccount(s).`);
    return { deleted };
  },
});
