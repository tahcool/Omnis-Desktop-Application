    // --- CREATE MODAL LOGIC ---
    let MACHINES_DATALIST_POPULATED = false;

    async function openCreateModal(prefillMachineName) {
      try {
        let overlay = document.getElementById("db-create-modal-overlay");
        if (!overlay) {
          alert("Error: Create Modal Overlay not found in document.");
          return;
        }

        // ONE-TIME TELEPORT: Move overlay to <body> directly to escape app-shell overflow:hidden
        // which traps position:fixed children in a clipped stacking context.
        if (overlay.parentNode !== document.body) {
          document.body.appendChild(overlay);
          console.log("[Modal] Teleported overlay to <body>");
        }

        // Show with maximum z-index override
        overlay.classList.remove("hidden");
        overlay.style.setProperty("display", "flex", "important");
        overlay.style.setProperty("z-index", "2147483647", "important");
        overlay.style.setProperty("position", "fixed", "important");
        overlay.style.setProperty("inset", "0", "important");
        console.log("[Modal] db-create-modal-overlay shown. display:", overlay.style.display, "z-index:", overlay.style.zIndex);

        // Set default date to today
        const dateInput = document.getElementById("db-create-date");
        if (dateInput) dateInput.valueAsDate = new Date();

        // Ensure machines are loaded (background, non-blocking)
        if (!window.MACHINES_MAP || Object.keys(window.MACHINES_MAP).length === 0) {
          showToast("Loading machine list in background...", "info", 3000);
          loadFtMachineRegister({ quiet: true }).catch(err => console.warn("Background machine load failed:", err));
        }

        // Fetch dynamic categories with fallback
        try {
          const catRes = await callFrappe("/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.get_breakdown_categories", {});
          if (catRes && Array.isArray(catRes) && catRes.length > 0) {
            const catSelect = document.getElementById("db-create-category");
            if (catSelect) {
              catSelect.innerHTML = "";
              catRes.forEach(cat => {
                const opt = document.createElement("option");
                opt.value = cat; opt.textContent = cat;
                if (cat === "Unscheduled") opt.selected = true;
                catSelect.appendChild(opt);
              });
              if (!catRes.includes("Unscheduled") && catSelect.options.length > 0) catSelect.selectedIndex = 0;
            }
          }
        } catch (e) {
          console.warn("Categories API failed, using fallback:", e.message);
          const catSelect = document.getElementById("db-create-category");
          if (catSelect && catSelect.options.length === 0) {
            ["Unscheduled","Scheduled","Operator Error","Wear & Tear","Accident"].forEach((cat, i) => {
              const opt = document.createElement("option");
              opt.value = cat; opt.textContent = cat;
              if (i === 0) opt.selected = true;
              catSelect.appendChild(opt);
            });
          }
        }

        // Handle pre-fill if machine name is passed
        if (prefillMachineName && window.MACHINES_MAP && window.MACHINES_MAP[prefillMachineName]) {
          const input = document.getElementById("db-create-machine-search");
          if (input) {
            const m = window.MACHINES_MAP[prefillMachineName];
            input.value = (m.model || "") + " - " + (m.sn || prefillMachineName);
            input.dataset.selectedName = prefillMachineName;
            const custEl = document.getElementById("db-create-customer");
            const regEl  = document.getElementById("db-create-region");
            if (custEl) custEl.value = m.customer || "";
            if (regEl)  regEl.value  = m.region || "";
            if (window.ftDebugLog) window.ftDebugLog("Pre-filled Breakdown for: " + prefillMachineName);
          }
        }

      } catch (err) {
        console.error("openCreateModal error:", err);
        alert("Failed to open Create Modal: " + err.message);
      }
    }

    function closeCreateModal() {
      const overlay = document.getElementById("db-create-modal-overlay");
      if (overlay) {
        overlay.classList.add("hidden");
        overlay.style.removeProperty("display"); // Remove the !important inline override
      }

      // Reset Fields
      const input = document.getElementById("db-create-machine-search");
      input.value = "";
      input.dataset.selectedName = ""; // Clear selection

      document.getElementById("db-create-machine-dropdown").classList.add("hidden");
      document.getElementById("db-create-customer").value = "";
      document.getElementById("db-create-region").value = "";
      document.getElementById("db-create-description").value = "";
      document.getElementById("db-create-description").value = "";
      document.getElementById("db-create-urgent").checked = false;
      document.getElementById("db-create-hold").checked = false;

      // Default selects
      document.getElementById("db-create-ted").value = "TBA";
      document.getElementById("db-create-category").value = "Unscheduled";
      document.getElementById("db-create-quote-date").value = "";
      document.getElementById("db-create-end-date").value = "";
      document.getElementById("db-create-ted-date").value = "";
      document.getElementById("db-create-red-date").value = "";
      document.getElementById("db-create-out-eta").value = "";
      document.getElementById("db-create-parts-eta").value = "";
    }

    // --- Custom Autocomplete Logic ---
    const machineInput = document.getElementById("db-create-machine-search");
    const machineDropdown = document.getElementById("db-create-machine-dropdown");

    // Force load on focus if empty
    machineInput?.addEventListener("focus", async () => {
      if (!window.MACHINES_MAP || Object.keys(window.MACHINES_MAP).length === 0) {
        showToast("Fetching machine list...", "info", 1500);
        await loadFtMachineRegister();
      }
    });

    machineInput?.addEventListener("input", function (e) {
      const q = this.value.trim().toLowerCase();

      // Allow clearing
      if (!q) {
        machineDropdown.classList.add("hidden");
        return;
      }

      // Filter local map
      if (!window.MACHINES_MAP || Object.keys(window.MACHINES_MAP).length === 0) {
        // If still empty, maybe show a hint
        renderMachineDropdown([], "Loading machines...");
        return;
      }

      const matches = Object.values(window.MACHINES_MAP).filter(m => {
        const hay = [m.model, m.sn, m.name, m.fleet_no, m.mxg_fleet_no].map(s => (s || "").toLowerCase()).join(" ");
        return hay.includes(q);
      }).slice(0, 15);

      renderMachineDropdown(matches, q);
    });

    // Close dropdown on click outside
    document.addEventListener("click", (e) => {
      if (machineInput && machineDropdown && !machineInput.contains(e.target) && !machineDropdown.contains(e.target)) {
        machineDropdown.classList.add("hidden");
      }
    });

    function renderMachineDropdown(matches, query) {
      if (!machineDropdown) return;
      machineDropdown.innerHTML = "";
      machineDropdown.classList.remove("hidden");

      if (matches.length === 0) {
        // Show 'No matches'
        const li = document.createElement("li");
        li.style.padding = "10px 12px";
        li.style.color = "#94a3b8";
        li.style.fontSize = "13px";
        li.textContent = query === "Loading machines..." ? "Loading data..." : "No matches found.";
        machineDropdown.appendChild(li);
        return;
      }

      matches.forEach(m => {
        const li = document.createElement("li");
        li.style.padding = "8px 12px";
        li.style.cursor = "pointer";
        li.style.borderBottom = "1px solid #f1f5f9";
        li.style.fontSize = "13px";
        li.innerHTML = `
            <div style="font-weight:600; color:#1e293b;">${m.model || m.name}</div>
            <div style="font-size:11px; color:#64748b;">SN: ${m.sn || "N/A"} · ${m.customer || "No Cust"}</div>
        `;

        li.addEventListener("click", () => {
          selectMachine(m);
        });

        li.onmouseenter = () => li.style.background = "#f1f5f9";
        li.onmouseleave = () => li.style.background = "white";

        machineDropdown.appendChild(li);
      });
    }

    function selectMachine(m) {
      if (!machineInput) return;
      machineInput.value = `${m.model} - ${m.sn}`;
      machineInput.dataset.selectedName = m.name; // Store ID

      document.getElementById("db-create-customer").value = m.customer || "";
      document.getElementById("db-create-region").value = m.region || "";

      machineDropdown.classList.add("hidden");
    }

    // --- CREATE ACTION HANDLER ---
    const btnCreateConfirm = document.getElementById("db-create-confirm");
    if (btnCreateConfirm) {
      btnCreateConfirm.addEventListener("click", async function () {
        console.log("[CreateBreakdown] Submit clicked");
        
        // Use the stored unique name if available, otherwise try to use the typed value (fallback)
        const input = document.getElementById("db-create-machine-search");
        const machine = input.dataset.selectedName || input.value;
        const description = document.getElementById("db-create-description").value;
        const date = document.getElementById("db-create-date").value;
        const urgent = document.getElementById("db-create-urgent").checked ? 1 : 0;
        const on_hold = document.getElementById("db-create-hold").checked ? 1 : 0;
        const resp = document.getElementById("db-create-resp").value;
        const ted_status = document.getElementById("db-create-ted").value;
        const bd_category = document.getElementById("db-create-category").value;
        const parts_eta = document.getElementById("db-create-parts-eta").value;
        const quote_date = document.getElementById("db-create-quote-date").value;
        const breakdown_end_date = document.getElementById("db-create-end-date").value;
        const is_running = document.getElementById("db-create-running").value;
        const entry_status = document.getElementById("db-create-status").value;

        // New Date Fields
        const ted = document.getElementById("db-create-ted-date").value;
        const red = document.getElementById("db-create-red-date").value;
        const out_eta = document.getElementById("db-create-out-eta").value;

        if (!machine) { showToast("Please select a machine", "err"); return; }
        if (machine.length > 50 && !input.dataset.selectedName) {
           showToast("Please select a machine from the list (typed name is too long).", "err");
           return;
        }
        if (!entry_status) { showToast("Please enter a Status", "err"); return; }
        if (!description) { showToast("Please enter a description", "err"); return; }

        const btn = this;
        const originalText = btn.textContent;
        btn.textContent = "Creating...";
        btn.disabled = true;

        try {
          console.log("[CreateBreakdown] Sending POST request...");
          const res = await callFrappe('/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.create_ft_breakdown_log', {
            machine, description, date, urgent, resp,
            ted_status, category: bd_category, parts_eta, on_hold,
            quote_date, breakdown_end_date,
            ted, red, out_eta,
            is_the_machine_still_running: is_running,
            status: entry_status
          }, 'POST');

          console.log("[CreateBreakdown] Response:", res);
          
          if (res.error) throw new Error(res.error);
          if (res.message && res.message.error) throw new Error(res.message.error);

          showToast("Breakdown Created!", "success");
          closeCreateModal();
          // Refresh Dashboard
          if (typeof loadDailyBreakdownReport === "function") {
             await loadDailyBreakdownReport();
          } else {
             console.warn("loadDailyBreakdownReport not found, refreshing page as fallback");
             window.location.reload();
          }

        } catch (e) {
          console.error("[CreateBreakdown] Error:", e);
          showToast("Failed: " + e.message, "err");
        } finally {
          btn.textContent = originalText;
          btn.disabled = false;
        }
      });
    }

    // Close Events
    document.getElementById("db-create-close-x")?.addEventListener("click", closeCreateModal);
    document.getElementById("db-create-cancel")?.addEventListener("click", closeCreateModal);

    window.openCreateModal = openCreateModal;
