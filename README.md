# It's Good to Be Good

> *Inspired by Tom Petty — "It's Good to Be King," Wildflowers, 1994.*

A personal space. Built by me, for me.

Live → **[its-good-to-be-good.vercel.app](https://its-good-to-be-good.vercel.app)**

---

## What This Is

A private space built around one idea, taken from the drawing at its
centre — da Vinci's Vitruvian Man, inscribed in a circle and a square:

> **The circle holds the soul. The square holds the work.**

The home page is the orbit. Sukoon's five pillars ride the circle and act in
place — Sleep, Food, Movement, Mindfulness, and Rooh. Breathe, OM, and Focus
live inside Mindfulness. Purpose tools sit on the square's corners
and open their own page — each one accumulates a record.

Not a product. Not a showcase. A place to be.

---

## The Tools

- **To do** — the day's task list. Crash-safe and offline-tolerant: every
  mutation hits a localStorage write-ahead log before the network, and
  saves only count when the server confirms.
- **Khyaali Bhoot** — write to the fear that's haunting you, let it go,
  watch it dissolve. Deliberately keeps nothing.
- **Tennis** — the cradle-to-centre-court roadmap.
- **Food** — a calm, in-place meal calendar for the week ahead.

---

## How It's Built — AI Agents

This project is built almost entirely with AI coding agents. I act as the
Product Owner: I define the spec, own the architecture decisions, and
review every change. The agents write the code.

The repo ships with an agent governance layer, and the interesting part is
that the philosophy is machine-checked: `npm run check:architecture` fails
the build if a circle practice tries to navigate or a square tool loses
its page.

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Design system + conventions — the two rings, tokens, module contract |
| `AGENTS.md` | Agent contract — locked invariants, layering, data safety |
| `docs/architecture.md` | The orbit, the layers, the resilience pattern |
| `src/modules/<id>/AGENT.md` | Per-module guide |

The home has a **vintage lock** — Special Elite type, monochrome paper, no
dashboard chrome. Agents are contractually forbidden from touching the
aesthetic. Everything else is in play.

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Vanilla TypeScript · Vite · Tailwind CSS (PWA) |
| Backend / DB | Convex (with @convex-dev/auth) |
| Hosting | Vercel |

No frameworks. ~10k lines of source, five modules, one contract.

---

## Setup

```bash
git clone https://github.com/akshitjmsb/its-good-to-be-good
cd its-good-to-be-good
npm install
npx convex dev   # provisions the backend, writes .env.local
npm run dev
```

---

## For AI Agents

Read `CLAUDE.md` and `AGENTS.md` first. Run `npm run verify` before any
commit; `npm run agent:prepr` before a PR.

---

*This is version 2 — the orbit. Version 1 was a dashboard of sixteen
modules; the reorg of July 2026 kept the five that mattered and made the
geometry of the drawing the architecture of the app.*
