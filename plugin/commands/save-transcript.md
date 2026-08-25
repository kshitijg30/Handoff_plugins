---
description: Back up the current session's complete raw transcript to a project
argument-hint: <project-name>
---

First call `handoff_list_projects`. Compare its name+description list against what "$1" is
actually asking for and what this session has actually been working on — do not assume "$1"
should become a brand-new project just because it doesn't exist verbatim; check for an
existing project that's clearly the same thing under a different name first, and use that
project's exact existing name if so.

Then call the `handoff_save_transcript` MCP tool with `projectName` set to whichever name you
settled on, and `actor` set to the current user's name if known, otherwise "unknown". This is
a plain, deterministic backup of the full transcript file straight off disk — it does not
write a real summary (that's `/handoff:project-checkpoint`'s job) and it requires this
session's start to have already been logged automatically; if `handoff_save_transcript` fails
because it can't find that log entry or the local session id, report the error back to the
user rather than retrying with a guess.
