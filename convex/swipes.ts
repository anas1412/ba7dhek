import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type QueryCtx } from "./_generated/server";
import { requireRole } from "./lib/auth";
import { userPhotoUrl } from "./lib/images";
import { distanceBucket, haversineM } from "./lib/geoMath";

/**
 * A swipe is final: left never returns, right is the application. Swiping
 * right is the act that shows the candidate's profile to that employer, which
 * the candidate agreed to on the consent screen.
 */
export const record = mutation({
  args: { jobId: v.id("jobs"), direction: v.union(v.literal("left"), v.literal("right")) },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, "candidate");
    if (!user.home) throw new ConvexError({ code: "no_home" });

    const job = await ctx.db.get(args.jobId);
    if (!job || job.status !== "open" || job.hidden) throw new ConvexError({ code: "job_unavailable" });

    const existing = await ctx.db
      .query("swipes")
      .withIndex("by_candidate_job", (q) => q.eq("candidateId", user._id).eq("jobId", job._id))
      .unique();
    if (existing) throw new ConvexError({ code: "already_swiped" });

    return await ctx.db.insert("swipes", {
      candidateId: user._id,
      jobId: job._id,
      direction: args.direction,
      decision: args.direction === "right" ? "pending" : undefined,
      // Stored now so the employer's distance range does not shift if the candidate moves.
      distanceM: Math.round(haversineM(user.home, job.location)),
    });
  },
});

/** The conversation an accepted application opened, if any. */
async function matchIdFor(ctx: QueryCtx, swipe: Doc<"swipes">): Promise<Id<"matches"> | null> {
  if (swipe.decision !== "accepted") return null;
  const match = await ctx.db
    .query("matches")
    .withIndex("by_job_candidate", (q) => q.eq("jobId", swipe.jobId).eq("candidateId", swipe.candidateId))
    .first();
  return match?._id ?? null;
}

/** The candidate's applications, newest first. */
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireRole(ctx, "candidate");
    const swipes = await ctx.db
      .query("swipes")
      .withIndex("by_candidate_direction", (q) =>
        q.eq("candidateId", user._id).eq("direction", "right"),
      )
      .order("desc")
      .collect();

    return await Promise.all(
      swipes.map(async (swipe) => {
        const job = await ctx.db.get(swipe.jobId);
        const company = job ? await ctx.db.get(job.companyId) : null;
        return {
          _id: swipe._id,
          // Null once the job itself has been deleted.
          jobId: job?._id ?? null,
          appliedAt: swipe._creationTime,
          decision: swipe.decision ?? "pending",
          matchId: await matchIdFor(ctx, swipe),
          jobTitle: job?.title ?? null,
          jobStatus: job?.status ?? "closed",
          companyName: company?.name ?? null,
        };
      }),
    );
  },
});

/**
 * Who applied to one of the employer's jobs, in the order they applied. The
 * app does not rank or recommend applicants. The employer gets a distance
 * range, never the distance itself or any coordinates.
 */
export const forJob = query({
  args: { jobId: v.id("jobs") },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, "employer");
    const job = await ctx.db.get(args.jobId);
    if (!job) throw new ConvexError({ code: "not_found" });
    const company = await ctx.db.get(job.companyId);
    if (!company || company.ownerId !== user._id) throw new ConvexError({ code: "forbidden" });

    const swipes = await ctx.db
      .query("swipes")
      .withIndex("by_job_direction", (q) => q.eq("jobId", job._id).eq("direction", "right"))
      .order("asc")
      .collect();

    return await Promise.all(
      swipes.map(async (swipe) => {
        const candidate = await ctx.db.get(swipe.candidateId);
        return {
          _id: swipe._id,
          appliedAt: swipe._creationTime,
          decision: swipe.decision ?? "pending",
          matchId: await matchIdFor(ctx, swipe),
          name: candidate?.name ?? "",
          photoUrl: candidate ? await userPhotoUrl(ctx, candidate) : null,
          about: candidate?.about ?? null,
          distanceBucket: distanceBucket(swipe.distanceM),
        };
      }),
    );
  },
});

/** The employer accepts or rejects an applicant. Accepting opens a match. */
export const decide = mutation({
  args: { swipeId: v.id("swipes"), accept: v.boolean() },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, "employer");
    const swipe = await ctx.db.get(args.swipeId);
    if (!swipe || swipe.direction !== "right") throw new ConvexError({ code: "not_found" });
    const job = await ctx.db.get(swipe.jobId);
    const company = job ? await ctx.db.get(job.companyId) : null;
    if (!job || !company || company.ownerId !== user._id) throw new ConvexError({ code: "forbidden" });
    if (swipe.decision && swipe.decision !== "pending") {
      throw new ConvexError({ code: "already_decided" });
    }

    await ctx.db.patch(swipe._id, {
      decision: args.accept ? "accepted" : "rejected",
      decidedAt: Date.now(),
    });
    if (!args.accept) return null;

    const now = Date.now();
    return await ctx.db.insert("matches", {
      jobId: job._id,
      companyId: company._id,
      candidateId: swipe.candidateId,
      employerId: user._id,
      // Dated from the acceptance, so a new conversation sits at the top of both lists.
      lastMessageAt: now,
      // The employer opened it; for the candidate it is news until they look.
      lastSenderId: user._id,
      employerReadAt: now,
    });
  },
});
