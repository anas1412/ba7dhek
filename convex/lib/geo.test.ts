import { describe, expect, test } from "vitest";
import type { Id } from "../_generated/dataModel";
import { HAMMAMET, setupBackend } from "../test.setup";
import { candidatesGeo, indexCandidate, indexJob, jobsGeo, unindexJob } from "./geo";
import { boundingBox, haversineM } from "./geoMath";

// Offsets north of Hammamet, in metres. One degree of latitude is about 111.2 km.
const northOf = (meters: number) => ({
  latitude: HAMMAMET.latitude + meters / 111_195,
  longitude: HAMMAMET.longitude,
});

async function seedJobs(t: ReturnType<typeof setupBackend>, distances: number[]) {
  return await t.run(async (ctx) => {
    const owner = await ctx.db.insert("users", { name: "Owner", language: "fr" });
    const company = await ctx.db.insert("companies", {
      ownerId: owner,
      name: "Hotel",
      category: "hospitality",
      address: "Hammamet",
      location: HAMMAMET,
      approval: "approved",
    });
    const ids: Id<"jobs">[] = [];
    for (const meters of distances) {
      const location = northOf(meters);
      const id = await ctx.db.insert("jobs", {
        companyId: company,
        title: `Job at ${meters} m`,
        description: "",
        category: "hospitality",
        contractType: "full_time",
        payAmount: 900,
        payPeriod: "month",
        location,
        status: "open",
        publishedAt: 1,
        notifiedCount: 0,
      });
      await indexJob(ctx, id, location, { category: "hospitality", contractType: "full_time" }, 1);
      ids.push(id);
    }
    return ids;
  });
}

describe("jobs index", () => {
  test("nearest returns only jobs inside the radius, closest first", async () => {
    const t = setupBackend();
    // Seeded out of order on purpose.
    const [far, near, mid, outside] = await seedJobs(t, [4_000, 500, 2_000, 8_000]);

    const found = await t.run((ctx) =>
      jobsGeo.nearest(ctx, { point: HAMMAMET, limit: 50, maxDistance: 5_000 }),
    );

    expect(found.map((f) => f.key)).toEqual([near, mid, far]);
    expect(found.map((f) => f.key)).not.toContain(outside);
    for (const f of found) expect(f.distance).toBeLessThanOrEqual(5_000);
    // The component's own distance agrees with ours to within a few metres.
    expect(found[0].distance).toBeCloseTo(haversineM(HAMMAMET, northOf(500)), -1);
  });

  test("a closed job leaves the index", async () => {
    const t = setupBackend();
    const [job] = await seedJobs(t, [500]);
    await t.run((ctx) => unindexJob(ctx, job));

    const found = await t.run((ctx) =>
      jobsGeo.nearest(ctx, { point: HAMMAMET, limit: 50, maxDistance: 5_000 }),
    );
    expect(found).toEqual([]);
  });

  test("re-indexing a job moves it and does not duplicate it", async () => {
    const t = setupBackend();
    const [job] = await seedJobs(t, [500]);
    await t.run((ctx) =>
      indexJob(ctx, job, northOf(3_000), { category: "hospitality", contractType: "full_time" }, 2),
    );

    const found = await t.run((ctx) =>
      jobsGeo.nearest(ctx, { point: HAMMAMET, limit: 50, maxDistance: 5_000 }),
    );
    expect(found).toHaveLength(1);
    expect(found[0].distance).toBeGreaterThan(2_900);
  });
});

describe("candidates index", () => {
  test("a rectangle query filtered on notify finds the candidates a fan-out would consider", async () => {
    const t = setupBackend();
    const ids = await t.run(async (ctx) => {
      const make = async (name: string, meters: number, notify: "all" | "off") => {
        const id = await ctx.db.insert("users", { name, language: "ar" });
        await indexCandidate(ctx, id, northOf(meters), notify);
        return id;
      };
      return {
        close: await make("close", 1_000, "all"),
        muted: await make("muted", 1_500, "off"),
        distant: await make("distant", 60_000, "all"),
      };
    });

    const box = boundingBox(HAMMAMET, 30_000);
    const found = await t.run((ctx) =>
      candidatesGeo.query(ctx, {
        shape: { type: "rectangle", rectangle: box },
        filter: (q) => q.eq("notify", "all"),
        limit: 100,
      }),
    );

    const keys = found.results.map((r) => r.key);
    expect(keys).toContain(ids.close);
    expect(keys).not.toContain(ids.muted);
    expect(keys).not.toContain(ids.distant);
  });
});
