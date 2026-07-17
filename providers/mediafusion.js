'use strict';
/*
 * MediaFusion - broad-catalog Stremio scraper with debrid cache flags.
 * Excellent for obscure/AU/UK/older content. Public ElfHosted instance.
 */
const TMDB_API_KEY = '1865f43a0549ca50d341dd9ab8b29f49';
const PROVIDER_NAME = 'MediaFusion';

const MF_INSTANCES = [
  'https://mediafusion.elfhosted.com',
  'https://mediafusion.fun',
];

const HEADERS = { 'User-Agent': 'Nuvio/1.0', 'Accept': 'application/json' };
const QUALITY_ORDER = { '2160p': 4, '1080p': 3, '720p': 2, '480p': 1, 'CAM': 0 };

async function tmdbToImdb(tmdbId, isSeries) {
  try {
    const r = await fetch(`https://api.themoviedb.org/3/${isSeries ? 'tv' : 'movie'}/${tmdbId}/external_ids?api_key=${TMDB_API_KEY}`);
    if (!r.ok) return null;
    return (await r.json()).imdb_id || null;
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

async function getStreams(id, type, season, episode) {
  try {
    const isSeries = type === 'tv' || type === 'series';
    let imdbId = id;
    if (!String(id).startsWith('tt')) imdbId = await tmdbToImdb(id, isSeries) || id;
    const streamId = isSeries ? `${imdbId}:${season || 1}:${episode || 1}` : imdbId;

    let streams = null;
    for (const base of MF_INSTANCES) {
      try {
        const url = `${base}/stream/${isSeries ? 'series' : 'movie'}/${streamId}.json`;
        const r = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(10000) });
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
      const title = (st.title || st.description || '').replace(/\n/g, ' ');
      const q = detectQuality(title + ' ' + (st.name || ''));
      const cached = /⚡|instant|cached/i.test(st.name || '') || /💾.*cache/i.test(title);
      const seeders = (title.match(/👥\s*(\d+)|👤\s*(\d+)|seeders?[:\s]+(\d+)/i) || [])[1] || '?';
      const size = (title.match(/💾\s*([0-9.]+\s?[GM]B)|([0-9.]+\s?[GM]B)/i) || [])[1] || '?';
      const emoji = cached ? '⚡💾' : (q === '2160p' ? '🔥' : '💎');
      const streamName = `${PROVIDER_NAME}${cached ? ' ⚡' : ''} | ${q}`;
      const streamTitle = `${emoji} ${q} | ${cached ? 'CACHED' : `👤 ${seeders}`}\n💾 ${size}\n${title.slice(0, 80)}`;
      out.push({
        name: streamName, title: streamTitle, description: streamTitle,
        size, url,
        _sort: (cached ? 1000 : 0) + (QUALITY_ORDER[q] || 0) * 10 + (parseInt(seeders) || 0) / 1000,
      });
    }
    out.sort((a, b) => b._sort - a._sort);
    out.forEach(o => delete o._sort);
    return out;
  } catch (e) { console.error('MediaFusion error:', e); return []; }
}

if (typeof module !== 'undefined' && module.exports) module.exports = { getStreams };
else global.getStreams = getStreams;
