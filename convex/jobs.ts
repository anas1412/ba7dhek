import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { requireConsentedUser, requireRole } from "./lib/auth";
import { indexJob, jobsGeo, unindexJob } from "./lib/geo";
import { DEFAULT_RADIUS_M, haversineM } from "./lib/geoMath";
import { MAX_JOB_IMAGES, checkUpload, companyLogoUrl, jobImages } from "./lib/images";
import { cleanText, requireCategory, requireTunisianPoint } from "./lib/validate";
import { benefit, contractType, experience, payPeriod, point, spokenLanguage, workingTime } from "./schema";

export const JOB_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;

// `nearest` has no pagination, so the feed asks for more when swiped jobs
// thin the result. See docs/02-architecture/geo-matching.md.
const FEED_SIZE = 20;
const FEED_LIMITS = [50, 100, 200];

/** A whole number inside a range, or undefined when none was given. */
function clampWhole(value: number | undefined, min: number, max: number): number | undefined {
  if (value === undefined || !Number.isFinite(value)) return undefined;
  return Math.min(max, Math.max(min, Math.round(value)));
}

/** The list without repeats, or undefined when it is empty. */
function unique<T>(values: T[] | undefined): T[] | undefined {
  if (!values || values.length === 0) return undefined;
  return [...new Set(values)];
}

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
    openings: v.optional(v.number()),
    startsNow: v.optional(v.boolean()),
    workingTimes: v.optional(v.array(workingTime)),
    daysPerWeek: v.optional(v.number()),
    benefits: v.optional(v.array(benefit)),
    experience: v.optional(experience),
    languages: v.optional(v.array(spokenLanguage)),
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
      openings: clampWhole(args.openings, 1, 99) ?? 1,
      startsNow: args.startsNow,
      workingTimes: unique(args.workingTimes),
      daysPerWeek: clampWhole(args.daysPerWeek, 1, 7),
      benefits: unique(args.benefits),
      experience: args.experience,
      languages: unique(args.languages),
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
        return { ...job, applicantCount: applicants.length, images: await jobImages(ctx, job) };
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
  companyLogoUrl: string | null;
  /** The job's photos, main one first. Empty when it has none. */
  imageUrls: string[];
  openings: number;
  startsNow: boolean;
  workingTimes: NonNullable<Doc<"jobs">["workingTimes"]>;
  benefits: NonNullable<Doc<"jobs">["benefits"]>;
};

/**
 * The candidate's stack: open jobs within their radius that they have not
 * swiped on, nearest first. Ranking is distance only, the same for everyone.
 */
