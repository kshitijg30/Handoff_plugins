---
description: Materialize a Handoff project's full transcript as a new resumable local session
argument-hint: <project-name>
---

First call `handoff_list_projects`. If "$1" isn't an exact name in that list, look for the
closest real match by name+description rather than passing "$1" through verbatim and letting
it fail — but only use a match you're actually confident is the same project, not just a
loose word overlap.

If you found a confident match (exact or otherwise), call `handoff_get_transcript` with
`projectName` set to that project's exact name (omit `nodeId` to get the latest checkpoint).
Then relay the tool's response to the user plainly: the local file path it wrote, the new
session id, and exactly how to resume it — including its caveat that this is NOT the same as
continuing in the current conversation, and that resuming is a separate action the user has to
take themselves afterward. Don't soften or drop that caveat.

If nothing in the list is a confident match, do NOT call `handoff_get_transcript` at all — tell
the user plainly that no matching project was found, list the real project names that do
exist, and ask whether they meant one of those instead.
