import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { HAMMAMET, setupBackend, signedIn } from "./test.setup";

type Backend = ReturnType<typeof setupBackend>;

const START = Date.UTC(2026, 10, 14, 13, 0);
const DAY = 24 * 60 * 60 * 1000;
const MONTH = 30 * DAY;

async function person(t: Backend, name: string, role: "candidate" | "employer") {
  const { as, id } = await signedIn(t, name);
  await as.mutation(api.users.ensure, { language: "en" });
  await as.mutation(api.users.acceptConsent, { adult: true });
  await as.mutation(api.users.setRole, { role });
  await as.mutation(api.push.register, { token: `ExponentPushToken[retention-${name}]` });
  return { as, id };
}

/** An approved employer with one live job, and a candidate who applied and was accepted. */
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
  await t.run((ctx) => ctx.db.patch(adminId, { staffRole: "admin" }));
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
  const candidate = await person(t, "Amine", "candidate");
  await candidate.as.mutation(api.users.setHome, { home: HAMMAMET, radiusM: 5_000 });
  const swipeId = await candidate.as.mutation(api.swipes.record, { jobId, direction: "right" });
  const matchId = (await employer.as.mutation(api.swipes.decide, { swipeId, accept: true })) as Id<"matches">;
  await employer.as.mutation(api.messages.send, { matchId, body: "Bonjour" });
  return { employer, candidate, admin, adminId, jobId, matchId };
}

const count = (t: Backend, table: "users" | "jobs" | "swipes" | "matches" | "messages" | "reports" | "pushCounters") =>
  t.run(async (ctx) => (await ctx.db.query(table).collect()).length);

const runJob = (t: Backend) => t.mutation(internal.retention.run, {});

/** Everyone opens the app, which is what keeps an account alive. */
async function everyoneOpensTheApp(made: Awaited<ReturnType<typeof world>>) {
  for (const who of [made.employer.as, made.candidate.as, made.admin]) {
    await who.mutation(api.users.ensure, { language: "en" });
  }
}

// Time is frozen and moved by hand, so months pass in a line of code and nothing scheduled runs by itself.
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(START);
});
afterEach(() => {
  vi.useRealTimers();
});

