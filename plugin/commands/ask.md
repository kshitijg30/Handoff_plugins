---
description: Ask a natural-language question over the org's checkpointed context and get a cited answer
argument-hint: "<question>"
---

Call the `handoff_ask` MCP tool with `question` set to the full argument text and `actor` set
to the current user's name if known, otherwise "unknown". This tool returns relevant
checkpoint excerpts (with their ancestry chain and project) -- it does not write an answer
itself. Read what it returns and write the actual answer yourself, in your own words, citing
the specific node id(s) you drew each claim from (e.g. `[node:<id>]`) so the user can see
exactly which past checkpoint it came from. If nothing relevant came back, say so plainly
instead of guessing.
