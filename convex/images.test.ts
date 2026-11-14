import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import { MAX_IMAGE_BYTES } from "./lib/images";
import { HAMMAMET, setupBackend, signedIn } from "./test.setup";

type Backend = ReturnType<typeof setupBackend>;

/** Stands in for an upload: stores a file of the given type and size and returns its id. */
function upload(t: Backend, type = "image/jpeg", bytes = 2_000) {
  return t.run((ctx) => ctx.storage.store(new Blob([new Uint8Array(bytes)], { type })));
}

const fileExists = (t: Backend, id: Awaited<ReturnType<typeof upload>>) =>
  t.run(async (ctx) => (await ctx.db.system.get(id)) !== null);

async function person(t: Backend, name: string, role: "candidate" | "employer") {
  const { as, id } = await signedIn(t, name);
  await as.mutation(api.users.ensure, { language: "fr" });
  await as.mutation(api.users.acceptConsent, { adult: true });
  await as.mutation(api.users.setRole, { role });
  return { as, id };
}

const JOB = {
  title: "Receptionist",
  description: "",
  category: "hospitality",
  contractType: "full_time" as const,
  payAmount: 900,
  payPeriod: "month" as const,
};

/** An employer with an approved business, ready to post. */
async function approvedEmployer(t: Backend, name: string) {
  const { as } = await person(t, name, "employer");
  const companyId = await as.mutation(api.companies.create, {
    name: `Hotel ${name}`,
    category: "hospitality",
    address: "Hammamet",
    location: HAMMAMET,
    kind: "individual",
  });
  const { as: adminUser, id: adminId } = await signedIn(t, `admin-${name}`);
  await t.run((ctx) => ctx.db.patch(adminId, { isAdmin: true }));
  await adminUser.mutation(api.companies.approve, { companyId });
  return as;
}

