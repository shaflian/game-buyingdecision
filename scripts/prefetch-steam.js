#!/usr/bin/env node
// Prefetch top Steam games using SteamSpy (popularity) + Steam's public Web API (per-game data).
// NO registration, NO API key. Both endpoints are public.
//
// Usage: node scripts/prefetch-steam.js
// Optional env:
//   STEAM_COUNT=500     how many games to fetch (default 500)
//   STEAM_PAUSE=300     ms between Steam appdetails calls (default 300, raise if 429s appear)
//
// Output: games.json at repo root.

const fs = require('fs');
const path = require('path');

const TARGET = parseInt(process.env.STEAM_COUNT || '500', 10);
const PAUSE = parseInt(process.env.STEAM_PAUSE || '1500', 10);
const COOLDOWN_AFTER = parseInt(process.env.STEAM_COOLDOWN_AFTER || '5', 10); // n consecutive skips → cool down
const COOLDOWN_MS = parseInt(process.env.STEAM_COOLDOWN_MS || '60000', 10);   // 60s sleep on rate-limit
const OUT = path.join(__dirname, '..', 'games.json');
const UA = 'worth-it-prefetch/1.0 (https://github.com/shaflian)';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function parseOwners(s) {
  const m = (s || '').replace(/,/g, '').match(/^(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

function mapGenresFromSteam(detail) {
  const set = new Set([
    ...(detail.genres || []).map(g => (g.description || '').toLowerCase()),
    ...(detail.categories || []).map(c => (c.description || '').toLowerCase())
  ]);
  const arr = [...set];
  const has = (re) => arr.some(t => re.test(t));
  const out = new Set();
  if (has(/\brpg\b|role[- ]?playing/)) out.add('rpg');
  if (has(/shooter|\bfps\b/)) out.add('shooter');
  if (has(/strategy|tactical/)) out.add('strategy');
  if (set.has('indie')) out.add('indie');
  if (has(/multi-?player|co-?op|massively|online/)) out.add('multiplayer');
  if (has(/puzzle/)) out.add('puzzle');
  if (has(/racing|driving/)) out.add('racing');
  if (has(/adventure|story|narrative/)) out.add('story');
  if (has(/free to play|free-to-play/)) {/* free-tag handled separately */}
  return [...out];
}

async function fetchJson(url, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': 'application/json' } });
      if (r.status === 429) { await sleep(2000 + i * 1000); continue; }
      if (!r.ok) return null;
      return await r.json();
    } catch (e) {
      if (i === retries) return null;
      await sleep(800);
    }
  }
  return null;
}

async function fetchSteamSpyTop() {
  const url = 'https://steamspy.com/api.php?request=all&page=0';
  const data = await fetchJson(url);
  if (!data) throw new Error('SteamSpy fetch failed (steamspy.com unreachable?)');
  return Object.values(data);
}

async function fetchSteamDetails(appid) {
  const url = `https://store.steampowered.com/api/appdetails?appids=${appid}&cc=us&filters=basic,price_overview,genres,categories,release_date`;
  const json = await fetchJson(url);
  if (!json || !json[appid] || !json[appid].success) return null;
  return json[appid].data;
}

function mapEntry(ss, detail) {
  const positive = ss.positive || 0;
  const negative = ss.negative || 0;
  const totalReviews = positive + negative;
  const userScore = totalReviews > 50 ? Math.round((positive / totalReviews) * 100) : 75;

  const ownersLow = parseOwners(ss.owners);
  const popularity = ownersLow > 0
    ? Math.min(100, Math.max(40, Math.round(Math.log10(ownersLow + 1) * 12 + 20)))
    : 60;

  // Playtime in minutes; cap at 80h to avoid live-service distortion (CSGO etc.).
  const medianMin = ss.median_forever || 0;
  const avgMin = ss.average_forever || 0;
  const main = Math.min(80, Math.max(8, Math.round((medianMin || avgMin || 1200) / 60)));

  // Steam appdetails is authoritative for prices; fall back to SteamSpy if absent.
  const ssLaunch = parseInt(ss.initialprice || '0', 10) / 100;
  const ssCurrent = parseInt(ss.price || '0', 10) / 100;
  let launch = ssLaunch || 19.99;
  let current = ssCurrent;
  if (detail.price_overview) {
    if (detail.price_overview.initial) launch = detail.price_overview.initial / 100;
    if (detail.price_overview.final) current = detail.price_overview.final / 100;
  }
  const isFree = !!detail.is_free || launch === 0;
  const low = isFree ? 0 : (current > 0 && current < launch ? current : Math.round(launch * 0.5 * 100) / 100);

  let year = null;
  if (detail.release_date && detail.release_date.date) {
    const d = new Date(detail.release_date.date);
    if (!isNaN(d.getTime())) year = d.getFullYear();
  }

  const genres = mapGenresFromSteam(detail);
  const dev = (detail.developers && detail.developers[0]) || ss.developer || '';
  const pub = (detail.publishers && detail.publishers[0]) || ss.publisher || dev;

  return {
    id: 'st-' + ss.appid,
    title: detail.name || ss.name,
    year,
    dev, pub,
    capsule: `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${ss.appid}/header.jpg`,
    genres: genres.length ? genres : [],
    hours: { main, extra: Math.round(main * 1.5), complete: Math.round(main * 2.5) },
    prices: { steam: isFree ? 0 : launch, ps5: null, xbox: null, switch: null, pc: launch },
    launch: isFree ? 0 : launch,
    low,
    criticScore: userScore,
    userScore,
    sentiment: userScore / 100,
    popularity,
    _prefetched: true,
    _source: 'steam'
  };
}

function loadExisting() {
  try {
    if (!fs.existsSync(OUT)) return new Map();
    const raw = JSON.parse(fs.readFileSync(OUT, 'utf8'));
    const m = new Map();
    for (const g of raw) {
      const id = (g.id || '').replace(/^st-/, '');
      if (id) m.set(parseInt(id, 10), g);
    }
    return m;
  } catch (e) {
    return new Map();
  }
}

function saveProgress(games) {
  const seen = new Set();
  const deduped = [];
  for (const g of games) {
    const k = (g.title || '').toLowerCase().trim();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    deduped.push(g);
  }
  fs.writeFileSync(OUT, JSON.stringify(deduped));
  return deduped.length;
}

async function main() {
  const existing = loadExisting();
  if (existing.size) {
    console.log(`Resume: found ${existing.size} games already in games.json — will skip those and fetch missing ones.\n`);
  }

  console.log(`Step 1: SteamSpy popularity ranking (1 call)...`);
  const all = await fetchSteamSpyTop();
  console.log(`  Got ${all.length} games.`);

  const top = all
    .filter(g => g.appid && g.name)
    .sort((a, b) => parseOwners(b.owners) - parseOwners(a.owners))
    .slice(0, TARGET);

  const todo = top.filter(g => !existing.has(parseInt(g.appid, 10)));
  const eta = Math.ceil(todo.length * PAUSE / 1000);
  console.log(`\nStep 2: Steam appdetails for ${todo.length} new games (~${Math.floor(eta / 60)}m ${eta % 60}s at ${PAUSE}ms pacing)...`);
  console.log(`         If 5+ skips in a row, will cool down ${COOLDOWN_MS / 1000}s and resume.\n`);

  const games = [...existing.values()];
  let ok = 0, skipped = 0, failed = 0;
  let consecutiveSkips = 0;
  let saveCounter = 0;

  for (let i = 0; i < todo.length; i++) {
    const ss = todo[i];
    const label = ss.name.length > 38 ? ss.name.slice(0, 38) + '…' : ss.name;
    process.stdout.write(`  ${String(i + 1).padStart(3)}/${todo.length}  ${label.padEnd(40)}  `);
    const detail = await fetchSteamDetails(ss.appid);

    if (!detail) {
      console.log('skip (no detail)');
      skipped++;
      consecutiveSkips++;
      if (consecutiveSkips >= COOLDOWN_AFTER) {
        console.log(`\n  ⚠  ${consecutiveSkips} consecutive skips — Steam rate limit hit. Sleeping ${COOLDOWN_MS / 1000}s...\n`);
        await sleep(COOLDOWN_MS);
        consecutiveSkips = 0;
      } else {
        await sleep(PAUSE);
      }
      continue;
    }

    try {
      games.push(mapEntry(ss, detail));
      ok++;
      consecutiveSkips = 0;
      console.log('ok');
    } catch (e) {
      failed++;
      console.log(`fail: ${e.message}`);
    }

    // Save progress every 25 successful fetches so a Ctrl+C is recoverable.
    saveCounter++;
    if (saveCounter >= 25) {
      saveProgress(games);
      saveCounter = 0;
    }

    await sleep(PAUSE);
  }

  const finalCount = saveProgress(games);
  const sizeKB = (fs.statSync(OUT).size / 1024).toFixed(1);
  console.log(`\nDone.  new=${ok} skipped=${skipped} failed=${failed}  unique total=${finalCount}`);
  console.log(`Wrote ${OUT} (${sizeKB} KB)`);
  console.log(`Refresh worth-it-v2.html — search count should be ~${50 + finalCount}.`);
  if (skipped > 0) {
    console.log(`\nNote: ${skipped} games were skipped (likely rate-limited or delisted).`);
    console.log(`Re-run the same command — it will resume from where it left off and retry the missing ones.`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
