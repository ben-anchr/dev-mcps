# dev-mcps — root Makefile (cross-server dev ergonomics).
#
# Per-server operational targets live in each server's own tooling:
#   - WhatsApp:  servers/whatsapp/Makefile   (make -C servers/whatsapp help)
#   - Supabase:  servers/supabase/ANCHR.md   (pnpm scripts)
# See AGENTS.md for how this repo is laid out and how to extend it.

SHELL := bash

WHATSAPP_DIR := servers/whatsapp
SUPABASE_DIR := servers/supabase

# Supabase pins pnpm 10 via servers/supabase/mise.toml. If your global pnpm is
# newer (v11 errors on the vendored build-script config), override e.g.:
#   make init PNPM="mise exec -- pnpm"
PNPM ?= pnpm

.DEFAULT_GOAL := help

.PHONY: help init up down whatsapp supabase test \
        sync-whatsapp sync-supabase

help:
	@echo "dev-mcps — root targets"
	@echo ""
	@echo "  make init            install deps for every server (one-time)"
	@echo "  make up              start long-running dev processes (WhatsApp bridge)"
	@echo "  make down            stop long-running dev processes"
	@echo ""
	@echo "  make whatsapp        run the WhatsApp bridge in the foreground"
	@echo "  make supabase        run the Supabase MCP server (stdio) in the foreground"
	@echo ""
	@echo "  make test            run every server's test suite (CI parity)"
	@echo "  make sync-whatsapp   pull upstream into servers/whatsapp"
	@echo "  make sync-supabase   pull upstream into servers/supabase"
	@echo ""
	@echo "  Per-server targets:  make -C $(WHATSAPP_DIR) help"

init:
	@echo "==> Supabase: pnpm install + build @supabase/mcp-utils"
	cd $(SUPABASE_DIR) && $(PNPM) install && $(PNPM) --filter @supabase/mcp-utils build
	@echo "==> WhatsApp: go mod download + uv sync"
	cd $(WHATSAPP_DIR)/whatsapp-bridge && go mod download
	cd $(WHATSAPP_DIR)/whatsapp-mcp-server && uv sync
	@echo ""
	@echo "Next, copy the local templates you need (all gitignored):"
	@echo "  cp $(WHATSAPP_DIR)/.env.example $(WHATSAPP_DIR)/.env"
	@echo "  cp $(WHATSAPP_DIR)/chat-allowlist.example.txt $(WHATSAPP_DIR)/chat-allowlist.txt"
	@echo "  cp $(SUPABASE_DIR)/anchr-policy.example.json $(SUPABASE_DIR)/anchr-policy.json"

# Only the WhatsApp bridge is a long-running daemon. Supabase is stdio and is
# launched on demand by the MCP client (Cursor/Claude), so there's nothing to
# start here for it.
up:
	@echo "==> Starting WhatsApp bridge (background, logs -> $(WHATSAPP_DIR)/bridge.log)"
	@cd $(WHATSAPP_DIR) && nohup $(MAKE) bridge >> bridge.log 2>&1 & echo "bridge started (pid $$!)"
	@echo "Supabase is stdio (client-launched) — no daemon to start."

down:
	@$(MAKE) -C $(WHATSAPP_DIR) kill-bridge

whatsapp:
	$(MAKE) -C $(WHATSAPP_DIR) bridge

supabase:
	cd $(SUPABASE_DIR) && $(PNPM) --filter @supabase/mcp-server-supabase exec tsx \
	  packages/mcp-server-supabase/src/transports/stdio.ts \
	  --policy-file=anchr-policy.json --features=database,docs

test:
	@echo "==> Supabase unit tests"
	cd $(SUPABASE_DIR) && $(PNPM) --filter @supabase/mcp-utils build \
	  && $(PNPM) --filter @supabase/mcp-server-supabase test:unit
	@echo "==> WhatsApp bridge (go test)"
	cd $(WHATSAPP_DIR)/whatsapp-bridge && go test ./...
	@echo "==> WhatsApp MCP server (python syntax check)"
	cd $(WHATSAPP_DIR) && python -m compileall whatsapp-mcp-server

sync-whatsapp:
	./scripts/sync-upstream.sh whatsapp

sync-supabase:
	./scripts/sync-upstream.sh supabase
