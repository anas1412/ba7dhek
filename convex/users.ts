import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getUserOrNull, requireConsentedUser, requireRole, requireUser, staffRoleOf } from "./lib/auth";
import { indexCandidate } from "./lib/geo";
import { checkUpload, userPhotoUrl } from "./lib/images";
import { clampRadiusM } from "./lib/geoMath";
import { cleanText, requireTunisianPoint } from "./lib/validate";
import { language, point, role } from "./schema";

/** The version of the privacy notice and terms a user accepts. Bump when either changes. */
export const CONSENT_VERSION = "2026-11-14";

/** The signed-in user's own row. Never used to read anyone else. */
export const me = query({
  args: {},
  handler: async (ctx) => {
    const user = await getUserOrNull(ctx);
    if (!user) return null;
    return {
      _id: user._id,
      name: user.name ?? "",
      photoUrl: await userPhotoUrl(ctx, user),
      hasOwnPhoto: Boolean(user.photoId),
      language: user.language ?? null,
      role: user.role ?? null,
      hasConsented: Boolean(user.consentAt && user.adultDeclared),
      needsNewConsent: Boolean(user.consentAt) && user.consentVersion !== CONSENT_VERSION,
      onboarded: Boolean(user.onboardedAt),
      about: user.about ?? null,
      home: user.home ?? null,
      radiusM: user.radiusM ?? null,
      notifyNewJobs: user.notifyNewJobs ?? null,
      // "admin", "moderator", or null for everyone else.
      staffRole: staffRoleOf(user),
    };
  },
});

/**
 * Called after every sign-in. Convex Auth has already created the row with the
 * name, photo and email from Google; this records the app language the first
 * time and marks the user as seen. No profile data is stored before consent.
 */
export const ensure = mutation({
  args: { language },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await ctx.db.patch(user._id, {
      language: user.language ?? args.language,
      lastSeenAt: Date.now(),
    });
    return user._id;
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

/**
 * Replaces the person's photo with one they uploaded. The previous upload, if
 * any, is deleted. Returns the problem when the file is not an acceptable image.
 */
export const setPhoto = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const user = await requireConsentedUser(ctx);
    const problem = await checkUpload(ctx, args.storageId);
    if (problem) return { ok: false as const, problem };
    if (user.photoId) await ctx.storage.delete(user.photoId);
    await ctx.db.patch(user._id, { photoId: args.storageId, photoRemoved: undefined });
    return { ok: true as const };
  },
});

/** Shows no photo at all: the upload is deleted and the Google photo is no longer used. */
export const removePhoto = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireConsentedUser(ctx);
    if (user.photoId) await ctx.storage.delete(user.photoId);
    await ctx.db.patch(user._id, { photoId: undefined, photoRemoved: true });
  },
});

/** Goes back to the photo from the person's Google account. */
export const useAccountPhoto = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireConsentedUser(ctx);
    if (user.photoId) await ctx.storage.delete(user.photoId);
    await ctx.db.patch(user._id, { photoId: undefined, photoRemoved: undefined });
  },
});
