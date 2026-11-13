# Testing

One developer, so the testing plan is small and aimed at the places where a bug would be invisible or expensive.

## Automated

### Convex functions
These carry the business rules and are worth unit tests. Convex's library is `convex-test`, a mock of the backend in JavaScript that runs under Vitest with the `edge-runtime` environment (verified). It does not run cron jobs and does not enforce size or time limits, so the digest job and the fan-out's scale are checked by hand. Whether it runs components such as the geospatial index is not confirmed; if it does not, the geo-dependent tests run against the dev deployment instead.

Priority order:
1. **Fan-out selection.** Given candidates at known points with known radii, exactly the right ones are selected. Compare against a brute-force calculation.
2. **Feed.** Only jobs within the radius; swiped jobs excluded; closed jobs excluded.
3. **Geo sync.** After publish, close, home-point change and account deletion, the index matches the tables.
4. **Authorisation.** Each function rejects a caller who does not own the resource. One test per rule in [auth.md](../02-architecture/auth.md).
5. **Caps and quiet hours.** The sixth new-job push of the day is not sent; a job published at night goes to the digest.
6. **Swipe uniqueness.** A second swipe on the same job is rejected.

### Pure functions
- Haversine distance, against known city-to-city distances.
- Distance bucketing at the boundaries.
- Distance, pay and relative-time formatters in all three languages.

### Locale parity
`scripts/check-locales.mjs` fails if `ar.json`, `fr.json` and `en.json` do not have identical keys. Run it before every build.

### Not automated in the MVP
End-to-end UI tests. The cost of maintaining them outweighs the benefit at this size.

## Manual pass before each tester build
Two phones, signed in as a candidate and an employer.

### The loop
1. Employer publishes a job near the candidate.
2. Candidate receives the push within 30 seconds.
3. Tapping it opens the job.
4. Candidate swipes right.
5. Employer sees the applicant appear without refreshing.
6. Employer accepts; candidate receives the match push.
7. Both exchange messages; each receives a push when outside the chat.

### Distance
- A job just inside the radius appears; one just outside does not.
- Moving the home point changes the stack.
- A candidate out of range receives no push.
- The employer sees a bucket, never a figure or a map position.

### Languages
Run the whole loop once in each language.
- Arabic: layout mirrored, directional icons flipped, no clipped text, digits as expected.
- French: no truncated labels.
- A push arrives in the recipient's language, not the sender's.
- A job written in Arabic displays correctly inside a French interface, and the reverse.

### Consent and age
- No profile data can be entered before the consent screen is accepted.
- Declining leaves the user signed in with nothing stored but the account, and offers deletion.
- The consent record exists in the database with the notice version and time.

### Permissions
- Location refused → the map picker works and onboarding completes.
- Push refused → the app works; Settings offers a way to turn it on.

### Edges
- Empty stack shows the widen-radius state.
- Company pending approval: job cannot go live; banner is shown.
- Closing a job removes it from another phone's stack.
- Airplane mode: the stack stays visible, swipes are disabled, and no swipe is lost when the connection returns.
- Kill the app, tap a push: lands on the right screen after sign-in loads.
- Block in chat: the other side can no longer send.
- Delete account: sign in again with the same Google account and confirm it starts from zero.

## Devices
- **Android:** one recent phone and one older, low-memory phone. Android has 83% of the Tunisian market (StatCounter, October 2026); that cheap devices are common among the target users is an assumption, and testing on one is cheap.
- **iOS:** not in the first wave. When it starts, one physical iPhone with the paid developer account.
- Small screen and large screen for the card layout.

## Dark mode
Every screen is checked in both themes on at least one device.

## Performance checks
- The card stack swipes without dropped frames on the older Android phone.
- The feed query time, read from the Convex dashboard, stays in the range recorded in Spike 2.

## Bug triage
Three levels only:
- **Blocks the loop:** fix before anything else.
- **Wrong but usable:** fix before the next tester build.
- **Cosmetic:** list it; fix in batches.
