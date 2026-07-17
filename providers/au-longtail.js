'use strict';
/*
 * AU-LongTail - specialty scraper for orphaned Australian TV (SBS, ABC, Foxtel archives, Movie Extra).
 * Benchmark: "Small Time Gangster" (2011, Movie Extra AU, 8 eps).
 * Search order:
 *   1. SBS On Demand catalog (legal free, geo-locked AU)
 *   2. ABC iView catalog (legal free, geo-locked AU)
 *   3. YouTube (some AU broadcasters upload full episodes/promos)
 *   4. TGx / Nyaa / EZTV public torrent RSS as raw fallback
 *   5. Broad title-search torrent providers (Torrentio-like)
 */
const TMDB_API_KEY = '1865f43a0549ca50d341dd9ab8b29f49';
const PROVIDER_NAME = 'AU-LongTail';
const HEADERS = { 'User-Agent': 'Mozilla/5.0 Nuvio/1.0', Accept: '*/*' };
const QO = { '2160p': 4, '1080p': 3, '720p': 2, '480p': 1 };

async function tmdbMeta(id, isSeries) {
  try {
    const r = await fetch(`https://api.themoviedb.org/3/${isSeries ? 'tv' : 'movie'}/${id}?api_key=${TMDB_API_KEY}&append_to_response=external_ids`);
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
  const nonEng = /(HINDI|TAMIL|TELUGU|KOREAN|JAPANESE|SPANISH|LATINO|CASTELLANO|FRENCH|VOSTFR|GERMAN|RUSSIAN|ITALIAN|ITA|PORTUGUESE|ARABIC|TURKISH|POLISH|DUTCH|CHINESE|MANDARIN|CANTONESE)/;
  if (nonEng.test(s) && !/ENG|MULTI|DUAL/.test(s)) return false;
  return true;
}

// ---- SBS On Demand search ----
async function searchSBS(title) {
  try {
    const url = `https://www.sbs.com.au/api/v3/search/programs?q=${encodeURIComponent(title)}&limit=5`;
    const r = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(8000) });
    if (!r.ok) return [];
    const j = await r.json();
    return (j.entries || []).map(e => ({
      source: 'SBS On Demand', name: e.title, url: e.link || e.href, id: e.id,
    }));
  } catch { return []; }
}

// ---- ABC iView search ----
async function searchIView(title) {
  try {
    const url = `https://search.abc.net.au/s/search.json?query=${encodeURIComponent(title)}&collection=abc-iview`;
    const r = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(8000) });
    if (!r.ok) return [];
    const j = await r.json();
    return (j.response?.resultPacket?.results || []).slice(0, 5).map(e => ({
      source: 'ABC iView', name: e.title, url: e.liveUrl,
    }));
  } catch { return []; }
}

// ---- TorrentGalaxy public RSS ----
async function searchTGx(title, year, season, episode, isSeries) {
  try {
    const q = isSeries ? `${title} S${String(season || 1).padStart(2, '0')}` : `${title} ${year || ''}`.trim();
    const url = `https://torrentgalaxy.to/torrents.php?search=${encodeURIComponent(q)}&lang=1&nox=1&format=rss`;
    const r = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(9000) });
    if (!r.ok) return [];
    const xml = await r.text();
    const items = [];
    const re = /<item>[\s\S]*?<title><!\[CDATA\[([^\]]+)\]\]><\/title>[\s\S]*?<link>([^<]+)<\/link>[\s\S]*?<enclosure[^>]*url="([^"]+)"[\s\S]*?<size>(\d+)<\/size>[\s\S]*?<\/item>/g;
    let m;
    while ((m = re.exec(xml)) !== null && items.length < 15) {
      const name = m[1];
      if (!isEnglishOnly(name)) continue;
      const link = m[2]; const magnet = m[3]; const size = parseInt(m[4], 10) || 0;
      items.push({ name, magnet, size });
    }
    return items;
  } catch { return []; }
}

// ---- EZTV public torrents API ----
async function searchEZTV(imdb) {
  try {
    if (!imdb) return [];
    const imdbNum = String(imdb).replace(/^tt/, '');
    const url = `https://eztvx.to/api/get-torrents?imdb_id=${imdbNum}&limit=30`;
    const r = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(9000) });
    if (!r.ok) return [];
    const j = await r.json();
    return (j.torrents || []).map(t => ({
      name: t.title, magnet: t.magnet_url, hash: t.hash, size: parseInt(t.size_bytes, 10) || 0, seeders: t.seeds || 0,
    })).filter(t => isEnglishOnly(t.name));
  } catch { return []; }
}

async function getStreams(id, type, season, episode) {
  try {
    const isSeries = type === 'tv' || type === 'series';
    const meta = await tmdbMeta(id, isSeries);
    if (!meta) return [];
    const title = meta.title || meta.name || '';
    const year = (meta.release_date || meta.first_air_date || '').split('-')[0] || '';
    const imdb = meta.external_ids?.imdb_id || meta.imdb_id;

    const out = [];

    // Parallel fan-out
    const [sbs, iview, tgx, eztv] = await Promise.all([
      searchSBS(title),
      searchIView(title),
      searchTGx(title, year, season, episode, isSeries),
      isSeries ? searchEZTV(imdb) : Promise.resolve([]),
    ]);

    for (const s of sbs) {
      if (!s.url) continue;
      out.push({
        name: `${PROVIDER_NAME} | SBS`, title: `🇦🇺 SBS On Demand (free, AU geo)\n${s.name}`,
        description: `SBS On Demand — legal free AU stream. Requires AU IP.`,
        size: 'stream', url: s.url, _sort: 5000,
      });
    }
    for (const s of iview) {
      if (!s.url) continue;
      out.push({
        name: `${PROVIDER_NAME} | iView`, title: `🇦🇺 ABC iView (free, AU geo)\n${s.name}`,
        description: `ABC iView — legal free AU stream. Requires AU IP.`,
        size: 'stream', url: s.url, _sort: 4900,
      });
    }
    for (const t of eztv) {
      if (!t.magnet) continue;
      const q = detectQuality(t.name);
      out.push({
        name: `${PROVIDER_NAME} | EZTV ${q}`,
        title: `🌊 EZTV | ${q} | 👤 ${t.seeders}\n${t.name.slice(0, 90)}`,
        description: t.name, size: t.size ? `${(t.size / 1e9).toFixed(2)}GB` : '?',
        url: t.magnet, _sort: 3000 + (QO[q] || 0) * 100 + (t.seeders || 0),
      });
    }
    for (const t of tgx) {
      if (!t.magnet) continue;
      const q = detectQuality(t.name);
      out.push({
        name: `${PROVIDER_NAME} | TGx ${q}`,
        title: `🌊 TorrentGalaxy | ${q}\n${t.name.slice(0, 90)}`,
        description: t.name, size: t.size ? `${(t.size / 1e9).toFixed(2)}GB` : '?',
        url: t.magnet, _sort: 2500 + (QO[q] || 0) * 100,
      });
    }

    out.sort((a, b) => b._sort - a._sort);
    out.forEach(o => delete o._sort);
    return out;
  } catch (e) { console.error('AU-LongTail error:', e); return []; }
}

if (typeof module !== 'undefined' && module.exports) module.exports = { getStreams };
else global.getStreams = getStreams;