export const feed = query({
  // Filters narrow the stack; an empty or absent list means "any". Distance still decides the order.
  args: {
    categories: v.optional(v.array(v.string())),
    contractTypes: v.optional(v.array(contractType)),
    startsNow: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<{ reason: "ok" | "no_home"; jobs: JobCard[] }> => {
    const categories = args.categories?.length ? new Set(args.categories.slice(0, 20)) : null;
    const contracts = args.contractTypes?.length ? new Set<string>(args.contractTypes) : null;
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
        if (categories && !categories.has(job.category)) continue;
        if (contracts && !contracts.has(job.contractType)) continue;
        if (args.startsNow && !job.startsNow) continue;
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
          companyLogoUrl: await companyLogoUrl(ctx, company),
          imageUrls: (await jobImages(ctx, job)).map((image) => image.url),
          openings: job.openings ?? 1,
          startsNow: job.startsNow ?? false,
          workingTimes: job.workingTimes ?? [],
          benefits: job.benefits ?? [],
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

/**
 * Adds one photo to a job offer, up to four. An upload that is not an
 * acceptable image, or that would be a fifth, is deleted and the problem returned.
 */
export const addImage = mutation({
  args: { jobId: v.id("jobs"), storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const { job } = await requireOwnJob(ctx, args.jobId);
    const current = job.imageIds ?? [];
    if (current.includes(args.storageId)) return { ok: true as const };
    if (current.length >= MAX_JOB_IMAGES) {
      await ctx.storage.delete(args.storageId);
      return { ok: false as const, problem: "too_many" as const };
    }
    const problem = await checkUpload(ctx, args.storageId);
    if (problem) return { ok: false as const, problem };
    await ctx.db.patch(job._id, { imageIds: [...current, args.storageId] });
    return { ok: true as const };
  },
});

/** Removes one of the job's photos and deletes the file. */
export const removeImage = mutation({
  args: { jobId: v.id("jobs"), storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const { job } = await requireOwnJob(ctx, args.jobId);
    const current = job.imageIds ?? [];
    // Only a file that belongs to this job can be deleted through it.
    if (!current.includes(args.storageId)) throw new ConvexError({ code: "not_found" });
    await ctx.db.patch(job._id, { imageIds: current.filter((id) => id !== args.storageId) });
    await ctx.storage.delete(args.storageId);
  },
});

/** Moves one photo to the front. The first photo is the one at the top of the card. */
export const setMainImage = mutation({
  args: { jobId: v.id("jobs"), storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const { job } = await requireOwnJob(ctx, args.jobId);
    const current = job.imageIds ?? [];
    if (!current.includes(args.storageId)) throw new ConvexError({ code: "not_found" });
    await ctx.db.patch(job._id, {
      imageIds: [args.storageId, ...current.filter((id) => id !== args.storageId)],
    });
  },
});

/** One of the employer's own jobs, with its photos, for the screen that manages them. */
export const mineOne = query({
  args: { jobId: v.id("jobs") },
  handler: async (ctx, args) => {
    const { job } = await requireOwnJob(ctx, args.jobId);
    return { _id: job._id, title: job.title, status: job.status, images: await jobImages(ctx, job) };
  },
});

/**
 * Everything about one job, for its detail screen. A candidate sees any open
 * job; an employer sees their own in any state. A job's place is public, so
 * the exact location is included. The candidate's own location never is.
 */
export const detail = query({
  args: { jobId: v.id("jobs") },
  handler: async (ctx, args) => {
    const user = await requireConsentedUser(ctx);
    const job = await ctx.db.get(args.jobId);
    if (!job) throw new ConvexError({ code: "not_found" });
    const company = await ctx.db.get(job.companyId);
    if (!company) throw new ConvexError({ code: "not_found" });

    const owner = company.ownerId === user._id;
    if (!owner) {
      const visible = job.status === "open" && !job.hidden && company.approval === "approved";
      // A candidate who already applied can still open the job after it closes.
      const applied = await ctx.db
        .query("swipes")
        .withIndex("by_candidate_job", (q) => q.eq("candidateId", user._id).eq("jobId", job._id))
        .unique();
      if (!visible && applied?.direction !== "right") throw new ConvexError({ code: "not_found" });
    }

    const swipe = owner
      ? null
      : await ctx.db
          .query("swipes")
          .withIndex("by_candidate_job", (q) => q.eq("candidateId", user._id).eq("jobId", job._id))
          .unique();

    return {
      _id: job._id,
      title: job.title,
      description: job.description,
      category: job.category,
      contractType: job.contractType,
      payAmount: job.payAmount,
      payPeriod: job.payPeriod,
      status: job.status,
      publishedAt: job.publishedAt ?? job._creationTime,
      openings: job.openings ?? 1,
      startsNow: job.startsNow ?? false,
      workingTimes: job.workingTimes ?? [],
      daysPerWeek: job.daysPerWeek ?? null,
      benefits: job.benefits ?? [],
      experience: job.experience ?? null,
      languages: job.languages ?? [],
      location: job.location,
      // False when the employer placed this job somewhere other than the business itself;
      // the business address would then describe the wrong place.
      atBusiness:
        job.location.latitude === company.location.latitude &&
        job.location.longitude === company.location.longitude,
      imageUrls: (await jobImages(ctx, job)).map((image) => image.url),
      companyName: company.name,
      companyAddress: company.address,
      companyLogoUrl: await companyLogoUrl(ctx, company),
      // Straight-line distance from the candidate's own starting point, for them alone.
      distanceM: !owner && user.home ? Math.round(haversineM(user.home, job.location)) : null,
      mySwipe: swipe?.direction ?? null,
      isOwner: owner,
    };
  },
});
