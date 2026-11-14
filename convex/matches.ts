import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { requireConsentedUser } from "./lib/auth";
import { companyLogoUrl, userPhotoUrl } from "./lib/images";
import { cleanText } from "./lib/validate";

export const REPORT_REASONS = ["harassment", "scam", "asks_money", "other"] as const;
const reportReason = v.union(
  v.literal("harassment"),
  v.literal("scam"),
  v.literal("asks_money"),
  v.literal("other"),
);

/**
 * A match is the conversation opened when an employer accepts an applicant.
 * Only its two people can read it or write in it. Every function here starts
 * from this check.
 */
export async function requireMatch(ctx: QueryCtx | MutationCtx, matchId: Id<"matches">) {
  const user = await requireConsentedUser(ctx);
  const match = await ctx.db.get(matchId);
  if (!match) throw new ConvexError({ code: "not_found" });
  const side =
    match.candidateId === user._id ? "candidate" : match.employerId === user._id ? "employer" : null;
  // The same answer as for a match that does not exist, so ids cannot be probed.
  if (!side) throw new ConvexError({ code: "not_found" });
  return { user, match, side } as const;
}

/** What one side sees of the other: a candidate sees the business, an employer sees the person. */
async function otherParty(ctx: QueryCtx, match: Doc<"matches">, side: "candidate" | "employer") {
  if (side === "candidate") {
    const company = await ctx.db.get(match.companyId);
    return {
      name: company?.name ?? null,
      imageUrl: company ? await companyLogoUrl(ctx, company) : null,
    };
  }
  const candidate = await ctx.db.get(match.candidateId);
  // A deleted account leaves its messages behind, without a name.
  return {
    name: candidate?.name ?? null,
    imageUrl: candidate ? await userPhotoUrl(ctx, candidate) : null,
  };
}

function isUnread(match: Doc<"matches">, side: "candidate" | "employer", userId: Id<"users">): boolean {
  if (!match.lastMessageAt || match.lastSenderId === userId) return false;
  const readAt = side === "candidate" ? match.candidateReadAt : match.employerReadAt;
  return (readAt ?? 0) < match.lastMessageAt;
}

/** The signed-in person's conversations, the most recently active first. */
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireConsentedUser(ctx);
    if (!user.role) return [];
    const side = user.role;
    const matches =
      side === "candidate"
        ? await ctx.db
            .query("matches")
            .withIndex("by_candidate", (q) => q.eq("candidateId", user._id))
            .order("desc")
            .take(100)
        : await ctx.db
            .query("matches")
            .withIndex("by_employer", (q) => q.eq("employerId", user._id))
            .order("desc")
            .take(100);

    return await Promise.all(
      matches.map(async (match) => {
        const job = await ctx.db.get(match.jobId);
        return {
          _id: match._id,
          jobTitle: job?.title ?? null,
          other: await otherParty(ctx, match, side),
          lastMessagePreview: match.lastMessagePreview ?? null,
          // A conversation with no message yet is dated by the acceptance that opened it.
          lastActivityAt: match.lastMessageAt ?? match._creationTime,
          lastFromMe: match.lastSenderId === user._id,
          unread: isUnread(match, side, user._id),
          blocked: match.blockedBy !== undefined,
        };
      }),
    );
  },
});

/** How many conversations hold something unread, for the dot on the tab. */
export const unreadCount = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireConsentedUser(ctx);
    if (!user.role) return 0;
    const side = user.role;
    const matches =
      side === "candidate"
        ? await ctx.db
            .query("matches")
            .withIndex("by_candidate", (q) => q.eq("candidateId", user._id))
            .order("desc")
            .take(100)
        : await ctx.db
            .query("matches")
            .withIndex("by_employer", (q) => q.eq("employerId", user._id))
            .order("desc")
            .take(100);
    return matches.filter((match) => !match.blockedBy && isUnread(match, side, user._id)).length;
  },
});

/** The heading of one conversation. */
export const get = query({
  args: { matchId: v.id("matches") },
  handler: async (ctx, args) => {
    const { user, match, side } = await requireMatch(ctx, args.matchId);
    const job = await ctx.db.get(match.jobId);
    return {
      _id: match._id,
      side,
      jobId: job?._id ?? null,
      jobTitle: job?.title ?? null,
      other: await otherParty(ctx, match, side),
      blocked: match.blockedBy !== undefined,
      // Only the person who blocked can lift the block.
      blockedByMe: match.blockedBy === user._id,
    };
  },
});

/** Records that the signed-in person has seen the conversation up to now. */
export const markRead = mutation({
  args: { matchId: v.id("matches") },
  handler: async (ctx, args) => {
    const { match, side } = await requireMatch(ctx, args.matchId);
    const now = Date.now();
    await ctx.db.patch(match._id, side === "candidate" ? { candidateReadAt: now } : { employerReadAt: now });
  },
});

/** Closes the conversation to new messages from both sides. What was written stays readable. */
export const block = mutation({
  args: { matchId: v.id("matches") },
  handler: async (ctx, args) => {
    const { user, match } = await requireMatch(ctx, args.matchId);
    if (match.blockedBy) return;
    await ctx.db.patch(match._id, { blockedBy: user._id });
  },
});

export const unblock = mutation({
  args: { matchId: v.id("matches") },
  handler: async (ctx, args) => {
    const { user, match } = await requireMatch(ctx, args.matchId);
    if (!match.blockedBy) return;
    if (match.blockedBy !== user._id) throw new ConvexError({ code: "forbidden" });
    await ctx.db.patch(match._id, { blockedBy: undefined });
  },
});

/**
 * Reports the other person in a conversation, for a human to review, and
 * blocks the conversation at once so nothing more arrives in the meantime.
 */
export const report = mutation({
  args: { matchId: v.id("matches"), reason: reportReason, note: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { user, match, side } = await requireMatch(ctx, args.matchId);
    const targetId = side === "candidate" ? match.employerId : match.candidateId;
    const note = args.note ? cleanText(args.note, "note", { max: 500 }) : "";
    await ctx.db.insert("reports", {
      reporterId: user._id,
      targetType: "user",
      targetId,
      reason: args.reason,
      // The conversation is named: this is what lets staff read it, and only it.
      matchId: match._id,
      note: note || undefined,
      status: "open",
    });
    if (!match.blockedBy) await ctx.db.patch(match._id, { blockedBy: user._id });
  },
});
