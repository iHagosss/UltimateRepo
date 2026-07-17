'use strict';
/*
 * TorBox Search - queries TorBox's own search API (cached-first).
 * Requires user's TorBox API key (set in Nuvio provider settings as 'torboxApiKey').
 * TorBox has one of the deepest caches for obscure content because it stores what its userbase downloads.
 */
const TMDB_API_KEY = '1865f43a0549ca50d341dd9ab8b29f49';
const PROVIDER_NAME = 'TorBox';

const TB_API = 'https://api.torbox.app/v1/api';
const HEADERS_BASE = { 'User-Agent': 'Nuvio/1.0', 'Accept': 'application/json' };
const QO = { '2160p': 4, '1080p': 3, '720p': 2, '480p': 1 };

async function tmdbFetch(tmdbId, isSeries) {
  try {
    const r = await fetch(`https://api.themoviedb.org/3/${isSeries ? 'tv' : 'movie'}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=external_ids`);
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

function getApiKey() {
  // Nuvio injects settings globally; also fallback to env
  try {
    if (typeof settings !== 'undefined' && settings?.torboxApiKey) return settings.torboxApiKey;
  } catch {}
  try {
    if (typeof global !== 'undefined' && global.NUVIO_SETTINGS?.torbox_api_key) return global.NUVIO_SETTINGS.torbox_api_key;
  } catch {}
  return null;
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
    const apiKey = getApiKey();
    const HEADERS = apiKey ? { ...HEADERS_BASE, Authorization: `Bearer ${apiKey}` } : HEADERS_BASE;
    const isSeries = type === 'tv' || type === 'series';
    const meta = await tmdbFetch(id, isSeries);
    if (!meta) return [];
    const imdb = meta.external_ids?.imdb_id || meta.imdb_id;
    if (!imdb) return [];

    // TorBox search endpoint (public without key returns limited; with key returns full cached list)
    const q = isSeries
      ? `${TB_API}/torrents/imdb?imdb_id=${imdb}&season=${season || 1}&episode=${episode || 1}&metadata=true`
      : `${TB_API}/torrents/imdb?imdb_id=${imdb}&metadata=true`;

    const r = await fetch(q, { headers: HEADERS, signal: AbortSignal.timeout(12000) });
    if (!r.ok) return [];
    const j = await r.json();
    const list = j?.data?.torrents || j?.data || [];
    if (!Array.isArray(list) || !list.length) return [];

    const out = [];
    for (const t of list.slice(0, 20)) {
      const name = t.name || t.title || t.raw_title || '';
      const cached = t.cached === true || t.is_cached === true;
      // Prefer TorBox-cached; fall back to magnet
      const hash = t.hash || t.info_hash || t.magnet;
      const url = t.download_url || (hash?.startsWith('magnet:') ? hash : (hash ? `magnet:?xt=urn:btih:${hash}` : null));
      if (!url) continue;
      const q = detectQuality(name);
      const size = t.size ? `${(t.size / 1e9).toFixed(2)}GB` : (t.size_bytes ? `${(t.size_bytes / 1e9).toFixed(2)}GB` : '?');
      const seeders = t.seeders || t.peers || 0;
      const streamName = `${PROVIDER_NAME}${cached ? ' ⚡' : ''} | ${q}`;
      const streamTitle = `${cached ? '⚡ CACHED' : '🌊 uncached'} | ${q}\n💾 ${size} | 👤 ${seeders}\n${name.slice(0, 90)}`;
      out.push({
        name: streamName, title: streamTitle, description: streamTitle,
        size, url,
        _sort: (cached ? 1e6 : 0) + (QO[q] || 0) * 1000 + seeders,
      });
    }
    out.sort((a, b) => b._sort - a._sort);
    out.forEach(o => delete o._sort);
    return out;
  } catch (e) { console.error('TorBox error:', e); return []; }
}

if (typeof module !== 'undefined' && module.exports) module.exports = { getStreams };
else global.getStreams = getStreams;
