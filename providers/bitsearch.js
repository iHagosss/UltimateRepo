'use strict';
/*
 * BitSearch - public torrent meta-search across 20+ indexers.
 * Excellent fallback for obscure/older content when addons miss.
 * Direct scrape (JSON API).
 */
const TMDB_API_KEY = '1865f43a0549ca50d341dd9ab8b29f49';
const PROVIDER_NAME = 'BitSearch';

const HEADERS = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36' };
const QO = { '2160p': 4, '1080p': 3, '720p': 2, '480p': 1 };
const TRACKERS = [
  'udp://tracker.opentrackr.org:1337/announce',
  'udp://open.stealth.si:80/announce',
  'udp://tracker.torrent.eu.org:451/announce',
  'udp://exodus.desync.com:6969/announce',
];

function magnet(hash) {
  if (!hash) return '';
  return `magnet:?xt=urn:btih:${hash}${TRACKERS.map(t => `&tr=${encodeURIComponent(t)}`).join('')}`;
}

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
      query = year ? `${title} ${year}` : title;
    }

    const url = `https://bitsearch.to/search?q=${encodeURIComponent(query)}&sort=seeders&order=desc`;
    const r = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(10000) });
    if (!r.ok) return [];
    const html = await r.text();

    // Parse card blocks (name, magnet, size, seeders)
    const out = [];
    const cardRe = /<li class="card search-result[^"]*"[^>]*>([\s\S]*?)<\/li>/gi;
    let m;
    let count = 0;
    while ((m = cardRe.exec(html)) && count < 15) {
      const block = m[1];
      const name = ((block.match(/<h5[^>]*><a[^>]*>([^<]+)</) || [])[1] || '').trim();
      const hash = ((block.match(/magnet:\?xt=urn:btih:([A-Fa-f0-9]+)/) || [])[1] || '').trim();
      const size = ((block.match(/<div class="stats[^"]*"[^>]*>[\s\S]*?<div>([\d.]+\s?[GM]B)/) || [])[1] || '?').trim();
      const seeders = parseInt(((block.match(/<div class="stats[^"]*"[^>]*>[\s\S]*?<font color=[^>]+>(\d+)</) || [])[1] || 0));
      if (!hash || !name) continue;
      const q = detectQuality(name);
      const streamName = `${PROVIDER_NAME} | ${q}`;
      const streamTitle = `🔎 ${q} | 👤 ${seeders} | 💾 ${size}\n${name.slice(0, 90)}`;
      out.push({
        name: streamName, title: streamTitle, description: streamTitle,
        size, url: magnet(hash),
        _sort: (QO[q] || 0) * 10000 + seeders,
      });
      count++;
    }
    out.sort((a, b) => b._sort - a._sort);
    out.forEach(o => delete o._sort);
    return out;
  } catch (e) { console.error('BitSearch error:', e); return []; }
}

if (typeof module !== 'undefined' && module.exports) module.exports = { getStreams };
else global.getStreams = getStreams;
