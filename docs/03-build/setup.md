# Setup

How to run what exists, and the steps that only the developer can do.

## What is built
| Part | State |
|---|---|
| Expo SDK 58 app, Expo Router, TypeScript | Scaffolded |
| Theme from the design tokens, light and dark, Readex Pro | Done |
| Arabic (standard), French, English; right-to-left switching | Done; the Arabic text was rewritten in standard Arabic on 2026-11-14 and needs one read-through by Anas |
| Convex schema, both spatial indexes, push component | Deployed to the dev deployment |
| Sign-in with Convex Auth and Google | Backend deployed and its routes verified; needs the Google steps below |
| `users` functions: ensure, consent, role, language, profile, starting point | Done, tested |
| Backend for Milestones 2 to 4: companies with manual approval, jobs (draft, publish, close), the nearby feed, swipes, applicants, accept and reject | Done, tested; no screens yet |
| Word filter, Tunisia-only locations, role and ownership checks | Done, tested |
| Screens: welcome, consent, role, settings | Written; seen in a browser, not yet on a phone |
| Job card and swipe stack, with apply and pass buttons | Built; swipe checked in a browser with simulated touches |
| Candidate: one-time setup (starting point, radius, description), job stack, applications | Built; checked in the browser preview with sample data |
| Employer: add a business, post a job, jobs list with publish and close, applicants with accept and reject | Built; checked in the browser preview with sample data |
| Preview page at `/preview` (development builds only) | Shows every piece above with sample data, in the three languages |
| Map to place a point by hand | Not built. Location comes from "Use my current location" only |
| Push fan-out, chat messages, reports, retention job, account deletion | Not started |

**A new development build is needed.** `expo-location`, `expo-image-picker` and `expo-image-manipulator` were added after the first EAS build, and they contain native code. On the old build, choosing a photo will also fail. Until the app is rebuilt, "Use my current location" will fail on the phone. In development builds, a "Use central Hammamet (testing only)" button sets a fixed point instead, so the rest can be tested on the old build.

**The browser preview.** Signed-in screens cannot be opened in a browser, because Google sign-in only returns to the phone app. The forms and lists are therefore split into display components, which the preview page renders with sample data and a pretend backend. What the preview does not prove: that each screen is wired to the right backend function. The backend functions themselves are covered by tests.

**Not verified:** nothing has run on a device. The code typechecks, lints, passes its tests and bundles for Android, and Expo's health check passes, but no screen has been seen and no sign-in has been completed. That is Spike 1.

## Commands
```bash
npm run check
```
Runs the locale check, the typecheck and the tests.

```bash
npm run lint
```

```bash
npm run backend
```
Watches `convex/` and pushes changes to the dev deployment.

## Seeing the app in a browser
```bash
npx expo start --web --port 8081
```

Then open `http://localhost:8081`. Google sign-in works there on the dev deployment, because that deployment has `DEV_WEB_ORIGIN` set to this address. Production does not, so there a sign-in can only finish in the phone app.

What the browser does not show: vibration, the phone's own screen transitions, push notifications, and the right-to-left reload.

## Steps that need you

### 1. A Google OAuth client
Sign-in cannot work until the backend has Google credentials.

1. In Google Cloud Console, create a project, then configure the OAuth consent screen.
2. Under Credentials, create an OAuth client ID of type **Web application**.
3. Add this authorised redirect URI, which is the dev deployment's callback:
   ```
   https://patient-mouse-884.convex.site/api/auth/callback/google
   ```
4. Set the client's ID and secret on the Convex deployment. Run each command and paste the value when asked, so it stays out of your shell history:
   ```bash
   npx convex env set AUTH_GOOGLE_ID
   ```
   ```bash
   npx convex env set AUTH_GOOGLE_SECRET
   ```

The type is "Web application" even though the app is native, because Google hands the result to the Convex backend, not to the phone.

### 2. A development build
The app cannot run in Expo Go: switching layout direction, push and maps all need a development build.

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
2. Tapping it opens Google in an in-app browser. After signing in, the browser closes.
3. The consent screen. "I agree" stays disabled until the 18-or-over box is ticked.
4. Role choice.
5. A placeholder home and a Settings tab.
6. In Settings, switching to Arabic warns that the app will reload, then comes back mirrored.

If the build has no Convex address, it shows a "Setup is not finished" screen instead of crashing.

## What is set on the deployments
| Variable | Purpose | Dev `patient-mouse-884` | Production `tame-goldfinch-711` |
|---|---|---|---|
| `JWT_PRIVATE_KEY` | Signs session tokens | Set | Set (its own key) |
| `JWKS` | The matching public key | Set | Set |
| `AUTH_GOOGLE_ID` | Google OAuth client ID | Set | Set |
| `AUTH_GOOGLE_SECRET` | Google OAuth client secret | Set | **Not set** |

Each deployment has its own signing key pair; the keys exist nowhere else.

**Checked on dev (2026-11-13):** starting a Google sign-in returns a redirect to `accounts.google.com` with the right client ID and the callback address above. The sign-in itself has not been completed.

**Production is not ready to use.** No functions have been deployed to it, its secret is missing, and its callback address is not registered with Google:

```
https://tame-goldfinch-711.convex.site/api/auth/callback/google
```

Its region has not been checked. The plan calls for Ireland ([data-protection.md](../04-launch/data-protection.md)); confirm the region in the Convex dashboard before any real data goes there.

## Approving a company during development
Company approval is an admin function. To make yourself an admin, open the `users` table in the Convex dashboard and set `isAdmin` to `true` on your own row. Then run `companies:approve` from the dashboard's function runner with the company's id.

## Findings so far
- **Spike 2, partly answered.** In the test backend, the geospatial component's `nearest` returns results closest first and reports a distance for each. The rectangle query with a filter works for the fan-out. Not yet measured: speed on thousands of points on the real deployment.
- The push component's method for removing a token is `removeToken`, in version 0.4.2.
- Tests run the real geospatial component through `convex-test`, so geo logic is testable without the cloud.
- **Convex Auth 2.0.0 does not support React Native yet**, by its own type definitions; the app uses 0.0.98. See [auth.md](../02-architecture/auth.md).
- Setting a JSON value with `npx convex env set NAME value` from Windows PowerShell strips its quotes. Use `--from-file`, or paste the value at the prompt.
