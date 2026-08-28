---
description: Ask a natural-language question over the org's checkpointed context and get a cited answer
argument-hint: "<question>"
---

Resolve credentials the same way as `/handoff:project-list`.

  curl -sS -X POST "$HANDOFF_API_URL/ask" \
    -H "Authorization: Bearer $HANDOFF_API_KEY" -H "Content-Type: application/json" \
    -d '{"question": "<full argument text>", "actor": "<current user's name, or \"unknown\">"}'

This returns ranked checkpoint excerpts (each with its project, session, and ancestry chain) —
it does not write an answer itself. Read what it returns and write the actual answer yourself,
in your own words, citing the specific node id(s) you drew each claim from (e.g. `[node:<id>]`)
so the user can see exactly which past checkpoint it came from. If `matches` is empty, say so
plainly instead of guessing. If the response has an `error` field, relay it verbatim and stop.
