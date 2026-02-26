# Deployment Guide

This project currently uses a local-first runtime:
- Local Supabase for persistence
- Browser-side Perplexity calls (optional key)
- No server API routes for content generation
- No scheduled cron jobs

## Recommended Development Flow

1. Install dependencies:
```bash
npm install
```

2. Start local Supabase and apply migrations:
```bash
npm run supabase:setup
```

3. Configure env:
```bash
cp .env.example .env.local
```

Use:
- `VITE_SUPABASE_URL=http://127.0.0.1:54321`
- `VITE_SUPABASE_ANON_KEY=<local publishable key from supabase status>`
- `VITE_PERPLEXITY_API_KEY=<optional local key>`

4. Run app:
```bash
npm run dev
```

## Optional Static Vercel Deployment

If you deploy to Vercel, treat it as static frontend hosting for this repository state.

- Build command: `npm run build`
- Output directory: `dist`
- Do not configure cron jobs
- Do not rely on `/api/content`, `/api/archive`, `/api/run-cycle`, or `/api/manual-trigger`

## Validation

```bash
npm run type-check
npm run build
node test-content-generation.js
```

## Security

- Never commit `.env.local`.
- Never commit API keys/tokens.
- Rotate keys immediately if exposed.
