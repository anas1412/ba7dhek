import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import { HAMMAMET, setupBackend, signedIn } from "./test.setup";

type Backend = ReturnType<typeof setupBackend>;

const northOf = (meters: number) => ({
  latitude: HAMMAMET.latitude + meters / 111_195,
  longitude: HAMMAMET.longitude,
});
const PARIS = { latitude: 48.8566, longitude: 2.3522 };

/** A signed-in user who has accepted consent and picked a role. */
async function person(t: Backend, name: string, role: "candidate" | "employer") {
  const { as } = await signedIn(t, name);
  await as.mutation(api.users.ensure, { language: "fr" });
  await as.mutation(api.users.acceptConsent, { adult: true });
  await as.mutation(api.users.setRole, { role });
  return as;
}

async function admin(t: Backend) {
  const { as, id } = await signedIn(t, "Admin");
  await as.mutation(api.users.ensure, { language: "fr" });
  await t.run((ctx) => ctx.db.patch(id, { isAdmin: true }));
  return as;
}

/** An employer with an approved company at `meters` north of Hammamet. */
async function approvedEmployer(t: Backend, name: string, meters = 0) {
  const employer = await person(t, name, "employer");
  const companyId = await employer.mutation(api.companies.create, {
    name: `Hotel ${name}`,
    category: "hospitality",
    address: "Avenue des Nations Unies, Hammamet",
    kind: "individual",
    location: northOf(meters),
  });
  await (await admin(t)).mutation(api.companies.approve, { companyId });
  return { employer, companyId };
}

const JOB = {
  title: "Receptionist",
  description: "Front desk, evening shift.",
  category: "hospitality",
  contractType: "full_time" as const,
  payAmount: 900,
  payPeriod: "month" as const,
};

describe("the loop", () => {
  test("post, see nearby, apply, accept, match", async () => {
    const t = setupBackend();
    const { employer } = await approvedEmployer(t, "sindbad", 1_200);
    const jobId = await employer.mutation(api.jobs.create, JOB);
    await employer.mutation(api.jobs.publish, { jobId });

    const candidate = await person(t, "amine", "candidate");
    await candidate.mutation(api.users.setHome, { home: HAMMAMET, radiusM: 5_000 });

    const feed = await candidate.query(api.jobs.feed, {});
    expect(feed.reason).toBe("ok");
    expect(feed.jobs).toHaveLength(1);
    expect(feed.jobs[0]).toMatchObject({ title: "Receptionist", companyName: "Hotel sindbad" });
    expect(feed.jobs[0].distanceM).toBeGreaterThan(1_150);
    expect(feed.jobs[0].distanceM).toBeLessThan(1_250);

    await candidate.mutation(api.swipes.record, { jobId, direction: "right" });
    expect((await candidate.query(api.jobs.feed, {})).jobs).toHaveLength(0);

    const applicants = await employer.query(api.swipes.forJob, { jobId });
    expect(applicants).toHaveLength(1);
    expect(applicants[0]).toMatchObject({ name: "amine", decision: "pending", distanceBucket: "1to3" });

    const matchId = await employer.mutation(api.swipes.decide, {
      swipeId: applicants[0]._id,
      accept: true,
    });
    expect(matchId).not.toBeNull();

    const applications = await candidate.query(api.swipes.mine, {});
    expect(applications[0]).toMatchObject({ decision: "accepted", jobTitle: "Receptionist" });
  });
});

