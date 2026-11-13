import { describe, expect, test } from "vitest";
import {
  MAX_RADIUS_M,
  MIN_RADIUS_M,
  boundingBox,
  clampRadiusM,
  distanceBucket,
  haversineM,
  isInTunisia,
  isValidPoint,
} from "./geoMath";

const TUNIS = { latitude: 36.8065, longitude: 10.1815 };
const HAMMAMET = { latitude: 36.4, longitude: 10.6167 };
const SFAX = { latitude: 34.7406, longitude: 10.7603 };
const PARIS = { latitude: 48.8566, longitude: 2.3522 };

describe("haversineM", () => {
  test("is zero for the same point", () => {
    expect(haversineM(TUNIS, TUNIS)).toBe(0);
  });

  test("is symmetric", () => {
    expect(haversineM(TUNIS, SFAX)).toBeCloseTo(haversineM(SFAX, TUNIS), 6);
  });

  test("matches one degree of latitude, about 111.2 km", () => {
    const d = haversineM({ latitude: 36, longitude: 10 }, { latitude: 37, longitude: 10 });
    expect(d).toBeGreaterThan(111_000);
    expect(d).toBeLessThan(111_400);
  });

  test("Tunis to Hammamet is roughly 60 km in a straight line", () => {
    const d = haversineM(TUNIS, HAMMAMET);
    expect(d).toBeGreaterThan(55_000);
    expect(d).toBeLessThan(65_000);
  });
});

describe("boundingBox", () => {
  test("contains every point on the circle it was built for", () => {
    const radius = 5_000;
    const box = boundingBox(HAMMAMET, radius);
    for (let bearing = 0; bearing < 360; bearing += 15) {
      const rad = (bearing * Math.PI) / 180;
      // Step out along the bearing in degrees, then scale back onto the circle.
      const probe = {
        latitude: HAMMAMET.latitude + (Math.cos(rad) * radius) / 111_320,
        longitude:
          HAMMAMET.longitude +
          (Math.sin(rad) * radius) / (111_320 * Math.cos((HAMMAMET.latitude * Math.PI) / 180)),
      };
      if (haversineM(HAMMAMET, probe) <= radius) {
        expect(probe.latitude).toBeGreaterThanOrEqual(box.south);
        expect(probe.latitude).toBeLessThanOrEqual(box.north);
        expect(probe.longitude).toBeGreaterThanOrEqual(box.west);
        expect(probe.longitude).toBeLessThanOrEqual(box.east);
      }
    }
  });

  test("its edges sit about one radius from the centre", () => {
    const box = boundingBox(HAMMAMET, 10_000);
    const north = haversineM(HAMMAMET, { latitude: box.north, longitude: HAMMAMET.longitude });
    const east = haversineM(HAMMAMET, { latitude: HAMMAMET.latitude, longitude: box.east });
    expect(north).toBeCloseTo(10_000, -1);
    expect(east).toBeCloseTo(10_000, -1);
  });
});

describe("distanceBucket", () => {
  test.each([
    [0, "lt1"],
    [999, "lt1"],
    [1_000, "1to3"],
    [2_999, "1to3"],
    [3_000, "3to5"],
    [4_999, "3to5"],
    [5_000, "5to10"],
    [9_999, "5to10"],
    [10_000, "gt10"],
    [50_000, "gt10"],
  ] as const)("%i m is in bucket %s", (meters, bucket) => {
    expect(distanceBucket(meters)).toBe(bucket);
  });
});

describe("isInTunisia", () => {
  test("accepts Tunisian cities", () => {
    expect(isInTunisia(TUNIS)).toBe(true);
    expect(isInTunisia(HAMMAMET)).toBe(true);
    expect(isInTunisia(SFAX)).toBe(true);
  });

  test("rejects a job abroad", () => {
    expect(isInTunisia(PARIS)).toBe(false);
  });
});

describe("clampRadiusM", () => {
  test("keeps the radius inside the allowed range", () => {
    expect(clampRadiusM(10)).toBe(MIN_RADIUS_M);
    expect(clampRadiusM(5_000.4)).toBe(5_000);
    expect(clampRadiusM(999_999)).toBe(MAX_RADIUS_M);
  });
});

describe("isValidPoint", () => {
  test("rejects out-of-range and non-finite coordinates", () => {
    expect(isValidPoint(HAMMAMET)).toBe(true);
    expect(isValidPoint({ latitude: 91, longitude: 0 })).toBe(false);
    expect(isValidPoint({ latitude: 0, longitude: 181 })).toBe(false);
    expect(isValidPoint({ latitude: Number.NaN, longitude: 0 })).toBe(false);
  });
});
