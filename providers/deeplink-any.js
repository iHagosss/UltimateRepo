'use strict';
/*
 * Streaming-Availability Deep-Link Resolver
 * For every subscription service the user has (Netflix, Stan, Binge, Prime, Disney+, Paramount+,
 * Apple TV+, Plex Watch, SBS On Demand, ABC iView, 7plus, 9now, 10play, Tubi, Pluto),
 * detects if a title is available and returns a deep-link that opens the native app with the user's
 * existing subscription/free access. Solves the "orphaned content" problem: no scraper can beat
 * the actual subscription you already pay for.
 *
 * Uses TMDB /watch/providers (region-aware) as the source of truth.
 */
const TMDB_API_KEY = '1865f43a0549ca50d341dd9ab8b29f49';
const PROVIDER_NAME = 'Deep-Link';

const DEEPLINKS = {
  netflix:      (q) => `https://www.netflix.com/search?q=${encodeURIComponent(q)}`,
  stan:         (q) => `https://www.stan.com.au/search?q=${encodeURIComponent(q)}`,
  binge:        (q) => `https://binge.com.au/search?q=${encodeURIComponent(q)}`,
  amazon:       (q) => `https://www.primevideo.com/search?phrase=${encodeURIComponent(q)}`,
  disney:       (q) => `https://www.disneyplus.com/search?q=${encodeURIComponent(q)}`,
  paramount:    (q) => `https://www.paramountplus.com/shows/search/?searchTerm=${encodeURIComponent(q)}`,
  apple:        (q) => `https://tv.apple.com/search?term=${encodeURIComponent(q)}`,
  plex:         (q) => `https://watch.plex.tv/search?query=${encodeURIComponent(q)}`,
  sbs:          (q) => `https://www.sbs.com.au/ondemand/search/${encodeURIComponent(q)}`,
  iview:        (q) => `https://iview.abc.net.au/search?q=${encodeURIComponent(q)}`,
  '7plus':      (q) => `https://7plus.com.au/search?query=${encodeURIComponent(q)}`,
  '9now':       (q) => `https://www.9now.com.au/search/${encodeURIComponent(q)}`,
  '10play':     (q) => `https://10play.com.au/search?searchTerm=${encodeURIComponent(q)}`,
  tubi:         (q) => `https://tubitv.com/search/${encodeURIComponent(q)}`,
  pluto:        (q) => `https://pluto.tv/en/search/${encodeURIComponent(q)}`,
  hulu:         (q) => `https://www.hulu.com/search?q=${encodeURIComponent(q)}`,
  hbo:          (q) => `https://play.max.com/search?q=${encodeURIComponent(q)}`,
  peacock:      (q) => `https://www.peacocktv.com/search?q=${encodeURIComponent(q)}`,
  crunchyroll:  (q) => `https://www.crunchyroll.com/search?q=${encodeURIComponent(q)}`,
};

const ICONS = {
  netflix: '🎬', stan: '🇦🇺', binge: '🇦🇺', amazon: '📦', disney: '🏰', paramount: '⛰️',
  apple: '🍎', plex: '📺', sbs: '🇦🇺', iview: '🇦🇺', '7plus': '7️⃣', '9now': '9️⃣',
  '10play': '🔟', tubi: '📺', pluto: '🪐', hulu: '🟢', hbo: '👑', peacock: '🦚', crunchyroll: '🍥',
};

function normalizeProviderName(n = '') {
  const s = n.toLowerCase();
  if (s.includes('netflix')) return 'netflix';
  if (s === 'stan' || s.includes('stan.')) return 'stan';
  if (s.includes('binge')) return 'binge';
  if (s.includes('amazon') || s.includes('prime')) return 'amazon';
  if (s.includes('disney')) return 'disney';
  if (s.includes('paramount')) return 'paramount';
  if (s.includes('apple tv')) return 'apple';
  if (s.includes('plex')) return 'plex';
  if (s.includes('sbs')) return 'sbs';
  if (s.includes('iview') || s.includes('abc')) return 'iview';
  if (s.includes('7plus') || s.includes('7 plus')) return '7plus';
  if (s.includes('9now') || s.includes('9 now')) return '9now';
  if (s.includes('10 play') || s.includes('10play')) return '10play';
  if (s.includes('tubi')) return 'tubi';
  if (s.includes('pluto')) return 'pluto';
  if (s.includes('hulu')) return 'hulu';
  if (s.includes('hbo') || s.includes('max')) return 'hbo';
  if (s.includes('peacock')) return 'peacock';
  if (s.includes('crunchy')) return 'crunchyroll';
  return null;
}

function getSettings() {
  const g = (typeof globalThis !== 'undefined' && globalThis) || {};
  const s = g.NUVIO_SETTINGS || g.settings || {};
  return {
    region: (s.deeplink_region || s.region || 'AU').toUpperCase(),
    showSearch: s.deeplink_show_search !== false,
  };
}

async function tmdbMeta(id, isSeries) {
  try {
    const r = await fetch(`https://api.themoviedb.org/3/${isSeries ? 'tv' : 'movie'}/${id}?api_key=${TMDB_API_KEY}&append_to_response=external_ids,watch/providers`);
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

async function getStreams(id, type) {
  try {
    const { region, showSearch } = getSettings();
    const isSeries = type === 'tv' || type === 'series';
    const meta = await tmdbMeta(id, isSeries);
    if (!meta) return [];
    const title = meta.title || meta.name || '';
    const year = (meta.release_date || meta.first_air_date || '').split('-')[0] || '';
    const providers = meta['watch/providers']?.results?.[region] || {};

    const buckets = [
      ...(providers.flatrate || []).map(p => ({ ...p, kind: 'stream' })),
      ...(providers.free || []).map(p => ({ ...p, kind: 'free' })),
      ...(providers.ads || []).map(p => ({ ...p, kind: 'ads' })),
    ];

    const seen = new Set();
    const out = [];
    for (const p of buckets) {
      const key = normalizeProviderName(p.provider_name);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const builder = DEEPLINKS[key];
      if (!builder) continue;
      const url = builder(`${title} ${year}`.trim());
      const icon = ICONS[key] || '📺';
      out.push({
        name: `${PROVIDER_NAME} | ${p.provider_name}`,
        title: `${icon} ${p.provider_name} ${region} (${p.kind})\n${title}${year ? ` (${year})` : ''}`,
        description: `Opens ${p.provider_name} — use your existing subscription.`,
        size: p.provider_name,
        url,
        externalPlayer: true,
        behaviorHints: { notWebReady: true, external: true },
      });
    }

    return out;
  } catch (e) { console.error('Deep-Link error:', e); return []; }
}

if (typeof module !== 'undefined' && module.exports) module.exports = { getStreams };
else global.getStreams = getStreams;
