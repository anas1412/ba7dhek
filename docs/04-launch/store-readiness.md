# Store readiness

The checklist for submission. The store rules below were read on Apple's and Google's own pages on 2026-11-13; sources are in [verified-facts.md](../05-reference/verified-facts.md). Policies change, so re-read the linked pages before submitting.

**Order: Google Play first, App Store later.** See [decisions.md](../00-overview/decisions.md).

## Required by both stores

### Account deletion
- Apple: "If your app supports account creation, you must also offer account deletion within the app." Deactivation alone is not enough.
- Google: an in-app path to delete the account and its data, **and** a web link where users can request deletion.

- [ ] Delete account in Settings (Milestone 4).
- [ ] A page at `ba7dhek.tn/delete-account` explaining how to delete in the app, with the support address for people who no longer have it installed.
- [ ] If any data is kept after deletion, the page says what and for how long. See the retention table in [data-protection.md](data-protection.md).

### User-generated content
Job posts, profiles and chat are user-generated content.

- Apple requires: a method for filtering objectionable material, a mechanism to report offensive content with timely responses, the ability to block abusive users, and published contact information.
- Google requires: users accept terms before creating content, the terms define and prohibit objectionable content, an in-app system for reporting and blocking, and moderation that is ongoing.

- [ ] Terms of use accepted before the first post or message. The same screen as the consent step.
- [ ] Report on jobs, companies and users (Milestone 4).
- [ ] Block in chat (Milestone 4).
- [ ] **Filtering:** every company is approved by hand before its first job goes live, and a word filter rejects job posts and messages containing listed terms. See [trust-safety.md](trust-safety.md).
- [ ] Support email address in the app and on the listing.
- [ ] A stated response time for reports: within 24 hours during the pilot.

### Privacy disclosures
Both are mandatory: Google's Data safety form, and Apple's app privacy details.

- [ ] Privacy notice published at `ba7dhek.tn/privacy`, in French, Arabic and English. Google requires the link to complete the form.
- [ ] One list of collected data, used for both forms, taken from [privacy.md](privacy.md):
  - Location: collected, linked to the user, for app functionality.
  - Name, email, photo: collected through sign-in.
  - User content: messages, job posts.
  - Identifiers: push token.

### Location
- Apple 5.1.5: use location "only when it is directly relevant to the features and services provided by the app", with consent and an explanation.
- [ ] Foreground permission only. No background location.
- [ ] The explanation is shown before the system prompt, in three languages.

### Listing
- [ ] Name confirmed free on the store.
- [ ] Short and full descriptions in Arabic, French and English.
- [ ] Screenshots in each language, right-to-left for Arabic.
- [ ] Icon and feature graphic from the design system.
- [ ] Category.

### A way for reviewers to test
Sign-in needs a Google account, and the feed is empty outside the pilot area.

- [ ] A test Google account for reviewers, with credentials in the review notes.
- [ ] That account is a candidate whose home point sits among seeded demo jobs, so the stack is not empty wherever the reviewer is.
- [ ] A second test account for the employer side, with a pre-approved demo company.
- [ ] Demo jobs are flagged so real candidates never see them.

## Google Play
- [ ] Developer account registered: 25 USD, one time. Tunisia is a supported country for registration.
- [ ] **Closed test: at least 12 testers opted in for 14 consecutive days**, then apply for production access. Applies to personal accounts created after 13 November 2023.
- [ ] Data safety form.
- [ ] Content rating questionnaire.
- [ ] Target audience set to 18 and over.
- [ ] Location permission declaration: foreground only.
- [ ] Web link for account deletion entered in the console.
- [ ] Upload through EAS Submit to the internal track, then the closed track.

No rule specific to job or employment apps was found in the consolidated policy page. That was a keyword search, not a reading of every help article.

**Timeline consequence.** The closed test adds at least two weeks between the first tester build and a public release, plus Google's review of the production application. Start it as soon as Milestone 4 is usable.

A personal account displays the developer's legal name and country on the store listing.

## App Store (later)
- [ ] Apple Developer Program: 99 USD a year. Whether an individual in Tunisia can enrol is not confirmed; attempt it when iOS work starts.
- [ ] **Sign in with Apple beside Google.** Guideline 4.8 requires a second login option that limits data to name and email, lets users hide their email, and does not track for advertising. Google alone will be rejected.
- [ ] App privacy details.
- [ ] Purpose strings for location and notifications, in three languages.
- [ ] Account deletion in the app (same feature).
- [ ] TestFlight through EAS Submit.
- [ ] Review notes with the test accounts, and a line that the app serves Tunisia.

Apple's guideline 1.2 also says apps used primarily for random or anonymous chat do not belong on the store. This app's chat opens only after an employer accepts a named applicant, so it does not fall under that.

## Legal gate
None of the above matters until this is done.

- [ ] Declaration filed with the data protection authority, and one month passed without objection.
- [ ] Authorisation for transfer abroad granted.

See [data-protection.md](data-protection.md).

## Before pressing submit
- [ ] The manual pass in [testing.md](../03-build/testing.md) completed on a release build.
- [ ] Production Convex deployment holds no test data except the flagged demo jobs.
- [ ] Production Clerk instance uses its own Google OAuth credentials; Clerk requires custom credentials in production.
- [ ] Push works on the release build.
- [ ] Every screen checked in Arabic.

## After approval
- Staged rollout on Play; only the pilot area invited.
- Watch crash reports and the signals in [cold-start.md](cold-start.md) daily for two weeks.
