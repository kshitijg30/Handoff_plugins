---
description: List orgs registered on this machine and which one is active
---

Read `~/.handoff/orgs.json` if it exists. If it doesn't exist or has no orgs, say: "No orgs
registered yet (using HANDOFF_API_KEY from ~/.handoff/config, if set). Register one with
/handoff:org-add." Otherwise list every name under `orgs`, marking whichever one matches
`active`.
