# Progress log

User-facing changes for commit messages and release history.
Write features and fixes, not file paths or symbol names.

## Unreleased

### Added

- Added Settings option **Omit no concerns in summary** (on by default) so HTML/CSS summary export hides the Concerns heading and “None” when a task or sub-task has no concerns in the date range; rows with concerns are unchanged.
- Added top bar Date pill and Today/Week productivity pills showing logged effort versus planned capacity in hours.
- Added Settings controls for default work days and which day the work week starts on; calendar, summary defaults, bandwidth, and notifications use these settings.
- Added blue metric pill styling with red or green highlights on spent hours when under or at/above the daily or weekly productivity goal.

### Changed

### Fixed

- Fixed Generate Summary omitting tasks whose Assigned date was backdated after creation while effort in the range still counted toward bandwidth totals.

### Other

- Added project progress-log workflow (logup and logsum skills and always-on logup rule).

---
<!-- progress-log-published -->
