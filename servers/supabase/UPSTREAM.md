# Upstream

- **URL:** https://github.com/supabase/mcp
- **Pinned tag:** `mcp-server-supabase-v0.8.2` (`b9b1177`)
- **Package versions:** `mcp-server-supabase@0.8.2`, `mcp-utils@0.5.1`, `mcp-server-postgrest@0.1.1`
- **Imported:** 2026-07-01
- **Last sync:** 2026-07-01

## Sync

Review upstream release notes before bumping the pin. Prefer tagged releases over `main`.

```bash
# from dev-mcps root
./scripts/sync-upstream.sh supabase
```

After sync, run tests:

```bash
cd servers/supabase
pnpm install
pnpm test
```
