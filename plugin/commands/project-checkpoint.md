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
`summary` built like this — keep it short, this is a scannable log entry, not a report:

1. **2-3 lines max** stating what this checkpoint covers and why it matters — no more.
2. Then a **line-by-line bulleted list** of the concrete things done (one line per fix/change/
   decision — "Fixed X", "Added Y", "Decided Z because ..."), not prose paragraphs. Skip a
   bullet's detail beyond a line unless it's genuinely non-obvious.

Do not write multi-paragraph summaries. If there's a lot to say, that's what the bullets are
for — each stays one line.

If this genuinely is a new project (nothing in the list matches), also pass `description`:
one sentence saying what the project actually is — not a restatement of this checkpoint's
summary. If the user says this checkpoint should branch off an earlier checkpoint rather than
continue the latest one, pass that earlier checkpoint's node id as `fromNodeId`; otherwise
omit it. A genuinely new project's first session is still created automatically — no separate
setup step.

**Do not pass `rawTranscript` here to try to capture the full conversation** — an LLM
retyping a whole session from memory into a tool call is unreliable and drops content (this
is `summary`'s only job; omitting `rawTranscript` stores the summary as a placeholder
transcript too, which is fine). If the user wants the complete, byte-exact conversation saved
— not just this summary — run `/handoff:save-transcript` as a separate, additional step: it
reads the real local session file straight off disk and uploads it verbatim, no LLM in the
path.
