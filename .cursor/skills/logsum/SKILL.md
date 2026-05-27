---
name: logsum
description: >-
  Summarizes new Unreleased bullets in docs/PROGRESS_LOG.md into a git commit
  message by diffing against HEAD, and archives entries after push on finalize.
  Use when the user says logsum, logsum finalize, or asks for a commit message
  from the progress log.
disable-model-invocation: true
---

# logsum — progress log → commit message

Turn **new** unreleased entries in [`docs/PROGRESS_LOG.md`](../../docs/PROGRESS_LOG.md) into a feature-level commit message. Optionally **finalize** after the user has pushed.

## Invocation

- **logsum** — diff and produce commit message (do not commit unless asked)
- **logsum finalize** — archive all current Unreleased bullets into published history and clear Unreleased
- User asks for a commit message from the progress log

## Parse Unreleased

1. Read `docs/PROGRESS_LOG.md`
2. Extract content from `## Unreleased` until `---` or `<!-- progress-log-published -->`
3. Group bullets under `### Added`, `### Changed`, `### Fixed`, `### Other`

## What is “new”

Compare working-tree Unreleased bullets to HEAD:

```bash
git show HEAD:docs/PROGRESS_LOG.md
```

- If the file exists on HEAD, parse Unreleased there the same way
- **New** = bullets in the working copy not present in HEAD Unreleased (normalize whitespace; order ignored)
- If the file is new on HEAD or HEAD has no Unreleased block, treat **all** current unreleased bullets as new
- If there are **no** new bullets, say so; do **not** invent a commit message

## Commit message format

- **Subject:** imperative, ~50–72 characters, main theme of the new work
- **Body:** blank line, then grouped lines mirroring Added / Changed / Fixed / Other (one line per **new** bullet; wording may be tightened)
- Present in a single copy-paste block
- Do **not** run `git commit` unless the user explicitly asks

Example:

```
feat(top-bar): add date and productivity metrics with work-week settings

Added top bar Date and Today/Week productivity pills with capacity-based goals.
Added Settings for default work days and week start day across calendar and summary.
```

## Finalize (after push)

When the user confirms they **pushed** or says **logsum finalize**:

1. Read all bullets still in `## Unreleased` (entire unreleased set, not only “new”)
2. Insert a new section **above** the `---` marker:

   `## YYYY-MM-DD — <commit subject line>`

   Copy unreleased subsections and bullets under it (preserve `###` headings)
3. Clear all bullets from `## Unreleased` (leave empty `### Added` etc.)
4. Do not remove the marker or published history below it
5. Remind the user to commit `docs/PROGRESS_LOG.md` if it is not already in the push

## Do not

- Edit published history except when finalizing (new dated section only)
- List raw file paths in the commit message unless essential for operators
