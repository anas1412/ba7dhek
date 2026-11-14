import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { requireStaff, staffRoleOf } from "./lib/auth";
import { indexJob, unindexJob } from "./lib/geo";
import { logStaffAction } from "./lib/staffLog";
import { push } from "./notify";

// The back office. Two kinds of staff:
//
//   moderator: reviews businesses and reports, hides or closes jobs, bans a person.
//   admin:     everything a moderator can, plus lifting a ban, seeing e-mail
//              addresses, choosing the moderators, and reading the activity log.
//
// Every function checks the caller's role on the server. Every action that
// changes something is written to the activity log with who did it.

/** Lists are capped: enough for one town, and a reminder to add paging beyond it. */
const LIST_LIMIT = 100;
const SCAN_LIMIT = 5000;

const matches = (text: string | undefined, search: string) =>
  search === "" || (text ?? "").toLowerCase().includes(search);

/** The numbers at the top of the back office. */
export const overview = query({
  args: {},
  handler: async (ctx) => {
    await requireStaff(ctx, "moderator");
    const [users, companies, jobs, reports, conversations] = await Promise.all([
      ctx.db.query("users").take(SCAN_LIMIT),
      ctx.db.query("companies").take(SCAN_LIMIT),
      ctx.db.query("jobs").take(SCAN_LIMIT),
      ctx.db.query("reports").withIndex("by_status", (q) => q.eq("status", "open")).take(SCAN_LIMIT),
      ctx.db.query("matches").take(SCAN_LIMIT),
    ]);
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return {
      candidates: users.filter((user) => user.role === "candidate").length,
      employers: users.filter((user) => user.role === "employer").length,
      newPeopleThisWeek: users.filter((user) => user._creationTime > weekAgo).length,
      banned: users.filter((user) => user.banned).length,
      businessesPending: companies.filter((company) => company.approval === "pending").length,
      businessesApproved: companies.filter((company) => company.approval === "approved").length,
      jobsOpen: jobs.filter((job) => job.status === "open" && !job.hidden).length,
      jobsHidden: jobs.filter((job) => job.hidden && job.status === "open").length,
      jobsThisWeek: jobs.filter((job) => (job.publishedAt ?? 0) > weekAgo).length,
      reportsOpen: reports.length,
      conversations: conversations.length,
    };
  },
});

/** Businesses by state, newest first, with what is needed to check one. */
export const companies = query({
  args: { approval: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")) },
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx, "moderator");
    const admin = staffRoleOf(staff) === "admin";
    const found = await ctx.db
      .query("companies")
      .withIndex("by_approval", (q) => q.eq("approval", args.approval))
      .order("desc")
      .take(LIST_LIMIT);
    return await Promise.all(
      found.map(async (company) => {
        const owner = await ctx.db.get(company.ownerId);
        return {
          _id: company._id,
          name: company.name,
          category: company.category,
          address: company.address,
          kind: company.kind ?? null,
          taxId: company.taxId ?? null,
          approval: company.approval,
          rejectionReason: company.rejectionReason ?? null,
          createdAt: company._creationTime,
          ownerName: owner?.name ?? null,
          // An e-mail address is personal data: admins only.
          ownerEmail: admin ? (owner?.email ?? null) : null,
        };
      }),
    );
  },
});

/** Jobs by state, newest first, optionally narrowed by a word in the title or the business name. */
export const jobs = query({
  args: {
    filter: v.union(v.literal("open"), v.literal("hidden"), v.literal("closed"), v.literal("draft")),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireStaff(ctx, "moderator");
    const search = (args.search ?? "").trim().toLowerCase();
    const all = await ctx.db.query("jobs").order("desc").take(SCAN_LIMIT);
    const wanted = all.filter((job) =>
      args.filter === "hidden" ? Boolean(job.hidden) : job.status === args.filter && !job.hidden,
    );

    const rows = [];
    for (const job of wanted) {
      if (rows.length >= LIST_LIMIT) break;
      const company = await ctx.db.get(job.companyId);
      if (!matches(job.title, search) && !matches(company?.name, search)) continue;
      const reports = await ctx.db
        .query("reports")
        .withIndex("by_target", (q) => q.eq("targetType", "job").eq("targetId", job._id))
        .collect();
      rows.push({
        _id: job._id,
        title: job.title,
        description: job.description,
        companyName: company?.name ?? null,
        status: job.status,
        hidden: Boolean(job.hidden),
        payAmount: job.payAmount,
        payPeriod: job.payPeriod,
        createdAt: job._creationTime,
        reportCount: reports.length,
      });
    }
    return rows;
  },
});

async function loadJob(ctx: MutationCtx, jobId: Id<"jobs">): Promise<Doc<"jobs">> {
  const job = await ctx.db.get(jobId);
  if (!job) throw new ConvexError({ code: "not_found" });
  return job;
}

/** Takes a job out of everyone's stack without closing it. The employer sees "hidden, under review". */
export const hideJob = mutation({
  args: { jobId: v.id("jobs") },
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx, "moderator");
    const job = await loadJob(ctx, args.jobId);
    if (job.hidden) return;
    await ctx.db.patch(job._id, { hidden: true });
    await unindexJob(ctx, job._id);
    await logStaffAction(ctx, staff, "hide_job", "job", job._id, job.title);
  },
});

