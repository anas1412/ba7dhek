// Pure geometry helpers. No Convex imports, so they are unit-testable and
// can be shared with the app.

export type Point = { latitude: number; longitude: number };

export const MIN_RADIUS_M = 1_000;
export const DEFAULT_RADIUS_M = 5_000;
export const MAX_RADIUS_M = 30_000;

const EARTH_RADIUS_M = 6_371_008.8;
const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

/** Great-circle distance in metres. */
export function haversineM(a: Point, b: Point): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export type Rectangle = { west: number; south: number; east: number; north: number };

/** The smallest lat/lon box that contains a circle of `radiusM` around `center`. */
export function boundingBox(center: Point, radiusM: number): Rectangle {
  const dLat = toDeg(radiusM / EARTH_RADIUS_M);
  const cosLat = Math.cos(toRad(center.latitude));
  // Near the poles the box would wrap; Tunisia is nowhere near them.
  const dLon = toDeg(radiusM / (EARTH_RADIUS_M * Math.max(cosLat, 1e-6)));
  return {
    west: center.longitude - dLon,
    south: center.latitude - dLat,
    east: center.longitude + dLon,
    north: center.latitude + dLat,
  };
}

export type DistanceBucket = "lt1" | "1to3" | "3to5" | "5to10" | "gt10";

/** What an employer sees instead of a candidate's exact distance. */
export function distanceBucket(distanceM: number): DistanceBucket {
  if (distanceM < 1_000) return "lt1";
  if (distanceM < 3_000) return "1to3";
  if (distanceM < 5_000) return "3to5";
  if (distanceM < 10_000) return "5to10";
  return "gt10";
}

// A rough box around Tunisia, generous at the edges. It exists to stop jobs
// abroad, not to be a border. Approximate extremes: 30.2 to 37.6 N, 7.5 to 11.6 E.
const TUNISIA: Rectangle = { west: 7.4, south: 30.1, east: 11.7, north: 37.7 };

export function isInTunisia(p: Point): boolean {
  return (
    p.latitude >= TUNISIA.south &&
    p.latitude <= TUNISIA.north &&
    p.longitude >= TUNISIA.west &&
    p.longitude <= TUNISIA.east
  );
}

export function clampRadiusM(radiusM: number): number {
  return Math.min(MAX_RADIUS_M, Math.max(MIN_RADIUS_M, Math.round(radiusM)));
}

export function isValidPoint(p: Point): boolean {
  return (
    Number.isFinite(p.latitude) &&
    Number.isFinite(p.longitude) &&
    Math.abs(p.latitude) <= 90 &&
    Math.abs(p.longitude) <= 180
  );
}
