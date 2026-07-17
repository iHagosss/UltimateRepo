# Ultimate Nuvio Repo

**59 de-duplicated, English-supporting scrapers** covering torrents, premium indexes, HD direct-link sites, anime and Asian drama. Ordered by hit-rate for rare/obscure titles (benchmark: *Small Time Gangster* AU).

## Install URL (once you push to your own GitHub)

```
https://raw.githubusercontent.com/<YOUR-USERNAME>/<YOUR-REPO>/main/manifest.json
```

Paste in **Nuvio → Settings → Plugins → Add Repository**, then refresh and enable providers.

## What's inside

- **Torrent aggregators** (broadest coverage for AU/UK/rare TV): Torrentio (RD/PM/TorBox), NoTorrent, XPass, PlayIMDb.
- **Premium indexes**: VidSrc, VidLink, VidEasy, VidFast, VidRock, Vidnest, VixSrc, Cineby, ShowBox, Lordflix.
- **HD direct-link sites**: 4KHDHub, 4KHDHub-NEW, UHDMovies, HDHub4u, MoviesMod, MoviesDrive, Movies4u, VegaMovies, Dahmermovies, Dahmermovies-TV, StreamFlix, YFlix.
- **Multi-lang / regional (English-supporting)**: NetMirror, MovieBox, MovieBlast, MoviesHunt, ZinkMovies, HindMoviez, CTGMovies, FibWatch, AllMovieLand, DooFlix, GramCinema, Peachify, CinemaCity, Castle, CineFreak, CineMM, Cinevibe.
- **Anime**: HiAnime, AnimePahe, Animetsu, AnimeKai, AnikotoTV, AniDB, AllAnime, AllWish, Kurage, AniZone, VidnestAnime, AnimeWorld, AnimeSalt.
- **Asian drama**: OneTouchTV.
- **Cartoons**: TopCartoons.

Excluded: pure-French, pure-Arabic, pure-Korean, pure-Bengali, pure-Malayalam scrapers (no English audio).

## Self-updating

`.github/workflows/auto-update.yml` runs every 6 hours and pulls the newest `.js` for every provider from its upstream (D3adlyRocket + yoruix). If any provider changes, it bumps `manifest.version` and pushes. Nuvio refetches the manifest on each app open, so users always get the latest scraper logic.

## Hosting yourself in 3 steps

1. Create a new **public** GitHub repo.
2. `git init && git add . && git commit -m "init" && git remote add origin <repo> && git push -u origin main`
3. In Nuvio, paste `https://raw.githubusercontent.com/<you>/<repo>/main/manifest.json`.

That's it. Auto-update runs on GitHub's own runners — nothing for you to maintain.

## Torbox / Real-Debrid / Premiumize

Enable in **Torrentio's** provider settings (Settings icon next to the scraper). Paste your API key — Nuvio caches it locally.

## Credits

Upstream provider code is © their respective authors:
- `D3adlyRocket/All-in-One-Nuvio` — piratezoro9, Xyr0nX, Kabir, Dustincos, Aeyshx, Sanchit, wooodyhood, Gowaru, Michat88, Paregi12, Phisher, Nuvio Team.
- `yoruix/nuvio-providers` — Nuvio Team / tapframe.

This repo only aggregates + de-dupes + auto-updates. No scraping logic modified.