/** Puts a hidden job back. If it was still open, it returns to the stack at its place. */
export const unhideJob = mutation({
  args: { jobId: v.id("jobs") },
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx, "moderator");
    const job = await loadJob(ctx, args.jobId);
    if (!job.hidden) return;
    await ctx.db.patch(job._id, { hidden: false });
    if (job.status === "open") {
      await indexJob(
        ctx,
        job._id,
        job.location,
        { category: job.category, contractType: job.contractType },
        job.publishedAt ?? Date.now(),
      );
    }
    await logStaffAction(ctx, staff, "unhide_job", "job", job._id, job.title);
  },
});

/** Closes a job for good. Hidden as well, so its owner cannot publish it again. */
export const removeJob = mutation({
  args: { jobId: v.id("jobs") },
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx, "moderator");
    const job = await loadJob(ctx, args.jobId);
    await ctx.db.patch(job._id, { status: "closed", closedAt: Date.now(), hidden: true });
    await unindexJob(ctx, job._id);
    await logStaffAction(ctx, staff, "remove_job", "job", job._id, job.title);
  },
});

/** People, newest first, optionally narrowed by a name (or, for an admin, an e-mail address). */
export const people = query({
  args: {
    filter: v.union(v.literal("all"), v.literal("banned"), v.literal("staff")),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx, "moderator");
    const admin = staffRoleOf(staff) === "admin";
    const search = (args.search ?? "").trim().toLowerCase();
    const all = await ctx.db.query("users").order("desc").take(SCAN_LIMIT);

    return all
      .filter((user) =>
        args.filter === "banned" ? Boolean(user.banned) : args.filter === "staff" ? staffRoleOf(user) !== null : true,
      )
      .filter((user) => matches(user.name, search) || (admin && matches(user.email, search)))
      .slice(0, LIST_LIMIT)
      .map((user) => ({
        _id: user._id,
        name: user.name ?? null,
        email: admin ? (user.email ?? null) : null,
        role: user.role ?? null,
        staffRole: staffRoleOf(user),
        banned: Boolean(user.banned),
        joinedAt: user._creationTime,
        lastSeenAt: user.lastSeenAt ?? null,
        isMe: user._id === staff._id,
      }));
  },
});

async function loadPerson(ctx: QueryCtx | MutationCtx, userId: Id<"users">): Promise<Doc<"users">> {
  const user = await ctx.db.get(userId);
  if (!user) throw new ConvexError({ code: "not_found" });
  return user;
}

/**
 * Locks a person out: every function refuses them, their phone stops receiving,
 * and their open jobs come down. Staff cannot be banned from here; an admin
 * removes them from the team first.
 */
export const ban = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx, "moderator");
    const target = await loadPerson(ctx, args.userId);
    if (staffRoleOf(target) !== null) throw new ConvexError({ code: "is_staff" });
    if (target.banned) return;

    await ctx.db.patch(target._id, { banned: true });
    await push.removeToken(ctx, { userId: target._id });
    const company = await ctx.db
      .query("companies")
      .withIndex("by_owner", (q) => q.eq("ownerId", target._id))
      .unique();
    if (company) {
      const open = await ctx.db
        .query("jobs")
        .withIndex("by_company_status", (q) => q.eq("companyId", company._id).eq("status", "open"))
        .collect();
      for (const job of open) {
        await ctx.db.patch(job._id, { status: "closed", closedAt: Date.now() });
        await unindexJob(ctx, job._id);
      }
    }
    await logStaffAction(ctx, staff, "ban", "user", target._id, target.name ?? "");
  },
});

/** Lifts a ban. Admins only. Jobs taken down by the ban stay closed; their owner can publish again. */
export const unban = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx, "admin");
    const target = await loadPerson(ctx, args.userId);
    if (!target.banned) return;
    await ctx.db.patch(target._id, { banned: false });
    await logStaffAction(ctx, staff, "unban", "user", target._id, target.name ?? "");
  },
});

/**
 * Makes someone a moderator, or takes that away. Admins only. Admins themselves
 * are made and unmade from a terminal (convex/adminTools.ts), never from the
 * app, so a stolen admin session cannot mint more admins.
 */
export const setModerator = mutation({
  args: { userId: v.id("users"), moderator: v.boolean() },
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx, "admin");
    const target = await loadPerson(ctx, args.userId);
    if (staffRoleOf(target) === "admin") throw new ConvexError({ code: "is_admin" });
    if (target.banned) throw new ConvexError({ code: "is_banned" });
    await ctx.db.patch(target._id, { staffRole: args.moderator ? "moderator" : undefined });
    await logStaffAction(
      ctx,
      staff,
      args.moderator ? "add_moderator" : "remove_moderator",
      "user",
      target._id,
      target.name ?? "",
    );
  },
});

/** What staff did, newest first. Admins only. */
export const activity = query({
  args: {},
  handler: async (ctx) => {
    await requireStaff(ctx, "admin");
    const rows = await ctx.db.query("staffActions").order("desc").take(LIST_LIMIT);
    return await Promise.all(
      rows.map(async (row) => {
        const by = await ctx.db.get(row.staffId);
        return {
          _id: row._id,
          at: row._creationTime,
          action: row.action,
          targetType: row.targetType,
          label: row.label,
          by: by?.name ?? null,
        };
      }),
    );
  },
});