describe("job offer photos", () => {
  test("a job offer can have up to four photos and the fifth is refused and deleted", async () => {
    const t = setupBackend();
    const employer = await approvedEmployer(t, "orangers");
    const jobId = await employer.mutation(api.jobs.create, JOB);

    for (let i = 0; i < 4; i++) {
      expect(await employer.mutation(api.jobs.addImage, { jobId, storageId: await upload(t) })).toEqual({ ok: true });
    }
    const fifth = await upload(t);
    expect(await employer.mutation(api.jobs.addImage, { jobId, storageId: fifth })).toEqual({
      ok: false,
      problem: "too_many",
    });
    expect(await fileExists(t, fifth)).toBe(false);
    expect((await employer.query(api.jobs.mineOne, { jobId })).images).toHaveLength(4);
  });

  test("a business can post several offers, each with its own four photos", async () => {
    const t = setupBackend();
    const employer = await approvedEmployer(t, "orangers");
    const first = await employer.mutation(api.jobs.create, { ...JOB, title: "Receptionist" });
    const second = await employer.mutation(api.jobs.create, { ...JOB, title: "Waiter" });
    const third = await employer.mutation(api.jobs.create, { ...JOB, title: "Pool attendant" });

    for (const jobId of [first, second]) {
      for (let i = 0; i < 4; i++) {
        expect(await employer.mutation(api.jobs.addImage, { jobId, storageId: await upload(t) })).toEqual({ ok: true });
      }
    }

    const jobs = await employer.query(api.jobs.mine, {});
    expect(jobs).toHaveLength(3);
    const counts = Object.fromEntries(jobs.map((job) => [job.title, job.images.length]));
    expect(counts).toEqual({ Receptionist: 4, Waiter: 4, "Pool attendant": 0 });
    void third;
  });

  test("a file that is not an image is refused and deleted", async () => {
    const t = setupBackend();
    const employer = await approvedEmployer(t, "orangers");
    const jobId = await employer.mutation(api.jobs.create, JOB);
    const pdf = await upload(t, "application/pdf");
    expect(await employer.mutation(api.jobs.addImage, { jobId, storageId: pdf })).toEqual({
      ok: false,
      problem: "invalid_image",
    });
    expect(await fileExists(t, pdf)).toBe(false);
  });

  test("an image that was not compressed is refused and deleted", async () => {
    const t = setupBackend();
    const employer = await approvedEmployer(t, "orangers");
    const jobId = await employer.mutation(api.jobs.create, JOB);
    const huge = await upload(t, "image/jpeg", MAX_IMAGE_BYTES + 1);
    expect(await employer.mutation(api.jobs.addImage, { jobId, storageId: huge })).toEqual({
      ok: false,
      problem: "too_large",
    });
    expect(await fileExists(t, huge)).toBe(false);
  });

  test("removing a photo deletes the file and frees a slot", async () => {
    const t = setupBackend();
    const employer = await approvedEmployer(t, "orangers");
    const jobId = await employer.mutation(api.jobs.create, JOB);
    const ids = [];
    for (let i = 0; i < 4; i++) {
      const id = await upload(t);
      ids.push(id);
      await employer.mutation(api.jobs.addImage, { jobId, storageId: id });
    }
    await employer.mutation(api.jobs.removeImage, { jobId, storageId: ids[1] });
    expect(await fileExists(t, ids[1])).toBe(false);
    expect((await employer.query(api.jobs.mineOne, { jobId })).images.map((image) => image.id)).toEqual([
      ids[0],
      ids[2],
      ids[3],
    ]);
    expect(await employer.mutation(api.jobs.addImage, { jobId, storageId: await upload(t) })).toEqual({ ok: true });
  });

  test("candidates see a job's photos, main one first, and the business logo", async () => {
    const t = setupBackend();
    const employer = await approvedEmployer(t, "orangers");
    const jobId = await employer.mutation(api.jobs.create, JOB);
    const first = await upload(t);
    const second = await upload(t);
    await employer.mutation(api.jobs.addImage, { jobId, storageId: first });
    await employer.mutation(api.jobs.addImage, { jobId, storageId: second });
    await employer.mutation(api.jobs.setMainImage, { jobId, storageId: second });
    await employer.mutation(api.companies.setLogo, { storageId: await upload(t) });
    await employer.mutation(api.jobs.publish, { jobId });

    const mine = await employer.query(api.jobs.mineOne, { jobId });
    expect(mine.images.map((image) => image.id)).toEqual([second, first]);

    const { as: candidate } = await person(t, "amine", "candidate");
    await candidate.mutation(api.users.setHome, { home: HAMMAMET, radiusM: 5_000 });
    const [card] = (await candidate.query(api.jobs.feed, {})).jobs;
    expect(card.imageUrls).toEqual(mine.images.map((image) => image.url));
    expect(card.companyLogoUrl).toBe((await employer.query(api.companies.mine, {}))?.logoUrl);
    expect(card.companyLogoUrl).not.toBeNull();
  });

  test("one employer cannot touch another's job photos", async () => {
    const t = setupBackend();
    const owner = await approvedEmployer(t, "owner");
    const other = await approvedEmployer(t, "other");
    const jobId = await owner.mutation(api.jobs.create, JOB);
    const image = await upload(t);
    await owner.mutation(api.jobs.addImage, { jobId, storageId: image });

    await expect(other.mutation(api.jobs.addImage, { jobId, storageId: await upload(t) })).rejects.toThrow();
    await expect(other.mutation(api.jobs.removeImage, { jobId, storageId: image })).rejects.toThrow();
    await expect(other.mutation(api.jobs.setMainImage, { jobId, storageId: image })).rejects.toThrow();
    await expect(other.query(api.jobs.mineOne, { jobId })).rejects.toThrow();
    expect(await fileExists(t, image)).toBe(true);
  });

  test("a photo from one job cannot be removed through another", async () => {
    const t = setupBackend();
    const employer = await approvedEmployer(t, "orangers");
    const jobA = await employer.mutation(api.jobs.create, JOB);
    const jobB = await employer.mutation(api.jobs.create, { ...JOB, title: "Waiter" });
    const image = await upload(t);
    await employer.mutation(api.jobs.addImage, { jobId: jobA, storageId: image });

    await expect(employer.mutation(api.jobs.removeImage, { jobId: jobB, storageId: image })).rejects.toThrow();
    expect(await fileExists(t, image)).toBe(true);
  });
});

