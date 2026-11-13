# Geo matching

The feed and the push fan-out both rest on the Convex geospatial component. What it can and cannot do is verified against its README; sources are in [verified-facts.md](../05-reference/verified-facts.md).

## What the component offers
- Labelled beta, version 0.2.1. Its README says it is "missing some functionality, but what's there should work".
- Stores points under a string key, with optional filter keys and a numeric sort key.
- **`nearest`:** the points closest to a given point, with an optional `maxDistance` in metres, a `limit`, and filters.
- **`query` with a rectangle:** all points inside a bounding box, with cursor pagination.
- Filters: equality, membership in a set, and a range on the sort key.
- Tested by its authors to about 1,000,000 points.

## What it does not offer
- No documented radius (circle) shape. The radius comes from `nearest` with `maxDistance`.
- No documented pagination for `nearest`.
- No "not in this set" filter, so already-swiped jobs cannot be excluded inside the index.
- No triggers. Keeping the index in step with the tables is the application's job.
- The README does not say whether `nearest` returns results in distance order, nor what the upper bound on `limit` is. Both are checked in [spikes.md](../03-build/spikes.md).

## Two indexes
| Index | Key | Point | Filter keys | Sort key |
|---|---|---|---|---|
| `jobsGeo` | job id | job location | `category`, `contractType` | `publishedAt` |
| `candidatesGeo` | user id | home point | `notify` (`all`, `digest`, `off`) | none |

Only open jobs are in `jobsGeo`, so no status filter is needed.

## The feed
`jobs.feed`, a query.

1. Load the caller's `home` and `radiusM`. No home point: return an empty feed with a reason code.
2. Call `nearest` on `jobsGeo` with the home point, `maxDistance = radiusM`, `limit = 50`.
3. Load the caller's swipes and drop any job already swiped.
4. Load each remaining job and its company.
5. Return cards with the distance, sorted nearest first. Sort in the function; do not rely on the component's order until the spike confirms it.

**When the stack runs low.** `nearest` has no pagination, so the app refetches. Swiped jobs drop out in step 3, which exposes the next-nearest ones.

**The limit of this approach.** A candidate who has swiped on more than 50 jobs inside their radius sees an empty stack even if job 51 exists. Two fixes, in order of effort:
1. Raise the limit when the filtered result is short (50, then 100, then 200).
2. Switch the feed to the rectangle query, which paginates with a cursor, and compute distance in the function.

For a pilot in one district, the first fix is enough. Record it as a known limit.

**Ranking.** Distance only, and the same rule for everyone. Recency is shown on the card but does not reorder the stack. The app never ranks or scores candidates for employers; that is a legal position, explained in [tunisia-constraints.md](../04-launch/tunisia-constraints.md).

## The fan-out
`notify.fanOutNewJob`, scheduled by the publish mutation.

The problem is the reverse of the feed: given a job, find candidates whose own radius reaches it. Each candidate has a different radius.

1. Take the largest radius the app allows, `MAX_RADIUS_M`.
2. Build a bounding box around the job's location that contains a circle of that radius.
3. Run the rectangle query on `candidatesGeo` with the filter `notify = all`, page by page with the cursor.
4. For each candidate, compute the haversine distance from their home point to the job.
5. Keep those where `distance <= candidate.radiusM`.
6. Apply the daily cap and quiet hours from [notifications.md](../01-product/notifications.md).
7. Hand the kept candidates to the push component, each in their own language.
8. Store the count on the job as `notifiedCount`.

The rectangle query is used here, not `nearest`, because it is the one with documented pagination and the fan-out must reach everyone in range.

**Cost check.** The box is larger than the circle, and candidates with small radii are loaded then discarded. `MAX_RADIUS_M` is 30,000: the radius slider runs from 1 to 30 km, with 5 km as the default.

**Batching.** A Convex function can schedule at most 1,000 other functions, so the fan-out does not schedule one send per candidate. It collects recipients page by page and hands each page to the push component's batch call.

## Sync rules
Every write that moves a point updates the index in the same mutation.

| Event | Index change |
|---|---|
| Job published | insert into `jobsGeo` |
| Job closed or deleted | remove from `jobsGeo` |
| Job location edited while open | remove, then insert |
| Candidate sets or moves home point | remove if present, then insert into `candidatesGeo` |
| Candidate changes new-job notification setting | remove, then insert with the new `notify` key |
| Account deleted | remove from `candidatesGeo`; close and remove their jobs |

The README documents insert, get and remove, and no update call, so a change is a remove followed by an insert.

To keep this from being forgotten, no function writes to `jobs.status` or `users.home` directly. Both go through one helper each, which also updates the index.

## Distance shown to users
- **Candidate:** the real distance from their home point to the job, rounded: metres under 1 km, one decimal above.
- **Employer:** a bucket only, computed from the distance stored on the swipe. The employer never receives coordinates or an exact figure.

Distances are straight-line. Travel time is out of scope.

## Privacy consequence
`candidatesGeo` holds home points. No query exposes it to clients; only server functions read it.
