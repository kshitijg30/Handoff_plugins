---
description: Register another org's Handoff API key on this machine and switch to it
argument-hint: <local-name> <api-key>
---

Call the `handoff_add_org` MCP tool with `name` set to "$1" and `apiKey` set to "$2". It
verifies the key actually works before saving it, so report back exactly what it says —
including if it failed, in which case do not retry with a guessed or modified key, just relay
the error and ask the user to double-check the key was copied in full from that org's Handoff
dashboard (org switcher → Connect tab → Generate API key).

If "$2" looks like it might be truncated or contains obvious placeholder text (e.g.
`<your key>`), say so and ask for the real key instead of calling the tool.
