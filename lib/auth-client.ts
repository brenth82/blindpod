"use client";

import { createAuthClient } from "better-auth/react";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// createAuthClient is safe to call server-side as long as baseURL is absolute.
// We ensure NEXT_PUBLIC_APP_URL is always set as an absolute URL.
export const authClient = createAuthClient({ baseURL: BASE_URL });

export const { signIn, signOut, signUp, useSession } = authClient;
