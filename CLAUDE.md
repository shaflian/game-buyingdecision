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

## Motion rules (v0.9 — Emil Kowalski / impeccable pass)
Tokens: `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)` for arrivals, presses, reveals · `--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1)` for on-screen movement · `--transition: 0.18s ease` stays for color/border hovers.
- **Never `transition: all`.** List properties. Every pressable element (`button`, `.pill`, `.deal-card`, `.rec-card`, `.fav-item`, `.metric-tab`) gets `scale(0.97)` on `:active` via the shared block near the end of the CSS.
- **Bars animate `transform: scaleX()`**, never `width` — `.meter-fill`, `.pillar-bar`, `.hype-bar` are `width:100%; transform-origin:left`. JS sets `style.transform` to `scaleX(score / 100)`.
- **Receipt arrival** is a staggered transition, not a keyframe: `runCalc()` sets `--i` on each direct child of `#receipt`, toggles `.in`; CSS delays by `--i * 45ms` with a 6px blur that resolves. Re-running retargets cleanly.
- **Hover-only motion** (arrow nudges, icon pops, card lifts) is neutralised under `@media (hover: none)`.
- **Reduced motion** keeps color/opacity transitions, drops transforms/filters, disables the theme ripple and the hero parallax.
- **No glow halos** (`box-shadow: 0 0 Npx`) on hover states or bars. The grade letter is the only thing allowed to glow.
- **Modals** animate from `scale(0.965)` + opacity in 240ms; never from `scale(0)`.
- UI durations stay under 300ms except the receipt reveal (480ms, authored moment) and bar fills (800–900ms, explanatory).

### Hero interaction
`.hero-visual` holds `.hero-visual__img` (the Tsushima art, `scale(1.06)` so it can drift) and `.hero-light` (a 760px warm radial, `mix-blend-mode: screen`; `soft-light` in light theme). `initHeroParallax()` in the script lerps the art *against* the cursor (±20px / ±11px), the light *to* the cursor, and the `.hero` text slightly with the cursor — all in one rAF loop that stops when settled. Skipped entirely for coarse pointers and reduced motion. The `::after` fade stays on `.hero-visual` so the page seam never moves.

### De-AI decisions (don't reintroduce)
- No eyebrow/kicker above the H1 — the tagline lives in the footer.
- No section numbers (`/ 01`) on `.section-label`s.
- No `// comment`-style labels; `.coffee-label` and `.rec-header` are plain Plex Sans labels.
- `::selection`, caret and `:focus-visible` are themed from the palette.

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

### `games.json` format (v0.9+)
`{ generated: ISO-date, source: 'steam', games: [...] }`. The loader (`loadPrefetchedGames`) accepts both this and the legacy bare array. `generated` feeds the "Steam data refreshed …" line in the footer (`#dataFresh`).

Extra per-game fields written by the prefetch: `current` (live Steam price at fetch time), `discount` (% off at fetch time — drives the `-XX%` badge in suggestions), `released` (Steam release-date string — drives the `new` badge, ≤90 days), `meta` (Metacritic score from Steam when present; `criticScore` = `meta || userScore`). When `meta` is absent on a prefetched title, the Hype pillar says so instead of pretending critics agree.

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
What a default run does:
1. SteamSpy top-500 by owners **plus** fresh candidates from Steam's storefront lists (`top_sellers`, `new_releases`, `specials`) and SteamSpy `top100in2weeks` — this is how brand-new releases get in.
2. Batched price refresh for **every** game already in the pool (`filters=price_overview`, 50 appids per call — cheap, ~1 min for 1000 games).
3. Full appdetails only for games not yet in the pool. Skips DLC/hardware/demos (`type !== 'game'`), unreleased (`coming_soon`), and storefront picks with fewer than `STEAM_MIN_SIGNAL` (default 30) reviews+recommendations.

Env overrides (PS: `$env:NAME="value"`): `STEAM_COUNT=1000` (diminishing returns past ~500), `STEAM_PAUSE` (raise if 429s appear), `STEAM_FULL_REFRESH=1` (re-fetch metadata for all games, ~15–25 min — do this every few months so `meta`/genres/years stay current), `STEAM_SKIP_PRICE_REFRESH=1`.

The legacy `scripts/prefetch-rawg.js` is kept for users who already have a RAWG key, but Steam is the supported path.

## Deployment

- **GitHub:** `https://github.com/shaflian/game-buyingdecision`
- **Vercel:** connected to GitHub, auto-deploys on every `git push origin main`
- **Live domain:** `game-buyingdecision.shaflian.com`
- **Entry point:** `worth-it-v2.html` — served at `/` via `vercel.json` rewrite
- **Serverless function:** `api/steam-proxy.js` — registered in `vercel.json` under `functions`, `maxDuration: 10`
- **To deploy:** `git add -p && git commit -m "..." && git push origin main`

