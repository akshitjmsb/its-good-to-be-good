# Night Divides the Day

Personal dashboard application with task management, modal-based daily content, and a French translator module.

## Problem Statement

This project is a light, fun philosophical space you can step into from time to time to:

- reflect
- act
- learn
- enjoy

Long-term direction: build it in phases so any person can create their own version of this space.

## Glossary

- `Module`: a user-facing feature.
- `Tool`: an internal reusable capability that supports modules.
- `Journey Module`: route/page feature (`todo`, `quantum`, `meditate`, `money`, `health`, `travel`).
- `Learn Module`: Learn card feature (`world-order`, `tennis`, `coffee`, `guitar`, `poetry`, `french`, `food`, `analytics`, `curious`, `exercise`).

## Home Design Lock

The home page visual language is intentionally locked to:

- `Special Elite` typography
- vintage black-and-white minimal palette
- clean, low-noise card layout

Implementation lock points:

- [index.html](/Users/akshitgupta/Desktop/Repo/night-divides-the-day-development/index.html): `body.home-vintage-lock`
- [home-lock.css](/Users/akshitgupta/Desktop/Repo/night-divides-the-day-development/src/styles/home-lock.css): home-specific style tokens and guardrails

Do not change these unless there is an explicit product decision to change the home visual direction.

## Local-Only Setup (Supabase)

This repository is configured for local Supabase development.

1. Install dependencies:

```bash
npm install
```

2. Start local Supabase and apply migrations:

```bash
npm run supabase:setup
```

3. Create local env file:

```bash
cp .env.example .env.local
```

4. Set local Supabase values in `.env.local`:

- `VITE_SUPABASE_URL=http://127.0.0.1:54321`
- `VITE_SUPABASE_ANON_KEY=<value from: supabase status --output json>`
- `VITE_PERPLEXITY_API_KEY=<optional>`

5. Start the app:

```bash
npm run dev
```

## Local Supabase Commands

```bash
npm run supabase:start
npm run supabase:push
npm run supabase:stop
supabase status --output json
```

## Runtime Behavior

Content generation path is:

1. Supabase cache
2. Perplexity API (if key is configured)
3. Local fallback content

No Vercel KV runtime dependency is used by the app.

## Source of Truth Docs

Use these as primary docs:

| Purpose                       | File                                                                                                               |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Project overview + setup      | [README.md](/Users/akshitgupta/Desktop/Repo/night-divides-the-day-development/README.md)                           |
| Fast local setup              | [QUICK_START.md](/Users/akshitgupta/Desktop/Repo/night-divides-the-day-development/QUICK_START.md)                 |
| Supabase local workflow       | [SUPABASE_SETUP.md](/Users/akshitgupta/Desktop/Repo/night-divides-the-day-development/SUPABASE_SETUP.md)           |
| Agent contract and guardrails | [AGENTS.md](/Users/akshitgupta/Desktop/Repo/night-divides-the-day-development/AGENTS.md)                           |
| Architecture map              | [docs/architecture.md](/Users/akshitgupta/Desktop/Repo/night-divides-the-day-development/docs/architecture.md)     |
| Agent-operable architecture   | [docs/agent-architecture.md](/Users/akshitgupta/Desktop/Repo/night-divides-the-day-development/docs/agent-architecture.md) |
| Agent workflow playbook       | [docs/agent-playbook.md](/Users/akshitgupta/Desktop/Repo/night-divides-the-day-development/docs/agent-playbook.md) |
| Agent role playbooks          | [docs/agent-roles](/Users/akshitgupta/Desktop/Repo/night-divides-the-day-development/docs/agent-roles) |
| Tool/module contract          | [docs/tool-module-contract.md](/Users/akshitgupta/Desktop/Repo/night-divides-the-day-development/docs/tool-module-contract.md) |
| Archived status/history docs  | [docs/archive](/Users/akshitgupta/Desktop/Repo/night-divides-the-day-development/docs/archive)                     |

## Scripts

```bash
npm run dev
npm run build
npm run type-check
npm run test
npm run verify
npm run test:changed
npm run agent:prepr
```

## Security Notes

- Never commit `.env.local`.
- Never commit API keys, access tokens, or secret keys.
- If a key/token has ever been committed, rotate it.

## Notes

- This pass optimizes local development reliability.
- AI requests are currently made from browser code by design for local quick iteration.
