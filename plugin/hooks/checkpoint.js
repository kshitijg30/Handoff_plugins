#!/usr/bin/env node
// Handoff Stop hook: spawns a headless Claude Code session that reads this
// session's real transcript, writes a real summary, and pushes both as a
// checkpoint via the handoff_checkpoint MCP tool -- so a checkpoint mirrors
// what Claude actually saw, not a hand-typed reconstruction.
"use strict";

const { spawn, spawnSync } = require("node:child_process");
const os = require("node:os");
const path = require("node:path");

// Guard against recursion: the checkpoint-writer session below is itself a
// Claude Code session, so its own Stop event would re-enter this hook.
if (process.env.HANDOFF_CHECKPOINT_RUNNER === "1") {
  process.exit(0);
}

function readStdin() {
  try {
    const fs = require("node:fs");
    return fs.readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function findOnPath(bin) {
  const candidateDirs = [];
  const home = os.homedir();
  const globDirs = (base) => {
    try {
      return require("node:fs")
        .readdirSync(base)
        .map((d) => path.join(base, d));
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

  const fs = require("node:fs");
  for (const dir of candidateDirs) {
    const full = path.join(dir, bin);
    if (fs.existsSync(full)) return full;
  }
  // Fall back to whatever the current PATH resolves.
  const which = spawnSync("command", ["-v", bin], { shell: true, encoding: "utf8" });
  const resolved = which.stdout && which.stdout.trim();
  return resolved || bin;
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

  const transcriptPath = payload.transcript_path || payload.transcriptPath;
  const cwd = payload.cwd || process.cwd();
  if (!transcriptPath) {
    process.exit(0);
  }

  const suggestedName = path.basename(cwd);
  const actor = gitUserName(cwd) || os.userInfo().username || "unknown";

  const claudeBin = findOnPath("claude");

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
