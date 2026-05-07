# Worth It? — Claude Context

## Project
Single-file game value calculator: `worth-it-v2.html` — pure HTML/CSS/JS, no framework, no build step. Requires a local server (`npx serve .`) because of the font CDN.

All content, logic, and styles live in `worth-it-v2.html`. Never split it.

## Stack
- Fonts: `Space Grotesk` (UI/headings) · `DM Mono` (data values, numbers, labels) · `Inter` (body copy)
- Design: dark-first (`data-theme="dark"` on `<html>`), light mode via `[data-theme="light"]` overrides
- Theme toggle: View Transitions API ripple on click

## CSS Tokens
```
--bg / --bg-400 / --bg-600 / --surface   → backgrounds (dark: navy stack, light: gray)
--text / --text-300 / --text-200 / --text-light / --text-600   → text hierarchy
--primary: #66c0f4                        → blue accent (light: #1a72c4)
--primary-100: #0f2233                    → tinted bg for callouts
--positive: #a4d007 · --gold: #f5c518 · --orange: #f8a819 · --red: #ff6b6b   → grade colors
--border: #2a475e · --border-bright: #3a6382
--transition: 0.18s ease
--frame-pad: 64px
```

## Typography rules
- Headings / UI labels: `Space Grotesk`, uppercase where used, **letter-spacing max 0.06em** — never 0.1em+
- Large display headings: `letter-spacing: -0.02em` (negative tracking = editorial signal)
- Data values (scores, prices, playtime): `DM Mono` — no uppercase, no wide letter-spacing
- Body copy: `Inter` or `Space Grotesk 400`
- Never use ALL CAPS + wide letter-spacing together — that's the "AI template" pattern
- No `::before` decorative lines on labels

## Grade color system
Grade element gets `data-g` attribute set by JS. CSS targets `[data-g="S"]` etc. for per-grade glow:
```css
.grade[data-g="S"] { color: var(--gold); }
.grade[data-g="A"] { color: var(--primary); }
.grade[data-g="B"] { color: var(--positive); }
.grade[data-g="C"] { color: var(--orange); }
.grade[data-g="D"] { color: #f87c42; }
.grade[data-g="E"] { color: var(--red); }
```

## Key HTML anchors
| Element | ID / selector |
|---|---|
| Main layout | `.frame` |
| Input panel | left `<section>` inside `.grid` |
| Result panel | `#result` |
| Empty state | `#emptyState` |
| Receipt | `#receipt` |
| Grade | `#rGrade` (also gets `data-g` attr) |
| Score | `#rScore` |
| Pillars | `#rPillars` |
| Game data | `const GAME_DB` in `<script>` |

## Rules
- Never rewrite the full file — use targeted edits.
- Never hardcode `color: #fff` / `background: white` — use tokens so light/dark both work.
- When adding new text elements: `color: var(--text)` or `var(--text-300)`. Never hardcode.
- After any edit, state the line range changed.

## Game pool tiers (v0.7+)
Three tiers feed the suggestions dropdown. Loader merges them in order; later tiers don't overwrite earlier ones (dedupe by lowercased title).
1. **Hand-curated `GAME_DB`** (~50 entries, in `worth-it-v2.html`) — real Metacritic scores, real HLTB hours, real Steam launch/low prices. Highest-trust data.
2. **`games.json` prefetch** (~500 entries) — produced by `scripts/prefetch-steam.js`. SteamSpy gives the popularity-ranked appid list; Steam's official Web API (`store.steampowered.com/api/appdetails`) gives real genres + release year + prices + capsule per game. Hours are derived from SteamSpy's median playtime (capped at 80h) and represent typical engagement, not strict main-story time.
3. **Live RAWG search** — opt-in, BYO key. Activates once user pastes a RAWG key; debounced search beyond the local pool. Results badged `LIVE`. Note: RAWG's signup is broken for many users — Steam-only path is preferred.

### Regenerating `games.json` (no API key required)
```powershell
# PowerShell (Windows):
cd C:\Users\shafl\Portfolio-Shaflian\game-worth
node scripts/prefetch-steam.js
```
```sh
# bash:
node scripts/prefetch-steam.js
```
Default 500 games, ~3 min runtime. Override via `STEAM_COUNT=1000` (PS: `$env:STEAM_COUNT="1000"`) — diminishing returns past ~500 due to long-tail noise. Raise `STEAM_PAUSE` if 429s appear.

The legacy `scripts/prefetch-rawg.js` is kept for users who already have a RAWG key, but Steam is the supported path.
