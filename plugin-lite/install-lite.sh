#!/usr/bin/env bash
# Handoff lite installer -- no Node, no MCP server, no disk-read hooks. This writes one small
# config file and copies slash-command prompt files that tell the agent to `curl` the Handoff
# API directly. Works identically on macOS/Linux/WSL/git-bash; see install-lite.ps1 for native
# Windows PowerShell.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/kshitijg30/Handoff_plugins/main/install-lite.sh \
#     | bash -s -- <claude|cursor|codex> <HANDOFF_API_URL> <HANDOFF_API_KEY>
set -euo pipefail

CLIENT="${1:-}"
API_URL="${2:-}"
API_KEY="${3:-}"
REPO="kshitijg30/Handoff_plugins"
RAW="https://raw.githubusercontent.com/$REPO/main/plugin-lite"

if [ -z "$CLIENT" ] || [ -z "$API_URL" ] || [ -z "$API_KEY" ]; then
  echo "Usage: install-lite.sh <claude|cursor|codex> <HANDOFF_API_URL> <HANDOFF_API_KEY>" >&2
  exit 1
fi

mkdir -p "$HOME/.handoff"
cat > "$HOME/.handoff/config" <<EOF
HANDOFF_API_URL=$API_URL
HANDOFF_API_KEY=$API_KEY
EOF
chmod 600 "$HOME/.handoff/config"
echo "Wrote $HOME/.handoff/config"

COMMANDS="project-list project-attach project-checkpoint project-knowledge ask skill-list skill-save org-add org-list org-switch org-remove"

case "$CLIENT" in
  claude) DEST="$HOME/.claude/commands/handoff" ;;
  # NOTE: verify this is still Cursor's current custom-command directory before shipping --
  # copied from Claude Code's convention, not independently confirmed against Cursor's docs.
  cursor) DEST="$HOME/.cursor/commands/handoff" ;;
  codex)  DEST="$HOME/.codex/prompts" ;;
  *)
    echo "Unknown client: $CLIENT (expected claude, cursor, or codex)" >&2
    exit 1
    ;;
esac

mkdir -p "$DEST"
for c in $COMMANDS; do
  curl -fsSL "$RAW/commands/$c.md" -o "$DEST/$c.md"
done

count=$(echo $COMMANDS | wc -w | tr -d ' ')
echo "Installed $count commands to $DEST"
echo "Done. Try /handoff:project-list (namespacing depends on your host's command-directory convention)."
