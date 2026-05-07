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
- `dPaying` → `fmtRaw(lr.current)` when live data available
- `dLow` → `fmtRaw(lr.low)` (derived regional low)
- `dLaunch` → `fmtRaw(lr.initial)` (exact Steam regional launch price)
- Price track chart labels → same `fmtRaw` values
- Score calculation always uses USD values (`g.launch`, `g.low`, `g.prices.steam`) — live fetch also updates these in USD via `/ RATES[ccy]` for score compatibility

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

## GAME_DB — Free-to-Play entries

Free games use `launch: 0, low: 0, prices: { steam: 0 }`. They are excluded from the Deals browser (`getDealsPool` filters `launch <= 0`). Current F2P entries: Dota 2 (570), CS2 (730), Apex Legends (1172470), Warframe (230410), Path of Exile (238960), TF2 (440). App IDs are embedded in the `capsule` URL for live price lookups.
