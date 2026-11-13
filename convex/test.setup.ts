/// <reference types="vite/client" />
import geospatial from "@convex-dev/geospatial/test";
import { convexTest } from "convex-test";
import schema from "./schema";

// Every Convex source file, including _generated, excluding tests and this helper.
export const modules = import.meta.glob([
  "./**/*.ts",
  "./**/*.js",
  "!./**/*.test.ts",
  "!./**/*.d.ts",
  "!./test.setup.ts",
]);

/** A fresh in-memory backend with both spatial indexes registered. */
export function setupBackend() {
  const t = convexTest(schema, modules);
  geospatial.register(t, "jobsGeo");
  geospatial.register(t, "candidatesGeo");
  return t;
}

export const HAMMAMET = { latitude: 36.4, longitude: 10.6167 };

/**
 * Stands in for a Google sign-in: Convex Auth creates the user row, then
 * issues a token whose subject is "<user id>|<session id>".
 */
export async function signedIn(t: ReturnType<typeof setupBackend>, name: string) {
  const id = await t.run((ctx) =>
    ctx.db.insert("users", { name, email: `${name.toLowerCase()}@example.test` }),
  );
  return { id, as: t.withIdentity({ subject: `${id}|test-session` }) };
}
