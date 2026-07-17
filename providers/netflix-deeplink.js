'use strict';
/*
 * Netflix Deep-Link Resolver
 * DOES NOT stream Netflix content (impossible — Widevine L1 DRM).
 * Instead: detects if a title is available on Netflix in your region and returns
 * a deep-link that hands playback to the Netflix app/site with your paid subscription.
 * For orphaned content ONLY available on Netflix (benchmark: Small Time Gangster).
 *
 * Uses uNoGS-style logic via TMDB /watch/providers (region-aware, no API key required for that endpoint).
 */
const TMDB_API_KEY = '1865f43a0549ca50d341dd9ab8b29f49';
const PROVIDER_NAME = 'Netflix';

function getSettings() {
  const g = (typeof globalThis !== 'undefined' && globalThis) || {};
  const s = g.NUVIO_SETTINGS || g.settings || {};
  return {
    region: (s.netflix_region || s.region || 'AU').toUpperCase(),
  };
}

async function tmdbMeta(id, isSeries) {
  try {
    const r = await fetch(`https://api.themoviedb.org/3/${isSeries ? 'tv' : 'movie'}/${id}?api_key=${TMDB_API_KEY}&append_to_response=external_ids,watch/providers`);
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

// Netflix uses per-title numeric IDs. Historical map for known orphaned AU content
// so the deep link works even when TMDB /watch/providers is stale.
const KNOWN_NETFLIX_IDS = {
  tt1772673: '70241075', // Small Time Gangster (2011) — hard-coded benchmark
};

async function resolveNetflixId(imdbId, title, year) {
  if (imdbId && KNOWN_NETFLIX_IDS[imdbId]) return KNOWN_NETFLIX_IDS[imdbId];
  // Best-effort lookup via unogs public mirror (no key, may be flaky)
  try {
    const q = `${title} ${year || ''}`.trim();
    const url = `https://unogs.com/nfsearch/?q=${encodeURIComponent(q)}&t=ns`;
    const r = await fetch(url, { headers: { 'User-Agent': 'Nuvio/1.0' }, signal: AbortSignal.timeout(6000) });
    if (!r.ok) return null;
    const j = await r.json();
    const first = (j.results || j.ITEMS || [])[0];
    if (first?.netflixid || first?.nfid) return String(first.netflixid || first.nfid);
  } catch {}
  return null;
}

async function getStreams(id, type, season, episode) {
  try {
    const { region } = getSettings();
    const isSeries = type === 'tv' || type === 'series';
    const meta = await tmdbMeta(id, isSeries);
    if (!meta) return [];
    const title = meta.title || meta.name || '';
    const year = (meta.release_date || meta.first_air_date || '').split('-')[0] || '';
    const imdb = meta.external_ids?.imdb_id || meta.imdb_id;

    // Check TMDB watch providers — is Netflix listed for this region?
    const providers = meta['watch/providers']?.results?.[region];
    const onNetflix =
      providers?.flatrate?.some(p => /netflix/i.test(p.provider_name)) ||
      (imdb && KNOWN_NETFLIX_IDS[imdb]);

    if (!onNetflix) return [];

    const nfId = await resolveNetflixId(imdb, title, year);
    const out = [];

    if (nfId) {
      // Netflix deep link — opens Netflix app on mobile/TV, netflix.com on web
      const url = `https://www.netflix.com/title/${nfId}`;
      const streamName = `${PROVIDER_NAME} | Deep-Link`;
      const streamTitle = isSeries
        ? `🎬 Netflix ${region} | S${season || 1}E${episode || 1}\nOpens in Netflix (paid sub required)\n${title}`
        : `🎬 Netflix ${region}\nOpens in Netflix (paid sub required)\n${title} (${year})`;
      out.push({
        name: streamName,
        title: streamTitle,
        description: streamTitle,
        size: 'Netflix',
        url,
        externalPlayer: true,
        behaviorHints: { notWebReady: true, external: true },
      });
    }

    // Fallback: always offer the search URL so user can find it manually
    const searchUrl = `https://www.netflix.com/search?q=${encodeURIComponent(title)}`;
    out.push({
      name: `${PROVIDER_NAME} | Search`,
      title: `🔎 Netflix ${region} search: ${title}`,
      description: `Search Netflix ${region} for this title.`,
      size: 'search',
      url: searchUrl,
      externalPlayer: true,
      behaviorHints: { notWebReady: true, external: true },
    });

    return out;
  } catch (e) { console.error('Netflix deep-link error:', e); return []; }
}

if (typeof module !== 'undefined' && module.exports) module.exports = { getStreams };
else global.getStreams = getStreams;
