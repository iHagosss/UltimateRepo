'use strict';
/*
 * Zilean - DebridMediaManager (DMM) hashlist searcher.
 * DMM has one of the LARGEST cached-hash catalogs on Earth (community-sourced from Real-Debrid caches).
 * This is where you find obscure content when torrent trackers are dead.
 */
const TMDB_API_KEY = '1865f43a0549ca50d341dd9ab8b29f49';
const PROVIDER_NAME = 'Zilean(DMM)';

const ZILEAN_INSTANCES = [
  'https://zilean.elfhosted.com',
  'https://zilean.hayd.uk',
];

const HEADERS = { 'User-Agent': 'Nuvio/1.0', 'Accept': 'application/json' };
const QO = { '2160p': 4, '1080p': 3, '720p': 2, '480p': 1 };

async function tmdbMeta(tmdbId, isSeries) {
  try {
    const r = await fetch(`https://api.themoviedb.org/3/${isSeries ? 'tv' : 'movie'}/${tmdbId}?api_key=${TMDB_API_KEY}`);
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

function detectQuality(s = '') {
  s = s.toUpperCase();
  if (/2160P|4K|UHD/.test(s)) return '2160p';
  if (/1080P/.test(s)) return '1080p';
  if (/720P/.test(s)) return '720p';
  return '480p';
}

function isEnglish(name = '') {
  const s = name.toUpperCase();
  if (/HINDI|TAMIL|TELUGU|KOREAN|JAPANESE|SPANISH|FRENCH|GERMAN|RUSSIAN|ITALIAN|PORTUGUESE|ARABIC/.test(s) &&
      !/ENG|MULTI|DUAL/.test(s)) return false;
  return true;
}

async function getStreams(id, type, season, episode) {
  try {
    const isSeries = type === 'tv' || type === 'series';
    const meta = await tmdbMeta(id, isSeries);
    if (!meta) return [];
    const title = meta.title || meta.name || '';
    const year = (meta.release_date || meta.first_air_date || '').split('-')[0];

    let query;
    if (isSeries) {
      const s = String(season || 1).padStart(2, '0');
      const e = String(episode || 1).padStart(2, '0');
      query = `${title} S${s}E${e}`;
    } else {
      query = `${title} ${year}`;
    }

    let results = null;
    for (const base of ZILEAN_INSTANCES) {
      try {
        const url = `${base}/dmm/filtered?query=${encodeURIComponent(query)}`;
        const r = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(10000) });
        if (!r.ok) continue;
        const j = await r.json();
        if (Array.isArray(j) && j.length) { results = j; break; }
      } catch {}
    }
    if (!results) return [];

    const out = [];
    for (const r of results.slice(0, 25)) {
      const name = r.raw_title || r.title || r.filename || '';
      if (!isEnglish(name)) continue;
      const hash = r.info_hash || r.infoHash || r.hash;
      if (!hash) continue;
      const url = `magnet:?xt=urn:btih:${hash}`;
      const q = detectQuality(name);
      const size = r.size ? `${(r.size / 1e9).toFixed(2)}GB` : '?';
      const streamName = `${PROVIDER_NAME} | ${q}`;
      const streamTitle = `📦 DMM Cache | ${q}\n💾 ${size}\n${name.slice(0, 90)}`;
      out.push({
        name: streamName, title: streamTitle, description: streamTitle,
        size, url,
        _sort: (QO[q] || 0) * 1000,
      });
    }
    out.sort((a, b) => b._sort - a._sort);
    out.forEach(o => delete o._sort);
    return out;
  } catch (e) { console.error('Zilean error:', e); return []; }
}

if (typeof module !== 'undefined' && module.exports) module.exports = { getStreams };
else global.getStreams = getStreams;
