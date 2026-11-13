import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type Ctx = QueryCtx | MutationCtx;

/** The signed-in user's row, or null when signed out. Convex Auth creates the row at sign-in. */
export async function getUserOrNull(ctx: Ctx): Promise<Doc<"users"> | null> {
  const userId = await getAuthUserId(ctx);
  if (!userId) return null;
  return await ctx.db.get(userId);
}

/**
 * Every function that acts for a user starts here. The acting user always
 * comes from the identity, never from an argument.
 */
export async function requireUser(ctx: Ctx): Promise<Doc<"users">> {
  const user = await getUserOrNull(ctx);
  if (!user) throw new ConvexError({ code: "unauthenticated" });
  if (user.banned) throw new ConvexError({ code: "banned" });
  return user;
}

/** No profile data may be written before consent is recorded. */
export async function requireConsentedUser(ctx: Ctx): Promise<Doc<"users">> {
  const user = await requireUser(ctx);
  if (!user.consentAt || !user.adultDeclared) {
    throw new ConvexError({ code: "consent_required" });
  }
  return user;
}

export async function requireRole(
  ctx: Ctx,
  role: "candidate" | "employer",
): Promise<Doc<"users">> {
  const user = await requireConsentedUser(ctx);
  if (user.role !== role) throw new ConvexError({ code: "wrong_role" });
  return user;
}

export async function requireAdmin(ctx: Ctx): Promise<Doc<"users">> {
  const user = await requireUser(ctx);
  if (!user.isAdmin) throw new ConvexError({ code: "forbidden" });
  return user;
}
