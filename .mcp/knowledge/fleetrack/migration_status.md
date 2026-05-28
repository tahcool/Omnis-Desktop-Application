# Fleetrack Migration Status

## Last Updated: 2026-05-28
## Branch: supabase-migration

## Table Status

| Table | Source | Records (Frappe) | Records (Supabase) | Status |
|-------|--------|----------------|--------------------|--------|
| `ft_machine` | Frappe DocType: `ft Machine` | 1,551 | 1,551 | ✅ Data migrated |
| `ft_machine` (cover images) | Frappe Storage | 662 | 0 (migrating) | 🔄 In progress |
| `ft_machine` (library files) | Frappe Storage | unknown | 0 | ❌ Not started |
| `ft_breakdown` | Frappe DocType | unknown | 0 | ❌ Not started |
| `ft_breakdown_defect` | Frappe DocType | unknown | 0 | ❌ Not started |
| `ft_breakdown_category` | Frappe DocType | unknown | 0 | ❌ Not started |
| `ft_service_plan` | Frappe DocType | unknown | 0 | ❌ Not started |
| `ft_service_plan_entry` | Frappe DocType | unknown | 0 | ❌ Not started |
| `ft_technician` | Frappe DocType | unknown | 0 | ❌ Not started |
| `ft_hmr_log` | Frappe DocType | unknown | 0 | ❌ Not started |
| `ft_customer` | Frappe (extracted from ft_machine) | unknown | 0 | ❌ Not started |
| `ft_region` | Frappe (extracted from ft_machine) | unknown | 0 | ❌ Not started |

## Schema Issues to Fix (before next migration phase)

1. **`ft_machine.library_supabase_urls` JSONB** → Should be `ft_machine_library` relational table
2. **`ft_machine.customer` string** → Should be `ft_machine.customer_id FK → ft_customer`  
3. **`ft_machine.region` string** → Should be `ft_machine.region_id FK → ft_region`
4. These changes require Schema Agent review before implementation

## File Migration Status

### Cover Images (machine-images bucket)
- **Total machines with images:** 662
- **Migrated:** 0
- **In progress:** Yes (migration modal running in app)
- **Blocker:** Storage RLS policies need to be added to Supabase dashboard
  - SQL: See `_shared/known_issues.md` → Storage RLS gotcha
  - Dashboard: https://supabase.com/dashboard/project/pfqaeewmlwfayxbgmuaq/sql/new

### Library Files (machine-library bucket)  
- **Status:** Not started
- **Depends on:** Cover image migration completing first

## API Migration Progress
- **Total callFrappe() calls:** 59
- **Replaced:** 0
- **Remaining:** 59
- See `frappe_api_map.md` for full breakdown
