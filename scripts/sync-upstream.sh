#!/usr/bin/env bash
# Sync a vendored server from its upstream remote.
# Usage: ./scripts/sync-upstream.sh <whatsapp|supabase>
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SERVER="${1:?usage: $0 <whatsapp|supabase>}"

case "$SERVER" in
  whatsapp)
    PREFIX="servers/whatsapp"
    UPSTREAM_URL="https://github.com/anchr-ai/whatsapp-dev-mcp.git"
    UPSTREAM_BRANCH="main"
    ;;
  supabase)
    PREFIX="servers/supabase"
    UPSTREAM_URL="https://github.com/supabase/mcp.git"
    UPSTREAM_BRANCH="main"
    echo "Note: review upstream changes before syncing supabase; pin to a tag after merge."
    ;;
  *)
    echo "Unknown server: $SERVER" >&2
    exit 1
    ;;
esac

cd "$ROOT"

if ! git remote get-url "upstream-${SERVER}" &>/dev/null; then
  git remote add "upstream-${SERVER}" "$UPSTREAM_URL"
fi

git fetch "upstream-${SERVER}" "$UPSTREAM_BRANCH"
git subtree pull --prefix="$PREFIX" "upstream-${SERVER}" "$UPSTREAM_BRANCH" -m "chore(${SERVER}): sync upstream"

echo "Synced ${SERVER}. Update FORKS.md and servers/${SERVER}/UPSTREAM.md with the new ref."
