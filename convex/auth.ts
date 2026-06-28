/**
 * Convex Auth setup.
 *
 * The Password provider covers email + password sign-in/sign-up (the baseline
 * that works with no external email service).
 *
 * Magic-link sign-in and password reset additionally require an email provider
 * (e.g. Resend). To enable them, add an Email provider here and set its API key
 * with `npx convex env set AUTH_RESEND_KEY <key>`. See CONVEX_MIGRATION_PLAN.md
 * §4. Until then, the client wrappers for magic-link / reset throw a clear,
 * descriptive error rather than failing silently.
 */
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password()],
});
