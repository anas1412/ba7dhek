# Roadmap

Six milestones after the [spikes](spikes.md). Each ends with a check that can be performed on a real phone. Durations are estimates for one person working part-time, not commitments.

**Android first.** Milestones 1 to 6 target Android. iOS is Milestone 7.

## Milestone 0: gates and spikes
Three things that can each stop the project, started in this order because the first two have waiting times.

**Legal**
- File the declaration of processing and the request for authorisation to transfer data abroad with the data protection authority. See [data-protection.md](../04-launch/data-protection.md).
- The declaration takes a month of silence to be accepted. The authorisation needs an explicit yes. The build proceeds meanwhile, on test data only.

**Payment and accounts**
- Obtain the international tech card and try to pay the Google Play registration fee. See [tunisia-constraints.md](../04-launch/tunisia-constraints.md).
- Register `ba7dhek.tn`.
- Check the name on Google Play and the App Store.

**Technical**
- The three spikes in [spikes.md](spikes.md).

**Done when:** the filing is lodged with a receipt, the Play account exists, the domain is registered, and all three spikes have a recorded result.

**If a gate fails:** a refused card means finding another payment route before going further. A refused transfer authorisation means re-planning the backend on Tunisian hosting. A failed spike has its fallback written in [spikes.md](spikes.md).

## Milestone 1: foundation
**Goal:** a signed-in user lands on the right empty home screen, in their language.

- Expo project with TypeScript and Expo Router, laid out as in [project-structure.md](project-structure.md).
- Design tokens from the design system in a theme file; light and dark.
- i18n set up with the three locale files and the key-parity check. Right-to-left working.
- Clerk and Convex providers; Google sign-in.
- `users.ensure`, role choice, role-based tab layout.
- The consent screen: privacy notice, terms, age declaration, stored consent record.
- EAS development build on Android.
- Settings screen with language switch and sign out.

**Done when:** a new Google account can sign in, accept the consent screen, pick a role, see the matching tab bar, switch between Arabic, French and English with the layout mirroring for Arabic, and sign out.

**Estimate:** 1 to 1.5 weeks.

## Milestone 2: employer side
**Goal:** an approved employer can publish a job.

- Company onboarding with a MapLibre pin picker and logo upload.
- The posting rules, shown before the first post.
- Admin approval mutation, run from the Convex dashboard.
- New job form with validation; pay is mandatory.
- My jobs list; close a job.
- Publish and close go through the helper that updates the geo index.

**Done when:** a job published from the phone appears in the `jobs` table as open and in the geo index, and closing it removes it from the index.

**Estimate:** 1 week.

## Milestone 3: candidate side
**Goal:** a candidate sees nearby jobs and swipes.

- Candidate onboarding: profile, home point by GPS or map pin, radius slider with live count.
- `jobs.feed`.
- The card stack with gestures and the two buttons. This screen gets the most polish time in the project.
- Job detail screen with map.
- `swipes.record`; Applications list.
- Empty state with "widen radius".

**Done when:** with seeded jobs, a candidate sees only jobs within their radius, nearest first; a swiped job never returns; changing the radius changes the stack.

**Estimate:** 1.5 to 2 weeks.

## Milestone 4: match and chat
**Goal:** the loop closes.

- Applicants list per job, with distance buckets.
- Accept and reject; match creation.
- Matches tab for both roles.
- Chat with live messages.
- Report and block.
- The word filter on posts and messages.
- Account deletion, and "Request my data".
- The retention job.

**Done when:** on two phones, a candidate applies, the employer sees them appear without refreshing, accepts, and both exchange messages. Blocking stops further messages. Deleting an account removes its data.

**Estimate:** 1.5 weeks.

## Milestone 5: push
**Goal:** the immediacy half of the product.

- Permission flow with the explanation screen.
- Token registration and removal.
- Fan-out on publish, with caps and quiet hours.
- Match, message and applicant pushes.
- Morning digest job.
- Tap routing.
- Notification settings.
- Server-side push strings in three languages.

**Done when:** publishing a job on one phone produces a push on another phone in range within 30 seconds, in that user's language, and tapping it opens the job. A phone out of range receives nothing.

**Estimate:** 1 week.

## Milestone 6: ship to testers
**Goal:** real people in the pilot area use it.

- Confirm the legal gate is cleared: declaration accepted, transfer authorised. No real user before this.
- Production Convex deployment in the Ireland region; production Clerk instance with its own Google credentials.
- Preview builds through EAS; internal track, then the closed track on Google Play.
- The closed test: at least 12 testers for 14 consecutive days, then apply for production access.
- Website at `ba7dhek.tn`: privacy notice, account deletion page, support address.
- Store listing in three languages.
- The checklist in [store-readiness.md](../04-launch/store-readiness.md).
- The manual test pass in [testing.md](testing.md).
- Seed the first employers; see [cold-start.md](../04-launch/cold-start.md).

**Done when:** testers who are not the developer have installed the app from a store testing track and completed the full loop.

**Estimate:** 1 week of work, plus at least 14 days of closed testing and Google's review, which are outside the developer's control.

## Milestone 7: iOS
**Goal:** the same app on the App Store. Starts only after the Android pilot shows the loop works.

- Enrol in the Apple Developer Program; this is where the question of enrolling from Tunisia is answered.
- Add Sign in with Apple beside Google, on iOS only. Apple requires it.
- iOS development build, tested on a physical iPhone.
- APNs credentials; push tested on the device.
- Right-to-left and all three languages checked on iOS.
- App privacy details, TestFlight, review.

**Done when:** the full loop runs between an iPhone and an Android phone.

**Estimate:** 1 to 2 weeks, plus review.

## Total
Roughly 7 to 9 weeks of part-time work for the Android MVP after Milestone 0, plus the waiting periods: a month for the legal filing, which runs in parallel with the build, and two weeks or more of closed testing at the end. This is an estimate built by adding the figures above; treat it as a planning aid.

## After the MVP
In rough priority order, none of it planned in detail:

1. iOS (Milestone 7).
2. Employer response-time badge.
3. Paid visibility for job posts, through local Tunisian payment methods. Advertising, never a fee per hire.
4. A second device per user for push.
5. Shift and one-day work.
6. Commute-time radius.

Not on the list, deliberately: any ranking or scoring of candidates. See [tunisia-constraints.md](../04-launch/tunisia-constraints.md).
