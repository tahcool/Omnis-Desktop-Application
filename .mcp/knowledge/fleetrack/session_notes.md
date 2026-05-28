# Fleetrack Session Notes

## Session: 2026-05-28

### What Was Done
- Frappe cover image migration in progress (662 images, net.request download fix applied)
- Added "Migrate to Supabase" button and modal to Machine Registry header
- Fixed Add Machine button that was broken during Migrate button insertion
- Fixed Edit modal z-index (100001 > machine detail popup 99999)
- Fixed frappe:downloadFile to use net.request (Chromium stack) instead of axios
  - axios → ETIMEDOUT on 197.242.136.253:443 (Frappe file server)
  - net.request → works (shares Electron browser session)
- Added 600ms pacing between downloads to prevent server flooding
- Added retry logic (3 attempts, 2s/4s/8s backoff) for ETIMEDOUT errors
- Created unified MCP server and agent structure (this session)
- Created git checkpoint and supabase-migration branch

### What Is Pending
1. **BLOCKER: Storage RLS policies** — Must be added to Supabase dashboard before migration can complete
   - Go to: https://supabase.com/dashboard/project/pfqaeewmlwfayxbgmuaq/sql/new
   - Run the SQL from `_shared/known_issues.md` → Storage RLS gotcha
2. **Verify migration completes** — Once RLS is fixed, run migration modal and confirm 662 images migrate
3. **Library file migration** — After cover images done, migrate PDF/ZIP library files
4. **Schema normalization** — `ft_machine` needs FK relationships (customer, region) before Phase 2
5. **Salestrack KPI fix** — Was paused for Fleetrack work; pick up next session

### Known Gotchas (Fleetrack-specific)
- callFrappe() → 59 calls still present. None replaced yet.
- machine_picture field on ft_machine stores Supabase URL after migration
- library_supabase_urls JSONB field stores { fieldName: url } — should become ft_machine_library table
- FT_MACHINE_ROWS is the in-memory machine list (from ft_machine Supabase table)
- FT_MACHINE_DETAIL_CACHE holds full detail objects keyed by machine name
- LIB_SUPABASE_MAP holds { machineName: { fieldName: supabaseUrl } }

### Next Steps (priority order)
1. Fix Storage RLS (user must do in Supabase dashboard)
2. Verify cover image migration
3. Schema Agent: design normalized schema for ft_customer, ft_region, ft_breakdown, ft_service_plan
4. Migration Agent: migrate ft_customer and ft_region (no dependencies)
5. Fleetrack Agent: replace machine register callFrappe() calls (lines 9190, 11029, 11096)
