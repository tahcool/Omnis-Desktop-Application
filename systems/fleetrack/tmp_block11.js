  // ============================================================
  // NEW MACHINE MODAL
  // ============================================================
  window.openNewMachineModal = function() {
    const overlay = document.getElementById("new-machine-overlay");
    overlay.style.setProperty("display","flex","important");
    // Reset fields
    ["nm-customer","nm-location","nm-mxg-fleet","nm-sn","nm-esn","nm-model","nm-oem","nm-engine","nm-chassis","nm-interval","nm-notes","nm-handover"].forEach(id => {
      const el = document.getElementById(id); if (el) { if (id === "nm-interval") el.value = "250"; else el.value = ""; }
    });
  };
  window.closeNewMachineModal = function() {
    document.getElementById("new-machine-overlay").style.display = "none";
  };
  window.saveNewMachine = async function() {
    const g = id => { const el = document.getElementById(id); return el ? el.value.trim() : ""; };
    const sn = g("nm-sn"), model = g("nm-model"), oem = g("nm-oem"), customer = g("nm-customer");
    if (!sn || !model || !oem || !customer) {
      showToast("Please fill in: Customer, SN, Model and OEM (required fields)", "err"); return;
    }
    const btn = document.getElementById("nm-save-btn");
    const orig = btn.textContent; btn.textContent = "Creating…"; btn.disabled = true;
    try {
      const res = await callFrappe(
        "/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.create_ft_machine",
        {
          sn, model, oem, customer,
          location: g("nm-location"), region: g("nm-region"),
          engine_type: g("nm-engine"), mxg_fleet_no: g("nm-mxg-fleet"),
          esn: g("nm-esn"), chassis_number: g("nm-chassis"),
          service_obligation: g("nm-service-obligation"),
          service_interval_hours: g("nm-interval") || "250",
          warranty_status: g("nm-warranty-status"),
          handover_date: g("nm-handover"),
          fleetrack_managed: g("nm-fleetrack"),
          has_telematics_device: g("nm-telematics"),
          notes: g("nm-notes"),
        }, "POST"
      );
      const result = res?.message || res;
      if (result?.ok) {
        showToast("✅ Machine '" + result.name + "' created!", "ok");
        closeNewMachineModal();
        // Refresh machine register
        if (typeof loadFtMachineRegister === "function") setTimeout(loadFtMachineRegister, 800);
      } else {
        showToast("Error: " + (result?.error || "Unknown error"), "err");
      }
    } catch(e) {
      showToast("Error: " + e.message, "err");
    } finally { btn.textContent = orig; btn.disabled = false; }
  };
  document.getElementById("new-machine-overlay").addEventListener("click", e => {
    if (e.target === document.getElementById("new-machine-overlay")) closeNewMachineModal();
  });

  // ============================================================
  // LOG SERVICE MODAL
  // ============================================================
  let LS_CURRENT_MACHINE = null;
  window.openLogServiceModal = function(machineName) {
    LS_CURRENT_MACHINE = machineName;
    document.getElementById("ls-title").textContent = "🔧 Log Service";
    document.getElementById("ls-subtitle").textContent = machineName;
    // Default date to today
    const d = new Date(); const ds = d.toISOString().split("T")[0];
    document.getElementById("ls-date").value = ds;
    document.getElementById("ls-hmr").value = "";
    document.getElementById("ls-tech").value = "";
    document.getElementById("ls-notes").value = "";

    // Pre-fill HMR from machine rows cache
    if (window.FT_MACHINE_ROWS) {
      const r = window.FT_MACHINE_ROWS.find(m => m.name === machineName);
      if (r && r.current_hmr) document.getElementById("ls-hmr").value = r.current_hmr;
    }
    const overlay = document.getElementById("log-service-overlay");
    overlay.style.setProperty("display","flex","important");
  };
  window.closeLogService = function() {
    document.getElementById("log-service-overlay").style.display = "none";
    LS_CURRENT_MACHINE = null;
  };
  window.saveLogService = async function() {
    if (!LS_CURRENT_MACHINE) return;
    const hmr = document.getElementById("ls-hmr").value.trim();
    if (!hmr) { showToast("Please enter Service HMR", "err"); return; }
    const btn = document.getElementById("ls-save-btn");
    const orig = btn.textContent; btn.textContent = "Saving…"; btn.disabled = true;
    try {
      const res = await callFrappe(
        "/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.log_ft_service",
        {
          machine: LS_CURRENT_MACHINE,
          service_hmr: hmr,
          service_date: document.getElementById("ls-date").value,
          service_type: document.getElementById("ls-type").value,
          technician: document.getElementById("ls-tech").value.trim(),
          description: document.getElementById("ls-notes").value.trim(),
        }, "POST"
      );
      const result = res?.message || res;
      if (result?.ok) {
        showToast("✅ " + result.message, "ok");
        // Update local cache
        if (window.FT_MACHINE_ROWS) {
          const r = window.FT_MACHINE_ROWS.find(m => m.name === LS_CURRENT_MACHINE);
          if (r) { r.last_service_hmr = parseFloat(hmr); r.next_service_hmr = result.next_service_hmr; r.current_hmr = Math.max(parseFloat(hmr), r.current_hmr||0); }
        }
        closeLogService();
        if (typeof loadFtMachineRegister === "function") setTimeout(loadFtMachineRegister, 1000);
      } else {
        showToast("Error: " + (result?.error || "Unknown error"), "err");
      }
    } catch(e) {
      showToast("Error: " + e.message, "err");
    } finally { btn.textContent = orig; btn.disabled = false; }
  };
  document.getElementById("log-service-overlay").addEventListener("click", e => {
    if (e.target === document.getElementById("log-service-overlay")) closeLogService();
  });