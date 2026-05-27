# Progress log

User-facing changes for commit messages and release history.
Write features and fixes, not file paths or symbol names.

## Unreleased

### Added

- Added **Effort Wise** list tab (green) with a date/week toolbar: browse tasks and sub-tasks that had progress logged or were assigned on the selected day or work week, with previous/next navigation, a calendar date picker, and full in-list editing.
- Added Settings option **Omit no concerns in summary** (on by default) so HTML/CSS summary export hides the Concerns heading and “None” when a task or sub-task has no concerns in the date range; rows with concerns are unchanged.
- Added top bar Date pill and Today/Week productivity pills showing logged effort versus planned capacity in hours.
- Added Settings controls for default work days and which day the work week starts on; calendar, summary defaults, bandwidth, and notifications use these settings.
- Added blue metric pill styling with red or green highlights on spent hours when under or at/above the daily or weekly productivity goal.

### Changed

- Refined the Effort Wise date toolbar to match the list tab bar: compact pill layout, smaller navigation icons, and Day/Week toggles styled like the main filter tabs.
- Fixed the Effort Wise date toolbar so it only appears on the Effort Wise list tab and hides when you switch to another tab or leave the list view.
- Effort Wise week view now follows **Settings → Week starts on** for the displayed range, prev/next week navigation, date-picker jumps, and task filtering (e.g. Monday–Sunday when the week starts on Monday).

### Fixed

- Fixed progress and ETA entry so dates cannot be saved before the task or sub-task assigned date; invalid dates show an alert and the form is not cleared.
- Fixed HTML/CSS summary export so progress entries without category tags show the note on the same line as the entry number (wrapping as needed) instead of leaving the number on its own line.
- Fixed reverting a Done main task to Open or Ongoing so the task returns to the active list and the current status matches the latest status change (including same-day reopens).
- Fixed Generate Summary omitting tasks whose Assigned date was backdated after creation while effort in the range still counted toward bandwidth totals.

### Other

- Added project progress-log workflow (logup and logsum skills and always-on logup rule).

---
<!-- progress-log-published -->
