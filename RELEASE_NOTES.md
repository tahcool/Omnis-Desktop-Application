Omnis v4.3.7 Release

Improvements:
- Fixed a bug where Supabase errors (such as duplicates or missing fields) during Sales Entry were incorrectly masked as "undefined". Now, the specific error returned by Supabase is displayed clearly to the user.
- Added comprehensive error logging and diagnostics to the Stock Pipeline data fetching sequence to surface any silent connectivity or mapping failures.
- Patched unhandled promise rejections on the diagnostic schema fetch on startup.

Data Updates:
- Manually injected 9 missing machinery orders into the `group_sales` table as requested by the user.
