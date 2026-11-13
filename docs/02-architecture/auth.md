# Auth

Sign-in is handled by Convex Auth, a library that runs inside the app's own Convex backend. There is no separate identity service: accounts, sessions and tokens live in the same database as everything else.

**Decision (Anas, 2026-11-13):** Convex Auth, on the 0.x line. It replaced Clerk, which was the first choice.

## Why Convex Auth
- **No third party.** One service fewer holding personal data abroad. Clerk stores data in the United States only; Convex can be placed in Ireland. This simplifies the transfer authorisation in [data-protection.md](../04-launch/data-protection.md).
- **One system.** The user row that sign-in creates is the same row the app uses.
- **Proven by the developer** in an earlier project.

## Why the 0.x line and not 2.0
- Version 2.0.0 was published on 12 November 2026. Its own type definitions say of Google sign-in: "React Native isn't supported yet", and that the return address "can only be an http or https URL", not an app link.
- The 0.x line documents the React Native flow: its `signIn` returns a `redirect` URL "useful in RN for opening the in-app browser", and accepts the returned `code`.
- 0.x is no longer the recommended line and receives security fixes only. **Revisit when 2.x supports React Native.** The switch would touch `convex/auth.ts`, the provider and the welcome screen.

Installed: `@convex-dev/auth` 0.0.98 with `@auth/core` 0.41.3. These were read from the installed packages, not from documentation.

## Sign-in methods
- **Android:** Google only.
- **iOS:** Google, with Sign in with Apple beside it. Apple's guideline 4.8 says an app that uses a third-party login "must also offer as an equivalent option another login service" with specific privacy features; Google alone would be rejected. iOS is deferred, so the Apple button is not built yet. Convex Auth lists Apple among its supported providers.
- No email, phone or password.

## How Google sign-in works here
It is a browser-based flow, not Google's native sheet.

1. The welcome screen calls `signIn("google", { redirectTo })`, where `redirectTo` is the app's own link, `ba7dhek://`.
2. The backend answers with a `redirect` URL on Google.
3. The app opens that URL in an in-app browser with `openAuthSessionAsync` from `expo-web-browser`.
4. The person signs in. Google returns to the backend at `/api/auth/callback/google`, which redirects to `ba7dhek://?code=...`.
5. The in-app browser closes and hands that address to the app.
6. The app calls `signIn("google", { code })`, which exchanges the code for a session.

**The return address is checked on the server.** The `redirect` callback in `convex/auth.ts` accepts only addresses that start with `ba7dhek://` or `exp+ba7dhek://`, and refuses everything else, so a sign-in result cannot be sent to another app or site.

Session tokens are stored on the device with `expo-secure-store`, passed to `ConvexAuthProvider` as its `storage`.

## Files
| File | Role |
|---|---|
| `convex/auth.ts` | Configures Convex Auth with the Google provider and the return-address check |
| `convex/auth.config.ts` | Tells Convex to trust tokens issued by its own site URL |
| `convex/http.ts` | Adds the sign-in routes, including Google's callback |
| `convex/schema.ts` | Includes the auth tables, and a `users` table with the auth fields plus the app's own |
| `convex/lib/auth.ts` | `requireUser` and the role checks, built on `getAuthUserId` |
| `src/providers/AppProviders.tsx` | `ConvexAuthProvider` with secure storage |
| `src/app/(auth)/welcome.tsx` | The sign-in flow above |

## The users table
Convex Auth creates the user row at first sign-in, with `name`, `image` and `email` from Google. The app adds its own fields to the same row: language, consent, role, profile, starting point.

Everything the app adds is optional in the schema, because the row exists before any of it is known.

**The email is stored in Convex.** It is never returned to another user, and `users.me` does not return it either; the app has no use for it beyond sign-in.

## After sign-in
1. The app calls `users.ensure`, which records the app language the first time and marks the user as seen.
2. Routing depends on the user row:
   - no consent → consent screen
   - no role → role choice
   - otherwise → home

## Roles
- Stored on the user row. Chosen once; switching is not supported in the MVP.
- Every function that is role-specific checks the role itself.

## Authorisation rules
`requireUser(ctx)` loads the user row from the session or throws; it also refuses banned users. On top of it:

| Function area | Rule |
|---|---|
| Anything that writes profile data | Consent has been recorded |
| Feed, swipes | Caller's role is candidate |
| Company and job writes | Caller owns the company |
| Applicants list, decisions | Caller owns the job's company |
| Match and messages | Caller is the match's candidate or employer |
| Company approval, report handling | Caller has `isAdmin` |

No function accepts a user id from the client to act on behalf of that user. The acting user always comes from the session.

## Sign-out and deletion
- **Sign out:** `signOut()` from `useAuthActions` invalidates the session on the server and clears the stored tokens.
- **Delete account:** a Convex mutation removes the app data and the auth records (accounts, sessions, tokens) for that user. Not built yet; it belongs to Milestone 4. Because everything is in one database, there is no second service to call.
- Both stores require deletion to be started inside the app, and Google also requires a public web page where deletion can be requested (verified). See [store-readiness.md](../04-launch/store-readiness.md).

## Environment variables
All on the Convex deployment. None are in the repository.

| Variable | Purpose | State on the dev deployment |
|---|---|---|
| `JWT_PRIVATE_KEY` | Signs session tokens | Set |
| `JWKS` | The matching public key, served at `/.well-known/jwks.json` | Set, and verified to be served as valid JSON |
| `AUTH_GOOGLE_ID` | Google OAuth client ID | **Not set: needs a Google Cloud OAuth client** |
| `AUTH_GOOGLE_SECRET` | Google OAuth client secret | **Not set** |

The app itself needs only `EXPO_PUBLIC_CONVEX_URL`.

`SITE_URL`, which Convex Auth uses for web apps, is not needed: its own setup tool says "React Native projects don't require a SITE_URL".

## Google Cloud setup
One OAuth client of type "Web application", with this authorised redirect URI:

```
https://patient-mouse-884.convex.site/api/auth/callback/google
```

That is the dev deployment's site URL; production will have its own and needs its own entry. The steps are in [setup.md](../03-build/setup.md).

## What is not verified
- **The whole flow on a device.** The backend routes answer and the keys are served, but no sign-in has been completed, because the Google credentials are not set and there is no development build yet.
- Whether the private key stored on the deployment is well-formed. It was generated together with the public key that is served correctly; a wrong key would show as a failure at step 6.
- Whether Android returns from the in-app browser to the app cleanly with Expo Router also listening for links. If the router tries to open `ba7dhek://?code=...` as a page, the fix is a small route or a link filter.
- Whether creating a Google OAuth client needs billing enabled on the Google Cloud project.
