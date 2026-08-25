#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const input = JSON.parse(fs.readFileSync(0, "utf8") || "{}");
if (input.loop_count || !input.transcript_path) process.exit(0);

const project = (input.workspace_roots?.[0] || process.cwd()).split("/").pop();
const actor = input.user_email || "unknown";
const task = `Read the full Cursor transcript at ${input.transcript_path}. Call handoff_list_projects and match what was worked on to an existing project; use ${project} only if nothing matches. Then call handoff_checkpoint exactly once with a specific summary, actor "${actor}", and the verbatim transcript as rawTranscript. For a new project, include a one-sentence description. Do nothing else.`;

process.stdout.write(JSON.stringify({ followup_message: task }));
