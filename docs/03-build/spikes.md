# Spikes

Three short proofs to run before building the app. Each one tests an assumption the plan depends on and the documentation does not settle. If one fails, the plan changes before any real code exists.

Spike code is thrown away. Keep only the findings, written back into this file.

## Spike 1: Google sign-in through Clerk into Convex, on a development build

**Why:** Convex says its Clerk provider works with the Expo SDK but shows no Expo example. Native Google sign-in needs a development build.

**Steps**
1. Create an Expo app and a Convex dev deployment.
2. Create a Clerk development instance; enable Google as the only sign-in method; activate the Convex integration.
3. Add `convex/auth.config.ts`.
4. Wire `ClerkProvider` and `ConvexProviderWithClerk` at the root.
5. Build a development client with EAS for Android and install it on a phone.
6. Add one button that signs in with Google, and one Convex query that returns `ctx.auth.getUserIdentity()`.

**Pass**
- After signing in, the query returns an identity with a stable `tokenIdentifier`, a name and a picture URL.
- Closing and reopening the app keeps the session.
- Signing out makes the query return `null`.

**Fail, and what then**
- If the native Google button cannot be made to work: fall back to Clerk's browser-based OAuth flow, which the docs say works without native modules.
- If Clerk and Convex cannot be joined in Expo at all: reconsider Convex Auth v1, which lists React Native, or return to Supabase.

**Also record**
- Which Google Cloud OAuth client IDs were needed, and for which build types.
- The environment variable names that worked.

## Spike 2: the feed query on seeded data

**Why:** the geospatial component is beta, and the README leaves three things unstated: result order, the upper bound on `limit`, and speed with a post-filter.

**Steps**
1. Install the geospatial component in the Convex dev deployment.
2. Seed 5,000 fake open jobs scattered across one city-sized area, and 200 swipes for one test candidate.
3. Write the `jobs.feed` query as described in [geo-matching.md](../02-architecture/geo-matching.md).
4. Run it for home points in dense and sparse parts of the area, with radii of 1, 5 and 20 km.

**Pass**
- Results are within the radius, to the metre.
- The query returns in well under a second from the phone. The exact threshold is a judgement call; note the measured times.
- Raising `limit` to 200 works.

**Record**
- Whether `nearest` returns results in distance order.
- The largest `limit` that worked.
- Function execution time and documents read, from the Convex dashboard.

**Fail, and what then**
- If `nearest` is too slow or too limited: build the feed on the rectangle query with cursor pagination and compute distances in the function.

## Spike 3: fan-out and a real push

**Why:** the push component's send call and its behaviour with a few hundred recipients are not known from its README summary.

**Steps**
1. Install the Expo push component.
2. Register the test phone's token.
3. Seed 500 fake candidates with home points and radii; give a handful of them the real token.
4. Publish a job and run `notify.fanOutNewJob`.

**Pass**
- The phone receives the push within 30 seconds of publishing.
- The fan-out selects exactly the candidates whose radius covers the job; check against a brute-force calculation over all 500.
- Tapping the push opens the app with the job id available.

**Record**
- The send call's real name and arguments.
- Whether a user can hold more than one token.
- What the component does with the fake candidates that have no token.

## Order and effort
Run them in this order; each builds on the project the previous one left. As an estimate, not a measurement: about a day each, more for Spike 1 if Google Cloud configuration fights back.

## Findings
Fill in after each spike.

| Spike | Date | Result | Notes |
|---|---|---|---|
| 1. Auth | | | |
| 2. Feed | | | |
| 3. Push | | | |
