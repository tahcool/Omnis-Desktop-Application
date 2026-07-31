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
\n- **Commit d310495** (2026-07-28): Restore point: fleetrack machine lookup service tracking and clickable cards added
\n- **Commit cbbe0ea** (2026-07-28): Enhance View Modal and revamp Service Tracking Report (STR)
\n- **Commit 4c15df2** (2026-07-29): Update Shortcuts strip and add premium Export Report button
\n- **Commit ed31a4a** (2026-07-30): Restore point before migrating defects schema
\n- **Commit 2b61773** (2026-07-30): Restore point: before adding category filter and sync
\n- **Commit 773cd13** (2026-07-30): Fix category dropdown styling and force-sync categories natively
\n- **Commit 1ce4a9f** (2026-07-30): fix: update payload.modified to modified_at for editing defects
\n- **Commit 2798282** (2026-07-30): chore: update session notes and commit log
\n- **Commit c5d112b** (2026-07-30): feat: standardise defect loading animations with omnis loader modal
\n- **Commit d962a63** (2026-07-30): chore: update session notes and commit log
\n- **Commit c458576** (2026-07-31): style: update fleetrack dashboard quick access grid and action buttons
\n- **Commit a5eb754** (2026-07-31): feat: add machine modal - model live search with OEM autofill, customer live search + add new modal, fix machine register refresh bug
\n- **Commit 7c19e53** (2026-07-31): fix: customer dropdown HTML injection, customer upsert API call, clear filters on machine save
\n- **Commit 5965c0a** (2026-07-31): fix: machine register shows new machine after save - use in-memory data not Frappe reload
\n- **Commit fceaefa** (2026-07-31): fix: persist locally-added machines across Frappe reloads via FT_SUPABASE_EXTRA_ROWS
\n- **Commit 4385d28** (2026-07-31): feat: migrate Machine Register to Supabase as primary source of truth
\n- **Commit 262b23f** (2026-07-31): fix: remove showGlobalLoader/hideGlobalLoader calls that don't exist in codebase
\n- **Commit 381d1bd** (2026-07-31): feat: complete Supabase migration - all machine reads now from Supabase/memory
\n- **Commit 3241f85** (2026-07-31): feat: delete machine + audit trail + UI freeze fix
\n- **Commit f7469b7** (2026-07-31): fix: settings modal broken by CSV join syntax error
\n- **Commit 0937872** (2026-07-31): fix: make openSettingsModal immediately available on window
\n- **Commit 475cb07** (2026-07-31): fix: assign all settings tab functions directly to window at declaration
\n- **Commit 07ebb4d** (2026-07-31): fix: add dedicated isolated script block for settings modal functions
\n- **Commit 00817af** (2026-07-31): feat: add loading overlay to Machine Registry (matches defects UX)
\n- **Commit 381c1b9** (2026-07-31): fix: machine delete uses match instead of filter in Supabase query
\n- **Commit a203820** (2026-07-31): fix: Machine Register shortcut now opens view-machines (Supabase registry)
\n- **Commit 76b5132** (2026-07-31): feat: predictive service recommendation in Field Service Plan modal
\n- **Commit 042c3a9** (2026-07-31): feat: FSP recommended service adds to defects checklist
\n- **Commit e740a7b** (2026-07-31): style: apply frosted glass translucent effect to top navbar
\n- **Commit be51f8d** (2026-07-31): style: apply frosted glass to shortcuts strip and make sticky
\n- **Commit fa8f18c** (2026-07-31): style: change shortcuts strip to dark frosted glass
\n- **Commit edc98eb** (2026-07-31): feat(ui): add solid colors to shortcut buttons and Edit button to lookup modal
\n- **Commit 5bc9273** (2026-07-31): style: make service timeline more compact and move it up
\n- **Commit 5cb4ca2** (2026-07-31): style: add subtle premium tinted backgrounds to report cards
\n- **Commit 40d9d6b** (2026-07-31): style: enhance KPI dashboard cards with premium pastel gradients
\n- **Commit fd40f20** (2026-07-31): style: enhance dash shortcuts card with premium glassmorphism
\n- **Commit 8513aea** (2026-07-31): style: flatten shortcuts strip and make buttons flat
\n- **Commit 82b7a3f** (2026-07-31): feat(machine-registry): add log defect and service plan buttons to detail modal
\n- **Commit 1681c47** (2026-07-31): fix(machine-registry): fix modal stacking order for machine detail actions
\n- **Commit c73c327** (2026-07-31): fix(machine-registry): fix modal stacking contexts and object rendering in defect modal
\n- **Commit 8f2f49d** (2026-07-31): fix(machine-registry): fix JS z-index override causing machine modal to cover all inner modals
\n- **Commit a3c6071** (2026-07-31): fix(machine-registry): fix FSP modal stacking order
\n- **Commit a65b4b5** (2026-07-31): fix(machine-registry): remove migrate to supabase button and fix bulk hmr entry
\n- **Commit a590250** (2026-07-31): fix(machine-registry): fix JS syntax error breaking script block
\n- **Commit 75e592d** (2026-07-31): feat(dashboard): change Update HMR to Bulk HMR Entry
\n- **Commit aa62469** (2026-07-31): style(dashboard): revert shortcuts strip style
\n- **Commit a210273** (2026-07-31): feat(machine-registry): sync warranty options with Frappe
\n- **Commit 2d69f2b** (2026-07-31): style(machine-registry): rename fleet number labels
\n- **Commit b33731f** (2026-07-31): feat(field-service): update FSI template format and add SCU tab
\n- **Commit fddf076** (2026-07-31): feat(field-service): migrate technicians to Supabase with live search and add modal
\n- **Commit 54a2ae3** (2026-07-31): feat(technicians): add dedicated management view
\n- **Commit 2abda7e** (2026-07-31): fix(technicians): add view auto-load to router
\n- **Commit 4bbb48b** (2026-07-31): feat(fsi): add Internal Fleet Number to job instructions templates
\n- **Commit 9c797e6** (2026-07-31): feat(dashboard): migrate KPI metrics to query Supabase directly
