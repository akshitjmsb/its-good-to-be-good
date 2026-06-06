# It's Good to Be Good

> *Inspired by Tom Petty — "It's Good to Be King," Wildflowers, 1994.*

A personal space. Built by me, for me.

Live → **[its-good-to-be-good.vercel.app](https://its-good-to-be-good.vercel.app)**

---

## What This Is

A private dashboard I built as my own abstract space — curated entirely around the things that matter to me. Not a product. Not a showcase. A place to be.

Every module reflects something I actually use: daily practices I track, things I want to learn, tasks I'm working through. It's opinionated by design — these are my abstraction layers.

---

## Modules

### Journey
Personal growth tracking built around the things I do daily.

- **Being** — Seven daily practices visualized as an orbital mandala (Vitruvian Man motif). Practices: Breathe, OM, Sleep, Stretch, Weights, Tennis, Guided. Each practice is toggleable; the mandala reflects your streak.
- **Todo** — Task management with subtasks, drag-to-reorder, and full persistence. 13 persistence tests cover all core interactions.

### Learn
AI-powered learning modules pulling from live sources. Built with Perplexity AI for real-time knowledge grounding.

---

## How It's Built — AI Agents

This project is built almost entirely with AI coding agents. I act as the Product Owner: I define the spec, own the architecture decisions, and review every change. The agents write the code.

**Agent stack:** Claude Code · Codex · Antigravity

The repo ships with a full agent governance layer so any AI agent can safely contribute without breaking the product's invariants:

| File | Purpose |
|------|---------|
| `AGENTS.md` | Agent contract — locked invariants, layer map, migration protocol |
| `docs/agent-architecture.md` | Layer boundaries (app / components / domains / infra), AI content safety, canonical data flow |
| `docs/agent-playbook.md` | Builder / Reviewer / QA roles, safe change workflow, pre-PR checklist |
| `docs/architecture.md` | Local-first design, single anonymous user, module taxonomy |

The home page has a **vintage lock** — agents are contractually forbidden from touching its aesthetic (Special Elite font, black-and-white, January 2025 baseline). Everything else is in play.

> Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend | TypeScript · React · Vite · Tailwind CSS |
| Backend / DB | Supabase |
| AI | Perplexity AI |
| Hosting | Vercel |

---

## Setup

```bash
git clone https://github.com/akshitjmsb/its-good-to-be-good
cd its-good-to-be-good
npm install
```

Create a `.env.local` file:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_PERPLEXITY_API_KEY=your_perplexity_api_key
```

```bash
npm run dev
```

---

## For AI Agents

If you're an AI agent working on this repo, read `AGENTS.md` first. It defines the contract you must operate within — locked invariants, layer boundaries, and the change protocol. Run `npm run agent:prepr` before any PR.

---

*This is version 1 of a longer arc. The vision: a platform where anyone can build their own abstract space — their own modules, their own abstraction layers, uniquely theirs.*
