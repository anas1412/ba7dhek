import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { isQuietHour, lastQuietStart, tunisDay } from "./lib/pushRules";
import { applicantsText, digestText, distanceText, newJobText, payText } from "./lib/pushText";
import { HAMMAMET, setupBackend, signedIn } from "./test.setup";

type Backend = ReturnType<typeof setupBackend>;

// Tunisia is UTC+1, so 13:00 UTC is 14:00 there: an ordinary afternoon.
const AFTERNOON = Date.UTC(2026, 10, 14, 13, 0);
// 22:30 UTC is 23:30 in Tunisia: inside quiet hours.
const NIGHT = Date.UTC(2026, 10, 14, 22, 30);
// 06:00 UTC the next day is 07:00 in Tunisia: when the morning summary runs.
const NEXT_MORNING = Date.UTC(2026, 10, 15, 6, 0);

const northOf = (meters: number) => ({
  latitude: HAMMAMET.latitude + meters / 111_195,
  longitude: HAMMAMET.longitude,
});

const JOB = {
  title: "Receptionist",
  description: "",
  category: "hospitality",
  contractType: "full_time" as const,
  payAmount: 900,
  payPeriod: "month" as const,
};

let tokens = 0;
const newToken = () => `ExponentPushToken[test-device-${String(tokens++).padStart(4, "0")}]`;

async function person(
  t: Backend,
  name: string,
  role: "candidate" | "employer",
  options: { language?: "ar" | "fr" | "en"; phone?: boolean } = {},
) {
  const { as, id } = await signedIn(t, name);
  await as.mutation(api.users.ensure, { language: options.language ?? "en" });
  await as.mutation(api.users.acceptConsent, { adult: true });
  await as.mutation(api.users.setRole, { role });
  if (options.phone !== false) await as.mutation(api.push.register, { token: newToken() });
  return { as, id };
}

async function candidateAt(
  t: Backend,
  name: string,
  meters: number,
  radiusM: number,
  options: Parameters<typeof person>[3] = {},
) {
  const candidate = await person(t, name, "candidate", options);
  await candidate.as.mutation(api.users.setHome, { home: northOf(meters), radiusM });
  return candidate;
}

/** An approved business at the centre of Hammamet. */
async function employerWithCompany(t: Backend, options: Parameters<typeof person>[3] = {}) {
  const employer = await person(t, "Sindbad", "employer", options);
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
  return { ...employer, companyId };
}

async function publishJob(t: Backend, employer: { as: Awaited<ReturnType<typeof person>>["as"] }, extra = {}) {
  const jobId = await employer.as.mutation(api.jobs.create, { ...JOB, ...extra });
  await employer.as.mutation(api.jobs.publish, { jobId });
  return jobId;
}

const sentTo = (t: Backend, userId: Id<"users">) => t.query(internal.notify.sentTo, { userId });

// Time is frozen, so nothing scheduled runs by itself: each test runs the
// notification it is about, by name. Nothing ever reaches Expo's servers.
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(AFTERNOON);
});
afterEach(() => {
  vi.useRealTimers();
});

describe("the rules for when a push may go out", () => {
  test("quiet hours run from 22:00 to 07:00 in Tunisia", () => {
    const tunis = (hour: number, minute = 0) => Date.UTC(2026, 10, 14, hour - 1, minute);
    expect(isQuietHour(tunis(21, 59))).toBe(false);
    expect(isQuietHour(tunis(22, 0))).toBe(true);
    expect(isQuietHour(tunis(3, 0))).toBe(true);
    expect(isQuietHour(tunis(6, 59))).toBe(true);
    expect(isQuietHour(tunis(7, 0))).toBe(false);
  });

  test("the day changes at midnight in Tunisia, not at midnight UTC", () => {
    expect(tunisDay(Date.UTC(2026, 10, 14, 22, 59))).toBe("2026-11-14");
    expect(tunisDay(Date.UTC(2026, 10, 14, 23, 0))).toBe("2026-11-15");
  });

  test("the overnight window starts at the last 22:00", () => {
    // Asked at 07:00 on the 15th: the night began at 22:00 on the 14th, which is 21:00 UTC.
    expect(lastQuietStart(NEXT_MORNING)).toBe(Date.UTC(2026, 10, 14, 21, 0));
    // Asked at 23:30 on the 14th: it began the same evening.
    expect(lastQuietStart(NIGHT)).toBe(Date.UTC(2026, 10, 14, 21, 0));
  });
});

