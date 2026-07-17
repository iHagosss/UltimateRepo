# Ultimate Nuvio Repo

**English • Broadest • Cache-First • Auto-Updating**

The most complete English-supporting Nuvio scraper set — cache-first debrid aggregators ordered FIRST to solve the 0-seeder problem. Real-Debrid / TorBox / Premiumize / AllDebrid cached streams play instantly regardless of live seeders.

**Benchmark:** Small Time Gangster (Australian mini-series, 2011). Every ordinary scraper returns 0-seed torrents. This repo hits it through DMM/Zilean, Comet cached, TorBox search, and Jackettio's 20+ indexer coverage.

## Install URL

```
https://raw.githubusercontent.com/iHagosss/UltimateRepo/main/manifest.json
```

Paste in **Nuvio → Settings → Plugins → Add Repository**, refresh, then enable providers.

## What's inside (55 scrapers)

### 🟢 Cache-first debrid aggregators (NEW — ordered first)
These solve the 0-seeder problem by returning debrid-cached streams.

| # | Provider | What it hits |
|---|----------|--------------|
| 1 | **StremThru** | Meta-aggregator (Torrentio+MediaFusion+Comet) — one call, widest catalog |
| 2 | **Comet** | RD / TorBox / PM / AD / DebridLink cached-first (fastest single scraper) |
| 3 | **MediaFusion** | Broadest torrent index with cache flags |
| 4 | **TorBox Search** | TorBox's own cache index (paste API key in settings) |
| 5 | **Zilean (DMM Cache)** | DebridMediaManager hashlist — largest RD-cache community catalog |
| 6 | **Debridio** | Native TorBox / RD cache checker |
| 7 | **Jackettio** | 20+ public indexers (1337x/BitSearch/RARBG/TPB/YTS/EZTV/TorrentGalaxy/Nyaa/Solid) |
| 8 | **KnightCrawler** | Torrentio-alt with different indexer coverage |
| 9 | **Torrentio+** | Torrentio with EVERY indexer enabled + English/Multi filter |
| 10 | **BitSearch** | Direct scrape fallback for very obscure content |

### 🟡 Classic Nuvio scrapers (kept from upstream)

- **Torrent aggregators:** Torrentio, NoTorrent, XPass, PlayIMDb.
- **Premium indexes:** VidSrc, VidLink, VidEasy, VidFast, VidRock, Vidnest, VixSrc, Cineby, ShowBox, Lordflix.
- **HD direct-link sites:** 4KHDHub, 4KHDHub-NEW, UHDMovies, HDHub4u, MoviesMod, MoviesDrive, Movies4u, VegaMovies, Dahmermovies, Dahmermovies-TV, StreamFlix, YFlix.
- **Multi-source / regional (English tracks only):** NetMirror, MovieBox, MovieBlast, MoviesHunt, CTGMovies, FibWatch, AllMovieLand, DooFlix, Peachify, CinemaCity, Castle, CineFreak, CineMM, Cinevibe, GoatAPI.
- **Anime:** HiAnime, AnimePahe, Animetsu, AnimeKai, AnikotoTV, AllAnime, AllWish, AniZone, VidnestAnime.
- **Cartoons:** TopCartoons.

### Removed (bloat / non-English)
GramCinema, HindMoviez, ZinkMovies, MoviesHunt (Hindi-only bloat), AnimeWorld, AnimeSalt (Hindi-dub anime), OneTouchTV (Asian drama with subs only), AniDB, Kurage (dead endpoints), Movix, Nakios, PurStream, Toflix (duplicates/dead).

## Why this beats every prior repo

1. **Cache-first ordering** — Nuvio queries top → bottom, so debrid-cached streams (which play instantly regardless of seeders) surface before dead torrents.
2. **DMM Hashlist (Zilean)** — the single most complete cached-hash catalog on Earth. Almost every obscure title with even one prior RD user is in there.
3. **Jackettio all-public-indexers config** — pre-baked base64 config queries 20+ public indexers in a single call.
4. **TorBox native search** — bypasses the Stremio addon layer entirely, queries TorBox cache directly.
5. **Torrentio+** — enables `rutor / magnetdl / torrentgalaxy / zooqle / limetorrents / glodls / btdig / torlock` (default Torrentio hides these).

## Self-updating

`.github/workflows/auto-update.yml` runs **every 6 hours**:
1. Pulls latest `.js` for upstream providers (D3adlyRocket + yoruix + phisher).
2. Cache-first providers are **locally-maintained** — endpoints are refreshed only when public instances change (manual PR).
3. Bumps `manifest.version` and pushes on any diff.
4. Nuvio refetches the manifest on each app open — users always run the newest logic.

## Debrid setup (essential)

Enable in each provider's **Settings** (⚙️ next to the scraper):
- **Torrentio / Torrentio+ / Comet** — Real-Debrid or TorBox or Premiumize API key.
- **TorBox Search** — TorBox API key (in provider settings as `torboxApiKey`).
- **Zilean** — no key needed (public cache lookup); play requires debrid.

**Without a debrid account, 0-seeder torrents will still fail.** With TorBox ($5/mo) or Real-Debrid (~€3/mo), the benchmark plays instantly.

## Hosting yourself in 3 steps

1. Create a **public** GitHub repo.
2. `git init && git add . && git commit -m "init" && git remote add origin <repo> && git push -u origin main`
3. In Nuvio, paste `https://raw.githubusercontent.com/<you>/<repo>/main/manifest.json`.

Auto-update runs on GitHub's own runners — nothing for you to maintain.

## Credits

- **Cache-first providers** — Ultimate (this repo), wrapping public instances of:
  - Comet by [g0ldyy](https://github.com/g0ldyy/comet)
  - MediaFusion by [mhdzumair](https://github.com/mhdzumair/MediaFusion)
  - Jackettio by [arvida42](https://github.com/arvida42/jackettio)
  - StremThru by [MunifTanjim](https://github.com/MunifTanjim/stremthru)
  - Zilean by [iPromKnight](https://github.com/iPromKnight/zilean)
  - Debridio by adobotec
  - KnightCrawler by the KnightCrawler team
- **Classic Nuvio scrapers** — © original authors at `D3adlyRocket/All-in-One-Nuvio` and `yoruix/nuvio-providers`.

This repo aggregates + de-dupes + reorders + auto-updates. Scraping logic of upstream providers is not modified.
