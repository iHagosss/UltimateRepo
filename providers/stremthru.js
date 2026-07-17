'use strict';
/*
 * StremThru Torz - meta-aggregator that unifies Torrentio, MediaFusion, Comet, etc.
 * behind a single cached-first API. Fastest single query for the widest catalog.
 */
const TMDB_API_KEY = '1865f43a0549ca50d341dd9ab8b29f49';
const PROVIDER_NAME = 'StremThru';

const ST_INSTANCES = [
  'https://stremthru.13377001.xyz',
  'https://stremthru.elfhosted.com',
];

const HEADERS = { 'User-Agent': 'Nuvio/1.0', 'Accept': 'application/json' };
const QO = { '2160p': 4, '1080p': 3, '720p': 2, '480p': 1 };

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
  return '480p';
}

async function getStreams(id, type, season, episode) {
  try {
    const isSeries = type === 'tv' || type === 'series';
    let imdb = id;
    if (!String(id).startsWith('tt')) imdb = await tmdbToImdb(id, isSeries) || id;
    const sid = isSeries ? `${imdb}:${season || 1}:${episode || 1}` : imdb;

    let streams = null;
    for (const base of ST_INSTANCES) {
      try {
        const url = `${base}/stremio/torz/stream/${isSeries ? 'series' : 'movie'}/${sid}.json`;
        const r = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(12000) });
        if (!r.ok) continue;
        const j = await r.json();
        if (j?.streams?.length) { streams = j.streams; break; }
      } catch {}
    }
    if (!streams) return [];

    const out = [];
    for (const st of streams.slice(0, 25)) {
      const url = st.url || (st.infoHash ? `magnet:?xt=urn:btih:${st.infoHash}` : null);
      if (!url) continue;
      const title = (st.title || '').replace(/\n/g, ' ');
      const q = detectQuality(title + ' ' + (st.name || ''));
      const cached = /⚡|cached|instant/i.test(st.name || title);
      const size = (title.match(/([0-9.]+\s?[GM]B)/i) || [])[1] || '?';
      const seeders = parseInt((title.match(/👤\s*(\d+)/) || [])[1] || 0);
      const streamName = `${PROVIDER_NAME}${cached ? ' ⚡' : ''} | ${q}`;
      const streamTitle = `${cached ? '⚡ CACHED' : '🌐'} ${q} | 👤 ${seeders}\n💾 ${size}\n${title.slice(0, 80)}`;
      out.push({
        name: streamName, title: streamTitle, description: streamTitle,
        size, url,
        _sort: (cached ? 1e6 : 0) + (QO[q] || 0) * 1000 + seeders,
      });
    }
    out.sort((a, b) => b._sort - a._sort);
    out.forEach(o => delete o._sort);
    return out;
  } catch (e) { console.error('StremThru error:', e); return []; }
}

if (typeof module !== 'undefined' && module.exports) module.exports = { getStreams };
else global.getStreams = getStreams;
