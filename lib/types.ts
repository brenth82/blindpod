import type { Id } from "@/convex/_generated/dataModel";

/**
 * Extended user type — better-auth session user augmented with our Convex user ID.
 * The convexId is set after ensureUser() creates the Convex record.
 */
export interface SessionUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
  /** Our app-level Convex user ID, populated after syncing on login */
  convexId?: Id<"users">;
}
