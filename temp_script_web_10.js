
    // =========================================================
    //  LIBRARY FILE VIEWER
    // =========================================================
    let _libZoom = 1;

    const LIB_IMAGE_EXTS = /\.(jpe?g|png|gif|webp|svg|bmp|tiff?)(\?|$)/i;
    const LIB_PDF_EXTS   = /\.pdf(\?|$)/i;

    function openLibraryViewer(url, label) {
      if (!url) return;

      const overlay = document.getElementById('lib-viewer-overlay');
      const imgWrap = document.getElementById('lib-viewer-img-wrap');
      const imgEl   = document.getElementById('lib-viewer-img');
      const pdfEl   = document.getElementById('lib-viewer-pdf');
      const genEl   = document.getElementById('lib-viewer-generic');
      const dlBtn   = document.getElementById('lib-viewer-download-btn');
      const genDlBtn= document.getElementById('lib-viewer-generic-dl');
      const labelEl = document.getElementById('lib-viewer-label');
      const typeEl  = document.getElementById('lib-viewer-type');
      const iconEl  = document.getElementById('lib-viewer-icon');
      const zoomCtrl= document.getElementById('lib-viewer-zoom-controls');

      if (!overlay) return;

      // Reset all panels
      imgWrap.classList.remove('lib-active');
      pdfEl.classList.remove('lib-active');
      genEl.classList.remove('lib-active');
      zoomCtrl.classList.remove('lib-active');
      pdfEl.src = '';
      imgEl.src = '';
      _libZoom = 1;
      imgEl.style.transform = 'scale(1)';

      // Set label
      labelEl.textContent = label || 'Document';

      // Set download link
      dlBtn.href = url;
      dlBtn.download = label || 'download';
      if (genDlBtn) { genDlBtn.href = url; genDlBtn.download = label || 'download'; }

      if (LIB_IMAGE_EXTS.test(url)) {
        // IMAGE
        typeEl.textContent = 'Image';
        iconEl.textContent = '🖼️';
        imgEl.src = url;
        imgWrap.classList.add('lib-active');
        zoomCtrl.classList.add('lib-active');
        document.getElementById('lib-viewer-zoom-pct').textContent = '100%';
      } else if (LIB_PDF_EXTS.test(url)) {
        // PDF
        typeEl.textContent = 'PDF Document';
        iconEl.textContent = '📕';
        pdfEl.src = url;
        pdfEl.classList.add('lib-active');
      } else {
        // GENERIC (Word, Excel, ZIP, etc.)
        const ext = (url.match(/\.([a-z0-9]+)(\?|$)/i) || [])[1] || 'file';
        const extIcons = { doc:'📝', docx:'📝', xls:'📊', xlsx:'📊', zip:'🗜️', rar:'🗜️', ppt:'📽️', pptx:'📽️', txt:'📄' };
        typeEl.textContent = ext.toUpperCase() + ' File';
        iconEl.textContent = extIcons[ext.toLowerCase()] || '📄';
        document.getElementById('lib-viewer-generic-icon').textContent = extIcons[ext.toLowerCase()] || '📄';
        document.getElementById('lib-viewer-generic-name').textContent = label || 'File';
        genEl.classList.add('lib-active');
      }

      overlay.classList.add('lib-open');

      // Esc to close
      overlay._libEscHandler = (e) => { if (e.key === 'Escape') closeLibraryViewer(); };
      document.addEventListener('keydown', overlay._libEscHandler);
    }

    function closeLibraryViewer() {
      const overlay = document.getElementById('lib-viewer-overlay');
      if (!overlay) return;
      overlay.classList.remove('lib-open');
      // cleanup iframe src to stop any ongoing PDF load
      const pdfEl = document.getElementById('lib-viewer-pdf');
      if (pdfEl) pdfEl.src = '';
      if (overlay._libEscHandler) {
        document.removeEventListener('keydown', overlay._libEscHandler);
        overlay._libEscHandler = null;
      }
    }

    function libViewerZoom(delta) {
      _libZoom = Math.max(0.25, Math.min(5, _libZoom + delta));
      const img = document.getElementById('lib-viewer-img');
      if (img) img.style.transform = `scale(${_libZoom})`;
      const pct = document.getElementById('lib-viewer-zoom-pct');
      if (pct) pct.textContent = Math.round(_libZoom * 100) + '%';
    }

    function libViewerZoomReset() {
      _libZoom = 1;
      const img = document.getElementById('lib-viewer-img');
      if (img) img.style.transform = 'scale(1)';
      const pct = document.getElementById('lib-viewer-zoom-pct');
      if (pct) pct.textContent = '100%';
    }

    // Close on overlay click (outside toolbar/content)
    document.getElementById('lib-viewer-overlay')?.addEventListener('click', function(e) {
      if (e.target === this) closeLibraryViewer();
    });

    // =========================================================
    //  SUPABASE MACHINE REGISTER SYNC
    //  Batch-upserts all machines to ft_machine after load.
    //  Frappe layout fields (column_break_*, section_break_*,
    //  colb*, cbr*, etc.) are excluded — they have no value
    //  in Supabase and would bloat the table with null values.
    // =========================================================
    const SUPABASE_MACHINE_SKIP = /^(column_break|section_break|colb|cbrb|cb[0-9]|colbr|madr_section|fb_section|get_comp|btn_|initial_service_section|service_guide_section|under_carriage_section|sprokects_section|customer_file_section|telematics_section|hmr_section|service_details_section|warranty_details_section|track_components|library_section|get_components_section|section_break_2|service_obligation_section|cbbb|colbr_nre|col_br|cbroemreg|col_br_service|doctype|owner|modified_by|docstatus)$|^(__|_)|^(idx|creation)$/i;

    window.syncMachinesToSupabase = async function(machines) {
      if (!window.supabase || !machines?.length) return;

      const rows = machines.map(m => {
        const row = {};
        for (const [k, v] of Object.entries(m)) {
          if (!SUPABASE_MACHINE_SKIP.test(k)) {
            // Normalize timestamps and empty strings
            row[k] = (v === '' || v === undefined) ? null : v;
          }
        }
        // Ensure required key is present
        if (!row.name) return null;
        return row;
      }).filter(Boolean);

      if (!rows.length) return;

      const CHUNK = 50;
      let synced = 0, errors = 0;
      for (let i = 0; i < rows.length; i += CHUNK) {
        try {
          const chunk = rows.slice(i, i + CHUNK);
          await window.supabase.from('ft_machine').upsert(chunk);
          synced += chunk.length;
        } catch (e) {
          errors++;
          console.warn('[Supabase Sync] Machine chunk failed:', e);
        }
      }
      console.log(`[Supabase Sync] ✓ ft_machine: ${synced} synced, ${errors} chunk errors`);
    };

    // =========================================================
    //  LIBRARY FILES → SUPABASE STORAGE
    // =========================================================
    const LIB_FIELDS = [
      ['Filters List',          'filters_list'],
      ['PDI Checklist',         'pdi_checklist'],
      ['Equipment Info Form',   'equipment_information_form'],
      ['Belt Dimensions',       'belt_dimensions'],
      ['Hyd. Filters Dim.',     'hyd_filters_dimensions'],
      ['Wty. Certificate',      'wty_certificate'],
      ['NEI Checklist',         'nei_checklist'],
      ['Machine Data Plate',    'machine_data_plate'],
      ['Engine Data Plate',     'engine_data_plate'],
      ['RPC List',              'rpc_list'],
      ['Parts Manuals',         'parts_manuals'],
      ['Parts Manuals 2',       'parts_manuals_2'],
      ['Parts Manuals 3',       'parts_manuals_3'],
      ['Misc Files',            'misc_files'],
    ];

    // In-memory cache: { 'machineName': { filters_list: 'https://...', ... }, ... }
    window.LIB_SUPABASE_MAP = {};

    // Load Supabase Storage URLs from ft_machine.library_supabase_urls
    window.loadLibSupabaseUrls = async function() {
      try {
        const res = await window.electron.invoke('supabase:query', {
          table: 'ft_machine',
          method: 'select',
          params: { columns: 'name,library_supabase_urls', options: {} }
        });
        if (res?.data?.length) {
          window.LIB_SUPABASE_MAP = {};
          res.data.forEach(row => {
            if (row.library_supabase_urls && Object.keys(row.library_supabase_urls).length) {
              window.LIB_SUPABASE_MAP[row.name] = row.library_supabase_urls;
            }
          });
          const synced = Object.keys(window.LIB_SUPABASE_MAP).length;
          if (synced) {
            const countEl = document.getElementById('lib-sync-count');
            if (countEl) countEl.textContent = `${synced} machine(s) have library files in Supabase Storage`;
          }
          console.log(`[LibSync] Loaded Supabase URLs for ${synced} machines`);
        }
      } catch (e) {
        console.warn('[LibSync] loadLibSupabaseUrls failed:', e);
      }
    };

    // Helper: get the best URL for a machine+field (Supabase first, Frappe fallback)
    window.getLibraryUrl = function(machineName, fieldKey, frappeFieldValue) {
      const sbUrl = (window.LIB_SUPABASE_MAP[machineName] || {})[fieldKey];
      if (sbUrl) return sbUrl;
      if (!frappeFieldValue) return null;
      const u = String(frappeFieldValue).trim();
      if (!u) return null;
      return u.startsWith('http') ? u : (typeof FLEET_BASE_URL !== 'undefined' ? FLEET_BASE_URL : '') + u;
    };

    // Detect MIME type from filename
    function _libContentType(filename) {
      const ext = (filename.split('.').pop() || '').toLowerCase();
      const map = {
        pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg',
        png: 'image/png', gif: 'image/gif', webp: 'image/webp',
        svg: 'image/svg+xml', bmp: 'image/bmp',
        doc: 'application/msword',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        xls: 'application/vnd.ms-excel',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        zip: 'application/zip', txt: 'text/plain',
      };
      return map[ext] || 'application/octet-stream';
    }

    // Progress UI helpers
    function _libProgressLog(msg, color) {
      const log = document.getElementById('lib-sync-progress-log');
      if (!log) return;
      const line = document.createElement('div');
      line.style.color = color || '#64748b';
      line.textContent = msg;
      log.appendChild(line);
      log.scrollTop = log.scrollHeight;
    }
    function _libProgressUpdate(done, total, label) {
      const pct = total ? Math.round((done / total) * 100) : 0;
      const bar  = document.getElementById('lib-sync-progress-bar');
      const pctEl = document.getElementById('lib-sync-progress-pct');
      const lblEl = document.getElementById('lib-sync-progress-label');
      if (bar)   bar.style.width  = pct + '%';
      if (pctEl) pctEl.textContent = pct + '%';
      if (lblEl) lblEl.textContent = label || `${done} / ${total} files`;
    }

    // Main library sync function — called from the Settings → Sync Monitor button
    window.syncLibraryFilesToSupabase = async function(opts) {
      opts = opts || {};
      // opts.modal = true → update migration modal UI instead of the embedded pane
      const useModal = !!opts.modal;

      if (!window.frappeAPI?.downloadFile) {
        showToast('File download bridge not available. Restart the app.', 'err', 4000);
        return;
      }
      if (!window.storageAPI?.upload) {
        showToast('Storage upload bridge not available. Restart the app.', 'err', 4000);
        return;
      }

      const allMachines = window.FT_MACHINE_ROWS || [];
      if (!allMachines.length) {
        showToast('No machines loaded. Open Machine Register first.', 'warn');
        return;
      }

      // ── UI helpers — works for both embedded pane and modal ──────────
      function mpLog(msg, color) {
        if (useModal) {
          var el = document.getElementById('mig-log');
          if (!el) return;
          var line = document.createElement('div');
          line.style.color = color || '#64748b';
          line.textContent = msg;
          el.appendChild(line);
          el.scrollTop = el.scrollHeight;
        }
        // Always log to the embedded pane too
        _libProgressLog(msg, color);
      }
      function mpProgress(done, total, label) {
        var pct = total ? Math.round((done / total) * 100) : 0;
        if (useModal) {
          var bar = document.getElementById('mig-progress-bar');
          var pctEl = document.getElementById('mig-progress-pct');
          var lblEl = document.getElementById('mig-progress-label');
          if (bar) bar.style.width = pct + '%';
          if (pctEl) pctEl.textContent = pct + '%';
          if (lblEl) lblEl.textContent = label || (done + ' / ' + total);
        }
        _libProgressUpdate(done, total, label);
      }
      function mpStat(msg) {
        var el = document.getElementById('mig-stat');
        if (el) el.textContent = msg;
        var embEl = document.getElementById('lib-sync-count');
        if (embEl) embEl.textContent = msg;
      }

      // Disable buttons
      var modalBtn = document.getElementById('mig-start-btn');
      var embBtn   = document.getElementById('lib-sync-btn');
      if (modalBtn) { modalBtn.disabled = true; modalBtn.textContent = 'Migrating…'; }
      if (embBtn)   embBtn.disabled = true;

      // Show embedded pane progress
      var progressWrap = document.getElementById('lib-sync-progress');
      var logEl = document.getElementById('lib-sync-progress-log');
      if (progressWrap) { progressWrap.style.display = 'block'; if (logEl) logEl.innerHTML = ''; }

      // ── Phase 1: Fetch full machine docs (library fields live here) ──
      const cache = window.FT_MACHINE_DETAIL_CACHE || {};
      const cached = Object.values(cache);
      const uncachedNames = allMachines.map(m => m.name).filter(n => n && !cache[n]);

      mpLog(`${cached.length} machines already loaded, ${uncachedNames.length} need full detail fetch.`);
      mpProgress(0, allMachines.length, 'Fetching machine details…');

      const BATCH = 10;
      let fetchDone = 0;
      if (uncachedNames.length > 0) {
        for (let i = 0; i < uncachedNames.length; i += BATCH) {
          const batch = uncachedNames.slice(i, i + BATCH);
          await Promise.all(batch.map(async (n) => {
            try {
              const raw = await callFrappe(
                typeof FT_MACHINE_DETAIL_METHOD !== 'undefined'
                  ? FT_MACHINE_DETAIL_METHOD
                  : '/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.get_ft_machine_detail',
                { name: n }
              );
              const doc = raw.message || raw.data || raw;
              if (doc?.name) {
                window.FT_MACHINE_DETAIL_CACHE[n] = doc;
                cached.push(doc);
              }
            } catch (_) {}
            fetchDone++;
          }));
          mpProgress(fetchDone, uncachedNames.length, `Fetching: ${fetchDone}/${uncachedNames.length}`);
          await new Promise(r => setTimeout(r, 0));
        }
      }
      mpLog(`✓ ${cached.length} machine records ready.`, '#10b981');

      // ── Build list of all files to migrate ──────────────────────────
      const toSync = [];

      // COVER IMAGES — stored in machine-images/{name}/cover.{ext}
      // Use FT_MACHINE_ROWS which has machine_picture in the list fields
      allMachines.forEach(m => {
        if (!m.machine_picture) return;
        // Already migrated? machine_picture field will contain a Supabase URL
        if (m.machine_picture.includes('supabase.co/storage')) return;
        const frappeVal = m.machine_picture;
        const fullUrl   = frappeVal.startsWith('http') ? frappeVal : FLEET_BASE_URL + frappeVal;
        const origExt   = frappeVal.split('.').pop().split('?')[0] || 'jpg';
        const filename  = 'cover.' + origExt;
        toSync.push({
          machine: m, field: 'machine_picture', label: 'Cover Image',
          fullUrl, filename, bucket: 'machine-images',
          storagePath: m.name + '/cover.' + origExt,
          isImage: true,
        });
      });

      // LIBRARY FILES — from detail cache
      cached.forEach(m => {
        LIB_FIELDS.forEach(([label, field]) => {
          const frappeVal = m[field];
          if (!frappeVal) return;
          const existingSb = (window.LIB_SUPABASE_MAP[m.name] || {})[field];
          if (existingSb && existingSb.includes('supabase.co/storage')) return; // already done
          const fullUrl  = frappeVal.startsWith('http') ? frappeVal : FLEET_BASE_URL + frappeVal;
          const filename = frappeVal.split('/').pop().split('?')[0];
          const ext      = filename.split('.').pop() || 'bin';
          toSync.push({
            machine: m, field, label, fullUrl, filename,
            bucket: 'machine-library',
            storagePath: m.name + '/' + field + '.' + ext,
            isImage: false,
          });
        });
      });

      mpLog(`Found ${toSync.length} files to migrate (${allMachines.length} machines).`);
      mpProgress(0, toSync.length, '0 / ' + toSync.length + ' files');

      if (!toSync.length) {
        mpLog('✅ All files already in Supabase Storage! Nothing to do.', '#10b981');
        mpProgress(1, 1, 'Already complete');
        mpStat('✅ All files already migrated');
        if (modalBtn) { modalBtn.disabled = false; modalBtn.textContent = '✅ Already Complete'; }
        if (embBtn)   embBtn.disabled = false;
        return;
      }

      // ── Phase 2: Download from Frappe → Upload to Supabase ──────────
      let done = 0, failed = 0, skipped = 0;
      const machineUpdates = {}; // { machineName: { field: supabaseUrl, ... } }
      const imageUpdates   = {}; // { machineName: supabaseUrl }

      for (const item of toSync) {
        try {
          mpLog(`⬇ ${item.machine.name} — ${item.label}…`);
          const dl = await window.frappeAPI.downloadFile(item.fullUrl);
          if (!dl.ok) throw new Error('Download: ' + (dl.error || 'failed'));

          const contentType = _libContentType(item.filename) || dl.contentType || 'application/octet-stream';
          const up = await window.storageAPI.upload(item.bucket, item.storagePath, dl.base64, contentType);
          if (!up.ok) throw new Error('Upload: ' + (up.error || 'failed'));

          // Cache result
          if (item.isImage) {
            imageUpdates[item.machine.name] = up.url;
            // Update in-memory FT_MACHINE_ROWS
            const row = window.FT_MACHINE_ROWS.find(r => r.name === item.machine.name);
            if (row) row.machine_picture = up.url;
            if (window.MACHINES_MAP && window.MACHINES_MAP[item.machine.name]) {
              window.MACHINES_MAP[item.machine.name].machine_picture = up.url;
            }
          } else {
            if (!window.LIB_SUPABASE_MAP[item.machine.name]) window.LIB_SUPABASE_MAP[item.machine.name] = {};
            window.LIB_SUPABASE_MAP[item.machine.name][item.field] = up.url;
            if (!machineUpdates[item.machine.name]) machineUpdates[item.machine.name] = {};
            machineUpdates[item.machine.name][item.field] = up.url;
          }

          done++;
          mpLog(`  ✅ ${item.label} → Supabase CDN`, '#10b981');
        } catch (err) {
          failed++;
          mpLog(`  ❌ ${item.machine.name}/${item.label}: ${err.message}`, '#ef4444');
        }
        mpProgress(done + failed, toSync.length, `${done} done, ${failed} errors`);
        await new Promise(r => setTimeout(r, 600)); // pace requests — prevents ETIMEDOUT on Frappe
      }

      // ── Phase 3: Persist URLs back to ft_machine in Supabase DB ─────
      mpLog(`💾 Saving ${Object.keys(machineUpdates).length + Object.keys(imageUpdates).length} machine records…`);

      // Build merged upsert rows
      const allNames = new Set([...Object.keys(machineUpdates), ...Object.keys(imageUpdates)]);
      const upsertRows = Array.from(allNames).map(name => {
        const row = { name };
        if (machineUpdates[name]) row.library_supabase_urls = machineUpdates[name];
        if (imageUpdates[name])   row.machine_picture = imageUpdates[name];
        return row;
      });

      let dbFailed = 0;
      for (let i = 0; i < upsertRows.length; i += 50) {
        try {
          const res = await window.electron.invoke('supabase:query', {
            table: 'ft_machine',
            method: 'upsert',
            params: { data: upsertRows.slice(i, i + 50), options: { onConflict: 'name' } }
          });
          if (!res?.ok) throw new Error(res?.error || 'DB upsert failed');
        } catch (e) {
          dbFailed++;
          mpLog(`⚠ DB batch ${i/50 + 1} error: ${e.message}`, '#f59e0b');
        }
      }

      if (!dbFailed) {
        mpLog('✅ All URLs saved to Supabase database.', '#10b981');
      }

      // ── Done ──────────────────────────────────────────────────────────
      mpProgress(toSync.length, toSync.length, `Done — ${done} migrated, ${failed} failed`);
      const summary = `${done} files migrated ✅${failed ? ', ' + failed + ' failed ❌' : ''}`;
      mpStat(summary);
      mpLog(`\n🎉 Migration complete: ${summary}`, done && !failed ? '#10b981' : '#f59e0b');

      if (modalBtn) {
        modalBtn.disabled = false;
        modalBtn.textContent = done && !failed ? '✅ Migration Complete' : '⚠ Done (with errors)';
        modalBtn.style.background = done && !failed ? '#15803d' : '#d97706';
      }
      if (embBtn) embBtn.disabled = false;

      showToast(`Migration: ${done} files uploaded to Supabase${failed ? ', ' + failed + ' failed' : ''}`,
        failed ? 'warn' : 'ok', 5000);

      // Refresh registry thumbnails
      if (typeof refreshMachineRegisterReport === 'function') refreshMachineRegisterReport();
    };

  