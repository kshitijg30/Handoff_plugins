---
description: List every project connected to this org
---

Resolve credentials: read `~/.handoff/config` for `HANDOFF_API_URL`. For the API key, check
`~/.handoff/orgs.json` first — if it exists and has a non-null `active` entry, use
`orgs[active].apiKey`; otherwise use `HANDOFF_API_KEY` from `~/.handoff/config`. If you can't
resolve both a URL and a key, tell the user to run the Handoff installer first and stop.

Run (adapt the shell syntax to whatever shell this session uses):

  curl -sS "$HANDOFF_API_URL/projects" -H "Authorization: Bearer $HANDOFF_API_KEY"

If the response has an `error` field, relay it verbatim and stop. Otherwise present the
`projects` array as a readable list: name, id, and description (or "no description").