describe("the words of a push", () => {
  test("distance and pay read as they do in the app", () => {
    expect(distanceText(648, "en")).toBe("650 m");
    expect(distanceText(1240, "fr")).toBe("1,2 km");
    expect(distanceText(1240, "ar")).toBe("1.2 كم");
    expect(payText(4.5, "hour", "fr")).toBe("4,5 TND par heure");
    expect(payText(900, "month", "ar")).toBe("900 دينار في الشهر");
  });

  test("a new job names the job, the pay, the business and the distance", () => {
    expect(newJobText("en", JOB, "Hotel Sindbad", 1240)).toEqual({
      title: "Receptionist · 900 TND per month",
      body: "Hotel Sindbad · 1.2 km from you",
    });
    expect(newJobText("fr", JOB, "Hotel Sindbad", 650).body).toBe("Hotel Sindbad · à 650 m de vous");
  });

  test("Arabic counts follow one, two, a few, many", () => {
    expect(digestText("ar", 1).title).toBe("خدمة جديدة بحذاك");
    expect(digestText("ar", 2).title).toBe("زوز خدم جدد بحذاك");
    expect(digestText("ar", 5).title).toBe("5 خدم جدد بحذاك");
    expect(digestText("ar", 12).title).toBe("12 خدمة جديدة بحذاك");
    expect(applicantsText("en", 1, "Receptionist").title).toBe("1 new applicant");
    expect(applicantsText("fr", 4, "Receptionist").title).toBe("4 nouvelles candidatures");
  });
});

describe("a new job nearby", () => {
  test("reaches the candidates whose own radius covers it, in their language, and nobody else", async () => {
    const t = setupBackend();
    const employer = await employerWithCompany(t);
    const near = await candidateAt(t, "Near", 1_200, 5_000, { language: "fr" });
    const tooFar = await candidateAt(t, "TooFar", 4_000, 3_000);
    const summaryOnly = await candidateAt(t, "Summary", 500, 5_000);
    await summaryOnly.as.mutation(api.push.setNewJobs, { mode: "digest" });
    const off = await candidateAt(t, "Off", 500, 5_000);
    await off.as.mutation(api.push.setNewJobs, { mode: "off" });
    const noPhone = await candidateAt(t, "NoPhone", 500, 5_000, { phone: false });

    const jobId = await publishJob(t, employer);
    await t.mutation(internal.notify.newJob, { jobId });

    const [pushed] = await sentTo(t, near.id);
    expect(pushed).toMatchObject({
      title: "Receptionist · 900 TND par mois",
      body: "Hotel Sindbad · à 1,2 km de vous",
      data: { type: "new_job", jobId },
      channelId: "jobs",
    });
    for (const other of [tooFar, summaryOnly, off, noPhone, employer]) {
      expect(await sentTo(t, other.id)).toEqual([]);
    }
    const job = await t.run((ctx) => ctx.db.get(jobId));
    expect(job?.notifiedCount).toBe(1);
  });

  test("is held back during quiet hours", async () => {
    const t = setupBackend();
    const employer = await employerWithCompany(t);
    const near = await candidateAt(t, "Near", 500, 5_000);

    vi.setSystemTime(NIGHT);
    const jobId = await publishJob(t, employer);
    await t.mutation(internal.notify.newJob, { jobId });

    expect(await sentTo(t, near.id)).toEqual([]);
  });

  test("stops at five a day for one candidate, and starts again the next day", async () => {
    const t = setupBackend();
    const employer = await employerWithCompany(t);
    const near = await candidateAt(t, "Near", 500, 5_000);

    for (let i = 0; i < 7; i++) {
      const jobId = await publishJob(t, employer, { title: `Job ${i}` });
      await t.mutation(internal.notify.newJob, { jobId });
    }
    expect(await sentTo(t, near.id)).toHaveLength(5);

    vi.setSystemTime(AFTERNOON + 24 * 60 * 60 * 1000);
    const jobId = await publishJob(t, employer, { title: "Tomorrow" });
    await t.mutation(internal.notify.newJob, { jobId });
    expect(await sentTo(t, near.id)).toHaveLength(6);
  });

  test("a job that was closed before the push ran is not announced", async () => {
    const t = setupBackend();
    const employer = await employerWithCompany(t);
    const near = await candidateAt(t, "Near", 500, 5_000);

    const jobId = await publishJob(t, employer);
    await employer.as.mutation(api.jobs.close, { jobId });
    await t.mutation(internal.notify.newJob, { jobId });

    expect(await sentTo(t, near.id)).toEqual([]);
  });
});

