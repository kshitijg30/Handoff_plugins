#!/usr/bin/env bash
# Handoff one-command installer. Run via:
#   curl -fsSL https://raw.githubusercontent.com/kshitijg30/Handoff_plugins/main/install.sh | bash -s -- <claude|cursor|codex> [HANDOFF_API_KEY] [HANDOFF_API_URL]
#
# HANDOFF_API_KEY and HANDOFF_API_URL are now both optional:
# - HANDOFF_API_URL defaults to the hosted backend inside the plugin itself; only pass it if
#   you're self-hosting a different backend.
# - HANDOFF_API_KEY, if you pass it here, only gets written to your shell profile as a legacy
#   fallback -- the recommended way to register a key is `/org add <name> <api-key>` inside your
#   agent AFTER installing (Claude Code/Cursor/Codex, whichever this installs for), since that
#   goes into ~/.handoff/orgs.json directly and needs no shell restart, no env var, and works
#   even if this process's shell profile edit never reaches wherever your agent actually runs
#   from (a GUI-launched terminal, an IDE-embedded one, etc. often don't source .zshrc/.bashrc).
#
# Idempotent: safe to re-run, never overwrites config that's already there.
set -euo pipefail

CLIENT="${1:-}"
API_KEY="${2:-}"
API_URL="${3:-}"
REPO="kshitijg30/Handoff_plugins"

if [ -z "$CLIENT" ]; then
  echo "Usage: install.sh <claude|cursor|codex> [HANDOFF_API_KEY] [HANDOFF_API_URL]" >&2
  exit 1
fi

case "${SHELL:-}" in
  */bash) RC_FILE="$HOME/.bashrc" ;;
  *) RC_FILE="$HOME/.zshrc" ;;
esac

# Legacy fallback only -- registering via `/org add` after install is the primary path now (see
# header comment). Only runs at all if a key was actually passed in.
persist_env() {
  if [ -z "$API_KEY" ]; then
    return 0
  fi
  if ! grep -q "HANDOFF_API_KEY" "$RC_FILE" 2>/dev/null; then
    {
      echo ""
      echo "# Added by Handoff installer (legacy fallback -- prefer \`/org add\` instead)"
      [ -n "$API_URL" ] && echo "export HANDOFF_API_URL=\"$API_URL\""
      echo "export HANDOFF_API_KEY=\"$API_KEY\""
    } >> "$RC_FILE"
    echo "Added HANDOFF_API_KEY to $RC_FILE as a fallback (a new shell/restart is needed for it to take effect)."
  else
    echo "$RC_FILE already sets HANDOFF_API_KEY — leaving it alone (update it by hand if the key changed)."
  fi
}

# Clones $REPO to $1, or fast-forward pulls if it's already there. Refuses to
# touch the path if it exists and isn't our own clone, rather than deleting
# unknown content.
clone_or_update() {
  local target="$1"
  if [ -d "$target/.git" ]; then
    git -C "$target" pull --ff-only --quiet
  elif [ -e "$target" ]; then
    echo "Error: $target already exists and isn't a Handoff clone. Remove or rename it, then re-run." >&2
    exit 1
  else
    mkdir -p "$(dirname "$target")"
    git clone --quiet "https://github.com/$REPO" "$target"
  fi
}

case "$CLIENT" in
  claude)
    persist_env
    claude plugin marketplace add "$REPO"
    claude plugin install handoff
    echo "Claude Code: plugin installed."
    echo "Start a new session, then run: /org add <a-name-you-choose> <your-handoff-api-key>"
    echo "(get a key from your org's Handoff dashboard: org switcher -> Connect tab -> Generate API key)"
    ;;

  cursor)
    persist_env
    clone_or_update "$HOME/.handoff"
    # Cursor's local-plugins folder expects the plugin's own root (containing
    # .cursor-plugin/plugin.json) directly, one level below where the repo's
    # marketplace.json lives -- symlink so `git pull` in ~/.handoff keeps it current.
    mkdir -p "$HOME/.cursor/plugins/local"
    ln -sfn "$HOME/.handoff/plugin" "$HOME/.cursor/plugins/local/handoff"
    echo "Cursor: plugin linked at ~/.cursor/plugins/local/handoff. Reload Cursor, then either:"
    echo "  - run /org add <a-name-you-choose> <your-handoff-api-key> in a Cursor chat (recommended), or"
    echo "  - open Plugins -> Handoff -> Configure and paste in HANDOFF_API_KEY there instead"
    echo "    (HANDOFF_API_URL can stay blank -- it defaults to the hosted backend)."
    ;;

  codex)
    persist_env
    clone_or_update "$HOME/.handoff"

    mkdir -p "$HOME/.codex/prompts"
    cp "$HOME/.handoff/plugin/commands/"*.md "$HOME/.codex/prompts/"

    CONFIG_TOML="$HOME/.codex/config.toml"
    touch "$CONFIG_TOML"
    if ! grep -q "\[mcp_servers.handoff\]" "$CONFIG_TOML"; then
      {
        echo ""
        echo "[mcp_servers.handoff]"
        echo "command = \"node\""
        echo "args = [\"$HOME/.handoff/plugin/mcp-server/index.js\"]"
        echo "env_vars = [\"HANDOFF_API_URL\", \"HANDOFF_API_KEY\"]"
      } >> "$CONFIG_TOML"
      echo "Added [mcp_servers.handoff] to $CONFIG_TOML"
    else
      echo "$CONFIG_TOML already has [mcp_servers.handoff] — leaving it alone."
    fi

    HOOKS_JSON="$HOME/.codex/hooks.json"
    if [ ! -f "$HOOKS_JSON" ]; then
      cp "$HOME/.handoff/plugin/hooks/codex-hooks.json" "$HOOKS_JSON"
      echo "Wrote auto-checkpoint hook to $HOOKS_JSON"
    else
      echo "$HOOKS_JSON already exists — not overwriting it. Merge the Stop entry from"
      echo "plugin/hooks/codex-hooks.json in by hand if you want auto-checkpoint-on-stop."
    fi
    echo "Codex: done. Slash commands are in ~/.codex/prompts, MCP server is configured."
    echo "Start a new Codex session, then run: /org-add <a-name-you-choose> <your-handoff-api-key>"
    ;;

  *)
    echo "Unknown client: $CLIENT (expected claude, cursor, or codex)" >&2
    exit 1
    ;;
esac
