---
description: Register another org's Handoff API key on this machine and switch to it
argument-hint: <local-name> <api-key>
---

If "$2" looks like it might be truncated or contains obvious placeholder text (e.g.
`<your key>`), say so and ask for the real key instead of continuing.

Read `~/.handoff/config` for `HANDOFF_API_URL`. Verify "$2" actually works before saving it:

  curl -sS "$HANDOFF_API_URL/projects" -H "Authorization: Bearer $2"

If this returns an `error`, report it back exactly and do not save anything — tell the user to
double-check the key was copied in full from that org's Handoff dashboard (org switcher →
Connect tab → Generate API key). Do not retry with a guessed or modified key.

If it works, read `~/.handoff/orgs.json` if it exists (JSON shape: `{"active": <name or null>,
"orgs": {"<name>": {"apiKey": "<key>"}, ...}}`), otherwise start from `{"active": null, "orgs":
{}}`. Set `orgs["$1"] = {"apiKey": "$2"}` and `active = "$1"`, then write the file back
(create `~/.handoff/` first if it doesn't exist). Confirm: registered "$1" (N projects visible
with this key) and switched to it — every Handoff command now acts on "$1" until
`/handoff:org-switch` is called again.
