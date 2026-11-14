import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { internalMutation, type MutationCtx } from "./_generated/server";
import { deleteAccountData } from "./account";
import { staffRoleOf } from "./lib/auth";
import { unindexJob } from "./lib/geo";
import { accountExpiryText } from "./lib/pushText";
import { push } from "./notify";

// The retention job: once a day it removes what has passed the period declared
// in docs/04-launch/data-protection.md, and closes job posts that have expired.
//
//   Job post, 30 days after publishing            -> closed (its owner can publish it again)
//   Closed job post, 12 months after closing      -> deleted, with its photos and its applications
//   Conversation, 12 months after its last message -> deleted, with its messages
//   Account, 23 months without opening the app    -> warned by a notification
//   Account, 24 months, and warned 30 days before -> deleted, as if the person had done it
//   Settled report, 24 months                     -> deleted
//
// Each run handles a bounded batch of each kind, so it stays well inside what
// one function may read and write. When a batch came back full there is more
// to do, and the job runs again a minute later until it is caught up.

const DAY_MS = 24 * 60 * 60 * 1000;
const MONTH_MS = 30 * DAY_MS;

export const CLOSED_JOB_KEPT_MS = 12 * MONTH_MS;
export const CONVERSATION_KEPT_MS = 12 * MONTH_MS;
export const ACCOUNT_WARNED_AFTER_MS = 23 * MONTH_MS;
export const ACCOUNT_KEPT_MS = 24 * MONTH_MS;
/** Nobody is deleted for inactivity sooner than this after their warning. */
export const WARNING_NOTICE_MS = 30 * DAY_MS;
export const REPORT_KEPT_MS = 24 * MONTH_MS;

const BATCH = 50;
/** Messages of one old conversation removed per run; a longer one is finished on the next run. */
const MESSAGE_BATCH = 500;

type Tally = {
  jobsExpired: number;
  jobsDeleted: number;
  conversationsDeleted: number;
  accountsWarned: number;
  accountsDeleted: number;
  reportsDeleted: number;
  countersDeleted: number;
};

export const run = internalMutation({
  args: {},
  handler: async (ctx): Promise<Tally & { more: boolean }> => {
    const now = Date.now();
    const tally: Tally = {
      jobsExpired: await closeExpiredJobs(ctx, now),
      jobsDeleted: await deleteOldClosedJobs(ctx, now),
      conversationsDeleted: await deleteOldConversations(ctx, now),
      accountsWarned: await warnIdleAccounts(ctx, now),
      accountsDeleted: await deleteIdleAccounts(ctx, now),
      reportsDeleted: await deleteOldReports(ctx, now),
      countersDeleted: await deleteOldCounters(ctx, now),
    };
    // A full batch means there is probably more of that kind waiting.
    const more = [
      tally.jobsExpired,
      tally.jobsDeleted,
      tally.conversationsDeleted,
      tally.accountsDeleted,
      tally.reportsDeleted,
      tally.countersDeleted,
    ].some((count) => count >= BATCH);
    if (more) await ctx.scheduler.runAfter(60_000, internal.retention.run, {});
    return { ...tally, more };
  },
});

/** A job post lives 30 days from publishing. After that it leaves the stack; its owner may publish it again. */
async function closeExpiredJobs(ctx: MutationCtx, now: number): Promise<number> {
  const expired = await ctx.db
    .query("jobs")
    .withIndex("by_status_expires", (q) => q.eq("status", "open").lt("expiresAt", now))
    .take(BATCH);
  let closed = 0;
  for (const job of expired) {
    // Rows with no expiry date sort first in the index and are not expired.
    if (job.expiresAt === undefined) continue;
    await ctx.db.patch(job._id, { status: "closed", closedAt: now });
    await unindexJob(ctx, job._id);
    closed += 1;
  }
  return closed;
}

async function deleteOldClosedJobs(ctx: MutationCtx, now: number): Promise<number> {
  const old = await ctx.db
    .query("jobs")
    .withIndex("by_status_closed", (q) => q.eq("status", "closed").lt("closedAt", now - CLOSED_JOB_KEPT_MS))
    .take(BATCH);
  let deleted = 0;
  for (const job of old) {
    if (job.closedAt === undefined) continue;
    for (const direction of ["left", "right"] as const) {
      const swipes = await ctx.db
        .query("swipes")
        .withIndex("by_job_direction", (q) => q.eq("jobId", job._id).eq("direction", direction))
        .collect();
      for (const swipe of swipes) await ctx.db.delete(swipe._id);
    }
    for (const imageId of job.imageIds ?? []) await ctx.storage.delete(imageId);
    await unindexJob(ctx, job._id);
    await ctx.db.delete(job._id);
    deleted += 1;
  }
  return deleted;
}

