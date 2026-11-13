// Convex component clients refuse to load outside the Convex runtime: they look
// for a global named `Convex`. Tests that import those clients directly need it
// to exist before the import runs. convex-test supplies the real behaviour.
const scope = globalThis as { Convex?: Record<string, unknown> };
scope.Convex ??= {};
