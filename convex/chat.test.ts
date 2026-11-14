import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { HAMMAMET, setupBackend, signedIn } from "./test.setup";

type Backend = ReturnType<typeof setupBackend>;

async function person(t: Backend, name: string, role: "candidate" | "employer") {
  const { as, id } = await signedIn(t, name);
  await as.mutation(api.users.ensure, { language: "fr" });
  await as.mutation(api.users.acceptConsent, { adult: true });
  await as.mutation(api.users.setRole, { role });
  return { as, id };
}

/** An approved employer with one live job, and a candidate whose application was accepted. */
async function conversation(t: Backend) {
  const { as: employer } = await person(t, "Sindbad", "employer");
  const companyId = await employer.mutation(api.companies.create, {
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

  const jobId = await employer.mutation(api.jobs.create, {
    title: "Receptionist",
    description: "",
    category: "hospitality",
    contractType: "full_time",
    payAmount: 900,
    payPeriod: "month",
  });
  await employer.mutation(api.jobs.publish, { jobId });

  const { as: candidate, id: candidateId } = await person(t, "Amine", "candidate");
  await candidate.mutation(api.users.setHome, { home: HAMMAMET, radiusM: 5_000 });
  const swipeId = await candidate.mutation(api.swipes.record, { jobId, direction: "right" });
  const matchId = (await employer.mutation(api.swipes.decide, { swipeId, accept: true })) as Id<"matches">;
  return { employer, candidate, candidateId, jobId, swipeId, matchId };
}

describe("a conversation", () => {
  test("accepting an applicant opens one, listed for both sides and linked from the application", async () => {
    const t = setupBackend();
    const { employer, candidate, jobId, matchId } = await conversation(t);

    const [forEmployer] = await employer.query(api.matches.mine, {});
    const [forCandidate] = await candidate.query(api.matches.mine, {});
    expect(forEmployer).toMatchObject({ _id: matchId, jobTitle: "Receptionist", unread: false });
    expect(forEmployer.other.name).toBe("Amine");
    // The candidate sees the business, not the person behind it, and has news.
    expect(forCandidate.other.name).toBe("Hotel Sindbad");
    expect(forCandidate.unread).toBe(true);
    expect(await candidate.query(api.matches.unreadCount, {})).toBe(1);

    expect((await candidate.query(api.swipes.mine, {}))[0].matchId).toBe(matchId);
    expect((await employer.query(api.swipes.forJob, { jobId }))[0].matchId).toBe(matchId);
  });

  test("messages go both ways, in order, and each side knows which are its own", async () => {
    const t = setupBackend();
    const { employer, candidate, matchId } = await conversation(t);

    await employer.mutation(api.messages.send, { matchId, body: "  Bonjour, vous pouvez passer demain ?  " });
    await candidate.mutation(api.messages.send, { matchId, body: "Oui, à 10h." });

    const seenByCandidate = await candidate.query(api.messages.list, { matchId });
    expect(seenByCandidate.map((m) => [m.body, m.mine])).toEqual([
      ["Bonjour, vous pouvez passer demain ?", false],
      ["Oui, à 10h.", true],
    ]);
    const seenByEmployer = await employer.query(api.messages.list, { matchId });
    expect(seenByEmployer.map((m) => m.mine)).toEqual([true, false]);

    const [listed] = await employer.query(api.matches.mine, {});
    expect(listed).toMatchObject({ lastMessagePreview: "Oui, à 10h.", lastFromMe: false, unread: true });
  });

  test("reading clears the unread mark until the other side writes again", async () => {
    const t = setupBackend();
    const { employer, candidate, matchId } = await conversation(t);

    await candidate.mutation(api.matches.markRead, { matchId });
    expect(await candidate.query(api.matches.unreadCount, {})).toBe(0);

    await employer.mutation(api.messages.send, { matchId, body: "Vous êtes disponible ?" });
    expect(await candidate.query(api.matches.unreadCount, {})).toBe(1);
    // A person's own message is never unread to them.
    expect(await employer.query(api.matches.unreadCount, {})).toBe(0);
  });

  test("nobody outside the conversation can read it, write in it, or learn that it exists", async () => {
    const t = setupBackend();
    const { matchId } = await conversation(t);
    const { as: stranger } = await person(t, "Leila", "candidate");
    const { as: otherEmployer } = await person(t, "Other", "employer");

    for (const outsider of [stranger, otherEmployer]) {
      await expect(outsider.query(api.messages.list, { matchId })).rejects.toThrow();
      await expect(outsider.query(api.matches.get, { matchId })).rejects.toThrow();
      await expect(outsider.mutation(api.messages.send, { matchId, body: "hello" })).rejects.toThrow();
      await expect(outsider.mutation(api.matches.block, { matchId })).rejects.toThrow();
      expect(await outsider.query(api.matches.mine, {})).toEqual([]);
    }
  });

  test("an empty message and an overlong one are refused", async () => {
    const t = setupBackend();
    const { employer, matchId } = await conversation(t);

    await expect(employer.mutation(api.messages.send, { matchId, body: "   " })).rejects.toThrow();
    await expect(employer.mutation(api.messages.send, { matchId, body: "a".repeat(1001) })).rejects.toThrow();
    expect(await employer.query(api.messages.list, { matchId })).toEqual([]);
  });

  test("a flood of messages from one person is stopped", async () => {
    const t = setupBackend();
    const { employer, candidate, matchId } = await conversation(t);

    for (let i = 0; i < 20; i++) await employer.mutation(api.messages.send, { matchId, body: `message ${i}` });
    await expect(employer.mutation(api.messages.send, { matchId, body: "one more" })).rejects.toThrow();
    // The other side is not held back by it.
    await candidate.mutation(api.messages.send, { matchId, body: "Stop." });
  });
});

describe("blocking and reporting", () => {
  test("a block stops messages from both sides and only the blocker can lift it", async () => {
    const t = setupBackend();
    const { employer, candidate, matchId } = await conversation(t);
    await employer.mutation(api.messages.send, { matchId, body: "Bonjour" });

    await candidate.mutation(api.matches.block, { matchId });
    await expect(employer.mutation(api.messages.send, { matchId, body: "Allo ?" })).rejects.toThrow();
    await expect(candidate.mutation(api.messages.send, { matchId, body: "Non." })).rejects.toThrow();

    expect(await candidate.query(api.matches.get, { matchId })).toMatchObject({ blocked: true, blockedByMe: true });
    expect(await employer.query(api.matches.get, { matchId })).toMatchObject({ blocked: true, blockedByMe: false });
    // What was written stays readable.
    expect(await employer.query(api.messages.list, { matchId })).toHaveLength(1);

    await expect(employer.mutation(api.matches.unblock, { matchId })).rejects.toThrow();
    await candidate.mutation(api.matches.unblock, { matchId });
    await employer.mutation(api.messages.send, { matchId, body: "Merci" });
  });

  test("a report is filed against the other person and blocks the conversation", async () => {
    const t = setupBackend();
    const { employer, candidate, candidateId, matchId } = await conversation(t);

    await employer.mutation(api.matches.report, { matchId, reason: "harassment", note: "Messages insultants" });

    const reports = await t.run((ctx) => ctx.db.query("reports").collect());
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({ targetType: "user", targetId: candidateId, reason: "harassment", status: "open" });
    expect(reports[0].note).toContain(matchId);
    await expect(candidate.mutation(api.messages.send, { matchId, body: "Pardon" })).rejects.toThrow();
  });
});
