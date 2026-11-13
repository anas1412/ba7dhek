import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import { setupBackend, signedIn } from "./test.setup";

describe("users", () => {
  test("me is null when signed out, and ensure refuses", async () => {
    const t = setupBackend();
    expect(await t.query(api.users.me, {})).toBeNull();
    await expect(t.mutation(api.users.ensure, { language: "fr" })).rejects.toThrow();
  });

  test("ensure records the first language and stores no profile data", async () => {
    const t = setupBackend();
    const { as: alice, id } = await signedIn(t, "Alice");

    const first = await alice.mutation(api.users.ensure, { language: "ar" });
    const second = await alice.mutation(api.users.ensure, { language: "fr" });
    expect(first).toBe(id);
    expect(second).toBe(id);

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

  test("a banned user is refused", async () => {
    const t = setupBackend();
    const { as: alice, id } = await signedIn(t, "Alice");
    await t.run((ctx) => ctx.db.patch(id, { banned: true }));
    await expect(alice.mutation(api.users.ensure, { language: "fr" })).rejects.toThrow();
  });

  test("a role cannot be chosen before consent", async () => {
    const t = setupBackend();
    const { as: alice } = await signedIn(t, "Alice");
    await alice.mutation(api.users.ensure, { language: "en" });

    await expect(alice.mutation(api.users.setRole, { role: "candidate" })).rejects.toThrow();
  });

  test("consent requires the 18-or-over declaration", async () => {
    const t = setupBackend();
    const { as: alice } = await signedIn(t, "Alice");
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
    const { as: alice } = await signedIn(t, "Alice");
    await alice.mutation(api.users.ensure, { language: "en" });
    await alice.mutation(api.users.acceptConsent, { adult: true });

    await alice.mutation(api.users.setRole, { role: "employer" });
    await alice.mutation(api.users.setRole, { role: "employer" });
    await expect(alice.mutation(api.users.setRole, { role: "candidate" })).rejects.toThrow();
    expect((await alice.query(api.users.me, {}))?.role).toBe("employer");
  });

  test("one user never sees another's row, and me never returns the email", async () => {
    const t = setupBackend();
    const { as: alice } = await signedIn(t, "Alice");
    const { as: bob } = await signedIn(t, "Bob");

    const aliceMe = await alice.query(api.users.me, {});
    expect(aliceMe?.name).toBe("Alice");
    expect((await bob.query(api.users.me, {}))?.name).toBe("Bob");
    expect(JSON.stringify(aliceMe)).not.toContain("example.test");
  });

  test("setLanguage updates the stored language", async () => {
    const t = setupBackend();
    const { as: alice } = await signedIn(t, "Alice");
    await alice.mutation(api.users.ensure, { language: "en" });
    await alice.mutation(api.users.setLanguage, { language: "ar" });
    expect((await alice.query(api.users.me, {}))?.language).toBe("ar");
  });

  test("a starting point outside Tunisia is refused", async () => {
    const t = setupBackend();
    const { as: alice } = await signedIn(t, "Alice");
    await alice.mutation(api.users.ensure, { language: "en" });
    await alice.mutation(api.users.acceptConsent, { adult: true });
    await alice.mutation(api.users.setRole, { role: "candidate" });
    await expect(
      alice.mutation(api.users.setHome, {
        home: { latitude: 48.8566, longitude: 2.3522 },
        radiusM: 5_000,
      }),
    ).rejects.toThrow();
  });
});