describe("the feed", () => {
  test("shows only jobs inside the radius, nearest first", async () => {
    const t = setupBackend();
    const far = await approvedEmployer(t, "far", 4_000);
    const near = await approvedEmployer(t, "near", 600);
    const outside = await approvedEmployer(t, "outside", 9_000);
    for (const { employer } of [far, near, outside]) {
      const jobId = await employer.mutation(api.jobs.create, JOB);
      await employer.mutation(api.jobs.publish, { jobId });
    }

    const candidate = await person(t, "amine", "candidate");
    await candidate.mutation(api.users.setHome, { home: HAMMAMET, radiusM: 5_000 });
    const { jobs } = await candidate.query(api.jobs.feed, {});
    expect(jobs.map((job) => job.companyName)).toEqual(["Hotel near", "Hotel far"]);

    // Widening the radius brings the third job in.
    await candidate.mutation(api.users.setHome, { home: HAMMAMET, radiusM: 10_000 });
    expect((await candidate.query(api.jobs.feed, {})).jobs).toHaveLength(3);
  });

  test("says so when the candidate has no starting point", async () => {
    const t = setupBackend();
    const candidate = await person(t, "amine", "candidate");
    expect(await candidate.query(api.jobs.feed, {})).toEqual({ reason: "no_home", jobs: [] });
  });

  test("drafts, closed jobs and passed jobs do not appear", async () => {
    const t = setupBackend();
    const { employer } = await approvedEmployer(t, "sindbad", 500);
    const draft = await employer.mutation(api.jobs.create, { ...JOB, title: "Draft job" });
    const closed = await employer.mutation(api.jobs.create, { ...JOB, title: "Closed job" });
    const passed = await employer.mutation(api.jobs.create, { ...JOB, title: "Passed job" });
    const open = await employer.mutation(api.jobs.create, { ...JOB, title: "Open job" });
    for (const jobId of [closed, passed, open]) await employer.mutation(api.jobs.publish, { jobId });
    await employer.mutation(api.jobs.close, { jobId: closed });

    const candidate = await person(t, "amine", "candidate");
    await candidate.mutation(api.users.setHome, { home: HAMMAMET, radiusM: 5_000 });
    await candidate.mutation(api.swipes.record, { jobId: passed, direction: "left" });

    const titles = (await candidate.query(api.jobs.feed, {})).jobs.map((job) => job.title);
    expect(titles).toEqual(["Open job"]);
    expect(titles).not.toContain("Draft job");
    void draft;
  });

  test("an expired job is skipped", async () => {
    const t = setupBackend();
    const { employer } = await approvedEmployer(t, "sindbad", 500);
    const jobId = await employer.mutation(api.jobs.create, JOB);
    await employer.mutation(api.jobs.publish, { jobId });
    await t.run((ctx) => ctx.db.patch(jobId, { expiresAt: Date.now() - 1 }));

    const candidate = await person(t, "amine", "candidate");
    await candidate.mutation(api.users.setHome, { home: HAMMAMET, radiusM: 5_000 });
    expect((await candidate.query(api.jobs.feed, {})).jobs).toHaveLength(0);
  });
});

