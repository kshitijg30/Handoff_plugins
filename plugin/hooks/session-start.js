#!/usr/bin/env node
// Handoff SessionStart hook: logs this session's real session_id + local transcript file path
// to the backend via a plain HTTP POST -- no `claude -p` spawn, no LLM in the critical path.
// This is what lets the (separate) save-transcript plugin reliably answer "which local file
// is THIS session's" later on. Fire-and-forget: the network call happens in a detached child
// process so this hook returns instantly and never delays session startup, and every error
// (missing config, network failure, non-2xx response) is swallowed silently.
//
// Does NOT touch checkpoint.js / the Stop hook -- see
// docs/superpowers/plans/2026-08-25-transcript-pipeline/00-context-and-contract.md and
// 02-plugin-hooks.md for the full contract this implements.
"use strict";

const { spawn, spawnSync } = require("node:child_process");
const os = require("node:os");

function readStdin() {
  try {
    const fs = require("node:fs");
    return fs.readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function gitUserName(cwd) {
  const result = spawnSync("git", ["config", "user.name"], { cwd, encoding: "utf8" });
  const name = result.stdout && result.stdout.trim();
  return name || null;
}

// Re-invocation branch: the detached child spawned below lands here (via the env flag) and
// does the actual network call, fully independent of the parent hook process's lifetime. It
// never touches stdin/the hook payload -- everything it needs was already resolved and handed
// down via env vars.
if (process.env.HANDOFF_SESSION_START_SEND === "1") {
  (async () => {
    const baseUrl = process.env.HANDOFF_API_URL;
    const apiKey = process.env.HANDOFF_API_KEY;
    const body = process.env.HANDOFF_SESSION_START_BODY;
    if (!baseUrl || !apiKey || !body) {
      process.exit(0);
    }
    try {
      await fetch(`${baseUrl.replace(/\/+$/, "")}/sessions/log-start`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body,
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      // Fire-and-forget: log-start is best-effort metadata. Never surface network/backend
      // errors anywhere -- there's no user-facing surface for a SessionStart hook to use, and
      // failing loudly here would be worse than a missing session_starts row.
    }
    process.exit(0);
  })();
  return;
}

function main() {
  const raw = readStdin();
  let payload = {};
  try {
    payload = JSON.parse(raw);
  } catch {
    payload = {};
  }

  // SessionStart's payload carries the same common fields as Stop's (session_id,
  // transcript_path, cwd, hook_event_name) plus a SessionStart-only `source`
  // (startup/resume/clear/compact/fork) that we don't need here. Accept both snake_case (the
  // documented/actual shape) and camelCase defensively, same as checkpoint.js does for Stop.
  const sessionId = payload.session_id || payload.sessionId;
  const transcriptPath = payload.transcript_path || payload.transcriptPath;
  const cwd = payload.cwd || process.cwd();

  if (!sessionId || !transcriptPath) {
    // Nothing usable to log -- exit clean and silent rather than guessing.
    process.exit(0);
  }

  const actor = gitUserName(cwd) || os.userInfo().username || "unknown";

  const body = JSON.stringify({
    claudeSessionId: sessionId,
    localTranscriptPath: transcriptPath,
    cwd,
    actor,
    startedAt: new Date().toISOString(),
  });

  try {
    const child = spawn(process.execPath, [__filename], {
      cwd,
      env: { ...process.env, HANDOFF_SESSION_START_SEND: "1", HANDOFF_SESSION_START_BODY: body },
      detached: true,
      stdio: "ignore",
    });
    child.unref();
  } catch {
    // Spawning the sender failed (e.g. exotic sandboxed environment) -- still must not block
    // or crash session startup.
  }

  process.exit(0);
}

main();
