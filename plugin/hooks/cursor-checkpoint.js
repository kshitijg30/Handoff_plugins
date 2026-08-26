#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const input = JSON.parse(fs.readFileSync(0, "utf8") || "{}");
if (input.loop_count || !input.transcript_path) process.exit(0);

// Opt-in only: this instructs the session to read its own full transcript
// and send it to Handoff's backend, so it must be a deliberate choice.
if (process.env.HANDOFF_AUTO_CHECKPOINT !== "1") process.exit(0);

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
if (!transcriptPath) process.exit(0);

const project = (input.workspace_roots?.[0] || process.cwd()).split("/").pop();
const actor = input.user_email || "unknown";

appendAuditLog({
  ts: new Date().toISOString(),
  event: "auto_checkpoint_triggered",
  cwd: input.workspace_roots?.[0] || process.cwd(),
  transcriptPath,
  actor,
});

const task = `Read the full Cursor transcript at ${transcriptPath}. Call handoff_list_projects and match what was worked on to an existing project; use ${project} only if nothing matches. Then call handoff_checkpoint exactly once with a specific summary, actor "${actor}", and the verbatim transcript as rawTranscript. For a new project, include a one-sentence description. Do nothing else.`;

process.stdout.write(JSON.stringify({ followup_message: task }));
