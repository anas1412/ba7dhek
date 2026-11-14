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

async function employerWithCompany(t: Backend, name: string) {
  const { as } = await person(t, name, "employer");
  await as.mutation(api.companies.create, {
    name: `Hotel ${name}`,
    category: "hospitality",
    address: "Hammamet",
    location: HAMMAMET,
    kind: "individual",
  });
  return as;
}

describe("business images", () => {
  test("a business can add up to four images and the fifth is refused and deleted", async () => {
    const t = setupBackend();
    const employer = await employerWithCompany(t, "orangers");

    for (let i = 0; i < 4; i++) {
      expect(await employer.mutation(api.companies.addImage, { storageId: await upload(t) })).toEqual({ ok: true });
    }
    const fifth = await upload(t);
    expect(await employer.mutation(api.companies.addImage, { storageId: fifth })).toEqual({
      ok: false,
      problem: "too_many",
    });
    expect(await fileExists(t, fifth)).toBe(false);

    const company = await employer.query(api.companies.mine, {});
    expect(company?.images).toHaveLength(4);
  });

  test("a file that is not an image is refused and deleted", async () => {
    const t = setupBackend();
    const employer = await employerWithCompany(t, "orangers");
    const pdf = await upload(t, "application/pdf");
    expect(await employer.mutation(api.companies.addImage, { storageId: pdf })).toEqual({
      ok: false,
      problem: "invalid_image",
    });
    expect(await fileExists(t, pdf)).toBe(false);
    expect((await employer.query(api.companies.mine, {}))?.images).toHaveLength(0);
  });

  test("an image that was not compressed is refused and deleted", async () => {
    const t = setupBackend();
    const employer = await employerWithCompany(t, "orangers");
    const huge = await upload(t, "image/jpeg", MAX_IMAGE_BYTES + 1);
    expect(await employer.mutation(api.companies.addImage, { storageId: huge })).toEqual({
      ok: false,
      problem: "too_large",
    });
    expect(await fileExists(t, huge)).toBe(false);
  });

  test("removing an image deletes the file and frees a slot", async () => {
    const t = setupBackend();
    const employer = await employerWithCompany(t, "orangers");
    const ids = [];
    for (let i = 0; i < 4; i++) {
      const id = await upload(t);
      ids.push(id);
      await employer.mutation(api.companies.addImage, { storageId: id });
    }
    await employer.mutation(api.companies.removeImage, { storageId: ids[1] });
    expect(await fileExists(t, ids[1])).toBe(false);
    expect((await employer.query(api.companies.mine, {}))?.images.map((image) => image.id)).toEqual([
      ids[0],
      ids[2],
      ids[3],
    ]);
    expect(await employer.mutation(api.companies.addImage, { storageId: await upload(t) })).toEqual({ ok: true });
  });

  test("the main image can be changed, and it is the one on the job card", async () => {
    const t = setupBackend();
    const { as: adminUser, id: adminId } = await signedIn(t, "Admin");
    await t.run((ctx) => ctx.db.patch(adminId, { isAdmin: true }));

    const employer = await employerWithCompany(t, "orangers");
    const first = await upload(t);
    const second = await upload(t);
    await employer.mutation(api.companies.addImage, { storageId: first });
    await employer.mutation(api.companies.addImage, { storageId: second });
    await employer.mutation(api.companies.setMainImage, { storageId: second });

    const company = await employer.query(api.companies.mine, {});
    expect(company?.images.map((image) => image.id)).toEqual([second, first]);

    await adminUser.mutation(api.companies.approve, { companyId: company!._id });
    const jobId = await employer.mutation(api.jobs.create, {
      title: "Receptionist",
      description: "",
      category: "hospitality",
      contractType: "full_time",
      payAmount: 900,
      payPeriod: "month",
    });
    await employer.mutation(api.jobs.publish, { jobId });

    const { as: candidate } = await person(t, "amine", "candidate");
    await candidate.mutation(api.users.setHome, { home: HAMMAMET, radiusM: 5_000 });
    const feed = await candidate.query(api.jobs.feed, {});
    expect(feed.jobs[0].companyImageUrl).toBe(company?.images[0].url);
  });

  test("one business cannot remove another's image", async () => {
    const t = setupBackend();
    const owner = await employerWithCompany(t, "owner");
    const other = await employerWithCompany(t, "other");
    const image = await upload(t);
    await owner.mutation(api.companies.addImage, { storageId: image });

    await expect(other.mutation(api.companies.removeImage, { storageId: image })).rejects.toThrow();
    await expect(other.mutation(api.companies.setMainImage, { storageId: image })).rejects.toThrow();
    expect(await fileExists(t, image)).toBe(true);
  });

  test("a candidate cannot add business images", async () => {
    const t = setupBackend();
    const { as: candidate } = await person(t, "amine", "candidate");
    await expect(candidate.mutation(api.companies.addImage, { storageId: await upload(t) })).rejects.toThrow();
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
