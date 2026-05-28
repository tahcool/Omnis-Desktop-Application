  // ============================================================
  // MACHINE EDIT MODAL LOGIC
  // ============================================================
  const MC_EDIT_METHOD = "mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.save_ft_machine";
  let MC_EDIT_CURRENT_NAME = null;

  window.openMachineEditModal = async function(name) {
    if (!name && window.MC_CURRENT_MACHINE) name = window.MC_CURRENT_MACHINE.name;
    if (!name) { alert("No machine selected"); return; }
    MC_EDIT_CURRENT_NAME = name;

    // Show overlay immediately (don't wait for data)
    const overlay = document.getElementById("mc-edit-overlay");
    overlay.style.setProperty("display", "flex", "important");

    document.getElementById("mc-edit-title").textContent = "Edit Machine: " + name;
    document.getElementById("mc-edit-subtitle").textContent = "Loading…";
    document.getElementById("mc-edit-body").innerHTML =
      '<div style="text-align:center;padding:40px;color:#64748b;font-size:13px;">⏳ Loading machine data for <strong>' + name + '</strong>…</div>';

    try {
      // 1. Try shared cache first (fastest — already loaded from machine modal)
      let doc = window.FT_MACHINE_DETAIL_CACHE && window.FT_MACHINE_DETAIL_CACHE[name];

      // 2. Try the machine rows list (partial data but instant)
      if (!doc && window.FT_MACHINE_ROWS) {
        const quick = window.FT_MACHINE_ROWS.find(r => r.name === name);
        if (quick) doc = quick; // use partial, API will load full below
      }

      // 3. Always load full doc from API (for complete field set)
      const raw = await callFrappe(
        "/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.get_ft_machine_detail",
        { name }
      );
      const fullDoc = raw.message || raw;
      if (fullDoc && (fullDoc.name || fullDoc.customer)) {
        doc = fullDoc;
        window.FT_MACHINE_DETAIL_CACHE = window.FT_MACHINE_DETAIL_CACHE || {};
        window.FT_MACHINE_DETAIL_CACHE[name] = doc;
      }

      if (!doc) throw new Error("Machine data not found for: " + name);

      document.getElementById("mc-edit-subtitle").textContent = (doc.customer || "") + " · " + (doc.model || "") + " · " + (doc.region || "");
      renderMachineEditForm(doc);
    } catch(e) {
      console.error("[EditModal] Error:", e);
      document.getElementById("mc-edit-body").innerHTML =
        '<div style="color:#dc2626;padding:24px;font-size:13px;"><strong>Error loading machine:</strong><br>' + (e.message || String(e)) + '</div>';
    }
  };

  function renderMachineEditForm(doc) {
    const f = (id, label, val, type="text", opts=null) => {
      if (opts) {
        const optHtml = opts.map(o => `<option value="${o}"${val===o?' selected':''}>${o}</option>`).join('');
        return `<div style="display:flex;flex-direction:column;gap:4px;">
          <label style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">${label}</label>
          <select id="mce-${id}" style="padding:8px 10px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px;background:white;color:#0f172a;outline:none;">${optHtml}</select></div>`;
      }
      return `<div style="display:flex;flex-direction:column;gap:4px;">
        <label style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">${label}</label>
        <input id="mce-${id}" type="${type}" value="${(val||'').toString().replace(/"/g,'&quot;')}" style="padding:8px 10px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px;color:#0f172a;outline:none;background:white;"></div>`;
    };
    const section = (title, content) =>
      `<div style="margin-bottom:20px;"><div style="font-size:11px;font-weight:800;color:#1e293b;text-transform:uppercase;letter-spacing:0.08em;padding-bottom:6px;border-bottom:2px solid #e2e8f0;margin-bottom:12px;">${title}</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">${content}</div></div>`;

    document.getElementById("mc-edit-body").innerHTML = `
      ${section("Customer & Location", [
        f("customer","Customer",doc.customer),
        f("location","Location / Site",doc.location),
        f("region","Region",doc.region),
        f("mxg_fleet_no","MXG Fleet No.",doc.mxg_fleet_no),
        f("fleet_no","Customer Ref / Fleet No.",doc.fleet_no),
        f("working_status","Working Status",doc.working_status,null,["Active","In Maintenance","Standby","Disposed","Unknown"]),
      ].join(""))}
      ${section("Machine Identity", [
        f("sn","Serial Number (SN)",doc.sn),
        f("esn","Engine SN (ESN)",doc.esn),
        f("chassis_number","Chassis Number",doc.chassis_number),
        f("model","Model",doc.model),
        f("oem","OEM / Make",doc.oem),
        f("engine_type","Engine Type",doc.engine_type),
      ].join(""))}
      ${section("Service Configuration", [
        f("service_obligation","Service Obligation",doc.service_obligation,null,["MXG","Customer","N/A","Not Specified"]),
        f("service_interval_hours","Service Interval (Hours)",doc.service_interval_hours,"number"),
        f("fleetrack_managed","On Fleetrack™?",doc.fleetrack_managed,null,["Yes","No"]),
      ].join(""))}
      ${section("Warranty", [
        f("warranty_status","Warranty Status",doc.warranty_status,null,["Under Warranty","Out of Warranty","N/A"]),
        f("warranty_type","Warranty Type",doc.warranty_type),
        f("handover_date","Handover Date",doc.handover_date,"date"),
        f("expiry_date","Expiry Date",doc.expiry_date,"date"),
        f("warranty_period","Period (Months)",doc.warranty_period,"number"),
        f("warranty_hours","Warranty Hours",doc.warranty_hours,"number"),
      ].join(""))}
      <div style="margin-bottom:20px;">
        <label style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Notes</label>
        <textarea id="mce-notes" rows="3" style="width:100%;margin-top:4px;padding:8px 10px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px;color:#0f172a;outline:none;resize:vertical;box-sizing:border-box;">${doc.notes||''}</textarea>
      </div>`;
  }

  window.saveMachineEdit = async function() {
    if (!MC_EDIT_CURRENT_NAME) return;
    const btn = document.getElementById("mc-edit-save-btn");
    const orig = btn.textContent;
    btn.textContent = "Saving…"; btn.disabled = true;

    const g = id => { const el = document.getElementById("mce-"+id); return el ? el.value.trim() || null : null; };

    const payload = {
      name: MC_EDIT_CURRENT_NAME,
      customer: g("customer"), location: g("location"), region: g("region"),
      mxg_fleet_no: g("mxg_fleet_no"), fleet_no: g("fleet_no"),
      sn: g("sn"), esn: g("esn"), chassis_number: g("chassis_number"),
      model: g("model"), oem: g("oem"), engine_type: g("engine_type"),
      service_obligation: g("service_obligation"),
      service_interval_hours: g("service_interval_hours"),
      working_status: g("working_status"),
      warranty_status: g("warranty_status"), warranty_type: g("warranty_type"),
      handover_date: g("handover_date"), expiry_date: g("expiry_date"),
      warranty_period: g("warranty_period"), warranty_hours: g("warranty_hours"),
      notes: g("notes"), fleetrack_managed: g("fleetrack_managed"),
    };

    try {
      const res = await callFrappe(MC_EDIT_METHOD, payload, "POST");
      const ok = res?.message?.ok || res?.ok;
      if (ok) {
        showToast("Machine updated successfully!", "ok");
        // Invalidate cache so next open reloads
        if (window.FT_MACHINE_DETAIL_CACHE) delete window.FT_MACHINE_DETAIL_CACHE[MC_EDIT_CURRENT_NAME];
        closeMachineEditModal();
      } else {
        const err = res?.message?.error || res?.error || "Unknown error";
        showToast("Save failed: " + err, "err");
      }
    } catch(e) {
      showToast("Error: " + e.message, "err");
    } finally {
      btn.textContent = orig; btn.disabled = false;
    }
  };

  window.closeMachineEditModal = function() {
    document.getElementById("mc-edit-overlay").style.display = "none";
    MC_EDIT_CURRENT_NAME = null;
  };

  // Wire the Edit button in the machine modal header
  const mcEditBtn = document.getElementById("mc-edit-machine");
  if (mcEditBtn) {
    mcEditBtn.addEventListener("click", () => {
      const name = window.MC_CURRENT_MACHINE?.name;
      if (name) window.openMachineEditModal(name);
      else showToast("No machine loaded", "err");
    });
  }

  // Close on backdrop click
  document.getElementById("mc-edit-overlay").addEventListener("click", (e) => {
    if (e.target === document.getElementById("mc-edit-overlay")) closeMachineEditModal();
  });