describe("business logo", () => {
  test("a business has one logo; setting another replaces and deletes the first", async () => {
    const t = setupBackend();
    const employer = await approvedEmployer(t, "orangers");
    expect((await employer.query(api.companies.mine, {}))?.logoUrl).toBeNull();

    const first = await upload(t);
    expect(await employer.mutation(api.companies.setLogo, { storageId: first })).toEqual({ ok: true });
    const second = await upload(t);
    await employer.mutation(api.companies.setLogo, { storageId: second });
    expect(await fileExists(t, first)).toBe(false);
    expect((await employer.query(api.companies.mine, {}))?.logoUrl).not.toBeNull();

    await employer.mutation(api.companies.removeLogo, {});
    expect(await fileExists(t, second)).toBe(false);
    expect((await employer.query(api.companies.mine, {}))?.logoUrl).toBeNull();
  });

  test("a file that is not an image is refused and the current logo is kept", async () => {
    const t = setupBackend();
    const employer = await approvedEmployer(t, "orangers");
    const good = await upload(t);
    await employer.mutation(api.companies.setLogo, { storageId: good });
    const bad = await upload(t, "text/plain");
    expect(await employer.mutation(api.companies.setLogo, { storageId: bad })).toEqual({
      ok: false,
      problem: "invalid_image",
    });
    expect(await fileExists(t, good)).toBe(true);
  });

  test("a candidate cannot set a business logo", async () => {
    const t = setupBackend();
    const { as: candidate } = await person(t, "amine", "candidate");
    await expect(candidate.mutation(api.companies.setLogo, { storageId: await upload(t) })).rejects.toThrow();
  });
});

describe("profile photo", () => {
  test("starts as the Google photo, can be replaced, removed and restored", async () => {
    const t = setupBackend();
    const { as: alice, id } = await person(t, "alice", "candidate");
    await t.run((ctx) => ctx.db.patch(id, { image: "https://example.test/google.png" }));
    expect((await alice.query(api.users.me, {}))?.photoUrl).toBe("https://example.test/google.png");

    const first = await upload(t);
    expect(await alice.mutation(api.users.setPhoto, { storageId: first })).toEqual({ ok: true });
    const withOwn = await alice.query(api.users.me, {});
    expect(withOwn?.hasOwnPhoto).toBe(true);
    expect(withOwn?.photoUrl).not.toBe("https://example.test/google.png");

    // Replacing deletes the earlier upload.
    const second = await upload(t);
    await alice.mutation(api.users.setPhoto, { storageId: second });
    expect(await fileExists(t, first)).toBe(false);

    await alice.mutation(api.users.removePhoto, {});
    expect(await fileExists(t, second)).toBe(false);
    expect((await alice.query(api.users.me, {}))?.photoUrl).toBeNull();

    await alice.mutation(api.users.useAccountPhoto, {});
    expect((await alice.query(api.users.me, {}))?.photoUrl).toBe("https://example.test/google.png");
  });

  test("a file that is not an image is refused and the current photo is kept", async () => {
    const t = setupBackend();
    const { as: alice } = await person(t, "alice", "candidate");
    const good = await upload(t);
    await alice.mutation(api.users.setPhoto, { storageId: good });

    const bad = await upload(t, "text/plain");
    expect(await alice.mutation(api.users.setPhoto, { storageId: bad })).toEqual({
      ok: false,
      problem: "invalid_image",
    });
    expect(await fileExists(t, bad)).toBe(false);
    expect(await fileExists(t, good)).toBe(true);
  });

  test("an upload address is refused before consent", async () => {
    const t = setupBackend();
    const { as: newcomer } = await signedIn(t, "newcomer");
    await expect(newcomer.mutation(api.files.generateUploadUrl, {})).rejects.toThrow();
  });
});
