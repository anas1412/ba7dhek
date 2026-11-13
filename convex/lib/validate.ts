import { ConvexError } from "convex/values";
import { isInTunisia, isValidPoint, type Point } from "./geoMath";
import { findBlocked } from "./wordFilter";

/** Trims user text, enforces a length range, and runs the word filter. */
export function cleanText(
  value: string,
  field: string,
  limits: { min?: number; max: number },
): string {
  const text = value.trim();
  if (text.length < (limits.min ?? 0)) throw new ConvexError({ code: "too_short", field });
  if (text.length > limits.max) throw new ConvexError({ code: "too_long", field });
  if (findBlocked(text)) throw new ConvexError({ code: "blocked_text", field });
  return text;
}

/** Jobs, companies and home points must be real coordinates inside Tunisia. */
export function requireTunisianPoint(point: Point, field: string): Point {
  if (!isValidPoint(point)) throw new ConvexError({ code: "invalid_location", field });
  if (!isInTunisia(point)) throw new ConvexError({ code: "outside_tunisia", field });
  return { latitude: point.latitude, longitude: point.longitude };
}

export const JOB_CATEGORIES = [
  "hospitality",
  "restaurant",
  "retail",
  "logistics",
  "construction",
  "health",
  "office",
  "education",
  "agriculture",
  "other",
] as const;

export function requireCategory(value: string): string {
  if (!(JOB_CATEGORIES as readonly string[]).includes(value)) {
    throw new ConvexError({ code: "invalid_category" });
  }
  return value;
}
