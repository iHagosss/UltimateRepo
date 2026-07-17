'use strict';
/*
 * Jackett-Bridge - direct passthrough to user's own Jackett/Prowlarr instance.
 * Set jackettUrl + jackettApiKey in Nuvio provider settings.
 * Enables PRIVATE-TRACKER results (PTP, BTN, AvistaZ) for content that has zero
 * public seeders. THIS is how you legitimately reach orphaned content.
 */
const TMDB_API_KEY = '1865f43a0549ca50d341dd9ab8b29f49';
const PROVIDER_NAME = 'Jackett';
const HEADERS = { 'User-Agent': 'Nuvio/1.0', Accept: 'application/json' };
const QO = { '2160p': 4, '1080p': 3, '720p': 2, '480p': 1 };

function getSettings() {
  const g = (typeof globalThis !== 'undefined' && globalThis) || {};
  const s = g.NUVIO_SETTINGS || g.settings || {};
  return {
    url: s.jackett_url || s.jackettUrl || null,
    apiKey: s.jackett_api_key || s.jackettApiKey || null,
    indexers: s.jackett_indexers || 'all',
  };
}

async function tmdbMeta(id, isSeries) {
  try {
    const r = await fetch(`https://api.themoviedb.org/3/${isSeries ? 'tv' : 'movie'}/${id}?api_key=${TMDB_API_KEY}`);
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

function isEnglishOnly(name = '') {
  const s = name.toUpperCase();
  const nonEng = /(HINDI|TAMIL|TELUGU|KOREAN|JAPANESE|SPANISH|LATINO|FRENCH|VOSTFR|GERMAN|RUSSIAN|ITALIAN|ITA|PORTUGUESE|ARABIC|TURKISH|POLISH|DUTCH|CHINESE|MANDARIN|CANTONESE)/;
  if (nonEng.test(s) && !/ENG|MULTI|DUAL/.test(s)) return false;
  return true;
}

async function getStreams(id, type, season, episode) {
  try {
    const { url, apiKey, indexers } = getSettings();
    if (!url || !apiKey) return [];
    const isSeries = type === 'tv' || type === 'series';
    const meta = await tmdbMeta(id, isSeries);
    if (!meta) return [];
    const title = meta.title || meta.name || '';
    const year = (meta.release_date || meta.first_air_date || '').split('-')[0] || '';

    const q = isSeries
      ? `${title} S${String(season || 1).padStart(2, '0')}E${String(episode || 1).padStart(2, '0')}`
      : `${title} ${year}`.trim();

    const base = url.replace(/\/+$/, '');
    const api = `${base}/api/v2.0/indexers/${encodeURIComponent(indexers)}/results?apikey=${apiKey}&Query=${encodeURIComponent(q)}`;

    const r = await fetch(api, { headers: HEADERS, signal: AbortSignal.timeout(20000) });
    if (!r.ok) return [];
    const j = await r.json();
    const list = j.Results || [];
    if (!list.length) return [];

    const out = [];
    for (const t of list.slice(0, 40)) {
      const name = t.Title || '';
      if (!isEnglishOnly(name)) continue;
      const magnet = t.MagnetUri || t.Link;
      const hash = t.InfoHash;
      const finalUrl = magnet || (hash ? `magnet:?xt=urn:btih:${hash}` : null);
      if (!finalUrl) continue;
      const seeders = t.Seeders || 0;
      const size = t.Size ? `${(t.Size / 1e9).toFixed(2)}GB` : '?';
      const qual = detectQuality(name);
      const tracker = t.Tracker || t.Indexer || 'private';
      out.push({
        name: `${PROVIDER_NAME} | ${tracker} | ${qual}`,
        title: `🔐 ${tracker} | ${qual} | 👤 ${seeders}\n💾 ${size}\n${name.slice(0, 90)}`,
        description: name, size, url: finalUrl,
        _sort: (QO[qual] || 0) * 1000 + Math.min(seeders, 999),
      });
    }
    out.sort((a, b) => b._sort - a._sort);
    out.forEach(o => delete o._sort);
    return out;
  } catch (e) { console.error('Jackett error:', e); return []; }
}

if (typeof module !== 'undefined' && module.exports) module.exports = { getStreams };
else global.getStreams = getStreams;
