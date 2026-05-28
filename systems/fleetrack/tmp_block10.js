  // ============================================================
  // NATIVE MWR LOGIC
  // ============================================================
  window.openNativeMWR = function() {
    const overlay = document.getElementById("mwr-overlay");
    overlay.style.display = "flex";
    renderMWR();
  };

  window.closeMWR = function() {
    document.getElementById("mwr-overlay").style.display = "none";
  };

  window.renderMWR = function() {
    const tbody = document.getElementById("mwr-body");
    tbody.innerHTML = '<div style="text-align:center;padding:40px;color:#64748b;"><span class="omnis-spinner-ring" style="width:22px;height:22px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:10px;"></span> Building report from machine register…</div>';

    const threshold = parseInt(document.getElementById("mwr-filter-threshold").value);
    const region = (document.getElementById("mwr-filter-region").value || "").toLowerCase();
    const rows = window.FT_MACHINE_ROWS || [];

    if (!rows.length) {
      tbody.innerHTML = '<div style="text-align:center;padding:40px;color:#64748b;">No machine data loaded. Please go to Machine Register first.</div>';
      return;
    }

    const warnings = [];
    for (const r of rows) {
      if (region && !(r.region||"").toLowerCase().includes(region)) continue;

      let hrsRemaining = r.hours_remaining_to_service;
      if (hrsRemaining == null && r.next_service_hmr != null && r.current_hmr != null) {
        hrsRemaining = Number(r.next_service_hmr) - Number(r.current_hmr);
      }
      if (hrsRemaining == null) continue;

      const hrs = Number(hrsRemaining);
      const isOverdue = hrs < 0;
      const isDue = hrs >= 0 && hrs <= threshold;

      if (threshold === 0 && !isOverdue) continue;
      if (threshold > 0 && !isOverdue && !isDue) continue;

      warnings.push({ ...r, hrs_remaining: hrs, isOverdue });
    }

    warnings.sort((a, b) => a.hrs_remaining - b.hrs_remaining);

    document.getElementById("mwr-count-badge").textContent = warnings.length + " machine" + (warnings.length !== 1 ? "s" : "") + " flagged";
    document.getElementById("mwr-subtitle").textContent = `${warnings.length} machines requiring service attention`;

    if (!warnings.length) {
      tbody.innerHTML = '<div style="text-align:center;padding:60px;color:#10b981;font-size:14px;font-weight:700;">&#x2714; All machines within service tolerance!</div>';
      return;
    }

    const trs = warnings.map((r, i) => {
      const urgColor = r.isOverdue ? "#fee2e2" : "#fffbeb";
      const badge = r.isOverdue
        ? `<span style="background:#dc2626;color:white;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:800;">OVERDUE ${Math.abs(r.hrs_remaining).toFixed(0)} HRS</span>`
        : `<span style="background:#f59e0b;color:white;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:800;">DUE IN ${r.hrs_remaining.toFixed(0)} HRS</span>`;
      return `<tr style="background:${urgColor}; border-bottom:1px solid #e5e7eb;">
        <td style="padding:10px 12px;font-size:11px;font-weight:700;color:#64748b;">${i+1}</td>
        <td style="padding:10px 12px;font-size:11px;font-weight:800;color:#0f172a;">${r.name||'-'}</td>
        <td style="padding:10px 12px;font-size:11px;">${r.customer||'-'}</td>
        <td style="padding:10px 12px;font-size:11px;">${r.model||'-'}</td>
        <td style="padding:10px 12px;font-size:11px;">${r.sn||'-'}</td>
        <td style="padding:10px 12px;font-size:11px;">${r.region||'-'}</td>
        <td style="padding:10px 12px;font-size:11px;">${r.current_hmr!=null?Number(r.current_hmr).toFixed(0)+' HRS':'-'}</td>
        <td style="padding:10px 12px;font-size:11px;">${r.next_service_hmr!=null?Number(r.next_service_hmr).toFixed(0)+' HRS':'-'}</td>
        <td style="padding:10px 12px;">${badge}</td>
        <td style="padding:10px 12px;font-size:11px;">${r.service_obligation||'-'}</td>
      </tr>`;
    }).join("");

    tbody.innerHTML = `<table style="width:100%;border-collapse:collapse;">
      <thead><tr style="background:#4c1d95;color:white;position:sticky;top:0;">
        <th style="padding:10px 12px;font-size:10px;font-weight:700;text-align:left;">#</th>
        <th style="padding:10px 12px;font-size:10px;font-weight:700;text-align:left;">MACHINE</th>
        <th style="padding:10px 12px;font-size:10px;font-weight:700;text-align:left;">CUSTOMER</th>
        <th style="padding:10px 12px;font-size:10px;font-weight:700;text-align:left;">MODEL</th>
        <th style="padding:10px 12px;font-size:10px;font-weight:700;text-align:left;">SN</th>
        <th style="padding:10px 12px;font-size:10px;font-weight:700;text-align:left;">REGION</th>
        <th style="padding:10px 12px;font-size:10px;font-weight:700;text-align:left;">CURRENT HMR</th>
        <th style="padding:10px 12px;font-size:10px;font-weight:700;text-align:left;">NEXT SERVICE</th>
        <th style="padding:10px 12px;font-size:10px;font-weight:700;text-align:left;">STATUS</th>
        <th style="padding:10px 12px;font-size:10px;font-weight:700;text-align:left;">OBLIGATION</th>
      </tr></thead>
      <tbody>${trs}</tbody>
    </table>`;
  };

  window.printMWR = function() {
    const table = document.getElementById("mwr-body").innerHTML;
    const w = window.open("","_blank");
    w.document.write(`<!DOCTYPE html><html><head><title>MWR - Maintenance Warning Report</title>
      <style>body{font-family:Arial,sans-serif;font-size:11px;padding:16px;}
      table{width:100%;border-collapse:collapse;}th{background:#4c1d95;color:white;padding:7px 10px;text-align:left;font-size:10px;}
      td{padding:7px 10px;border-bottom:1px solid #e5e7eb;}</style></head>
      <body><h2>&#x26A0; Maintenance Warning Report (MWR)</h2>
      <p>Generated: ${new Date().toLocaleString()}</p>${table}</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 800);
  };

  // Replace openFrappeReport for MWR with native version
  const _origOpenFrappeReport = window.openFrappeReport;
  window.openFrappeReport = function(reportName) {
    if (decodeURIComponent(reportName).includes("Maintenance Warning")) {
      window.openNativeMWR();
    } else if (_origOpenFrappeReport) {
      _origOpenFrappeReport(reportName);
    }
  };

  // Close MWR on backdrop click
  document.getElementById("mwr-overlay").addEventListener("click", (e) => {
    if (e.target === document.getElementById("mwr-overlay")) closeMWR();
  });