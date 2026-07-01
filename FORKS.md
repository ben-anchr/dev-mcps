# Fork inventory & upstream sync

## Policy

- Each server under `servers/<name>/` is a **vendored fork** with preserved git history.
- `UPSTREAM.md` in each server folder records the canonical upstream URL and pinned ref.
- Anchr-specific changes are documented in `ANCHR.md` (never mixed into upstream README).
- Sync intentionally: read upstream changelog, run server tests, update pin in this file.

## Inventory

### `servers/whatsapp`

| Field | Value |
|-------|-------|
| Immediate source | `anchr-ai/whatsapp-dev-mcp` @ import |
| Ultimate upstream | `verygoodplugins/whatsapp-mcp` → `lharries/whatsapp-mcp` |
| Imported | 2026-07-01 |
| Anchr pin | `main` at merge `49de330` |
| Last sync | 2026-07-01 (initial monorepo import) |

### `servers/supabase`

| Field | Value |
|-------|-------|
| Upstream | `https://github.com/supabase/mcp` |
| Pinned tag | `mcp-server-supabase-v0.8.2` (`b9b1177`) |
| Packages | `mcp-server-supabase@0.8.2`, `mcp-utils@0.5.1`, `mcp-server-postgrest@0.1.1` |
| Imported | 2026-07-01 |
| Last sync | 2026-07-01 (initial monorepo import) |
| Planned Anchr work | Per-project + per-tool allowlists, read/write gates |

## Sync commands

```bash
# WhatsApp — pull from anchr-ai fork (or verygoodplugins upstream)
./scripts/sync-upstream.sh whatsapp

# Supabase — pull from supabase/mcp at pinned tag or newer tag after review
./scripts/sync-upstream.sh supabase
```

After syncing, update the pin table above and each server's `UPSTREAM.md`.
