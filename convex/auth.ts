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
 *
 * "Remember me" is the DEFAULT — there is no checkbox. Sessions are long-lived
 * so a user signs in once (e.g. on their phone) and stays signed in for months
 * unless they explicitly sign out. The short-lived (1h) JWT still auto-refreshes
 * against the stored refresh token (see src/domains/auth/session.ts), so the
 * 90-day window below is what actually keeps them logged in across app
 * restarts:
 *  - `totalDurationMs`    — hard cap; after this the user must re-authenticate
 *                           even if active. (Convex Auth default: 30 days.)
 *  - `inactiveDurationMs` — idle window; a session not refreshed within this
 *                           window expires. (Convex Auth default: 30 days.)
 */
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";

const NINETY_DAYS_MS = 1000 * 60 * 60 * 24 * 90;

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password()],
  session: {
    totalDurationMs: NINETY_DAYS_MS,
    inactiveDurationMs: NINETY_DAYS_MS,
  },
});
