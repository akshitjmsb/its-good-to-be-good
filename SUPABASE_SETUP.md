# Supabase Setup Guide

This project runs against a **cloud Supabase free-tier project** by default.
A local Docker Supabase instance is still supported as an optional fallback.

## Cloud Project

- Organization: `myverse-free`
- Project: `night-divides-the-day` (pending rename to `its-good-to-be-king`)
- Region: `us-east-2`
- Ref: `rwhevivopepxuenevcme`
- URL: `https://rwhevivopepxuenevcme.supabase.co`
- Dashboard: https://supabase.com/dashboard/project/rwhevivopepxuenevcme

## Prerequisites

1. Supabase CLI (`brew install supabase/tap/supabase`)
2. Node.js 18+

Verify CLI:

```bash
supabase --version
```

## First-Time Setup

The repo is already linked to the cloud project (see `supabase/.temp/project-ref`).
From a fresh clone, re-link once:

```bash
supabase link --project-ref rwhevivopepxuenevcme
```

### Environment variables

All secrets live in `.env.local` (gitignored). Copy the template and fill in the values:

```bash
cp .env.example .env.local
```

Required:

| Var | Purpose | Where to get it |
|-----|---------|-----------------|
| `VITE_SUPABASE_URL` | Frontend REST URL | Dashboard -> Project Settings -> API Keys |
| `VITE_SUPABASE_ANON_KEY` | Frontend anon JWT (public-safe) | Dashboard -> Project Settings -> API Keys |
| `SUPABASE_DB_PASSWORD` | Postgres password, used by `supabase db push` and `migration list` | Dashboard -> Project Settings -> Database -> Reset password |
| `SUPABASE_ACCESS_TOKEN` | Management API PAT, used for rename/operations the CLI doesn't expose | Dashboard -> Account -> Access Tokens |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side RLS bypass (never expose to frontend) | Dashboard -> Project Settings -> API Keys |

The npm `supabase:*` scripts source `.env.local` automatically before invoking the CLI.

## Run the App

```bash
npm install
npm run dev
npm run verify
```

## Cloud Workflow

```bash
# Apply local migrations to the cloud DB
npm run supabase:push

# See which migrations are applied where
npm run supabase:migrations

# Generate types from the cloud schema
npm run supabase:types
```

Each of these sources `.env.local` first, so `SUPABASE_DB_PASSWORD` flows to the CLI
without having to export anything by hand.

## Local Fallback (optional, Docker required)

```bash
npm run supabase:start        # supabase start
npm run supabase:push:local   # supabase db push --local
npm run supabase:stop
```

And point `.env.local` at the local instance:

```bash
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<local publishable key from `supabase status`>
```

## Data Model Notes

- `user_id` defaults to the shared anonymous UUID `00000000-0000-0000-0000-000000000000`.
- Foreign keys to `auth.users` are intentionally removed; the app runs in single-anon mode.
- RLS policies are written for the anonymous workflow.

## Troubleshooting

### `Connect to your database by setting the env var: SUPABASE_DB_PASSWORD`

`SUPABASE_DB_PASSWORD` is missing or empty in `.env.local`. Reset it in the dashboard and paste.

### `Tenant or user not found` when using `psql` with the pooler URL

Use the pooler URL stored at `supabase/.temp/pooler-url` (it encodes the correct region).

### Migration fails with check constraint violation

The cloud DB has rows predating a new constraint. Clean them up (or extend the constraint) before re-running `supabase db push`.

## Security

- Never commit `.env.local`. It's gitignored — keep it that way.
- Rotate `SUPABASE_DB_PASSWORD` in the dashboard if it has ever appeared in logs/chat/git history.
- `VITE_SUPABASE_ANON_KEY` is safe to expose to browsers.
  `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_ACCESS_TOKEN` are **not** — server/CLI only.
