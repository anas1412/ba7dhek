import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getUserOrNull, requireConsentedUser, requireRole, requireUser } from "./lib/auth";
import { indexCandidate } from "./lib/geo";
import { clampRadiusM } from "./lib/geoMath";
import { cleanText, requireTunisianPoint } from "./lib/validate";
import { language, point, role } from "./schema";

/** The version of the privacy notice and terms a user accepts. Bump when either changes. */
export const CONSENT_VERSION = "2026-11-13";

/** The signed-in user's own row. Never used to read anyone else. */
export const me = query({
  args: {},
  handler: async (ctx) => {
    const user = await getUserOrNull(ctx);
    if (!user) return null;
    return {
      _id: user._id,
      name: user.name,
      photoUrl: user.photoUrl,
      language: user.language,
      role: user.role ?? null,
      hasConsented: Boolean(user.consentAt && user.adultDeclared),
      needsNewConsent: Boolean(user.consentAt) && user.consentVersion !== CONSENT_VERSION,
      onboarded: Boolean(user.onboardedAt),
      about: user.about ?? null,
      home: user.home ?? null,
      radiusM: user.radiusM ?? null,
      notifyNewJobs: user.notifyNewJobs ?? null,
    };
  },
});

/** Called once after every sign-in: creates the row, or marks the user as seen. */
export const ensure = mutation({
  args: { language },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "unauthenticated" });

    const existing = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    const now = Date.now();
    if (existing) {
      if (existing.banned) throw new ConvexError({ code: "banned" });
      await ctx.db.patch(existing._id, { lastSeenAt: now });
      return existing._id;
    }

    // Only the account itself is stored before consent: no profile fields.
    return await ctx.db.insert("users", {
      tokenIdentifier: identity.tokenIdentifier,
      name: identity.name ?? identity.givenName ?? "",
      photoUrl: identity.pictureUrl,
      language: args.language,
      lastSeenAt: now,
    });
  },
});

/** Records express consent and the 18-or-over declaration. */
export const acceptConsent = mutation({
  args: { adult: v.boolean() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (!args.adult) throw new ConvexError({ code: "adults_only" });
    await ctx.db.patch(user._id, {
      consentAt: Date.now(),
      consentVersion: CONSENT_VERSION,
      adultDeclared: true,
    });
  },
});

/** Chosen once. Switching roles is not supported. */
export const setRole = mutation({
  args: { role },
  handler: async (ctx, args) => {
    const user = await requireConsentedUser(ctx);
    if (user.role && user.role !== args.role) {
      throw new ConvexError({ code: "role_already_set" });
    }
    await ctx.db.patch(user._id, { role: args.role });
  },
});

/** The candidate's short profile text, shown to employers they apply to. */
export const updateProfile = mutation({
  args: { about: v.string() },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, "candidate");
    await ctx.db.patch(user._id, { about: cleanText(args.about, "about", { max: 280 }) });
  },
});

/**
 * The candidate's starting point and search radius. One point, not a trail:
 * the app never tracks movement. Saving it also updates the spatial index.
 */
export const setHome = mutation({
  args: { home: point, radiusM: v.number() },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, "candidate");
    const home = requireTunisianPoint(args.home, "home");
    const notify = user.notifyNewJobs ?? "all";
    await ctx.db.patch(user._id, {
      home,
      radiusM: clampRadiusM(args.radiusM),
      notifyNewJobs: notify,
      onboardedAt: user.onboardedAt ?? Date.now(),
    });
    await indexCandidate(ctx, user._id, home, notify);
  },
});

/** Kept on the server so push notifications arrive in the user's language. */
export const setLanguage = mutation({
  args: { language },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await ctx.db.patch(user._id, { language: args.language });
  },
});
