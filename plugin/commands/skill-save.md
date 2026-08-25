---
description: Save a new skill to the org's shared skill library
argument-hint: <name> "<description>" "<instructions>"
---

Call the `handoff_skills_create` MCP tool with `name` set to "$1", `description` set to "$2",
`instructions` set to "$3", and `actor` set to the current user's name if known, otherwise
"unknown". Confirm creation back to the user, including the new skill's id.