async function deleteOldConversations(ctx: MutationCtx, now: number): Promise<number> {
  const cutoff = now - CONVERSATION_KEPT_MS;
  const old = await ctx.db
    .query("matches")
    .withIndex("by_last_message", (q) => q.lt("lastMessageAt", cutoff))
    .take(BATCH);
  let deleted = 0;
  for (const match of old) {
    // An older row may have no date of its last message; its own creation stands in.
    if ((match.lastMessageAt ?? match._creationTime) >= cutoff) continue;
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_match", (q) => q.eq("matchId", match._id))
      .take(MESSAGE_BATCH);
    for (const message of messages) await ctx.db.delete(message._id);
    // A very long conversation keeps its row until the next run has removed the rest of it.
    if (messages.length < MESSAGE_BATCH) {
      await ctx.db.delete(match._id);
      deleted += 1;
    }
  }
  return deleted;
}

/** When the app last saw this person: the last launch, or the day they signed up. */
const lastSeen = (user: { lastSeenAt?: number; _creationTime: number }) => user.lastSeenAt ?? user._creationTime;

/**
 * A month before an unused account is deleted, its owner is told, by the one
 * channel the app has: a notification. Opening the app is all it takes to keep
 * the account. Staff accounts are left alone.
 */
async function warnIdleAccounts(ctx: MutationCtx, now: number): Promise<number> {
  const cutoff = now - ACCOUNT_WARNED_AFTER_MS;
  const idle = await ctx.db
    .query("users")
    .withIndex("by_last_seen", (q) => q.lt("lastSeenAt", cutoff))
    .take(BATCH * 4);
  const notifications: { userId: Id<"users">; notification: { title: string; body: string; data: { type: "account_expiry" }; channelId: string; sound: "default" } }[] = [];
  for (const user of idle) {
    if (notifications.length >= BATCH) break;
    if (user.retentionWarnedAt !== undefined || staffRoleOf(user) !== null) continue;
    if (lastSeen(user) >= cutoff) continue;
    await ctx.db.patch(user._id, { retentionWarnedAt: now });
    notifications.push({
      userId: user._id,
      notification: { ...accountExpiryText(user.language ?? "en"), data: { type: "account_expiry" }, channelId: "activity", sound: "default" },
    });
  }
  // The warning is recorded even for a phone that can no longer be reached: the month of notice still runs.
  if (notifications.length > 0) {
    await push.sendPushNotificationBatch(ctx, { notifications, allowUnregisteredTokens: true });
  }
  return notifications.length;
}

async function deleteIdleAccounts(ctx: MutationCtx, now: number): Promise<number> {
  const cutoff = now - ACCOUNT_KEPT_MS;
  const idle = await ctx.db
    .query("users")
    .withIndex("by_last_seen", (q) => q.lt("lastSeenAt", cutoff))
    .take(BATCH * 4);
  let deleted = 0;
  for (const user of idle) {
    if (deleted >= BATCH) break;
    if (staffRoleOf(user) !== null || lastSeen(user) >= cutoff) continue;
    // Never without the month of notice, however long the account has been idle.
    if (user.retentionWarnedAt === undefined || now - user.retentionWarnedAt < WARNING_NOTICE_MS) continue;
    await deleteAccountData(ctx, user);
    deleted += 1;
  }
  return deleted;
}

/** Settled reports only. One still waiting for a decision is never removed by age. */
async function deleteOldReports(ctx: MutationCtx, now: number): Promise<number> {
  const old = await ctx.db
    .query("reports")
    .withIndex("by_creation_time", (q) => q.lt("_creationTime", now - REPORT_KEPT_MS))
    .take(BATCH * 4);
  let deleted = 0;
  for (const report of old) {
    if (deleted >= BATCH) break;
    if (report.status !== "resolved") continue;
    await ctx.db.delete(report._id);
    deleted += 1;
  }
  return deleted;
}

/** The per-day notification counters are only ever read for today. */
async function deleteOldCounters(ctx: MutationCtx, now: number): Promise<number> {
  const old = await ctx.db
    .query("pushCounters")
    .withIndex("by_creation_time", (q) => q.lt("_creationTime", now - 3 * DAY_MS))
    .take(BATCH);
  for (const counter of old) await ctx.db.delete(counter._id);
  return old.length;
}
