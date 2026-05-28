# Cross-System Known Issues & Gotchas

## ⚠️ GOTCHA: File Downloads — Use net.request, NOT axios
**Date:** 2026-05-28  
**Systems:** Fleetrack (and any system downloading from Frappe)  
**Description:** Downloading files from Frappe servers using axios in the main.js process 
results in `connect ETIMEDOUT 197.242.136.253:443`. The Frappe server drops raw Node TCP 
connections but accepts Chromium-backed connections.  
**Fix:** Use Electron's `net.request` (Chromium stack) in `frappe:downloadFile` IPC handler.
The handler in main.js already implements this with axios as fallback. Never call axios 
directly to download from Frappe.

---

## ⚠️ GOTCHA: Supabase Storage RLS — upsert needs 4 policies
**Date:** 2026-05-28  
**Systems:** All (storage uploads)  
**Description:** Even with the service-role key, `supabase.storage.from(bucket).upload(..., { upsert: true })` 
fails with "new row violates row-level security policy" in Electron context unless explicit 
storage.objects policies exist.  
**Fix:** Add SELECT + INSERT + UPDATE + DELETE policies to storage.objects for each bucket.
```sql
CREATE POLICY "{bucket}_select" ON storage.objects FOR SELECT TO public USING (bucket_id = '{bucket}');
CREATE POLICY "{bucket}_insert" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = '{bucket}');
CREATE POLICY "{bucket}_update" ON storage.objects FOR UPDATE TO public USING (bucket_id = '{bucket}') WITH CHECK (bucket_id = '{bucket}');
CREATE POLICY "{bucket}_delete" ON storage.objects FOR DELETE TO public USING (bucket_id = '{bucket}');
```

---

## ⚠️ GOTCHA: Supabase new key format
**Date:** 2026-05-28  
**Description:** The project uses the new Supabase key format `sb_secret_...` (not the 
legacy JWT format). The `@supabase/supabase-js` v2.105.3 SDK handles this correctly.
Never try to decode this as a JWT.

---

## ⚠️ GOTCHA: Edit Modal Z-Index conflict
**Date:** 2026-05-28  
**System:** Fleetrack  
**Description:** The machine detail popup uses z-index 99999. The Add/Edit machine modal 
must use z-index 100001 or higher, otherwise it renders behind the popup.  
**Fix:** `#am-overlay` z-index set to 100001. Machine detail popup at 99999.

---

## ⚠️ GOTCHA: Monolith HTML file line drift
**Date:** 2026-05-28  
**System:** Fleetrack, Salestrack  
**Description:** `systems/fleetrack/index.html` is ~21,000 lines. Line numbers in notes 
become stale immediately after any edit above that line. Always grep for the target 
function/element before editing — never rely on remembered line numbers.  
**Fix:** Use `search_code()` MCP tool or `Select-String` to find exact current line numbers.

---

## ⚠️ GOTCHA: Supabase migration branch
**Date:** 2026-05-28  
**Description:** All migration work is done on the `supabase-migration` branch.
`main` branch is the stable fallback. Never merge until a full system is verified.
To switch back: `git checkout main`. To resume: `git checkout supabase-migration`.

---

## ⚠️ GOTCHA: auth.role() deprecated in Supabase RLS
**Description:** Don't use `auth.role() = 'authenticated'` in RLS policies. 
Use `TO authenticated` clause instead. See Schema Agent AGENT.md for the correct template.

---

## ℹ️ NOTE: Super Admin Protection
**Description:** `takunda@industrial-exchange.group` is the protected super-admin.
The main.js `supabase:auth` handler blocks suspend/delete/demote for this email server-side.
Never remove this protection.
