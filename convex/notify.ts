import { PushNotifications } from "@convex-dev/expo-push-notifications";
import { v } from "convex/values";
import { components, internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, internalQuery, type MutationCtx } from "./_generated/server";
import { candidatesGeo, jobsGeo } from "./lib/geo";
import {
  APPLICANT_PUSH_GAP_MS,
  NEW_JOB_DAILY_CAP,
  isQuietHour,
  lastQuietStart,
  tunisDay,
} from "./lib/pushRules";
import {
  applicantsText,
  companyApprovedText,
  digestText,
  matchText,
  messageText,
  newJobText,
  type Lang,
  type Text,
} from "./lib/pushText";

// Every push the app sends starts in this file. Each function is scheduled by
// the action that caused it (publishing, accepting, writing), never called
// inline: the person's action returns at once, and a push that fails can never
// make their action fail. See docs/02-architecture/push.md.

export const push = new PushNotifications<Id<"users">>(components.pushNotifications);

/** The widest radius a candidate can choose; nobody further than this can want the job. */
const MAX_RADIUS_M = 30_000;
/** Candidates considered for one new job. Far above the pilot's size; a larger city needs paging. */
const FAN_OUT_LIMIT = 500;
const DAY_MS = 24 * 60 * 60 * 1000;

// The Android notification channels the app creates; see src/features/push/setup.ts.
const CHANNEL = { jobs: "jobs", messages: "messages", activity: "activity" } as const;

type Payload =
  | { type: "new_job"; jobId: Id<"jobs"> }
  | { type: "digest" }
  | { type: "match" | "message"; matchId: Id<"matches"> }
  | { type: "applicants"; jobId: Id<"jobs"> }
  | { type: "company_approved" };

type Outgoing = { userId: Id<"users">; notification: Text & { data: Payload; channelId: string; sound: "default" } };

function outgoing(userId: Id<"users">, text: Text, data: Payload, channelId: string, extra: object = {}): Outgoing {
  return { userId, notification: { ...text, data, channelId, sound: "default", ...extra } };
}

const langOf = (user: Doc<"users">): Lang => user.language ?? "en";

/** Whether this person's phone is registered. Without it there is nothing to send to. */
async function canReceive(ctx: MutationCtx, userId: Id<"users">): Promise<boolean> {
  const status = await push.getStatusForUser(ctx, { userId });
  return status.hasToken && !status.paused;
}

async function sendAll(ctx: MutationCtx, messages: Outgoing[]): Promise<void> {
  if (messages.length === 0) return;
  // A phone that was unregistered between the check and the send is skipped, not an error.
  await push.sendPushNotificationBatch(ctx, { notifications: messages, allowUnregisteredTokens: true });
}

/** How many "new job" pushes this person has had today, and a way to count one more. */
async function dailyCounter(ctx: MutationCtx, userId: Id<"users">, day: string) {
  const row = await ctx.db
    .query("pushCounters")
    .withIndex("by_user_day", (q) => q.eq("userId", userId).eq("day", day))
    .unique();
  return {
    count: row?.count ?? 0,
    increment: async () => {
      if (row) await ctx.db.patch(row._id, { count: row.count + 1 });
      else await ctx.db.insert("pushCounters", { userId, day, count: 1 });
    },
  };
}

/**
 * A job was published: tell the candidates whose own radius reaches it.
 * Skipped during quiet hours, for people who asked for a daily summary or no
 * pushes, and for anyone already at the daily cap. The job is in their stack
 * either way; only the push is held back.
 */
export const newJob = internalMutation({
  args: { jobId: v.id("jobs") },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job || job.status !== "open" || job.hidden || job.isDemo) return;
    const company = await ctx.db.get(job.companyId);
    if (!company || company.approval !== "approved") return;

    const now = Date.now();
    // Overnight jobs are gathered into the morning summary instead.
    if (isQuietHour(now)) return;
    const day = tunisDay(now);

    const nearby = await candidatesGeo.nearest(ctx, {
      point: job.location,
      limit: FAN_OUT_LIMIT,
      maxDistance: MAX_RADIUS_M,
    });

    const messages: Outgoing[] = [];
    for (const hit of nearby) {
      const candidate = await ctx.db.get(hit.key);
      if (!candidate || candidate.banned || candidate.role !== "candidate" || !candidate.home) continue;
      if ((candidate.notifyNewJobs ?? "all") !== "all") continue;
      // In range means inside the candidate's own radius, not the widest one.
      if (hit.distance > (candidate.radiusM ?? 5_000)) continue;
      if (!(await canReceive(ctx, candidate._id))) continue;

      const counter = await dailyCounter(ctx, candidate._id, day);
      if (counter.count >= NEW_JOB_DAILY_CAP) continue;
      await counter.increment();

      messages.push(
        outgoing(
          candidate._id,
          newJobText(langOf(candidate), job, company.name, hit.distance),
          { type: "new_job", jobId: job._id },
          CHANNEL.jobs,
        ),
      );
    }

    await sendAll(ctx, messages);
    // Shown to nobody yet; kept so a silent failure of the fan-out can be noticed.
    await ctx.db.patch(job._id, { notifiedCount: messages.length });
  },
});

/**
 * The morning summary, run once a day at 07:00 Tunisian time. One push with a
 * count: overnight jobs for people on "all", the last day's jobs for people who
 * asked for a single daily push.
 */
