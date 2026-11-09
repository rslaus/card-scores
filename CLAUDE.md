# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Kaartscores: an offline-capable PWA scoresheet for four card games: **kleurenwiezen** (4 players), **chinees poepen** (2–17 players), **hartenjagen** (4 players, penalty points, lowest wins) and **manillen** (2–4 players; 4 = fixed teams 1&3 vs 2&4, 3 = dealer alone vs two, 2 = each for themselves). Plain HTML/CSS/ES modules: no framework, no build step, no dependencies. Deployed via GitHub Pages from `master` at https://rslaus.github.io/card-scores/.

All user-facing text is in **Dutch** (Flemish card terminology); code and comments are in English.

## Commands

```sh
python3 -m http.server 8000                                  # serve locally, open http://localhost:8000
node --test tests/*.test.mjs                                 # run all scoring tests
node --test --test-name-pattern="Troel" tests/*.test.mjs     # run a single test by name
```

ES modules require serving over HTTP; opening `index.html` via `file://` won't work.

## Architecture

- **`js/wiezen.js`, `js/poepen.js`, `js/harten.js`, `js/manille.js`**: pure scoring logic, no DOM, imported directly by the Node tests. Keep them DOM-free. Each exports `scoreRound(round)` → array of per-player deltas and `scoreRounds(rounds)`, plus `dealerFor`. Wiezen also owns the contract metadata (`CONTRACTS`, `MISERIE`, `SUITS`) that drives the entry UI, plus `validate(round)` (returns a Dutch error string or `null`) and `describe(round, names)` for the history list.
- **`js/app.js`**: the entire UI as a single module.
  - State is one object `data` (`{ current, archive, lastNames, theme }`) persisted to `localStorage` under key `kaartscores.v1`. Games store only raw rounds; totals are always recomputed from rounds via the scoring modules, so changing scoring rules retroactively changes scores.
  - Views (`home`, `setup`, `game`, `entry`, `end`) are rendered as HTML strings into `#app` by `render()`. Navigation uses `history.pushState` so the phone's back button works (`go()` / `back()` / `popstate`).
  - Interaction is via event delegation: elements carry `data-act="name"` plus `data-*` params, dispatched to the `actions` object, which receives `el.dataset`. Add new interactions as entries there; actions mutate state then call `render()`/`save()`.
  - Per-game metadata lives in `GAMES`; game-specific logic branches on `g.type`. `lowWins: true` (harten) flips winner/leader/ranking to the lowest total and inverts score colours via `best()` / `tone()`, so use those instead of `Math.max` / `cls()` for scores.
  - Harten and manille have no fixed round count (`totalRounds` is `null`); they end when a total reaches `g.limit` / `g.target`. Per-game player counts live in `PLAYER_RANGE`.
  - Every game can be **open-ended** ("onbeperkt"): `targetRounds`, `limit` or `target` is `null`, or `g.endless` for poepen (the 1→max→1 series repeats via `P.cardsFor`). `openEnded(g)` then shows a "Spel afsluiten" button; the game only ends via `end-game`.
  - Manille scores are per player (both partners get the team score); `M.scoreRounds(rounds, n)` needs the player count.
  - Interpolate user input (player names) via `esc()`.
- **`sw.js`**: cache-first service worker. **Bump `CACHE_VERSION` on every change to a cached file**, and add new files to `ASSETS`, otherwise installed apps keep serving the old version.

## Scoring rules

Rule references: `kleurenwiezen-regels.md` (Whisthub rules), `chinees-poepen-rules.md`, `hartenjagen-regels.md` and `manillen-regels.md` (Whisthub rules; 2/3-player variants are house rules). Key wiezen invariants encoded in the code and tests:
- Every round is zero-sum over 4 players (solo contracts: player gets 3× what each opponent pays).
- A "rondje pas" doubles the next non-pas round (consecutive passes still double only once) and does not advance the dealer or count toward the target round count.

Manille invariants: 60 card points per deal; the side above 30 scores `(points − 30) × mult`, the other side 0. Multiplier = zonder troef ×2 × (mee ×2 | tegen ×4) × (after a 30-30 draw ×2), capped at ×4. Draws don't double cumulatively; the dealer rotates every deal.
