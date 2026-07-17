#!/usr/bin/env bash
# Pulls the latest version of every provider .js from its upstream repo.
# Priority: D3adlyRocket/All-in-One-Nuvio (main) -> yoruix/nuvio-providers (main)
# Only overwrites when upstream HTTP 200.
# Cache-first / new providers (comet, mediafusion, stremthru, zilean, debridio, jackettio,
# knightcrawler, torbox-search, torrentio-plus, bitsearch) are locally maintained — skipped.
set -u
cd "$(dirname "$0")/.."

D3="https://raw.githubusercontent.com/D3adlyRocket/All-in-One-Nuvio/refs/heads/main/providers"
YR="https://raw.githubusercontent.com/yoruix/nuvio-providers/refs/heads/main/providers"

# Providers primarily maintained in D3adlyRocket All-in-One
D3_LIST="4khdhub.js 4khdhubnew.js allanime.js allwish.js animekai.js anikototv.js animepahe.js animetsu.js allmovieland.js castle.js cineby.js cinefreak.js cinemm.js cinemacity.js ctgmovies.js dahmermovies.js dahmermovies-4k.js dooflix.js fibwatch.js goatapi.js hdhub4u.js hianime.js lordflix.js moviebox.js movieblast.js moviesdrive.js moviesmod.js movies4u.js netmirror.js notorrent.js peachify.js playimdb.js showbox.js topcartoons.js torrentio.js vidrock.js uhdmovies.js vegamovies.js vidlink.js videasy.js vidsrc.js vixsrc.js vidfast.js xpass.js"

# Providers unique to (or newer in) yoruix
YR_LIST="yflix.js vidnest.js vidnest-anime.js streamflix.js anizone.js cinevibe.js"

# Locally-maintained cache-first providers (do not overwrite)
LOCAL_LIST="comet.js mediafusion.js stremthru.js zilean.js debridio.js jackettio.js knightcrawler.js torbox-search.js torrentio-plus.js bitsearch.js"

fetch() {
  local base="$1"; local f="$2"
  tmp=$(mktemp)
  if curl -sfLo "$tmp" "$base/$f"; then
    if [ -s "$tmp" ]; then
      mv "$tmp" "providers/$f"
      echo "updated: $f"
      return 0
    fi
  fi
  rm -f "$tmp"
  echo "skip:    $f"
  return 1
}

for f in $D3_LIST; do fetch "$D3" "$f" || fetch "$YR" "$f" || true; done
for f in $YR_LIST; do fetch "$YR" "$f" || true; done

echo "Locally-maintained (not overwritten): $LOCAL_LIST"
echo "Done. $(ls providers | wc -l) provider files."
