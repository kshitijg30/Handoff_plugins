---
description: Save the current session's reasoning as a new checkpoint on a project
argument-hint: <project-name> "<what happened>"
---

First call `handoff_list_projects`. Compare its name+description list against what "$1" is
actually asking for and what this session has actually been working on — do not assume "$1"
should become a brand-new project just because it doesn't exist verbatim; check for an
existing project that's clearly the same thing under a different name first, and use that
project's exact existing name if so.

Then call the `handoff_checkpoint` MCP tool with `projectName` set to whichever name you
settled on, `actor` set to the current user's name if known otherwise "unknown", and
`summary` set to a complete written record of this session's work. The summary is the only
thing stored — there is no transcript behind it — so it has to stand entirely on its own.
Write it for a teammate who cannot see this conversation and needs to pick the work up:

- **Capture everything that matters, at whatever length that takes.** No line limit. Long is
  fine. Missing context is not.
- State what was done and, for every non-trivial change or decision, *why* — the reasoning,
  the alternatives considered and rejected, the constraints that forced the choice.
- Preserve every concrete reference verbatim: file paths, function/class names, identifiers,
  commands run, URLs, links, ticket/PR numbers, config keys, env vars, error messages. Do not
  paraphrase a path or drop a link because it seems minor.
- Note what is done vs. still open, anything verified vs. assumed, and any follow-up the next
  person should know about.
- Structure it so it stays readable: a short orienting paragraph up top (what this checkpoint
  covers and why it matters), then prose and/or bullets underneath — whatever conveys the
  detail most clearly. Markdown is supported and rendered in the dashboard.

Write the summary from your own understanding of the conversation — do not read or paste the
raw session file. This is you reconstructing the full picture in your own words, thoroughly,
not transcribing turns.

If this genuinely is a new project (nothing in the list matches), also pass `description`:
one sentence saying what the project actually is — not a restatement of this checkpoint's
summary. If the user says this checkpoint should branch off an earlier checkpoint rather than
continue the latest one, pass that earlier checkpoint's node id as `fromNodeId`; otherwise
omit it. A genuinely new project's first session is still created automatically — no separate
setup step.

`handoff_checkpoint` never captures a turn-by-turn transcript, and it must not — an LLM
retyping a whole session is unreliable and drops content. If the user wants the complete,
byte-exact conversation saved as well, run `/handoff:save-transcript` as a separate,
additional step: it reads the real local session file straight off disk and uploads it
verbatim, with no LLM in the path.