describe("rules", () => {
  test("a company cannot publish before it is approved", async () => {
    const t = setupBackend();
    const employer = await person(t, "sindbad", "employer");
    await employer.mutation(api.companies.create, {
      name: "Hotel Sindbad",
      category: "hospitality",
      address: "Hammamet",
      kind: "individual",
      location: HAMMAMET,
    });
    const jobId = await employer.mutation(api.jobs.create, JOB);
    await expect(employer.mutation(api.jobs.publish, { jobId })).rejects.toThrow();
  });

  test("jobs and companies must be in Tunisia", async () => {
    const t = setupBackend();
    const employer = await person(t, "abroad", "employer");
    await expect(
      employer.mutation(api.companies.create, {
        name: "Hotel Paris",
        category: "hospitality",
        address: "Paris",
        kind: "individual",
        location: PARIS,
      }),
    ).rejects.toThrow();

    const { employer: local } = await approvedEmployer(t, "local");
    await expect(local.mutation(api.jobs.create, { ...JOB, location: PARIS })).rejects.toThrow();
  });

  test("pay is mandatory and positive", async () => {
    const t = setupBackend();
    const { employer } = await approvedEmployer(t, "sindbad");
    await expect(employer.mutation(api.jobs.create, { ...JOB, payAmount: 0 })).rejects.toThrow();
  });

  test("the word filter rejects a post that asks candidates for money", async () => {
    const t = setupBackend();
    const { employer } = await approvedEmployer(t, "scam");
    await expect(
      employer.mutation(api.jobs.create, { ...JOB, description: "Frais d'inscription : 50 TND." }),
    ).rejects.toThrow();
  });

  test("a candidate cannot swipe twice on the same job", async () => {
    const t = setupBackend();
    const { employer } = await approvedEmployer(t, "sindbad", 500);
    const jobId = await employer.mutation(api.jobs.create, JOB);
    await employer.mutation(api.jobs.publish, { jobId });
    const candidate = await person(t, "amine", "candidate");
    await candidate.mutation(api.users.setHome, { home: HAMMAMET, radiusM: 5_000 });

    await candidate.mutation(api.swipes.record, { jobId, direction: "left" });
    await expect(candidate.mutation(api.swipes.record, { jobId, direction: "right" })).rejects.toThrow();
  });

  test("roles are enforced: candidates cannot post, employers cannot swipe", async () => {
    const t = setupBackend();
    const candidate = await person(t, "amine", "candidate");
    await expect(candidate.mutation(api.jobs.create, JOB)).rejects.toThrow();

    const { employer } = await approvedEmployer(t, "sindbad", 500);
    const jobId = await employer.mutation(api.jobs.create, JOB);
    await employer.mutation(api.jobs.publish, { jobId });
    await expect(employer.mutation(api.swipes.record, { jobId, direction: "right" })).rejects.toThrow();
    await expect(employer.query(api.jobs.feed, {})).rejects.toThrow();
  });

  test("an employer cannot touch another employer's job or applicants", async () => {
    const t = setupBackend();
    const { employer: owner } = await approvedEmployer(t, "owner", 500);
    const { employer: other } = await approvedEmployer(t, "other", 700);
    const jobId = await owner.mutation(api.jobs.create, JOB);
    await owner.mutation(api.jobs.publish, { jobId });

    const candidate = await person(t, "amine", "candidate");
    await candidate.mutation(api.users.setHome, { home: HAMMAMET, radiusM: 5_000 });
    await candidate.mutation(api.swipes.record, { jobId, direction: "right" });
    const [applicant] = await owner.query(api.swipes.forJob, { jobId });

    await expect(other.mutation(api.jobs.close, { jobId })).rejects.toThrow();
    await expect(other.query(api.swipes.forJob, { jobId })).rejects.toThrow();
    await expect(
      other.mutation(api.swipes.decide, { swipeId: applicant._id, accept: true }),
    ).rejects.toThrow();
  });

  test("only an admin can approve a company", async () => {
    const t = setupBackend();
    const employer = await person(t, "sindbad", "employer");
    const companyId = await employer.mutation(api.companies.create, {
      name: "Hotel Sindbad",
      category: "hospitality",
      address: "Hammamet",
      kind: "individual",
      location: HAMMAMET,
    });
    await expect(employer.mutation(api.companies.approve, { companyId })).rejects.toThrow();
  });
});