export const digest = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    // Pilot scale: every user row is read. A larger user base needs an index on role and paging.
    const users = await ctx.db.query("users").collect();
    const messages: Outgoing[] = [];

    for (const user of users) {
      if (user.role !== "candidate" || user.banned || !user.home) continue;
      const mode = user.notifyNewJobs ?? "all";
      if (mode === "off") continue;
      if (!(await canReceive(ctx, user._id))) continue;

      const since = mode === "digest" ? now - DAY_MS : lastQuietStart(now);
      const nearby = await jobsGeo.nearest(ctx, {
        point: user.home,
        limit: 50,
        maxDistance: user.radiusM ?? 5_000,
      });

      let count = 0;
      for (const hit of nearby) {
        const job = await ctx.db.get(hit.key);
        if (!job || job.status !== "open" || job.hidden || job.isDemo) continue;
        if ((job.publishedAt ?? 0) < since) continue;
        const swiped = await ctx.db
          .query("swipes")
          .withIndex("by_candidate_job", (q) => q.eq("candidateId", user._id).eq("jobId", job._id))
          .unique();
        if (!swiped) count += 1;
      }
      if (count > 0) {
        messages.push(outgoing(user._id, digestText(langOf(user), count), { type: "digest" }, CHANNEL.jobs));
      }
    }
    await sendAll(ctx, messages);
  },
});

/** An employer accepted an application: tell the candidate a chat is open. */
export const match = internalMutation({
  args: { matchId: v.id("matches") },
  handler: async (ctx, args) => {
    const found = await ctx.db.get(args.matchId);
    if (!found || found.blockedBy) return;
    const candidate = await ctx.db.get(found.candidateId);
    const company = await ctx.db.get(found.companyId);
    if (!candidate || candidate.banned || !company) return;
    await sendAll(ctx, [
      outgoing(
        candidate._id,
        matchText(langOf(candidate), company.name),
        { type: "match", matchId: found._id },
        CHANNEL.messages,
      ),
    ]);
  },
});

/**
 * A chat message was sent: tell the other side, unless they have already seen
 * it. This runs a few seconds after the message, and the chat screen marks the
 * conversation read while it is open, so someone looking at it is not buzzed.
 */
export const message = internalMutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const sent = await ctx.db.get(args.messageId);
    if (!sent) return;
    const found = await ctx.db.get(sent.matchId);
    if (!found || found.blockedBy) return;

    const toCandidate = sent.senderId === found.employerId;
    const recipientId = toCandidate ? found.candidateId : found.employerId;
    const readAt = toCandidate ? found.candidateReadAt : found.employerReadAt;
    if ((readAt ?? 0) >= sent._creationTime) return;

    const recipient = await ctx.db.get(recipientId);
    if (!recipient || recipient.banned) return;

    // A candidate hears from the business; an employer hears from the person.
    const sender = toCandidate ? await ctx.db.get(found.companyId) : await ctx.db.get(found.candidateId);
    const preview = sent.body.length > 120 ? `${sent.body.slice(0, 119)}…` : sent.body;
    await sendAll(ctx, [
      outgoing(
        recipient._id,
        messageText(sender?.name ?? "Ba7dhek", preview),
        { type: "message", matchId: found._id },
        CHANNEL.messages,
        // Several messages in one chat replace each other instead of piling up.
        { collapseId: found._id, tag: found._id },
      ),
    ]);
  },
});

/**
 * Someone applied. The first applicant on a job is announced at once. After
 * that the employer hears at most once an hour per job, with a count, so a
 * popular job does not become a stream of buzzes.
 */
export const applicant = internalMutation({
  args: { jobId: v.id("jobs") },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return;
    const now = Date.now();
    const last = job.applicantPushAt;

    if (last !== undefined && now - last < APPLICANT_PUSH_GAP_MS) {
      // Too soon. One later push is lined up for when the hour is over; more applicants join its count.
      if (!job.applicantPushPending) {
        await ctx.db.patch(job._id, { applicantPushPending: true });
        await ctx.scheduler.runAt(last + APPLICANT_PUSH_GAP_MS, internal.notify.applicantsLater, { jobId: job._id });
      }
      return;
    }
    await sendApplicantCount(ctx, job, now);
  },
});

/** The held-back applicant push, once its hour is over. */
export const applicantsLater = internalMutation({
  args: { jobId: v.id("jobs") },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return;
    await sendApplicantCount(ctx, job, Date.now());
  },
});

async function sendApplicantCount(ctx: MutationCtx, job: Doc<"jobs">, now: number): Promise<void> {
  const since = job.applicantPushAt ?? 0;
  const applied = await ctx.db
    .query("swipes")
    .withIndex("by_job_direction", (q) => q.eq("jobId", job._id).eq("direction", "right"))
    .collect();
  const count = applied.filter((swipe) => swipe._creationTime > since).length;
  await ctx.db.patch(job._id, { applicantPushAt: now, applicantPushPending: false });
  if (count === 0) return;

  const company = await ctx.db.get(job.companyId);
  const employer = company ? await ctx.db.get(company.ownerId) : null;
  if (!employer || employer.banned) return;
  await sendAll(ctx, [
    outgoing(
      employer._id,
      applicantsText(langOf(employer), count, job.title),
      { type: "applicants", jobId: job._id },
      CHANNEL.activity,
    ),
  ]);
}

/** An admin approved the business: its owner can now publish. */
export const companyApproved = internalMutation({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    const company = await ctx.db.get(args.companyId);
    if (!company || company.approval !== "approved") return;
    const owner = await ctx.db.get(company.ownerId);
    if (!owner || owner.banned) return;
    await sendAll(ctx, [
      outgoing(owner._id, companyApprovedText(langOf(owner), company.name), { type: "company_approved" }, CHANNEL.activity),
    ]);
  },
});

/** The pushes queued or sent to one person, newest first. For tests and for looking into a complaint. */
export const sentTo = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await push.getNotificationsForUser(ctx, { userId: args.userId });
  },
});
