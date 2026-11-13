import { GeospatialIndex } from "@convex-dev/geospatial";
import { components } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import type { Point } from "./geoMath";

// The only file that touches the geospatial component. Every write that moves
// a point goes through the helpers below, so the index cannot drift from the
// tables. See docs/02-architecture/geo-matching.md.

export const jobsGeo = new GeospatialIndex<
  Id<"jobs">,
  { category: string; contractType: string }
>(components.jobsGeo);

export const candidatesGeo = new GeospatialIndex<
  Id<"users">,
  { notify: "all" | "digest" | "off" }
>(components.candidatesGeo);

/** Put an open job in the index, replacing any earlier entry. */
export async function indexJob(
  ctx: MutationCtx,
  jobId: Id<"jobs">,
  location: Point,
  filters: { category: string; contractType: string },
  publishedAt: number,
): Promise<void> {
  await jobsGeo.remove(ctx, jobId);
  await jobsGeo.insert(ctx, jobId, location, filters, publishedAt);
}

/** Take a job out of the index: closed, expired, hidden or deleted. */
export async function unindexJob(ctx: MutationCtx, jobId: Id<"jobs">): Promise<void> {
  await jobsGeo.remove(ctx, jobId);
}

/** Put a candidate's home point in the index, replacing any earlier entry. */
export async function indexCandidate(
  ctx: MutationCtx,
  userId: Id<"users">,
  home: Point,
  notify: "all" | "digest" | "off",
): Promise<void> {
  await candidatesGeo.remove(ctx, userId);
  await candidatesGeo.insert(ctx, userId, home, { notify });
}

export async function unindexCandidate(ctx: MutationCtx, userId: Id<"users">): Promise<void> {
  await candidatesGeo.remove(ctx, userId);
}
