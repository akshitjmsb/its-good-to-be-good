# Supabase Setup Guide (Local-Only)

This repository is configured for local Supabase development only.

## Prerequisites

1. Supabase CLI
2. Docker Desktop running
3. Node.js 18+

## Install Supabase CLI

### macOS

```bash
brew install supabase/tap/supabase
```

### Windows (Scoop)

```bash
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### Linux

```bash
brew install supabase/tap/supabase
```

Verify:

```bash
supabase --version
```

## Local Setup

Run the one-shot setup script:

```bash
npm run supabase:setup
```

Equivalent manual flow:

```bash
supabase start
supabase db push --local
supabase status --output json
```

`supabase status --output json` provides:

- `API_URL` (expected local default: `http://127.0.0.1:54321`)
- `PUBLISHABLE_KEY` (use as `VITE_SUPABASE_ANON_KEY`)

## Environment Variables

Create `.env.local` from `.env.example`:

```bash
cp .env.example .env.local
```

Set:

```bash
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<local publishable key from supabase status>
VITE_PERPLEXITY_API_KEY=<optional local key>
```

## Run the App

```bash
npm install
npm run dev
npm run verify
```

## Useful Commands

```bash
npm run supabase:start
npm run supabase:push
npm run supabase:stop
supabase db reset
supabase db push --local
supabase status --output json
```

## Local Data Model Notes

- Single local anonymous user: `00000000-0000-0000-0000-000000000000`
- `user_id` defaults are set to that value in local schema migrations
- RLS is aligned to the single-user local workflow

## Troubleshooting

### Supabase CLI not found

Install CLI and re-open terminal.

### Docker not running

Start Docker Desktop and retry `supabase start`.

### Migration fails

Run:

```bash
supabase db reset
```

Then retry:

```bash
npm run supabase:setup
```

## Security

- Never commit `.env.local`.
- Never commit API keys, tokens, or credentials.
