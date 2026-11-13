import { httpRouter } from "convex/server";
import { auth } from "./auth";

const http = httpRouter();

// Adds the sign-in routes, including Google's callback at /api/auth/callback/google.
auth.addHttpRoutes(http);

export default http;
