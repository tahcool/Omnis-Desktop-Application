# Omnis v4.3.5

## Enhancements & Fixes
- **Order Tracking**:
  - Fixed lead time data mapping from historical group sales records.
  - Cleared default date filters so the view loads unconditionally.
- **Machine Selection**:
  - Fixed live search for the "Machine / Item" input in the Edit Order Details modal. It now properly queries the live Supabase product database.
  - Resolved a z-index layering bug that was hiding the autocomplete dropdown behind the modal window.