describe("business verification", () => {
  const BUSINESS = {
    name: "Hôtel Les Orangers",
    category: "hospitality",
    address: "Avenue des Nations Unies, Hammamet",
    location: HAMMAMET,
    kind: "business" as const,
  };

  test("a registered business must give a well-formed tax ID", async () => {
    const t = setupBackend();
    const employer = await person(t, "orangers", "employer");
    await expect(employer.mutation(api.companies.create, BUSINESS)).rejects.toThrow();
    await expect(
      employer.mutation(api.companies.create, { ...BUSINESS, taxId: "not a tax id" }),
    ).rejects.toThrow();

    await employer.mutation(api.companies.create, { ...BUSINESS, taxId: "120 h / p / m / 000" });
    const company = await employer.query(api.companies.mine, {});
    expect(company).toMatchObject({ kind: "business", taxId: "0000120H/P/M/000", approval: "pending" });
  });

  test("the same tax ID cannot be registered twice", async () => {
    const t = setupBackend();
    const first = await person(t, "first", "employer");
    const second = await person(t, "second", "employer");
    await first.mutation(api.companies.create, { ...BUSINESS, taxId: "1234567A/A/M/000" });
    await expect(
      second.mutation(api.companies.create, { ...BUSINESS, name: "Copy", taxId: "1234567a-a-m-000" }),
    ).rejects.toThrow();
  });

  test("a person hiring for themselves needs no tax ID, and any they send is ignored", async () => {
    const t = setupBackend();
    const employer = await person(t, "household", "employer");
    await employer.mutation(api.companies.create, { ...BUSINESS, kind: "individual", taxId: "1234567A" });
    const company = await employer.query(api.companies.mine, {});
    expect(company?.kind).toBe("individual");
    expect(company?.taxId).toBeUndefined();
  });

  test("candidates never receive a business's tax ID", async () => {
    const t = setupBackend();
    const employer = await person(t, "orangers", "employer");
    const companyId = await employer.mutation(api.companies.create, { ...BUSINESS, taxId: "1234567A/A/M/000" });
    await (await admin(t)).mutation(api.companies.approve, { companyId });
    const jobId = await employer.mutation(api.jobs.create, JOB);
    await employer.mutation(api.jobs.publish, { jobId });

    const candidate = await person(t, "amine", "candidate");
    await candidate.mutation(api.users.setHome, { home: HAMMAMET, radiusM: 5_000 });
    const feed = await candidate.query(api.jobs.feed, {});
    expect(feed.jobs).toHaveLength(1);
    expect(JSON.stringify(feed)).not.toContain("1234567A");
    await candidate.mutation(api.swipes.record, { jobId, direction: "right" });
    expect(JSON.stringify(await candidate.query(api.swipes.mine, {}))).not.toContain("1234567A");
  });

  test("the admin's pending list shows the tax ID to check", async () => {
    const t = setupBackend();
    const employer = await person(t, "orangers", "employer");
    await employer.mutation(api.companies.create, { ...BUSINESS, taxId: "1234567A/A/M/000" });
    const pending = await (await admin(t)).query(api.companies.pending, {});
    expect(pending).toHaveLength(1);
    expect(pending[0]).toMatchObject({ taxId: "1234567A/A/M/000", ownerName: "orangers" });
    await expect(employer.query(api.companies.pending, {})).rejects.toThrow();
  });
});

describe("privacy", () => {
  test("an employer never receives a candidate's location or exact distance", async () => {
    const t = setupBackend();
    const { employer } = await approvedEmployer(t, "sindbad", 2_345);
    const jobId = await employer.mutation(api.jobs.create, JOB);
    await employer.mutation(api.jobs.publish, { jobId });
    const candidate = await person(t, "amine", "candidate");
    await candidate.mutation(api.users.setHome, { home: HAMMAMET, radiusM: 5_000 });
    await candidate.mutation(api.swipes.record, { jobId, direction: "right" });

    const [applicant] = await employer.query(api.swipes.forJob, { jobId });
    const serialised = JSON.stringify(applicant);
    expect(Object.keys(applicant).sort()).toEqual(
      ["_id", "about", "appliedAt", "decision", "distanceBucket", "name", "photoUrl"].sort(),
    );
    expect(serialised).not.toContain("latitude");
    expect(serialised).not.toContain("distanceM");
    expect(serialised).not.toContain(String(HAMMAMET.latitude));
  });

  test("a left swipe is never shown to the employer", async () => {
    const t = setupBackend();
    const { employer } = await approvedEmployer(t, "sindbad", 500);
    const jobId = await employer.mutation(api.jobs.create, JOB);
    await employer.mutation(api.jobs.publish, { jobId });
    const candidate = await person(t, "amine", "candidate");
    await candidate.mutation(api.users.setHome, { home: HAMMAMET, radiusM: 5_000 });
    await candidate.mutation(api.swipes.record, { jobId, direction: "left" });

    expect(await employer.query(api.swipes.forJob, { jobId })).toEqual([]);
    expect((await employer.query(api.jobs.mine, {}))[0].applicantCount).toBe(0);
  });

  test("a rejected company's open jobs leave the feed", async () => {
    const t = setupBackend();
    const { employer, companyId } = await approvedEmployer(t, "sindbad", 500);
    const jobId = await employer.mutation(api.jobs.create, JOB);
    await employer.mutation(api.jobs.publish, { jobId });
    await (await admin(t)).mutation(api.companies.reject, { companyId, reason: "Not a real business" });

    const candidate = await person(t, "amine", "candidate");
    await candidate.mutation(api.users.setHome, { home: HAMMAMET, radiusM: 5_000 });
    expect((await candidate.query(api.jobs.feed, {})).jobs).toHaveLength(0);
  });
});
