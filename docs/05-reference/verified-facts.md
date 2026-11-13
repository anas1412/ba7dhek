# Verified facts

Every external claim in these documents that was checked, with where and when. Anything not listed here is marked "unverified" where it appears.

**Checked on:** 2026-11-13. These are facts about third-party products and will go stale. Re-check before relying on one.

## Convex geospatial component
Source: https://github.com/get-convex/geospatial (README and CHANGELOG)

- Labelled beta. README: "This component is currently in beta. It's missing some functionality, but what's there should work."
- Latest version in the CHANGELOG: 0.2.1, which added filter support to nearest-point queries.
- `nearest(ctx, { point, limit, maxDistance, filter })`: closest points to a point, `maxDistance` optional and in metres.
- `query` with a rectangle shape, with a `limit` and cursor pagination through `nextCursor`.
- Filters: `eq`, `in`, and a sort-key range with an inclusive lower bound and exclusive upper bound.
- Sort is ascending on the sort key only.
- Points are stored with `insert(ctx, key, point, filterKeys, sortKey)`; `get` and `remove` exist. No update call is documented.
- Sync with application tables is manual; the example writes to both in the same mutation.
- "We've tested the example app up to about 1,000,000 points."

**Not stated in the README**
- Whether `nearest` results are ordered by distance.
- Pagination for `nearest`.
- An upper bound on `limit`.
- A radius or circle shape. The component's marketing page mentions circles and polygons; the README does not document them.
- Any release date.

## Convex Expo push component
Source: https://github.com/get-convex/expo-push-notifications (README)

- Package: `@convex-dev/expo-push-notifications`.
- "It will batch calls to Expo's API and handle retrying delivery."
- `recordToken(ctx, { userId, pushToken })`; pause and resume per user; status lookup per user.
- Batches run as work-pool jobs with a parallelism limit; failures retry with exponential backoff.
- Notification states: `awaiting_delivery`, `in_progress`, `delivered`, `failed`, `needs_retry`.
- Optional `EXPO_ACCESS_TOKEN`.

**Not stated:** a stability label, a version, use of Expo push receipts.

## Convex and React Native
Source: https://docs.convex.dev/quickstart/react-native

- An official React Native quickstart exists, built on `npx create-expo-app`, `npm install convex`, `npx convex dev`.
- The client is created with `process.env.EXPO_PUBLIC_CONVEX_URL`.
- The page does not mention Expo Go or development builds.

## Convex and Clerk
Source: https://docs.convex.dev/auth/clerk

- `ConvexProviderWithClerk` from `convex/react-clerk` "works with any of Clerk's React-based SDKs, such as the Next.js and Expo SDKs."
- Examples are for React (Vite), Next.js and TanStack Start. No Expo example.
- Setup: activate the Convex integration in the Clerk dashboard; `convex/auth.config.ts` with `domain: process.env.CLERK_JWT_ISSUER_DOMAIN` and `applicationID: "convex"`.
- `ctx.auth.getUserIdentity()` returns the identity or `null`.
- Use `useConvexAuth()` on the client to check auth state.

## Convex Auth
Sources: https://docs.convex.dev/auth/convex-auth and https://labs.convex.dev/auth

- v2 is described as "the current stable release". It lists support for "React SPAs and SSR apps built with Next.js" and does not mention React Native or one-time codes.
- v1 is labelled beta, lists React Native, and offers email links and codes. It receives security updates.

## Convex pricing
Source: https://www.convex.dev/pricing

- Free: 1M function calls, 0.5 GB database storage, 1 GB file storage, 1 GB data egress, 1 to 6 developers.
- Pay-as-you-go beyond that: 2.20 USD per additional 1M calls, 0.22 USD per additional GB of database storage.
- Professional: 25 USD per developer per month; 25M calls, 50 GB database storage included.

## Clerk and Expo
Source: https://clerk.com/docs/quickstarts/expo

- Package: `@clerk/expo`.
- Token storage: `expo-secure-store`, with `tokenCache` from `@clerk/expo/token-cache`.
- Hosted (browser) auth and custom flows work in Expo Go.
- Native Sign in with Google and Sign in with Apple "use native modules, so they require a development build and cannot run in Expo Go."
- Prebuilt native components exist in beta and require a development build.

## Clerk codes by email and SMS
Source: https://clerk.com/docs/custom-flows/email-sms-otp

- Email and phone codes are supported in custom flows; the guide applies to `@clerk/expo` v3 or higher. Its code samples are for Next.js.

## Clerk pricing
Source: https://clerk.com/pricing

- Hobby (free): 50,000 monthly retained users per app; email codes included; SMS codes not included; up to 3 social connections; fixed 7-day session.
- Pro: 25 USD per month (20 USD billed annually); SMS at 0.01 USD per message in the US and Canada, market rate internationally.

