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
settled on, `summary` set to the rest of the arguments (the description of what happened),
and `actor` set to the current user's name if known, otherwise "unknown". If this genuinely
is a new project (nothing in the list matches), also pass `description`: one sentence saying
what the project actually is — not a restatement of this one checkpoint's summary. If asked
to also capture the full conversation, also pass `rawTranscript` with your best reconstruction
of this session so far in your own words — if omitted, the summary is stored as the
transcript too. If the user says this checkpoint should branch off an earlier checkpoint
rather than continue the latest one, pass that earlier checkpoint's node id as `fromNodeId`;
otherwise omit it. A genuinely new project's first session is still created automatically —
no separate setup step.
