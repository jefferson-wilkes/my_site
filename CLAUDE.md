# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project

JW Games — a personal portfolio site hosting a cat laser-chase game, built with React + Vite and deployed on Cloudflare Pages + Workers with a D1 (SQLite) database.

## Tech Stack

- **React + Vite** — frontend (with `@cloudflare/vite-plugin` for local Worker dev)
- **Tailwind CSS** — utility classes (used sparingly alongside inline styles)
- **Phaser 3** — game engine for all game canvases
- **Cloudflare Pages + Workers** — hosting and API
- **Cloudflare D1** — SQLite database (users, game_sessions)

## Commands

- `npm run dev` — start local dev server (runs React + Worker + D1 locally)
- `npm run deploy` — build and deploy to Cloudflare (`wrangler deploy`)
- `npm run lint` — ESLint

## Key Files

- `src/App.jsx` — main layout, tab navigation (Levels / Free Play / Profile / Leaderboard / Guide), auth gate
- `src/AuthContext.jsx` — login state in React context + localStorage
- `src/worker.js` — Cloudflare Worker: auth endpoints, game session recording, leaderboard, AI coaching
- `src/Game.jsx` — Free Play: Phaser GameScene (cat AI, items, scoring), PlaySplash, HowDidIDo
- `src/LevelGame.jsx` — Levels tab: all level logic (LevelScene, BirdScene, DemoScene), level select, splash screens, level complete
- `src/CharacterSelect.jsx` — character picker (8 cat emojis + photo upload with canvas resize)
- `src/Profile.jsx` — user profile: character picker, stat boxes, free play history table
- `src/Leaderboard.jsx` — free play leaderboard + WhatWorks analysis
- `src/Guide.jsx` — 📖 Guide tab with usage instructions
- `src/Auth.jsx` — sign in / register form
- `schema.sql` — D1 schema (users, game_sessions tables)
- `wrangler.jsonc` — Cloudflare config (D1 binding: `DB`)
- `.dev.vars` — local secrets (JWT_SECRET, ADMIN_SECRET, ANTHROPIC_API_KEY) — gitignored

## Auth System

- Username + password, no email required
- Passwords hashed with PBKDF2 (Web Crypto API)
- 30-day JWTs signed with HMAC-SHA256, stored in localStorage
- Admin password reset: `POST /api/admin/reset-password` with `ADMIN_SECRET`

## Game Architecture

### Free Play (`Game.jsx`)
- `GameScene` (Phaser) — cat AI with WATCHING → STALKING → POUNCING states, falling items, 60s timer
- `PlaySplash` — shown before game starts; reads character from localStorage
- `HowDidIDo` — post-game AI coaching via `/api/cat-response` (Claude Haiku)
- Character stored in localStorage as `lc_character_<username>` (per-user)

### Levels (`LevelGame.jsx`)
All levels share module-level bridges: `activeCharacter`, `activeLevel`, `onLevelCompleteCallback`.

Level configs in the `LEVELS` array at the top of the file:
| id | name | type | notes |
|----|------|------|-------|
| 1 | Demo | `demo: true` | DemoScene — scripted animation |
| 2 | Tutorial | `tutorial: true` | LevelScene — catch 3 fish |
| 3 | Level 1: Schools | `levelNum: 1, schools: true` | LevelScene — school spawner, 30s timer |
| 4 | Level 2: Bird Chase | `levelNum: 2, bird: true` | BirdScene — 5 birds, 30s timer |
| 5, 6 | locked | — | placeholder |

**LevelScene** — used by Tutorial and Level 1. Supports:
- Catch-goal ending (`cfg.goal`) or timer ending (`cfg.duration`)
- School spawner (`cfg.schools`) — formations (rows / splits) instead of random
- Per-item speed ranges (`item.speedMin`, `item.speedMax`)
- Tutorial overlay text

**BirdScene** — used by Level 2 (Bird Chase). Separate Phaser scene:
- Loads `public/backyard.png` as background (1402×1122, stretched to 640×480)
- Window frame effect (14px border, glass reflection highlights)
- 5 birds defined in `BIRDS_CONFIG`, each on their own perch/flight cycle
- Perch positions in `BIRD_PERCHES` constant — tune these if birds don't sit on branches visually
- `BIRD_DWELL_TIME` constant (seconds per perch) at top of file

**DemoScene** — scripted demo animation with deterministic cat AI (no randomness). Fixed positions: laser starts at screen center, slides to fish column (x=W*2/3) at t=2s. Fish falls at speed 0.62. Pounce fires at t=6s via stateTimer only.

**Phase machine** in `LevelGame` export:
`select` → `animation-splash` → `demo` → `demo-complete`
`select` → `practice-splash` → `playing` → `complete`
`select` → `level-splash` → `playing` → `complete`
`select` → `bird-splash` → `playing` → `complete`

### Level High Scores
Stored in localStorage: `lc_lvl_hs_<levelId>`.
- Scored levels (Level 1): stores highest pts
- Bird level (Level 2): stores highest seconds-remaining on a win

## Database Schema

```sql
users (id, username, password_hash, created_at)
game_sessions (id, user_id, score, caught, missed, pounces,
               avg_laser_y, avg_speed, total_laser_dist,
               movement_frequency, movement_smoothness, time_stationary,
               played_at)
```

Only **free play** sessions are saved to the DB. Level scores use localStorage only.

## Deployment

1. Apply schema to production D1: `npx wrangler d1 execute laser-chase-db --remote --file=schema.sql`
2. Set secrets: `wrangler secret put JWT_SECRET` / `ADMIN_SECRET` / `ANTHROPIC_API_KEY`
3. Deploy: `npm run deploy`

## Conventions

- Test locally before pushing (`npm run dev`)
- Inline styles throughout (not Tailwind) for game/dark-theme components
- Phaser scenes use module-level variables as bridges to React (pattern: `activeCharacter`, `activeLevel`, `onLevelCompleteCallback`)
- All randomness in DemoScene is replaced with fixed values for deterministic timing
