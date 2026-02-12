import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";

// In-memory store for development.
// In production, replace memoryAdapter() with a persistent adapter such as
//   drizzleAdapter(db, { provider: "sqlite" }) or
//   prismaAdapter(prisma, { provider: "postgresql" })
const db = memoryAdapter({});

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  database: db,
  emailAndPassword: {
    enabled: true,
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },
});
