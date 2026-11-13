# Stack

Facts marked "verified" are listed with sources in [verified-facts.md](../05-reference/verified-facts.md). Package versions are deliberately not pinned here: check the current ones at setup.

## Summary
| Layer | Choice |
|---|---|
| App framework | React Native with Expo, TypeScript |
| Navigation | Expo Router |
| Backend | Convex |
| Geo queries | Convex geospatial component |
| Auth | Clerk: Google sign-in, plus Sign in with Apple on iOS |
| Push | Expo push notifications, through the Convex Expo push component |
| Location | `expo-location`, foreground only |
| Maps | MapLibre React Native with OpenFreeMap tiles |
| Swipe gestures | `react-native-gesture-handler` and `react-native-reanimated` |
| Languages | `expo-localization` with `i18next` and `react-i18next`, plus Intl polyfills |
| Payments | None. See [tunisia-constraints.md](../04-launch/tunisia-constraints.md) |
| Builds and releases | EAS Build, EAS Submit, EAS Update |

## App: Expo
- One codebase for Android and iOS.
- The latest release is Expo SDK 58 (15 October 2026), which ships React Native 0.88 (verified). Use whichever SDK `create-expo-app` installs on the day; it may still be SDK 57.
- EAS builds iOS in the cloud, so a Windows machine is enough for Android and for producing iOS builds. Installing an iOS build on a phone through EAS needs the paid Apple Developer account (verified).
- Development builds from day one, not Expo Go. Three things in this app cannot run in Expo Go (all verified): native Google sign-in through Clerk, remote push on Android (since SDK 53), and MapLibre.

## Backend: Convex
**Why Convex**
- Every query is a live subscription. Chat, applicant lists and match lists update without extra code.
- Backend functions are TypeScript, typed end to end with the app.
- No row-level security policies to write; access rules are ordinary code in each function.
- Built-in scheduler for the push fan-out.
- Official React Native quickstart built on `create-expo-app` (verified).

**What it costs**
- No native geospatial type. Radius queries go through a component that is labelled beta, version 0.2.1 (verified).
- The data model is proprietary. Leaving Convex means rewriting the backend.

**The alternative that was considered: Supabase**
Postgres with PostGIS would make the feed a single SQL query and keep the data portable. Convex was chosen because it is more practical for one developer: less wiring for realtime, and one language everywhere. The geo component covers what the MVP needs; see [geo-matching.md](geo-matching.md) for its limits.

## Auth: Clerk
- Convex documents Clerk integration and says it works with Clerk's Expo SDK (verified). It shows no Expo example, so the integration is the first spike.
- Clerk's Expo package is `@clerk/expo` (verified).
- Free Hobby plan: up to 50,000 monthly retained users and up to 3 social connections (verified).
- Convex Auth was ruled out: its stable v2 docs list only React web apps and Next.js, with no mention of React Native (verified).

Google sign-in on both platforms, by decision. On iOS a second option, Sign in with Apple, sits beside it, because Apple's guideline 4.8 does not allow Google as the only login (verified). Details in [auth.md](auth.md).

Email and phone codes can be added later. SMS codes need Clerk's paid plan, and only the US and Canada are enabled by default; whether Tunisian numbers are supported, and at what price, is not published (verified that it is not published).

## Push: Expo push with the Convex component
- The component stores tokens, batches sends, and retries failures with exponential backoff (verified).
- Its README carries no stability label (verified).

## Languages
- Arabic (Tunisian dialect), French and English from the first screen. Details in [i18n.md](i18n.md).
- Hermes, React Native's JavaScript engine, does not fully implement `Intl`. `Intl.RelativeTimeFormat` is unsupported and `Intl.PluralRules` is uncertain, and i18next needs `Intl.PluralRules` for Arabic's six plural forms (verified). The app ships the `@formatjs/intl-pluralrules` and `@formatjs/intl-relativetimeformat` polyfills.

## Maps
**Decision: MapLibre React Native with OpenFreeMap tiles, on both platforms.**

- `react-native-maps` on Android has to use Google Maps, which needs an API key from a Google Cloud billing account (verified).
- Google's billing documentation says prepaid cards are not accepted, and the Tunisian international tech card is prepaid (verified). That makes Google Maps a payment risk for no benefit.
- MapLibre React Native installs in Expo through a config plugin and needs a development build (verified).
- OpenFreeMap's public tiles are free with no key, no registration and no request limit, and allow commercial use with attribution. There is no service guarantee (verified).

**Consequences**
- No address search or autocomplete; those are paid Google services. Location is set by dropping a pin, and the address is typed as free text.
- The map shows an attribution line, as the tile licence requires.
- If OpenFreeMap becomes unreliable, the tile source is one URL to change. MapTiler's free tier is limited to 5,000 sessions a month and is described as for non-commercial use, and Stadia's free tier forbids commercial use (verified), so the realistic fallback is self-hosting tiles or a paid plan.

## Not in the stack
- No payment provider. The app is free for everyone in the MVP. If businesses are charged later, it will be through local Tunisian payment methods, chosen then.
- No Google Maps, Places or Geocoding.
- No separate API server.
- No state management library beyond Convex's own hooks; local UI state stays in components.
- No analytics SDK in the MVP. The counters that matter are computed in Convex.