## Readex Pro typeface
Sources: https://github.com/ThomasJockin/readexpro and https://fontsource.org/fonts/readex-pro/about

- Covers Arabic and Latin script; an expansion of Lexend commissioned by Google Fonts.
- Available on Google Fonts as a variable font; named weights 200, 300, 400, 500, 600, 700.
- Subsets: arabic, latin, latin-ext, vietnamese.
- SIL Open Font License.

## Name search
Web searches, 2026-11-13.

- No app found under "ba7dhek" or "Bahdhek".
- "Khdemti" exists as a listed app: https://alternativeto.net/software/khdemti/about
- A web search is not a check of the app stores, domain registries or the trademark register. Those remain to be done.

## Local environment
Read from the development machine, 2026-11-13.

- Node 26.13.0, npm 11.20.0, git 2.56.0, GitHub CLI 2.103.3.
- Convex CLI 1.50.0; project `ba7dhek` on team `anas-b`, dev deployment `patient-mouse-884`.

---

The sections below were added in a second research pass on 2026-11-13. Quotes were relayed by a fetch tool that summarises pages; re-open the URL before copying a quote into a legal or store document.

## Apple App Store rules
Source: https://developer.apple.com/app-store/review/guidelines/

- **4.8 Login Services.** An app using a third-party login "must also offer as an equivalent option another login service" that limits data collection to name and email, lets users keep their email private, and does not collect app interactions for advertising without consent. The text does not name Sign in with Apple. Exemptions cover a company's own account system, education and enterprise accounts, government ID systems, and clients for a specific third-party service; none fits this app.
- **5.1.1(v).** "If your app supports account creation, you must also offer account deletion within the app." Deactivation alone is insufficient (https://developer.apple.com/support/offering-account-deletion-in-your-app/).
- **1.2 User-Generated Content.** Requires a method for filtering objectionable material, a mechanism to report offensive content with timely responses, the ability to block abusive users, and published contact information.
- **5.1.5.** Location only "when it is directly relevant to the features and services provided by the app".
- App privacy details are required to submit (https://developer.apple.com/app-store/app-privacy-details/).
- No rule specific to job or employment apps appears in the guidelines.
- Developer Program: 99 USD per membership year; individuals enrol with a credit card in their own name (https://developer.apple.com/programs/whats-included/). **Not confirmed:** that an individual in Tunisia can enrol. Apple publishes no country list and says enrolment "may not be supported in certain regions".

## Google Play rules
Source: Play Console Help, support.google.com/googleplay/android-developer

- **Account deletion** (answer/13327111): an in-app path to delete the account and data, and "a web link resource where users can request app account deletion".
- **User-generated content** (answer/9876937): users accept terms before creating content; "an in-app system for reporting and blocking"; moderation that is "robust, effective, and ongoing".
- **Closed testing** (answer/14151465): "a minimum of 12 testers who have been opted in continuously for at least 14 days", for "personal developer accounts created after November 13, 2023". The page never mentions organisation accounts; that they are exempt is stated only in a community guide.
- Organisation accounts need a D-U-N-S number (answer/13628312).
- Registration fee: "There is a US$25 one-time registration fee." (answer/6112435)
- Tunisia is listed as supported for developer registration and merchant registration, default currency USD (answer/9306917). **Not confirmed:** the page listing countries for distribution to users could not be read.
- The Data safety form is mandatory for published apps and needs a privacy policy link (answer/10787469).
- No sentence on employment or recruiting apps in the consolidated policy page; this was a keyword search only.

## Tunisian data protection law
Sources: Organic Law n° 2004-63, French text (https://www.ins.tn/sites/default/files/2020-04/Loi%2063-2004%20Fr.pdf); Decree n° 2007-3004 (https://legislation-securite.tn/wp-content/uploads/sites/5/2023/11/Decret-n°-2007-3004-du-27-Novembre-2007-Fr.pdf); DLA Piper summary updated 12 February 2026 (https://www.dlapiperdataprotection.com/index.html?t=law&c=TN)

- In force. A 132-article replacement draft was in parliamentary committee in 2025 and 2026 and still a draft in August 2026.
- Art. 2 and 6: applies to natural persons as controllers.
- Art. 7: prior declaration to the INPDP; no objection within one month means acceptance. Decree art. 3: an individual signs it personally. Decree art. 8: its contents.
- Art. 52: authorisation is mandatory for any transfer abroad. Decree art. 12: silence means refusal.
- Art. 51: the destination must offer adequate protection.
- Art. 22: controller, processor and agents must be Tunisian nationals resident in Tunisia.
- Art. 27: consent must be express and written. Art. 30: purpose-specific. Art. 47: no communication to third parties without express consent.
- Art. 31: the contents of the notice, including the destination country of transfers.
- Arts. 32 to 42: access, copy within a month, rectification, erasure, objection; art. 37 requires an electronic channel.
- Art. 28: a child's data needs the guardian's consent and the family judge's authorisation.
- Arts. 13 to 15: criminal-record data may not be processed; origin, religion, opinions, union membership and health need authorisation. Location is not listed.
- Art. 45: destruction at the end of the declared period.
- Penalties: art. 90 (1 year, 5,000 TND) for no declaration or unauthorised transfer; art. 87 (2 years, 10,000 TND) for consent, notice or minors; art. 94 (3 months, 1,000 TND) for security or destruction.

**Not confirmed:** any filing fee; an online filing portal; the INPDP's list of adequate countries; how art. 22 is applied to cloud providers; the definition of "child" as under 18 (from summaries of the Child Protection Code, not the text). The INPDP's websites could not be reached.

## Tunisian labour law
Source: Code du travail, 2010 consolidated edition (https://a-mla.org/sites/default/files/amla-import/Microsoft%20Word%20-%20Ctrav.doc_0.pdf)

- Art. 285: "Les bureaux de placement, privés, gratuits ou payants, sont supprimés."
- Art. 280: recruitment through public placement offices or directly.
- Art. 282: "Les annonces des offres et des demandes d'emploi par la voie des moyens d'information sont autorisées."
- Art. 53: minimum working age 16.
- Art. 5 bis: no discrimination between men and women.
- Law n° 2025-9 of 21 May 2025 bans labour subcontracting and makes the permanent contract the default (commentary: https://journals.openedition.org/rdctss/11124). The commentary does not mention job boards.

**Not confirmed:** where the line between advertising and placement falls for an app; amendments to these articles after 2010; mandatory content of job advertisements; whether an individual may publish a free app without a company.

## Paying from Tunisia
- The international tech card: prepaid; 1,000 TND a year for individuals, 10,000 TND for companies; permitted uses include application hosting, subscriptions to foreign sites, development tools and licences. Sources: ministry fact sheet (https://www.mtc.gov.tn/fileadmin/Investisseurs/Carte_technologique_Internationale_CTI_-version_francaise.pdf) and the procedure page updated 3 November 2026 (https://idaraty.tn/public/fr/procedures/obtenir-la-carte-technologique-internationale-la-poste-personne-physique).
- Google Cloud: "Prepaid cards aren't accepted for payment" (https://docs.cloud.google.com/billing/docs/how-to/payment-methods).
- Google Maps Platform needs a billing account (https://developers.google.com/maps/faq). The mobile Maps SDK is unlimited and free (https://developers.google.com/maps/billing-and-pricing/pricing).
- `.tn` domains: individuals may register per OVH Tunisia, at 9.746 TND the first year and 14.280 TND after (https://www.ovhcloud.com/fr-tn/domains/tld/tn/). Registrars: https://www.registre.tn/fr/

**Not confirmed:** that the card is accepted for the Google Play or Apple fees; that Google's refusal of prepaid cards applies to the Play registration fee (seen in a search snippet only); any report from a Tunisian developer; the current exchange rate.

## Tunisia market
- Mobile operating systems, October 2026: Android 83.19%, iOS 16.79% (https://gs.statcounter.com/os-market-share/mobile/tunisia).
- DataReportal Digital 2026: population 12.4 million; internet users 10.4 million (84.3%); Facebook 7.80 million, 63.1% of the population (https://datareportal.com/reports/digital-2026-tunisia).
- Social media referrals, October 2026: Facebook 85.07% (https://gs.statcounter.com/social-media-stats/all/tunisia).

## Maps
- `react-native-maps`: Android "has to use Google Maps, which in turn requires you to obtain an API key"; iOS Apple Maps works without a key (https://github.com/react-native-maps/react-native-maps/blob/master/docs/installation.md).
- MapLibre React Native installs in Expo through a config plugin and cannot be used with Expo Go (https://maplibre.org/maplibre-react-native/docs/setup/expo/).
- OpenFreeMap: free public instance, no key, no registration, no request limit, commercial use allowed, attribution required, no service guarantee (https://openfreemap.org/).
- MapTiler free: 5,000 sessions a month, described as for non-commercial use (https://www.maptiler.com/cloud/pricing/). Stadia free: commercial use not allowed (https://stadiamaps.com/pricing/).

## Expo
- SDK 58 released 15 October 2026 with React Native 0.88 (https://expo.dev/changelog/sdk-58).
- Remote push is unavailable in Expo Go on Android from SDK 53. iOS push can be tested on a device or on a simulator with Xcode 14 or later. A paid Apple account is required to generate push credentials (https://docs.expo.dev/push-notifications/push-notifications-setup/).
- "All builds that run on an iPhone device require a paid Apple Developer account for build signing"; a local build is the only way around it (https://docs.expo.dev/develop/development-builds/create-a-build/).
- Free plan: 15 Android and 15 iOS builds a month, 1,000 update users, no overage charges (https://expo.dev/pricing).
- Expo push: no cost; 600 notifications a second per project (https://docs.expo.dev/push-notifications/faq/).
- Firebase Cloud Messaging: no cost, no payment method on the free plan (https://firebase.google.com/pricing).

## Languages and right-to-left
- `I18nManager.forceRTL` "requires a full app restart to take effect" (https://reactnative.dev/docs/i18nmanager).
- Expo: right-to-left is on by default; configured through the `expo-localization` plugin; runtime switching is `allowRTL` and `forceRTL` followed by `Updates.reloadAsync()`; it does not work in Expo Go (https://docs.expo.dev/guides/localization/).
- Unicode locale data: `ar-TN` and `ar` default to Western digits; `ar-EG` to Arabic-Indic (cldr-json, `cldr-numbers-full`).
- Hermes `Intl`: `PluralRules` and `RelativeTimeFormat` are listed as planned (https://github.com/facebook/hermes/blob/main/doc/Features.md). Sources disagree on whether `PluralRules` has landed.
- i18next needs `Intl.PluralRules` for plural forms and has no fallback since version 24 (https://www.i18next.com/translation-function/plurals).
- Arabic has six plural categories: zero, one, two, few, many, other (Unicode CLDR).

## Clerk, second pass
- Native Google sign-in: three OAuth client IDs (iOS, Android, Web), SHA-1 for the Android client, SHA-256 in Clerk's native application entry, the `@clerk/expo-google-signin` package, `useSignInWithGoogle` (https://clerk.com/docs/expo/guides/configure/auth-strategies/sign-in-with-google).
- `useSSO` is the browser-based flow; `useOAuth` is deprecated (https://clerk.com/docs/expo/reference/native-hooks/use-sso).
- Production instances must use custom OAuth credentials (https://clerk.com/docs/guides/configure/auth-strategies/social-connections/google).
- Sign in with Apple needs an Apple Developer account (https://clerk.com/docs/guides/configure/auth-strategies/social-connections/apple).
- Backend `deleteUser(userId)` wraps `DELETE /v1/users/{user_id}` (https://clerk.com/docs/reference/backend/user/delete-user).
- Data is hosted in the United States only (https://clerk.com/security.md).
- SMS: paid plan only; only the US and Canada enabled by default. Tunisian support and price are not published.

## Convex, second pass
- Regions: US East (standard), Ireland, Sydney, Canada; non-US billed at 1.3 times the standard rate (https://docs.convex.dev/production/regions). EU regions are available on all plans including free (https://news.convex.dev/we-finally-got-our-eu-visa/). How the free allowance applies in the EU region is unclear from these two pages.
- `convex-test` runs under Vitest; it does not support cron jobs (https://docs.convex.dev/testing/convex-test).
- Cron jobs in `convex/crons.ts`; `ctx.scheduler.runAfter`; one function can schedule up to 1,000 others (https://docs.convex.dev/scheduling/scheduled-functions).
- File upload through `ctx.storage.generateUploadUrl()` (https://docs.convex.dev/file-storage/upload-files).
- Components are registered in `convex/convex.config.ts` with `app.use(...)`.
- Push component: `sendPushNotification(ctx, { userId, notification })`, `sendPushNotificationBatch`, `removePushNotificationToken`. Its source keeps one token per user; the README does not say so.

## Still NOT verified
Collected here so they are easy to find and check off.

| Claim | Where it appears |
|---|---|
| The tech card is accepted for the Google Play and Apple fees | tunisia-constraints, costs, open-questions |
| An individual in Tunisia can enrol in the Apple Developer Program | tunisia-constraints, store-readiness |
| INPDP filing fee, online portal, adequacy list, treatment of art. 22 | data-protection |
| Status of the draft data protection law after August 2026 | data-protection, open-questions |
| Where advertising ends and placement begins | tunisia-constraints, open-questions |
| Amendments to Code du travail arts. 280 to 285 after 2010 | tunisia-constraints |
| Free allowance in Convex's EU region | costs |
| Whether Convex's self-hosted version runs the components used here | data-protection |
| Whether Google OAuth clients need a billing-enabled project | auth, costs |
| Whether a Clerk production instance needs an owned domain | auth |
| Whether `convex-test` runs components | testing |
| `nearest` result order and `limit` ceiling in the geospatial component | geo-matching, spikes |
| `ba7dhek.tn` availability; the name on the stores; trademark | open-questions |
| That Google accounts are near-universal among Android users in Tunisia | tunisia-constraints |
| EAS profile, channel and runtime-version mechanics as described | eas |
