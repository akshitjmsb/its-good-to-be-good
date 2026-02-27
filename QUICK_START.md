# Quick Start Guide

Get up and running with It's Good To Be King locally in a few minutes.

## 1. Install Supabase CLI

```bash
# macOS
brew install supabase/tap/supabase

# Windows (Scoop)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Verify
supabase --version
```

## 2. Install Dependencies

```bash
npm install
```

## 3. Start Local Supabase + Apply Migrations

```bash
npm run supabase:setup
```

This script:

- starts local Supabase
- applies migrations with `supabase db push --local`
- prints your local `API_URL` and `PUBLISHABLE_KEY`

## 4. Configure Local Environment

```bash
cp .env.example .env.local
```

Set the values in `.env.local`:

- `VITE_SUPABASE_URL=http://127.0.0.1:54321`
- `VITE_SUPABASE_ANON_KEY=<local publishable key from supabase status>`
- `VITE_PERPLEXITY_API_KEY=<optional local key>`

## 5. Start Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## 6. Run Full Quality Gates

```bash
npm run verify
```

## Notes

- The app uses a single local anonymous user ID: `00000000-0000-0000-0000-000000000000`.
- Content generation order is `Supabase cache -> Perplexity -> local fallback`.
- Never commit `.env.local` or real API keys/tokens.

For deeper setup details, see [SUPABASE_SETUP.md](./SUPABASE_SETUP.md).
