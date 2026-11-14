import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

/** A job offer shows at most this many photos. The first is its main one, at the top of the card. */
export const MAX_JOB_IMAGES = 4;

/**
 * The app shrinks every image before sending it (see src/lib/images.ts), so a
 * real upload is a few hundred kilobytes. Anything over this did not come
 * through the app's own compression and is refused.
 */
export const MAX_IMAGE_BYTES = 1_000_000;

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export type ImageProblem = "invalid_image" | "too_large" | "too_many";

/**
 * Checks an uploaded file. A file that fails is deleted so it does not linger
 * in storage, and the problem is returned, not thrown: throwing would undo the
 * deletion along with the rest of the mutation.
 */
export async function checkUpload(ctx: MutationCtx, storageId: Id<"_storage">): Promise<ImageProblem | null> {
  const file = await ctx.db.system.get(storageId);
  if (!file) return "invalid_image";
  let problem: ImageProblem | null = null;
  if (!ALLOWED_TYPES.includes(file.contentType ?? "")) problem = "invalid_image";
  else if (file.size > MAX_IMAGE_BYTES) problem = "too_large";
  if (problem) await ctx.storage.delete(storageId);
  return problem;
}

/**
 * The photo to show for a person: the one they uploaded, else the one from
 * their Google account, unless they chose to show none.
 */
export async function userPhotoUrl(ctx: QueryCtx, user: Doc<"users">): Promise<string | null> {
  if (user.photoId) return await ctx.storage.getUrl(user.photoId);
  if (user.photoRemoved) return null;
  return user.image ?? null;
}

/** A job offer's photos in order, each with the address to load it from. */
export async function jobImages(ctx: QueryCtx, job: Doc<"jobs">) {
  const ids = job.imageIds ?? [];
  const images = await Promise.all(ids.map(async (id) => ({ id, url: await ctx.storage.getUrl(id) })));
  return images.filter((image): image is { id: Id<"_storage">; url: string } => image.url !== null);
}

/** The business's logo, shown beside its name on a job card. */
export async function companyLogoUrl(ctx: QueryCtx, company: Doc<"companies">): Promise<string | null> {
  return company.logoId ? await ctx.storage.getUrl(company.logoId) : null;
}
