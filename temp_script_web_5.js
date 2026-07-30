
    // --- DEFECTS LOGIC ---
    const FT_DEFECT_SUMMARY_METHOD = "/api/method/mxg_fleet_track.omnis_dashboard.ft_defects_dashboard.get_ft_defect_summary";
    const FT_DEFECT_CREATE_METHOD  = "/api/method/mxg_fleet_track.omnis_dashboard.ft_defects_dashboard.create_ft_defect";
    const FT_DEFECT_UPDATE_METHOD  = "/api/method/mxg_fleet_track.omnis_dashboard.ft_defects_dashboard.update_ft_defect";

    let FT_DEFECTS_DATA = [];
    let FT_DEFECT_MACHINE_DROPDOWN_INIT = false;

    // initDefectMachineSearch: Sets up search behavior for the modal
    function initDefectMachineSearch() {
      if (FT_DEFECT_MACHINE_DROPDOWN_INIT) return;

      const input = document.getElementById("defect-machine-search");
      const dropdown = document.getElementById("defect-machine-dropdown");

      if (!input || !dropdown) return;

      input.addEventListener("focus", async () => {
        if (!window.MACHINES_MAP || Object.keys(window.MACHINES_MAP).length === 0) {
          if (typeof loadFtMachineRegister === "function") await loadFtMachineRegister();
        }
      });

      input.addEventListener("input", function () {
        const q = this.value.trim().toLowerCase();
        if (!q) { dropdown.classList.add("hidden"); _clearDefectMachineInfo(); return; }

        if (!window.MACHINES_MAP) return;

        const matches = Object.values(window.MACHINES_MAP).filter(m => {
          const hay = [m.model, m.sn, m.name, m.fleet_no].map(s => (s || "").toLowerCase()).join(" ");
          return hay.includes(q);
        }).slice(0, 10);

        dropdown.innerHTML = "";
        dropdown.classList.remove("hidden");

        if (matches.length === 0) {
          dropdown.innerHTML = '<li style="padding:10px; color:#94a3b8;">No matches</li>';
          return;
        }

        matches.forEach(m => {
          const li = document.createElement("li");
          li.style.cssText = "padding:10px 14px;cursor:pointer;border-bottom:1px solid #f1f5f9;transition:background .1s;";
          const wB = m.warranty_status ? `<span style="margin-left:6px;padding:1px 6px;border-radius:99px;background:#dcfce7;color:#15803d;font-size:9px;font-weight:700;">${m.warranty_status}</span>` : '';
          li.innerHTML = `<div style="font-weight:700;font-size:13px;color:#0f172a;">${m.model||m.name}</div><div style="font-size:11px;color:#64748b;">${m.name}&nbsp;&middot;&nbsp;${m.customer||'\u2014'} ${wB}</div>`;
          li.onclick = () => {
            input.value = `${m.model||m.name} \u2014 ${m.name}`;
            input.dataset.selectedName = m.name;
            dropdown.classList.add("hidden");
            _fillDefectMachineInfo(m.name);
          };
          li.onmouseenter = () => li.style.background = "#f8fafc";
          li.onmouseleave = () => li.style.background = "white";
          dropdown.appendChild(li);
        });
      });

      // Hide on outside click
      document.addEventListener("click", (e) => {
        if (!input.contains(e.target) && !dropdown.contains(e.target)) dropdown.classList.add("hidden");
      });

      FT_DEFECT_MACHINE_DROPDOWN_INIT = true;
    }

    async function loadFtDefects() {
      const tbody = document.getElementById("tbl-defects");
      if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:24px;color:#94a3b8;">⏳ Loading defects...</td></tr>';
      try {
        const res = await callFrappe(FT_DEFECT_SUMMARY_METHOD, {});
        // API returns { counts:{...}, rows:[...], error:null }
        const msg = res.message || res;
        const data = Array.isArray(msg.rows) ? msg.rows
                   : Array.isArray(msg)       ? msg
                   : [];
        FT_DEFECTS_DATA = data;
        window.FT_DEFECTS_DATA = data; // keep window-scoped in sync
        renderDefectsTable(FT_DEFECTS_DATA);
      } catch (e) {
        console.error("Load Defects Error:", e);
        if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:24px;color:#ef4444;">Failed to load defects. Check connection.</td></tr>';
        showToast("Failed to load defects", "err");
      }
    }

    function renderDefectsTable(rows) {
      const tbody = document.getElementById("tbl-defects");
      if (!tbody) return;
      tbody.innerHTML = "";

      if (!rows || rows.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px; color:#94a3b8;">No defects found</td></tr>';
        return;
      }

      rows.forEach(r => {
        const tr = document.createElement("tr");
        tr.className = "df-row";
        tr.onclick = () => openDefectModal(r.name);

        const status = (r.status || "Open");
        const s = status.toLowerCase();
        const badgeClass = s === "open" ? "df-badge-open" : s === "closed" ? "df-badge-closed" : "df-badge-other";
        const priority   = r.priority   || "Low";
        const desc       = r.description ? r.description.slice(0, 80) + (r.description.length > 80 ? "…" : "") : "No description";
        const technician = r.technician || r.oem || "—";
        const reported   = r.start_date || r.creation || "—";

        // Severity colour pill
        const sevColour = priority === "High" ? "#ef4444"
                        : priority === "Medium" ? "#f59e0b"
                        : "#64748b";

        tr.innerHTML = `
          <td class="df-cell" style="font-weight:600; padding:10px 16px;">${desc}</td>
          <td class="df-cell" style="padding:10px 16px;">${r.machine || "—"}</td>
          <td class="df-cell" style="padding:10px 16px;">
            <span style="background:${sevColour}22;color:${sevColour};border:1px solid ${sevColour}44;border-radius:999px;padding:2px 8px;font-size:9px;font-weight:700;">${priority}</span>
          </td>
          <td class="df-cell" style="padding:10px 16px;"><span class="df-badge ${badgeClass}" style="font-size:9px;">${status}</span></td>
          <td class="df-cell" style="color:var(--text-muted); padding:10px 16px;">${technician}</td>
          <td class="df-cell" style="text-align:right; font-family:monospace; padding:10px 16px;">${reported}</td>
        `;
        tbody.appendChild(tr);
      });
    }

    // --- FSP TECHNICIAN TYPEAHEAD ---
    const FT_TECH_CACHE = { data: null, ts: 0 };
    const FT_TECH_GET_METHOD = "/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.get_ft_technicians";

    async function fspTechSearch(q, hiddenId, dropId) {
      const drop = document.getElementById(dropId);
      const hidden = document.getElementById(hiddenId);
      if (!drop) return;

      // Load technician list (cached for 5 min)
      let techs = FT_TECH_CACHE.data;
      if (!techs || (Date.now() - FT_TECH_CACHE.ts) > 300000) {
        try {
          const res = await callFrappe(FT_TECH_GET_METHOD, {});
          techs = Array.isArray(res.message) ? res.message : Array.isArray(res) ? res : [];
          FT_TECH_CACHE.data = techs;
          FT_TECH_CACHE.ts   = Date.now();
        } catch (e) {
          console.warn('fspTechSearch load error:', e);
          techs = [];
        }
      }

      // Filter
      const ql = (q || '').toLowerCase().trim();
      const matches = ql
        ? techs.filter(t =>
            (t.technician_name || '').toLowerCase().includes(ql) ||
            (t.name || '').toLowerCase().includes(ql) ||
            (t.mobile_no || '').toLowerCase().includes(ql)
          )
        : techs.slice(0, 15);

      // Render dropdown
      drop.innerHTML = '';
      if (matches.length === 0) {
        drop.innerHTML = '<li style="padding:10px 14px; color:#94a3b8; font-size:12px;">No technicians found</li>';
        drop.style.display = 'block';
        return;
      }

      matches.forEach(t => {
        const li = document.createElement('li');
        li.style.cssText = 'padding:8px 14px; cursor:pointer; font-size:12px; border-bottom:1px solid #f1f5f9; display:flex; flex-direction:column;';
        li.innerHTML = `<span style="font-weight:700; color:#1e293b;">${t.technician_name || t.name}</span>`
                     + (t.mobile_no ? `<span style="font-size:10px; color:#64748b;">${t.mobile_no}</span>` : '');
        li.onmouseenter = () => li.style.background = '#f8fafc';
        li.onmouseleave = () => li.style.background = '';
        li.onmousedown  = (e) => {
          e.preventDefault();
          // Fill hidden field with Frappe docname, search field with display name
          if (hidden) hidden.value = t.name;
          const searchEl = document.getElementById(hiddenId + '-search');
          if (searchEl) searchEl.value = t.technician_name || t.name;
          drop.style.display = 'none';
        };
        drop.appendChild(li);
      });
      drop.style.display = 'block';

      // Close on outside click
      setTimeout(() => {
        const closeHandler = (e) => {
          const searchEl = document.getElementById(hiddenId + '-search');
          if (searchEl && !searchEl.contains(e.target) && !drop.contains(e.target)) {
            drop.style.display = 'none';
            document.removeEventListener('mousedown', closeHandler);
          }
        };
        document.addEventListener('mousedown', closeHandler);
      }, 0);
    }

    // --- FSP MODAL LOGIC ---
    let FT_FSP_SEARCH_INIT = false;
    function openFspModal(presetDate = null) {
      const modal = document.getElementById("modal-fsp-new");
      if (!modal) return;
      
      // Reset fields
      document.getElementById("fsp-new-sn").value = "";
      document.getElementById("fsp-new-sn").dataset.selectedName = "";
      document.getElementById("fsp-new-customer").value = "";
      document.getElementById("fsp-new-warranty").value = "";
      document.getElementById("fsp-new-location").value = "";
      document.getElementById("fsp-new-description").value = "";
      document.getElementById("fsp-new-technician").value = "";
      const techSearch = document.getElementById("fsp-new-technician-search");
      if (techSearch) techSearch.value = "";
      const techDrop = document.getElementById("fsp-tech-drop-new");
      if (techDrop) techDrop.style.display = "none";
      document.getElementById("fsp-new-date").value = presetDate || new Date().toISOString().split('T')[0];
      document.getElementById("fsp-new-defects").value = "";
      
      const defContainer = document.getElementById("fsp-defects-container");
      if (defContainer) defContainer.style.display = "none";
      const defTbody = document.getElementById("fsp-defects-tbody");
      if (defTbody) defTbody.innerHTML = "";

      modal.classList.remove("hidden");
      if (!FT_FSP_SEARCH_INIT) initFspMachineSearch();
    }

    function closeFspModal() {
      const modal = document.getElementById("modal-fsp-new");
      if (modal) modal.classList.add("hidden");
    }

    function initFspMachineSearch() {
      const input = document.getElementById("fsp-new-sn");
      const dropdown = document.getElementById("fsp-new-sn-dropdown");
      if (!input || !dropdown) return;

      input.addEventListener("focus", async () => {
        if (!window.MACHINES_MAP || Object.keys(window.MACHINES_MAP).length === 0) {
          if (typeof loadFtMachineRegister === "function") await loadFtMachineRegister();
        }
      });

      input.addEventListener("input", function () {
        const q = this.value.trim().toLowerCase();
        if (!q) { dropdown.classList.add("hidden"); return; }
        if (!window.MACHINES_MAP) return;
        
        const matches = Object.values(window.MACHINES_MAP).filter(m => {
          const hay = [m.model, m.sn, m.name, m.fleet_no].map(s => (s || "").toLowerCase()).join(" ");
          return hay.includes(q);
        }).slice(0, 10);

        dropdown.innerHTML = "";
        dropdown.classList.remove("hidden");

        if (matches.length === 0) {
          dropdown.innerHTML = '<li style="padding:10px; color:#94a3b8; font-size:12px;">No machines found</li>';
          return;
        }

        matches.forEach(m => {
          const li = document.createElement("li");
          li.style.padding = "10px 12px";
          li.style.cursor = "pointer";
          li.style.borderBottom = "1px solid #f1f5f9";
          li.style.transition = "background 0.2s";
          li.innerHTML = `
            <div style="font-weight:600; color:#1e293b; font-size:13px;">${m.sn || m.name}</div>
            <div style="font-size:11px; color:#64748b;">${m.model} · ${m.customer}</div>
          `;
          li.onclick = () => {
            input.value = m.sn || m.name;
            input.dataset.selectedName = m.name;
            
            // AUTO-FILL
            document.getElementById("fsp-new-customer").value = m.customer || "";
            document.getElementById("fsp-new-location").value = m.current_location || m.location || "";
            document.getElementById("fsp-new-warranty").value = m.warranty_status || "Standard";

            loadFspMachineDefects(m.name);
            
            dropdown.classList.add("hidden");
          };
          li.onmouseenter = () => li.style.background = "#f8fafc";
          li.onmouseleave = () => li.style.background = "white";
          dropdown.appendChild(li);
        });
      });

      document.addEventListener("click", (e) => {
        if (!input.contains(e.target) && !dropdown.contains(e.target)) dropdown.classList.add("hidden");
      });
      FT_FSP_SEARCH_INIT = true;
    }

    async function loadFspMachineDefects(machineName) {
      const container = document.getElementById("fsp-defects-container");
      const tbody = document.getElementById("fsp-defects-tbody");
      if (!container || !tbody) return;

      tbody.innerHTML = '<tr><td colspan="3" style="padding:10px; text-align:center; color:#64748b;">Loading defects…</td></tr>';
      container.style.display = "block";

      try {
        // ── Step 1: Refresh Supabase for this machine ──────────────────────
        // Fetch ALL defects (active + closed) from Frappe so end_date is current.
        // This keeps Supabase accurate before we query it.
        try {
          const freshRes = await callFrappe(
            '/api/method/mxg_fleet_track.omnis_dashboard.ft_defects_dashboard.get_ft_defect_summary',
            { machine: machineName }
          );
          const allDefects = freshRes?.message?.rows || freshRes?.message || [];
          if (allDefects.length > 0) {
            // Map Frappe fields → Supabase ft_defect columns
            const ALLOWED = new Set([
              'name','defect_type','machine','customer','fleetrack_managed','oem','model',
              'location','region','warranty_status','start_date','priority','status',
              'description','on_hold','ted','end_date','defect_days'
            ]);
            const toUpsert = allDefects.map(d => {
              const row = {};
              for (const [k, v] of Object.entries(d)) {
                if (k === 'creation') { row['created_at'] = v; continue; }
                if (k === 'modified') { row['modified_at'] = v; continue; }
                if (ALLOWED.has(k)) row[k] = v ?? null;
              }
              return row;
            });
            await window.electron.invoke('supabase:query', {
              table: 'ft_defect', method: 'upsert', params: {}, data: toUpsert
            });
            console.log(`[FSP Defects] ✓ Refreshed ${toUpsert.length} defect records in Supabase for ${machineName}`);
          }
        } catch (refreshErr) {
          console.warn('[FSP Defects] Supabase refresh failed (will still query):', refreshErr.message);
        }

        // ── Step 2: Query Supabase for active defects (end_date IS NULL) ──
        const sbRes = await window.electron.invoke('supabase:query', {
          table: 'ft_defect',
          method: 'select',
          params: {
            columns: 'name,description,priority,end_date,status,machine',
            options: {},
            match: { machine: machineName },
            or: 'end_date.is.null,end_date.eq.'   // NULL or empty string
          }
        });

        // Belt-and-braces: filter out any with a real end_date
        const defects = (sbRes?.data || []).filter(d => !d.end_date || d.end_date === '');
        console.log(`[FSP Defects] ${defects.length} active defects from Supabase for ${machineName}`);

        tbody.innerHTML = "";

        if (!defects.length) {
          tbody.innerHTML = '<tr><td colspan="3" style="padding:12px; text-align:center; color:#94a3b8; font-size:11px;">✅ No open defects on this machine</td></tr>';
          return;
        }

        // Green count header
        const countRow = document.createElement("tr");
        countRow.innerHTML = `<td colspan="3" style="padding:4px 10px; background:#f0fdf4; font-size:10px; font-weight:700; color:#16a34a; border-bottom:1px solid #dcfce7;">
          ${defects.length} active defect${defects.length !== 1 ? 's' : ''} — tick to include in service plan
        </td>`;
        tbody.appendChild(countRow);

        defects.forEach(d => {
          const tr = document.createElement("tr");
          tr.style.borderBottom = "1px solid #f1f5f9";
          const pri = (d.priority || "medium").toLowerCase();
          const priorityColor = pri === "high" ? "#ef4444" : pri === "low" ? "#10b981" : "#f59e0b";
          const desc = d.description || d.name || "";
          tr.innerHTML = `
            <td style="padding:6px 10px; vertical-align:middle;">
              <input type="checkbox" class="fsp-defect-check" data-name="${d.name}" data-desc="${desc}" style="cursor:pointer;">
            </td>
            <td style="padding:6px 10px; line-height:1.3;">
              <div style="font-weight:600; color:#334155; font-size:12px;">${d.name}</div>
              <div style="font-size:10px; color:#64748b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:280px;">${desc}</div>
            </td>
            <td style="padding:6px 10px; white-space:nowrap;">
              <span style="font-size:9px; font-weight:700; color:${priorityColor}; text-transform:uppercase;">${d.priority || "Medium"}</span>
            </td>
          `;
          tbody.appendChild(tr);
        });

      } catch (err) {
        console.error("[FSP Defects] Error:", err);
        tbody.innerHTML = `<tr><td colspan="3" style="padding:10px; text-align:center; color:#ef4444; font-size:11px;">Failed to load defects — ${err.message}</td></tr>`;
      }
    }


    async function saveFspEntry() {
      console.log("--- saveFspEntry invoked ---");
      const btn = event?.target?.closest('button') || document.querySelector('.modal-footer .btn-primary');
      const originalBtnText = btn ? btn.innerHTML : "Create Plan Entry";

      const machineInput = document.getElementById("fsp-new-sn");
      const machine = machineInput.dataset.selectedName || machineInput.value.trim();
      let description = document.getElementById("fsp-new-description").value.trim();
      const planned_date = document.getElementById("fsp-new-date").value;
      const technician = document.getElementById("fsp-new-technician").value.trim();
      const warranty_status = document.getElementById("fsp-new-warranty").value;
      const location = document.getElementById("fsp-new-location").value.trim();

      // Aggregate selected defects from checklist + manual notes
      const selectedDefects = Array.from(document.querySelectorAll(".fsp-defect-check:checked"))
        .map(el => "• " + (el.dataset.desc || el.dataset.name))
        .join("\n");
      
      const manualNotes = document.getElementById("fsp-new-defects").value.trim();
      let finalDefects = selectedDefects;
      if (manualNotes) {
        finalDefects = (finalDefects ? finalDefects + "\n\n" : "") + "Additional Notes:\n" + manualNotes;
      }

      if (!machine) { showToast("Machine/SN is required", "error"); return; }
      
      // If description is empty but defects are selected, auto-fill description
      if (!description && finalDefects) {
        description = "Defect Repair / Inspection";
        console.log("Auto-setting description to:", description);
      }
      
      if (!description) { 
        showToast("Description (Job Type) is required", "error"); 
        console.warn("Save blocked: Description missing");
        return; 
      }

      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-small"></span> Saving...';
      }
      
      showToast("Creating service plan...", "info");
      console.log("Sending data to backend:", { machine, description, planned_date, technician, warranty_status, location });

      try {
        const res = await callFrappe(FT_ADD_SERVICE_PLAN_METHOD, {
          machine, 
          description, 
          planned_date, 
          technician, 
          defects: finalDefects, 
          warranty_status, 
          location
        }, 'POST');

        console.log("Full Backend Response Debug:", JSON.stringify(res));

        // Ultra-robust success check: look for "success" or a record 'name' at any level
        function checkSuccess(obj) {
          if (!obj) return false;
          if (obj.status === "success" || obj.name || obj.ok === true) return true;
          if (obj.message && typeof obj.message === 'object') return checkSuccess(obj.message);
          return false;
        }

        const isSuccess = checkSuccess(res);

        if (isSuccess) {
          console.log("✅ Success confirmed via robust check. Closing modal.");
          showToast("✅ Service Plan Entry Created", "success");
          closeFspModal();
          if (typeof loadFieldServicePlan === "function") loadFieldServicePlan();
        } else {
          console.warn("⚠️ Response format unrecognized or failed:", res);
          // Try to extract any message for the user
          const msg = res.message?.message || res.message || res.error || "Entry might have been created (check list)";
          showToast(msg, "error");
        }
      } catch (e) {
        console.error("saveFspEntry Exception:", e);
        showToast("Error: " + e.message, "error");
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = originalBtnText;
        }
      }
    }

    function switchFspTab(tab) {
      document.querySelectorAll(".fsp-tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".fsp-tab-pane").forEach(p => p.classList.add("hidden"));
      
      const btn = document.getElementById(`tab-btn-${tab}`);
      const pane = document.getElementById(`fsp-tab-content-${tab}`);
      if (btn) btn.classList.add("active");
      if (pane) pane.classList.remove("hidden");
    }

    async function openFspDetailModal(r) {
      console.log("Opening FSP Detail:", r);
      const modal = document.getElementById("modal-fsp-detail");
      const fsiArea = document.getElementById("fsp-text-fsi");
      const fsbArea = document.getElementById("fsp-text-fsb");
      if (!modal || !fsiArea || !fsbArea) return;

      // Populate Edit Form
      document.getElementById("fsp-edit-name").value = r.name || "";
      document.getElementById("fsp-edit-machine").value = r.machine || "";
      document.getElementById("fsp-edit-description").value = r.description || "";
      document.getElementById("fsp-edit-location").value = r.location || "";
      document.getElementById("fsp-edit-technician").value = r.technician || "";
      const editTechSearch = document.getElementById("fsp-edit-technician-search");
      if (editTechSearch) editTechSearch.value = r.technician || "";
      const editTechDrop = document.getElementById("fsp-tech-drop-edit");
      if (editTechDrop) editTechDrop.style.display = "none";

      document.getElementById("fsp-edit-date").value = r.raw_date || "";
      document.getElementById("fsp-edit-defects").value = r.defects || "";
      document.getElementById("fsp-edit-status").value = r.status || "Proposed";

      const machineInfo = (window.MACHINES_MAP && window.MACHINES_MAP[r.machine]) || {};
      const model = machineInfo.model || "Unknown Model";
      const sn = machineInfo.sn || r.machine;
      const fleet = machineInfo.fleet_no || "NA";
      
      let contact = "@[Unassigned]";
      if (r.technician && r.technician !== "Unassigned") {
        try {
          const cRes = await callFrappe("/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.get_technician_contact", { technician_name: r.technician });
          if (cRes.message && cRes.message.status === "success" && cRes.message.contact !== "No Contact") {
            contact = `@~${cRes.message.name} & @${cRes.message.contact}`;
          } else {
            contact = `@~${r.technician}`;
          }
        } catch (e) {
          contact = `@~${r.technician}`;
        }
      }

      // Format Dates
      const dateParts = (r.raw_date || "").split("-");
      const dateFmt = dateParts.length === 3 ? `${dateParts[2]}.${dateParts[1]}.${dateParts[0].slice(-2)}` : r.plan_for;

      // Scope of Work Formatting
      const rawScope = (r.defects || "").split("\n").filter(s => s.trim().length > 0);
      const scopeLines = rawScope.length > 0 ? rawScope.map(s => s.startsWith("•") || s.startsWith("*") ? s : "* " + s).join("\n") : `* ${r.description || "Service/Repair"}`;

      // FSI Template
      const fsi = `${contact}
FSI ${dateFmt}
CUSTOMER: ${r.customer}
MACHINE: ${model} SN: ${sn}
CUSTOMER FLEET NUMBER: ${fleet}
WARRANTY STATUS: ${r.warranty_status || "NA"}
SCOPE OF WORK:  
${scopeLines}
LOCATION: ${r.location}
ETA: TBA
CONTACT: [To be added]`;

      // FSB Template
      const fsb = `Good evening
*Field Service Booking*
*Date*: ${dateFmt}

*MACHINE*: ${model} *SN*: ${sn}
*CUSTOMER FLEET NUMBER*: ${fleet}
*SCOPE OF WORK*:
${scopeLines}

*LOCATION*: ${r.location}
*ATTENDING TECHNICIANS*:
* ${r.technician || "TBA"}
*HOTLINE*: 0774454839
*ETA*: TBA
We will let you know if there are any changes to the field service booking.`;

      fsiArea.value = fsi;
      fsbArea.value = fsb;
      
      modal.classList.remove("hidden");
      switchFspTab("fsi");
    }

    async function saveFspEdit() {
      const name = document.getElementById("fsp-edit-name").value;
      const btn = document.getElementById("btn-fsp-edit-save");
      if (!name) return;

      const payload = {
        name: name,
        description: document.getElementById("fsp-edit-description").value,
        location: document.getElementById("fsp-edit-location").value,
        technician: document.getElementById("fsp-edit-technician").value,
        scheduled_date: document.getElementById("fsp-edit-date").value,
        status: document.getElementById("fsp-edit-status").value,
        defects: document.getElementById("fsp-edit-defects").value
      };

      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-small"></span> Updating...';
      }

      try {
        const res = await callFrappe("/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.update_ft_service_plan_entry", payload, "POST");
        if (res.message && res.message.status === "success") {
          showToast("✅ FSP Entry Updated", "success");
          closeFspDetailModal();
          loadFieldServicePlan();
        } else {
          showToast(res.message?.message || "Update failed", "error");
        }
      } catch (e) {
        console.error(e);
        showToast("Error updating plan", "error");
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = "Update Service Plan Entry";
        }
      }
    }

    async function sendFspWhatsApp(type) {
      const area = document.getElementById(`fsp-text-${type}`);
      if (!area) return;
      const text = area.value;
      
      let phone = "";
      if (type === "fsi") {
        // Try to extract phone from the @~Name & @Phone format
        const match = text.match(/& @(\+?\d+)/);
        if (match) phone = match[1];
      }

      if (!phone) {
        phone = prompt(`Enter WhatsApp number for ${type.toUpperCase()}:`, "");
      }
      if (phone === null) return; // Cancelled

      const encodedText = encodeURIComponent(text);
      const url = `https://wa.me/${phone.replace(/\s+/g, '')}?text=${encodedText}`;
      window.open(url, "_blank");
    }

    async function updateFspStatusInline(name, newStatus) {
      if (!name || !newStatus) return;
      showToast(`Updating status to ${newStatus}...`, "info");
      
      try {
        const res = await callFrappe("/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.update_ft_service_plan_entry", {
          name: name,
          status: newStatus
        }, "POST");
        
        if (res.message && res.message.status === "success") {
          showToast("✅ Status Updated", "success");
          // Re-load to update colors/styles if needed
          loadFieldServicePlan(); 
        } else {
          showToast("Failed to update status", "error");
        }
      } catch (e) {
        console.error(e);
        showToast("Error updating status inline", "error");
      }
    }

    function closeFspDetailModal() {
      const modal = document.getElementById("modal-fsp-detail");
      if (modal) modal.classList.add("hidden");
    }

    function copyFspDraft(type) {
      const area = document.getElementById(`fsp-text-${type}`);
      const btnText = document.getElementById(`copy-text-${type}`);
      const btnIcon = document.getElementById(`copy-icon-${type}`);
      if (!area || !btnText || !btnIcon) return;
      
      area.select();
      document.execCommand("copy");
      
      const originalText = btnText.textContent;
      btnText.textContent = "Copied!";
      btnIcon.textContent = "✅";
      
      setTimeout(() => {
        btnText.textContent = originalText;
        btnIcon.textContent = "📋";
      }, 2000);
      
      showToast(`✅ ${type.toUpperCase()} copied to clipboard`, "success");
    }

    function openDefectModal(defectId = null, preselectedMachine = null) {
      const modal = document.getElementById("modal-defect");
      const title = document.getElementById("defect-modal-title");
      const idInput = document.getElementById("defect-id");
      const mSearch = document.getElementById("defect-machine-search");
      const typeSelect = document.getElementById("defect-type");
      const prioSelect = document.getElementById("defect-priority");
      const statusGroup = document.getElementById("defect-status-group");
      const statusSelect = document.getElementById("defect-status");
      const descInput = document.getElementById("defect-description");

      initDefectMachineSearch();

      modal.classList.remove("hidden");

      if (defectId) {
        // EDIT MODE
        const defect = FT_DEFECTS_DATA.find(d => d.name === defectId);
        if (!defect) return; // Should allow fetch check if not found

        title.textContent = "Edit Defect: " + defectId;
        idInput.value = defectId;
        mSearch.value = defect.machine || "";
        mSearch.dataset.selectedName = defect.machine;
        mSearch.disabled = true; // Cannot change machine on edit usually

        typeSelect.value = defect.defect_type || "Minor";
        prioSelect.value = (defect.priority || "Low").split(" ")[0]; // clean up if formatted
        // status always visible in new modal
        statusSelect.value = defect.status || "Open";
        descInput.value = defect.description || "";

      } else {
        // NEW MODE
        title.textContent = "Log New Defect";
        idInput.value = "";
        mSearch.value = "";
        mSearch.dataset.selectedName = "";
        mSearch.disabled = false;
        typeSelect.value = "Minor";
        prioSelect.value = "Low";
        // status always visible in new modal
        descInput.value = "";

        // Pre-select machine if called from Machine Lookup
        if (preselectedMachine) {
          const pm = window.MACHINES_MAP?.[preselectedMachine];
          if (pm) {
            const displayLabel = (pm.model ? pm.model + ' — ' : '') + (pm.name || preselectedMachine);
            mSearch.value = displayLabel;
            mSearch.dataset.selectedName = preselectedMachine;
            // Auto-fill HMR and machine info row
            if (typeof _fillDefectMachineInfo === 'function') _fillDefectMachineInfo(preselectedMachine);
          } else {
            mSearch.value = preselectedMachine;
            mSearch.dataset.selectedName = preselectedMachine;
          }
        }
      }
    }

    function closeDefectModal() {
      document.getElementById("modal-defect").classList.add("hidden");
    }

    function _fillDefectMachineInfo(name) {
      const b=document.getElementById('defect-machine-info'),m=window.MACHINES_MAP?.[name];
      if(!b||!name){return;}if(!m){b.style.display='none';return;}
      const cu=document.getElementById('defect-info-customer'),hm=document.getElementById('defect-info-hmr'),wy=document.getElementById('defect-info-warranty'),hi=document.getElementById('defect-hmr');
      if(cu)cu.textContent=m.customer||'\u2014';
      if(hm)hm.textContent=m.current_hmr!=null?m.current_hmr+' h':'\u2014';
      if(hi&&m.current_hmr!=null)hi.value=m.current_hmr;
      if(wy){const ws=(m.warranty_status||'').toLowerCase();
        wy.style.cssText=ws.includes('under')||ws==='in warranty'?'font-size:11px;font-weight:700;padding:3px 10px;border-radius:99px;background:#dcfce7;color:#15803d;':ws.includes('fringe')||ws.includes('expir')?'font-size:11px;font-weight:700;padding:3px 10px;border-radius:99px;background:#fef9c3;color:#a16207;':'font-size:11px;font-weight:700;padding:3px 10px;border-radius:99px;background:#fee2e2;color:#b91c1c;';
        wy.textContent=m.warranty_status||'N/A';}
      b.style.display='flex';
    }
    function _clearDefectMachineInfo(){const b=document.getElementById('defect-machine-info');if(b)b.style.display='none';}

    async function submitDefect() {
      const id = document.getElementById("defect-id").value;
      const machine = document.getElementById("defect-machine-search").dataset.selectedName || document.getElementById("defect-machine-search").value;
      const defect_type = document.getElementById("defect-type").value;
      const priority = document.getElementById("defect-priority").value;
      const status = document.getElementById("defect-status").value;
      const description = document.getElementById("defect-description").value;

      if (!machine && !id) { showToast("Select a machine", "err"); return; }
      if (!description) { showToast("Description required", "err"); return; }

      showToast("Saving...", "info", 1000);

      try {
        let res;
        if (id) {
          // UPDATE
          res = await callFrappe(FT_DEFECT_UPDATE_METHOD, {
            name: id, status, priority, description, defect_type
          }, 'POST');
        } else {
          // CREATE — with new fields
          const hmrRaw = document.getElementById('defect-hmr')?.value;
          const hmr_at_defect = hmrRaw ? (parseInt(hmrRaw,10)||null) : null;
          const technician  = document.getElementById('defect-technician')?.value || document.getElementById('defect-technician-search')?.value || '';
          const reported_by = document.getElementById('defect-reported-by')?.value || '';
          const start_date  = new Date().toISOString().split('T')[0];
          const md = window.MACHINES_MAP?.[machine] || {};
          res = await callFrappe(FT_DEFECT_CREATE_METHOD, {
            name: 'DEF-' + Date.now(),
            machine, defect_type, priority, status, description, start_date,
            technician: technician||null, reported_by: reported_by||null, hmr_at_defect: hmr_at_defect||null,
            customer: md.customer||null, model: md.model||null, oem: md.oem||null,
            region: md.region||null, location: md.current_location||md.location||null,
            warranty_status: md.warranty_status||null,
          }, 'POST');
        }

        if (res.error) throw new Error(res.error);

        showToast("Defect Saved!", "success");
        closeDefectModal();
        loadFtDefects();

      } catch (e) {
        console.error(e);
        showToast("Error: " + e.message, "err");
      }
    }

    // --- THEME LOGIC ---
    function initTheme() {
      const theme = localStorage.getItem("ft_theme");
      if (theme === "dark") {
        document.body.classList.add("dark");
        const icon = document.getElementById("theme-icon");
        if (icon) icon.textContent = "☀️";
      }
    }

    function toggleTheme() {
      const isDark = document.body.classList.toggle("dark");
      localStorage.setItem("ft_theme", isDark ? "dark" : "light");
      const icon = document.getElementById("theme-icon");
      if (icon) icon.textContent = isDark ? "☀️" : "🌙";
    }

    // Wire up Button
    document.addEventListener("DOMContentLoaded", () => {
      initTheme();
      const themeBtn = document.getElementById("theme-toggle");
      if (themeBtn) themeBtn.onclick = toggleTheme;

      // ── Seed Frappe API credentials (always refresh on load) ───────────
      // Update these values via Settings → Email Config → Frappe API Credentials
      localStorage.setItem('ft_api_key',    '07660480c74686c');
      localStorage.setItem('ft_api_secret', '904d39b2c079d38');

      const btnNew = document.getElementById("btn-defect-new");
      if (btnNew) btnNew.onclick = () => openDefectModal(null);

      // Wire up Sidebar Item
      const defectsNav = document.querySelector('.nav-item[data-view="view-defects"]');
      if (defectsNav) {
        defectsNav.addEventListener('click', () => {
          // Short timeout to allow view transition
          setTimeout(loadFtDefects, 200);
        });
      }

      // Wire up Machine Registry Sidebar Item
      const machinesNav = document.querySelector('.nav-item[data-view="view-machines"]');
      if (machinesNav) {
        machinesNav.addEventListener('click', () => {
          console.log("Loading Machine Registry...");
          setTimeout(loadFtMachineRegister, 200);
        });
      }

      // Wire up FSP Sidebar Item
      const fspNav = document.querySelector('.nav-item[data-view="view-fsi"]');
      if (fspNav) {
        fspNav.addEventListener('click', () => {
          setTimeout(loadFieldServicePlan, 200);
        });
      }
      // Wire up Archives Sidebar Item
      const archivesNav = document.querySelector('.nav-item[data-view="view-archives"]');
      if (archivesNav) {
        archivesNav.addEventListener('click', () => {
          showView("view-archives");
        });
      }

      // Wire up General Nav Items (Automatic switching)
      document.querySelectorAll('.nav-item[data-view]').forEach(item => {
        item.addEventListener('click', () => {
          const viewId = item.getAttribute('data-view');
          if (viewId) showView(viewId);
        });
      });
    });

  