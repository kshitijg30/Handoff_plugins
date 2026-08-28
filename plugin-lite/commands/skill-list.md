---
description: List every skill in the org's shared skill library
---

Resolve credentials the same way as `/handoff:project-list`.

  curl -sS "$HANDOFF_API_URL/skills" -H "Authorization: Bearer $HANDOFF_API_KEY"

Present the `skills` array as a readable list: name, id, description, and usage count. If the
response has an `error` field, relay it verbatim and stop.
