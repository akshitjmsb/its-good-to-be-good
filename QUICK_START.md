# Quick Start

```bash
npm install
npx convex dev        # provisions the backend; writes VITE_CONVEX_URL to .env.local
npm run dev           # http://localhost:5173
```

Sign up with email + password on the login gate (magic links need
`AUTH_RESEND_KEY` set on the Convex deployment — see `.env.example`).

## Everyday commands

```bash
npm run verify              # type-check + lint + tests + architecture guard + build
npm run new:module <id>     # scaffold a new square tool
npm run convex:codegen      # regenerate Convex types after editing convex/*
```

Deploys: pushes to `prod` build on Vercel (`npm run vercel:deploy` for a
manual production deploy).
