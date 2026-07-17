'use strict';
/*
 * DMM Hashlist Direct - queries DebridMediaManager's raw hashlist repos on GitHub.
 * Zilean indexes DMM but is sometimes stale/rate-limited. This provider goes to the SOURCE.
 * Works for obscure/rare/orphaned titles (benchmark: "Small Time Gangster" AU 2011).
 * https://github.com/debridmediamanager/hashlists
 */
const TMDB_API_KEY = '1865f43a0549ca50d341dd9ab8b29f49';
const PROVIDER_NAME = 'DMM-Direct';

const HL_SEARCH = 'https://api.github.com/search/code?q=';
const HL_REPO = 'debridmediamanager/hashlists';
const HEADERS = { 'User-Agent': 'Nuvio/1.0', Accept: 'application/vnd.github.v3+json' };
const QO = { '2160p': 4, '1080p': 3, '720p': 2, '480p': 1 };

async function tmdbMeta(id, isSeries) {
  try {
    const r = await fetch(`https://api.themoviedb.org/3/${isSeries ? 'tv' : 'movie'}/${id}?api_key=${TMDB_API_KEY}&append_to_response=external_ids,alternative_titles`);
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
  const nonEng = /(HINDI|TAMIL|TELUGU|MALAYALAM|KANNADA|KOREAN|JAPANESE|SPANISH|LATINO|CASTELLANO|FRENCH|VOSTFR|GERMAN|DEUTSCH|RUSSIAN|ITALIAN|ITA|PORTUGUESE|ARABIC|TURKISH|POLISH|DUTCH|SWEDISH|NORWEGIAN|DANISH|FINNISH|GREEK|HEBREW|CZECH|HUNGARIAN|ROMANIAN|THAI|VIETNAMESE|INDONESIAN|CHINESE|MANDARIN|CANTONESE|FILIPINO|TAGALOG|UKRAINIAN|SLOVAK|BULGARIAN|CROATIAN|SERBIAN)/;
  const hasNonEng = nonEng.test(s);
  const hasEnglishTag = /(ENGLISH|ENG|MULTI|DUAL|MULTI-AUDIO|MULTI AUDIO)/.test(s);
  if (hasNonEng && !hasEnglishTag) return false;
  return true;
}

async function searchDMM(query) {
  const url = `${HL_SEARCH}${encodeURIComponent(query + ' repo:' + HL_REPO)}`;
  try {
    const r = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(10000) });
    if (!r.ok) return [];
    const j = await r.json();
    return j.items || [];
  } catch { return []; }
}

async function fetchHashlist(item) {
  try {
    const raw = `https://raw.githubusercontent.com/${HL_REPO}/main/${item.path}`;
    const r = await fetch(raw, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return [];
    return await r.json();
  } catch { return []; }
}

async function getStreams(id, type, season, episode) {
  try {
    const isSeries = type === 'tv' || type === 'series';
    const meta = await tmdbMeta(id, isSeries);
    if (!meta) return [];
    const title = meta.title || meta.name || '';
    const year = (meta.release_date || meta.first_air_date || '').split('-')[0] || '';

    const queries = [];
    if (isSeries) {
      const s = String(season || 1).padStart(2, '0');
      const e = String(episode || 1).padStart(2, '0');
      queries.push(`${title} S${s}E${e}`);
      queries.push(`${title} Season ${parseInt(season) || 1}`);
      queries.push(`${title} S${s}`);
    } else {
      queries.push(`${title} ${year}`);
      queries.push(title);
    }

    const seen = new Set();
    const out = [];

    for (const q of queries) {
      const items = await searchDMM(q);
      if (!items.length) continue;
      for (const it of items.slice(0, 3)) {
        const list = await fetchHashlist(it);
        if (!Array.isArray(list)) continue;
        for (const entry of list) {
          const hash = entry.hash || entry.info_hash || entry.infoHash;
          if (!hash || seen.has(hash)) continue;
          const name = entry.filename || entry.title || entry.name || '';
          if (!isEnglishOnly(name)) continue;
          seen.add(hash);
          const url = `magnet:?xt=urn:btih:${hash}`;
          const quality = detectQuality(name);
          const bytes = entry.bytes || entry.size || 0;
          const size = bytes ? `${(bytes / 1e9).toFixed(2)}GB` : '?';
          const streamName = `${PROVIDER_NAME} | ${quality}`;
          const streamTitle = `📦 DMM Hashlist | ${quality}\n💾 ${size}\n${name.slice(0, 90)}`;
          out.push({
            name: streamName, title: streamTitle, description: streamTitle,
            size, url,
            _sort: (QO[quality] || 0) * 1000 + (bytes ? Math.min(bytes / 1e9, 50) : 0),
          });
          if (out.length >= 40) break;
        }
        if (out.length >= 40) break;
      }
      if (out.length >= 40) break;
    }

    out.sort((a, b) => b._sort - a._sort);
    out.forEach(o => delete o._sort);
    return out;
  } catch (e) { console.error('DMM-Direct error:', e); return []; }
}

if (typeof module !== 'undefined' && module.exports) module.exports = { getStreams };
else global.getStreams = getStreams;
