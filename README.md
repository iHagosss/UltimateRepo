# Ultimate Nuvio Repo

**Manifest URL (paste into Nuvio):**
```
https://raw.githubusercontent.com/iHagosss/UltimateRepo/main/manifest.json
```

## What this is
Every working English-supporting Nuvio scraper on Earth, de-duplicated, ordered by hit-rate for orphaned/rare content. Auto-updated every 6 hours from upstream repos via GitHub Actions.

## Hit-rate ordering
Providers run in this order (Nuvio queries them all in parallel but ranks results by provider index):

1. **Debrid cache pools** — `Zilean`, `DMM-Direct`, `TorBox-Search`, `StremThru`, `Debridio`, `Comet`
   - This is where orphaned content lives. If ANY debrid user (RD/AD/TorBox/Premiumize) has ever downloaded the title, its hash is cached and playable instantly regardless of current seeders.
2. **Your private trackers** — `Jackett/Prowlarr`
   - Paste your own Jackett URL + API key in the provider settings. Enables PTP/BTN/AvistaZ/private results.
3. **AU-LongTail specialty** — SBS On Demand + ABC iView (legal free, AU geo) + EZTV + TorrentGalaxy. Purpose-built for the "Small Time Gangster" benchmark.
4. **Torrent aggregators** — MediaFusion, Jackettio, KnightCrawler, Torrentio+, Torrentio, BitSearch
5. **Premium indexes** — XPass, PlayIMDb, ShowBox, VidSrc, VidLink, VidEasy, VidFast, VidRock, VidNest, VixSrc, Cineby, etc.
6. **DDL / rehost networks** — 4KHDHub, UHDMovies, HDHub4u, MoviesMod, MoviesDrive, VegaMovies, Dahmermovies, etc.
7. **Anime** — HiAnime, AnimePahe, Animetsu, AnimeKai, etc.

## Benchmark: Small Time Gangster (2011, AU, Movie Extra)
This show is **genuinely orphaned**:
- Not on Netflix (any region, currently), Prime, Stan, Binge, iView, SBS, 7plus, 9now, 10play
- Not on the Internet Archive
- Zero seeded public torrents

**Only reachable via:**
- **A private tracker** (PTP / BTN / AvistaZ have it) — wire your credentials into `Jackett/Prowlarr` provider settings
- **A DMM community-cached hash** — the `DMM-Direct` + `Zilean` + `TorBox-Search` providers will surface it if anyone has ever pulled it through debrid
- **Umbrella Entertainment Region 4 DVD** (Australia, ~AUD$20) — rip it yourself

If none of the above apply, no scraper on Earth can produce a playable stream for this title. It's a supply problem, not a scraper problem.

## TorBox setup
Open the `TorBox Search` provider settings, paste your API key. All torrent results across every provider will then check TorBox cache and play instantly when cached.

## Jackett / Prowlarr setup (for private trackers)
Open the `Jackett/Prowlarr` provider settings:
- `jackett_url`: your instance URL (e.g. `http://192.168.1.100:9117`)
- `jackett_api_key`: from Jackett Dashboard → top-right
- `jackett_indexers`: `all` or comma-separated Jackett indexer IDs

## Auto-update
- `.github/workflows/auto-update.yml` runs every 6 hours
- Pulls latest provider JS files from `D3adlyRocket/All-in-One-Nuvio` and `yoruix/nuvio-providers`
- Bumps `manifest.json` version stamp and commits

## Filters
- **English audio only**: every provider hard-filters out Hindi/Tamil/Telugu/Korean/Japanese/Spanish-Latin/French/etc unless the release tag also includes MULTI/DUAL/ENG
- **De-duplicated**: same infohash across providers only appears once in Nuvio's merged stream list

## Providers (63)
See `manifest.json` for the current list.