describe("the morning summary", () => {
  test("counts overnight jobs for some and the whole day for those who asked for one push a day", async () => {
    const t = setupBackend();
    const employer = await employerWithCompany(t);
    const everyJob = await candidateAt(t, "EveryJob", 500, 5_000);
    const daily = await candidateAt(t, "Daily", 500, 5_000, { language: "fr" });
    await daily.as.mutation(api.push.setNewJobs, { mode: "digest" });
    const off = await candidateAt(t, "Off", 500, 5_000);
    await off.as.mutation(api.push.setNewJobs, { mode: "off" });

    // One job in the afternoon, two during the night. One of the night jobs is then passed on.
    await publishJob(t, employer, { title: "Afternoon" });
    vi.setSystemTime(NIGHT);
    await publishJob(t, employer, { title: "Night one" });
    const passed = await publishJob(t, employer, { title: "Night two" });
    await everyJob.as.mutation(api.swipes.record, { jobId: passed, direction: "left" });

    vi.setSystemTime(NEXT_MORNING);
    await t.mutation(internal.notify.digest, {});

    // Only the overnight job this person has not already swiped.
    expect((await sentTo(t, everyJob.id)).map((n) => n.title)).toEqual(["1 new job near you"]);
    // All three of the last day's jobs.
    expect((await sentTo(t, daily.id)).map((n) => n.title)).toEqual(["3 nouvelles offres près de vous"]);
    expect(await sentTo(t, off.id)).toEqual([]);
  });

  test("says nothing when there is nothing new", async () => {
    const t = setupBackend();
    await employerWithCompany(t);
    const near = await candidateAt(t, "Near", 500, 5_000);

    vi.setSystemTime(NEXT_MORNING);
    await t.mutation(internal.notify.digest, {});
    expect(await sentTo(t, near.id)).toEqual([]);
  });
});

