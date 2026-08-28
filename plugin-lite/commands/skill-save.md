---
description: Save a new skill to the org's shared skill library
argument-hint: <name> "<description>" "<instructions>"
---

Resolve credentials the same way as `/handoff:project-list`.

  curl -sS -X POST "$HANDOFF_API_URL/skills" \
    -H "Authorization: Bearer $HANDOFF_API_KEY" -H "Content-Type: application/json" \
    -d '{"name": "$1", "description": "$2", "instructions": "$3", "actor": "<current user's name, or \"unknown\">"}'

Confirm creation back to the user, including the new skill's id from the response. If the
response has an `error` field, relay it verbatim and stop.
