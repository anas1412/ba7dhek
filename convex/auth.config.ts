// Convex Auth issues the tokens itself, so the deployment trusts its own site URL.
export default {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL,
      applicationID: "convex",
    },
  ],
};
