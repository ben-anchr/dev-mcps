# Anchr fork: Supabase MCP

Baseline import of [`supabase/mcp`](https://github.com/supabase/mcp) for local stdio
use with dev projects. Not a replacement for the hosted `https://mcp.supabase.com/mcp`
endpoint — this fork is for customizing tool surfaces and permission gates.

## Anchr policy (`anchr-policy.json`)

Upstream exposes **server-wide** flags only: `--read-only`, `--project-ref`, and
`--features`. That is not enough when one MCP connection can reach multiple projects
with different blast radii.

This fork adds **`anchr-policy.json`** — a fail-closed JSON file loaded via
`--policy-file` or `ANCHR_MCP_POLICY_FILE`.

Copy [`anchr-policy.example.json`](./anchr-policy.example.json) to
`anchr-policy.json` (gitignored) and list each Supabase **project ref**:

| `sql` value | Meaning |
|-------------|---------|
| `deny` | No SQL tools for this project |
| `read` | `SELECT` / `EXPLAIN` / read-class `WITH` only; writes rejected before hitting Postgres |
| `write` | Writes allowed (still subject to `--read-only` and tool allowlist) |

Optional per-project `tools` array limits which MCP tools are registered (union
across all listed projects). Use `"tools": "*"` to allow any tool that passes SQL
checks.

When a policy file is loaded, `execute_sql` splits into:

- **`execute_sql_read`** — approval UI shows “Execute SQL (read)”
- **`execute_sql_write`** — approval UI shows “Execute SQL (write)”

Set `"splitSqlTools": false` to keep a single `execute_sql` tool.

### Example

```bash
cd servers/supabase
cp anchr-policy.example.json anchr-policy.json
# edit project refs + access levels

pnpm --filter @supabase/mcp-server-supabase exec tsx \
  packages/mcp-server-supabase/src/transports/stdio.ts \
  --policy-file=anchr-policy.json \
  --features=database,docs
```

### Cursor approval UI / SQL preview

Cursor collapses long tool arguments in the approval card — we cannot force the
full query to display there (client limitation). Mitigations in this fork:

1. **`query` is the first field** in the tool schema (shown before `project_id`)
2. **Split read/write tools** so the tool title conveys intent
3. **stderr log** before execution: `[anchr-mcp] execute_sql_read project=… sql=…`
   (visible in the MCP server output panel)

For the cleanest approval UX, also use **`--project-ref=<one-dev-project>`** so
`project_id` is injected and the card shows mostly the SQL.

### Defense in depth (no code)

You can still run **multiple MCP entries** in Cursor — one stdio server per project
with different `--read-only` / `--features` flags. Combine with `anchr-policy.json`
for execute-time enforcement.

## Dev usage (baseline)

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
