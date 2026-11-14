import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { requireStaff, staffRoleOf } from "./lib/auth";
import { indexJob, unindexJob } from "./lib/geo";
import { tunisDay } from "./lib/pushRules";
import { logStaffAction } from "./lib/staffLog";
import { push } from "./notify";

// The back office. Two kinds of staff:
//
//   moderator: reviews businesses and reports, hides or closes jobs, bans a person,
//              reads a conversation that was reported.
//   admin:     everything a moderator can, plus lifting a ban, seeing e-mail
//              addresses, choosing the moderators, exporting, and reading the activity log.
//
// Every function checks the caller's role on the server. Every action that
// changes something, and every read of private material, is written to the
// activity log with who did it.
//
// Lists are paginated: the screen asks for a page and then for the next, so
// nothing is cut off however long a list grows.

/** The overview counts by reading rows. Past this many in a table it says "or more" instead of a wrong number. */
const COUNT_LIMIT = 5000;
/** The most rows one export holds. */
const EXPORT_LIMIT = 5000;
const DAY_MS = 24 * 60 * 60 * 1000;
const CHART_DAYS = 14;

const matches = (text: string | undefined | null, search: string) =>
  search === "" || (text ?? "").toLowerCase().includes(search);

/** The numbers at the top of the back office, and three series for the last two weeks. */
export const overview = query({
  args: {},
  handler: async (ctx) => {
    await requireStaff(ctx, "moderator");
    const now = Date.now();
    const since = now - CHART_DAYS * DAY_MS;
    const [users, companies, jobs, reports, conversations, applications] = await Promise.all([
      ctx.db.query("users").take(COUNT_LIMIT),
      ctx.db.query("companies").take(COUNT_LIMIT),
      ctx.db.query("jobs").take(COUNT_LIMIT),
      ctx.db.query("reports").withIndex("by_status", (q) => q.eq("status", "open")).take(COUNT_LIMIT),
      ctx.db.query("matches").take(COUNT_LIMIT),
      ctx.db
        .query("swipes")
        .withIndex("by_creation_time", (q) => q.gt("_creationTime", since))
        .take(COUNT_LIMIT),
    ]);
    const weekAgo = now - 7 * DAY_MS;

    // One entry per Tunisian calendar day, oldest first, zeros included so a quiet day shows as quiet.
    const days = Array.from({ length: CHART_DAYS }, (_, index) => tunisDay(now - (CHART_DAYS - 1 - index) * DAY_MS));
    const perDay = (times: number[]) => {
      const counts = new Map(days.map((day) => [day, 0]));
      for (const time of times) {
        const day = tunisDay(time);
        if (counts.has(day)) counts.set(day, (counts.get(day) ?? 0) + 1);
      }
      return days.map((day) => ({ day, count: counts.get(day) ?? 0 }));
    };

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
      // True when a table is larger than what was read, so the figures above are a floor.
      capped: [users, companies, jobs, reports, conversations, applications].some((rows) => rows.length >= COUNT_LIMIT),
      daily: {
        accounts: perDay(users.map((user) => user._creationTime)),
        jobs: perDay(jobs.flatMap((job) => (job.publishedAt ? [job.publishedAt] : []))),
        applications: perDay(
          applications.filter((swipe) => swipe.direction === "right").map((swipe) => swipe._creationTime),
        ),
      },
    };
  },
});

async function companyRow(ctx: QueryCtx, company: Doc<"companies">, admin: boolean) {
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
}

/** Businesses by state, newest first, a page at a time. */
export const companies = query({
  args: {
    approval: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx, "moderator");
    const admin = staffRoleOf(staff) === "admin";
    const result = await ctx.db
      .query("companies")
      .withIndex("by_approval", (q) => q.eq("approval", args.approval))
      .order("desc")
      .paginate(args.paginationOpts);
    return { ...result, page: await Promise.all(result.page.map((company) => companyRow(ctx, company, admin))) };
  },
});

