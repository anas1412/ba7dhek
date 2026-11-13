# Auth

Clerk proves identity; Convex holds everything else. Sources for the verified points are in [verified-facts.md](../05-reference/verified-facts.md).

## Decision
- **Android:** Google sign-in only.
- **iOS:** Google sign-in, with Sign in with Apple beside it.
- No email, phone or password on either.

**Why iOS has two buttons.** Apple's guideline 4.8 says an app that uses a third-party login "must also offer as an equivalent option another login service" that limits data collection to name and email, lets users keep their email private, and does not track for advertising without consent (verified). None of the listed exemptions fits this app. Sign in with Apple is the option built for those three conditions. Shipping iOS with Google alone would be rejected.

Both buttons run through Clerk. Its free plan allows up to 3 social connections (verified).

## What is verified
- Clerk's Expo package is `@clerk/expo`.
- Session tokens are stored with `expo-secure-store`, passed to `<ClerkProvider>` as `tokenCache` from `@clerk/expo/token-cache`.
- Native Sign in with Google uses native modules, so it needs a development build and cannot run in Expo Go.
- Convex provides `ConvexProviderWithClerk` from `convex/react-clerk` and says it works with Clerk's Expo SDK.
- Convex setup: activate the Convex integration in the Clerk dashboard, then create `convex/auth.config.ts` with `domain: process.env.CLERK_JWT_ISSUER_DOMAIN` and `applicationID: "convex"`.
- In a Convex function, `ctx.auth.getUserIdentity()` returns the identity, or `null` when the caller is not signed in.
- On the client, `useConvexAuth()` is the hook to check sign-in state against Convex, rather than Clerk's own `useAuth()`.

## Google sign-in setup (verified against Clerk's guide)
1. In the Clerk dashboard, add Google as an SSO connection with custom credentials. Production instances must use your own credentials; development instances can use Clerk's shared ones.
2. In Google Cloud, create three OAuth client IDs: iOS, Android and Web. The Web one is required even for a native app, for Clerk's token verification.
3. The Android client needs the signing key's SHA-1 fingerprint.
4. In the Clerk dashboard under Native applications, register the Android package name with its SHA-256 fingerprint, and the iOS bundle ID.
5. Set `EXPO_PUBLIC_CLERK_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_CLERK_GOOGLE_IOS_CLIENT_ID` and `EXPO_PUBLIC_CLERK_GOOGLE_ANDROID_CLIENT_ID`.
6. Add `@clerk/expo` and `@clerk/expo-google-signin` to the config plugins; install `expo-crypto`.
7. Use `useSignInWithGoogle` from `@clerk/expo/google`.

**Fallback.** Clerk also has a browser-based flow, `useSSO`, which needs `expo-auth-session` and `expo-web-browser` (verified). It replaces the older `useOAuth`, which is deprecated. If the native button cannot be made to work, this is the second route.

## Sign in with Apple setup
- Needs an Apple Developer account: a Services ID, a private key, the Team ID and a Key ID (verified). So it depends on the paid membership, like everything else on iOS.
- Shown only on iOS.

## What is not verified
- Convex's Clerk page shows examples for React and Next.js only. The Expo wiring is inferred from them, so it is proven in the first spike.
- Whether creating Google OAuth clients needs a billing account on the Google Cloud project. Neither Google's nor Clerk's setup page mentions one.
- Whether a Clerk production instance needs a domain you own. Assume yes and register the domain early.

## Provider wiring
At the root layout, outermost first:

1. `ClerkProvider`, with the publishable key and the token cache.
2. `ConvexProviderWithClerk`, given the Convex client and Clerk's `useAuth`.
3. The i18n provider.
4. The router.

## Sign-in flow
1. Welcome screen: "Continue with Google". On iOS, "Continue with Apple" as well.
2. Clerk completes the flow and creates a session.
3. `ConvexProviderWithClerk` fetches a token and authenticates the Convex client.
4. The app calls the `users.ensure` mutation, which finds the user by `tokenIdentifier` or creates the row with name, photo and device language.
5. Routing then depends on the user row:
   - no `role` → role choice
   - `role` set, not onboarded → onboarding for that role
   - onboarded → home tabs

## Roles
- Stored on the Convex user row, not in Clerk. Clerk knows nothing about roles.
- Chosen once. Switching role is not supported in the MVP; a person who needs both uses two accounts.
- A user who chooses "hide my email" with Apple gets a relay address. The app never relies on the email for anything but display, so this changes nothing.
- Every function that is role-specific checks the role itself.

## Authorisation rules
One helper, `requireUser(ctx)`, loads the user row from the identity or throws. Every function starts with it. On top of that:

| Function area | Rule |
|---|---|
| Feed, swipes | Caller's role is candidate |
| Company and job writes | Caller owns the company |
| Applicants list, decisions | Caller owns the job's company |
| Match and messages | Caller is the match's candidate or employer |
| Company approval, report handling | Caller has `isAdmin` |

No function accepts a user id from the client to act on behalf of that user. The acting user always comes from the identity.

## Sign-out and deletion
- **Sign out:** Clerk sign-out, then remove this device's push token.
- **Delete account:** a Convex action removes the app data (see [data-model.md](data-model.md)), then deletes the Clerk user with Clerk's backend call `deleteUser(userId)`, which wraps `DELETE /v1/users/{user_id}` (verified). The Clerk secret key for that call lives in Convex environment variables.
- Both stores require deletion to be started inside the app, and Google also requires a public web page where deletion can be requested (verified). See [store-readiness.md](../04-launch/store-readiness.md).

## Environment variables
| Variable | Where | Purpose |
|---|---|---|
| Clerk publishable key | App, per build profile | Initialise Clerk |
| Convex deployment URL | App, per build profile | `EXPO_PUBLIC_CONVEX_URL` in the Convex quickstart |
| `CLERK_JWT_ISSUER_DOMAIN` | Convex deployment | Validate Clerk tokens |
| Clerk secret key | Convex deployment | Delete users server-side |

Development and production use separate Clerk instances and separate Convex deployments.
