import { ConvexError, v } from "convex/values";
import { internalMutation } from "./_generated/server";

// Run from a terminal by someone with access to the Convex project, never from
// the app: these are internal functions, so no signed-in user can call them.
//
//   npx convex run adminTools:setAdmin '{"email":"you@example.com","admin":true}'
//   npx convex run adminTools:setAdmin '{"email":"you@example.com","admin":true}' --prod
//   npx convex run adminTools:unban '{"userId":"<id>"}'

/**
 * Gives or takes away the admin flag, which opens the Review screen and the
 * approve, reject and report decisions. The person must have signed in at
 * least once on that deployment, since that is what creates their account.
 */
export const setAdmin = internalMutation({
  args: { email: v.string(), admin: v.boolean() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .unique();
    if (!user) throw new ConvexError({ code: "no_such_user" });
    await ctx.db.patch(user._id, { isAdmin: args.admin });
    return { userId: user._id, name: user.name ?? "", isAdmin: args.admin };
  },
});

/** Lifts a ban set from the Review screen. Jobs taken down by the ban stay closed. */
export const unban = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new ConvexError({ code: "no_such_user" });
    await ctx.db.patch(user._id, { banned: false });
    return { userId: user._id, name: user.name ?? "", banned: false };
  },
});
