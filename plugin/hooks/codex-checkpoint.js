#!/usr/bin/env node
// Handoff Stop hook for Codex CLI: reads the session's real transcript and
// tells Codex (via the "block" continuation mechanism) to summarize and
// checkpoint it itself, using the handoff_list_projects/handoff_checkpoint
// MCP tools already available in the same session -- mirrors
// cursor-checkpoint.js's followup_message approach rather than
// checkpoint.js's spawned-headless-session approach, since Codex's Stop
// hook can inject a continuation prompt directly.
"use strict";

const fs = require("node:fs");
const os = require("node:os");
const { spawnSync } = require("node:child_process");

const input = JSON.parse(fs.readFileSync(0, "utf8") || "{}");

// stop_hook_active is true when this turn is itself a continuation Codex
// created from a previous "block" decision -- without this guard, the
// continuation's own Stop event would re-trigger this hook forever.
if (input.stop_hook_active || !input.transcript_path) {
  process.exit(0);
}

const cwd = input.cwd || process.cwd();
const project = cwd.split("/").filter(Boolean).pop() || "unknown";

function gitUserName() {
  const result = spawnSync("git", ["config", "user.name"], { cwd, encoding: "utf8" });
  const name = result.stdout && result.stdout.trim();
  return name || null;
}

const actor = gitUserName() || os.userInfo().username || "unknown";

const reason =
  `Read the full Codex session transcript at ${input.transcript_path}. Call handoff_list_projects and match ` +
  `what was worked on to an existing project by name+description; use "${project}" only if nothing matches. ` +
  `Then call handoff_checkpoint exactly once with the matched (or new) projectName, actor "${actor}", a ` +
  `specific summary of what actions/decisions/outcomes happened (not a generic one-liner), and the transcript's ` +
  `content verbatim as rawTranscript. Only if creating a genuinely new project, also pass a one-sentence ` +
  `description. Do nothing else.`;

process.stdout.write(JSON.stringify({ decision: "block", reason }));
