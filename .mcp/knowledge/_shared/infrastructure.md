# Shared Infrastructure — Omnis Platform

## App Overview
**Omnis** is an Electron desktop app that manages multiple business systems for an 
industrial machinery company. All systems run in a single Electron window, each loaded 
as an HTML file via `window:openDashboard` IPC.

## Systems
| System | Purpose | HTML File | Frappe Backend |
|--------|---------|-----------|---------------|
| **Fleetrack** | Machine fleet management, breakdowns, service plans, HMR | `systems/fleetrack/index.html` (1MB) | `fleetrack.machinery-exchange.com` → `102.218.13.121` |
| **Salestrack** | Quotations, customer visits, sales pipeline | `systems/salestrack/index.html` (1.1MB) | `salestrack.powerstar.co.zw` → `102.207.50.172` |
| **Powertrack** | Power equipment reporting (embedded inside Fleetrack HTML) | (inside fleetrack/index.html) | `powertrack.powerstar.co.zw` → `102.218.13.120` |
| **Engtrack** | Engineering tracking | (shared Fleetrack server) | `engtrack.machinery-exchange.com` → `102.218.13.121` |
| **SPE** | Spareparts Exchange catalog | `systems/SPE/index.html` (6KB) | `omnis.spareparts-exchange.com` → `102.218.13.123` |
| **Group Accounts** | Financial accounts | `systems/group_accounts/index.html` (39KB) | — |
| **Customer Portal** | Self-service portal for machine customers | `systems/fleetrack/customer-portal.html` | Supabase only ✅ |

## Electron Architecture

### Entry Points
- **Main process:** `main.js`
- **Preload:** `assets/js/preload.js` — exposes all APIs to renderer via `contextBridge`
- **Login:** `index.html` (root) — frameless window
- **Dashboard:** opened via `window:openDashboard` IPC → maximized window with frame

### Key File Sizes
- `main.js`: 1,634 lines
- `systems/fleetrack/index.html`: ~20,890 lines (1MB) — **MONOLITH, needs modularization**
- `systems/salestrack/index.html`: ~1.1MB — **MONOLITH**

---

## Supabase Configuration

| Setting | Value |
|---------|-------|
| **Project Ref** | `pfqaeewmlwfayxbgmuaq` |
| **URL** | `https://pfqaeewmlwfayxbgmuaq.supabase.co` |
| **Service Key** | `sb_secret_QDTpvp_agRT3cuB9nXrfPw_I9fZHEOc` (new-format service role) |
| **Anon Key** | (separate — used in customer portal only) |
| **Dashboard** | `https://supabase.com/dashboard/project/pfqaeewmlwfayxbgmuaq` |

### Storage Buckets
| Bucket | Public | Purpose | RLS Status |
|--------|--------|---------|-----------|
| `machine-images` | ✅ | Machine cover photos | Needs SELECT+INSERT+UPDATE+DELETE policies |
| `machine-library` | ✅ | Machine PDFs, manuals, ZIPs | Needs SELECT+INSERT+UPDATE+DELETE policies |
| `product-assets` | ✅ | SPE product images | — |
| `psv-attachments` | ❌ | PSV service attachments | — |
| `reports` | ✅ | Generated PDF reports | — |

### Critical: Storage RLS
Supabase Storage upsert requires **SELECT + INSERT + UPDATE + DELETE** policies even with
service role key in Electron context. Add these to storage.objects for each bucket:
```sql
CREATE POLICY "machine_images_insert" ON storage.objects 
  FOR INSERT TO public WITH CHECK (bucket_id = 'machine-images');
CREATE POLICY "machine_images_update" ON storage.objects 
  FOR UPDATE TO public USING (bucket_id = 'machine-images') WITH CHECK (bucket_id = 'machine-images');
CREATE POLICY "machine_images_select" ON storage.objects 
  FOR SELECT TO public USING (bucket_id = 'machine-images');
CREATE POLICY "machine_images_delete" ON storage.objects 
  FOR DELETE TO public USING (bucket_id = 'machine-images');
-- Same for machine-library
```

---

## IPC Channels (main.js handlers)

### Supabase
| Channel | Method | Purpose |
|---------|--------|---------|
| `supabase:query` | `{ table, method, params }` | All DB operations via service role. Methods: `select`, `getOne`, `insert`, `update`, `upsert`, `delete` |
| `supabase:auth` | `{ action, email, userId, password }` | Auth admin: `resetPassword`, `inviteUser`, `setPassword`, `impersonate`, `listUsers`, `suspendUser`, `makeAdmin`, `removeAdmin` |
| `supabase:signIn` | `{ email, password }` | Supabase sign-in |
| `supabase:signOut` | — | Sign out |
| `supabase:getSession` | — | Get current session |
| `storage:upload` | `{ bucket, path, base64Data, contentType }` | Upload file to Supabase Storage |

### Frappe (TO BE DECOMMISSIONED)
| Channel | Method | Purpose |
|---------|--------|---------|
| `frappe:request` | `{ url, method, data, headers, timeout }` | Generic Frappe API call via Electron session |
| `frappe:downloadFile` | `{ url }` | Download binary from Frappe → base64. Uses **net.request (Chromium stack)** then falls back to axios. **Do NOT use axios directly — ETIMEDOUT on 197.242.136.253:443** |

### Other
| Channel | Purpose |
|---------|---------|
| `print:toPDF` | Native PDF export via hidden BrowserWindow |
| `print:openFile` | Open file in system default app |
| `window:openDashboard` | Open system HTML in maximized frame window |
| `window:openLogin` | Return to login |
| `portal:impersonate` | Open customer portal as an impersonated user |
| `shell:openUrl` | Open URL in system browser |
| `sync:fullSync` | Trigger full Frappe→Supabase sync (legacy) |

---

## DNS / Network Map (Frappe Servers)

All DNS overrides are set in `main.js` via `app.commandLine.appendSwitch('host-rules', ...)`:

| Domain | IP | System |
|--------|----|--------|
| `fleetrack.machinery-exchange.com` | `102.218.13.121` | Fleetrack + Engtrack |
| `engtrack.machinery-exchange.com` | `102.218.13.121` | Engtrack |
| `engtrack.powerstar.co.zw` | `102.218.13.121` | Engtrack (v2) |
| `salestrack.powerstar.co.zw` | `102.207.50.172` | Salestrack |
| `powertrack.powerstar.co.zw` | `102.218.13.120` | Powertrack |
| `omnis.spareparts-exchange.com` | `102.218.13.123` | SPE |

### CRITICAL GOTCHA: File Downloads
**Never use axios directly to download files from Frappe servers.**
- Frappe API calls work because they go through the Electron session (browser stack)
- Axios uses Node TCP stack → gets `ETIMEDOUT` on port 443
- **Solution:** Use `net.request` from Electron (Chromium stack, shares session)
- The `frappe:downloadFile` IPC handler already implements this with axios fallback

---

## Super Admin
`takunda@industrial-exchange.group` — protected super-admin, cannot be suspended/deleted/demoted.

---

## Current Migration Status
| System | Status |
|--------|--------|
| Fleetrack Auth | ✅ Migrated to Supabase |
| Fleetrack ft_machine table | ✅ In Supabase (partial — cover images migrating) |
| Fleetrack library files (Storage) | 🔄 In progress (662 images, RLS policies needed) |
| Fleetrack breakdowns | ❌ Still on Frappe |
| Fleetrack service plans | ❌ Still on Frappe |
| Fleetrack HMR logs | ❌ Still on Frappe |
| Salestrack | ❌ Not started |
| SPE | ❌ Not started |
