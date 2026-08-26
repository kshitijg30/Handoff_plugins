---
description: Remove a registered org's key from this machine (does not revoke it on the backend)
argument-hint: <local-name>
---

Call the `handoff_remove_org` MCP tool with `name` set to "$1". Mention explicitly in your
reply that this only removes the local copy of the key on this machine — it does not revoke or
delete the key on the backend, so it can still be used elsewhere until revoked from that org's
Handoff dashboard if that's actually wanted.
