import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { requireRole, requireStaff } from "./lib/auth";
import { logStaffAction } from "./lib/staffLog";
import { indexJob, unindexJob } from "./lib/geo";
import { haversineM } from "./lib/geoMath";
import { cleanText } from "./lib/validate";
import { push } from "./notify";

/** A job reported by this many different people is hidden until someone has looked at it. */
export const HIDE_AFTER_REPORTS = 3;

const jobReason = v.union(
  v.literal("asks_money"),
  v.literal("fake"),
  v.literal("inappropriate"),
  v.literal("other"),
);

async function openReportsOn(ctx: QueryCtx | MutationCtx, targetType: "job" | "user", targetId: string) {
  const reports = await ctx.db
    .query("reports")
    .withIndex("by_target", (q) => q.eq("targetType", targetType).eq("targetId", targetId))
    .collect();
  return reports.filter((report) => report.status === "open");
}

/**
 * A candidate reports a job. It leaves their own stack at once. When enough
 * different people have reported the same job, it is hidden from everyone
 * until an admin reviews it. Reporting twice counts once.
 */
export const job = mutation({
  args: { jobId: v.id("jobs"), reason: jobReason, note: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, "candidate");
    const found = await ctx.db.get(args.jobId);
    if (!found) throw new ConvexError({ code: "not_found" });
    const note = args.note ? cleanText(args.note, "note", { max: 500 }) : undefined;

    const open = await openReportsOn(ctx, "job", found._id);
    if (!open.some((report) => report.reporterId === user._id)) {
      await ctx.db.insert("reports", {
        reporterId: user._id,
        targetType: "job",
        targetId: found._id,
        reason: args.reason,
        note,
        status: "open",
      });
      const reporters = new Set([...open.map((report) => report.reporterId), user._id]);
      if (reporters.size >= HIDE_AFTER_REPORTS && !found.hidden) {
        await ctx.db.patch(found._id, { hidden: true });
        await unindexJob(ctx, found._id);
      }
    }

    // The person who reported it should not be shown it again: it counts as a pass.
    const swiped = await ctx.db
      .query("swipes")
      .withIndex("by_candidate_job", (q) => q.eq("candidateId", user._id).eq("jobId", found._id))
      .unique();
    if (!swiped && user.home) {
      await ctx.db.insert("swipes", {
        candidateId: user._id,
        jobId: found._id,
        direction: "left",
        distanceM: Math.round(haversineM(user.home, found.location)),
      });
    }
  },
});

/** Everything waiting for a decision, oldest first, with enough about each target to judge it. */
export const open = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await requireStaff(ctx, "moderator");
    const result = await ctx.db
      .query("reports")
      .withIndex("by_status", (q) => q.eq("status", "open"))
      .order("asc")
      .paginate(args.paginationOpts);

    const page = await Promise.all(
      result.page.map(async (report) => {
        const reporter = await ctx.db.get(report.reporterId);
        const base = {
          _id: report._id,
          reportedAt: report._creationTime,
          reason: report.reason,
          note: report.note ?? null,
          reporterName: reporter?.name ?? null,
        };
        if (report.targetType === "job") {
          const target = await ctx.db.get(report.targetId as Id<"jobs">);
          const company = target ? await ctx.db.get(target.companyId) : null;
          return {
            ...base,
            kind: "job" as const,
            jobId: target?._id ?? null,
            title: target?.title ?? null,
            description: target?.description ?? null,
            companyName: company?.name ?? null,
            hidden: Boolean(target?.hidden),
            status: target?.status ?? null,
            reportCount: (await openReportsOn(ctx, "job", report.targetId)).length,
          };
        }
        const target = await ctx.db.get(report.targetId as Id<"users">);
        return {
          ...base,
          kind: "user" as const,
          userId: target?._id ?? null,
          title: target?.name ?? null,
          role: target?.role ?? null,
          banned: Boolean(target?.banned),
          // True when the report came from a chat, which staff may then read.
          hasChat: Boolean(report.matchId),
          reportCount: (await openReportsOn(ctx, "user", report.targetId)).length,
        };
      }),
    );
    return { ...result, page };
  },
});

/** Closes every open job of a business and takes them out of the stack. */
async function closeJobsOf(ctx: MutationCtx, company: Doc<"companies">): Promise<void> {
  const jobs = await ctx.db
    .query("jobs")
    .withIndex("by_company_status", (q) => q.eq("companyId", company._id).eq("status", "open"))
    .collect();
  for (const found of jobs) {
    await ctx.db.patch(found._id, { status: "closed", closedAt: Date.now() });
    await unindexJob(ctx, found._id);
  }
}

/**
 * The admin's decision on a report.
 * - dismiss: nothing wrong. A hidden job with no other report comes back.
 * - remove: the job is closed for good, or the person is banned. Every open
 *   report about the same target is settled with it.
 */
export const resolve = mutation({
  args: { reportId: v.id("reports"), action: v.union(v.literal("dismiss"), v.literal("remove")) },
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx, "moderator");
    const report = await ctx.db.get(args.reportId);
    if (!report || report.status !== "open") throw new ConvexError({ code: "not_found" });
    const now = Date.now();
    const settle = (id: Id<"reports">) =>
      ctx.db.patch(id, { status: "resolved", resolution: args.action, resolvedAt: now });

    if (report.targetType === "job") {
      const target = await ctx.db.get(report.targetId as Id<"jobs">);
      if (args.action === "dismiss") {
        await settle(report._id);
        await logStaffAction(ctx, staff, "dismiss_report", "report", report._id, target?.title ?? "");
        const left = await openReportsOn(ctx, "job", report.targetId);
        if (target?.hidden && left.length < HIDE_AFTER_REPORTS) {
          await ctx.db.patch(target._id, { hidden: false });
          // Back in the stack, at its place, if it is still open.
          if (target.status === "open") {
            await indexJob(
              ctx,
              target._id,
              target.location,
              { category: target.category, contractType: target.contractType },
              target.publishedAt ?? now,
            );
          }
        }
        return;
      }
      for (const other of await openReportsOn(ctx, "job", report.targetId)) await settle(other._id);
      if (target) {
        await ctx.db.patch(target._id, { status: "closed", closedAt: now, hidden: true });
        await unindexJob(ctx, target._id);
        await logStaffAction(ctx, staff, "remove_job", "job", target._id, target.title);
      }
      return;
    }

    if (report.targetType === "user") {
      if (args.action === "dismiss") {
        await settle(report._id);
        await logStaffAction(ctx, staff, "dismiss_report", "report", report._id, "");
        return;
      }
      for (const other of await openReportsOn(ctx, "user", report.targetId)) await settle(other._id);
      const target = await ctx.db.get(report.targetId as Id<"users">);
      if (target) {
        // A banned person is refused by every function, receives nothing more, and their jobs come down.
        await ctx.db.patch(target._id, { banned: true });
        await push.removeToken(ctx, { userId: target._id });
        const company = await ctx.db
          .query("companies")
          .withIndex("by_owner", (q) => q.eq("ownerId", target._id))
          .unique();
        if (company) await closeJobsOf(ctx, company);
        await logStaffAction(ctx, staff, "ban", "user", target._id, target.name ?? "");
      }
      return;
    }

    await settle(report._id);
  },
});
