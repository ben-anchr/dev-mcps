# AGENTS.md

Guidance for coding agents (and humans) working in `dev-mcps`.

## What this repo is

Anchr-maintained **forks of third-party MCP servers for local development only**.
Each server is vendored under `servers/<name>/` with its own toolchain, upstream
tracking (`UPSTREAM.md`), and Anchr-specific hardening documented in `ANCHR.md`.
See [`README.md`](README.md) for the server list and [`FORKS.md`](FORKS.md) for
the upstream-sync policy and version pins.

This is **not** a place for new product code — it exists to keep our MCP forks
patched, permission-gated, and reproducible for dev use.

## Layout

```
servers/<name>/        vendored fork (own toolchain + git history)
  UPSTREAM.md          canonical upstream URL + pinned ref
  ANCHR.md             what we changed and why (never edit upstream README for this)
scripts/               cross-server repo operations
  new-fork.sh          scaffold a new vendored fork (git filter-repo import)
  sync-upstream.sh     pull a server's upstream (git subtree)
configs/               example MCP client config (cursor.mcp.example.json)
Makefile               root dev ergonomics (init/up/down/per-server/test/sync)
.github/workflows/     CI (per-server jobs)
```

Servers are polyglot on purpose: WhatsApp is Go (bridge) + Python (MCP server);
Supabase is a TypeScript pnpm workspace. Keep each server's toolchain self-contained.

## Common tasks

Run everything from the repo root via the Makefile:

```bash
make init        # install deps for every server (one-time)
make up          # start long-running dev processes (WhatsApp bridge)
make down        # stop them
make whatsapp    # run the WhatsApp bridge in the foreground
make supabase    # run the Supabase MCP server (stdio) in the foreground
make test        # run every server's test suite (CI parity)
make help        # list root targets
```

Per-server operational targets live in the server itself:

```bash
make -C servers/whatsapp help    # bridge / allowlist / doctor targets
```

Supabase-specific commands (pnpm scripts, `anchr-policy.json`) are documented in
[`servers/supabase/ANCHR.md`](servers/supabase/ANCHR.md).

### Toolchain notes

- **Supabase pins pnpm 10** (`servers/supabase/mise.toml`). A newer global pnpm
  (v11) errors on the vendored build-script config. Use `mise`/`corepack`, or
  override the Makefile's pnpm: `make init PNPM="mise exec -- pnpm"`.
- Supabase unit tests need `@supabase/mcp-utils` built first (`pnpm --filter
  @supabase/mcp-utils build`); `make test` does this for you.

## Adding a new fork

```bash
./scripts/new-fork.sh <name> <upstream-git-url> [<upstream-tag-or-branch>]
```

Then:

1. Edit `servers/<name>/ANCHR.md` with the Anchr-specific rationale/changes.
2. Add the pin row to [`FORKS.md`](FORKS.md) and the table in [`README.md`](README.md).
3. Add the server to this repo's tooling:
   - a per-server target in the root `Makefile` (mirror `whatsapp` / `supabase`),
   - a CI job in `.github/workflows/ci.yml`,
   - a `sync-<name>` case in `scripts/sync-upstream.sh` + a `sync-<name>` Make target,
   - an entry in `configs/cursor.mcp.example.json` if it's client-launchable.
4. Register it in your local Cursor/Claude MCP config.

## Extending the Makefile

- Keep root targets **cross-server**; put server-specific logic in the server's
  own `Makefile`/scripts and delegate with `$(MAKE) -C servers/<name> <target>`.
- New servers get a foreground run target named after the server, and hook into
  `init`/`up`/`down`/`test` as appropriate (only add to `up`/`down` if the server
  has a long-running daemon — stdio servers don't).

## Conventions

- **Never commit secrets or private local config.** Gitignored: `.env`,
  `servers/whatsapp/chat-allowlist.txt`, `servers/supabase/anchr-policy.json`,
  `*.pem`. Only commit the `*.example.*` templates.
- Anchr changes are **squashed commits on top of preserved upstream history** —
  document them in `ANCHR.md`, not by rewriting upstream files' intent.
- `main` is protected: changes go through a PR with **1 approving review** and
  both CI checks (`whatsapp`, `supabase`) green. Admins can bypass in a pinch,
  but prefer the PR path.
