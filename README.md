# dev-mcps

Anchr-maintained forks of third-party MCP servers for **local development only**.
Each server lives under `servers/<name>/` with its own toolchain, upstream tracking,
and Anchr-specific hardening (allowlists, read-only surfaces, etc.).

> **Owner:** [`ben-anchr/dev-mcps`](https://github.com/ben-anchr/dev-mcps) today;
> will transfer to [`anchr-ai`](https://github.com/anchr-ai) once the layout stabilizes.

## Servers

| Server | Path | Upstream | Pinned | Anchr changes |
|--------|------|----------|--------|---------------|
| WhatsApp | [`servers/whatsapp/`](servers/whatsapp/) | [`anchr-ai/whatsapp-dev-mcp`](https://github.com/anchr-ai/whatsapp-dev-mcp) → `verygoodplugins/whatsapp-mcp` | `main` (imported 2026-07-01) | Read-only tools, chat allowlist — see [`ANCHR.md`](servers/whatsapp/ANCHR.md) |
| Supabase | [`servers/supabase/`](servers/supabase/) | [`supabase/mcp`](https://github.com/supabase/mcp) | `mcp-server-supabase-v0.8.2` | `anchr-policy.json` per-project SQL + tool allowlists — see [`ANCHR.md`](servers/supabase/ANCHR.md) |

See [`FORKS.md`](FORKS.md) for upstream sync policy and version pins.

## Quick start

### WhatsApp

```bash
cd servers/whatsapp
cp .env.example .env
# edit .env, then:
make run
```

Full runbook: [`servers/whatsapp/ANCHR.md`](servers/whatsapp/ANCHR.md)

### Supabase (stdio)

```bash
cd servers/supabase
pnpm install
pnpm --filter @supabase/mcp-server-supabase exec tsx \
  packages/mcp-server-supabase/src/transports/stdio.ts \
  --read-only --project-ref=<ref> --features=database,docs
```

Requires `SUPABASE_ACCESS_TOKEN` in the environment.

## Cursor / Claude MCP config

Example multi-server config: [`configs/cursor.mcp.example.json`](configs/cursor.mcp.example.json)

Paths in the example are relative to the **dev-mcps repo root** (works when
`dev-mcps` is a workspace folder). For a global Cursor `mcp.json`, use absolute
paths to `servers/<name>/…` on your machine.

## Adding a new fork

```bash
./scripts/new-fork.sh <name> <upstream-git-url> [<upstream-tag>]
```

## Syncing upstream

```bash
./scripts/sync-upstream.sh whatsapp
./scripts/sync-upstream.sh supabase
```
