import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import { setupBackend } from "./test.setup";

const ALICE = { tokenIdentifier: "test|alice", name: "Alice", pictureUrl: "https://example.test/a.png" };

describe("users", () => {
  test("me is null when signed out, and ensure refuses", async () => {
    const t = setupBackend();
    expect(await t.query(api.users.me, {})).toBeNull();
    await expect(t.mutation(api.users.ensure, { language: "fr" })).rejects.toThrow();
  });

  test("ensure creates the row once and stores no profile data", async () => {
    const t = setupBackend();
    const alice = t.withIdentity(ALICE);

    const first = await alice.mutation(api.users.ensure, { language: "ar" });
    const second = await alice.mutation(api.users.ensure, { language: "fr" });
    expect(second).toBe(first);

    const me = await alice.query(api.users.me, {});
    expect(me).toMatchObject({
      name: "Alice",
      language: "ar",
      role: null,
      hasConsented: false,
      about: null,
      home: null,
    });
  });

  test("a role cannot be chosen before consent", async () => {
    const t = setupBackend();
    const alice = t.withIdentity(ALICE);
    await alice.mutation(api.users.ensure, { language: "en" });

    await expect(alice.mutation(api.users.setRole, { role: "candidate" })).rejects.toThrow();
  });

  test("consent requires the 18-or-over declaration", async () => {
    const t = setupBackend();
    const alice = t.withIdentity(ALICE);
    await alice.mutation(api.users.ensure, { language: "en" });

    await expect(alice.mutation(api.users.acceptConsent, { adult: false })).rejects.toThrow();
    expect((await alice.query(api.users.me, {}))?.hasConsented).toBe(false);

    await alice.mutation(api.users.acceptConsent, { adult: true });
    const me = await alice.query(api.users.me, {});
    expect(me?.hasConsented).toBe(true);
    expect(me?.needsNewConsent).toBe(false);
  });

  test("the role is chosen once and cannot be switched", async () => {
    const t = setupBackend();
    const alice = t.withIdentity(ALICE);
    await alice.mutation(api.users.ensure, { language: "en" });
    await alice.mutation(api.users.acceptConsent, { adult: true });

    await alice.mutation(api.users.setRole, { role: "employer" });
    await alice.mutation(api.users.setRole, { role: "employer" });
    await expect(alice.mutation(api.users.setRole, { role: "candidate" })).rejects.toThrow();
    expect((await alice.query(api.users.me, {}))?.role).toBe("employer");
  });

  test("one user never sees another's row", async () => {
    const t = setupBackend();
    const alice = t.withIdentity(ALICE);
    const bob = t.withIdentity({ tokenIdentifier: "test|bob", name: "Bob" });
    await alice.mutation(api.users.ensure, { language: "en" });
    await bob.mutation(api.users.ensure, { language: "fr" });

    expect((await alice.query(api.users.me, {}))?.name).toBe("Alice");
    expect((await bob.query(api.users.me, {}))?.name).toBe("Bob");
  });

  test("setLanguage updates the stored language", async () => {
    const t = setupBackend();
    const alice = t.withIdentity(ALICE);
    await alice.mutation(api.users.ensure, { language: "en" });
    await alice.mutation(api.users.setLanguage, { language: "ar" });
    expect((await alice.query(api.users.me, {}))?.language).toBe("ar");
  });
});