## Vercel Environment Variables

| Variable | Where to set | Purpose |
|---|---|---|
| `STEAM_API_KEY` | Project Settings → Environment Variables → Production | Server-side Steam Web API key so all visitors can fetch their Steam library without entering their own key |

**How it works:** `api/steam-proxy.js` injects `process.env.STEAM_API_KEY` into requests to `api.steampowered.com` only when the `key` param is absent/empty. Users who paste their own key in the UI still use theirs.

**To update the key:** Vercel dashboard → Project Settings → Environment Variables → edit `STEAM_API_KEY` → redeploy.

**Steam API key UI** (client-side fallback): "add Steam API key →" link under the Steam input stores key in `localStorage` under `worthit.steamKey.v1`. Only needed if the Vercel env var is not set.

## Steam Library Fetch — How It Works

1. User enters a Steam vanity name (`sapimomo`), custom URL (`steamcommunity.com/id/sapimomo`), or 17-digit Steam ID
2. Parser (line ~3342) detects input type — vanity regex: `/^[A-Za-z0-9_-]{2,32}$/`
3. For vanity names: calls `ResolveVanityURL` → gets Steam ID 64
4. Then fetches `GetPlayerSummaries` (display name) + `GetOwnedGames` (library)
5. All 3 calls go through `STEAM_PROXIES[0]` = `/api/steam-proxy?url=...` (Vercel proxy, CORS-free)
6. Proxy injects `STEAM_API_KEY` env var server-side if no key in request

## Favicon

- `favicon.ico` + `favicon.png` — Gabe Newell photo (`gaben.jpg` in project root), cropped to square from top-center, resized to 32×32 via Python Pillow
- Linked in `<head>` of `worth-it-v2.html` (lines 4–5)

## Adding a new game to GAME_DB

`GAME_DB` is the hand-curated array inside `worth-it-v2.html`. Find it with `const GAME_DB`. Each entry shape:

```js
{
  id: 'unique-slug',           // kebab-case, used internally
  title: 'Display Title',
  year: 2024,
  genres: ['rpg', 'story'],    // from KNOWN_GENRES list below
  hltb: 50,                    // main-story hours (HLTB.com)
  meta: 88,                    // Metacritic score (0–100), or omit if unknown
  launch: 59.99,               // USD launch price
  low: 29.99,                  // USD historical low (SteamDB)
  capsule: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/APPID/header.jpg',
  // ^ use Steam CDN pattern — replace APPID with the Steam app ID
}
```

**KNOWN_GENRES** (use only these strings):
`rpg` · `souls` · `shooter` · `strategy` · `story` · `multiplayer` · `indie` · `open` · `roguelike` · `racing` · `puzzle`

**Where to insert:** anywhere inside `GAME_DB = [ ... ]`. Add a comment header above groups (e.g. `// Persona / Atlus`) to keep it readable.

**To find the Steam app ID:** go to the game's Steam store page — the number in the URL is the appid (`store.steampowered.com/app/APPID/`).

**After editing:** commit + push. No build step needed.

```
git add worth-it-v2.html
git commit -m "Add [Game Title] to GAME_DB"
git push origin main
```

## Live price refresh — regional accuracy

When a user picks a game, `pickGame()` calls `fetchAndApplyLivePrice(id)` in the background, which fetches from `store.steampowered.com/api/appdetails?appids=APPID&cc=CC&filters=price_overview` and stores the result as `state.pickedGame._liveRegional`.

### Proxy order for `fetchSteamPriceForApp`
1. `/api/steam-proxy` (Vercel serverless — most reliable, no CORS issues)
2. `allorigins.win` (public fallback)
3. `corsproxy.io` (public fallback)

`store.steampowered.com` is in the allowed-host list in `api/steam-proxy.js` — no key needed.

### `_liveRegional` object
```js
{
  ccy: 'IDR',         // which currency these amounts are in
  current: 245999,    // live discounted price (Steam cents → regional unit)
  initial: 491998,    // live launch price (same unit)
  low: 245968         // derived: g.low_USD × (initial / g.launch_USD)
}
```
Prices are stored as raw regional amounts (not converted to USD). Display helpers:
- `fmtRaw(regional)` — format a value already in the current currency
- `fmtLive(liveVal, usdFallback)` — use `_liveRegional` when `ccy` matches, else `fmtPrice(usd)`

