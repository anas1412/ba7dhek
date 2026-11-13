import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin, requireRole } from "./lib/auth";
import { unindexJob } from "./lib/geo";
import { cleanText, requireCategory, requireTunisianPoint } from "./lib/validate";
import { point } from "./schema";

/** The signed-in employer's company, or null before they have created one. */
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireRole(ctx, "employer");
    return await ctx.db
      .query("companies")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .unique();
  },
});

/** One company per employer. It starts pending and is approved by hand. */
export const create = mutation({
  args: { name: v.string(), category: v.string(), address: v.string(), location: point },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, "employer");
    const existing = await ctx.db
      .query("companies")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .unique();
    if (existing) throw new ConvexError({ code: "company_exists" });

    const id = await ctx.db.insert("companies", {
      ownerId: user._id,
      name: cleanText(args.name, "name", { min: 2, max: 80 }),
      category: requireCategory(args.category),
      address: cleanText(args.address, "address", { min: 3, max: 200 }),
      location: requireTunisianPoint(args.location, "location"),
      approval: "pending",
    });
    await ctx.db.patch(user._id, { onboardedAt: Date.now() });
    return id;
  },
});

// Admin functions: run from the Convex dashboard by a user with `isAdmin`.

export const pending = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db
      .query("companies")
      .withIndex("by_approval", (q) => q.eq("approval", "pending"))
      .collect();
  },
});

export const approve = mutation({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.companyId, { approval: "approved", rejectionReason: undefined });
  },
});

/** Rejecting a company also closes whatever it had open. */
export const reject = mutation({
  args: { companyId: v.id("companies"), reason: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.companyId, { approval: "rejected", rejectionReason: args.reason });
    const open = await ctx.db
      .query("jobs")
      .withIndex("by_company_status", (q) => q.eq("companyId", args.companyId).eq("status", "open"))
      .collect();
    for (const job of open) {
      await ctx.db.patch(job._id, { status: "closed", closedAt: Date.now() });
      await unindexJob(ctx, job._id);
    }
  },
});
