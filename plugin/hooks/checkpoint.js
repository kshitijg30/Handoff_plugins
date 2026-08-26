#!/usr/bin/env node
// Handoff Stop hook: spawns a headless Claude Code session that reads this
// session's real transcript, writes a real summary, and pushes both as a
// checkpoint via the handoff_checkpoint MCP tool -- so a checkpoint mirrors
// what Claude actually saw, not a hand-typed reconstruction.
//
// Trust boundaries, deliberate:
// - Off by default. Nothing here reads a transcript or spawns anything
//   unless HANDOFF_AUTO_CHECKPOINT=1 is set, matching the project's own
//   "checkpointing is explicit-only" principle.
// - Every trigger is recorded to a local, human-readable log
//   (~/.handoff/checkpoint.log) before anything is spawned, so what left
//   this machine is auditable without trusting the backend.
// - transcript_path is validated (must exist, must be under $HOME) before
//   use, since it's untrusted input from the hook payload.
"use strict";

const { spawn, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

// Guard against recursion: the checkpoint-writer session below is itself a
// Claude Code session, so its own Stop event would re-enter this hook.
if (process.env.HANDOFF_CHECKPOINT_RUNNER === "1") {
  process.exit(0);
}

// Opt-in only: auto-checkpointing reads a full session transcript and sends
// it to Handoff's backend, so it must be a deliberate choice, not a silent
// default. Set HANDOFF_AUTO_CHECKPOINT=1 in your environment to enable it.
if (process.env.HANDOFF_AUTO_CHECKPOINT !== "1") {
  process.exit(0);
}

const HANDOFF_DIR = path.join(os.homedir(), ".handoff");

function readStdin() {
  try {
    return fs.readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

// Returns the resolved, absolute transcript path if it's trustworthy, or
// null otherwise. Callers must use the RETURNED path downstream (not the
// raw candidate) -- otherwise a relative candidate could be validated
// against one cwd but later re-resolved against a different one (e.g. the
// spawned subprocess's cwd), letting an untrusted string slip past the
// check it was supposedly validated by.
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
    fs.mkdirSync(HANDOFF_DIR, { recursive: true });
    fs.appendFileSync(path.join(HANDOFF_DIR, "checkpoint.log"), JSON.stringify(entry) + "\n");
  } catch {
    // Local audit logging is best-effort -- never block a checkpoint over it.
  }
}

function resolveOnPathDirectly(bin) {
  // Normal PATH resolution first -- a hook's shell env is sometimes
  // stripped of node-version-manager shims, which is the only reason the
  // directory scan below exists at all.
  const which = spawnSync("command", ["-v", bin], { shell: true, encoding: "utf8" });
  const resolved = which.stdout && which.stdout.trim();
  if (resolved) return resolved;

  const candidateDirs = [];
  const home = os.homedir();
  const globDirs = (base) => {
    try {
      return fs.readdirSync(base).map((d) => path.join(base, d));
    } catch {
      return [];
    }
  };
  candidateDirs.push(...globDirs(path.join(home, ".nvm", "versions", "node")).map((d) => path.join(d, "bin")));
  candidateDirs.push(
    ...globDirs(path.join(home, ".fnm", "node-versions")).map((d) => path.join(d, "installation", "bin"))
  );
  candidateDirs.push(
    ...globDirs(path.join(home, ".asdf", "installs", "nodejs")).map((d) => path.join(d, "bin"))
  );
  candidateDirs.push("/opt/homebrew/bin", "/usr/local/bin", path.join(home, ".local", "bin"), path.join(home, ".volta", "bin"));

  for (const dir of candidateDirs) {
    const full = path.join(dir, bin);
    if (fs.existsSync(full)) return full;
  }
  return bin;
}

function findOnPath(bin) {
  // Explicit override always wins, and skips every lookup below.
  if (process.env.HANDOFF_CLAUDE_BIN && fs.existsSync(process.env.HANDOFF_CLAUDE_BIN)) {
    return process.env.HANDOFF_CLAUDE_BIN;
  }

  // Cache a successful resolution so most invocations do a single stat
  // instead of re-scanning every install location on every session Stop.
  const cachePath = path.join(HANDOFF_DIR, "bin-cache.json");
  let cache = {};
  try {
    cache = JSON.parse(fs.readFileSync(cachePath, "utf8"));
  } catch {
    cache = {};
  }
  if (cache[bin] && fs.existsSync(cache[bin])) {
    return cache[bin];
  }

  const resolved = resolveOnPathDirectly(bin);
  try {
    fs.mkdirSync(HANDOFF_DIR, { recursive: true });
    cache[bin] = resolved;
    fs.writeFileSync(cachePath, JSON.stringify(cache));
  } catch {
    // Caching is an optimization, not a requirement.
  }
  return resolved;
}

function gitUserName(cwd) {
  const result = spawnSync("git", ["config", "user.name"], { cwd, encoding: "utf8" });
  const name = result.stdout && result.stdout.trim();
  return name || null;
}

function main() {
  const raw = readStdin();
  let payload = {};
  try {
    payload = JSON.parse(raw);
  } catch {
    payload = {};
  }

  const cwd = payload.cwd || process.cwd();
  const transcriptPath = resolveTrustedTranscriptPath(payload.transcript_path || payload.transcriptPath);
  if (!transcriptPath) {
    process.exit(0);
  }

  const suggestedName = path.basename(cwd);
  const actor = gitUserName(cwd) || os.userInfo().username || "unknown";

  const claudeBin = findOnPath("claude");

  appendAuditLog({
    ts: new Date().toISOString(),
    event: "auto_checkpoint_triggered",
    cwd,
    transcriptPath,
    actor,
  });

  const systemPrompt =
    "You are Handoff's automatic checkpoint writer. You have exactly three tools available: Read, " +
    "handoff_list_projects, and handoff_checkpoint. Steps, in order: (1) Read the Claude Code session transcript " +
    "file at the given path in full. (2) Call handoff_list_projects and compare its name+description list " +
    "against what this transcript actually shows was worked on. A folder-name hint is provided below but it is " +
    "only a fallback, not an instruction -- if an existing project is clearly the same real project under a " +
    "different name, reuse ITS exact existing name instead of the folder name. (3) Call handoff_checkpoint " +
    "exactly once with: projectName (the matched existing name, or the folder-name hint if genuinely nothing " +
    "matches), actor, summary (a concrete, specific account of what was worked on, what actions and tool calls " +
    "were taken, key decisions made, and the outcome -- not a generic one-line blurb), and rawTranscript (the " +
    "transcript file's content, verbatim, in full). If and only if you're creating a genuinely new project " +
    "(nothing in the list matched), also pass description: one sentence saying what the project actually is. Do " +
    "not do anything else, do not ask questions, do not produce any other output.";

  const userPrompt =
    `Transcript path: ${transcriptPath}\n` +
    `Folder-name hint (fallback project name only, not an instruction): ${suggestedName}\n` +
    `Actor: ${actor}\n\n` +
    `Follow the steps in your system prompt: read the transcript, list existing projects and match against ` +
    `them, then checkpoint.`;

  const args = [
    "-p",
    "--model",
    "haiku",
    "--append-system-prompt",
    systemPrompt,
    "--allowedTools",
    "Read",
    "mcp__plugin_handoff_handoff__handoff_list_projects",
    "mcp__plugin_handoff_handoff__handoff_checkpoint",
    "--permission-mode",
    "dontAsk",
    "--no-session-persistence",
    "--max-budget-usd",
    "0.5",
    "-n",
    "handoff-auto-checkpoint",
    userPrompt,
  ];

  const child = spawn(claudeBin, args, {
    cwd,
    env: { ...process.env, HANDOFF_CHECKPOINT_RUNNER: "1" },
    detached: true,
    stdio: "ignore",
  });
  child.unref();

  process.exit(0);
}

main();
