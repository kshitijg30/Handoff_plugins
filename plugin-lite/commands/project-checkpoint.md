---
description: Save the current session's reasoning as a new checkpoint on a project
argument-hint: <project-name> "<what happened>"
---

Resolve credentials the same way as `/handoff:project-list`.

First list projects (same GET as `/handoff:project-list`). Compare its name+description list
against what "$1" is actually asking for and what this session has actually been working on —
do not assume "$1" should become a brand-new project just because it doesn't exist verbatim;
check for an existing project that's clearly the same thing under a different name first, and
use that project's exact existing name if so.

Then write a `summary` yourself, from your own understanding of this conversation — never read
or paste the raw session transcript, this is you extracting the signal, not a verbatim log.
Keep it short, this is a scannable log entry, not a report:

1. **2-3 lines max** stating what this checkpoint covers and why it matters — no more.
2. Then a **line-by-line bulleted list** of the concrete things done (one line per fix/change/
   decision — "Fixed X", "Added Y", "Decided Z because ..."), not prose paragraphs. Skip a
   bullet's detail beyond a line unless it's genuinely non-obvious.

Do not write multi-paragraph summaries. If there's a lot to say, that's what the bullets are for
— each stays one line.

Then POST it:

  curl -sS -X POST "$HANDOFF_API_URL/projects/<encoded-name>/checkpoint" \
    -H "Authorization: Bearer $HANDOFF_API_KEY" -H "Content-Type: application/json" \
    -d '{"summary": "<your summary>", "actor": "<current user's name, or \"unknown\">"}'

If this genuinely is a new project (nothing in the list matches), also include `"description"`:
one sentence saying what the project actually is — not a restatement of this checkpoint's
summary. A genuinely new project's first session is still created automatically — no separate
setup step. If the user says this checkpoint should branch off an earlier checkpoint rather
than continue the latest one, also include `"parentId"` set to that earlier checkpoint's node
id.

Do not include a `rawTranscript` field — this command never reads the local session file off
disk, `summary` is the only thing it sends. If the response has an `error` field, relay it
verbatim and stop instead of retrying blindly.
