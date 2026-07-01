# Anchr fork: Supabase MCP

Baseline import of [`supabase/mcp`](https://github.com/supabase/mcp) for local stdio
use with dev projects. Not a replacement for the hosted `https://mcp.supabase.com/mcp`
endpoint — this fork is for customizing tool surfaces and permission gates.

## Planned Anchr changes

- Per-project scoping beyond a single `project_ref` CLI flag
- Per-tool allowlists (finer than `features=` groups)
- Read/write separation at tool level (e.g. `list_tables` + `execute_sql` read-only without `apply_migration`)

Upstream already provides `read_only`, `project_ref`, and `features` — see
[`README.md`](./README.md).

## Dev usage

```bash
cd servers/supabase
pnpm install
export SUPABASE_ACCESS_TOKEN=...
pnpm --filter @supabase/mcp-server-supabase exec tsx \
  packages/mcp-server-supabase/src/transports/stdio.ts \
  --read-only --project-ref=<ref> --features=database,docs
```

## Upstream

See [UPSTREAM.md](./UPSTREAM.md).
