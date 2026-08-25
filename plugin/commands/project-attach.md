---
description: Attach to a Handoff project and pull its latest checkpointed context into this session
argument-hint: <project-name>
---

First call `handoff_list_projects`. If "$1" isn't an exact name in that list, look for the
closest real match by name+description rather than passing "$1" through verbatim and letting
it fail — but only use a match you're actually confident is the same project, not just a
loose word overlap.

If you found a confident match (exact or otherwise), call `handoff_attach` with `projectName`
set to that project's exact name, then summarize the returned context for the user in a few
sentences before continuing.

If nothing in the list is a confident match, do NOT call `handoff_attach` at all — tell the
user plainly that no matching project was found, list the real project names that do exist,
and ask whether they meant one of those or want to checkpoint this as a new project instead.
