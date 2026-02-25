# Vercel CLI Guide (Current Project State)

This repository is currently configured as local-first and can be deployed to Vercel as a static frontend.

## Install and Login

```bash
npm i -g vercel
vercel login
```

## Link Project

```bash
vercel link
```

## Configure Environment Variables (if deploying)

```bash
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
vercel env add VITE_PERPLEXITY_API_KEY
```

Use local-only values when appropriate for your workflow. For production Supabase, use your target project URL/key.

## Deploy

```bash
vercel
vercel --prod
```

## Important

- No cron jobs are required.
- No content API routes are expected in this repository state.
- Do not rely on `/api/content`, `/api/archive`, `/api/run-cycle`, or `/api/manual-trigger`.

## Verify Config

```bash
vercel env ls
```

and locally:

```bash
npm run type-check
npm run build
```
