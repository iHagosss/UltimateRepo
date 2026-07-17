'use strict';
/*
 * KnightCrawler - a torrentio fork/alternative. Different indexer coverage.
 * Good for content torrentio misses.
 */
const TMDB_API_KEY = '1865f43a0549ca50d341dd9ab8b29f49';
const PROVIDER_NAME = 'KnightCrawler';

const KC_BASE = 'https://knightcrawler.elfhosted.com';
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
  return '1080p';
}

async function getStreams(id, type, season, episode) {
  try {
    const isSeries = type === 'tv' || type === 'series';
    let imdb = id;
    if (!String(id).startsWith('tt')) imdb = await tmdbToImdb(id, isSeries) || id;
    const streamId = isSeries ? `${imdb}:${season || 1}:${episode || 1}` : imdb;

    const url = `${KC_BASE}/stream/${isSeries ? 'series' : 'movie'}/${streamId}.json`;
    const r = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(10000) });
    if (!r.ok) return [];
    const j = await r.json();
    if (!j?.streams?.length) return [];

    const out = [];
    for (const st of j.streams.slice(0, 20)) {
      const streamUrl = st.url || (st.infoHash ? `magnet:?xt=urn:btih:${st.infoHash}` : null);
      if (!streamUrl) continue;
      const title = (st.title || '').replace(/\n/g, ' ');
      const q = detectQuality(title + ' ' + (st.name || ''));
      const seeders = parseInt((title.match(/👤\s*(\d+)/) || [])[1] || 0);
      const size = (title.match(/([0-9.]+\s?[GM]B)/i) || [])[1] || '?';
      const streamName = `${PROVIDER_NAME} | ${q}`;
      const streamTitle = `⚔️ ${q} | 👤 ${seeders} | 💾 ${size}\n${title.slice(0, 80)}`;
      out.push({
        name: streamName, title: streamTitle, description: streamTitle,
        size, url: streamUrl, _sort: (QO[q] || 0) * 1000 + seeders,
      });
    }
    out.sort((a, b) => b._sort - a._sort);
    out.forEach(o => delete o._sort);
    return out;
  } catch (e) { console.error('KnightCrawler error:', e); return []; }
}

if (typeof module !== 'undefined' && module.exports) module.exports = { getStreams };
else global.getStreams = getStreams;
