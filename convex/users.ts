/**
 * Current-user query. Replaces Supabase's `auth.getSession().user`.
 */
import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;
    return {
      id: user._id as string,
      email: (user.email as string | undefined) ?? null,
    };
  },
});
