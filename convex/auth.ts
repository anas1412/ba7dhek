import Google from "@auth/core/providers/google";
import { convexAuth } from "@convex-dev/auth/server";
import { isAllowedRedirect } from "./lib/redirect";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  // Google reads AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET from the deployment's
  // environment variables. See docs/03-build/setup.md.
  providers: [Google],
  callbacks: {
    /**
     * Only the app itself may receive the sign-in result. Convex Auth runs this
     * when Google hands the person back, so a sign-in can be started with any
     * address but can only finish at an allowed one.
     */
    async redirect({ redirectTo }) {
      if (isAllowedRedirect(redirectTo, process.env.DEV_WEB_ORIGIN)) return redirectTo;
      throw new Error("Invalid redirectTo");
    },
  },
});