describe("the retention job", () => {
  test("on an ordinary day it removes nothing", async () => {
    const t = setupBackend();
    await world(t);
    vi.setSystemTime(START + DAY);
    expect(await runJob(t)).toMatchObject({
      jobsExpired: 0,
      jobsDeleted: 0,
      conversationsDeleted: 0,
      accountsWarned: 0,
      accountsDeleted: 0,
      reportsDeleted: 0,
      more: false,
    });
    expect(await count(t, "jobs")).toBe(1);
    expect(await count(t, "messages")).toBe(1);
  });

  test("a job post is closed 30 days after publishing, and its owner can publish it again", async () => {
    const t = setupBackend();
    const { employer, jobId } = await world(t);
    const onlooker = await person(t, "Leila", "candidate");
    await onlooker.as.mutation(api.users.setHome, { home: HAMMAMET, radiusM: 5_000 });

    vi.setSystemTime(START + 29 * DAY);
    expect((await runJob(t)).jobsExpired).toBe(0);
    vi.setSystemTime(START + 31 * DAY);
    expect((await runJob(t)).jobsExpired).toBe(1);

    expect((await employer.as.query(api.jobs.mine, {}))[0].status).toBe("closed");
    expect((await onlooker.as.query(api.jobs.feed, {})).jobs).toEqual([]);
    await employer.as.mutation(api.jobs.publish, { jobId });
    expect((await onlooker.as.query(api.jobs.feed, {})).jobs).toHaveLength(1);
  });

  test("a closed job is deleted with its applications 12 months after closing, not before", async () => {
    const t = setupBackend();
    const made = await world(t);
    await made.employer.as.mutation(api.jobs.close, { jobId: made.jobId });

    vi.setSystemTime(START + 11 * MONTH);
    await everyoneOpensTheApp(made);
    expect((await runJob(t)).jobsDeleted).toBe(0);
    expect(await count(t, "swipes")).toBe(1);

    vi.setSystemTime(START + 12 * MONTH + DAY);
    await everyoneOpensTheApp(made);
    expect((await runJob(t)).jobsDeleted).toBe(1);
    expect(await count(t, "jobs")).toBe(0);
    expect(await count(t, "swipes")).toBe(0);
  });

  test("a conversation is deleted with its messages 12 months after its last message", async () => {
    const t = setupBackend();
    const made = await world(t);

    // A message at month 6 moves the clock for this conversation.
    vi.setSystemTime(START + 6 * MONTH);
    await made.candidate.as.mutation(api.messages.send, { matchId: made.matchId, body: "Toujours disponible ?" });

    vi.setSystemTime(START + 13 * MONTH);
    await everyoneOpensTheApp(made);
    expect((await runJob(t)).conversationsDeleted).toBe(0);
    expect(await count(t, "messages")).toBe(2);

    vi.setSystemTime(START + 18 * MONTH + DAY);
    await everyoneOpensTheApp(made);
    expect((await runJob(t)).conversationsDeleted).toBe(1);
    expect(await count(t, "matches")).toBe(0);
    expect(await count(t, "messages")).toBe(0);
    expect(await made.candidate.as.query(api.matches.mine, {})).toEqual([]);
  });

  test("an unused account is warned at 23 months and deleted at 24, never without the month of notice", async () => {
    const t = setupBackend();
    const made = await world(t);
    const stay = async () => {
      await made.employer.as.mutation(api.users.ensure, { language: "en" });
      await made.admin.mutation(api.users.ensure, { language: "en" });
    };

    // The candidate never opens the app again. The job has run every day, as it does.
    vi.setSystemTime(START + 23 * MONTH + DAY);
    await stay();
    expect((await runJob(t)).accountsWarned).toBe(1);
    const [warning] = await t.query(internal.notify.sentTo, { userId: made.candidate.id });
    expect(warning).toMatchObject({ title: "Your Ba7dhek account will be deleted", data: { type: "account_expiry" } });
    // Warned once, not every day.
    vi.setSystemTime(START + 23 * MONTH + 2 * DAY);
    await stay();
    expect((await runJob(t)).accountsWarned).toBe(0);

    vi.setSystemTime(START + 24 * MONTH + 5 * DAY);
    await stay();
    expect((await runJob(t)).accountsDeleted).toBe(1);
    expect(await t.run((ctx) => ctx.db.get(made.candidate.id))).toBeNull();
    expect(await t.run((ctx) => ctx.db.get(made.employer.id))).not.toBeNull();
  });

  test("an account idle for years but never warned gets its month of notice first", async () => {
    const t = setupBackend();
    const made = await world(t);
    // The job did not run for three years, then runs.
    vi.setSystemTime(START + 36 * MONTH);
    await made.employer.as.mutation(api.users.ensure, { language: "en" });
    await made.admin.mutation(api.users.ensure, { language: "en" });

    const first = await runJob(t);
    expect(first).toMatchObject({ accountsWarned: 1, accountsDeleted: 0 });

    vi.setSystemTime(START + 36 * MONTH + 29 * DAY);
    await made.employer.as.mutation(api.users.ensure, { language: "en" });
    await made.admin.mutation(api.users.ensure, { language: "en" });
    expect((await runJob(t)).accountsDeleted).toBe(0);

    vi.setSystemTime(START + 36 * MONTH + 31 * DAY);
    await made.employer.as.mutation(api.users.ensure, { language: "en" });
    await made.admin.mutation(api.users.ensure, { language: "en" });
    expect((await runJob(t)).accountsDeleted).toBe(1);
  });

  test("opening the app after the warning keeps the account", async () => {
    const t = setupBackend();
    const made = await world(t);
    vi.setSystemTime(START + 23 * MONTH + DAY);
    await made.employer.as.mutation(api.users.ensure, { language: "en" });
    await made.admin.mutation(api.users.ensure, { language: "en" });
    await runJob(t);

    vi.setSystemTime(START + 23 * MONTH + 10 * DAY);
    await everyoneOpensTheApp(made);

    vi.setSystemTime(START + 25 * MONTH);
    await made.employer.as.mutation(api.users.ensure, { language: "en" });
    await made.admin.mutation(api.users.ensure, { language: "en" });
    expect((await runJob(t)).accountsDeleted).toBe(0);
    const kept = await t.run((ctx) => ctx.db.get(made.candidate.id));
    expect(kept).not.toBeNull();
    expect(kept?.retentionWarnedAt).toBeUndefined();
  });

  test("staff accounts are never warned or deleted for being idle", async () => {
    const t = setupBackend();
    const made = await world(t);
    vi.setSystemTime(START + 40 * MONTH);
    await runJob(t);
    vi.setSystemTime(START + 42 * MONTH);
    await runJob(t);
    expect(await t.run((ctx) => ctx.db.get(made.adminId))).not.toBeNull();
  });

  test("a settled report is deleted after 24 months; one still waiting is kept", async () => {
    const t = setupBackend();
    const made = await world(t);
    await made.candidate.as.mutation(api.matches.report, { matchId: made.matchId, reason: "other" });
    const other = await person(t, "Leila", "candidate");
    await other.as.mutation(api.users.setHome, { home: HAMMAMET, radiusM: 5_000 });
    await other.as.mutation(api.reports.job, { jobId: made.jobId, reason: "fake" });
    const waiting = (await made.admin.query(api.reports.open, { paginationOpts: { numItems: 10, cursor: null } })).page;
    await made.admin.mutation(api.reports.resolve, { reportId: waiting[0]._id, action: "dismiss" });

    vi.setSystemTime(START + 24 * MONTH + DAY);
    expect((await runJob(t)).reportsDeleted).toBe(1);
    const left = await t.run((ctx) => ctx.db.query("reports").collect());
    expect(left.map((report) => report.status)).toEqual(["open"]);
  });

  test("with more to do than one run handles, it asks to run again", async () => {
    const t = setupBackend();
    const made = await world(t);
    for (let i = 0; i < 55; i++) {
      const jobId = await made.employer.as.mutation(api.jobs.create, {
        title: `Job ${i}`,
        description: "",
        category: "hospitality",
        contractType: "full_time",
        payAmount: 900,
        payPeriod: "month",
      });
      await made.employer.as.mutation(api.jobs.publish, { jobId });
    }
    vi.setSystemTime(START + 31 * DAY);
    const first = await runJob(t);
    expect(first).toMatchObject({ jobsExpired: 50, more: true });
    const second = await runJob(t);
    expect(second).toMatchObject({ jobsExpired: 6, more: false });
  });
});

