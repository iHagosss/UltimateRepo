'use strict';
/*
 * Jackettio - Stremio addon that queries Jackett/Prowlarr indexers.
 * Very strong for private/tracker-specific content (e.g. AU trackers, older shows).
 * Public ElfHosted instance with public indexer config.
 */
const TMDB_API_KEY = '1865f43a0549ca50d341dd9ab8b29f49';
const PROVIDER_NAME = 'Jackettio';

// Preconfigured public instances (all-public-indexers profile)
const JK_INSTANCES = [
  'https://jackettio.elfhosted.com/eyJpbmRleGVycyI6WyIxMzM3eCIsImJpdHNlYXJjaCIsImVsYW1pZ29zIiwia2lja2Fzc3RvcnJlbnRzLXRvIiwibnlhYS1zaSIsInBpcmF0ZWJheSIsInJhcmJnIiwic29saWR0b3JyZW50cyIsInRoZXBpcmF0ZWJheS1wYXJ0eSIsInRoZXJhcmJnIiwidG9ycmVudGdhbGF4eSIsInllbmMteWFrLXhCbGgtb3JnIiwieWlmeSJdLCJsYW5ndWFnZXMiOlsibXVsdGkiLCJlbiJdLCJxdWFsaXR5RXhjbHVkZWQiOlsiVFMiLCJDQU0iLCJTQ1IiXX0=',
];

const HEADERS = { 'User-Agent': 'Nuvio/1.0', 'Accept': 'application/json' };
const QO = { '2160p': 4, '1080p': 3, '720p': 2, '480p': 1, 'CAM': 0 };

async function tmdbToImdb(tmdbId, isSeries) {
  try {
    const r = await fetch(`https://api.themoviedb.org/3/${isSeries ? 'tv' : 'movie'}/${tmdbId}/external_ids?api_key=${TMDB_API_KEY}`);
    if (!r.ok) return null;
    return (await r.json()).imdb_id || null;
  } catch { return null; }
}

function detectQuality(s = '') {
  s = s.toUpperCase();
  if (/2160P|4K|UHD/.test(s)) return '2160p';
  if (/1080P/.test(s)) return '1080p';
  if (/720P/.test(s)) return '720p';
  if (/480P/.test(s)) return '480p';
  if (/CAM|HDTS|TS /.test(s)) return 'CAM';
  return '1080p';
}

async function getStreams(id, type, season, episode) {
  try {
    const isSeries = type === 'tv' || type === 'series';
    let imdb = id;
    if (!String(id).startsWith('tt')) imdb = await tmdbToImdb(id, isSeries) || id;
    const streamId = isSeries ? `${imdb}:${season || 1}:${episode || 1}` : imdb;

    let streams = null;
    for (const base of JK_INSTANCES) {
      try {
        const url = `${base}/stream/${isSeries ? 'series' : 'movie'}/${streamId}.json`;
        const r = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(15000) });
        if (!r.ok) continue;
        const j = await r.json();
        if (j?.streams?.length) { streams = j.streams; break; }
      } catch {}
    }
    if (!streams) return [];

    const out = [];
    for (const st of streams.slice(0, 30)) {
      const url = st.url || (st.infoHash ? `magnet:?xt=urn:btih:${st.infoHash}` : null);
      if (!url) continue;
      const title = (st.title || '').replace(/\n/g, ' ');
      const q = detectQuality(title + ' ' + (st.name || ''));
      const seeders = parseInt((title.match(/(\d+)\s*seeders?|👥\s*(\d+)|👤\s*(\d+)/i) || [])[1] || (title.match(/👥\s*(\d+)/) || [])[1] || 0);
      const size = (title.match(/([0-9.]+\s?[GM]B)/i) || [])[1] || '?';
      const tracker = ((st.name || '').match(/\[([^\]]+)\]/) || [])[1] || 'Jackett';

      // Include even 0-seeder torrents - debrid may still have them cached
      const emoji = seeders > 10 ? '💎' : (seeders > 0 ? '⚡' : '🌊');
      const streamName = `${PROVIDER_NAME} | ${q}`;
      const streamTitle = `${emoji} ${q} | 👤 ${seeders}\n💾 ${size} | 📡 ${tracker}\n${title.slice(0, 80)}`;
      out.push({
        name: streamName, title: streamTitle, description: streamTitle,
        size, url,
        _sort: (QO[q] || 0) * 1000 + seeders,
      });
    }
    out.sort((a, b) => b._sort - a._sort);
    out.forEach(o => delete o._sort);
    return out;
  } catch (e) { console.error('Jackettio error:', e); return []; }
}

if (typeof module !== 'undefined' && module.exports) module.exports = { getStreams };
else global.getStreams = getStreams;
