# Handoff lite (v0)

A zero-dependency alternative to `plugin/`: no Node process, no MCP server, no shell-rc
editing, no reading the agent's own session transcript off disk. Setup is two steps — write a
2-line config file, copy a folder of `.md` prompt files — and every command it defines just
tells the agent to run a plain `curl` against the Handoff API. That's the whole install, on
every OS, with no branching beyond "which folder does this host read commands from."

This trades away what the disk-reading machinery in `plugin/` buys you:

- **No automatic checkpointing.** `plugin/`'s optional Stop-hook reads the real session
  transcript and checkpoints it without being asked. Here, `/handoff:project-checkpoint` is
  always explicit, and its `summary` is always written by the agent from its own understanding
  of the conversation — never a raw transcript dump. This is deliberate, not a shortcut: an
  agent reasoning about what actually mattered in a session is a better signal-to-noise
  checkpoint than a verbatim log anyway, and it's what `plugin/`'s own checkpoint command
  already tells the agent to do — this just removes the option to also send the raw transcript.
- **No `/handoff:get-transcript` or `/handoff:save-transcript`.** Both exist in `plugin/`
  specifically to read/write real `.jsonl` session files on disk. Cut entirely here.
- **No multi-client MCP tool surface.** Every other command (`project-list`, `project-attach`,
  `ask`, `skill-list`, `skill-save`, `org-*`) has full parity with `plugin/` — same backend
  routes, same payload shape — just issued as a `curl` instead of an MCP tool call.

Everything else about the backend is unchanged: same Postgres-backed API, same Bearer-token
auth, same routes. This is purely a client-side simplification.

## Install

```
curl -fsSL https://raw.githubusercontent.com/kshitijg30/Handoff_plugins/main/install-lite.sh \
  | bash -s -- <claude|cursor|codex> <HANDOFF_API_URL> <HANDOFF_API_KEY>
```

Windows (native PowerShell, no WSL/git-bash needed):

```
iwr https://raw.githubusercontent.com/kshitijg30/Handoff_plugins/main/plugin-lite/install-lite.ps1 -OutFile install-lite.ps1
.\install-lite.ps1 -Client claude -ApiUrl <HANDOFF_API_URL> -ApiKey <HANDOFF_API_KEY>
```

Get a key from your org's Handoff dashboard (Connect tab → Generate API key). Both installers
do the same two things:

1. Write `~/.handoff/config` (`HANDOFF_API_URL=...` / `HANDOFF_API_KEY=...`, `chmod 600`).
2. Copy this directory's `commands/*.md` files into whichever folder that host reads slash
   commands from.

Re-running the installer just overwrites the command files and config — safe to re-run any
time (e.g. after a command file is updated upstream).

**Not yet verified:** the Cursor destination folder (`~/.cursor/commands/handoff`) is copied
from Claude Code's own convention (`~/.claude/commands/handoff`), not confirmed against
Cursor's current docs — check this before pointing real users at the Cursor path.

## Commands

`/handoff:project-list`, `/handoff:project-attach <name>`,
`/handoff:project-checkpoint <name> "<what happened>"`, `/handoff:project-knowledge <name>`,
`/handoff:ask "<question>"`, `/handoff:skill-list`,
`/handoff:skill-save <name> "<description>" "<instructions>"`, `/handoff:org-add <local-name>
<api-key>`, `/handoff:org-list`, `/handoff:org-switch <local-name>`, `/handoff:org-remove
<local-name>`.

(Exact slash-command prefix depends on how your host namespaces a commands subfolder — adjust
if `/handoff:project-list` doesn't resolve.)

## Config files on disk

- `~/.handoff/config` — one API URL + a default API key, written once at install time. The
  only file every command reads.
- `~/.handoff/orgs.json` (optional, only created by `/handoff:org-add`) — lets one install
  hold several orgs' keys and switch which one is active, same shape `plugin/`'s
  `orgStore.ts` already uses: `{"active": <name or null>, "orgs": {"<name>": {"apiKey":
  "<key>"}}}`. When present and `active` is set, its key takes priority over
  `HANDOFF_API_KEY` in `config`.

Neither file is ever read by anything other than the command that needs it at the moment it
runs — there's no background process, hook, or watcher in this directory at all.
