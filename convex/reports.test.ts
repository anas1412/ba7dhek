import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { HAMMAMET, setupBackend, signedIn } from "./test.setup";

type Backend = ReturnType<typeof setupBackend>;

const PAGE = { paginationOpts: { numItems: 50, cursor: null } };
/** The open reports, as one generous page. */
const queue = async (admin: { query: Backend["query"] }) => (await admin.query(api.reports.open, PAGE)).page;

async function person(t: Backend, name: string, role: "candidate" | "employer") {
  const { as, id } = await signedIn(t, name);
  await as.mutation(api.users.ensure, { language: "fr" });
  await as.mutation(api.users.acceptConsent, { adult: true });
  await as.mutation(api.users.setRole, { role });
  return { as, id };
}

async function candidate(t: Backend, name: string) {
  const made = await person(t, name, "candidate");
  await made.as.mutation(api.users.setHome, { home: HAMMAMET, radiusM: 5_000 });
  return made;
}

/** An approved employer with one live job, and an admin. */
async function world(t: Backend) {
  const employer = await person(t, "Sindbad", "employer");
  const companyId = await employer.as.mutation(api.companies.create, {
    name: "Hotel Sindbad",
    category: "hospitality",
    address: "Avenue des Nations Unies, Hammamet",
    kind: "individual",
    location: HAMMAMET,
  });
  const { as: admin, id: adminId } = await signedIn(t, "Admin");
  await admin.mutation(api.users.ensure, { language: "fr" });
  await t.run((ctx) => ctx.db.patch(adminId, { isAdmin: true }));
  await admin.mutation(api.companies.approve, { companyId });
  const jobId = await employer.as.mutation(api.jobs.create, {
    title: "Receptionist",
    description: "",
    category: "hospitality",
    contractType: "full_time",
    payAmount: 900,
    payPeriod: "month",
  });
  await employer.as.mutation(api.jobs.publish, { jobId });
  return { employer, admin, jobId };
}

const visibleTo = async (who: { as: Awaited<ReturnType<typeof person>>["as"] }) =>
  (await who.as.query(api.jobs.feed, {})).jobs.map((found) => found._id);

describe("reporting a job", () => {
  test("it leaves the reporter's stack at once and stays for everyone else", async () => {
    const t = setupBackend();
    const { jobId } = await world(t);
    const amine = await candidate(t, "Amine");
    const sami = await candidate(t, "Sami");

    await amine.as.mutation(api.reports.job, { jobId, reason: "fake", note: "Le poste n'existe pas" });

    expect(await visibleTo(amine)).toEqual([]);
    expect(await visibleTo(sami)).toEqual([jobId]);
  });

  test("three different people hide it from everyone; one person reporting three times does not", async () => {
    const t = setupBackend();
    const { jobId } = await world(t);
    const amine = await candidate(t, "Amine");
    const onlooker = await candidate(t, "Onlooker");

    for (let i = 0; i < 3; i++) await amine.as.mutation(api.reports.job, { jobId, reason: "asks_money" });
    expect(await visibleTo(onlooker)).toEqual([jobId]);
    expect(await t.run(async (ctx) => (await ctx.db.query("reports").collect()).length)).toBe(1);

    for (const name of ["Sami", "Leila"]) {
      const other = await candidate(t, name);
      await other.as.mutation(api.reports.job, { jobId, reason: "asks_money" });
    }
    expect(await visibleTo(onlooker)).toEqual([]);
    // Hidden means it cannot be applied to either, even with its address in hand.
    await expect(onlooker.as.mutation(api.swipes.record, { jobId, direction: "right" })).rejects.toThrow();
    await expect(onlooker.as.query(api.jobs.detail, { jobId })).rejects.toThrow();
  });

  test("only a candidate can report a job, and an unacceptable note is refused", async () => {
    const t = setupBackend();
    const { employer, jobId } = await world(t);
    await expect(employer.as.mutation(api.reports.job, { jobId, reason: "fake" })).rejects.toThrow();
    const amine = await candidate(t, "Amine");
    await expect(amine.as.mutation(api.reports.job, { jobId, reason: "fake", note: "a".repeat(501) })).rejects.toThrow();
  });
});

