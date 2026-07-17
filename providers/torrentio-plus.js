'use strict';
/*
 * Torrentio-Plus - Torrentio queried with maximum-recall config:
 *   providers=yts,eztv,rarbg,1337x,thepiratebay,kickasstorrents,torrentgalaxy,magnetdl,horriblesubs,nyaasi,tokyotosho,anidex,rutor,rutracker,comando,bludv,torrent9,ilcorsaronero,mejortorrent,wolfmax4k,cinecalidad,besttorrents
 *   sort=qualitysize
 *   English + Multi.
 * This variant explicitly enables lesser-known indexers (rutor, magnetdl, torrentgalaxy) that carry
 * obscure/older content missed by default torrentio config.
 */
const TMDB_API_KEY = '1865f43a0549ca50d341dd9ab8b29f49';
const PROVIDER_NAME = 'Torrentio+';

const TP_CONFIG = 'providers=yts,eztv,rarbg,1337x,thepiratebay,kickasstorrents,torrentgalaxy,magnetdl,horriblesubs,nyaasi,tokyotosho,anidex,rutor,rutracker,besttorrents,thepiratebay:tor,zooqle,limetorrents,glodls,btdig,torlock|sort=qualitysize|qualityfilter=scr,cam,unknown';
const TP_BASE = `https://torrentio.strem.fun/${TP_CONFIG}`;

const HEADERS = { 'User-Agent': 'Nuvio/1.0', 'Accept': 'application/json' };
const QO = { '2160p': 4, '1080p': 3, '720p': 2, '480p': 1 };
const TRACKERS = [
  'udp://tracker.opentrackr.org:1337/announce',
  'udp://open.stealth.si:80/announce',
  'udp://tracker.torrent.eu.org:451/announce',
  'udp://exodus.desync.com:6969/announce',
  'udp://tracker.moeking.me:6969/announce',
  'udp://explodie.org:6969/announce',
];

function magnet(hash) {
  if (!hash) return '';
  return `magnet:?xt=urn:btih:${hash}${TRACKERS.map(t => `&tr=${encodeURIComponent(t)}`).join('')}`;
}

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

function isEnglishOrMulti(s = '') {
  const u = s.toUpperCase();
  if (/HINDI|TAMIL|TELUGU|KOREAN|JAPANESE|SPANISH|FRENCH|GERMAN|RUSSIAN|ITALIAN|PORTUGUESE|ARABIC|BENGALI|MALAYALAM/.test(u) &&
      !/ENG|MULTI|DUAL|EN\s|EN$/.test(u)) return false;
  return true;
}

async function getStreams(id, type, season, episode) {
  try {
    const isSeries = type === 'tv' || type === 'series';
    let imdb = id;
    if (!String(id).startsWith('tt')) imdb = await tmdbToImdb(id, isSeries) || id;
    const sid = isSeries ? `${imdb}:${season || 1}:${episode || 1}` : imdb;

    const url = `${TP_BASE}/stream/${isSeries ? 'series' : 'movie'}/${sid}.json`;
    const r = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(12000) });
    if (!r.ok) return [];
    const j = await r.json();
    if (!j?.streams?.length) return [];

    const out = [];
    for (const st of j.streams.slice(0, 25)) {
      const title = (st.title || '').replace(/\n/g, ' ');
      if (!isEnglishOrMulti(title)) continue;
      const url = st.url || magnet(st.infoHash);
      if (!url) continue;
      const q = detectQuality(title);
      const seeders = parseInt((title.match(/👤\s*(\d+)/) || [])[1] || 0);
      const size = (title.match(/([0-9.]+\s?[GM]B)/i) || [])[1] || '?';
      const src = ((title.match(/⚙️\s*([A-Za-z0-9.\-_]+)/) || [])[1]) || 'Torrentio';
      const streamName = `${PROVIDER_NAME} | ${q}`;
      const streamTitle = `🌊 ${q} | 👤 ${seeders} | ⚙️ ${src}\n💾 ${size}\n${title.slice(0, 90)}`;
      out.push({
        name: streamName, title: streamTitle, description: streamTitle,
        size, url,
        // Include zero-seeder — debrid may still have them cached
        _sort: (QO[q] || 0) * 10000 + seeders,
      });
    }
    out.sort((a, b) => b._sort - a._sort);
    out.forEach(o => delete o._sort);
    return out;
  } catch (e) { console.error('Torrentio+ error:', e); return []; }
}

if (typeof module !== 'undefined' && module.exports) module.exports = { getStreams };
else global.getStreams = getStreams;