async function jobRow(ctx: QueryCtx, job: Doc<"jobs">, company: Doc<"companies"> | null) {
  const reports = await ctx.db
    .query("reports")
    .withIndex("by_target", (q) => q.eq("targetType", "job").eq("targetId", job._id))
    .collect();
  return {
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
  };
}

/**
 * Jobs by state, newest first, a page at a time, optionally narrowed by a word
 * in the title or the business name. The search is applied to each page as it
 * is read, so a page can come back short or empty while more remain: the
 * screen keeps offering "load more" until the list is done.
 */
export const jobs = query({
  args: {
    filter: v.union(v.literal("open"), v.literal("hidden"), v.literal("closed"), v.literal("draft")),
    search: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    await requireStaff(ctx, "moderator");
    const search = (args.search ?? "").trim().toLowerCase();
    const filter = args.filter;
    const result =
      filter === "hidden"
        ? await ctx.db
            .query("jobs")
            .withIndex("by_hidden", (q) => q.eq("hidden", true))
            .order("desc")
            .paginate(args.paginationOpts)
        : await ctx.db
            .query("jobs")
            .withIndex("by_status", (q) => q.eq("status", filter))
            .order("desc")
            .paginate(args.paginationOpts);

    const page = [];
    for (const job of result.page) {
      // A hidden job is listed under "hidden", whatever its status.
      if (filter !== "hidden" && job.hidden) continue;
      const company = await ctx.db.get(job.companyId);
      if (!matches(job.title, search) && !matches(company?.name, search)) continue;
      page.push(await jobRow(ctx, job, company));
    }
    return { ...result, page };
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

function personRow(user: Doc<"users">, admin: boolean, me: Id<"users">) {
  return {
    _id: user._id,
    name: user.name ?? null,
    email: admin ? (user.email ?? null) : null,
    role: user.role ?? null,
    staffRole: staffRoleOf(user),
    banned: Boolean(user.banned),
    joinedAt: user._creationTime,
    lastSeenAt: user.lastSeenAt ?? null,
    isMe: user._id === me,
  };
}

/**
 * People, newest first, a page at a time, optionally narrowed by a name (or,
 * for an admin, an e-mail address). As with jobs, a search can make a page
 * come back short while more remain.
 */
export const people = query({
  args: {
    filter: v.union(v.literal("all"), v.literal("banned"), v.literal("staff")),
    search: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx, "moderator");
    const admin = staffRoleOf(staff) === "admin";
    const search = (args.search ?? "").trim().toLowerCase();
    const result =
      args.filter === "banned"
        ? await ctx.db
            .query("users")
            .withIndex("by_banned", (q) => q.eq("banned", true))
            .order("desc")
            .paginate(args.paginationOpts)
        : await ctx.db.query("users").order("desc").paginate(args.paginationOpts);

    const page = result.page
      .filter((user) => args.filter !== "staff" || staffRoleOf(user) !== null)
      .filter((user) => matches(user.name, search) || (admin && matches(user.email, search)))
      .map((user) => personRow(user, admin, staff._id));
    return { ...result, page };
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

/** What staff did, newest first, a page at a time. Admins only. */
export const activity = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await requireStaff(ctx, "admin");
    const result = await ctx.db.query("staffActions").order("desc").paginate(args.paginationOpts);
    const page = await Promise.all(
      result.page.map(async (row) => {
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
    return { ...result, page };
  },
});

/**
 * The one way staff read a private conversation: through an open report made
 * from inside it. The person who reported was told this before sending. There
 * is no function that lists or opens conversations otherwise. It is a mutation
 * rather than a query so that every reading is written to the activity log.
 */
export const readReportedChat = mutation({
  args: { reportId: v.id("reports") },
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx, "moderator");
    const report = await ctx.db.get(args.reportId);
    if (!report || report.status !== "open" || !report.matchId) throw new ConvexError({ code: "not_found" });
    const match = await ctx.db.get(report.matchId);
    if (!match) throw new ConvexError({ code: "not_found" });

    const [candidate, company, job] = await Promise.all([
      ctx.db.get(match.candidateId),
      ctx.db.get(match.companyId),
      ctx.db.get(match.jobId),
    ]);
    const newest = await ctx.db
      .query("messages")
      .withIndex("by_match", (q) => q.eq("matchId", match._id))
      .order("desc")
      .take(200);

    await logStaffAction(ctx, staff, "read_chat", "report", report._id, candidate?.name ?? company?.name ?? "");
    return {
      jobTitle: job?.title ?? null,
      candidateName: candidate?.name ?? null,
      companyName: company?.name ?? null,
      reportedSide: report.targetId === match.candidateId ? ("candidate" as const) : ("employer" as const),
      messages: newest.reverse().map((message) => ({
        _id: message._id,
        body: message.body,
        sentAt: message._creationTime,
        from: message.senderId === match.candidateId ? ("candidate" as const) : ("employer" as const),
      })),
    };
  },
});

/** One value as a CSV cell: quoted, and never able to start a spreadsheet formula. */
function cell(value: string | number | boolean | null | undefined): string {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

const csv = (header: string[], rows: (string | number | boolean | null | undefined)[][]) =>
  [header, ...rows].map((row) => row.map(cell).join(",")).join("\r\n");

const iso = (time: number | undefined | null) => (time ? new Date(time).toISOString() : "");

/**
 * A spreadsheet file of one list, up to 5,000 rows, newest first. Admins only:
 * the people and businesses files hold e-mail addresses. Logged, because a
 * file leaves the app.
 */
export const exportCsv = mutation({
  args: { kind: v.union(v.literal("people"), v.literal("businesses"), v.literal("jobs"), v.literal("activity")) },
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx, "admin");
    let text: string;
    let count: number;

    if (args.kind === "people") {
      const users = await ctx.db.query("users").order("desc").take(EXPORT_LIMIT);
      count = users.length;
      text = csv(
        ["id", "name", "email", "role", "staff", "banned", "joined", "last_seen"],
        users.map((u) => [u._id, u.name, u.email, u.role, staffRoleOf(u), Boolean(u.banned), iso(u._creationTime), iso(u.lastSeenAt)]),
      );
    } else if (args.kind === "businesses") {
      const found = await ctx.db.query("companies").order("desc").take(EXPORT_LIMIT);
      count = found.length;
      const rows = await Promise.all(
        found.map(async (c) => {
          const owner = await ctx.db.get(c.ownerId);
          return [c._id, c.name, c.category, c.address, c.kind, c.taxId, c.approval, c.rejectionReason, owner?.name, owner?.email, iso(c._creationTime)];
        }),
      );
      text = csv(["id", "name", "category", "address", "kind", "tax_id", "approval", "rejection_reason", "owner", "owner_email", "created"], rows);
    } else if (args.kind === "jobs") {
      const found = await ctx.db.query("jobs").order("desc").take(EXPORT_LIMIT);
      count = found.length;
      const rows = await Promise.all(
        found.map(async (j) => {
          const company = await ctx.db.get(j.companyId);
          return [j._id, j.title, company?.name, j.category, j.contractType, j.payAmount, j.payPeriod, j.status, Boolean(j.hidden), j.openings ?? 1, iso(j.publishedAt), iso(j._creationTime)];
        }),
      );
      text = csv(["id", "title", "business", "category", "contract", "pay", "pay_period", "status", "hidden", "openings", "published", "created"], rows);
    } else {
      const found = await ctx.db.query("staffActions").order("desc").take(EXPORT_LIMIT);
      count = found.length;
      const rows = await Promise.all(
        found.map(async (a) => {
          const by = await ctx.db.get(a.staffId);
          return [iso(a._creationTime), by?.name, a.action, a.targetType, a.label, a.targetId];
        }),
      );
      text = csv(["when", "by", "action", "target_type", "target", "target_id"], rows);
    }

    await logStaffAction(ctx, staff, "export", "report", args.kind, args.kind);
    return { text, count, capped: count >= EXPORT_LIMIT };
  },
});
