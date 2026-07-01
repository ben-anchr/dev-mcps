#!/usr/bin/env bash
# Scaffold a new vendored MCP server fork.
# Usage: ./scripts/new-fork.sh <name> <upstream-git-url> [<upstream-tag-or-branch>]
set -euo pipefail

NAME="${1:?usage: $0 <name> <upstream-url> [<ref>]}"
UPSTREAM_URL="${2:?usage: $0 <name> <upstream-url> [<ref>]}"
REF="${3:-main}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$ROOT/servers/$NAME"
TMP="/tmp/dev-mcps-import-${NAME}"

if [[ -d "$DEST" ]]; then
  echo "servers/$NAME already exists" >&2
  exit 1
fi

export PATH="${HOME}/Library/Python/3.9/bin:${PATH}"

rm -rf "$TMP"
git clone "$UPSTREAM_URL" "$TMP"
cd "$TMP"
if [[ "$REF" != "main" && "$REF" != "master" ]]; then
  git checkout "$REF"
fi
git filter-repo --to-subdirectory-filter "servers/${NAME}" --force

cd "$ROOT"
git remote add "import-${NAME}" "$TMP"
git fetch "import-${NAME}"
git merge "import-${NAME}/main" --allow-unrelated-histories -m "import: add ${NAME} from ${UPSTREAM_URL} @ ${REF}"
git remote remove "import-${NAME}"

cat > "$DEST/UPSTREAM.md" <<EOF
# Upstream

- **URL:** ${UPSTREAM_URL}
- **Pinned ref:** ${REF}
- **Imported:** $(date +%Y-%m-%d)
- **Last sync:** $(date +%Y-%m-%d)

## Sync

\`\`\`bash
./scripts/sync-upstream.sh ${NAME}
\`\`\`
EOF

cat > "$DEST/ANCHR.md" <<EOF
# Anchr fork: ${NAME}

Document Anchr-specific changes here (allowlists, read-only hardening, dev defaults).

## Upstream

See [UPSTREAM.md](./UPSTREAM.md).
EOF

echo "Imported servers/${NAME}. Edit ANCHR.md and update FORKS.md + root README.md."
