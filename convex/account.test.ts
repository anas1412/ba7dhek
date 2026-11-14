import { describe, expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { HAMMAMET, setupBackend, signedIn } from "./test.setup";

type Backend = ReturnType<typeof setupBackend>;

async function person(t: Backend, name: string, role: "candidate" | "employer") {
  const { as, id } = await signedIn(t, name);
  await as.mutation(api.users.ensure, { language: "fr" });
  await as.mutation(api.users.acceptConsent, { adult: true });
  await as.mutation(api.users.setRole, { role });
  await as.mutation(api.push.register, { token: `ExponentPushToken[account-test-${name}]` });
  return { as, id };
}

/** An employer with a live job, and a candidate who applied, was accepted, and exchanged a message. */
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

  const candidate = await person(t, "Amine", "candidate");
  await candidate.as.mutation(api.users.setHome, { home: HAMMAMET, radiusM: 5_000 });
  const swipeId = await candidate.as.mutation(api.swipes.record, { jobId, direction: "right" });
  const matchId = (await employer.as.mutation(api.swipes.decide, { swipeId, accept: true })) as Id<"matches">;
  await employer.as.mutation(api.messages.send, { matchId, body: "Bonjour" });
  await candidate.as.mutation(api.messages.send, { matchId, body: "Bonjour, merci." });
  return { employer, candidate, companyId, jobId, matchId };
}

const count = (t: Backend, table: "users" | "swipes" | "jobs" | "companies" | "matches" | "messages") =>
  t.run(async (ctx) => (await ctx.db.query(table).collect()).length);

describe("deleting an account", () => {
  test("a candidate's profile, applications and sign-in are gone; the employer keeps the conversation, closed", async () => {
    const t = setupBackend();
    const { employer, candidate, jobId, matchId } = await world(t);
    // A sign-in record like the one Convex Auth keeps, to prove it is removed too.
    await t.run(async (ctx) => {
      const sessionId = await ctx.db.insert("authSessions", { userId: candidate.id, expirationTime: Date.now() + 1_000 });
      await ctx.db.insert("authRefreshTokens", { sessionId, expirationTime: Date.now() + 1_000 });
      await ctx.db.insert("authAccounts", { userId: candidate.id, provider: "google", providerAccountId: "g-123" });
    });

    await candidate.as.mutation(api.account.remove, {});

    expect(await t.run((ctx) => ctx.db.get(candidate.id))).toBeNull();
    expect(await count(t, "swipes")).toBe(0);
    expect(await t.run(async (ctx) => (await ctx.db.query("authSessions").collect()).length)).toBe(0);
    expect(await t.run(async (ctx) => (await ctx.db.query("authRefreshTokens").collect()).length)).toBe(0);
    expect(await t.run(async (ctx) => (await ctx.db.query("authAccounts").collect()).length)).toBe(0);
    // The phone no longer receives anything.
    expect(await t.query(internal.notify.sentTo, { userId: candidate.id })).toEqual([]);

    // The employer no longer sees them as an applicant, but keeps what was said.
    expect(await employer.as.query(api.swipes.forJob, { jobId })).toEqual([]);
    const header = await employer.as.query(api.matches.get, { matchId });
    expect(header).toMatchObject({ blocked: true, blockedByMe: false });
    expect(header.other.name).toBeNull();
    expect(await employer.as.query(api.messages.list, { matchId })).toHaveLength(2);
    await expect(employer.as.mutation(api.messages.send, { matchId, body: "Allo ?" })).rejects.toThrow();
    await expect(employer.as.mutation(api.matches.unblock, { matchId })).rejects.toThrow();

    // The job itself is untouched.
    expect(await count(t, "jobs")).toBe(1);
  });

  test("a deleted candidate no longer receives new jobs and can no longer act", async () => {
    const t = setupBackend();
    const { employer, candidate } = await world(t);
    await candidate.as.mutation(api.account.remove, {});

    const jobId = await employer.as.mutation(api.jobs.create, {
      title: "Night porter",
      description: "",
      category: "hospitality",
      contractType: "full_time",
      payAmount: 800,
      payPeriod: "month",
    });
    await employer.as.mutation(api.jobs.publish, { jobId });
    await t.mutation(internal.notify.newJob, { jobId });
    expect((await t.run((ctx) => ctx.db.get(jobId)))?.notifiedCount).toBe(0);

    // The old session's token now points at nobody.
    expect(await candidate.as.query(api.users.me, {})).toBeNull();
    await expect(candidate.as.mutation(api.swipes.record, { jobId, direction: "right" })).rejects.toThrow();
  });

  test("an employer's business, jobs and the applications to them are gone; the candidate keeps the conversation, closed", async () => {
    const t = setupBackend();
    const { employer, candidate, matchId } = await world(t);

    await employer.as.mutation(api.account.remove, {});

    expect(await t.run((ctx) => ctx.db.get(employer.id))).toBeNull();
    expect(await count(t, "companies")).toBe(0);
    expect(await count(t, "jobs")).toBe(0);
    expect(await count(t, "swipes")).toBe(0);

    // The candidate's stack and applications no longer show the job.
    expect((await candidate.as.query(api.jobs.feed, {})).jobs).toEqual([]);
    expect(await candidate.as.query(api.swipes.mine, {})).toEqual([]);
    // The conversation stays readable and closed, with no name on the other side.
    const header = await candidate.as.query(api.matches.get, { matchId });
    expect(header).toMatchObject({ blocked: true, blockedByMe: false, jobId: null });
    expect(header.other.name).toBeNull();
    expect(await candidate.as.query(api.messages.list, { matchId })).toHaveLength(2);
  });

  test("an account with no role yet, straight after sign-in, can be deleted too", async () => {
    const t = setupBackend();
    const { as, id } = await signedIn(t, "Newcomer");
    await as.mutation(api.users.ensure, { language: "en" });
    await as.mutation(api.account.remove, {});
    expect(await t.run((ctx) => ctx.db.get(id))).toBeNull();
  });

  test("it removes only the caller's account", async () => {
    const t = setupBackend();
    const { candidate } = await world(t);
    const other = await person(t, "Leila", "candidate");
    await other.as.mutation(api.users.setHome, { home: HAMMAMET, radiusM: 5_000 });

    await other.as.mutation(api.account.remove, {});

    expect(await t.run((ctx) => ctx.db.get(candidate.id))).not.toBeNull();
    expect(await count(t, "swipes")).toBe(1);
    expect(await count(t, "matches")).toBe(1);
  });

  test("it cannot be done signed out", async () => {
    const t = setupBackend();
    await expect(t.mutation(api.account.remove, {})).rejects.toThrow();
  });
});
