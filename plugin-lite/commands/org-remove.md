---
description: Remove a registered org's key from this machine (does not revoke it on the backend)
argument-hint: <local-name>
---

Read `~/.handoff/orgs.json`. If "$1" isn't a key under `orgs`, tell the user, listing the real
registered names. Otherwise delete `orgs["$1"]`; if `active` was "$1", set `active = null`.
Write the file back. Mention explicitly in your reply that this only removes the local copy of
the key on this machine — it does not revoke or delete the key on the backend, so it can still
be used elsewhere until revoked from that org's Handoff dashboard if that's actually wanted.
