# Release Notes: Omnis v4.5.0 AURORA

**Release Date:** 2026-09-16  
**Version:** 4.5.0 AURORA  
**Platform:** Windows (Electron)

## [4.3.8] - 2026-09-07

### Added
- Added personalized dynamic user greeting on the Medical Dashboard.
- Integrated the Appointments Timeline (ported from Fleetrack) into the Medical Dashboard for a clear 7-day schedule view.
- Displayed the current version code directly in the top navigation bar between Switch Module and Settings.

### Changed
- Streamlined the Medical Dashboard layout:
  - Removed the Medical News & Updates section to prioritize core functions.
  - Reduced vertical padding for a cleaner, compact fit that requires less scrolling.
  - Removed redundant text labels from the bottom of shortcut cards for a cleaner look.

### Fixed
- Restored the daily Medical Quotes logic to the dashboard greeting area.
- Fixed a layout bug that was causing the Patient Directory tables to fall to the absolute bottom of the screen.

Omnis v4.3.7 Release

Improvements:
- Fixed a bug where Supabase errors (such as duplicates or missing fields) during Sales Entry were incorrectly masked as "undefined". Now, the specific error returned by Supabase is displayed clearly to the user.
- Added comprehensive error logging and diagnostics to the Stock Pipeline data fetching sequence to surface any silent connectivity or mapping failures.
- Patched unhandled promise rejections on the diagnostic schema fetch on startup.

Data Updates:
- Manually injected 9 missing machinery orders into the `group_sales` table as requested by the user.

