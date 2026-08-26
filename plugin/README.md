# Handoff plugin

Self-contained: `mcp-server/index.js` is a bundled, dependency-free build of `@handoff/mcp-server`
(built via `npm run build` in this directory, or from the repo root — see `package.json`). This
whole `plugin/` directory is everything Claude Code needs; it does not reach outside itself into
the rest of the `handoff` monorepo, so it can be copied, zipped, or checked into a project on its
own.

Install: point Claude Code at this plugin directory (or the published marketplace entry, once
published). Requires `HANDOFF_API_URL` and `HANDOFF_API_KEY` in your environment — get a key
from your org's Handoff dashboard (Connect tab), or by running
`tsx backend/scripts/create-org.ts "<org name>"` against a running backend once; store the
printed key somewhere durable (it's shown only once). Never bake the key into a committed file —
set it in your shell profile or an untracked `.env`.

Cursor: copy this directory to `~/.cursor/plugins/local/handoff`, reload Cursor, then configure
`HANDOFF_API_URL` and `HANDOFF_API_KEY` under **Plugins → Handoff → Configure**. Cursor loads the
same commands and MCP tools; its stop hook checkpoints the session transcript once after each
agent run.

If you're modifying `mcp-server/src` in the monorepo, rebuild the bundle before testing the
plugin: `npm run build` in this directory (regenerates `mcp-server/index.js` from
`../mcp-server/src/index.ts`).

Commands: `/project list`, `/project attach <name>`,
`/project checkpoint <name> "<what happened>"` (creates the project and its first session
automatically if they don't exist yet; pass a `fromNodeId` to fork from an earlier checkpoint
instead of continuing the latest one), `/ask "<question>"`,
`/skill list`, `/skill save <name> "<description>" "<instructions>"`.

`/ask` and the skill commands (`/skill list`, `/skill save`) require the backend's `/ask` and
`/skills` routes to be available, and the backend must have Azure OpenAI credentials configured
for `/ask` to generate answers — the plugin itself needs no additional credentials beyond the
usual `HANDOFF_API_URL`/`HANDOFF_API_KEY` pair.

## Working across multiple orgs

A single API key only ever works for the one org it was generated for (see the backend's
`auth.ts` — keys are permanently org-scoped, there's no such thing as a multi-org key). If you're
on more than one org, register each one's key once and switch between them from inside your
agent, no restart needed:

- `/org add <local-name> <api-key>` — get the key from that org's Handoff dashboard (org
  switcher → Connect tab → Generate API key), then register it here under any name you want
  (e.g. `/org add juspay hk_...`). Verifies the key actually works before saving it, and switches
  to it immediately.
- `/org switch <local-name>` — switch which registered org every Handoff tool call acts on.
  Takes effect on the very next tool call.
- `/org list` — see what's registered and which one is active.
- `/org remove <local-name>` — forget a registered key locally (does not revoke it on the
  backend).

If you never touch these commands, nothing changes: the plugin falls back to `HANDOFF_API_KEY`
from your environment exactly as before. Registered keys live in `~/.handoff/orgs.json`
(`chmod 600`, never committed) — separate from that env var, and take priority over it once you've
registered at least one org.

## Automatic checkpointing & data handling

By default, this plugin never reads your session transcript or sends anything to the backend on
its own — checkpointing only happens when you run `/project checkpoint` yourself. There is an
optional Stop-hook (`hooks/checkpoint.js`, plus Codex/Cursor equivalents) that, once enabled, reads
the full transcript of every session and checkpoints it automatically when the session ends. This
is opt-in, not on by default: set `HANDOFF_AUTO_CHECKPOINT=1` in your environment to turn it on.

When enabled:
- Every trigger is logged locally, before anything is read or sent, to `~/.handoff/checkpoint.log`
  (one JSON line per event: timestamp, cwd, transcript path, actor) — a local record independent
  of the backend, so you can always see what this machine reported doing.
- The transcript path is validated (must exist, must be under your home directory) before it's
  used.
- The background checkpoint-writer session (Claude Code path) runs with an explicit tool
  allowlist — only `Read`, `handoff_list_projects`, `handoff_checkpoint` — nothing else.

To find your machine's `claude` binary without rescanning every install location on every
session, set `HANDOFF_CLAUDE_BIN` to its full path; otherwise it's resolved once via normal `PATH`
lookup and cached to `~/.handoff/bin-cache.json`.
