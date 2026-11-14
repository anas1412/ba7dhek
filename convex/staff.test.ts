import { describe, expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import { HAMMAMET, setupBackend, signedIn } from "./test.setup";

type Backend = ReturnType<typeof setupBackend>;

async function person(t: Backend, name: string, role: "candidate" | "employer") {
  const { as, id } = await signedIn(t, name);
  await as.mutation(api.users.ensure, { language: "fr" });
  await as.mutation(api.users.acceptConsent, { adult: true });
  await as.mutation(api.users.setRole, { role });
  return { as, id };
}

async function staffMember(t: Backend, name: string, staffRole: "admin" | "moderator") {
  const { as, id } = await signedIn(t, name);
  await as.mutation(api.users.ensure, { language: "fr" });
  await t.run((ctx) => ctx.db.patch(id, { staffRole }));
  return { as, id };
}

/** An admin, a moderator, an employer with a pending business and a draft job, and a candidate. */
async function world(t: Backend) {
  const admin = await staffMember(t, "Admin", "admin");
  const moderator = await staffMember(t, "Mod", "moderator");
  const employer = await person(t, "Sindbad", "employer");
  const companyId = await employer.as.mutation(api.companies.create, {
    name: "Hotel Sindbad",
    category: "hospitality",
    address: "Avenue des Nations Unies, Hammamet",
    kind: "individual",
    location: HAMMAMET,
  });
  const jobId = await employer.as.mutation(api.jobs.create, {
    title: "Receptionist",
    description: "",
    category: "hospitality",
    contractType: "full_time",
    payAmount: 900,
    payPeriod: "month",
  });
  const candidate = await person(t, "Amine", "candidate");
  await candidate.as.mutation(api.users.setHome, { home: HAMMAMET, radiusM: 5_000 });
  return { admin, moderator, employer, candidate, companyId, jobId };
}

const stack = async (who: { as: Awaited<ReturnType<typeof person>>["as"] }) =>
  (await who.as.query(api.jobs.feed, {})).jobs.map((job) => job._id);

describe("who may enter the back office", () => {
  test("ordinary people are refused everywhere", async () => {
    const t = setupBackend();
    const { employer, candidate, jobId, companyId } = await world(t);
    for (const outsider of [employer, candidate]) {
      await expect(outsider.as.query(api.staff.overview, {})).rejects.toThrow();
      await expect(outsider.as.query(api.staff.people, { filter: "all" })).rejects.toThrow();
      await expect(outsider.as.query(api.staff.jobs, { filter: "open" })).rejects.toThrow();
      await expect(outsider.as.query(api.staff.companies, { approval: "pending" })).rejects.toThrow();
      await expect(outsider.as.query(api.staff.activity, {})).rejects.toThrow();
      await expect(outsider.as.mutation(api.staff.hideJob, { jobId })).rejects.toThrow();
      await expect(outsider.as.mutation(api.staff.ban, { userId: candidate.id })).rejects.toThrow();
      await expect(outsider.as.mutation(api.companies.approve, { companyId })).rejects.toThrow();
    }
  });

  test("a moderator can review and moderate, but cannot do what is reserved for an admin", async () => {
    const t = setupBackend();
    const { moderator, candidate, companyId } = await world(t);

    await moderator.as.query(api.staff.overview, {});
    await moderator.as.mutation(api.companies.approve, { companyId });
    await moderator.as.mutation(api.staff.ban, { userId: candidate.id });

    await expect(moderator.as.mutation(api.staff.unban, { userId: candidate.id })).rejects.toThrow();
    await expect(moderator.as.mutation(api.staff.setModerator, { userId: candidate.id, moderator: true })).rejects.toThrow();
    await expect(moderator.as.query(api.staff.activity, {})).rejects.toThrow();
  });

  test("only an admin sees e-mail addresses", async () => {
    const t = setupBackend();
    const { admin, moderator } = await world(t);
    const seenByAdmin = await admin.as.query(api.staff.people, { filter: "all" });
    const seenByModerator = await moderator.as.query(api.staff.people, { filter: "all" });
    expect(seenByAdmin.find((p) => p.name === "Amine")?.email).toBe("amine@example.test");
    expect(seenByModerator.every((p) => p.email === null)).toBe(true);
    expect((await moderator.as.query(api.staff.companies, { approval: "pending" }))[0].ownerEmail).toBeNull();
    expect((await admin.as.query(api.staff.companies, { approval: "pending" }))[0].ownerEmail).toBe("sindbad@example.test");
  });

  test("the older admin flag still counts as admin", async () => {
    const t = setupBackend();
    const { as, id } = await signedIn(t, "OldAdmin");
    await as.mutation(api.users.ensure, { language: "fr" });
    await t.run((ctx) => ctx.db.patch(id, { isAdmin: true }));
    expect((await as.query(api.users.me, {}))?.staffRole).toBe("admin");
    await as.query(api.staff.activity, {});
  });
});

describe("back-office actions", () => {
  test("the overview counts what is there", async () => {
    const t = setupBackend();
    const { admin } = await world(t);
    expect(await admin.as.query(api.staff.overview, {})).toMatchObject({
      candidates: 1,
      employers: 1,
      businessesPending: 1,
      businessesApproved: 0,
      jobsOpen: 0,
      reportsOpen: 0,
      banned: 0,
    });
  });

  test("hiding takes a job out of the stack, unhiding puts it back, removing is for good", async () => {
    const t = setupBackend();
    const { moderator, employer, candidate, companyId, jobId } = await world(t);
    await moderator.as.mutation(api.companies.approve, { companyId });
    await employer.as.mutation(api.jobs.publish, { jobId });
    expect(await stack(candidate)).toEqual([jobId]);

    await moderator.as.mutation(api.staff.hideJob, { jobId });
    expect(await stack(candidate)).toEqual([]);
    expect((await moderator.as.query(api.staff.jobs, { filter: "hidden" })).map((job) => job._id)).toEqual([jobId]);

    await moderator.as.mutation(api.staff.unhideJob, { jobId });
    expect(await stack(candidate)).toEqual([jobId]);

    await moderator.as.mutation(api.staff.removeJob, { jobId });
    expect(await stack(candidate)).toEqual([]);
    await expect(employer.as.mutation(api.jobs.publish, { jobId })).rejects.toThrow();
  });

  test("jobs can be found by a word in the title or the business name", async () => {
    const t = setupBackend();
    const { moderator } = await world(t);
    const find = async (search: string) =>
      (await moderator.as.query(api.staff.jobs, { filter: "draft", search })).map((job) => job.title);
    expect(await find("recep")).toEqual(["Receptionist"]);
    expect(await find("SINDBAD")).toEqual(["Receptionist"]);
    expect(await find("plumber")).toEqual([]);
  });

  test("a ban locks the person out and takes their jobs down; only an admin lifts it", async () => {
    const t = setupBackend();
    const { admin, moderator, employer, candidate, companyId, jobId } = await world(t);
    await moderator.as.mutation(api.companies.approve, { companyId });
    await employer.as.mutation(api.jobs.publish, { jobId });

    await moderator.as.mutation(api.staff.ban, { userId: employer.id });
    await expect(employer.as.query(api.jobs.mine, {})).rejects.toThrow();
    expect(await stack(candidate)).toEqual([]);
    expect((await admin.as.query(api.staff.people, { filter: "banned" })).map((p) => p.name)).toEqual(["Sindbad"]);

    await admin.as.mutation(api.staff.unban, { userId: employer.id });
    expect((await employer.as.query(api.jobs.mine, {}))[0].status).toBe("closed");
  });

  test("staff cannot be banned from the back office", async () => {
    const t = setupBackend();
    const { admin, moderator } = await world(t);
    await expect(moderator.as.mutation(api.staff.ban, { userId: admin.id })).rejects.toThrow();
    await expect(admin.as.mutation(api.staff.ban, { userId: moderator.id })).rejects.toThrow();
  });

  test("an admin makes and unmakes moderators, but not admins", async () => {
    const t = setupBackend();
    const { admin, candidate } = await world(t);

    await admin.as.mutation(api.staff.setModerator, { userId: candidate.id, moderator: true });
    expect((await candidate.as.query(api.users.me, {}))?.staffRole).toBe("moderator");
    await candidate.as.query(api.staff.overview, {});
    expect((await admin.as.query(api.staff.people, { filter: "staff" })).map((p) => p.name).sort()).toEqual(
      ["Admin", "Amine", "Mod"],
    );

    await admin.as.mutation(api.staff.setModerator, { userId: candidate.id, moderator: false });
    await expect(candidate.as.query(api.staff.overview, {})).rejects.toThrow();
    // An admin's own role is out of reach of the app.
    await expect(admin.as.mutation(api.staff.setModerator, { userId: admin.id, moderator: false })).rejects.toThrow();
  });

  test("every action is written to the activity log with who did it", async () => {
    const t = setupBackend();
    const { admin, moderator, candidate, companyId, jobId } = await world(t);
    await moderator.as.mutation(api.companies.approve, { companyId });
    await moderator.as.mutation(api.staff.hideJob, { jobId });
    await moderator.as.mutation(api.staff.ban, { userId: candidate.id });
    await admin.as.mutation(api.staff.unban, { userId: candidate.id });

    const log = await admin.as.query(api.staff.activity, {});
    expect(log.map((row) => [row.action, row.label, row.by])).toEqual([
      ["unban", "Amine", "Admin"],
      ["ban", "Amine", "Mod"],
      ["hide_job", "Receptionist", "Mod"],
      ["approve_business", "Hotel Sindbad", "Mod"],
    ]);
  });

  test("the terminal tool grants and removes the admin role", async () => {
    const t = setupBackend();
    const { candidate } = await world(t);
    await t.mutation(internal.adminTools.setAdmin, { email: "amine@example.test", admin: true });
    expect((await candidate.as.query(api.users.me, {}))?.staffRole).toBe("admin");
    await t.mutation(internal.adminTools.setAdmin, { email: "amine@example.test", admin: false });
    expect((await candidate.as.query(api.users.me, {}))?.staffRole).toBeNull();
  });
});
