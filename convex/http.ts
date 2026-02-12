import { httpRouter } from "convex/server";
import { auth } from "./auth";

const http = httpRouter();

// Mount @convex-dev/auth HTTP routes (handles sign-in, sign-out, sessions)
auth.addHttpRoutes(http);

export default http;
