# Spikes

Three short proofs to run before building the app. Each one tests an assumption the plan depends on and the documentation does not settle. If one fails, the plan changes before any real code exists.

Spike code is thrown away. Keep only the findings, written back into this file.

## Spike 1: Google sign-in through Convex Auth, on a development build

**Why:** the code is written from the installed package's types, and nothing has run on a device. The return from the in-app browser to the app is the part most likely to need adjusting.

**Steps**
1. Create an Expo app and a Convex dev deployment.
2. Create a Google OAuth client and set its ID and secret on the Convex deployment; see [setup.md](setup.md).
3. The backend files, the provider and the welcome screen are already in place.
4. Build a development client with EAS for Android and install it on a phone.
5. Tap "Continue with Google" and complete the sign-in.

**Pass**
- The in-app browser closes and the app moves on to the consent screen.
- A row appears in the `users` table with the name, photo and email from Google.
- Closing and reopening the app keeps the session.
- Signing out makes the query return `null`.

**Fail, and what then**
- If the app is not brought back from the browser: check the link scheme in `app.json`, then add a route or link filter so Expo Router ignores the return address.
- If Convex Auth 0.x cannot be made to work at all: Clerk is the documented alternative for Expo.

**Also record**
- Whether creating the Google OAuth client needed billing enabled on the project.
- Whether Expo Router reacted to the return address, and what was needed to stop it.

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
