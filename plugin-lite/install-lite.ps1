# Handoff lite installer for native Windows PowerShell -- no Node, no MCP server, no
# disk-read hooks. Mirrors install-lite.sh exactly: write one small config file, copy
# slash-command prompt files that tell the agent to curl the Handoff API directly.
#
# Usage:
#   iwr https://raw.githubusercontent.com/kshitijg30/Handoff_plugins/main/plugin-lite/install-lite.ps1 -OutFile install-lite.ps1
#   .\install-lite.ps1 -Client claude -ApiUrl https://api.example.com -ApiKey hk_xxx
param(
  [Parameter(Mandatory = $true)][ValidateSet("claude", "cursor", "codex")][string]$Client,
  [Parameter(Mandatory = $true)][string]$ApiUrl,
  [Parameter(Mandatory = $true)][string]$ApiKey
)
$ErrorActionPreference = "Stop"

$handoffDir = Join-Path $HOME ".handoff"
New-Item -ItemType Directory -Force -Path $handoffDir | Out-Null
$configPath = Join-Path $handoffDir "config"
"HANDOFF_API_URL=$ApiUrl`nHANDOFF_API_KEY=$ApiKey" | Set-Content -Path $configPath -Encoding utf8
Write-Host "Wrote $configPath"

$commands = @(
  "project-list", "project-attach", "project-checkpoint", "project-knowledge",
  "ask", "skill-list", "skill-save", "org-add", "org-list", "org-switch", "org-remove"
)
$raw = "https://raw.githubusercontent.com/kshitijg30/Handoff_plugins/main/plugin-lite"

switch ($Client) {
  "claude" { $dest = Join-Path $HOME ".claude\commands\handoff" }
  # NOTE: verify this is still Cursor's current custom-command directory before shipping --
  # copied from Claude Code's convention, not independently confirmed against Cursor's docs.
  "cursor" { $dest = Join-Path $HOME ".cursor\commands\handoff" }
  "codex"  { $dest = Join-Path $HOME ".codex\prompts" }
}
New-Item -ItemType Directory -Force -Path $dest | Out-Null
foreach ($c in $commands) {
  Invoke-WebRequest -Uri "$raw/commands/$c.md" -OutFile (Join-Path $dest "$c.md")
}
Write-Host "Installed $($commands.Count) commands to $dest"
Write-Host "Done. Try /handoff:project-list (namespacing depends on your host's command-directory convention)."
