// Server-side proxy for Steam endpoints — avoids browser CORS restrictions.
// Only allows steamcommunity.com and steampowered.com targets.
module.exports = async function (req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const rawUrl = req.query.url;
  if (!rawUrl) return res.status(400).json({ error: 'Missing url param' });

  let target;
  try {
    target = new URL(decodeURIComponent(rawUrl));
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  const allowed = ['steamcommunity.com', 'api.steampowered.com', 'store.steampowered.com'];
  if (!allowed.some(h => target.hostname === h || target.hostname.endsWith('.' + h))) {
    return res.status(403).json({ error: 'Forbidden host' });
  }

  // Inject server-side API key for Steam Web API calls when the client has none
  if (target.hostname === 'api.steampowered.com' && process.env.STEAM_API_KEY && !target.searchParams.get('key')) {
    target.searchParams.set('key', process.env.STEAM_API_KEY);
  }

  try {
    const upstream = await fetch(target.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; WorthIt/1.0)',
        'Accept': 'text/xml,application/xml,application/json,*/*',
      },
    });
    const body = await upstream.text();
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'text/plain');
    res.status(upstream.status).send(body);
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
};
