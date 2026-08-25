#!/usr/bin/env bash
# Handoff one-command installer. Run via:
#   curl -fsSL https://raw.githubusercontent.com/kshitijg30/Handoff_plugins/main/install.sh | bash -s -- <claude|cursor|codex> <HANDOFF_API_URL> <HANDOFF_API_KEY>
# Idempotent: safe to re-run, never overwrites config that's already there.
set -euo pipefail

CLIENT="${1:-}"
API_URL="${2:-}"
API_KEY="${3:-}"
REPO="kshitijg30/Handoff_plugins"

if [ -z "$CLIENT" ] || [ -z "$API_URL" ] || [ -z "$API_KEY" ]; then
  echo "Usage: install.sh <claude|cursor|codex> <HANDOFF_API_URL> <HANDOFF_API_KEY>" >&2
  exit 1
fi

case "${SHELL:-}" in
  */bash) RC_FILE="$HOME/.bashrc" ;;
  *) RC_FILE="$HOME/.zshrc" ;;
esac

persist_env() {
  if ! grep -q "HANDOFF_API_URL" "$RC_FILE" 2>/dev/null; then
    {
      echo ""
      echo "# Added by Handoff installer"
      echo "export HANDOFF_API_URL=\"$API_URL\""
      echo "export HANDOFF_API_KEY=\"$API_KEY\""
    } >> "$RC_FILE"
    echo "Added HANDOFF_API_URL/HANDOFF_API_KEY to $RC_FILE"
  else
    echo "$RC_FILE already sets HANDOFF_API_URL — leaving it alone (update it by hand if the key changed)."
  fi
  export HANDOFF_API_URL="$API_URL"
  export HANDOFF_API_KEY="$API_KEY"
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
    echo "Claude Code: done. Start a new session to pick up the env vars."
    ;;

  cursor)
    persist_env
    clone_or_update "$HOME/.handoff"
    # Cursor's local-plugins folder expects the plugin's own root (containing
    # .cursor-plugin/plugin.json) directly, one level below where the repo's
    # marketplace.json lives -- symlink so `git pull` in ~/.handoff keeps it current.
    mkdir -p "$HOME/.cursor/plugins/local"
    ln -sfn "$HOME/.handoff/plugin" "$HOME/.cursor/plugins/local/handoff"
    echo "Cursor: plugin linked at ~/.cursor/plugins/local/handoff. Reload Cursor, then open"
    echo "Plugins -> Handoff -> Configure and paste in HANDOFF_API_URL / HANDOFF_API_KEY"
    echo "(Cursor reads plugin variables from its own config UI, not your shell)."
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
    ;;

  *)
    echo "Unknown client: $CLIENT (expected claude, cursor, or codex)" >&2
    exit 1
    ;;
esac
