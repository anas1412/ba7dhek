import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { requireRole } from "./lib/auth";
import { indexJob, jobsGeo, unindexJob } from "./lib/geo";
import { DEFAULT_RADIUS_M } from "./lib/geoMath";
import { cleanText, requireCategory, requireTunisianPoint } from "./lib/validate";
import { contractType, payPeriod, point } from "./schema";

export const JOB_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;

// `nearest` has no pagination, so the feed asks for more when swiped jobs
// thin the result. See docs/02-architecture/geo-matching.md.
const FEED_SIZE = 20;
const FEED_LIMITS = [50, 100, 200];

async function ownCompany(ctx: QueryCtx | MutationCtx, ownerId: Id<"users">) {
  return await ctx.db
    .query("companies")
    .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
    .unique();
}

/** Loads a job and checks that the signed-in employer owns it. */
async function requireOwnJob(ctx: QueryCtx | MutationCtx, jobId: Id<"jobs">) {
  const user = await requireRole(ctx, "employer");
  const job = await ctx.db.get(jobId);
  if (!job) throw new ConvexError({ code: "not_found" });
  const company = await ctx.db.get(job.companyId);
  if (!company || company.ownerId !== user._id) throw new ConvexError({ code: "forbidden" });
  return { user, job, company };
}

/** Saves a draft. Pay is mandatory: a job cannot exist without it. */
export const create = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    category: v.string(),
    contractType,
    payAmount: v.number(),
    payPeriod,
    location: v.optional(point),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, "employer");
    const company = await ownCompany(ctx, user._id);
    if (!company) throw new ConvexError({ code: "no_company" });
    if (!Number.isFinite(args.payAmount) || args.payAmount <= 0) {
      throw new ConvexError({ code: "invalid_pay" });
    }

    return await ctx.db.insert("jobs", {
      companyId: company._id,
      title: cleanText(args.title, "title", { min: 3, max: 80 }),
      description: cleanText(args.description, "description", { max: 2000 }),
      category: requireCategory(args.category),
      contractType: args.contractType,
      payAmount: args.payAmount,
      payPeriod: args.payPeriod,
      // Defaults to the company's pin; a different site can be chosen.
      location: args.location
        ? requireTunisianPoint(args.location, "location")
        : company.location,
      status: "draft",
      notifiedCount: 0,
    });
  },
});

/** Makes a job visible to candidates nearby. Only an approved company can publish. */
export const publish = mutation({
  args: { jobId: v.id("jobs") },
  handler: async (ctx, args) => {
    const { job, company } = await requireOwnJob(ctx, args.jobId);
    if (company.approval !== "approved") throw new ConvexError({ code: "company_not_approved" });
    if (job.status === "open") return;

    const now = Date.now();
    await ctx.db.patch(job._id, {
      status: "open",
      publishedAt: now,
      expiresAt: now + JOB_LIFETIME_MS,
      closedAt: undefined,
    });
    await indexJob(
      ctx,
      job._id,
      job.location,
      { category: job.category, contractType: job.contractType },
      now,
    );
    // The push fan-out to candidates in range is added with Milestone 5.
  },
});

export const close = mutation({
  args: { jobId: v.id("jobs") },
  handler: async (ctx, args) => {
    const { job } = await requireOwnJob(ctx, args.jobId);
    if (job.status === "closed") return;
    await ctx.db.patch(job._id, { status: "closed", closedAt: Date.now() });
    await unindexJob(ctx, job._id);
  },
});

/** The employer's own jobs, newest first, with how many people applied. */
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireRole(ctx, "employer");
    const company = await ownCompany(ctx, user._id);
    if (!company) return [];

    const jobs = await ctx.db
      .query("jobs")
      .withIndex("by_company_status", (q) => q.eq("companyId", company._id))
      .collect();
    jobs.sort((a, b) => b._creationTime - a._creationTime);

    return await Promise.all(
      jobs.map(async (job) => {
        const applicants = await ctx.db
          .query("swipes")
          .withIndex("by_job_direction", (q) => q.eq("jobId", job._id).eq("direction", "right"))
          .collect();
        return { ...job, applicantCount: applicants.length };
      }),
    );
  },
});

export type JobCard = {
  _id: Id<"jobs">;
  title: string;
  description: string;
  category: string;
  contractType: Doc<"jobs">["contractType"];
  payAmount: number;
  payPeriod: Doc<"jobs">["payPeriod"];
  publishedAt: number;
  distanceM: number;
  companyName: string;
};

/**
 * The candidate's stack: open jobs within their radius that they have not
 * swiped on, nearest first. Ranking is distance only, the same for everyone.
 */
export const feed = query({
  args: {},
  handler: async (ctx): Promise<{ reason: "ok" | "no_home"; jobs: JobCard[] }> => {
    const user = await requireRole(ctx, "candidate");
    if (!user.home) return { reason: "no_home", jobs: [] };
    const radiusM = user.radiusM ?? DEFAULT_RADIUS_M;

    const swiped = new Set(
      (
        await ctx.db
          .query("swipes")
          .withIndex("by_candidate_job", (q) => q.eq("candidateId", user._id))
          .collect()
      ).map((swipe) => swipe.jobId),
    );

    const now = Date.now();
    const cards: JobCard[] = [];
    for (const limit of FEED_LIMITS) {
      cards.length = 0;
      const nearby = await jobsGeo.nearest(ctx, { point: user.home, limit, maxDistance: radiusM });

      for (const hit of nearby) {
        if (swiped.has(hit.key)) continue;
        const job = await ctx.db.get(hit.key);
        // The index should only hold open jobs; these checks cover a stale entry.
        if (!job || job.status !== "open" || job.hidden || job.isDemo) continue;
        if (job.expiresAt !== undefined && job.expiresAt <= now) continue;
        const company = await ctx.db.get(job.companyId);
        if (!company || company.approval !== "approved") continue;

        cards.push({
          _id: job._id,
          title: job.title,
          description: job.description,
          category: job.category,
          contractType: job.contractType,
          payAmount: job.payAmount,
          payPeriod: job.payPeriod,
          publishedAt: job.publishedAt ?? job._creationTime,
          distanceM: Math.round(hit.distance),
          companyName: company.name,
        });
        if (cards.length >= FEED_SIZE) break;
      }

      // Enough cards, or the index has nothing further inside the radius.
      if (cards.length >= FEED_SIZE || nearby.length < limit) break;
    }

    cards.sort((a, b) => a.distanceM - b.distanceM);
    return { reason: "ok", jobs: cards };
  },
});
