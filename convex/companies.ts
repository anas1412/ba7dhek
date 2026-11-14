import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { requireAdmin, requireRole } from "./lib/auth";
import { unindexJob } from "./lib/geo";
import { checkUpload, companyLogoUrl } from "./lib/images";
import { normaliseTaxId, taxIdBase } from "./lib/taxId";
import { cleanText, requireCategory, requireTunisianPoint } from "./lib/validate";
import { employerKind, point } from "./schema";

/** The signed-in employer's company, or null before they have created one. */
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireRole(ctx, "employer");
    const company = await ctx.db
      .query("companies")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .unique();
    if (!company) return null;
    return { ...company, logoUrl: await companyLogoUrl(ctx, company) };
  },
});

/**
 * One company per employer. It starts pending and is approved by hand.
 * A registered business must give its tax ID, which is what the approval
 * checks; a person hiring for themselves has none.
 */
export const create = mutation({
  args: {
    name: v.string(),
    category: v.string(),
    address: v.string(),
    location: point,
    kind: employerKind,
    taxId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, "employer");
    const existing = await ctx.db
      .query("companies")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .unique();
    if (existing) throw new ConvexError({ code: "company_exists" });

    let taxId: string | undefined;
    if (args.kind === "business") {
      const canonical = normaliseTaxId(args.taxId ?? "");
      if (!canonical) throw new ConvexError({ code: "invalid_tax_id", field: "taxId" });
      // One account per establishment: the same tax ID cannot be registered twice.
      const taken = await ctx.db
        .query("companies")
        .withIndex("by_tax_id", (q) => q.eq("taxId", canonical))
        .first();
      if (taken) throw new ConvexError({ code: "tax_id_taken", field: "taxId" });
      taxId = canonical;
    }

    const id = await ctx.db.insert("companies", {
      ownerId: user._id,
      name: cleanText(args.name, "name", { min: 2, max: 80 }),
      category: requireCategory(args.category),
      address: cleanText(args.address, "address", { min: 3, max: 200 }),
      location: requireTunisianPoint(args.location, "location"),
      kind: args.kind,
      taxId,
      taxIdBase: taxId ? taxIdBase(taxId) : undefined,
      approval: "pending",
    });
    await ctx.db.patch(user._id, { onboardedAt: Date.now() });
    return id;
  },
});

// Admin functions: run from the Convex dashboard by a user with `isAdmin`.

/** Companies waiting for a decision, with what is needed to check them. */
export const pending = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const companies = await ctx.db
      .query("companies")
      .withIndex("by_approval", (q) => q.eq("approval", "pending"))
      .collect();
    return await Promise.all(
      companies.map(async (company) => {
        const owner = await ctx.db.get(company.ownerId);
        return { ...company, ownerName: owner?.name ?? "", ownerEmail: owner?.email ?? null };
      }),
    );
  },
});

export const approve = mutation({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.companyId, { approval: "approved", rejectionReason: undefined });
    await ctx.scheduler.runAfter(0, internal.notify.companyApproved, { companyId: args.companyId });
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

/** Loads the signed-in employer's own company, or fails. */
async function requireOwnCompany(ctx: MutationCtx) {
  const user = await requireRole(ctx, "employer");
  const company = await ctx.db
    .query("companies")
    .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
    .unique();
  if (!company) throw new ConvexError({ code: "no_company" });
  return company;
}

/**
 * Sets the business's logo, replacing any earlier one. An upload that is not an
 * acceptable image is deleted and the problem returned.
 */
export const setLogo = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const company = await requireOwnCompany(ctx);
    const problem = await checkUpload(ctx, args.storageId);
    if (problem) return { ok: false as const, problem };
    if (company.logoId && company.logoId !== args.storageId) await ctx.storage.delete(company.logoId);
    await ctx.db.patch(company._id, { logoId: args.storageId });
    return { ok: true as const };
  },
});

/** Removes the business's logo and deletes the file. */
export const removeLogo = mutation({
  args: {},
  handler: async (ctx) => {
    const company = await requireOwnCompany(ctx);
    if (!company.logoId) return;
    await ctx.storage.delete(company.logoId);
    await ctx.db.patch(company._id, { logoId: undefined });
  },
});
