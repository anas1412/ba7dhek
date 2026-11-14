import type { Doc, Id } from "./_generated/dataModel";
import { mutation, type MutationCtx } from "./_generated/server";
import { requireUser } from "./lib/auth";
import { unindexCandidate, unindexJob } from "./lib/geo";
import { push } from "./notify";

/**
 * Deletes the signed-in person's account, at once and for good.
 *
 * Removed: the profile, the uploaded photo, the starting point, every swipe,
 * the phone's push registration, the sign-in records, and for an employer the
 * business, its logo, its jobs, their photos and the applications to them.
 *
 * Kept: conversations the person took part in, so the other side does not lose
 * theirs. They are closed to new messages and show "Deleted account". Reports
 * are kept too: deleting an account must not erase the trail of a complaint.
 */
export const remove = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);

    await closeConversations(ctx, user);
    if (user.role === "candidate") await removeCandidateData(ctx, user);
    if (user.role === "employer") await removeEmployerData(ctx, user);

    // Whatever the role: the phone, the photo, the daily counters, the sign-in.
    await push.removeToken(ctx, { userId: user._id });
    if (user.photoId) await ctx.storage.delete(user.photoId);
    const counters = await ctx.db
      .query("pushCounters")
      .withIndex("by_user_day", (q) => q.eq("userId", user._id))
      .collect();
    for (const counter of counters) await ctx.db.delete(counter._id);

    await removeSignIn(ctx, user._id);
    await ctx.db.delete(user._id);
  },
});

/** Nobody can write to someone who is gone, so their conversations are closed. */
async function closeConversations(ctx: MutationCtx, user: Doc<"users">): Promise<void> {
  const asCandidate = await ctx.db
    .query("matches")
    .withIndex("by_candidate", (q) => q.eq("candidateId", user._id))
    .collect();
  const asEmployer = await ctx.db
    .query("matches")
    .withIndex("by_employer", (q) => q.eq("employerId", user._id))
    .collect();
  for (const match of [...asCandidate, ...asEmployer]) {
    // Closed in the departing person's name, so the other side cannot reopen it.
    await ctx.db.patch(match._id, { blockedBy: user._id });
  }
}

async function removeCandidateData(ctx: MutationCtx, user: Doc<"users">): Promise<void> {
  // Applications and passes alike: employers stop seeing this person among their applicants.
  const swipes = await ctx.db
    .query("swipes")
    .withIndex("by_candidate_job", (q) => q.eq("candidateId", user._id))
    .collect();
  for (const swipe of swipes) await ctx.db.delete(swipe._id);
  await unindexCandidate(ctx, user._id);
}

async function removeEmployerData(ctx: MutationCtx, user: Doc<"users">): Promise<void> {
  const company = await ctx.db
    .query("companies")
    .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
    .unique();
  if (!company) return;

  const jobs = await ctx.db
    .query("jobs")
    .withIndex("by_company_status", (q) => q.eq("companyId", company._id))
    .collect();
  for (const job of jobs) {
    await unindexJob(ctx, job._id);
    for (const imageId of job.imageIds ?? []) await ctx.storage.delete(imageId);
    // The applications go with the job: there is nothing left to have applied to.
    for (const direction of ["left", "right"] as const) {
      const swipes = await ctx.db
        .query("swipes")
        .withIndex("by_job_direction", (q) => q.eq("jobId", job._id).eq("direction", direction))
        .collect();
      for (const swipe of swipes) await ctx.db.delete(swipe._id);
    }
    await ctx.db.delete(job._id);
  }

  if (company.logoId) await ctx.storage.delete(company.logoId);
  await ctx.db.delete(company._id);
}

/** The records Convex Auth keeps for a person: the linked Google account and every open session. */
async function removeSignIn(ctx: MutationCtx, userId: Id<"users">): Promise<void> {
  const sessions = await ctx.db
    .query("authSessions")
    .withIndex("userId", (q) => q.eq("userId", userId))
    .collect();
  for (const session of sessions) {
    const tokens = await ctx.db
      .query("authRefreshTokens")
      .withIndex("sessionId", (q) => q.eq("sessionId", session._id))
      .collect();
    for (const token of tokens) await ctx.db.delete(token._id);
    await ctx.db.delete(session._id);
  }
  const accounts = await ctx.db
    .query("authAccounts")
    .withIndex("userIdAndProvider", (q) => q.eq("userId", userId))
    .collect();
  for (const account of accounts) {
    const codes = await ctx.db
      .query("authVerificationCodes")
      .withIndex("accountId", (q) => q.eq("accountId", account._id))
      .collect();
    for (const code of codes) await ctx.db.delete(code._id);
    await ctx.db.delete(account._id);
  }
}
