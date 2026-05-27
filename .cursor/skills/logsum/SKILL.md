---
name: logsum
description: >-
  Summarizes new Unreleased bullets in docs/PROGRESS_LOG.md into a git commit
  message by diffing against HEAD, optionally writes .git/COMMIT_EDITMSG, and
  archives entries after push on finalize. Use when the user says logsum,
  logsum commit, logsum finalize, or asks for a commit message from the progress log.
disable-model-invocation: true
---

# logsum — progress log → commit message

Turn **new** unreleased entries in [`docs/PROGRESS_LOG.md`](../../docs/PROGRESS_LOG.md) into a feature-level commit message. Optionally write [`.git/COMMIT_EDITMSG`](../../.git/COMMIT_EDITMSG) for an in-progress commit. Optionally **finalize** after the user has pushed.

## Invocation

- **logsum** — diff the progress log, draft commit message, show a copy-paste block (do not commit unless asked)
- **logsum commit** — same as logsum, and **write** the draft into `.git/COMMIT_EDITMSG` (still do not run `git commit` unless asked)
- User asks to update **COMMIT_EDITMSG** from the progress log → treat as **logsum commit**
- **logsum finalize** — archive all current Unreleased bullets into published history and clear Unreleased
- User asks for a commit message from the progress log

## Workflow

1. **Check staging for the progress log only** — `git status -- docs/PROGRESS_LOG.md` (do not use this to inspect other files).
2. **Diff only** `docs/PROGRESS_LOG.md` against HEAD (see [Diff commands](#diff-commands)).
3. **Identify new bullets** — from that diff and/or by parsing Unreleased vs `git show HEAD:docs/PROGRESS_LOG.md` (see [What is “new”](#what-is-new)).
4. **Draft the commit message** from **new** bullets only (see [Commit message format](#commit-message-format)).
5. **Deliver**
   - **logsum:** present the message in a single copy-paste block in chat.
   - **logsum commit:** write the same content to `.git/COMMIT_EDITMSG` (see [Write COMMIT_EDITMSG](#write-commit_editmsg)).
6. Do **not** run `git commit` unless the user explicitly asks.

## Git scope (diff)

**Only** run `git diff` on [`docs/PROGRESS_LOG.md`](../../docs/PROGRESS_LOG.md). Every diff command must end with that path.

- Do **not** run bare `git diff`, `git diff --cached`, or `git diff --stat` without the file path.
- Do **not** diff, stat, or summarize any other staged or unstaged files for logsum.
- Allowed besides diff: `git status -- docs/PROGRESS_LOG.md`, `git show HEAD:docs/PROGRESS_LOG.md`, and reading the working-tree file.

Commit message content comes **only** from new Unreleased bullets in the progress-log diff / HEAD comparison — not from other repo changes.

## Diff commands

`git diff docs/PROGRESS_LOG.md` alone is empty when the file is **staged**. Use the right command (always include the file path):

| Situation | Command |
|-----------|---------|
| Unstaged changes only | `git diff docs/PROGRESS_LOG.md` |
| Staged changes only | `git diff --cached docs/PROGRESS_LOG.md` |
| Staged + unstaged | `git diff docs/PROGRESS_LOG.md` and `git diff --cached docs/PROGRESS_LOG.md` |

If `git diff docs/PROGRESS_LOG.md` prints nothing but `git status -- docs/PROGRESS_LOG.md` shows the file staged, use **`git diff --cached docs/PROGRESS_LOG.md`**.

Diff hunks under `## Unreleased` with leading `+` (not `+++`) are the primary source for what to include in the commit message body.

## Parse Unreleased

1. Read `docs/PROGRESS_LOG.md` (working tree).
2. Extract content from `## Unreleased` until `---` or `<!-- progress-log-published -->`.
3. Group bullets under `### Added`, `### Changed`, `### Fixed`, `### Other`.

## What is “new”

Compare working-tree Unreleased bullets to HEAD:

```bash
git show HEAD:docs/PROGRESS_LOG.md
```

- If the file exists on HEAD, parse Unreleased there the same way.
- **New** = bullets in the working copy not present in HEAD Unreleased (normalize whitespace; order ignored). The progress-log **diff** should agree with this set.
- If the file is new on HEAD or HEAD has no Unreleased block, treat **all** current unreleased bullets as new.
- If there are **no** new bullets, say so; do **not** invent a commit message.

## Commit message format

- **Subject:** imperative, ~50–72 characters, main theme of the **new** progress-log bullets.
- **Body:** blank line after subject, then lines mirroring Added / Changed / Fixed / Other — one line per **new** bullet; wording may be tightened but must stay user-facing (no file paths or symbol names).
- Use `-` bullet lines in the body when several items ship together.

Example:

```
All Tasks: Done Hide/Unhide and Add New Task heading layout

- Added Hide / Unhide beside the Done heading on the All Tasks list; choice persists in the profile across reopen and profile switch.
- Moved Add New Task to the top-right of the main list heading row; form opens under the heading, above the active task list.
- Done list Hide / Unhide stored per profile in settings (not session-only).
```

## Write COMMIT_EDITMSG

When the user invokes **logsum commit** or asks to fill the commit message file:

1. Read existing [`.git/COMMIT_EDITMSG`](../../.git/COMMIT_EDITMSG) if present.
2. Replace the **user message** at the top (subject + body) with the drafted text.
3. **Preserve** the Git-generated comment block at the bottom (lines starting with `#`, including “Changes to be committed” and file lists) if it is already there — do not delete it.
4. If `.git/COMMIT_EDITMSG` does not exist yet, write subject + body only (no fabricated `#` footer).
5. Tell the user the file was updated and they can run `git commit` (or save and close their editor if a commit is already open).

Do not run `git commit` unless the user explicitly asks.

## Finalize (after push)

When the user confirms they **pushed** or says **logsum finalize**:

1. Read all bullets still in `## Unreleased` (entire unreleased set, not only “new”).
2. Insert a new section **above** the `---` marker:

   `## YYYY-MM-DD — <commit subject line>`

   Copy unreleased subsections and bullets under it (preserve `###` headings).
3. Clear all bullets from `## Unreleased` (leave empty `### Added` etc.).
4. Do not remove the marker or published history below it.
5. Remind the user to commit `docs/PROGRESS_LOG.md` if it is not already in the push.

## Do not

- Edit published history except when finalizing (new dated section only).
- List raw file paths in the commit message unless essential for operators.
- Run `git commit`, `git push`, or change git config unless the user explicitly asks.
- Invent bullets that are not in the progress-log diff / new Unreleased set.
- Run `git diff` (or `git diff --cached`) without `docs/PROGRESS_LOG.md` as the path argument.
