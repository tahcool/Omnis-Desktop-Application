# Omnis v4.3.6

## Enhancements & Fixes
- **Sales Tracking**:
  - Fixed customer live search in the New Sale modal to query the live Supabase customer database.
  - Added new error handling popup for Supabase insertion failures.
- **SHE Operations**:
  - Introduced SHE Operations tab and logic in Medicals section.
  - Added ability to generate LTI September style reports directly from the system.
- **Dispensary**:
  - Implemented auto-deduction logic to update stock inventory when medication is dispensed.

# Omnis v4.3.5

## Enhancements & Fixes
- **Order Tracking**:
  - Fixed lead time data mapping from historical group sales records.
  - Cleared default date filters so the view loads unconditionally.
- **Machine Selection**:
  - Fixed live search for the "Machine / Item" input in the Edit Order Details modal. It now properly queries the live Supabase product database.
  - Resolved a z-index layering bug that was hiding the autocomplete dropdown behind the modal window.