describe("orphan photo cleanup", () => {
  const upload = (t: Backend) => t.run((ctx) => ctx.storage.store(new Blob(["photo"], { type: "image/jpeg" })));
  const exists = (t: Backend, id: Id<"_storage">) => t.run(async (ctx) => (await ctx.db.system.get(id)) !== null);

  test("an old file that nothing points to is removed; attached and recent ones are kept", async () => {
    const t = setupBackend();
    const made = await world(t);

    const profilePhoto = await upload(t);
    await made.candidate.as.mutation(api.users.setPhoto, { storageId: profilePhoto });
    const jobPhoto = await upload(t);
    await made.employer.as.mutation(api.jobs.addImage, { jobId: made.jobId, storageId: jobPhoto });
    const logo = await upload(t);
    await made.employer.as.mutation(api.companies.setLogo, { storageId: logo });
    const abandoned = await upload(t);

    vi.setSystemTime(START + 2 * DAY);
    const justUploaded = await upload(t);

    expect(await t.mutation(internal.cleanup.orphanUploads, {})).toEqual({ deleted: 1, done: true });
    expect(await exists(t, abandoned)).toBe(false);
    for (const kept of [profilePhoto, jobPhoto, logo, justUploaded]) expect(await exists(t, kept)).toBe(true);
  });

  test("a second run finds nothing more", async () => {
    const t = setupBackend();
    await world(t);
    await upload(t);
    vi.setSystemTime(START + 2 * DAY);
    await t.mutation(internal.cleanup.orphanUploads, {});
    expect(await t.mutation(internal.cleanup.orphanUploads, {})).toEqual({ deleted: 0, done: true });
  });
});
