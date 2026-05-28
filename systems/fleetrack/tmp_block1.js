  // ============================================================
  // SERVICE DUE VIEW (Phase 8)
  // ============================================================
  let SD_ALL_ROWS = [];

  window.loadServiceDueView = function() {
    const tbody = document.getElementById("svc-due-tbody");
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="8" style="padding:30px;text-align:center;color:#64748b;">⏳ Loading service data…</td></tr>';

    // Reuse already-loaded machine register data
    if (window.FT_MACHINE_ROWS && window.FT_MACHINE_ROWS.length > 0) {
      SD_ALL_ROWS = window.FT_MACHINE_ROWS;
      renderServiceDue();
    } else {
      // Load if not yet available
      callFrappe("/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.get_ft_machine_register", {})
        .then(res => {
          SD_ALL_ROWS = (res?.message?.data || res?.data || []);
          window.FT_MACHINE_ROWS = SD_ALL_ROWS;
          renderServiceDue();
        })
        .catch(e => {
          tbody.innerHTML = '<tr><td colspan="8" style="padding:20px;color:#dc2626;">Error: ' + e.message + '</td></tr>';
        });
    }
  };

  window.renderServiceDue = function() {
    const tbody = document.getElementById("svc-due-tbody");
    if (!tbody || !SD_ALL_ROWS.length) return;

    const regionFilter = (document.getElementById("svc-filter-region")?.value || "").toLowerCase();
    const statusFilter  = document.getElementById("svc-filter-status")?.value || "";

    // Only show Fleetrack-managed machines with service data
    let rows = SD_ALL_ROWS.filter(r => {
      if (r.working_status === "Sold") return false;
      return true;
    });

    // Compute HRS remaining per machine
    rows = rows.map(r => {
      const cur = parseFloat(r.current_hmr || 0);
      const nxt = parseFloat(r.next_service_hmr || 0);
      const remaining = nxt > 0 ? nxt - cur : null;
      let statusKey = "ok";
      if (remaining === null) statusKey = "unknown";
      else if (remaining <= 0) statusKey = "overdue";
      else if (remaining < 100) statusKey = "due";
      return { ...r, _remaining: remaining, _statusKey: statusKey };
    });

    // Apply filters
    if (regionFilter) rows = rows.filter(r => (r.region || "").toLowerCase() === regionFilter);
    if (statusFilter) rows = rows.filter(r => r._statusKey === statusFilter);

    // Sort: overdue first, then due, then ok
    const order = { overdue: 0, due: 1, ok: 2, unknown: 3 };
    rows.sort((a, b) => (order[a._statusKey] || 3) - (order[b._statusKey] || 3));

    // KPIs
    const allRows = SD_ALL_ROWS.map(r => {
      const cur = parseFloat(r.current_hmr || 0);
      const nxt = parseFloat(r.next_service_hmr || 0);
      const rem = nxt > 0 ? nxt - cur : null;
      if (rem === null) return "unknown";
      if (rem <= 0) return "overdue";
      if (rem < 100) return "due";
      return "ok";
    });
    document.getElementById("svc-kpi-overdue").textContent = allRows.filter(s => s === "overdue").length;
    document.getElementById("svc-kpi-due").textContent     = allRows.filter(s => s === "due").length;
    document.getElementById("svc-kpi-ok").textContent      = allRows.filter(s => s === "ok").length;

    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="8" style="padding:30px;text-align:center;color:#94a3b8;">No machines match the selected filters.</td></tr>';
      return;
    }

    tbody.innerHTML = "";
    rows.forEach(r => {
      const tr = document.createElement("tr");
      const rem = r._remaining;
      const rowBg = r._statusKey === "overdue" ? "#fef2f2" : r._statusKey === "due" ? "#fffbeb" : "white";
      const badge = r._statusKey === "overdue"
        ? '<span style="font-size:9px;font-weight:800;color:white;background:#dc2626;padding:2px 8px;border-radius:10px;">OVERDUE</span>'
        : r._statusKey === "due"
        ? '<span style="font-size:9px;font-weight:800;color:#92400e;background:#fde68a;padding:2px 8px;border-radius:10px;">DUE SOON</span>'
        : '<span style="font-size:9px;font-weight:800;color:#065f46;background:#d1fae5;padding:2px 8px;border-radius:10px;">OK</span>';
      const remDisplay = rem === null ? "—" : rem <= 0
        ? '<span style="color:#dc2626;font-weight:700;">' + Math.abs(rem).toFixed(0) + ' HRS OVER</span>'
        : '<span style="color:' + (rem < 100 ? "#d97706" : "#059669") + ';font-weight:700;">' + rem.toFixed(0) + ' HRS</span>';
      const esc = String(r.name || "").replace(/'/g, "\\'");
      tr.style.background = rowBg;
      tr.style.borderBottom = "1px solid #e2e8f0";
      tr.innerHTML = `
        <td style="padding:10px 12px;font-weight:700;font-size:11px;">${r.name||"—"}<div style="font-size:9px;color:#94a3b8;font-weight:400;">${r.model||""}</div></td>
        <td style="padding:10px 12px;font-size:11px;">${r.customer||"—"}</td>
        <td style="padding:10px 12px;font-size:11px;">${r.region||"—"}</td>
        <td style="padding:10px 12px;text-align:right;font-size:11px;font-family:monospace;">${parseFloat(r.current_hmr||0).toFixed(0)}</td>
        <td style="padding:10px 12px;text-align:right;font-size:11px;font-family:monospace;">${r.next_service_hmr ? parseFloat(r.next_service_hmr).toFixed(0) : "—"}</td>
        <td style="padding:10px 12px;text-align:right;">${remDisplay}</td>
        <td style="padding:10px 12px;">${badge}</td>
        <td style="padding:10px 12px;white-space:nowrap;">
          <button onclick="window.openLogServiceModal('${esc}')"
            style="font-size:9px;font-weight:700;padding:3px 9px;border:none;background:#f02510;color:white;border-radius:5px;cursor:pointer;margin-right:4px;">🔧 Service</button>
          <button onclick="window.openMachineEditModal('${esc}')"
            style="font-size:9px;font-weight:700;padding:3px 9px;border:none;background:#2563eb;color:white;border-radius:5px;cursor:pointer;">✎ Edit</button>
        </td>`;
      tbody.appendChild(tr);
    });
  };

  // ============================================================
  // CUSTOMERS VIEW (Phase 4)
  // ============================================================
  let CUST_ALL_DATA = [];

  window.loadCustomersView = async function() {
    const tbody = document.getElementById("cust-tbody");
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="7" style="padding:30px;text-align:center;color:#64748b;">⏳ Loading customers…</td></tr>';
    try {
      // Derive customers from the already-loaded machine register (no new API needed)
      let machines = window.FT_MACHINE_ROWS || [];
      if (!machines.length) {
        const res = await callFrappe(
          "/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.get_ft_machine_register", {}
        );
        machines = res?.message?.data || res?.data || [];
        window.FT_MACHINE_ROWS = machines;
      }
      // Aggregate unique customers from machine list
      const custMap = {};
      machines.forEach(m => {
        const key = (m.customer || "").trim();
        if (!key) return;
        if (!custMap[key]) {
          custMap[key] = { name: key, customer_name: key, region: m.region || "",
            machine_count: 0, contact_person: "", phone: "", email: "", whatsapp_group_id: "" };
        }
        custMap[key].machine_count++;
        if (!custMap[key].region && m.region) custMap[key].region = m.region;
      });
      CUST_ALL_DATA = Object.values(custMap).sort((a,b) => a.customer_name.localeCompare(b.customer_name));
      filterCustomers();
    } catch(e) {
      if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="padding:20px;color:#dc2626;">Error: ' + e.message + '</td></tr>';
    }
  };

  window.filterCustomers = function() {
    const q = (document.getElementById("cust-search")?.value || "").toLowerCase();
    const regionF = (document.getElementById("cust-filter-region")?.value || "").toLowerCase();
    const rows = CUST_ALL_DATA.filter(c => {
      if (regionF && (c.region||"").toLowerCase() !== regionF) return false;
      if (!q) return true;
      const hay = [c.customer_name, c.contact_person, c.phone, c.region].map(s => (s||"").toLowerCase()).join(" ");
      return hay.includes(q);
    });
    renderCustomersTable(rows);
  };

  function renderCustomersTable(rows) {
    const tbody = document.getElementById("cust-tbody");
    if (!tbody) return;
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="padding:30px;text-align:center;color:#94a3b8;">No customers found.</td></tr>';
      return;
    }
    tbody.innerHTML = "";
    rows.forEach(c => {
      const tr = document.createElement("tr");
      tr.style.borderBottom = "1px solid #e5e7f0";
      tr.onmouseenter = () => tr.style.background = "#f8fafc";
      tr.onmouseleave = () => tr.style.background = "";
      const esc = String(c.name || "").replace(/'/g, "\\'");
      const waIcon = c.whatsapp_group_id
        ? '<span style="color:#25D366;font-size:13px;" title="' + c.whatsapp_group_id + '">✓</span>'
        : '<span style="color:#94a3b8;font-size:13px;">—</span>';
      tr.innerHTML = `
        <td style="padding:10px 12px;font-weight:700;font-size:11px;">${c.customer_name||c.name||"—"}</td>
        <td style="padding:10px 12px;font-size:11px;">${c.contact_person||"—"}</td>
        <td style="padding:10px 12px;font-size:11px;"><a href="tel:${c.phone||""}" style="color:#2563eb;text-decoration:none;">${c.phone||"—"}</a></td>
        <td style="padding:10px 12px;font-size:11px;">${c.region||"—"}</td>
        <td style="padding:10px 12px;text-align:center;">${waIcon}</td>
        <td style="padding:10px 12px;text-align:right;font-size:11px;font-weight:700;">${c.machine_count||0}</td>
        <td style="padding:10px 12px;white-space:nowrap;">
          <button onclick="openCustModal('${esc}')"
            style="font-size:9px;font-weight:700;padding:3px 9px;border:none;background:#2563eb;color:white;border-radius:5px;cursor:pointer;">✎ Edit</button>
        </td>`;
      tbody.appendChild(tr);
    });
  }

  window.openNewCustomerModal = function() {
    document.getElementById("cust-edit-name").value = "";
    document.getElementById("cust-edit-customer-name").value = "";
    document.getElementById("cust-edit-contact").value = "";
    document.getElementById("cust-edit-phone").value = "";
    document.getElementById("cust-edit-email").value = "";
    document.getElementById("cust-edit-region").value = "";
    document.getElementById("cust-edit-wa").value = "";
    document.getElementById("cust-modal-title").textContent = "➕ New Customer";
    const ov = document.getElementById("cust-edit-overlay");
    if (ov.parentNode !== document.body) document.body.appendChild(ov);
    ov.style.setProperty("display","flex","important");
  };

  window.openCustModal = function(name) {
    const c = CUST_ALL_DATA.find(x => x.name === name);
    if (!c) return;
    document.getElementById("cust-edit-name").value = c.name || "";
    document.getElementById("cust-edit-customer-name").value = c.customer_name || c.name || "";
    document.getElementById("cust-edit-contact").value = c.contact_person || "";
    document.getElementById("cust-edit-phone").value = c.phone || "";
    document.getElementById("cust-edit-email").value = c.email || "";
    document.getElementById("cust-edit-region").value = c.region || "";
    document.getElementById("cust-edit-wa").value = c.whatsapp_group_id || "";
    document.getElementById("cust-modal-title").textContent = "✎ Edit: " + (c.customer_name || c.name);
    const ov = document.getElementById("cust-edit-overlay");
    if (ov.parentNode !== document.body) document.body.appendChild(ov);
    ov.style.setProperty("display","flex","important");
  };

  window.closeCustModal = function() {
    const ov = document.getElementById("cust-edit-overlay");
    ov.style.display = "none";
  };

  window.saveCustomer = async function() {
    const g = id => document.getElementById(id)?.value?.trim() || "";
    const name = g("cust-edit-name");
    const customer_name = g("cust-edit-customer-name");
    if (!customer_name) { showToast("Customer name is required", "err"); return; }
    const btn = document.getElementById("cust-save-btn");
    const orig = btn.textContent; btn.textContent = "Saving…"; btn.disabled = true;
    try {
      const method = name
        ? "/api/method/mxg_fleet_track.omnis_dashboard.ft_customer_dashboard.update_ft_customer"
        : "/api/method/mxg_fleet_track.omnis_dashboard.ft_customer_dashboard.create_ft_customer";
      const res = await callFrappe(method, {
        name: name || undefined,
        customer_name,
        contact_person: g("cust-edit-contact"),
        phone: g("cust-edit-phone"),
        email: g("cust-edit-email"),
        region: g("cust-edit-region"),
        whatsapp_group_id: g("cust-edit-wa"),
      }, "POST");
      const result = res?.message || res;
      if (result?.ok || result?.name) {
        showToast("✅ Customer saved!", "ok");
        closeCustModal();
        loadCustomersView();
      } else {
        showToast("Error: " + (result?.error || "Save failed"), "err");
      }
    } catch(e) { showToast("Error: " + e.message, "err"); }
    finally { btn.textContent = orig; btn.disabled = false; }
  };

  // Wire up view navigation triggers
  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll('[data-view="view-service-due"]').forEach(el => {
      el.addEventListener("click", () => setTimeout(loadServiceDueView, 100));
    });
    document.querySelectorAll('[data-view="view-customers"]').forEach(el => {
      el.addEventListener("click", () => setTimeout(loadCustomersView, 100));
    });
  });