describe("applications, acceptance and chat", () => {
  async function applied(t: Backend) {
    const employer = await employerWithCompany(t);
    const candidate = await candidateAt(t, "Amine", 500, 5_000, { language: "ar" });
    const jobId = await publishJob(t, employer);
    const swipeId = await candidate.as.mutation(api.swipes.record, { jobId, direction: "right" });
    return { employer, candidate, jobId, swipeId };
  }

  test("the first applicant is announced at once; later ones wait and arrive as one count", async () => {
    const t = setupBackend();
    const { employer, jobId } = await applied(t);
    // The push runs a moment after the application, as it does when scheduled.
    vi.setSystemTime(AFTERNOON + 1_000);
    await t.mutation(internal.notify.applicant, { jobId });
    expect((await sentTo(t, employer.id)).map((n) => [n.title, n.body])).toEqual([
      ["1 new applicant", "Receptionist"],
    ]);

    // Two more people apply twenty minutes later.
    vi.setSystemTime(AFTERNOON + 20 * 60 * 1000);
    for (const name of ["Sami", "Leila"]) {
      const other = await candidateAt(t, name, 800, 5_000);
      await other.as.mutation(api.swipes.record, { jobId, direction: "right" });
      await t.mutation(internal.notify.applicant, { jobId });
    }
    expect(await sentTo(t, employer.id)).toHaveLength(1);

    // When the hour is over, one push carries both.
    vi.setSystemTime(AFTERNOON + 61 * 60 * 1000);
    await t.mutation(internal.notify.applicantsLater, { jobId });
    const pushes = await sentTo(t, employer.id);
    expect(pushes).toHaveLength(2);
    expect(pushes[0]).toMatchObject({ title: "2 new applicants", data: { type: "applicants", jobId } });
  });

  test("being accepted reaches the candidate, in their language, with the chat to open", async () => {
    const t = setupBackend();
    const { employer, candidate, swipeId } = await applied(t);
    const matchId = (await employer.as.mutation(api.swipes.decide, { swipeId, accept: true })) as Id<"matches">;
    await t.mutation(internal.notify.match, { matchId });

    expect(await sentTo(t, candidate.id)).toMatchObject([
      { title: "Hotel Sindbad يحب يحكي معاك", data: { type: "match", matchId }, channelId: "messages" },
    ]);
  });

  test("a message reaches the other side under the sender's name, unless they have already read it", async () => {
    const t = setupBackend();
    const { employer, candidate, swipeId } = await applied(t);
    const matchId = (await employer.as.mutation(api.swipes.decide, { swipeId, accept: true })) as Id<"matches">;

    const first = await employer.as.mutation(api.messages.send, { matchId, body: "Vous pouvez passer demain ?" });
    await t.mutation(internal.notify.message, { messageId: first });
    expect(await sentTo(t, candidate.id)).toMatchObject([
      // The candidate hears from the business, and bursts in one chat replace each other.
      { title: "Hotel Sindbad", body: "Vous pouvez passer demain ?", data: { type: "message", matchId }, collapseId: matchId },
    ]);

    // The employer has the chat open when the answer arrives, so their phone stays quiet.
    vi.setSystemTime(AFTERNOON + 60_000);
    const answer = await candidate.as.mutation(api.messages.send, { matchId, body: "Oui." });
    vi.setSystemTime(AFTERNOON + 62_000);
    await employer.as.mutation(api.matches.markRead, { matchId });
    await t.mutation(internal.notify.message, { messageId: answer });
    expect(await sentTo(t, employer.id)).toEqual([]);

    // Without the chat open, the employer is told, under the person's name.
    vi.setSystemTime(AFTERNOON + 120_000);
    const later = await candidate.as.mutation(api.messages.send, { matchId, body: "A 10h ?" });
    await t.mutation(internal.notify.message, { messageId: later });
    expect(await sentTo(t, employer.id)).toMatchObject([{ title: "Amine", body: "A 10h ?" }]);
  });

  test("nothing is sent into a blocked chat", async () => {
    const t = setupBackend();
    const { employer, candidate, swipeId } = await applied(t);
    const matchId = (await employer.as.mutation(api.swipes.decide, { swipeId, accept: true })) as Id<"matches">;
    const messageId = await employer.as.mutation(api.messages.send, { matchId, body: "Bonjour" });
    await candidate.as.mutation(api.matches.block, { matchId });

    await t.mutation(internal.notify.message, { messageId });
    await t.mutation(internal.notify.match, { matchId });
    expect(await sentTo(t, candidate.id)).toEqual([]);
  });

  test("an approved business is told it can publish", async () => {
    const t = setupBackend();
    const employer = await employerWithCompany(t, { language: "fr" });
    await t.mutation(internal.notify.companyApproved, { companyId: employer.companyId });
    expect(await sentTo(t, employer.id)).toMatchObject([
      { title: "Hotel Sindbad est validé", data: { type: "company_approved" } },
    ]);
  });
});

describe("a phone's registration", () => {
  test("only a real Expo push address is accepted", async () => {
    const t = setupBackend();
    const { as } = await person(t, "Amine", "candidate", { phone: false });
    await expect(as.mutation(api.push.register, { token: "not-a-token" })).rejects.toThrow();
    await expect(as.mutation(api.push.register, { token: "https://example.test/hook" })).rejects.toThrow();
    await as.mutation(api.push.register, { token: "ExpoPushToken[abcdefghij1234567890]" });
  });

  test("after signing out, the phone receives nothing more", async () => {
    const t = setupBackend();
    const employer = await employerWithCompany(t);
    const near = await candidateAt(t, "Near", 500, 5_000);
    await near.as.mutation(api.push.unregister, {});

    const jobId = await publishJob(t, employer);
    await t.mutation(internal.notify.newJob, { jobId });
    expect(await sentTo(t, near.id)).toEqual([]);
    expect((await t.run((ctx) => ctx.db.get(jobId)))?.notifiedCount).toBe(0);
  });

  test("the new-job setting is the candidate's alone to change", async () => {
    const t = setupBackend();
    const employer = await employerWithCompany(t);
    await expect(employer.as.mutation(api.push.setNewJobs, { mode: "off" })).rejects.toThrow();
  });
});
