# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Kaartscores: an offline-capable PWA scoresheet for three card games: **kleurenwiezen** (4 players), **chinees poepen** (2–17 players) and **hartenjagen** (4 players, penalty points, lowest wins). Plain HTML/CSS/ES modules: no framework, no build step, no dependencies. Deployed via GitHub Pages from `master` at https://rslaus.github.io/card-scores/.

All user-facing text is in **Dutch** (Flemish card terminology); code and comments are in English.

## Commands

```sh
python3 -m http.server 8000                                  # serve locally, open http://localhost:8000
node --test tests/*.test.mjs                                 # run all scoring tests
node --test --test-name-pattern="Troel" tests/*.test.mjs     # run a single test by name
```

ES modules require serving over HTTP; opening `index.html` via `file://` won't work.

## Architecture

- **`js/wiezen.js`, `js/poepen.js`, `js/harten.js`**: pure scoring logic, no DOM, imported directly by the Node tests. Keep them DOM-free. Each exports `scoreRound(round)` → array of per-player deltas and `scoreRounds(rounds)`, plus `dealerFor`. Wiezen also owns the contract metadata (`CONTRACTS`, `MISERIE`, `SUITS`) that drives the entry UI, plus `validate(round)` (returns a Dutch error string or `null`) and `describe(round, names)` for the history list.
- **`js/app.js`**: the entire UI as a single module.
  - State is one object `data` (`{ current, archive, lastNames, theme }`) persisted to `localStorage` under key `kaartscores.v1`. Games store only raw rounds; totals are always recomputed from rounds via the scoring modules, so changing scoring rules retroactively changes scores.
  - Views (`home`, `setup`, `game`, `entry`, `end`) are rendered as HTML strings into `#app` by `render()`. Navigation uses `history.pushState` so the phone's back button works (`go()` / `back()` / `popstate`).
  - Interaction is via event delegation: elements carry `data-act="name"` plus `data-*` params, dispatched to the `actions` object, which receives `el.dataset`. Add new interactions as entries there; actions mutate state then call `render()`/`save()`.
  - Per-game metadata lives in `GAMES`; game-specific logic branches on `g.type`. `lowWins: true` (harten) flips winner/leader/ranking to the lowest total and inverts score colours via `best()` / `tone()`, so use those instead of `Math.max` / `cls()` for scores.
  - Harten has no fixed round count (`totalRounds` is `null`); it ends when a total reaches `g.limit`.
  - Interpolate user input (player names) via `esc()`.
- **`sw.js`**: cache-first service worker. **Bump `CACHE_VERSION` on every change to a cached file**, and add new files to `ASSETS`, otherwise installed apps keep serving the old version.

## Scoring rules

Rule references: `kleurenwiezen-regels.md` (Whisthub rules), `chinees-poepen-rules.md` and `hartenjagen-regels.md` (Whisthub rules). Key wiezen invariants encoded in the code and tests:
- Every round is zero-sum over 4 players (solo contracts: player gets 3× what each opponent pays).
- A "rondje pas" doubles the next non-pas round (consecutive passes still double only once) and does not advance the dealer or count toward the target round count.
