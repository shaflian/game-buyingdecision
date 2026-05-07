#!/usr/bin/env node
// Prefetch top games from RAWG by popularity → games.json
// Usage: RAWG_KEY=your_key_here node scripts/prefetch-rawg.js
// Free key: https://rawg.io/apidocs

const fs = require('fs');
const path = require('path');

const KEY = process.env.RAWG_KEY;
if (!KEY) {
  console.error('RAWG_KEY env var required. Free key: https://rawg.io/apidocs');
  process.exit(1);
}

const TARGET_COUNT = parseInt(process.env.RAWG_COUNT || '2000', 10);
const PAGE_SIZE = 40;
const PAGES = Math.ceil(TARGET_COUNT / PAGE_SIZE);
const RAWG_BASE = 'https://api.rawg.io/api';
const OUT_FILE = path.join(__dirname, '..', 'games.json');
const PAUSE_MS = 250;

function mapRawgGenres(genres = [], tags = []) {
  const out = new Set();
  const slugs = new Set([
    ...genres.map(g => (g.slug || '').toLowerCase()),
    ...tags.map(t => (t.slug || '').toLowerCase())
  ]);
  if (slugs.has('role-playing-games-rpg') || slugs.has('rpg')) out.add('rpg');
  if (slugs.has('shooter') || slugs.has('first-person-shooter') || slugs.has('fps')) out.add('shooter');
  if (slugs.has('strategy') || slugs.has('real-time-strategy') || slugs.has('turn-based-strategy')) out.add('strategy');
  if (slugs.has('indie')) out.add('indie');
  if (slugs.has('puzzle')) out.add('puzzle');
  if (slugs.has('racing')) out.add('racing');
  if (slugs.has('massively-multiplayer') || slugs.has('multiplayer') || slugs.has('online-multi-player') || slugs.has('co-op') || slugs.has('online-co-op')) out.add('multiplayer');
  if (slugs.has('adventure') || slugs.has('story-rich')) out.add('story');
  if (slugs.has('souls-like') || slugs.has('soulslike')) out.add('souls');
  if (slugs.has('roguelike') || slugs.has('rogue-like') || slugs.has('roguelite') || slugs.has('rogue-lite')) out.add('roguelike');
  if (slugs.has('open-world')) out.add('open');
  return [...out];
}

function heuristicPrice(year, added, slugs) {
  if (slugs.has('free-to-play') || slugs.has('massively-multiplayer')) return { launch: 0, low: 0 };
  if (slugs.has('indie')) return { launch: 14.99, low: 4.99 };
  if (year >= 2018 && added >= 8000) return { launch: 59.99, low: 29.99 };
  if (year >= 2018 && added >= 2000) return { launch: 39.99, low: 19.99 };
  if (year >= 2015) return { launch: 29.99, low: 12.99 };
  return { launch: 19.99, low: 7.99 };
}

function onSteam(stores = []) {
  return stores.some(s => s.store?.slug === 'steam' || s.store?.id === 1);
}

function mapGame(g) {
  const released = g.released ? new Date(g.released) : null;
  const year = released ? released.getFullYear() : 2024;
  const playtime = g.playtime || 0;
  const main = playtime > 0 ? playtime : 20;
  const slugs = new Set([
    ...(g.genres || []).map(x => (x.slug || '').toLowerCase()),
    ...(g.tags || []).map(x => (x.slug || '').toLowerCase())
  ]);
  const genres = mapRawgGenres(g.genres, g.tags);
  const { launch, low } = heuristicPrice(year, g.added || 0, slugs);
  const steamFlag = onSteam(g.stores || []);

  const userScore = (g.rating || 0) > 0 ? Math.round(g.rating * 20) : 75;
  const criticScore = g.metacritic || userScore;
  const popularity = g.added
    ? Math.min(100, Math.max(40, Math.round(Math.log10(g.added + 1) * 18)))
    : 60;

  return {
    id: 'pf-' + g.slug,
    title: g.name,
    year,
    dev: '',
    pub: '',
    capsule: g.background_image || '',
    genres: genres.length ? genres : ['indie'],
    hours: { main, extra: Math.round(main * 1.5), complete: Math.round(main * 2.5) },
    prices: { steam: steamFlag ? launch : null, ps5: null, xbox: null, switch: null, pc: launch },
    launch, low,
    criticScore, userScore,
    sentiment: userScore / 100,
    popularity,
    _prefetched: true
  };
}

async function fetchPage(page) {
  const qs = new URLSearchParams({
    key: KEY,
    ordering: '-added',
    page_size: String(PAGE_SIZE),
    page: String(page)
  });
  const res = await fetch(`${RAWG_BASE}/games?${qs}`);
  if (!res.ok) throw new Error(`page ${page}: HTTP ${res.status}`);
  return res.json();
}

async function main() {
  console.log(`Fetching top ${TARGET_COUNT} games from RAWG (${PAGES} pages, ~${Math.ceil(PAGES * PAUSE_MS / 1000)}s)...`);
  const all = [];
  for (let p = 1; p <= PAGES; p++) {
    process.stdout.write(`  page ${String(p).padStart(2)}/${PAGES}... `);
    try {
      const data = await fetchPage(p);
      const games = (data.results || []).map(mapGame);
      all.push(...games);
      console.log(`+${games.length}  (running total: ${all.length})`);
    } catch (e) {
      console.error(`failed: ${e.message}`);
      break;
    }
    if (p < PAGES) await new Promise(r => setTimeout(r, PAUSE_MS));
  }

  const seen = new Set();
  const deduped = [];
  for (const g of all) {
    const key = (g.title || '').toLowerCase().trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    deduped.push(g);
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(deduped));
  const sizeKB = (fs.statSync(OUT_FILE).size / 1024).toFixed(1);
  console.log(`\nFetched ${all.length}, deduped to ${deduped.length} unique entries.`);
  console.log(`Wrote ${OUT_FILE} (${sizeKB} KB)`);
  console.log(`Re-run anytime to refresh prices/scores.`);
}

main().catch(e => { console.error(e); process.exit(1); });
