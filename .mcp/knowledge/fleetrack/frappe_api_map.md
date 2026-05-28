# Fleetrack Frappe API Map
# Status: ✅ Done | 🔄 In Progress | ❌ Not Started

## Machine Registry

| Line | Frappe Endpoint | Supabase Replacement | Status |
|------|----------------|---------------------|--------|
| 9190, 11029, 11096, 14591, 18291 | `mxg_fleet_track.ft_machine_register.get_ft_machine_register` | `SELECT * FROM ft_machine JOIN ft_customer ...` | ❌ |
| 9765, 11391 | `mxg_fleet_track.ft_machine_register.get_ft_machine_details` | `SELECT * FROM ft_machine WHERE name = $1` | ❌ |
| 11512 | `ft_breakdown_dashboard.get_ft_machine_register` (filtered) | `SELECT * FROM ft_machine WHERE region = $1` | ❌ |
| 17324 | `get_ft_machine_register` (library pane) | `SELECT name, library_supabase_urls FROM ft_machine` | ❌ |

## Breakdowns

| Line | Frappe Endpoint | Supabase Replacement | Status |
|------|----------------|---------------------|--------|
| 9529, 6580, 15819 | `get_ft_breakdown_dbr_v2` / `FT_BREAKDOWN_DBR_METHOD` | `SELECT * FROM ft_breakdown WHERE status = ...` | ❌ |
| 8120 | `FT_BREAKDOWN_API` | `SELECT * FROM ft_breakdown` | ❌ |
| 12062 | `get_breakdown_categories` | `SELECT * FROM ft_breakdown_category` | ❌ |
| 12269 | `create_ft_breakdown_log` | `INSERT INTO ft_breakdown ...` | ❌ |
| 11253 | `update_ft_breakdown_full` | `UPDATE ft_breakdown SET ... WHERE name = $1` | ❌ |
| 5822, 6222 | (breakdown related) | TBD after audit | ❌ |

## Defects

| Line | Frappe Endpoint | Supabase Replacement | Status |
|------|----------------|---------------------|--------|
| 8310, 12384 | `FT_DEFECTS_METHOD` / `FT_DEFECT_SUMMARY_METHOD` | `SELECT * FROM ft_breakdown_defect` | ❌ |
| 13079 | `FT_DEFECT_UPDATE_METHOD` | `UPDATE ft_breakdown_defect SET ...` | ❌ |
| 13084 | `FT_DEFECT_CREATE_METHOD` | `INSERT INTO ft_breakdown_defect ...` | ❌ |
| 8387 | get single defect by name | `SELECT * FROM ft_breakdown_defect WHERE name = $1` | ❌ |
| 8481 | update defect doc | `UPDATE ft_breakdown_defect SET ...` | ❌ |
| 8611 | defect update (with doc_json) | `UPDATE ft_breakdown_defect SET ...` | ❌ |

## Service Plans

| Line | Frappe Endpoint | Supabase Replacement | Status |
|------|----------------|---------------------|--------|
| 12761, 13225 | `FT_ADD_SERVICE_PLAN_METHOD` | `INSERT INTO ft_service_plan ...` | ❌ |
| 13274, 15769 | `FT_GET_SERVICE_PLAN_LIST_METHOD` | `SELECT * FROM ft_service_plan WHERE machine_id = $1` | ❌ |
| 12922, 12968 | `update_ft_service_plan_entry` | `UPDATE ft_service_plan_entry SET ...` | ❌ |
| 13734 | `delete_ft_service_plan_entry` | `DELETE FROM ft_service_plan_entry WHERE name = $1` | ❌ |
| 13691 | (FSP related, refresh) | Supabase select with timestamp | ❌ |

## Technicians

| Line | Frappe Endpoint | Supabase Replacement | Status |
|------|----------------|---------------------|--------|
| 12454 | `FT_TECH_GET_METHOD` | `SELECT * FROM ft_technician` | ❌ |
| 12845 | `get_technician_contact` | `SELECT * FROM ft_technician WHERE name = $1` | ❌ |

## HMR (Hourly Meter Reading)

| Line | Frappe Endpoint | Supabase Replacement | Status |
|------|----------------|---------------------|--------|
| 13422 | `FT_HMR_ACTIVITY_METHOD` | `SELECT * FROM ft_hmr_log WHERE recorded_at BETWEEN $1 AND $2` | ❌ |
| 8334 | `FT_JOB_CARD_METHOD` | TBD | ❌ |

## Reports

| Line | Frappe Endpoint | Supabase Replacement | Status |
|------|----------------|---------------------|--------|
| 14088 | (FSP report) | `SELECT * FROM ft_service_plan WHERE ...` | ❌ |
| 15566, 15623 | (various reports) | TBD after audit | ❌ |
| 15690 | `GDR_URL` (General Defects Report) | `SELECT * FROM ft_breakdown_defect WHERE ...` | ❌ |
| 15872, 15949, 16029 | (various report views) | TBD after audit | ❌ |
| 12626 | fresh breakdown data | `SELECT * FROM ft_breakdown WHERE name = $1` | ❌ |

## Powertrack (embedded in Fleetrack)

| Line | Frappe Endpoint | Supabase Replacement | Status |
|------|----------------|---------------------|--------|
| 14449 | `ptz_powertrack.omnis_dashboard.pt_dashboard.send_report_now` | New `pt_report` table + CRON | ❌ |
| 14504 | `pt_dashboard.update_email_settings` | `UPDATE pt_settings SET ...` | ❌ |
| 14533 | `pt_dashboard.test_email_connection` | Edge Function or SMTP test | ❌ |

## Dynamic/Parameterized

| Line | Frappe Endpoint | Supabase Replacement | Status |
|------|----------------|---------------------|--------|
| 14665 | `e.frappePath` (dynamic path from entity) | Dynamic table lookup | ❌ |
| 15189, 15264 | `entity.path` (dynamic) | Dynamic table lookup | ❌ |
| 6253 | `callFrappe(method, { type: typeFilter })` | Parameterized query | ❌ |
| 6357 | `callFrappe(method, { name })` | `WHERE name = $1` | ❌ |
| 6387, 6508 | `callFrappe(method, { filters_json })` | Dynamic filter | ❌ |
| 6534 | `callFrappe(method, {...})` | TBD | ❌ |

## Summary
- **Total callFrappe() calls:** 59
- **Migrated:** 0
- **Remaining:** 59
- **Last updated:** 2026-05-28
