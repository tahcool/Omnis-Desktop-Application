    // --- DEFECTS LOGIC ---
    const FT_DEFECT_SUMMARY_METHOD = "/api/method/mxg_fleet_track.omnis_dashboard.ft_defects_dashboard.get_ft_defect_summary";
    const FT_DEFECT_CREATE_METHOD = "/api/method/mxg_fleet_track.omnis_dashboard.ft_defects_dashboard.create_ft_defect";
    const FT_DEFECT_UPDATE_METHOD = "/api/method/mxg_fleet_track.omnis_dashboard.ft_defects_dashboard.update_ft_defect";

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
        if (!q) { dropdown.classList.add("hidden"); return; }

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
          li.style.padding = "8px 12px";
          li.style.cursor = "pointer";
          li.style.borderBottom = "1px solid #f1f5f9";
          li.style.fontSize = "13px";
          li.innerHTML = `<div style="font-weight:600;">${m.model}</div><div style="font-size:11px; color:#64748b;">${m.name} · ${m.customer}</div>`;
          li.onclick = () => {
            input.value = `${m.model} - ${m.name}`;
            input.dataset.selectedName = m.name;
            dropdown.classList.add("hidden");
          };
          li.onmouseenter = () => li.style.background = "#f1f5f9";
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
      try {
        const res = await callFrappe(FT_DEFECT_SUMMARY_METHOD, {});
        if (res.error) throw new Error(res.error);

        const data = res.message || res;
        FT_DEFECTS_DATA = data.rows || [];

        renderDefectsTable(FT_DEFECTS_DATA);

      } catch (e) {
        console.error("Load Defects Error:", e);
        showToast("Failed to load defects", "err");
      }
    }

    function renderDefectsTable(rows) {
      const tbody = document.getElementById("tbl-defects");
      if (!tbody) return;
      tbody.innerHTML = "";

      if (rows.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:30px; color:#94a3b8;">No defects found</td></tr>';
        return;
      }

      rows.forEach(r => {
        const tr = document.createElement("tr");
        tr.className = "df-row";

        const s = (r.status || "").toLowerCase();
        const p = (r.priority || "Low").toLowerCase();
        const badgeColor = s === "closed" ? "#10b981" : s === "on hold" ? "#f59e0b" : "#ef4444";
        const prioColor  = p === "high" ? "#dc2626" : p === "medium" ? "#d97706" : "#64748b";
        const isClosed   = s === "closed";

        tr.style.opacity = isClosed ? "0.55" : "1";

        tr.innerHTML = `
          <td class="df-cell" style="padding:10px 12px; font-weight:600; max-width:260px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;"
              title="${(r.description||"").replace(/"/g,"&quot;")}">${r.description ? r.description.slice(0,70) + (r.description.length>70?"…":"") : "No description"}</td>
          <td class="df-cell" style="padding:10px 12px; font-size:11px;">${r.machine || "—"}</td>
          <td class="df-cell" style="padding:10px 12px;"><span style="font-size:9px;font-weight:800;color:${prioColor};background:${prioColor}18;padding:2px 7px;border-radius:10px;">${r.priority||"Low"}</span></td>
          <td class="df-cell" style="padding:10px 12px;"><span style="font-size:9px;font-weight:800;color:white;background:${badgeColor};padding:2px 7px;border-radius:10px;">${r.status||"Open"}</span></td>
          <td class="df-cell" style="padding:10px 12px; font-size:11px; color:#64748b;">${r.start_date||"—"}</td>
          <td class="df-cell" style="padding:10px 12px; font-size:11px; color:#64748b;">${r.defect_type||"—"}</td>
          <td class="df-cell" style="padding:10px 12px; white-space:nowrap;">
            <button onclick="event.stopPropagation(); openDefectModal('${r.name}')"
              style="font-size:9px;font-weight:700;padding:3px 9px;border:none;background:#2563eb;color:white;border-radius:5px;cursor:pointer;margin-right:4px;">✎ Edit</button>
            ${!isClosed ? `<button onclick="event.stopPropagation(); closeDefectInline('${r.name}', this)"
              style="font-size:9px;font-weight:700;padding:3px 9px;border:none;background:#10b981;color:white;border-radius:5px;cursor:pointer;">✓ Close</button>` : ""}
          </td>`;
        tbody.appendChild(tr);
      });
    }

    // Quick-close a defect inline without opening the modal
    window.closeDefectInline = async function(name, btn) {
      if (!confirm("Close defect " + name + "?")) return;
      const orig = btn.textContent; btn.textContent = "…"; btn.disabled = true;
      try {
        const res = await callFrappe(FT_DEFECT_UPDATE_METHOD, { name, status: "Closed" }, "POST");
        const ok = res?.message?.ok || res?.ok;
        if (ok) { showToast("Defect closed ✓", "ok"); loadFtDefects(); }
        else showToast("Error: " + (res?.message?.error || res?.error || "Failed"), "err");
      } catch(e) { showToast("Error: " + e.message, "err"); }
      finally { btn.textContent = orig; btn.disabled = false; }
    };

    // --- FSP MODAL LOGIC ---
    let FT_FSP_SEARCH_INIT = false;
    function openFspModal() {
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
      document.getElementById("fsp-new-date").value = new Date().toISOString().split('T')[0];
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

      tbody.innerHTML = '<tr><td colspan="3" style="padding:10px; text-align:center; color:#64748b;">Loading defects...</td></tr>';
      container.style.display = "block";

      try {
        const method = "/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.get_active_machine_defects";
        const res = await callFrappe(method, { machine: machineName });
        const defects = res.message || res || [];

        tbody.innerHTML = "";
        if (!defects || !defects.length) {
          tbody.innerHTML = '<tr><td colspan="3" style="padding:10px; text-align:center; color:#94a3b8;">No open defects found for this machine.</td></tr>';
          return;
        }

        defects.forEach(d => {
          const tr = document.createElement("tr");
          tr.style.borderBottom = "1px solid #f1f5f9";
          const priorityColor = (d.priority || "").toLowerCase() === "high" ? "#ef4444" : "#f59e0b";
          
          tr.innerHTML = `
            <td style="padding:6px 10px; vertical-align:middle;">
              <input type="checkbox" class="fsp-defect-check" data-name="${d.name}" data-desc="${d.description || d.name}" style="cursor:pointer;">
            </td>
            <td style="padding:6px 10px; line-height:1.2;">
              <div style="font-weight:600; color:#334155;">${d.name}</div>
              <div style="font-size:10px; color:#64748b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:280px;">${d.description || d.name}</div>
            </td>
            <td style="padding:6px 10px;">
              <span style="font-size:9px; font-weight:700; color:${priorityColor}; text-transform:uppercase;">${d.priority || "Med"}</span>
            </td>
          `;
          tbody.appendChild(tr);
        });
      } catch (e) {
        console.error("Error loading machine defects:", e);
        tbody.innerHTML = '<tr><td colspan="3" style="padding:10px; text-align:center; color:#ef4444;">Failed to load defects.</td></tr>';
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

    function openDefectModal(defectId = null) {
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
        statusGroup.classList.remove("hidden");
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
        statusGroup.classList.add("hidden");
        descInput.value = "";
      }
    }

    function closeDefectModal() {
      document.getElementById("modal-defect").classList.add("hidden");
    }

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
          // CREATE
          res = await callFrappe(FT_DEFECT_CREATE_METHOD, {
            machine, defect_type, priority, description
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

      const btnNew = document.getElementById("btn-defect-new");
      if (btnNew) btnNew.onclick = () => openDefectModal(null);

      // Wire up Sidebar Item
      const defectsNav = document.querySelector('[data-view="view-defects"]');
      if (defectsNav) {
        defectsNav.addEventListener('click', () => {
          // Short timeout to allow view transition
          setTimeout(loadFtDefects, 200);
        });
      }

      // Wire up Machine Registry Sidebar Item
      const machinesNav = document.querySelector('[data-view="view-machines"]');
      if (machinesNav) {
        machinesNav.addEventListener('click', () => {
          console.log("Loading Machine Registry...");
          setTimeout(loadFtMachineRegister, 200);
        });
      }

      // Wire up FSP Sidebar Item
      const fspNav = document.querySelector('[data-view="view-fsi"]');
      if (fspNav) {
        fspNav.addEventListener('click', () => {
          setTimeout(loadFieldServicePlan, 200);
        });
      }
      // Wire up Archives Sidebar Item
      const archivesNav = document.querySelector('[data-view="view-archives"]');
      if (archivesNav) {
        archivesNav.addEventListener('click', () => {
          showView("view-archives");
        });
      }

      // Wire up General Nav Items (Automatic switching)
      document.querySelectorAll('[data-view]').forEach(item => {
        item.addEventListener('click', () => {
          const viewId = item.getAttribute('data-view');
          if (viewId) showView(viewId);
        });
      });
    });
