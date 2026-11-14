import { mutation } from "./_generated/server";
import { requireConsentedUser } from "./lib/auth";

/**
 * A one-time address to send one image to. The upload is only kept if it is
 * then attached with `users.setPhoto` or `companies.addImage`, which check its
 * type and size.
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireConsentedUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});
