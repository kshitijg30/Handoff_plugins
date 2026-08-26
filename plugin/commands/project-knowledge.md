---
description: Regenerate a project's knowledge base from its git history and save it to Handoff
argument-hint: <project-name>
---

First call `handoff_list_projects`. Compare its name+description list against "$1" the same way
`/handoff:project-checkpoint` does — resolve to an existing project's exact name if this is
clearly the same project under a different name, rather than assuming "$1" is new.

Then, in the current working directory (assumed to be that project's own git repo — if `git log`
fails here, tell the user this command has to be run from inside the project's repo, not
Handoff's), read the project's real history: `git log --oneline -100` for the shape of it,
`git log -20 --stat` for recent detail, and any README/CONTEXT/docs files already in the repo.
From that, write a markdown knowledge base in your own words — what the project actually is,
its architecture at a glance, and where it currently stands — grounded only in what you actually
read, never invented specifics. Keep it something a teammate with zero context could read in two
minutes and get oriented from; a few hundred words is usually enough, it doesn't need to cover
every commit.

Then call `handoff_set_project_knowledge` with `projectName` set to the resolved name and
`knowledgeBase` set to the markdown you wrote. This overwrites any previous knowledge base for
the project.
