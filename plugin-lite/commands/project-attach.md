---
description: Attach to a Handoff project and pull its latest checkpointed context into this session
argument-hint: <project-name>
---

Resolve credentials the same way as `/handoff:project-list`.

First list projects: `curl -sS "$HANDOFF_API_URL/projects" -H "Authorization: Bearer $HANDOFF_API_KEY"`.
If "$1" isn't an exact name in that list, look for the closest real match by name+description
rather than passing "$1" through verbatim — but only use a match you're actually confident is
the same project, not a loose word overlap.

If you found a confident match, GET the attach endpoint with that project's exact name,
URL-encoded:

  curl -sS "$HANDOFF_API_URL/projects/<encoded-name>/attach" -H "Authorization: Bearer $HANDOFF_API_KEY"

If the response has an `error` field, relay it verbatim and stop. Otherwise summarize the
returned context for the user in a few sentences: the latest checkpoint's summary, and the
ancestry chain (earlier checkpoints, most recent first). If the response includes a project
knowledge base, read it too — it's durable project-level context (architecture, status), not
just the latest checkpoint — and let it inform whatever you do next in this session.

If nothing in the list is a confident match, do NOT call attach at all — tell the user plainly
that no matching project was found, list the real project names that do exist, and ask whether
they meant one of those or want to checkpoint this as a new project instead.
