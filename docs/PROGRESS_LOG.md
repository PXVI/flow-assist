# Progress log

User-facing changes for commit messages and release history.
Write features and fixes, not file paths or symbol names.

## Unreleased

### Added

- Added task search on the list view to find work by title, description, tags, bug IDs, project, categories, progress notes, concerns, and sub-task content.
- Added note search on the Notes view to find notes and lists by title, body, checklist items, and reminder labels.
- Improved task and note search with fuzzy matching (abbreviations and light typo tolerance) and optional `/pattern/` regex queries.
- Fixed add-task description editor so double-clicking or triple-clicking mixed bold/plain lines no longer toggles or spreads formatting unexpectedly.
- Fixed add-task description editor so clicking an empty field keeps focus and accepts typing.
- Fixed add-task description editor so clicking back into the field after editing elsewhere restores focus and typing.
- Added **Collapse All** on the tasks list heading to close every expanded task and sub-task at once.
- Added **Hide** / **Unhide** beside the Done heading on the All Tasks list to collapse or show completed tasks without leaving the section; the choice is saved in the profile and restored when you reopen the app or switch profiles.
- Added **Effort Wise** list tab (green) with a date/week toolbar: browse tasks and sub-tasks that had progress logged or were assigned on the selected day or work week, with previous/next navigation, a calendar date picker, and full in-list editing.
- Added Settings option **Omit no concerns in summary** (on by default) so HTML/CSS summary export hides the Concerns heading and “None” when a task or sub-task has no concerns in the date range; rows with concerns are unchanged.
- Added top bar Date pill and Today/Week productivity pills showing logged effort versus planned capacity in hours.
- Added Settings controls for default work days and which day the work week starts on; calendar, summary defaults, bandwidth, and notifications use these settings.
- Added blue metric pill styling with red or green highlights on spent hours when under or at/above the daily or weekly productivity goal.

### Changed

- Moved **Add New Task** to the top-right of the main list heading row (next to Main Tasks List and Sort) on the All Tasks view; the add-task form opens directly under the heading, above the active task list.
- Done list **Hide** / **Unhide** is stored per profile in settings (not session-only).
- Refined the Effort Wise date toolbar to match the list tab bar: compact pill layout, smaller navigation icons, and Day/Week toggles styled like the main filter tabs.
- Fixed the Effort Wise date toolbar so it only appears on the Effort Wise list tab and hides when you switch to another tab or leave the list view.
- Effort Wise week view now follows **Settings → Week starts on** for the displayed range, prev/next week navigation, date-picker jumps, and task filtering (e.g. Monday–Sunday when the week starts on Monday).
- Effort Wise shows total progress effort logged for the selected day or week in a green summary pill (toolbar and list heading), with light green/cyan styling on the date toolbar.
- Effort Wise dates use short month names; effort logged is shown as a number against work capacity (hours per work day minus full/partial PTO and non-work days) for that day or full work week, without unit labels.

### Fixed

- Fixed Effort Wise date navigation so previous/next arrows stay in a fixed position when the displayed day or week label changes length.
- Fixed **Add Progress** on tasks and sub-tasks so the description field empties immediately after a successful submit, ready for the next entry.
- Fixed editing an existing progress note so the description field shows a proper input box (border, background, and normal text color) instead of pale, borderless text; edit mode now reliably opens with focus and full-width layout matching Add Progress.
- Fixed progress and ETA entry so dates cannot be saved before the task or sub-task assigned date; invalid dates show an alert and the form is not cleared.
- Fixed HTML/CSS summary export so progress entries without category tags show the note on the same line as the entry number (wrapping as needed) instead of leaving the number on its own line.
- Fixed marking a task or sub-task Done so it collapses automatically when moved to the Done section (or when the sub-task is completed).
- Fixed reverting a Done main task to Open or Ongoing so the task returns to the active list and the current status matches the latest status change (including same-day reopens).
- Fixed Generate Summary omitting tasks whose Assigned date was backdated after creation while effort in the range still counted toward bandwidth totals.

### Other

- Added project progress-log workflow (logup and logsum skills and always-on logup rule).

---
<!-- progress-log-published -->
