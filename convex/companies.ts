import { ConvexError, v } from "convex/values";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { requireAdmin, requireRole } from "./lib/auth";
import { unindexJob } from "./lib/geo";
import { MAX_BUSINESS_IMAGES, checkUpload, companyImages } from "./lib/images";
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
    return { ...company, images: await companyImages(ctx, company) };
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
 * Adds one image to the business, up to four. An upload that is not an
 * acceptable image, or that would be a fifth, is deleted and the problem returned.
 */
export const addImage = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const company = await requireOwnCompany(ctx);
    const current = company.imageIds ?? [];
    if (current.includes(args.storageId)) return { ok: true as const };
    if (current.length >= MAX_BUSINESS_IMAGES) {
      await ctx.storage.delete(args.storageId);
      return { ok: false as const, problem: "too_many" as const };
    }
    const problem = await checkUpload(ctx, args.storageId);
    if (problem) return { ok: false as const, problem };
    await ctx.db.patch(company._id, { imageIds: [...current, args.storageId] });
    return { ok: true as const };
  },
});

/** Removes one of the business's images and deletes the file. */
export const removeImage = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const company = await requireOwnCompany(ctx);
    const current = company.imageIds ?? [];
    // Only a file that belongs to this business can be deleted through it.
    if (!current.includes(args.storageId)) throw new ConvexError({ code: "not_found" });
    await ctx.db.patch(company._id, { imageIds: current.filter((id) => id !== args.storageId) });
    await ctx.storage.delete(args.storageId);
  },
});

/** Moves one image to the front. The first image is the one shown on job cards. */
export const setMainImage = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const company = await requireOwnCompany(ctx);
    const current = company.imageIds ?? [];
    if (!current.includes(args.storageId)) throw new ConvexError({ code: "not_found" });
    await ctx.db.patch(company._id, {
      imageIds: [args.storageId, ...current.filter((id) => id !== args.storageId)],
    });
  },
});
