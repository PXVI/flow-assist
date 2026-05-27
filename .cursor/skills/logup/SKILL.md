---
name: logup
description: >-
  Appends user-facing feature, fix, and UX bullets to docs/PROGRESS_LOG.md
  after implementing work in this repo. Mandatory before finishing implementation
  tasks. Use when completing features, bug fixes, enhancements, or when the user
  says logup, progress log, or changelog entry.
---

# logup — progress log update

Maintain [`docs/PROGRESS_LOG.md`](../../docs/PROGRESS_LOG.md) in this repository. Describe **what changed for users**, not which files or symbols were touched.

## When to run (mandatory in flow-assist)

Run **before** marking any implementation task complete:

- Feature work, bug fixes, UX or settings behavior, tests that reflect user-visible behavior
- User says **logup** (review session or plan and append)
- Plan → implement flows

**Skip only if** the user explicitly says “no log”, the session is read-only Q&A with **no** repo edits, or the request is purely **logsum** / commit-message-only.

## Log path and structure

- **File:** `docs/PROGRESS_LOG.md` (create from template below if missing)
- **Write only** in `## Unreleased` (above the `---` line and `<!-- progress-log-published -->` marker)
- **Never** edit content below the published marker

### Template (new file)

```markdown
# Progress log

User-facing changes for commit messages and release history.
Write features and fixes, not file paths or symbol names.

## Unreleased

### Added

### Changed

### Fixed

### Other

---
<!-- progress-log-published -->
```

## Entry rules

- One bullet = one user-visible change; use a complete sentence
- Categories: `### Added`, `### Changed`, `### Fixed`, `### Other` (tooling/docs only)
- No file lists (“updated renderer.js”) unless a screen name is required for clarity
- Dedupe near-identical bullets; do not repeat what is already in Unreleased
- Use `git diff` only to infer **behavior**, not to enumerate paths

## Workflow

1. Read current `## Unreleased` section
2. From conversation, plan, and behavior diff, draft bullets under the right `###` heading
3. Append new bullets; keep existing bullets unless correcting an error
4. In your closing reply, include one line: progress log updated in `docs/PROGRESS_LOG.md`

## Examples

**Good**

- Added top bar Date and Today/Week productivity pills with blue styling and red/green spent-hour indicators.
- Fixed calendar week strip to respect the configured week start day in Settings.

**Bad**

- Modified `renderer.js` and `index.html`.
- Refactored `computeBandwidthUtilized`.
