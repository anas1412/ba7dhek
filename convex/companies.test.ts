import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import { HAMMAMET, setupBackend, signedIn } from "./test.setup";

type Backend = ReturnType<typeof setupBackend>;

const northOf = (meters: number) => ({
  latitude: HAMMAMET.latitude + meters / 111_195,
  longitude: HAMMAMET.longitude,
});

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

const BUSINESS = {
  name: "Hôtel Les Orangers",
  category: "hospitality",
  address: "Avenue des Nations Unies, Hammamet",
  kind: "business" as const,
  taxId: "1234567A/A/M/000",
  location: northOf(0),
};

const JOB = {
  title: "Receptionist",
  description: "Front desk, evening shift.",
  category: "hospitality",
  contractType: "full_time" as const,
  payAmount: 900,
  payPeriod: "month" as const,
};

async function approvedBusiness(t: Backend) {
  const employer = await person(t, "owner", "employer");
  const companyId = await employer.mutation(api.companies.create, BUSINESS);
  const staff = await admin(t);
  await staff.mutation(api.companies.approve, { companyId });
  return { employer, companyId, staff };
}

describe("editing a business", () => {
  test("the address and category change without a new check", async () => {
    const t = setupBackend();
    const { employer } = await approvedBusiness(t);
    const result = await employer.mutation(api.companies.update, {
      ...BUSINESS,
      category: "retail",
      address: "Rue de la Médina, Hammamet",
    });
    expect(result.recheck).toBe(false);
    expect(await employer.query(api.companies.mine, {})).toMatchObject({
      approval: "approved",
      category: "retail",
      address: "Rue de la Médina, Hammamet",
    });
  });

  test("a new name or tax ID sends it back for a check", async () => {
    const t = setupBackend();
    const { employer, companyId, staff } = await approvedBusiness(t);
    expect((await employer.mutation(api.companies.update, { ...BUSINESS, name: "Hôtel Jasmin" })).recheck).toBe(true);
    expect((await employer.query(api.companies.mine, {}))?.approval).toBe("pending");

    await staff.mutation(api.companies.approve, { companyId });
    // The same matricule written differently is the same matricule.
    expect((await employer.mutation(api.companies.update, { ...BUSINESS, name: "Hôtel Jasmin", taxId: "1234567a-a-m-000" })).recheck).toBe(false);
    expect((await employer.mutation(api.companies.update, { ...BUSINESS, name: "Hôtel Jasmin", taxId: "7654321B/A/M/000" })).recheck).toBe(true);
  });

  test("a rejected business resubmits by saving", async () => {
    const t = setupBackend();
    const employer = await person(t, "owner", "employer");
    const companyId = await employer.mutation(api.companies.create, BUSINESS);
    await (await admin(t)).mutation(api.companies.reject, { companyId, reason: "Matricule illisible" });

    await employer.mutation(api.companies.update, BUSINESS);
    const company = await employer.query(api.companies.mine, {});
    expect(company?.approval).toBe("pending");
    expect(company?.rejectionReason).toBeUndefined();
  });

  test("keeps its own tax ID but cannot take another's", async () => {
    const t = setupBackend();
    const { employer } = await approvedBusiness(t);
    const other = await person(t, "other", "employer");
    await other.mutation(api.companies.create, { ...BUSINESS, name: "Other", taxId: "7654321B/A/M/000" });

    await expect(employer.mutation(api.companies.update, { ...BUSINESS, taxId: "7654321B/A/M/000" })).rejects.toThrow();
    await expect(employer.mutation(api.companies.update, { ...BUSINESS, taxId: "nonsense" })).rejects.toThrow();
    await employer.mutation(api.companies.update, BUSINESS);
  });

  test("jobs at the business move with it; jobs elsewhere stay", async () => {
    const t = setupBackend();
    const { employer } = await approvedBusiness(t);
    const atHome = await employer.mutation(api.jobs.create, JOB);
    const site = northOf(2_000);
    const away = await employer.mutation(api.jobs.create, { ...JOB, location: site });
    await employer.mutation(api.jobs.publish, { jobId: atHome });

    const moved = northOf(4_000);
    await employer.mutation(api.companies.update, { ...BUSINESS, location: moved });
    expect(await employer.query(api.jobs.detail, { jobId: atHome })).toMatchObject({ atBusiness: true, location: moved });
    expect(await employer.query(api.jobs.detail, { jobId: away })).toMatchObject({ atBusiness: false, location: site });

    // The open job is found from its new place, not its old one.
    const candidate = await person(t, "amine", "candidate");
    await candidate.mutation(api.users.setHome, { home: moved, radiusM: 1_000 });
    expect((await candidate.query(api.jobs.feed, {})).jobs.map((job) => job._id)).toEqual([atHome]);
  });

  test("a candidate cannot edit a business", async () => {
    const t = setupBackend();
    await approvedBusiness(t);
    const candidate = await person(t, "amine", "candidate");
    await expect(candidate.mutation(api.companies.update, BUSINESS)).rejects.toThrow();
  });
});
