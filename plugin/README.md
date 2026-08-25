# Handoff plugin

Attach to and checkpoint shared agent-session context, per project. Works the same underlying
way in Claude Code, Cursor, and Codex CLI: an MCP server (`mcp-server/index.js`, self-contained,
zero dependencies) talks to your org's Handoff API over HTTP using two env vars,
`HANDOFF_API_URL` and `HANDOFF_API_KEY` — get both from your org's Handoff dashboard, Connect tab.
No database or infra credentials live in this repo.

## Claude Code

```
claude plugin marketplace add kshitijg30/Handoff_plugins
claude plugin install handoff
```
Then set `HANDOFF_API_URL` / `HANDOFF_API_KEY` wherever your shell picks up env vars.

## Cursor

Same marketplace mechanism, Cursor's own manifest (`.cursor-plugin/`) is included at repo root:
- In Cursor, run `/add-plugin` and point it at `kshitijg30/Handoff_plugins`, **or** open
  Customize → Plugins → Marketplace and add the same repo.
- Set `HANDOFF_API_URL` / `HANDOFF_API_KEY` under Plugins → Handoff → Configure.

If your Cursor version doesn't yet support adding a marketplace by repo, clone this repo and copy
`plugin/` to `~/.cursor/plugins/local/handoff` instead, then reload Cursor.

## Codex CLI

Codex has no plugin/marketplace format (no bundling), so setup is three manual pieces. Clone this
repo to a fixed path first, since the hook below needs an absolute path to it:
```
git clone https://github.com/kshitijg30/Handoff_plugins ~/.handoff
```

1. **MCP server** — add to `~/.codex/config.toml`:
   ```toml
   [mcp_servers.handoff]
   command = "node"
   args = ["/Users/you/.handoff/plugin/mcp-server/index.js"]
   env_vars = ["HANDOFF_API_URL", "HANDOFF_API_KEY"]
   ```
   (`env_vars` forwards those two vars from your own shell environment — set them in your shell
   profile, same as the other clients.)

2. **Slash commands** — copy the prompt files so `/project-attach`, `/project-checkpoint`,
   `/project-list`, `/ask`, `/skill-list`, `/skill-save` show up in Codex's slash menu:
   ```
   cp ~/.handoff/plugin/commands/*.md ~/.codex/prompts/
   ```

3. **Auto-checkpoint on session end** (optional) — merge `plugin/hooks/codex-hooks.json`'s
   contents into `~/.codex/hooks.json` (create it if it doesn't exist yet). It runs
   `hooks/codex-checkpoint.js`, which asks Codex to summarize and checkpoint the session itself
   when you stop — same idea as the Claude Code/Cursor hooks, just wired through Codex's own
   `decision: "block"` continuation mechanism instead of a spawned sub-session.

Without step 3, checkpointing is still available manually via `/project-checkpoint`.
