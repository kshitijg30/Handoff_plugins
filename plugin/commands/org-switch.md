---
description: Switch which registered org's key Handoff tools use, effective immediately
argument-hint: <local-name>
---

Call the `handoff_switch_org` MCP tool with `name` set to "$1". If it reports "$1" isn't
registered, call `handoff_list_orgs` and show the user the real registered names instead of
guessing — do not retry with a modified name.
