#!/bin/bash
# Local counterpart to refresh-media.yml's fetch+commit steps. GitHub Actions'
# runner IP gets Cloudflare-blocked on Letterboxd's favorites/watchlist/
# diary-poster scrape (see the retry/fallback comments in fetch-media.mjs),
# so this is meant to run on a schedule from a real residential network
# instead (via launchd — see ~/Library/LaunchAgents/com.aselling.refresh-media.plist)
# to pick up what CI silently can't.
set -euo pipefail
cd "$(dirname "$0")/.."

# launchd doesn't run an interactive shell, so ~/.zshrc (where nvm normally
# gets sourced) never runs — load it directly instead of hardcoding a node
# version path that'd go stale the next time `nvm install` changes default.
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

npm run fetch:media

if git diff --quiet -- src/data/goodreads.json src/data/letterboxd.json src/data/github.json; then
  echo "$(date): no media changes."
  exit 0
fi

git add src/data/goodreads.json src/data/letterboxd.json src/data/github.json
git commit -m "data: refresh goodreads/letterboxd/github snapshots"
git push
echo "$(date): pushed media refresh."
