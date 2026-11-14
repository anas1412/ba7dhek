import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { MESSAGE_PUSH_DELAY_MS } from "./lib/pushRules";
import { mutation, query } from "./_generated/server";
import { cleanText } from "./lib/validate";
import { requireMatch } from "./matches";

const MAX_LENGTH = 1000;
const PREVIEW_LENGTH = 80;
/** The newest messages shown. Older ones stay stored; paging back to them is not built yet. */
const PAGE = 200;
// More than this from one person inside a minute is a flood, not a conversation.
const BURST_LIMIT = 20;
const BURST_WINDOW_MS = 60_000;

/** The messages of one conversation, oldest first. Live: a new message arrives without asking. */
export const list = query({
  args: { matchId: v.id("matches") },
  handler: async (ctx, args) => {
    const { user, match } = await requireMatch(ctx, args.matchId);
    const newest = await ctx.db
      .query("messages")
      .withIndex("by_match", (q) => q.eq("matchId", match._id))
      .order("desc")
      .take(PAGE);
    return newest.reverse().map((message) => ({
      _id: message._id,
      body: message.body,
      sentAt: message._creationTime,
      mine: message.senderId === user._id,
    }));
  },
});

/** Sends one message. It passes the same word filter as job posts before it is stored. */
export const send = mutation({
  args: { matchId: v.id("matches"), body: v.string() },
  handler: async (ctx, args) => {
    const { user, match, side } = await requireMatch(ctx, args.matchId);
    if (match.blockedBy) throw new ConvexError({ code: "blocked" });
    const body = cleanText(args.body, "body", { min: 1, max: MAX_LENGTH });

    const now = Date.now();
    const recent = await ctx.db
      .query("messages")
      .withIndex("by_match", (q) => q.eq("matchId", match._id).gt("_creationTime", now - BURST_WINDOW_MS))
      .collect();
    if (recent.filter((message) => message.senderId === user._id).length >= BURST_LIMIT) {
      throw new ConvexError({ code: "too_fast" });
    }

    const messageId = await ctx.db.insert("messages", { matchId: match._id, senderId: user._id, body });
    await ctx.db.patch(match._id, {
      lastMessageAt: now,
      lastSenderId: user._id,
      lastMessagePreview: body.length > PREVIEW_LENGTH ? `${body.slice(0, PREVIEW_LENGTH - 1)}…` : body,
      // Whoever writes has, by writing, read what came before.
      ...(side === "candidate" ? { candidateReadAt: now } : { employerReadAt: now }),
    });
    // After a short wait, so someone with the chat open has had time to be marked as having read it.
    await ctx.scheduler.runAfter(MESSAGE_PUSH_DELAY_MS, internal.notify.message, { messageId });
    return messageId;
  },
});
