import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireConsentedUser, requireRole, requireUser } from "./lib/auth";
import { indexCandidate } from "./lib/geo";
import { push } from "./notify";
import { notifyNewJobs } from "./schema";

// What Expo's push service hands the app: "ExponentPushToken[...]" or "ExpoPushToken[...]".
const EXPO_TOKEN = /^Expo(nent)?PushToken\[[A-Za-z0-9_-]{10,200}\]$/;

/**
 * Stores the phone's push address for the signed-in person. The app calls this
 * on every launch, since the address can change. One phone per person: the
 * last one to register is the one that receives.
 */
export const register = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const user = await requireConsentedUser(ctx);
    if (!EXPO_TOKEN.test(args.token)) throw new ConvexError({ code: "invalid_token" });
    await push.recordToken(ctx, { userId: user._id, pushToken: args.token });
  },
});

/** Called on sign-out, so a phone handed to someone else stops receiving this person's pushes. */
export const unregister = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    await push.removeToken(ctx, { userId: user._id });
  },
});

/**
 * How a candidate hears about new jobs nearby: each one as it is posted (up to
 * the daily cap), one summary each morning, or not at all. Chat and
 * application pushes are not affected.
 */
export const setNewJobs = mutation({
  args: { mode: notifyNewJobs },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, "candidate");
    await ctx.db.patch(user._id, { notifyNewJobs: args.mode });
    // The spatial index carries the setting too, so it is kept in step.
    if (user.home) await indexCandidate(ctx, user._id, user.home, args.mode);
  },
});
