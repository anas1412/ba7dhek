# Setup

How to run what exists, and the account steps that only the developer can do.

## What is built
Milestone 1, without the parts that need outside accounts.

| Part | State |
|---|---|
| Expo SDK 58 app, Expo Router, TypeScript | Scaffolded |
| Theme from the design tokens, light and dark, Readex Pro | Done |
| Arabic (Tunisian dialect), French, English; right-to-left switching | Done; the Arabic text needs a native read-through |
| Convex schema, both spatial indexes, push component | Deployed to the dev deployment |
| `users` functions: ensure, consent, role, language | Done, tested |
| Screens: welcome, consent, role, home placeholder, settings | Written; not yet run on a phone |
| Google sign-in through Clerk | Wired in code; needs the Clerk steps below |

**Not verified:** nothing has run on a device. The code typechecks, lints, passes its tests and bundles for Android, but no screen has been seen and sign-in has not been exercised. That is Spike 1.

## Commands
```bash
npm run check
```
Runs the locale check, the typecheck and the tests.

```bash
npm run lint
```

```bash
npx convex dev
```
Watches `convex/` and pushes changes to the dev deployment.

## Steps that need you

### 1. Clerk
1. Create a Clerk application (development instance).
2. Under sign-in options, enable Google only.
3. Activate the Convex integration and copy the Frontend API URL it shows.
4. Set it on the Convex deployment:
   ```bash
   npx convex env set CLERK_JWT_ISSUER_DOMAIN <the Frontend API URL>
   ```
5. Add the publishable key to `.env.local`:
   ```
   EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   ```

Once step 4 is done, `convex/auth.config.ts` can be added. It is left out until then because Convex refuses to deploy an auth config whose environment variable is unset.

### 2. Google sign-in
Follow Clerk's guide: https://clerk.com/docs/expo/guides/configure/auth-strategies/sign-in-with-google

In short: three OAuth client IDs in Google Cloud (Android, iOS, Web), the Android one with the signing key's SHA-1, then in `.env.local`:
```
EXPO_PUBLIC_CLERK_GOOGLE_WEB_CLIENT_ID=...
EXPO_PUBLIC_CLERK_GOOGLE_ANDROID_CLIENT_ID=...
EXPO_PUBLIC_CLERK_GOOGLE_IOS_CLIENT_ID=...
```
A development Clerk instance can use Clerk's shared Google credentials at first.

### 3. A development build
The app cannot run in Expo Go: native Google sign-in needs a development build.

```bash
npx eas-cli@latest login
```

```bash
npx eas-cli@latest build --profile development --platform android
```

`eas.json` does not exist yet; the first `eas build` offers to create it. Install the resulting APK on an Android phone, then:

```bash
npx expo start --dev-client
```

## What the first run should show
1. Welcome screen in the phone's language, with "Continue with Google".
2. After sign-in: the consent screen. "I agree" stays disabled until the 18-or-over box is ticked.
3. Role choice.
4. A placeholder home and a Settings tab.
5. In Settings, switching to Arabic warns that the app will reload, then comes back mirrored.

If the build has no Clerk key, it shows a "Setup is not finished" screen instead of crashing.

## Findings so far
- **Spike 2, partly answered.** In the test backend, the geospatial component's `nearest` returns results closest first and reports a distance for each. The rectangle query with a filter works for the fan-out. Not yet measured: speed on thousands of points on the real deployment.
- The push component's method for removing a token is `removeToken`, in version 0.4.2.
- Tests run the real geospatial component through `convex-test`, so geo logic is testable without the cloud.
