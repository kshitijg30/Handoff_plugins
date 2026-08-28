---
description: Switch which registered org's key Handoff tools use, effective immediately
argument-hint: <local-name>
---

Read `~/.handoff/orgs.json`. If "$1" isn't a key under `orgs`, follow `/handoff:org-list`'s
logic and show the user the real registered names instead of guessing — do not retry with a
modified name. Otherwise set `active = "$1"` and write the file back. Confirm: switched to
"$1" — every Handoff command now acts on this org.
