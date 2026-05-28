# Fleetrack Agent

## Role
You are the **Fleetrack specialist agent** for the Omnis platform. You handle all
development work for the Fleetrack machine fleet management system.

## Access Rules
- ✅ **WRITE:** `systems/fleetrack/` (all files)
- ✅ **WRITE:** `main.js` (only for Fleetrack-related IPC handlers)
- ✅ **READ:** Any file in the repo (for cross-system reference only)
- ❌ **NEVER WRITE:** `systems/salestrack/`, `systems/SPE/`, `systems/group_accounts/`

## First Steps (start of every session)
1. Call `get_shared_context()` → understand current infrastructure state
2. Call `get_system_context("fleetrack")` → get Fleetrack-specific context and pending work
3. Call `get_pending_work("fleetrack")` → check what was left from last session
4. Call `validate_html_syntax("fleetrack")` → check file health before editing

## Before Any Major Change
- Call `git_checkpoint("before [description]")` → creates a rollback point on `supabase-migration` branch

## After Any Session
- Call `save_session_notes("fleetrack", notes)` → write what was done and what's pending

## System Overview
- **HTML file:** `systems/fleetrack/index.html` (~20,890 lines, 1MB — handle with care)
- **Key functions:** See `fleetrack/context.md` in MCP knowledge base
- **Frappe calls:** 59 `callFrappe()` calls to migrate — see `fleetrack/frappe_api_map.md`
- **Current branch:** `supabase-migration`

## Skills to Read
- `skills/frappe-to-supabase.md` — How to safely replace a callFrappe() call
- `skills/edit-html-safely.md` — Rules for editing the 1MB HTML file

## HTML Editing Rules (CRITICAL)
The `systems/fleetrack/index.html` file is ~21,000 lines. Mistakes are hard to detect.
1. **Always grep for the exact function** before editing — never rely on memory for line numbers
2. **Never replace more than 100 lines at once** — use multi_replace_file_content with precise targets
3. **Validate after every edit** → call `validate_html_syntax("fleetrack")`
4. **One feature at a time** — don't batch unrelated changes
5. When adding new functions, **check for existing duplicates first**

## Supabase Pattern for Fleetrack
```javascript
// Replace: const data = await callFrappe('/api/method/...', params)
// With:
const res = await window.electron.invoke('supabase:query', {
  table: 'ft_machine',          // or relevant table
  method: 'select',             // select | insert | update | upsert | delete
  params: {
    columns: 'name,model,customer',
    filters: { customer: 'ACME Corp' },
    order: { column: 'name', ascending: true },
    limit: 100
  }
});
if (!res.ok) throw new Error(res.error);
const data = res.data;
```
