'use strict';
/*
 * Comet - Stremio's fastest torrent/debrid search addon (g0ldyy/comet).
 * Cached-first: results include Real-Debrid, TorBox, Premiumize, AllDebrid, DebridLink cache checks.
 * Public instances (fallback chain). Users can override in Nuvio provider settings.
 * Solves 0-seeder problem: cached torrents on debrid = instant playback regardless of seeders.
 */
const TMDB_API_KEY = '1865f43a0549ca50d341dd9ab8b29f49';
const PROVIDER_NAME = 'Comet';

// Public Comet instances - tried in order until one responds
const COMET_INSTANCES = [
  'https://comet.elfhosted.com',
  'https://comet-jackett.elfhosted.com',
  'https://comet.aylin.live',
];

const HEADERS = {
  'User-Agent': 'Nuvio/1.0',
  'Accept': 'application/json',
};

const QUALITY_ORDER = { '2160p': 4, '1080p': 3, '720p': 2, '480p': 1, 'CAM': 0 };

async function tmdbToImdb(tmdbId, isSeries) {
  try {
    const url = `https://api.themoviedb.org/3/${isSeries ? 'tv' : 'movie'}/${tmdbId}/external_ids?api_key=${TMDB_API_KEY}`;
    const r = await fetch(url, { headers: HEADERS });
    if (!r.ok) return null;
    const j = await r.json();
    return j.imdb_id || null;
  } catch { return null; }
}

function detectQuality(name = '') {
  const s = name.toUpperCase();
  if (/2160P|4K|UHD/.test(s)) return '2160p';
  if (/1080P/.test(s)) return '1080p';
  if (/720P/.test(s)) return '720p';
  if (/480P/.test(s)) return '480p';
  if (/CAM|TS |HDTS/.test(s)) return 'CAM';
  return '1080p';
}

function detectLang(name = '') {
  const s = name.toUpperCase();
  if (/MULTI|DUAL/.test(s)) return 'Multi-Audio';
  if (/HINDI|TAMIL|TELUGU|ESP|SPA|FRE|GER|RUS|POR|JAP|KOR|CHI|ARA/.test(s) && !/ENG/.test(s)) return 'Foreign';
  return 'English';
}

async function tryInstance(base, type, imdbId, season, episode) {
  // Comet URL: /stream/{type}/{id}[:s:e].json
  const isSeries = type === 'tv' || type === 'series';
  const id = isSeries ? `${imdbId}:${season || 1}:${episode || 1}` : imdbId;
  const url = `${base}/stream/${isSeries ? 'series' : 'movie'}/${id}.json`;
  try {
    const r = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(8000) });
    if (!r.ok) return null;
    const j = await r.json();
    if (!j || !Array.isArray(j.streams)) return null;
    return j.streams;
  } catch { return null; }
}

async function getStreams(id, type, season, episode) {
  try {
    // id can be TMDB or already IMDb
    let imdbId = id;
    if (!String(id).startsWith('tt')) {
      imdbId = await tmdbToImdb(id, type === 'tv' || type === 'series') || id;
    }

    let raw = null;
    for (const base of COMET_INSTANCES) {
      raw = await tryInstance(base, type, imdbId, season, episode);
      if (raw && raw.length) break;
    }
    if (!raw || !raw.length) return [];

    const out = [];
    for (const st of raw.slice(0, 25)) {
      if (!st) continue;
      const url = st.url || (st.infoHash ? `magnet:?xt=urn:btih:${st.infoHash}` : null);
      if (!url) continue;

      const title = (st.title || st.description || st.name || '').replace(/\n/g, ' ');
      const filename = st.behaviorHints?.filename || title.split(' ')[0];
      const quality = detectQuality(title);
      const lang = detectLang(title);
      const cached = /💾|CACHED|\[RD\+\]|\[TB\+\]|\[PM\+\]|\[AD\+\]|\[DL\+\]/i.test(st.name || '') ||
                     /💾|CACHED|instant/i.test(title);
      const seeders = (title.match(/👤\s*(\d+)/) || [])[1] || '?';
      const size = (title.match(/💾?\s*([0-9.]+\s?[GM]B)/i) || [])[1] || '?';
      const source = ((title.match(/⚙️\s*([A-Za-z0-9.\-_]+)/) || [])[1]) || 'Comet';

      const emoji = cached ? '⚡💾' : (quality === '2160p' ? '🔥' : '💎');
      const streamName = `${PROVIDER_NAME}${cached ? ' ⚡' : ''} | ${quality}`;
      const streamTitle = `${emoji} ${quality} | ${cached ? 'CACHED' : `👤 ${seeders}`}\n💾 ${size} | ⚙️ ${source} | 🌐 ${lang}`;

      out.push({
        name: streamName,
        title: streamTitle,
        description: streamTitle,
        size: size,
        url,
        // Prioritise cached results in sort key
        _sort: (cached ? 1000 : 0) + (QUALITY_ORDER[quality] || 0) * 10 + (parseInt(seeders) || 0) / 1000,
      });
    }
    out.sort((a, b) => b._sort - a._sort);
    out.forEach(o => delete o._sort);
    return out;
  } catch (e) {
    console.error('Comet error:', e);
    return [];
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getStreams };
} else {
  global.getStreams = getStreams;
}