### Where live prices are used (Price Archaeology section)
- `dPaying` ("CURRENT PRICE") → `fmtRaw(lr.current)` when live data available; no auto-apply of `g.low` — always shows real current price
- `dLow` → `fmtRaw(lr.low)` (derived regional low)
- `dLaunch` → `fmtRaw(lr.initial)` (exact Steam regional launch price)
- Price track chart labels → same `fmtRaw` values
- Score calculation always uses USD values (`g.launch`, `g.low`, `g.prices.steam`) — live fetch also updates these in USD via `/ RATES[ccy]` for score compatibility

### Price track chart scaling
Track goes from 0 → `trackMax = Math.max(refLaunch, refNow)` so the "you pay" pin never overflows the right edge when a game's price has risen above its launch price.
- `nowPct = refNow / trackMax * 100` (always ≤ 100%)
- `launchPct = refLaunch / trackMax * 100` (can be < 100% if price rose)
- When pins are within 4% of each other (overlap), `.label-above` is added to the "you pay" pin so its label floats above the track while "launch" stays below — no stacking.
- **Never** set `state.manualPrice = g.low` automatically. That caused `fmtPrice(usd)` to display a rough rate-converted amount instead of the real regional price.

### Currency switch
Changing the currency dropdown triggers `fetchAndApplyLivePrice` for the currently picked game, so prices re-fetch in the new region automatically.

### GAME_DB `launch` / `low` fields
Always stored in **USD**. The live fetch overrides display; static USD values are the fallback for games without a `capsule` URL or when the proxy is unavailable.

**To force a full data refresh** (all 500+ games, prices + metadata):
```powershell
node scripts/prefetch-steam.js   # regenerates games.json
git add games.json && git commit -m "Refresh games.json" && git push origin main
```

## Steam Library Fetch — `fetchSteamLibrary` routing

`fetchSteamLibrary(ref)` always tries the API path (`fetchSteamLibraryWithKey`) first, even when no client key is saved. The Vercel proxy injects `STEAM_API_KEY` server-side when the `key` param is absent/empty (`!target.searchParams.get('key')` check in `api/steam-proxy.js`). XML fallback only runs if the API path throws and no key was provided.

**If Steam fetch stops working:**
1. Check the Vercel env var `STEAM_API_KEY` is set for Production + Preview
2. Adding/editing the env var requires a redeploy — push an empty commit: `git commit --allow-empty -m "Trigger redeploy" && git push origin main`
3. Steam API key domain registration (`steamcommunity.com/dev/apikey`) — any domain works, Steam doesn't enforce subdomain matching for server-side calls

## Verdict — "If you like this" Recommendations

A `#rRec` block appears at the bottom of the receipt (before `receipt-foot`) after every calculation. It shows up to 3 games with genre overlap to the **currently selected game** — refreshes every time the user picks a different game.

### Scoring (Jaccard similarity)
```js
const shared = currentGame.genres.filter(gn => candidate.genres.includes(gn));
const jaccard = shared.length / Math.max(currentGame.genres.length, candidate.genres.length);
// small taste-profile tiebreaker (15%) for equally similar results
const tasteBonus = tasteProfile ? tasteMatchScore(candidate) / candidate.genres.length * 0.15 : 0;
score = jaccard + tasteBonus;
```
- Filter: `shared.length >= 1` (at least one genre in common)
- Sort: descending by `score`, take top 3
- Card label shows the shared genre tags (e.g. `rpg · story`), not a percentage

### Key rule
**Never base recommendations on `tasteProfile` alone** — that was the original bug (always showed the same 3 shooter/strategy games regardless of selected game). The primary signal must be the current game's genres. `tasteProfile` is only a tiebreaker.

### HTML / CSS anchors
| Element | Purpose |
|---|---|
| `#rRec` | Wrapper — `display:none` until calc runs |
| `#rRecGames` | Flex row of `.rec-card` elements |
| `.rec-card` | Clickable card, calls `pickGame(id)` on click |
| `.rec-thumb` | `background-image` thumbnail (54px tall) |
| `.rec-match` | Shared genre tags in `DM Mono` primary color |

## Deals browser — what counts as "on sale"
`getDealsPool()` trusts the prefetch's `discount` field when present (`discount >= 20`, i.e. actually discounted on Steam at the last refresh). Entries without a `discount` field (hand-curated `GAME_DB`) fall back to the `low`-vs-`launch` heuristic. Never let the prefetch's `low = launch * 0.5` fallback surface as a "deal" — that was the 859-games-on-sale bug.

## GAME_DB — Free-to-Play entries

Free games use `launch: 0, low: 0, prices: { steam: 0 }`. They are excluded from the Deals browser (`getDealsPool` filters `launch <= 0`). Current F2P entries: Dota 2 (570), CS2 (730), Apex Legends (1172470), Warframe (230410), Path of Exile (238960), TF2 (440). App IDs are embedded in the `capsule` URL for live price lookups.
