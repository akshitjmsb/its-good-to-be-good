/**
 * Convex Auth issuer config. `CONVEX_SITE_URL` is set automatically on the
 * deployment by `npx convex dev` / `npx convex deploy` — no manual value.
 */
export default {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL,
      applicationID: "convex",
    },
  ],
};
