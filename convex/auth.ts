import Google from "@auth/core/providers/google";
import { convexAuth } from "@convex-dev/auth/server";

// The app's own link scheme, from app.json. Google sign-in opens in an in-app
// browser and must hand its result back to the app through one of these.
const APP_SCHEMES = ["ba7dhek://", "exp+ba7dhek://"];

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  // Google reads AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET from the deployment's
  // environment variables. See docs/03-build/setup.md.
  providers: [Google],
  callbacks: {
    /** Only the app itself may receive the sign-in result. */
    async redirect({ redirectTo }) {
      if (APP_SCHEMES.some((scheme) => redirectTo.startsWith(scheme))) return redirectTo;
      throw new Error("Invalid redirectTo");
    },
  },
});
