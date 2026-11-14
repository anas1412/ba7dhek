import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalMutation } from "./_generated/server";

// Orphan photo cleanup. A photo is uploaded first and attached second (as a
// profile photo, a logo, or a job photo). If the second step never happens —
// the app was closed, the connection dropped — the file stays in storage with
// nothing pointing at it. Once a day this removes such files.

/** A file younger than this may simply not have been attached yet. */
export const ORPHAN_AFTER_MS = 24 * 60 * 60 * 1000;
const FILES_PER_RUN = 200;

/**
 * Looks at one page of stored files and deletes those that are old enough and
 * referenced by nothing, then continues with the next page.
 *
 * To know what is referenced it reads every user, business and job. If those
 * tables ever grow past what one function may read, this function fails and
 * deletes nothing, which is the safe way round: it must then be rebuilt to
 * track uploads as they are made. See docs/04-launch/privacy.md.
 */
export const orphanUploads = internalMutation({
  args: { cursor: v.optional(v.union(v.string(), v.null())), deletedSoFar: v.optional(v.number()) },
  handler: async (ctx, args): Promise<{ deleted: number; done: boolean }> => {
    const inUse = new Set<Id<"_storage">>();
    for (const user of await ctx.db.query("users").collect()) if (user.photoId) inUse.add(user.photoId);
    for (const company of await ctx.db.query("companies").collect()) if (company.logoId) inUse.add(company.logoId);
    for (const job of await ctx.db.query("jobs").collect()) for (const id of job.imageIds ?? []) inUse.add(id);

    const cutoff = Date.now() - ORPHAN_AFTER_MS;
    const files = await ctx.db.system
      .query("_storage")
      .paginate({ numItems: FILES_PER_RUN, cursor: args.cursor ?? null });

    let deleted = args.deletedSoFar ?? 0;
    for (const file of files.page) {
      if (file._creationTime >= cutoff || inUse.has(file._id)) continue;
      await ctx.storage.delete(file._id);
      deleted += 1;
    }

    if (!files.isDone) {
      await ctx.scheduler.runAfter(0, internal.cleanup.orphanUploads, {
        cursor: files.continueCursor,
        deletedSoFar: deleted,
      });
    }
    return { deleted, done: files.isDone };
  },
});
