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
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const input = JSON.parse(fs.readFileSync(0, "utf8") || "{}");

// stop_hook_active is true when this turn is itself a continuation Codex
// created from a previous "block" decision -- without this guard, the
// continuation's own Stop event would re-trigger this hook forever.
if (input.stop_hook_active || !input.transcript_path) {
  process.exit(0);
}

// Opt-in only: this instructs the session to read its own full transcript
// and send it to Handoff's backend, so it must be a deliberate choice.
if (process.env.HANDOFF_AUTO_CHECKPOINT !== "1") {
  process.exit(0);
}

// Returns the resolved, absolute transcript path if it's trustworthy, or
// null otherwise. Downstream code must use the RETURNED path, not the raw
// candidate -- see checkpoint.js's identical helper for why.
function resolveTrustedTranscriptPath(candidate) {
  if (!candidate || typeof candidate !== "string") return null;
  try {
    const resolved = path.resolve(candidate);
    const home = os.homedir();
    if ((resolved === home || resolved.startsWith(home + path.sep)) && fs.existsSync(resolved)) {
      return resolved;
    }
    return null;
  } catch {
    return null;
  }
}

function appendAuditLog(entry) {
  try {
    const handoffDir = path.join(os.homedir(), ".handoff");
    fs.mkdirSync(handoffDir, { recursive: true });
    fs.appendFileSync(path.join(handoffDir, "checkpoint.log"), JSON.stringify(entry) + "\n");
  } catch {
    // Local audit logging is best-effort -- never block a checkpoint over it.
  }
}

const transcriptPath = resolveTrustedTranscriptPath(input.transcript_path);
if (!transcriptPath) {
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

appendAuditLog({
  ts: new Date().toISOString(),
  event: "auto_checkpoint_triggered",
  cwd,
  transcriptPath,
  actor,
});

const reason =
  `Read the full Codex session transcript at ${transcriptPath}. Call handoff_list_projects and match ` +
  `what was worked on to an existing project by name+description; use "${project}" only if nothing matches. ` +
  `Then call handoff_checkpoint exactly once with the matched (or new) projectName, actor "${actor}", a ` +
  `specific summary of what actions/decisions/outcomes happened (not a generic one-liner), and the transcript's ` +
  `content verbatim as rawTranscript. Only if creating a genuinely new project, also pass a one-sentence ` +
  `description. Do nothing else.`;

process.stdout.write(JSON.stringify({ decision: "block", reason }));
