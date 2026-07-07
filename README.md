# Bananaball Guess Who 🍌

A mobile-first PWA that teaches you to recognize every Banana Ball player
(2026 World Tour — 6 teams, 158 players) — Duolingo-style, with spaced
repetition, lessons, streaks, XP, and a collectible roster.

**Live:** https://peterlowrance.github.io/bananaball-guess-who/

## Stack

React 19 · Vite 7 · TypeScript · Tailwind v4 · zustand · react-router (hash)
· motion · vite-plugin-pwa. No backend — progress lives in `localStorage`.
Player images are hotlinked from `thebananaball.com`.

## Development

```bash
npm install
npm run sync-data   # copy data/players-2026.json -> src/data/
npm run dev         # http://localhost:5173/bananaball-guess-who/
```

Other scripts: `npm run build`, `npm run preview`, `npm run typecheck`,
`npm test` (Vitest — `engine` project runs pure game logic in node, `ui` runs
jsdom smoke tests).

## Data pipeline

The player dataset is produced under `data/` from the official Banana Ball
stats API and per-team popularity research (see `data/research/`), then
synced into `src/data/` by `scripts/sync-data.mjs`. Rebuild with
`node data/build-clean.mjs`.

## Deploy

Pushing to `main` triggers `.github/workflows/deploy.yml`, which typechecks,
tests, builds, and publishes `dist/` to GitHub Pages.