describe("reviewing reports", () => {
  async function hiddenJob(t: Backend) {
    const made = await world(t);
    for (const name of ["Amine", "Sami", "Leila"]) {
      const reporter = await candidate(t, name);
      await reporter.as.mutation(api.reports.job, { jobId: made.jobId, reason: "fake" });
    }
    return made;
  }

  test("the queue is the admin's alone and shows what is needed to judge", async () => {
    const t = setupBackend();
    const { admin, employer, jobId } = await hiddenJob(t);

    await expect(employer.as.query(api.reports.open, PAGE)).rejects.toThrow();
    const waiting = await queue(admin);
    expect(waiting).toHaveLength(3);
    expect(waiting[0]).toMatchObject({
      kind: "job",
      jobId,
      title: "Receptionist",
      companyName: "Hotel Sindbad",
      reason: "fake",
      hidden: true,
      reportCount: 3,
      reporterName: "Amine",
    });
  });

  test("dismissing a report brings a hidden job back once fewer than three remain", async () => {
    const t = setupBackend();
    const { admin, jobId } = await hiddenJob(t);
    const onlooker = await candidate(t, "Onlooker");
    const [first] = await queue(admin);

    await admin.mutation(api.reports.resolve, { reportId: first._id, action: "dismiss" });

    expect(await visibleTo(onlooker)).toEqual([jobId]);
    expect(await queue(admin)).toHaveLength(2);
  });

  test("removing a job closes it for good and settles every report about it", async () => {
    const t = setupBackend();
    const { admin, employer, jobId } = await hiddenJob(t);
    const onlooker = await candidate(t, "Onlooker");
    const [first] = await queue(admin);

    await admin.mutation(api.reports.resolve, { reportId: first._id, action: "remove" });

    expect(await queue(admin)).toEqual([]);
    expect(await visibleTo(onlooker)).toEqual([]);
    const [mine] = await employer.as.query(api.jobs.mine, {});
    expect(mine).toMatchObject({ _id: jobId, status: "closed", hidden: true });
    // The employer cannot simply publish it again.
    await employer.as.mutation(api.jobs.publish, { jobId }).catch(() => {});
    expect(await visibleTo(onlooker)).toEqual([]);
  });

  test("banning a person reported from a chat locks them out and takes their jobs down", async () => {
    const t = setupBackend();
    const { admin, employer, jobId } = await world(t);
    const amine = await candidate(t, "Amine");
    const swipeId = await amine.as.mutation(api.swipes.record, { jobId, direction: "right" });
    const matchId = (await employer.as.mutation(api.swipes.decide, { swipeId, accept: true })) as Id<"matches">;
    await amine.as.mutation(api.matches.report, { matchId, reason: "asks_money" });

    const [report] = await queue(admin);
    expect(report).toMatchObject({ kind: "user", title: "Sindbad", role: "employer", banned: false });
    await admin.mutation(api.reports.resolve, { reportId: report._id, action: "remove" });

    await expect(employer.as.query(api.jobs.mine, {})).rejects.toThrow();
    const onlooker = await candidate(t, "Onlooker");
    expect(await visibleTo(onlooker)).toEqual([]);
    expect(await queue(admin)).toEqual([]);
  });

  test("a report cannot be settled twice, nor by anyone but the admin", async () => {
    const t = setupBackend();
    const { admin, employer } = await hiddenJob(t);
    const [first] = await queue(admin);
    await expect(employer.as.mutation(api.reports.resolve, { reportId: first._id, action: "dismiss" })).rejects.toThrow();
    await admin.mutation(api.reports.resolve, { reportId: first._id, action: "dismiss" });
    await expect(admin.mutation(api.reports.resolve, { reportId: first._id, action: "dismiss" })).rejects.toThrow();
  });
});
