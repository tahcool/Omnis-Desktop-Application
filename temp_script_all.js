


          (function(){
            let _calYear, _calMonth;

            const statusColors = {
              'proposed':    '#6366f1',
              'planned':     '#f59e0b',
              'in progress': '#3b82f6',
              'completed':   '#10b981',
            };

            function colorFor(status) {
              return statusColors[(status||'').toLowerCase()] || '#64748b';
            }

            window.openFspFullCalendar = function() {
              const now = new Date();
              _calYear  = now.getFullYear();
              _calMonth = now.getMonth();
              const modal = document.getElementById('fsp-cal-modal');
              modal.style.display = 'flex';
              // If data already loaded, render immediately; otherwise load first
              if (window._fspRows && window._fspRows.length > 0) {
                renderFspCal();
              } else if (typeof window.loadFieldServicePlan === 'function') {
                // loadFieldServicePlan will set window._fspRows then we render
                const origRender = window.renderFspWeeklyCalendar;
                window._fspCalPendingRender = true;
                window.loadFieldServicePlan().then(function(){ renderFspCal(); }).catch(function(){ renderFspCal(); });
              } else {
                renderFspCal();
              }
            };

            window.closeFspFullCalendar = function() {
              document.getElementById('fsp-cal-modal').style.display = 'none';
            };

            window.fspCalNav = function(dir) {
              _calMonth += dir;
              if (_calMonth > 11) { _calMonth = 0; _calYear++; }
              if (_calMonth < 0)  { _calMonth = 11; _calYear--; }
              renderFspCal();
            };

            // Close on backdrop click
            document.getElementById('fsp-cal-modal').addEventListener('click', function(e){
              if (e.target === this) window.closeFspFullCalendar();
            });

            function renderFspCal() {
              const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
              document.getElementById('fsp-cal-title').textContent = monthNames[_calMonth] + ' ' + _calYear;

              // Read directly from the cached FSP rows (r.plan_for = date, r.customer, r.machine, r.status)
              const rows = window._fspRows || [];

              // Build a map: "YYYY-MM-DD" -> [{customer, machine, status, technician}]
              const jobMap = {};
              rows.forEach(function(r) {
                if (!r.plan_for) return;
                const d = new Date(r.plan_for);
                if (isNaN(d)) return;
                const key = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
                if (!jobMap[key]) jobMap[key] = [];
                jobMap[key].push({ customer: r.customer||'', machine: r.machine||'', status: r.status||'', technician: r.technician||'' });
              });

              const firstDay = new Date(_calYear, _calMonth, 1).getDay(); // 0=Sun
              const daysInMonth = new Date(_calYear, _calMonth + 1, 0).getDate();
              const today = new Date();
              const todayKey = today.getFullYear() + '-' + String(today.getMonth()+1).padStart(2,'0') + '-' + String(today.getDate()).padStart(2,'0');

              const grid = document.getElementById('fsp-cal-grid');
              grid.innerHTML = '';

              // Empty cells before first day
              for (let i = 0; i < firstDay; i++) {
                const empty = document.createElement('div');
                empty.style.cssText = 'min-height:90px; border-radius:8px;';
                grid.appendChild(empty);
              }

              // Day cells
              for (let d = 1; d <= daysInMonth; d++) {
                const key = _calYear + '-' + String(_calMonth+1).padStart(2,'0') + '-' + String(d).padStart(2,'0');
                const isToday = (key === todayKey);
                const dayJobs = jobMap[key] || [];

                const cell = document.createElement('div');
                cell.style.cssText = 'min-height:90px; background:' + (isToday ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.04)') + '; border:1px solid ' + (isToday ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.07)') + '; border-radius:8px; padding:6px 8px; overflow:hidden;';

                const dayNum = document.createElement('div');
                dayNum.style.cssText = 'font-size:11px; font-weight:' + (isToday ? '900' : '600') + '; color:' + (isToday ? '#ef4444' : '#94a3b8') + '; margin-bottom:4px;';
                dayNum.textContent = d;
                cell.appendChild(dayNum);

                dayJobs.slice(0, 3).forEach(function(job) {
                  const pill = document.createElement('div');
                  const c = colorFor(job.status);
                  pill.style.cssText = 'background:' + c + '22; border-left:2px solid ' + c + '; padding:2px 5px; border-radius:0 3px 3px 0; margin-bottom:2px; font-size:10px; color:#e2e8f0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;';
                  pill.textContent = job.customer || job.machine || job.status;
                  pill.title = (job.customer||'') + (job.machine ? ' · ' + job.machine : '') + (job.technician ? ' · ' + job.technician : '') + ' — ' + (job.status||'');
                  cell.appendChild(pill);
                });

                if (dayJobs.length > 3) {
                  const more = document.createElement('div');
                  more.style.cssText = 'font-size:9px; color:#64748b; margin-top:2px;';
                  more.textContent = '+' + (dayJobs.length - 3) + ' more';
                  cell.appendChild(more);
                }

                grid.appendChild(cell);
              }
            }
          })();
          


    /**
     * HMR LOG MODAL LOGIC
     */
    let CURRENT_HMR_MACHINE_DATA = null;

    window.openHmrLogModal = function(machineData) {
      CURRENT_HMR_MACHINE_DATA = machineData;
      
      const overlay = document.getElementById("hmr-log-overlay");
      if (!overlay) return;
      
      if (overlay.parentElement !== document.body) {
        document.body.appendChild(overlay);
      }

      // Populate Background Labels
      document.getElementById("hmr-log-customer-label").textContent = machineData.customer || "—";
      document.getElementById("hmr-log-sn-label").textContent = machineData.sn || "—";
      document.getElementById("hmr-log-model-label").textContent = machineData.model || "—";
      
      const prevHmr = Number(machineData.current_hmr || 0);
      document.getElementById("hmr-log-prev-label").textContent = prevHmr.toLocaleString();
      
      // Initialize Inputs
      document.getElementById("hmr-log-date").value = new Date().toISOString().split('T')[0];
      document.getElementById("hmr-log-reading").value = prevHmr;
      document.getElementById("hmr-log-op-hours").value = 0;
      document.getElementById("hmr-log-telematics").value = "No";

      // Show overlay: set display directly, then remove hidden class
      overlay.style.display = "flex";
      overlay.classList.remove("hidden");
    };

    window.closeHmrLogModal = function() {
      const overlay = document.getElementById("hmr-log-overlay");
      if (overlay) {
        overlay.style.removeProperty("display");
        overlay.classList.add("hidden");
      }
    };

    /* ✅ Professional Machine Placeholder SVG */
    const MACHINE_PLACEHOLDER_SVG = `<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="40" height="40" rx="8" fill="#f8fafc"/><path d="M12 28H28M10 24H30M14 12L12 24M26 12L28 24M14 12H26M14 12L16 8H24L26 12" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="16" cy="28" r="3" stroke="#94a3b8" stroke-width="2"/><circle cx="24" cy="28" r="3" stroke="#94a3b8" stroke-width="2"/></svg>`;

    /** 
     * Unifies machine image rendering with professional fallbacks.
     * Handles missing URLs and broken links via onerror.
     */
    function renderMachineImageHtml(picUrl, size = '36px', borderRadius = '6px') {
      const containerStyle = `width:${size}; height:${size}; border-radius:${borderRadius}; background:#f8fafc; border:1px solid #e5e7eb; display:flex; align-items:center; justify-content:center; overflow:hidden; flex-shrink:0; margin:0 auto; position:relative;`;
      
      if (!picUrl) {
        return `<div style="${containerStyle}">${MACHINE_PLACEHOLDER_SVG}</div>`;
      }
      
      return `
        <div style="${containerStyle}">
          <img src="${picUrl}" 
               style="width:100%; height:100%; object-fit:cover;" 
               onerror="window.handleMachineImageError(this)"
               alt="Machine">
        </div>
      `;
    }

    /* Global Error Handler for Machine Images to avoid quoting issues in HTML attributes */
    window.handleMachineImageError = function(img) {
      img.onerror = null; // Prevent infinite loop
      const container = img.parentElement;
      if (container) {
        container.innerHTML = MACHINE_PLACEHOLDER_SVG;
      }
    };

    window.calculateHmrOpHours = function() {
      const prevHmr = Number(CURRENT_HMR_MACHINE_DATA?.current_hmr || 0);
      const newHmr = Number(document.getElementById("hmr-log-reading").value || 0);
      const opHours = Math.max(0, newHmr - prevHmr);
      document.getElementById("hmr-log-op-hours").value = opHours;
    };

    window.submitHmrLog = async function() {
      if (!CURRENT_HMR_MACHINE_DATA) return;
      
      const btn = document.getElementById("hmr-log-submit-btn");
      const reading = Number(document.getElementById("hmr-log-reading").value);
      const prevReading = Number(CURRENT_HMR_MACHINE_DATA.current_hmr || 0);
      const logDate = document.getElementById("hmr-log-date").value;

      if (!logDate) { showToast("Please enter a reading date", "error"); return; }
      if (!reading)  { showToast("Please enter an HM reading", "error"); return; }
      if (reading < prevReading) {
        showToast("New reading cannot be lower than previous reading (" + prevReading + ")", "error");
        return;
      }

      // Field names must match the FT HMR Log doctype exactly
      const payload = {
        machine:    CURRENT_HMR_MACHINE_DATA.name,
        customer:   CURRENT_HMR_MACHINE_DATA.customer,
        model:      CURRENT_HMR_MACHINE_DATA.model,
        date:       logDate,
        hmr:        reading,
        hmr_on_log: prevReading,
        op_hours:   Number(document.getElementById("hmr-log-op-hours").value || 0),
        telematics: document.getElementById("hmr-log-telematics").value
      };

      try {
        btn.disabled = true;
        btn.textContent = "Saving...";
        
        // Send fields as named params — same pattern as working breakdown creation
        const res = await callFrappe(
          "/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.submit_ft_hmr_log",
          {
            machine:    CURRENT_HMR_MACHINE_DATA.name,
            customer:   CURRENT_HMR_MACHINE_DATA.customer || "",
            model:      CURRENT_HMR_MACHINE_DATA.model || "",
            date:       logDate,
            hmr:        String(reading),
            hmr_on_log: String(prevReading),
            op_hours:   String(Number(document.getElementById("hmr-log-op-hours").value || 0)),
            telematics: document.getElementById("hmr-log-telematics").value
          },
          "POST"
        );
        
        const msg = (res && res.message) ? res.message : res;
        if (msg && msg.status === "success") {
          showToast("HMR Log submitted successfully ✓", "success");
          window.closeHmrLogModal();
          if (window.loadFtMachineRegister) window.loadFtMachineRegister({ quiet: true });
        } else {
          const errText = (msg && msg.message) || "Failed to submit HMR log";
          showToast("Error: " + errText, "error");
        }
      } catch (err) {
        console.error("submitHmrLog error:", err);
        showToast("Connection error: " + err.message, "error");
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = "Submit"; }
      }
    };

    /**
     * RENDERS THE WEEKLY SERVICE CALENDAR
     * Groups table rows into a 7-day horizontal strip.
     */
    function renderFspWeeklyCalendar(rows) {
      const container = document.getElementById("fsp-weekly-calendar");
      if (!container) return;

      // 1. Calculate the current week (Monday to Sunday)
      const now = new Date();
      const currentDay = now.getDay(); // 0 (Sun) to 6 (Sat)
      const mondayOffset = (currentDay === 0 ? -6 : 1 - currentDay);
      const monday = new Date(now);
      monday.setDate(now.getDate() + mondayOffset);

      const weekDays = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        // Format as YYYY-MM-DD using local components to match raw_date
        const iso = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        // Format for display (e.g. Mon 08.Apr)
        const display = d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' });
        
        // Today check using local date
        const todayObj = new Date();
        const todayIso = todayObj.getFullYear() + '-' + String(todayObj.getMonth() + 1).padStart(2, '0') + '-' + String(todayObj.getDate()).padStart(2, '0');
        
        weekDays.push({ iso, display, isToday: iso === todayIso });
      }

      // Inject FSP popover styles once
      if (!document.getElementById('fsp-popover-style')) {
        const st = document.createElement('style');
        st.id = 'fsp-popover-style';
        st.textContent = `
          .fsp-chip {
            position: relative;
            padding: 5px 8px;
            margin-bottom: 6px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 700;
            color: #1e293b;
            cursor: pointer;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            border-left: 3px solid transparent;
            transition: background 0.15s, box-shadow 0.15s;
          }
          .fsp-chip:hover { box-shadow: 0 3px 8px rgba(0,0,0,0.12); filter: brightness(0.97); }
          .fsp-popover {
            display: none;
            position: absolute;
            top: 0; left: calc(100% + 8px);
            min-width: 220px; max-width: 280px;
            background: #1e293b;
            border-radius: 10px;
            padding: 12px 14px;
            box-shadow: 0 12px 32px rgba(0,0,0,0.35);
            z-index: 9999;
            pointer-events: none;
            color: #e2e8f0;
            font-size: 11px;
            line-height: 1.6;
          }
          .fsp-popover.pop-left { left: auto; right: calc(100% + 8px); }
          .fsp-chip:hover .fsp-popover { display: block; }
          .fsp-popover-row { display: flex; gap: 6px; margin-bottom: 4px; }
          .fsp-popover-label { color: #64748b; font-size: 10px; font-weight: 700; text-transform: uppercase; min-width: 68px; padding-top: 1px; }
          .fsp-popover-val { color: #f1f5f9; font-weight: 500; }
          .fsp-status-dot { display:inline-block; width:7px; height:7px; border-radius:50%; margin-right:4px; vertical-align:middle; }
        `;
        document.head.appendChild(st);
      }

      // 2. Build the HTML
      container.innerHTML = "";
      weekDays.forEach((day, dayIdx) => {
        // Match against raw_date (substring in case of timestamps)
        const dayRows = rows.filter(r => (r.raw_date || "").startsWith(day.iso));

        let chipsHtml = "";
        if (dayRows.length === 0) {
          chipsHtml = `<div style="font-size: 10px; color: #cbd5e1; text-align: center; margin-top: 10px;">No jobs</div>`;
        } else {
          dayRows.forEach(r => {
            const statusColor = r.status === 'Proposed'   ? '#94a3b8'
                              : r.status === 'Planned'    ? '#3b82f6'
                              : r.status === 'In Progress'? '#eab308'
                              : '#22c55e';
            const statusBg   = r.status === 'Proposed'   ? '#f1f5f921'
                              : r.status === 'Planned'    ? '#eff6ff'
                              : r.status === 'In Progress'? '#fef9c3'
                              : '#f0fdf4';
            // Flip popover to left side for last 2 columns
            const popClass = dayIdx >= 5 ? 'pop-left' : '';
            const custName  = safeText(r.customer  || '—');
            const machName  = safeText(r.machine   || '—');
            const techName  = safeText(r.technician|| '—');
            const location  = safeText(r.location  || '—');
            const desc      = safeText((r.description || '—').slice(0, 80));
            const dateStr   = safeText(r.raw_date  || r.date || '—');
            const dataJson  = JSON.stringify(r).replace(/"/g, '&quot;');

            chipsHtml += `
              <div
                class="fsp-chip"
                style="background:${statusBg}; border-left-color:${statusColor};"
                onclick="event.stopPropagation(); window.openFspDetailModal && window.openFspDetailModal(${dataJson})"
                title="${custName}"
              >
                ${custName}
                <div class="fsp-popover ${popClass}">
                  <div style="font-weight:800; font-size:12px; color:#fff; margin-bottom:8px; border-bottom:1px solid #334155; padding-bottom:6px;">${custName}</div>
                  <div class="fsp-popover-row"><span class="fsp-popover-label">Machine</span><span class="fsp-popover-val">${machName}</span></div>
                  <div class="fsp-popover-row"><span class="fsp-popover-label">Technician</span><span class="fsp-popover-val">${techName}</span></div>
                  <div class="fsp-popover-row"><span class="fsp-popover-label">Location</span><span class="fsp-popover-val">${location}</span></div>
                  <div class="fsp-popover-row"><span class="fsp-popover-label">Date</span><span class="fsp-popover-val">${dateStr}</span></div>
                  <div class="fsp-popover-row"><span class="fsp-popover-label">Note</span><span class="fsp-popover-val">${desc}</span></div>
                  <div style="margin-top:8px; padding-top:6px; border-top:1px solid #334155;">
                    <span class="fsp-status-dot" style="background:${statusColor};"></span>
                    <span style="color:${statusColor}; font-weight:700; font-size:10px; text-transform:uppercase;">${r.status || '—'}</span>
                    <span style="float:right; font-size:9px; color:#475569;">Click to open →</span>
                  </div>
                </div>
              </div>
            `;
          });
        }

        container.innerHTML += `
          <div style="flex: 1; min-width: 100px; display: flex; flex-direction: column;">
            <div style="
              font-size: 11px; font-weight: 700; color: ${day.isToday ? '#f02510' : '#64748b'};
              margin-bottom: 10px; padding-bottom: 6px; border-bottom: 2px solid ${day.isToday ? '#f02510' : '#e2e8f0'};
              text-align: center;
            ">
              ${day.display}
              ${dayRows.length > 0 ? `<span style="margin-left:4px; background:${day.isToday?'#f02510':'#e2e8f0'}; color:${day.isToday?'#fff':'#64748b'}; border-radius:999px; font-size:9px; padding:1px 5px;">${dayRows.length}</span>` : ''}
            </div>
            <div style="flex: 1; overflow-y: auto; max-height: 160px; padding-right: 2px; overflow: visible;">
              ${chipsHtml}
            </div>
          </div>
        `;
      });
    }


    function openSignatureModal() {
      document.getElementById("sig-modal-overlay").classList.remove("hidden");
      refreshSigPreview();
    }

    function closeSignatureModal() {
      document.getElementById("sig-modal-overlay").classList.add("hidden");
    }

    function refreshSigPreview() {
      const paper = document.getElementById("sig-report-paper");
      if (!paper) return;

      const region = document.getElementById("sig-modal-region").value;
      const sigs = JSON.parse(localStorage.getItem("ft_signatories") || "{}");
      
      const unfiltered = Object.values(DBR_ROWS_CACHE);
      const filtered = unfiltered.filter(r => (r.region || "").includes(region));

      // 1. Sort by customer name alphabetically
      filtered.sort((a, b) => (a.customer || "").localeCompare(b.customer || ""));

      // Define row chunks (approx 16 rows per page for A4 landscape)
      const rowsPerPage = 16;
      const pages = [];
      for (let i = 0; i < filtered.length; i += rowsPerPage) {
        pages.push(filtered.slice(i, i + rowsPerPage));
      }
      
      // If no data, show at least one empty page
      if (pages.length === 0) pages.push([]);

      let fullHtml = "";

      pages.forEach((pageRows, index) => {
        const isFirst = (index === 0);
        const isLast = (index === pages.length - 1);
        
        let pageHeader = "";
        if (isFirst) {
          pageHeader = `
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 25px; border-bottom: 2px solid #ef4444; padding-bottom: 15px;">
               <div style="display:flex; align-items:center;">
                 <img src="../../assets/images/omnis-logo.png" style="height:45px; width:auto; display:block;"/>
               </div>
               <div style="text-align:right;">
                 <h1 style="margin:0; font-size:20px; font-weight:800; color:#0f172a;">Daily Breakdown Report (DBR) - ${region}</h1>
                 <div style="background:#ef4444; color:#fff; display:inline-block; padding:4px 16px; margin-top:8px; border-radius:4px;">
                   <span style="font-size:10px; opacity:0.8; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">% Efficiency</span>
                   <span style="font-size:16px; font-weight:900; margin-left:12px;">${document.getElementById('dbr-efficiency')?.textContent || '50.0%'}</span>
                 </div>
               </div>
            </div>
            <div style="font-size:11px; color:#475569; margin-bottom:15px; display:flex; gap:40px;">
              <div><span style="color:#64748b; margin-right:8px;">Prepared by:</span> <span style="color:#0f172a; font-weight:700;">${CURRENT_SERVER_USER}</span></div>
              <div><span style="color:#64748b; margin-right:8px;">Report Date:</span> <span style="color:#0f172a; font-weight:700;">${new Date().toLocaleDateString('en-GB')}</span></div>
            </div>
          `;
        } else {
          pageHeader = `<div style="font-size:10px; color:#94a3b8; margin-bottom:10px;">DBR - ${region} (Page ${index + 1})</div>`;
        }

        // Track grouping per page
        let lastCustomerOnPage = null;

        let tableRowsHtml = pageRows.map((r, idx) => {
          const isNewCustomer = r.customer !== lastCustomerOnPage;
          lastCustomerOnPage = r.customer;
          
          // Add a separator for different customers starting after the first row
          const rowStyle = (isNewCustomer && idx > 0) 
            ? "border-bottom: 0.5px solid #e2e8f0; font-size: 10px; border-top: 1.5px solid #cbd5e1;" 
            : "border-bottom: 0.5px solid #e2e8f0; font-size: 10px;";

          const customerCell = isNewCustomer ? `
            <div style="font-weight:700; word-break:break-word; white-space:normal; line-height:1.2;">${safeText(r.customer)}</div>
            <div style="font-size:8px; color:#64748b;">Ref: ${safeText(r.name.slice(-5))}</div>
          ` : "";

          return `
            <tr style="${rowStyle}">
              <td style="width:13%; padding:8px 4px; vertical-align:top;">${customerCell}</td>
            <td style="width:15%; padding:8px 4px; vertical-align:top;">
              <div style="font-weight:700; margin-bottom:2px;">${safeText(r.machine_model || r.machine)}</div>
              <div style="font-size:8.5px; line-height:1.3; color:#475569;">
                <span style="color:#64748b;">SRN ▸</span> <strong>${safeText(r.serial_number || '-')}</strong><br/>
                <span style="color:#64748b;">Fleet No ▸</span> <strong>${safeText(r.fleet_no || '-')}</strong><br/>
                <span style="color:#64748b;">Current HMR ▸</span> <strong>${safeText(r.current_hmr || '-')}</strong><br/>
                <span style="color:#64748b;">Machine Running? ▸</span> <strong>${safeText(r.is_the_machine_still_running || 'No')}</strong><br/>
                <div style="display:inline-block; background:#f1f5f9; padding:1px 4px; border-radius:2px; margin-top:2px; color:#1e293b; font-weight:700; font-size:7.5px;">${safeText(r.warranty_status || 'Out of Warranty')}</div>
              </div>
            </td>
            <td style="width:7%; padding:8px 4px; vertical-align:top;">${formatDateOnly(r.breakdown_date)}</td>
            <td style="width:11%; padding:8px 4px; vertical-align:top; font-size:9px; word-break:break-word; white-space:normal; line-height:1.2;">${safeText(r.description)}</td>
            <td style="width:5%; padding:8px 4px; vertical-align:top;">${safeText(r.ted_status || 'TBA')}</td>
            <td style="width:5%; padding:8px 4px; vertical-align:top;">${safeText(r.resp || '-')}</td>
            <td style="width:8%; padding:8px 4px; vertical-align:top; white-space:normal; line-height:1.2;">${safeText(r.status)}</td>
            <td style="width:7%; padding:8px 4px; vertical-align:top; text-align:center;">${r.days_on_bd}</td>
            <td style="width:6%; padding:8px 4px; vertical-align:top;">${formatDateOnly(r.parts_eta) || '-'}</td>
            <td style="width:23%; padding:8px 4px; vertical-align:top; font-size:9px; word-break:break-word;">${safeText(r.supervisor_comment || '-')}</td>
          </tr>
        `}).join("");

        let pageFooter = "";
        if (isLast) {
          pageFooter = `
            <div style="margin-top:auto; padding-top:20px;">
              <div style="background:#ef4444; color:white; text-align:center; font-size:10px; font-weight:700; padding:4px; margin-bottom:2px;">Signatures</div>
              <div style="display:grid; grid-template-columns: repeat(5, 1fr); border:1px solid #ef4444;">
                <div style="border-right:1px solid #ef4444; padding:0;">
                  <div style="background:#ef4444; color:white; font-size:8px; padding:2px 4px;">FT Controller</div>
                  <div style="height:50px; display:flex; align-items:center; justify-content:center; padding:4px;">
                    ${sigs.controller ? '<img src="' + sigs.controller + '" style="max-height:100%; max-width:100%; object-fit:contain;"/>' : ''}
                  </div>
                </div>
                <div style="border-right:1px solid #ef4444; padding:0;">
                  <div style="background:#ef4444; color:white; font-size:8px; padding:2px 4px;">CSD Supervisor</div>
                  <div style="height:50px; display:flex; align-items:center; justify-content:center; padding:4px;">
                    ${sigs.supervisor ? '<img src="' + sigs.supervisor + '" style="max-height:100%; max-width:100%; object-fit:contain;"/>' : ''}
                  </div>
                </div>
                <div style="border-right:1px solid #ef4444; padding:0;">
                  <div style="background:#ef4444; color:white; font-size:8px; padding:2px 4px;">CSD Manager</div>
                  <div style="height:50px; display:flex; align-items:center; justify-content:center; padding:4px;">
                    ${sigs.manager ? '<img src="' + sigs.manager + '" style="max-height:100%; max-width:100%; object-fit:contain;"/>' : ''}
                  </div>
                </div>
                <div style="border-right:1px solid #ef4444; padding:0;">
                  <div style="background:#ef4444; color:white; font-size:8px; padding:2px 4px;">Ops Manager</div>
                  <div style="height:50px; display:flex; align-items:center; justify-content:center; padding:4px;">
                    ${sigs.ops ? '<img src="' + sigs.ops + '" style="max-height:100%; max-width:100%; object-fit:contain;"/>' : ''}
                  </div>
                </div>
                <div style="padding:0;">
                  <div style="background:#ef4444; color:white; font-size:8px; padding:2px 4px;">Director</div>
                   <div style="height:50px; display:flex; align-items:center; justify-content:center; padding:4px;">
                    ${sigs.director ? '<img src="' + sigs.director + '" style="max-height:100%; max-width:100%; object-fit:contain;"/>' : ''}
                  </div>
                </div>
              </div>
            </div>
          `;
        }

        fullHtml += `
          <div class="report-page">
            ${pageHeader}
            <table class="report-table">
              <thead>
                <tr style="background:#ef4444; color:white; font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:0.8px;">
                  <th style="width: 13%; padding: 10px 4px;">Customer</th>
                  <th style="width: 15%; padding: 10px 4px;">Machine</th>
                  <th style="width: 7%; padding: 10px 4px;">Reported</th>
                  <th style="width: 11%; padding: 10px 4px;">Description</th>
                  <th style="width: 5%; padding: 10px 4px;">TED</th>
                  <th style="width: 5%; padding: 10px 4px;">RED</th>
                  <th style="width: 8%; padding: 10px 4px;">Status</th>
                  <th style="width: 7%; padding: 10px 4px; text-align:center;">Day on BD</th>
                  <th style="width: 6%; padding: 10px 4px;">ETA</th>
                  <th style="width: 23%; padding: 10px 4px;">Comments</th>
                </tr>
              </thead>
              <tbody>${tableRowsHtml}</tbody>
            </table>
            ${pageFooter}
          </div>
        `;
      });

      const paperElement = document.getElementById("sig-report-paper");
      if (paperElement) paperElement.innerHTML = fullHtml;
    }

    async function confirmAndArchiveReport() {
      const region = document.getElementById("sig-modal-region").value;
      const element = document.getElementById("sig-report-paper");

      showToast("Generating PDF and Archiving...", "info");

      try {
        // Guard: html2pdf must be loaded from CDN
        if (typeof html2pdf === "undefined") {
          throw new Error("PDF library not loaded. Check internet connection and reload.");
        }

        const opt = {
          margin: [10, 10, 10, 10],
          filename: `DBR_${region}_${new Date().toISOString().split('T')[0]}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 1.5, useCORS: true, letterRendering: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape', compress: true }
        };

        const worker = html2pdf().from(element).set(opt);
        const pdfBlob = await worker.output('blob');

        console.log(`[Archive] PDF Generated. Size: ${(pdfBlob.size / 1024).toFixed(2)} KB`);

        // Promise-based FileReader — errors now propagate into the outer try-catch
        const base64data = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result.split(',')[1]);
          reader.onerror  = (e) => reject(new Error("FileReader failed: " + e));
          reader.readAsDataURL(pdfBlob);
        });

        const sigData = JSON.parse(localStorage.getItem("ft_signatories") || "{}");
        const signatoriesList = Object.keys(sigData).filter(k => sigData[k]).join(", ");

        const payload = {
          type: "DBR",
          title: `DBR ${region} - ${new Date().toLocaleDateString('en-GB')}`,
          region: region,
          signatories: signatoriesList || "System",
          content_b64: base64data
        };

        const res = await callFrappe(
          "/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.archive_signed_report",
          payload, 'POST',
          { showLoader: true, loaderMsg: "Archiving Report..." }
        );

        console.log("[Archive] API response:", res);

        if (res.message && res.message.status === "success") {
          showToast("✅ Report Archived Successfully", "success");
          closeSignatureModal();
          setTimeout(() => showView("view-archives"), 1500);
        } else {
          throw new Error(res.message?.message || res.message?.error || "Archival failed — unknown error");
        }

      } catch (err) {
        console.error("[Archive] Error:", err);
        showToast("❌ Archival failed: " + err.message, "err");
      }
    }

    async function loadReportArchives() {
      const typeFilter = document.getElementById("archive-filter-type")?.value || "";
      const tbody = document.getElementById("archive-tbody");
      if (!tbody) return;

      tbody.innerHTML = '<tr><td colspan="6" style="padding:40px; text-align:center; color:#64748b;">Loading archives...</td></tr>';

      try {
        const method = "/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.get_signed_reports";
        const r = await callFrappe(method, { type: typeFilter }, 'POST');
        const list = r.message || [];
        
        console.log("[Archive] Loaded:", list);

        if (list.length === 0) {
          tbody.innerHTML = '<tr><td colspan="6" style="padding:60px; text-align:center; color:#94a3b8;">No archived reports found.</td></tr>';
          return;
        }

        tbody.innerHTML = list.map(a => `
          <tr style="border-bottom:1px solid #e2e8f0; font-size:13px; color:#475569; transition:background 0.2s; cursor:default;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">
            <td style="padding:14px 16px;"><span style="background:#f1f5f9; padding:2px 8px; border-radius:4px; font-weight:600; font-size:10px; color:#64748b; text-transform:uppercase;">${a.report_type}</span></td>
            <td style="padding:14px 16px; font-weight:600; color:#1e293b;">${a.title}</td>
            <td style="padding:14px 16px;">${a.region}</td>
            <td style="padding:14px 16px;">${new Date(a.creation).toLocaleDateString()}</td>
            <td style="padding:14px 16px; font-style:italic;">${a.signatories || "-"}</td>
            <td style="padding:14px 16px; text-align:center;">
              <div style="display:flex; justify-content:center; gap:8px;">
                <button onclick="openPdfPreview('${a.file_url}', '${a.title}')" style="background:#3b82f6; color:white; border:none; padding:6px 12px; border-radius:6px; font-size:11px; font-weight:600; cursor:pointer;">View</button>
                <a href="${a.file_url}" target="_blank" download style="text-decoration:none; background:#f1f5f9; color:#475569; padding:6px 12px; border-radius:6px; font-size:11px; font-weight:600;">Download</a>
              </div>
            </td>
          </tr>
        `).join('');
      } catch (e) {
        console.error("Load Archives Error:", e);
        document.getElementById("archive-tbody").innerHTML = '<tr><td colspan="6" style="padding:40px; text-align:center; color:#ef4444;">Failed to load archives. Check console.</td></tr>';
      }
    }

    /* PDF Preview Functions */
    let currentPdfBlobUrl = null;

    async function openPdfPreview(url, title) {
      const modal = document.getElementById("pdf-preview-modal");
      const iframe = document.getElementById("pdf-preview-iframe");
      const loading = document.getElementById("pdf-preview-loading");
      const titleEl = document.getElementById("pdf-preview-title");
      const dlLink = document.getElementById("pdf-preview-download");

      if (!modal || !iframe) return;

      // Revoke any previous blob to free memory
      if (currentPdfBlobUrl) {
        URL.revokeObjectURL(currentPdfBlobUrl);
        currentPdfBlobUrl = null;
      }

      titleEl.innerText = title || "Report Preview";
      
      // Ensure URL is absolute
      let finalUrl = url;
      if (url.startsWith('/files/') || url.startsWith('files/')) {
        const base = (window.location.origin === 'null' || window.location.origin.startsWith('file')) 
          ? 'https://fleetrack.machinery-exchange.com' 
          : window.location.origin;
        finalUrl = base + (url.startsWith('/') ? '' : '/') + url;
      }
      
      dlLink.href = finalUrl;
      modal.classList.remove("hidden");
      loading.style.display = "flex";
      iframe.src = ""; // Clear current

      try {
        console.log("[Preview] Fetching PDF:", finalUrl);
        const response = await fetch(finalUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const blob = await response.blob();
        currentPdfBlobUrl = URL.createObjectURL(blob);
        
        iframe.src = currentPdfBlobUrl;
        iframe.onload = () => {
          setTimeout(() => { loading.style.display = "none"; }, 400);
        };
      } catch (e) {
        console.error("[Preview] Fetch failed, falling back to direct URL:", e);
        // Fallback to direct URL if fetch fails (CORS/etc)
        iframe.src = finalUrl;
        iframe.onload = () => {
          setTimeout(() => { loading.style.display = "none"; }, 400);
        };
      }
    }

    function closePdfPreview() {
      const modal = document.getElementById("pdf-preview-modal");
      const iframe = document.getElementById("pdf-preview-iframe");
      
      if (modal) modal.classList.add("hidden");
      if (iframe) iframe.src = ""; 

      if (currentPdfBlobUrl) {
        URL.revokeObjectURL(currentPdfBlobUrl);
        currentPdfBlobUrl = null;
      }
    }

    async function downloadArchivePdf(name) {
      showToast("Downloading PDF...", "info");
      try {
        const method = "/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.get_signed_report_pdf";
        const r = await callFrappe(method, { name: name });
        if (r.message && r.message.base64) {
          const link = document.createElement("a");
          link.href = `data:application/pdf;base64,${r.message.base64}`;
          link.download = `${name}.pdf`;
          link.click();
        }
      } catch (e) {
        showToast("Download failed.", "err");
      }
    }

    // --- WhatsApp Modal Logic ---
    let WA_REPORT_DATA = null;

    async function openWhatsAppReportModal() {
      document.getElementById("wa-modal-overlay").classList.remove("hidden");
      document.getElementById("wa-body").innerHTML = '<div style="padding:20px; text-align:center; color:#64748b;">Generating report texts...</div>';

      // Gather Filters
      const filters = {
        region: document.getElementById("dbr-filter-region").value,
        customer: document.getElementById("dbr-filter-customer").value,
        machine: document.getElementById("dbr-filter-machine").value,
        responsibility: document.getElementById("dbr-filter-responsibility").value,
        ifn: document.getElementById("dbr-filter-ifn")?.value || '',
        cfn: document.getElementById("dbr-filter-cfn")?.value || '',
        urgent: document.getElementById("dbr-filter-urgent").checked ? 1 : 0
      };

      try {
        const method = "/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.get_whatsapp_report_texts";
        const r = await callFrappe(method, { filters_json: JSON.stringify(filters) });

        if (r.message) {
          WA_REPORT_DATA = r.message;
          switchWaTab('internal'); // Default view
        } else {
          document.getElementById("wa-body").innerHTML = '<div style="color:red; text-align:center;">Failed to load report data.</div>';
        }
      } catch (e) {
        console.error(e);
        document.getElementById("wa-body").innerHTML = '<div style="color:red; text-align:center;">Error: ' + e.message + '</div>';
      }
    }

    function switchWaTab(tab) {
      // Tab styling
      const tInt = document.getElementById("wa-tab-internal");
      const tCust = document.getElementById("wa-tab-customer");

      if (tab === 'internal') {
        tInt.style.borderBottomColor = "#25d366"; tInt.style.color = "#0f172a"; tInt.style.fontWeight = "600";
        tCust.style.borderBottomColor = "transparent"; tCust.style.color = "#64748b"; tCust.style.fontWeight = "400";
        renderWaInternal();
      } else {
        tCust.style.borderBottomColor = "#25d366"; tCust.style.color = "#0f172a"; tCust.style.fontWeight = "600";
        tInt.style.borderBottomColor = "transparent"; tInt.style.color = "#64748b"; tInt.style.fontWeight = "400";
        renderWaCustomerList();
      }
    }

    function renderWaInternal() {
      if (!WA_REPORT_DATA) return;
      const txt = WA_REPORT_DATA.internal_report || "No text available.";

      document.getElementById("wa-body").innerHTML = `
         <div style="display:flex; flex-direction:column; height:100%;">
           <div style="margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
             <div style="font-size:12px; color:#64748b;">Consolidated list for internal group.</div>
             <div style="display:flex; gap:8px;">
               <button onclick="sendWaInternalToSupervisor()" class="tiny-btn" style="background:#25d366; color:white; border:none;">📱 Send to Supervisor</button>
             </div>
           </div>
           <textarea id="wa-textarea-internal" style="flex:1; width:100%; border:1px solid #cbd5e1; border-radius:8px; padding:12px; font-family:monospace; font-size:12px; white-space:pre-wrap; resize:none;">${txt}</textarea>
         </div>
       `;
    }

    function renderWaCustomerList() {
      if (!WA_REPORT_DATA) return;
      const reports = WA_REPORT_DATA.customer_reports || [];

      if (reports.length === 0) {
        document.getElementById("wa-body").innerHTML = '<div style="padding:20px; text-align:center;">No customer reports available for current filter.</div>';
        return;
      }

      const notice = '<div style="background:#eff6ff; color:#1e40af; padding:8px 12px; border-radius:6px; margin-bottom:12px; font-size:12px; border:1px solid #dbeafe; display:flex; align-items:center gap:6px;"><span>ℹ️</span> <span>Note: Only <b>Supervisor approved</b> updates will appear here.</span></div>';

      const listHtml = reports.map((r, i) => `
          <div style="background:white; border:1px solid #e2e8f0; border-radius:8px; padding:12px; margin-bottom:10px;">
             <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <div style="font-weight:700; color:#0f172a;">${safeText(r.customer)}</div>
                <div style="display:flex; gap:8px;">
                   <button onclick="toggleWaPreview(${i})" class="tiny-btn" style="background:#f1f5f9; color:#475569; border:1px solid #cbd5e1;">👁️ Preview</button>
                   <button onclick="copyWaCustomerText(${i})" class="tiny-btn">Copy</button>
                   <button id="btn-send-cust-${i}" onclick="sendWaCustomerReport('${r.customer.replace(/'/g, "\\'")}', ${i})" class="tiny-btn" style="background:#25d366; color:white; border:none;">📱 Send</button>
                </div>
             </div>
             <div id="wa-preview-${i}" class="wa-preview-content" style="display:none; font-size:11px; color:#475569; white-space:pre-wrap; border-top:1px dashed #e2e8f0; padding-top:10px; margin-top:10px; bg-slate-50 p-2 rounded;">${safeText(r.text)}</div>
          </div>
       `).join("");

      document.getElementById("wa-body").innerHTML = `<div style="padding-bottom:20px;">${notice}${listHtml}</div>`;
    }

    function toggleWaPreview(index) {
      // Close all others
      document.querySelectorAll('.wa-preview-content').forEach(el => {
        if (el.id !== `wa-preview-${index}`) {
          el.style.display = 'none';
        }
      });

      // Toggle current
      const el = document.getElementById(`wa-preview-${index}`);
      if (el) {
        el.style.display = (el.style.display === 'none' || el.style.display === '') ? 'block' : 'none';
      }
    }

    function copyToClipboard(elementId) {
      const copyText = document.getElementById(elementId);
      copyText.select();
      copyText.setSelectionRange(0, 99999);
      navigator.clipboard.writeText(copyText.value);
      showToast("Copied to clipboard!", "ok");
    }

    function copyWaCustomerText(index) {
      if (!WA_REPORT_DATA || !WA_REPORT_DATA.customer_reports) return;
      const report = WA_REPORT_DATA.customer_reports[index];
      if (report && report.text) {
        navigator.clipboard.writeText(report.text);
        showToast("Copied report for " + (report.customer || "customer"), "ok");
      }
    }

    async function sendWaInternalToSupervisor() {
      // Gather current filters
      const filters = {
        region: document.getElementById("dbr-filter-region").value,
        customer: document.getElementById("dbr-filter-customer").value,
        machine: document.getElementById("dbr-filter-machine").value,
        responsibility: document.getElementById("dbr-filter-responsibility").value,
        urgent: document.getElementById("dbr-filter-urgent").checked ? 1 : 0
      };

      try {
        showToast("Sending report to supervisor...", "info", 3000);

        const method = "/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.send_internal_report_whatsapp";
        const result = await callFrappe(method, { filters_json: JSON.stringify(filters) });

        if (result.message && result.message.ok) {
          showToast("✅ Report sent successfully to supervisor!", "ok", 3000);
        } else {
          const errorMsg = (result.message && result.message.error) || "Unknown error";
          showToast("❌ Failed to send: " + errorMsg, "error", 5000);
        }
      } catch (e) {
        console.error("Send error:", e);
        showToast("❌ Error sending report: " + e.message, "error", 5000);
      }
    }

    async function sendWaCustomerReport(customer, index) {
      if (!WA_REPORT_DATA || !WA_REPORT_DATA.customer_reports) return;
      const report = WA_REPORT_DATA.customer_reports[index];
      if (!report || !report.text) return;

      try {
        const btn = document.getElementById(`btn-send-cust-${index}`);
        if (btn) btn.innerHTML = "⏳ Sending...";

        showToast("Sending report to " + customer + "...", "info", 3000);

        const method = "/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.send_customer_report_whatsapp";
        const result = await callFrappe(method, {
          customer: customer,
          report_text: report.text
        });

        if (result.message && result.message.ok) {
          showToast("✅ " + result.message.message, "ok", 3000);

          if (btn) {
            btn.disabled = true;
            btn.innerHTML = "✅ Sent";
            btn.style.background = "#94a3b8";
            btn.style.cursor = "not-allowed";
          }
        } else {
          const errorMsg = (result.message && result.message.error) || "Unknown error";
          if (btn) btn.innerHTML = "📱 Send";

          if (errorMsg.includes("missing") || errorMsg.includes("notify the administrator")) {
            alert("⚠️ " + errorMsg);
          } else {
            showToast("❌ Failed to send: " + errorMsg, "error", 5000);
          }
        }
      } catch (e) {
        console.error("Send error:", e);
        showToast("❌ Error sending report: " + e.message, "error", 5000);
        const btn = document.getElementById(`btn-send-cust-${index}`);
        if (btn) btn.innerHTML = "📱 Send";
      }
    }

    // Daily 8 AM Urgent Alert
    async function checkDailyUrgentNotification() {
      const now = new Date();
      const hour = now.getHours();
      // Check if it's 08:00 - 08:59
      if (hour !== 8) return;

      const todayStr = now.toISOString().split('T')[0];
      const lastAlert = localStorage.getItem("ft_last_urgent_alert");

      if (lastAlert === todayStr) return; // Already shown today

      // Check for urgent breakdowns
      try {
        const r = await callFrappe("/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.get_ft_breakdown_dbr_v2");
        if (r.message && r.message.breakdowns) {
          const urgentCount = r.message.breakdowns.filter(b => b.urgent == 1).length;
          if (urgentCount > 0) {
            showToast(`⚠️ Attention: ${urgentCount} Urgent Breakdowns pending notification!`, "warning", 10000);
            localStorage.setItem("ft_last_urgent_alert", todayStr);
          }
        }
      } catch (e) { console.log("Urgent check failed", e); }
    }

    // Check on load and every minute
    checkDailyUrgentNotification();
    setInterval(checkDailyUrgentNotification, 60 * 1000);

    document.getElementById("wa-modal-close").onclick = () => {
      document.getElementById("wa-modal-overlay").classList.add("hidden");
    };
    // --- GLOBAL HELPERS ---
    function omnisLog(msg, type = "info") {
      console.log(`[Omnis] [${type}] ${msg}`);
      if (type === "error") showToast("Error: " + msg, "error");
    }

    // ── REPORT HUB FUNCTIONS ──────────────────────────────────────
    const FRAPPE_REPORT_BASE = 'https://fleetrack.machinery-exchange.com';

    // Map report keys to their exact Frappe report names
    const FRAPPE_REPORT_NAMES = {
      'daily_breakdown_report_(dbr)':            'Daily Breakdown Report (DBR)',
      'equipment_population_register':           'Equipment Population Register',
      'field_service_planner':                   'Field Service Planner',
      'fleetrack_activity_list':                 'Fleetrack Activity List',
      'fleetrack_machine_summary':               'Fleetrack Machine Summary',
      'fleetrack_managed':                       'Fleetrack Managed',
      'fsd_daily_breakdown_report':              'FSD Daily Breakdown Report',
      'ft_machine_register':                     'FT Machine Register',
      'ft_maintenance_warning_report_mwr':       'FT Maintenance Warning Report (MWR)',
      'general_defects_report_(gdr)':            'General Defects Report (GDR)',
      'general_population_register':             'General Population Register',
      'jobs_to_complete':                        'Jobs To Complete',
      'lost_sales_report_(lsr)':                 'Lost Sales Report (LSR)',
      'machines_due_for_service':                'Machines Due for Service',
      'major_defects_report_(mdr)':              'Major Defects Report (MDR)',
      'rdr':                                     'RDR',
      'service_tracking_summary_(sts)':          'Service Tracking Summary (STS)',
      'telematics_alert_report_(tar)':           'Telematics Alert Report (TAR)',
      'weekly_warranty_update_(wwu)':            'Weekly Warranty Update (WWU)',
      'workshop_planner':                        'Workshop Planner',
      'wsd_daily_breakdown_report':              'WSD Daily Breakdown Report',
    };

    let _currentReportUrl = '';

    function openNativeReport(reportKey, reportTitle) {
      // All reports now have native views — this is a fallback only.
      // Navigate back to reports hub if no native view was matched.
      showView('view-reports');
      console.info('[Reports] No native view for:', reportKey, '— showing Reports Hub');
    }

    function closeReportViewer() {
      const viewer = document.getElementById('frappe-report-viewer');
      viewer.style.display = 'none';
      // Clear iframe to stop network activity
      const iframe = document.getElementById('frappe-report-iframe');
      iframe.src = '';
      _currentReportUrl = '';
    }

    function refreshReportViewer() {
      if (!_currentReportUrl) return;
      const loading = document.getElementById('rpt-viewer-loading');
      const loadbar = document.getElementById('rpt-viewer-loadbar');
      const iframe  = document.getElementById('frappe-report-iframe');
      loading.style.display = 'flex';
      loadbar.style.display = 'block';
      iframe.src = _currentReportUrl;
    }

    function filterReportCards(q) {
      const ql = (q || '').toLowerCase().trim();
      document.querySelectorAll('.rpt-card').forEach(card => {
        const label = (card.dataset.label || '').toLowerCase();
        card.classList.toggle('rpt-hidden', ql !== '' && !label.includes(ql));
      });
      // Hide empty category headers
      document.querySelectorAll('.rpt-category').forEach(cat => {
        const visible = cat.querySelectorAll('.rpt-card:not(.rpt-hidden)').length;
        cat.style.display = visible ? '' : 'none';
      });
    }
    // ── END REPORT HUB FUNCTIONS ──────────────────────────────

    const FLEET_BASE_URL = (window.location.origin === 'null' || window.location.origin.startsWith('file')) 
      ? 'https://fleetrack.machinery-exchange.com' 
      : window.location.origin;

    const FT_BREAKDOWN_API =
      "/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.get_ft_breakdown_overview";
    const FT_DEFECTS_METHOD =
      "/api/method/mxg_fleet_track.omnis_dashboard.ft_defects_dashboard.get_ft_defect_summary";
    const FT_BREAKDOWN_UPDATE_METHOD =
      "/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.update_ft_breakdown_status";

    const FT_BREAKDOWN_SEND_APPROVAL_METHOD =
      "/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.send_breakdown_for_supervisor_approval";
    const FT_BREAKDOWN_UPDATE_FULL_METHOD =
      "/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.update_ft_breakdown_full";
    const FT_BREAKDOWN_DBR_METHOD =
      "/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.get_ft_breakdown_dbr_v2";
    const FT_JOB_CARD_METHOD =
      "/api/method/mxg_fleet_track.omnis_dashboard.ft_jobcard_dashboard.get_ft_job_cards";
    const FT_MACHINE_REGISTER_METHOD =
      "/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.get_ft_machine_register";
    const FT_MACHINE_DETAIL_METHOD =
      "/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.get_ft_machine_detail";
    const FT_ADD_SERVICE_PLAN_METHOD =
      "/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.add_ft_service_plan_entry";
    const FT_GET_SERVICE_PLAN_LIST_METHOD =
      "/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.get_ft_service_plan_list";
    const FT_UPDATE_SERVICE_PLAN_METHOD =
      "/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.update_ft_service_plan_entry";
    const FT_DELETE_SERVICE_PLAN_METHOD =
      "/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.delete_ft_service_plan_entry";

    // Track which breakdown IDs have already triggered a notification (persisted to localStorage)
    // Load previously notified IDs from localStorage
    function loadNotifiedIds() {
      try {
        const stored = localStorage.getItem('fleetrack_notified_ids');
        if (stored) {
          const parsed = JSON.parse(stored);
          // Clean up old entries (older than 7 days)
          const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
          const cleaned = parsed.filter(item => item.timestamp > sevenDaysAgo);
          // Save cleaned data back
          localStorage.setItem('fleetrack_notified_ids', JSON.stringify(cleaned));
          return new Set(cleaned.map(item => item.id));
        }
      } catch (e) {
        console.error('Failed to load notified IDs:', e);
      }
      return new Set();
    }

    // Save a notified ID to both memory and localStorage
    function saveNotifiedId(id) {
      NOTIFIED_IDS.add(id);

      try {
        // Get existing data
        const stored = localStorage.getItem('fleetrack_notified_ids');
        const data = stored ? JSON.parse(stored) : [];

        // Add new entry with timestamp
        data.push({
          id: id,
          timestamp: Date.now()
        });

        // Clean up old entries (older than 7 days)
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        const cleaned = data.filter(item => item.timestamp > sevenDaysAgo);

        // Save back to localStorage
        localStorage.setItem('fleetrack_notified_ids', JSON.stringify(cleaned));
      } catch (e) {
        console.error('Failed to save notified ID:', e);
      }
    }

    // Clear notification history (for testing or user preference)
    function clearNotificationHistory() {
      NOTIFIED_IDS.clear();
      localStorage.removeItem('fleetrack_notified_ids');
      console.log('Notification history cleared');
    }

    const NOTIFIED_IDS = loadNotifiedIds();

    function requestNotificationPermission() {
      if (!("Notification" in window)) return;
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }

    function sendDesktopNotification(title, body, tag) {
      if (!("Notification" in window)) return;
      if (Notification.permission !== "granted") return;

      // Use Tag to prevent multiple notifications for same event
      new Notification(title, {
        body: body,
        tag: tag || undefined,
        icon: "../../assets/images/omnis-notification-icon.png"
      });
    }

    // ✅ FT Machine (standard Frappe REST resource)
    const FT_MACHINE_RESOURCE = "/api/resource/FT%20Machine";

    const SHANTUI_PORTAL_URL =
      "https://eu.shantui-osc.com/scmsoverseas/#/equipmentOperation/gzmAlarm";

    const HITACHI_PORTAL_URL =
      "https://iot.hub.hitachicm-solutionlinkage.com/#/fleet";

    function loadFleetSettings() {
      const ft_sigs = JSON.parse(localStorage.getItem("ft_signatories") || "{}");
      document.getElementById("sig-ft-controller").value = ft_sigs.controller || "";
      document.getElementById("sig-csd-supervisor").value = ft_sigs.supervisor || "";
      document.getElementById("sig-csd-manager").value = ft_sigs.manager || "";
      document.getElementById("sig-srd-rep").value = ft_sigs.srd_rep || "";
      document.getElementById("sig-md").value = ft_sigs.md || "";
    }

    function saveFleetSettings() {
      const ft_sigs = {
        controller: document.getElementById("sig-ft-controller").value,
        supervisor: document.getElementById("sig-csd-supervisor").value,
        manager: document.getElementById("sig-csd-manager").value,
        srd_rep: document.getElementById("sig-srd-rep").value,
        md: document.getElementById("sig-md").value
      };
      localStorage.setItem("ft_signatories", JSON.stringify(ft_sigs));
      showToast("Settings saved locally", "ok");
    }

    const ftThemeToggle = document.getElementById("ft-theme-toggle");
    console.log("Fleetrack dashboard script loaded");

    // --- EMERGENCY DEBUG OVERLAY REMOVED ---
    
    // Global Modal References (Moved to top for reliability)
    window.mcModalOverlay = document.getElementById("mc-modal-overlay");
    window.mcTitle = document.getElementById("mc-title");
    window.mcSubtitle = document.getElementById("mc-subtitle");
    window.mcBody = document.getElementById("mc-body");
    window.mcOpenFrappe = document.getElementById("mc-open-frappe");
    window.mcClose = document.getElementById("mc-close");

    // High-quality Base64 Fleetrack Logo (SVG) to avoid 404 stalling
    const FLEETRACK_LOGO_BASE64 = `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHJ4PSI4IiBmaWxsPSIjZWY0NDQ0Ii8+PHBhdGggZD0iTTEwIDExSDMwVjE0SDEzVjIwaDE1djNIMTNWMjloMTAiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMyIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PC9zdmc+`;

    function showView(viewId) {
      console.log(`[Navigation] Switching to ${viewId}`);
      const views = document.querySelectorAll('.view-page, .view-item');
      views.forEach(v => v.classList.add('hidden'));

      const target = document.getElementById(viewId);
      if (target) {
        target.classList.remove('hidden');
        currentViewId = viewId;
        // Scroll main content area back to top
        const mainEl = document.querySelector('main.main');
        if (mainEl) mainEl.scrollTop = 0;
        window.scrollTo(0, 0);
        
        // Auto-refresh logic based on view
        if (viewId === 'view-archives')        loadReportArchives();
        if (viewId === 'view-reports')         loadDailyBreakdownReport();
        if (viewId === 'view-defects')         loadFtDefects();
        if (viewId === 'view-machines')        loadFtMachineRegister();
        if (viewId === 'view-fsi')             loadFieldServicePlan();
        if (viewId === 'view-customers')       loadFtCustomers();
        // Native standalone reports
        if (viewId === 'view-rpt-machine-reg') loadRptMachineReg();
        if (viewId === 'view-rpt-due-service') loadRptDueService();
        if (viewId === 'view-rpt-gdr')         loadRptGdr();
        if (viewId === 'view-rpt-sts')         loadRptSts();
        if (viewId === 'view-rpt-wbd')         loadRptWbd();
        if (viewId === 'view-rpt-mwr')         loadRptMwr();
        if (viewId === 'view-rpt-wwu')         loadRptWwu();
        if (viewId === 'view-rpt-isr')         loadRptIsr();
      } else {
        console.error(`[Navigation] View container not found: ${viewId}`);
      }
    }

    const appShell = document.getElementById("app-shell");
    const sidebarToggle = document.getElementById("sidebar-toggle");
    const syncIndicator = document.getElementById("sync-indicator");
    const notifBell = document.getElementById("notif-bell");
    const notifDropdown = document.getElementById("notif-dropdown");
    const avatarMenu = document.getElementById("avatar-menu");
    const avatarDropdown = document.getElementById("avatar-dropdown");
    const menuSettings = document.getElementById("menu-settings");
    const menuAbout = document.getElementById("menu-about");
    const menuLogout = document.getElementById("menu-logout");
    const mainTitle = document.getElementById("main-title");
    const mainSubtitle = document.getElementById("main-subtitle");
    const btnPrimaryAction = document.getElementById("btn-primary-action");

    const viewDashboard = document.getElementById("view-dashboard");
    const viewReports = document.getElementById("view-reports");
    const viewBreakdowns = document.getElementById("view-breakdowns");
    const viewMachines = document.getElementById("view-machines");
    const viewDefects = document.getElementById("view-defects");
    const viewFsi = document.getElementById("view-fsi");
    const viewTechnicians = document.getElementById("view-technicians");
    const viewJobCards = document.getElementById("view-job-cards");
    const viewTeleHitachi = document.getElementById("view-telematics-hitachi");
    const viewTeleShantui = document.getElementById("view-telematics-shantui");
    const viewTeleWirtgen = document.getElementById("view-telematics-wirtgen");
    const viewTeleBobcat = document.getElementById("view-telematics-bobcat");

    const viewAbout = document.getElementById("view-about");
    const viewSettings = document.getElementById("view-settings");
    const viewLicensing = document.getElementById("view-licensing");
    const viewArchives = document.getElementById("view-archives");

    const btnShantuiOpen = document.getElementById("btn-shantui-open");

    const btnHitachiRefresh = document.getElementById("btn-hitachi-refresh");
    const btnHitachiOpen = document.getElementById("btn-hitachi-open");
    const btnHitachiCred = document.getElementById("btn-hitachi-cred");
    const hitachiSummary = document.getElementById("hitachi-summary");
    const hitachiFleetTbody = document.getElementById("tbl-hitachi-fleet");
    const hitachiAlarmsTbody = document.getElementById("tbl-hitachi-alarms");

    const searchFab = document.getElementById("search-fab");
    const jobCalendarStrip = document.getElementById("job-calendar-strip");
    const jobCardTbody = document.getElementById("job-card-tbody");
    const jobCountToday = document.getElementById("job-count-today");
    const chatWidget = document.getElementById("chat-widget");
    const chatMessages = document.getElementById("chat-messages");
    const chatInput = document.getElementById("chat-input");
    const chatSend = document.getElementById("chat-send");
    const chatStatus = document.getElementById("chat-status");
    const chatClose = document.getElementById("chat-close");

    const avatarInitials = document.getElementById("avatar-initials");
    if (avatarInitials) avatarInitials.textContent = "F";

    const defectsTbody = document.getElementById("tbl-defects");
    const defectFilterSummary = document.getElementById("defect-filter-summary");
    const btnDefectNew = document.getElementById("btn-defect-new");
    const btnDefectFilterSeverity = document.getElementById("btn-defect-filter-severity");
    const btnDefectFilterMachine = document.getElementById("btn-defect-filter-machine");
    const btnDefectFilterOverdue = document.getElementById("btn-defect-filter-overdue");

    const bdModalOverlay = document.getElementById("bd-modal-overlay");
    const bdModalTitle = document.getElementById("bd-modal-title");
    const bdModalBody = document.getElementById("bd-modal-body");
    const bdModalStatus = document.getElementById("bd-modal-status");
    const bdModalSave = document.getElementById("bd-modal-save");
    const bdModalCancel = document.getElementById("bd-modal-cancel");
    const bdModalClose = document.getElementById("bd-modal-close");
    const bdModalLink = document.getElementById("bd-modal-link");
    const bdModalSendApproval = document.getElementById("bd-modal-send-approval");

    // Dashboard breakdown table
    const bdTableBody = document.getElementById("tbl-recent-breakdowns");
    // Breakdown log module table
    const breakdownLogTbody = document.getElementById("tbl-breakdowns");

    // Machine register UI
    const machineRegionWrap = document.getElementById("machine-region-wrap");
    const machineFilterSummary = document.getElementById("machine-filter-summary");
    const machineSearchInput = document.getElementById("machine-search");
    const btnMachineRefresh = document.getElementById("btn-machine-refresh");
    const btnMachineExpandAll = document.getElementById("btn-machine-expand-all");
    const btnMachineCollapseAll = document.getElementById("btn-machine-collapse-all");

    // Machine modal refs already moved to top for reliability
    
    // Add close listeners for Machine Modal
    if (window.mcClose) {
      window.mcClose.addEventListener("click", () => {
        if (window.mcModalOverlay) window.mcModalOverlay.classList.add("hidden");
      });
    }
    if (window.mcModalOverlay) {
      window.mcModalOverlay.addEventListener("click", (e) => {
        if (e.target === window.mcModalOverlay) {
          window.mcModalOverlay.classList.add("hidden");
        }
      });
    }

    const controlCenterTbody = document.getElementById("tbl-control-center");
    const hitachiKeeper = document.getElementById("hitachi-session-keeper");

    const toastWrap = document.getElementById("toast-wrap");

    let FT_DEFECT_ROWS = [];

    // Breakdowns caches
    let FT_BREAKDOWN_ROWS_ALL = [];
    let FT_BREAKDOWN_ROWS_OPEN = [];
    let bdModalCurrent = null;

    // --- GLOBAL STATE ---
    let CURRENT_MACHINE_REGISTER = [];
    let CURRENT_DBR_ROWS = [];
    let DBR_PAGE = 1;
    const DBR_PAGE_SIZE = 50;
    let DBR_ROWS_CACHE = {};
    let CAN_EDIT_COMMENTS = false; // Global flag for permissions
    let CURRENT_SERVER_USER = "Unknown";

    // Machine caches
    window.FT_MACHINE_ROWS = [];
    window.MACHINES_MAP = {}; // Map for quick lookup

    /**
     * DASHBOARD MASTER INTERACTION LISTENER
     * Consolidates all dynamic fleet interactions (HMR logs, FSP deletes, etc.)
     * Moved to main script block to ensure unified scope.
     */
    document.addEventListener("click", function(e) {
      // 1. HMR Log Update — Only intercept clicks on the HMR trigger element
      const hmrTrigger = e.target.closest(".mr-hmr-trigger");
      if (hmrTrigger) {
        e.preventDefault();
        // NOTE: Do NOT call stopPropagation() here — it breaks all other onclick handlers
        const machineName = hmrTrigger.getAttribute("data-machine-name");
        const machine = window.MACHINES_MAP[machineName];
        if (machine && typeof window.openHmrLogModal === 'function') {
           window.openHmrLogModal(machine);
        }
        return;
      }
    }, true);
    let FT_MACHINE_LAST_QUERY = "";
    let FT_MACHINE_DETAIL_CACHE = {};

    // Hitachi caches
    let HITACHI_LAST_SNAPSHOT = null;

    let currentViewId = "view-dashboard";

    const defectFilters = {
      severity: "all",
      machine: "",
      overdueOnly: false,
    };

    // Demo fallback (placeholder)
    let CONTROL_MACHINES = [
      { brand: "Hitachi", machine: "ZX200-5G", status: "Running", hours: 4123, last_signal: "5 min ago" },
      { brand: "Bobcat", machine: "S450", status: "Idle", hours: 825, last_signal: "12 min ago" },
      { brand: "Shantui", machine: "SD32", status: "Alert", hours: 12990, last_signal: "2 min ago" },
      { brand: "Wirtgen", machine: "W200", status: "Offline", hours: 300, last_signal: "3 days ago" },
      { brand: "Hitachi", machine: "ZX870", status: "Running", hours: 10234, last_signal: "Just now" },
      { brand: "Bobcat", machine: "T590", status: "Idle", hours: 1450, last_signal: "27 min ago" },
    ];

    function showToast(text, kind = "ok", ms = 2800) {
      if (!toastWrap) return;
      const div = document.createElement("div");
      div.className = "toast " + (kind || "");
      div.textContent = text;
      toastWrap.appendChild(div);
      setTimeout(() => {
        div.style.opacity = "0";
        div.style.transition = "opacity 250ms ease";
      }, Math.max(500, ms - 250));
      setTimeout(() => div.remove(), ms);
    }

    function openExternal(url) {
      try {
        if (typeof require === "function") {
          const { shell } = require("electron");
          if (shell && shell.openExternal) return shell.openExternal(url);
        }
      } catch { }
      window.open(url, "_blank");
    }

    function setSyncState(state) {
      if (!syncIndicator) return;
      syncIndicator.classList.remove("sync-online", "sync-offline", "sync-syncing");
      if (state === "online") syncIndicator.classList.add("sync-online");
      else if (state === "offline") syncIndicator.classList.add("sync-offline");
      else if (state === "syncing") syncIndicator.classList.add("sync-syncing");

      updateSyncLabel(state);
    }

    function refreshOnlineState() {
      if (navigator.onLine) setSyncState("online");
      else setSyncState("offline");
    }

    let LAST_SYNC_TS = new Date(); // Initial load time

    function updateSyncLabel(state) {
      const el = document.getElementById("sidebar-sync-text");
      if (!el) return;

      if (state === "syncing") {
        el.innerHTML = '<span style="font-size:12px">🔄</span> Syncing...';
        return;
      }

      // If state is not syncing, show time ago
      // We assume whenever we are NOT syncing, we are "synced" relative to LAST_SYNC_TS
      // Ideally actual data fetchers update LAST_SYNC_TS

      const now = new Date();
      const diffMin = Math.floor((now - LAST_SYNC_TS) / 60000);
      let timeStr = "Just now";
      if (diffMin > 0) timeStr = diffMin + "m ago";
      if (diffMin > 60) timeStr = Math.floor(diffMin / 60) + "h ago";

      el.innerHTML = '<span style="font-size:12px">🔄</span> Last synced: ' + timeStr;
    }

    // Update the label every minute to keep "Xm ago" fresh
    setInterval(() => updateSyncLabel(), 60000);

    window.addEventListener("online", refreshOnlineState);
    window.addEventListener("offline", refreshOnlineState);
    refreshOnlineState();

    /* Sidebar toggle removed
    if (sidebarToggle) {
    sidebarToggle.addEventListener("click", () => {
    const collapsed = appShell.classList.toggle("collapsed");
    try { localStorage.setItem("fleetrackSidebarCollapsed", collapsed ? "1" : "0"); } catch { }
    });
    } */

    /* Sidebar persistence removed */

    function closeAllDropdowns() {
      if (notifDropdown) notifDropdown.classList.add("hidden");
      if (avatarDropdown) avatarDropdown.classList.add("hidden");
    }

    if (notifBell) {
      notifBell.addEventListener("click", (e) => {
        e.stopPropagation();
        const hidden = notifDropdown.classList.contains("hidden");
        closeAllDropdowns();
        if (hidden) notifDropdown.classList.remove("hidden");
      });
    }

    if (avatarMenu) {
      avatarMenu.addEventListener("click", (e) => {
        e.stopPropagation();
        const hidden = avatarDropdown.classList.contains("hidden");
        closeAllDropdowns();
        if (hidden) avatarDropdown.classList.remove("hidden");
      });
    }

    window.addEventListener("click", () => closeAllDropdowns());

    if (menuSettings) {
      menuSettings.addEventListener("click", () => {
        closeAllDropdowns();
        // Shantui credential automation removed
        hitachiSetCredentialsInteractive();
      });
    }

    if (menuAbout) {
      menuAbout.addEventListener("click", () => {
        alert("Omnis – Fleetrack dashboard\nVersion 1.0.0");
      });
    }

    if (menuLogout) {
      menuLogout.addEventListener("click", () => {
        alert("Logout handling will be wired from the Omnis login flow.");
      });
    }

    // ---------------------------
    // Helpers
    // ---------------------------
    function safeText(v) {
      if (v === null || v === undefined) return "";
      return String(v);
    }
    function normalizeStr(v) {
      return safeText(v).trim().toLowerCase();
    }

    function pickFirst(obj, keys) {
      if (!obj) return "";
      for (const k of keys) {
        if (obj[k] !== undefined && obj[k] !== null && String(obj[k]).trim() !== "") return obj[k];
      }
      return "";
    }

    function toNum(v) {
      if (v === null || v === undefined) return null;
      const n = Number(String(v).replace(/[^\d.\-]/g, ""));
      return Number.isFinite(n) ? n : null;
    }

    function fmtDate(v) {
      const s = safeText(v);
      if (!s) return "";
      try {
        const d = new Date(s);
        if (!isNaN(d.getTime())) return d.toISOString().slice(0, 19).replace("T", " ");
      } catch { }
      return s;
    }

    // ---------------------------
    // ✅ Hitachi auto-session + auto-login + data sniffer
    // ---------------------------
    function getHitachiCreds() {
      try {
        const raw = localStorage.getItem("hitachiCreds");
        if (!raw) return null;
        const obj = JSON.parse(raw);
        if (!obj || !obj.u || !obj.p) return null;
        return obj;
      } catch { return null; }
    }

    function setHitachiCreds(u, p) {
      try {
        localStorage.setItem("hitachiCreds", JSON.stringify({ u, p }));
        return true;
      } catch { return false; }
    }

    function hitachiOpenCredModal() {
      const overlay = document.getElementById("hitachi-cred-overlay");
      const btnClose = document.getElementById("hitachi-cred-close");
      const btnCancel = document.getElementById("hitachi-cred-cancel");
      const btnSave = document.getElementById("hitachi-cred-save");
      const inpUser = document.getElementById("hitachi-cred-user");
      const inpPass = document.getElementById("hitachi-cred-pass");
      const chkShow = document.getElementById("hitachi-cred-show");

      if (!overlay || !inpUser || !inpPass) {
        showToast("Hitachi credential modal missing in HTML.", "err", 4500);
        return Promise.resolve(null);
      }

      const existing = getHitachiCreds() || {};
      inpUser.value = existing.u || "";
      inpPass.value = "";
      if (chkShow) chkShow.checked = false;
      inpPass.type = "password";

      overlay.classList.remove("hidden");

      const cleanup = () => {
        overlay.classList.add("hidden");
        if (btnClose) btnClose.onclick = null;
        if (btnCancel) btnCancel.onclick = null;
        if (btnSave) btnSave.onclick = null;
        overlay.onclick = null;
        if (chkShow) chkShow.onchange = null;
        inpPass.onkeydown = null;
      };

      return new Promise((resolve) => {
        if (chkShow) {
          chkShow.onchange = () => {
            inpPass.type = chkShow.checked ? "text" : "password";
          };
        }

        const cancel = () => {
          cleanup();
          resolve(null);
        };

        const save = () => {
          const u = (inpUser.value || "").trim();
          const p = (inpPass.value || "").trim();
          if (!u || !p) {
            showToast("Please enter both username and password.", "warn", 3200);
            return;
          }
          setHitachiCreds(u, p);
          showToast("Hitachi credentials saved. Auto-login enabled.", "ok");
          cleanup();
          hitachiKickSession("Credentials updated");
          resolve({ u, p });
        };

        if (btnClose) btnClose.onclick = cancel;
        if (btnCancel) btnCancel.onclick = cancel;
        if (btnSave) btnSave.onclick = save;

        overlay.onclick = (e) => {
          if (e.target === overlay) cancel();
        };

        inpPass.onkeydown = (e) => {
          if (e.key === "Enter") save();
        };

        setTimeout(() => inpUser.focus(), 50);
      });
    }

    // ---------------------------
    // 14-DAY DASHBOARD FSP CALENDAR
    // ---------------------------
    async function renderDashboardFsp() {
      const grid = document.getElementById("dash-fsp-grid");
      if (!grid) return;

      if (!window._fspRows) {
        try {
          const { data: rowsResult, error } = await window.electron.invoke('supabase:query', {
            table: 'ft_service_plan',
            method: 'select',
            params: { columns: '*' }
          });
          if (error) throw new Error(error.message);
          
          const msg = rowsResult || [];
          window._fspRows = Array.isArray(msg) ? msg : [];
          window._fspRows.forEach(r => {
             r.name = r.frappe_name || r.id; 
             r.machine = r.machine_name || r.machine_id;
             r.plan_for = r.raw_date;
          });
        } catch(e) {
          grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;color:#ef4444;font-size:12px;font-weight:600;padding:20px;">Could not load service data</div>`;
          return;
        }
      }

      let rows = window._fspRows || [];
      const currentDiv = window.currentDivision || 'fleetrack';
      rows = rows.filter(r => {
        const mName = r.machine || r.machine_name;
        const mDiv = (window.MACHINES_MAP && window.MACHINES_MAP[mName]) ? (window.MACHINES_MAP[mName].division || 'fleetrack') : 'fleetrack';
        return mDiv === currentDiv;
      });
      const today = new Date();
      today.setHours(0,0,0,0);
      
      const jobMap = {};
      rows.forEach(r => {
        const dateVal = r.raw_date || r.plan_for;
        if (!dateVal) return;
        const d = new Date(dateVal);
        if (isNaN(d)) return;
        const key = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
        if (!jobMap[key]) jobMap[key] = [];
        jobMap[key].push(r);
      });

      const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      // Modern styling tokens
      const stBg = {proposed:'#f8fafc',planned:'#eff6ff','in progress':'#fef9c3',completed:'#dcfce7'};
      const stCol = {proposed:'#64748b',planned:'#3b82f6','in progress':'#d97706',completed:'#10b981'};

      grid.innerHTML = '';

      // Render column headers for the 7 days of the week
      for (let i = 0; i < 7; i++) {
        const d = new Date(today.getTime() + i * 86400000);
        const isToday = i === 0;
        const headerCell = document.createElement("div");
        headerCell.style.cssText = `text-align:center; font-size:11px; font-weight:800; color:${isToday?'#3b82f6':'#94a3b8'}; text-transform:uppercase; letter-spacing:1px; padding-bottom:8px;`;
        headerCell.innerHTML = `${dayNames[d.getDay()]} ${isToday?'<span style="font-size:9px;background:linear-gradient(135deg, #3b82f6, #4f46e5);color:#fff;padding:2px 8px;border-radius:99px;margin-left:6px;vertical-align:middle;box-shadow:0 2px 8px rgba(59,130,246,0.3);">TODAY</span>':''}`;
        grid.appendChild(headerCell);
      }

      for (let i = 0; i < 7; i++) {
        const d = new Date(today.getTime() + i * 86400000);
        const key = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
        const isToday = i === 0;
        const jobs = jobMap[key] || [];
        const hasJobs = jobs.length > 0;

        const cell = document.createElement("div");
        
        // Wow styling for cell
        const baseBg = isToday ? 'linear-gradient(135deg, #3b82f6, #6366f1)' : '#ffffff';
        const baseBorder = isToday ? 'transparent' : '#93c5fd';
        const baseShadow = isToday ? '0 12px 30px -5px rgba(59,130,246,0.4), 0 0 0 1px rgba(255,255,255,0.2) inset' : '0 12px 24px -4px rgba(59,130,246,0.2)';
        const hoverShadow = isToday ? '0 20px 40px -5px rgba(59,130,246,0.6), 0 0 0 1px rgba(255,255,255,0.4) inset' : '0 20px 40px -5px rgba(59,130,246,0.4)';
        const hoverTransform = 'translateY(-6px)';
        const opacityStr = (!isToday && !hasJobs) ? 'opacity:0.7;' : '';

        cell.style.cssText = `background:${baseBg}; border:1px solid ${baseBorder}; border-radius:24px; padding:20px; display:flex; flex-direction:column; gap:8px; overflow:hidden; position:relative; box-shadow:${baseShadow}; ${opacityStr} cursor:pointer; transition:all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1); z-index:1;`;
        
        cell.onmouseover = () => { cell.style.transform = hoverTransform; cell.style.boxShadow = hoverShadow; if(!isToday) cell.style.borderColor = '#3b82f6'; };
        cell.onmouseout = () => { cell.style.transform = 'translateY(0)'; cell.style.boxShadow = baseShadow; if(!isToday) cell.style.borderColor = baseBorder; };
        
        // Background Watermark Date
        const watermark = document.createElement("div");
        watermark.style.cssText = `position:absolute; right:-10px; bottom:-15px; font-size:110px; font-weight:900; line-height:1; letter-spacing:-6px; color:${isToday?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.02)'}; pointer-events:none; z-index:0; transition:color 0.3s;`;
        watermark.textContent = d.getDate();
        cell.appendChild(watermark);

        cell.onclick = (e) => {
          if (e.target.closest('[data-fsp-card]')) return;
          if (typeof openFspModal === 'function') openFspModal(key);
        };

        const head = document.createElement("div");
        head.style.cssText = `font-size:16px; font-weight:900; color:${isToday?'#ffffff':'#1e293b'}; display:flex; justify-content:space-between; align-items:center; z-index:1; position:relative; margin-bottom: 8px;`;
        head.innerHTML = `<span>${d.getDate()} ${dayNames[d.getDay()]}</span>`;
        cell.appendChild(head);

        // Content Area z-index wrapper
        const contentArea = document.createElement("div");
        contentArea.style.cssText = "display:flex; flex-direction:column; gap:6px; z-index:1; position:relative; flex:1;";
        
        if (!jobs.length) {
          const empty = document.createElement("div");
          empty.style.cssText = `font-size:12px; color:${isToday?'rgba(255,255,255,0.7)':'#cbd5e1'}; font-weight:600; padding-top:12px; display:flex; align-items:center; gap:6px;`;
          empty.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg> No jobs scheduled`;
          contentArea.appendChild(empty);
        } else {
          jobs.slice(0, 3).forEach(r => {
            const st = (r.status||'').toLowerCase();
            const bgC = stBg[st]||'#f1f5f9', txC = stCol[st]||'#64748b';
            const jdiv = document.createElement("div");
            
            window._mlookupFspRows = window._mlookupFspRows || [];
            if(!window._mlookupFspRows.includes(r)) window._mlookupFspRows.push(r);
            const idx = window._mlookupFspRows.indexOf(r);

            jdiv.dataset.fspCard = "true";
            
            if (isToday) {
               // Glassmorphic dark card for today
               jdiv.style.cssText = `background:rgba(255,255,255,0.15); border:1px solid rgba(255,255,255,0.2); backdrop-filter:blur(8px); border-radius:10px; padding:8px 10px; font-size:10px; cursor:pointer; transition:all .2s; box-shadow:0 4px 12px rgba(0,0,0,0.1);`;
               jdiv.onmouseover = () => { jdiv.style.background = 'rgba(255,255,255,0.25)'; jdiv.style.transform = 'translateY(-1px)'; };
               jdiv.onmouseout = () => { jdiv.style.background = 'rgba(255,255,255,0.15)'; jdiv.style.transform = 'translateY(0)'; };
               
               jdiv.innerHTML = `
                <div style="font-weight:800;color:#ffffff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:0.2px; font-size: 11px;">${r.machine||'—'}</div>
                <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px;">
                  <span style="color:rgba(255,255,255,0.9);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:70px;">${(r.technician||'').split(' ')[0]||'TBA'}</span>
                  <span style="font-size:8px;background:${txC};color:#fff;padding:2px 6px;border-radius:99px;font-weight:800;letter-spacing:0.3px;box-shadow:0 2px 6px rgba(0,0,0,0.15);">${r.status||'—'}</span>
                </div>
              `;
            } else {
               // Premium light card for future days
               jdiv.style.cssText = `background:rgba(255,255,255,0.95); border:1px solid rgba(226,232,240,0.8); border-left:4px solid ${txC}; border-radius:12px; padding:8px 10px; font-size:10px; cursor:pointer; transition:all .3s cubic-bezier(0.25, 0.8, 0.25, 1); box-shadow:0 4px 12px -2px rgba(0,0,0,0.04), 0 2px 4px -2px rgba(0,0,0,0.02);`;
               jdiv.onmouseover = () => { jdiv.style.boxShadow = '0 10px 25px -5px rgba(0,0,0,0.1)'; jdiv.style.transform = 'translateY(-2px)'; jdiv.style.borderColor = '#cbd5e1'; };
               jdiv.onmouseout = () => { jdiv.style.boxShadow = '0 4px 12px -2px rgba(0,0,0,0.04), 0 2px 4px -2px rgba(0,0,0,0.02)'; jdiv.style.transform = 'translateY(0)'; jdiv.style.borderColor = 'rgba(226,232,240,0.8)'; };
               
               jdiv.innerHTML = `
                <div style="font-weight:800;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:0.2px; font-size: 11px;">${r.machine||'—'}</div>
                <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px;">
                  <span style="color:#475569;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:70px;">${(r.technician||'').split(' ')[0]||'TBA'}</span>
                  <span style="font-size:8px;background:${bgC};color:${txC};padding:2px 6px;border-radius:99px;font-weight:800;letter-spacing:0.3px;">${r.status||'—'}</span>
                </div>
              `;
            }

            jdiv.onclick = () => { if(typeof openFspDetailModal==='function') openFspDetailModal(window._mlookupFspRows[idx]); };
            contentArea.appendChild(jdiv);
          });
          if(jobs.length > 3) {
            const more = document.createElement("div");
            more.style.cssText = `font-size:10px; color:${isToday?'rgba(255,255,255,0.9)':'#64748b'}; margin-top:4px; font-weight:800; text-align:center; background:${isToday?'rgba(255,255,255,0.1)':'#f1f5f9'}; border-radius:99px; padding:4px 0;`;
            more.textContent = '+' + (jobs.length - 3) + ' more jobs';
            contentArea.appendChild(more);
          }
        }
        
        cell.appendChild(contentArea);
        grid.appendChild(cell);
      }
    }
    // ---------------------------
    // 🗺️ Leaflet Map Logic
    // ---------------------------
    let fleetMap = null;
    let mapMarkersLayer = null;

    function initFleetMap() {
      const mapEl = document.getElementById("fleet-map");
      const container = document.getElementById("fleet-map-container");
      if (!mapEl || fleetMap) return;

      if (container) container.classList.remove("hidden");

      // Zimbabwe Center: -19.0154, 29.1549
      fleetMap = L.map('fleet-map', {
        zoomControl: true,
        scrollWheelZoom: false,
        attributionControl: true
      }).setView([-19.0154, 29.1549], 6);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(fleetMap);

      mapMarkersLayer = L.layerGroup().addTo(fleetMap);

      // Force valid size after a tick to fix grey-screen issue
      setTimeout(() => { if (fleetMap) fleetMap.invalidateSize(); }, 300);

      console.log("Fleet Map initialized");
    }

    // Helper: Get machine-specific icon number from sprite
    function getMachineSVG(s) {
      s = (s || "").toLowerCase();
      // Simple flat white silhouettes
      const icons = {
        excavator: `<path d="M19 16v-2h-3l-2.5-5h-4l-1 3H6l-3 2v2h19zm-18 2h20v2H1v-2zm13-7h2.5l1 2H14v-2z"/>`,
        truck: `<path d="M22 16h-1l-1-6h-8v6h-1v-4H6l-3 3v1H1v2h22v-2h-2zM4 18h16v2H4v-2z"/>`,
        dozer: `<path d="M22 18H2v2h20v-2zm-2-2l-2-6h-6l-1 2H6l-3 3v1h16zM4 15h12v1H4v-1z"/>`,
        drill: `<path d="M12 2l-2 2v10h4V4l-2-2zM7 16h10v2H7v-2z"/>`,
        loader: `<path d="M23 16l-3-5-4 1-3-4-4 3v5h14zm-21 2h20v2H2v-2z"/>`,
        grader: `<path d="M22 16l-2-4H10l-2 3-3 0-3 1v1h20zM3 18h18v2H3v-2z"/>`,
        tractor: `<path d="M20 16V11h-4l-2-4H9L7 11H4v5h16zM3 18h18v2H3v-2z"/>`,
        default: `<path d="M20 15V10l-3-4H7l-2 4v5h15zM3 18h18v2H3v-2z"/>`
      };

      let path = icons.default;
      if (s.includes('excavat')) path = icons.excavator;
      else if (s.includes('dozer') || s.includes('bulldozer')) path = icons.dozer;
      else if (s.includes('loader')) path = icons.loader;
      else if (s.includes('grader')) path = icons.grader;
      else if (s.includes('truck') || s.includes('dump') || s.includes('hauler')) path = icons.truck;
      else if (s.includes('compact') || s.includes('roller')) path = icons.dozer; // Dozer path is similar enough for roller silhouette
      else if (s.includes('drill') || s.includes('rig')) path = icons.drill;
      else if (s.includes('tractor')) path = icons.tractor;

      return `<svg viewBox="0 0 24 24" fill="white" width="28" height="28" xmlns="http://www.w3.org/2000/svg">${path}</svg>`;
    }

    function renderFleetMap(points) {
      if (!fleetMap) {
        initFleetMap();
      } else {
        // Redraw check
        const container = document.getElementById("fleet-map-container");
        if (container) container.classList.remove("hidden");
        fleetMap.invalidateSize();
      }

      if (!mapMarkersLayer) return;
      mapMarkersLayer.clearLayers();

      const statusText = document.getElementById("map-status-text");
      if (!points || points.length === 0) {
        if (statusText) statusText.textContent = "No locations found";
        return;
      }

      let validCount = 0;
      let bounds = L.latLngBounds();
      const coordCounts = {};

      points.forEach(p => {
        let lat = toNum(p.lat);
        let lng = toNum(p.lng);

        // Fallback to dummy Zimbabwe location if coords missing
        if (lat === null || lng === null) {
          // Centered around Zimbabwe core areas
          lat = -18.5 + (Math.random() - 0.5) * 4;
          lng = 30.0 + (Math.random() - 0.5) * 4;
        }

        // Apply a small jitter if multiple machines at exact same spot
        const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
        if (!coordCounts[key]) coordCounts[key] = 0;
        coordCounts[key]++;

        if (coordCounts[key] > 1) {
          lat += (Math.random() - 0.5) * 0.04;
          lng += (Math.random() - 0.5) * 0.04;
        }

        // Color overlay based on urgency
        const overlayColor = p.urgent ? '#ef4444' : '#3b82f6';
        const machineName = safeText(p.machine || "Equipment");
        const svgHtml = getMachineSVG(p.machine || p.type || "");

        // Small premium dot markers — grey=ok, red=needs attention
        const isUrgent = !!p.urgent;
        const dotSize  = isUrgent ? 18 : 12;
        const dotColor = isUrgent ? '#ef4444' : '#94a3b8';
        const dotBorder= isUrgent ? '2px solid #fff' : '1.5px solid rgba(255,255,255,0.85)';
        const dotShadow= isUrgent
          ? '0 0 0 3px rgba(239,68,68,0.25), 0 2px 6px rgba(0,0,0,0.35)'
          : '0 1px 4px rgba(0,0,0,0.28)';

        const icon = L.divIcon({
          className: '',
          html: `<div style="
            width:${dotSize}px;
            height:${dotSize}px;
            background:${dotColor};
            border:${dotBorder};
            border-radius:50%;
            box-shadow:${dotShadow};
            transform:translate(-50%,-50%);
            ${isUrgent ? 'animation:markerPulse 1.8s ease-in-out infinite;' : ''}
          "></div>`,
          iconSize:   [dotSize, dotSize],
          iconAnchor: [dotSize / 2, dotSize / 2]
        });
        const marker = L.marker([lat, lng], { icon: icon });

        // Rich premium hover tooltip
        const machineImgUrl = machineAttachmentLink(p.machine_picture);
        const accentColor   = isUrgent ? '#ef4444' : '#64748b';
        const statusLabel   = isUrgent
          ? '<span style="background:#ef4444;color:#fff;font-size:9px;font-weight:700;padding:2px 7px;border-radius:20px;letter-spacing:0.5px;">⚠ URGENT</span>'
          : '<span style="background:#dcfce7;color:#16a34a;font-size:9px;font-weight:700;padding:2px 7px;border-radius:20px;letter-spacing:0.5px;">✓ OK</span>';

        const tooltipContent = `
  <div style="
    font-family:'Inter',system-ui,sans-serif;
    min-width:260px;
    max-width:300px;
    background:#0f172a;
    border-radius:14px;
    overflow:hidden;
    box-shadow:0 20px 40px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.06);
    padding:0;
  ">
    <!-- Accent top bar -->
    <div style="height:3px;background:${accentColor};border-radius:14px 14px 0 0;"></div>

    <!-- Body -->
    <div style="display:flex;gap:12px;padding:14px 14px 12px;">

      <!-- Machine image -->
      <div style="width:64px;height:64px;flex-shrink:0;border-radius:10px;overflow:hidden;background:#1e293b;display:flex;align-items:center;justify-content:center;">
        ${renderMachineImageHtml(machineImgUrl, '64px', '10px')}
      </div>

      <!-- Info -->
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:6px;margin-bottom:4px;">
          <div style="font-weight:800;font-size:13px;color:#f1f5f9;line-height:1.3;word-break:break-word;">${machineName}</div>
          ${statusLabel}
        </div>
        <div style="font-size:11px;color:#64748b;font-weight:500;margin-bottom:10px;">${safeText(p.model || '—')}</div>

        <!-- Data rows -->
        <div style="display:flex;flex-direction:column;gap:5px;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:10px;color:#475569;font-weight:500;">Customer</span>
            <span style="font-size:10px;color:#cbd5e1;font-weight:700;">${safeText(p.customer || '—')}</span>
          </div>
          <div style="height:1px;background:rgba(255,255,255,0.05);"></div>
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:10px;color:#475569;font-weight:500;">Location</span>
            <span style="font-size:10px;color:#cbd5e1;font-weight:700;">${safeText(p.location || '—')}</span>
          </div>
        </div>
      </div>
    </div>
  </div>`;

        // Bind tooltip for hover
        marker.bindTooltip(tooltipContent, {
          permanent: false,
          sticky: true,
          direction: 'top',
          offset: [0, -8],
          className: 'custom-tooltip map-premium-tooltip'
        });

        // Click popup — premium dark card with extra detail
        const popupContent = `
  <div style="
    font-family:'Inter',system-ui,sans-serif;
    min-width:220px;
    max-width:280px;
    background:#0f172a;
    border-radius:12px;
    overflow:hidden;
    padding:0;
  ">
    <div style="height:3px;background:${accentColor};"></div>
    <div style="padding:14px;">
      <!-- Header -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid rgba(255,255,255,0.07);">
        <span style="font-weight:800;font-size:13px;color:#f1f5f9;">${machineName}</span>
        ${statusLabel}
      </div>
      <!-- Data grid -->
      <div style="display:flex;flex-direction:column;gap:7px;">
        <div style="display:flex;justify-content:space-between;">
          <span style="font-size:10px;color:#475569;">Model</span>
          <span style="font-size:10px;color:#cbd5e1;font-weight:600;">${safeText(p.model || '—')}</span>
        </div>
        <div style="display:flex;justify-content:space-between;">
          <span style="font-size:10px;color:#475569;">Customer</span>
          <span style="font-size:10px;color:#cbd5e1;font-weight:600;">${safeText(p.customer || '—')}</span>
        </div>
        <div style="display:flex;justify-content:space-between;">
          <span style="font-size:10px;color:#475569;">Location</span>
          <span style="font-size:10px;color:#cbd5e1;font-weight:600;">${safeText(p.location || '—')}</span>
        </div>
        <div style="margin-top:4px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.06);display:flex;justify-content:space-between;">
          <span style="font-size:9px;color:#334155;">Ref</span>
          <span style="font-size:9px;color:#475569;font-family:monospace;">${safeText(p.name || '—')}</span>
        </div>
      </div>
    </div>
  </div>`;

        marker.bindPopup(popupContent);
        marker.addTo(mapMarkersLayer);
        bounds.extend([lat, lng]);
        validCount++;
      });

      if (validCount > 0 && fleetMap) {
        // Zoom out a bit if we only have a few points
        fleetMap.fitBounds(bounds, { padding: [80, 80], maxZoom: 9 });
      }

      if (statusText) statusText.textContent = `${validCount} machines`;
    }

    function hitachiKickSession(reason = "") {
      try {
        if (hitachiKeeper && typeof hitachiKeeper.loadURL === "function") {
          hitachiKeeper.loadURL(HITACHI_PORTAL_URL);
        } else if (hitachiKeeper && typeof hitachiKeeper.reload === "function") {
          hitachiKeeper.reload();
        }
        if (reason) console.log("Hitachi session kick:", reason);
      } catch (e) {
        console.warn("Hitachi kick failed:", e);
      }
    }

    async function hitachiTryAutoLoginInWebview(webview) {
      if (!webview || typeof webview.executeJavaScript !== "function") return false;

      let creds = getHitachiCreds();

      const detectLoginJs = `
        (function () {
          const pwd = document.querySelector('input[type="password"],input[name*="pass" i]');
          const user =
            document.querySelector('input[type="email"]') ||
            document.querySelector('input[name*="user" i],input[name*="login" i],input[name*="id" i]') ||
            document.querySelector('input[placeholder*="id" i],input[placeholder*="email" i],input[aria-label*="id"
  i], input[aria - label*= "email" i]') ||
  document.querySelector('input[type="text"]');

          const looks = !!(pwd && user);
          const txt = (document.body && (document.body.innerText || "")) || "";
          const hasLoginWords = /login|log in|sign in|password|global e-service/i.test(txt);
          return looks || hasLoginWords;
        })();
      `;

      let looksLikeLogin = false;
      try { looksLikeLogin = !!(await webview.executeJavaScript(detectLoginJs, true)); } catch { }

      if (looksLikeLogin && !creds) {
        showToast("Hitachi login required once — please enter credentials.", "warn", 4500);
        creds = await hitachiSetCredentialsInteractive();
        if (!creds) return false;
      }
      if (!looksLikeLogin || !creds) return false;

      const loginJs = `
        (function () {
          const u = ${JSON.stringify((creds || {}).u || "")
        };
      const p = ${JSON.stringify((creds || {}).p || "")
        };

    const pwd =
      document.querySelector('input[type="password"]') ||
      document.querySelector('input[name*="pass" i]');
    if (!pwd) return { ok: false, why: "no-password-field" };

    const user =
      document.querySelector('input[type="email"]') ||
      document.querySelector('input[name*="user" i],input[name*="login" i],input[name*="id" i]') ||
      document.querySelector('input[placeholder*="id" i],input[placeholder*="email" i],input[aria-label*="id"
  i], input[aria - label*= "email" i]') ||
  document.querySelector('input[type="text"]');

    if (user) {
      user.focus();
      user.value = u;
      user.dispatchEvent(new Event('input', { bubbles: true }));
      user.dispatchEvent(new Event('change', { bubbles: true }));
    }

    pwd.focus();
    pwd.value = p;
    pwd.dispatchEvent(new Event('input', { bubbles: true }));
    pwd.dispatchEvent(new Event('change', { bubbles: true }));

    const btn =
      document.querySelector('button[type="submit"]') ||
      document.querySelector('input[type="submit"]') ||
      document.querySelector('button');

    if (btn) { btn.click(); return { ok: true, why: "clicked-submit" }; }

    const form = pwd.closest('form');
    if (form) { form.submit(); return { ok: true, why: "submitted-form" }; }

    return { ok: false, why: "no-submit" };
  }) ();
    `;

      try {
        const res = await webview.executeJavaScript(loginJs, true);
        if (res && res.ok) {
          showToast("Hitachi auto-login triggered.", "ok");
          return true;
        }
      } catch (e) {
        console.warn("Hitachi auto-login JS failed:", e);
      }
      return false;
    }

    async function hitachiInstallSniffer(webview) {
      if (!webview || typeof webview.executeJavaScript !== "function") return false;

      const snifferJs = `
      (function () {
        if (window.__omnisHitachiSnifferInstalled) return true;
        window.__omnisHitachiSnifferInstalled = true;

        window.__omnisHitachi = window.__omnisHitachi || {};
        window.__omnisHitachi.snapshot = window.__omnisHitachi.snapshot || { ts: null, fleet: null, alarms: null };
        window.__omnisHitachi._seen = window.__omnisHitachi._seen || [];

        function nowTs() { try { return Date.now(); } catch { return null; } }

        function firstArrayDeep(obj, depth) {
          depth = depth || 0;
          if (depth > 4) return null;
          if (!obj) return null;

          if (Array.isArray(obj)) {
            if (obj.length && typeof obj[0] === "object") return obj;
            for (const it of obj) {
              const r = firstArrayDeep(it, depth + 1);
              if (r) return r;
            }
            return null;
          }

          if (typeof obj === "object") {
            for (const k in obj) {
              const v = obj[k];
              if (Array.isArray(v)) {
                if (v.length && typeof v[0] === "object") return v;
                const r2 = firstArrayDeep(v, depth + 1);
                if (r2) return r2;
              } else if (typeof v === "object" && v) {
                const r3 = firstArrayDeep(v, depth + 1);
                if (r3) return r3;
              }
            }
          }
          return null;
        }

        function keyScore(keys, terms) {
          let s = 0;
          const ks = keys.map(k => String(k).toLowerCase());
          for (const t of terms) {
            const tl = String(t).toLowerCase();
            if (ks.some(k => k.includes(tl))) s += 1;
          }
          return s;
        }

        function classifyAndStore(url, data) {
          try {
            const arr = firstArrayDeep(data, 0);
            if (!arr || !arr.length) return;

            const keys = Object.keys(arr[0] || {});
            const alarmScore = keyScore(keys,
              ["alarm", "fault", "trouble", "spn", "fmi", "severity", "level", "begin", "end", "event", "code"]);
            const fleetScore = keyScore(keys,
              ["machine", "equipment", "asset", "serial", "model", "hour", "hmr", "fuel", "location", "lat", "lng", "status", "last"]);

            const u = String(url || "").toLowerCase();
            const urlAlarmHint = /alarm|fault|event|trouble/.test(u);
            const urlFleetHint = /fleet|machine|equipment|asset|status|position/.test(u);

            let bucket = null;
            if ((alarmScore >= 3) || (urlAlarmHint && alarmScore >= 2)) bucket = "alarms";
            else if ((fleetScore >= 3) || (urlFleetHint && fleetScore >= 2)) bucket = "fleet";

            if (!bucket) bucket = arr.length > 25 ? "fleet" : "alarms";

            const slim = arr.slice(0, bucket === "fleet" ? 800 : 300);
            window.__omnisHitachi.snapshot = window.__omnisHitachi.snapshot || { ts: null, fleet: null, alarms: null };
            window.__omnisHitachi.snapshot.ts = nowTs();
            if (bucket === "fleet") window.__omnisHitachi.snapshot.fleet = slim;
            if (bucket === "alarms") window.__omnisHitachi.snapshot.alarms = slim;

            window.__omnisHitachi._seen.push({ ts: nowTs(), bucket: bucket, url: String(url || "").slice(0, 180), len: arr.length });
            if (window.__omnisHitachi._seen.length > 40) window.__omnisHitachi._seen = window.__omnisHitachi._seen.slice(-40);
          } catch { }
        }

        try {
          const origFetch = window.fetch;
          if (origFetch) {
            window.fetch = async function () {
              const res = await origFetch.apply(this, arguments);
              try {
                const clone = res.clone();
                const ct = (clone.headers && clone.headers.get && clone.headers.get("content-type")) || "";
                if (String(ct).toLowerCase().includes("application/json")) {
                  const data = await clone.json();
                  classifyAndStore(res.url || "", data);
                }
              } catch { }
              return res;
            };
          }
        } catch { }

        try {
          const oOpen = XMLHttpRequest.prototype.open;
          const oSend = XMLHttpRequest.prototype.send;

          XMLHttpRequest.prototype.open = function (method, url) {
            this.__omnis_url = url;
            return oOpen.apply(this, arguments);
          };

          XMLHttpRequest.prototype.send = function () {
            this.addEventListener("load", function () {
              try {
                const ct = this.getResponseHeader("content-type") || "";
                if (String(ct).toLowerCase().includes("application/json")) {
                  const data = JSON.parse(this.responseText || "null");
                  classifyAndStore(this.responseURL || this.__omnis_url || "", data);
                }
              } catch { }
            });
            return oSend.apply(this, arguments);
          };
        } catch { }

        return true;
      })();
    `;

      try {
        return !!(await webview.executeJavaScript(snifferJs, true));
      } catch (e) {
        console.warn("Hitachi sniffer install failed:", e);
        return false;
      }
    }

    async function hitachiPullSnapshot(webview) {
      if (!webview || typeof webview.executeJavaScript !== "function") return null;
      const js = `
      (function () {
        try {
          const s = window.__omnisHitachi && window.__omnisHitachi.snapshot ? window.__omnisHitachi.snapshot : null;
          return s || null;
        } catch (e) { return null; }
      })();
    `;
      try {
        const snap = await webview.executeJavaScript(js, true);
        return snap || null;
      } catch (e) {
        console.warn("Hitachi snapshot read failed:", e);
        return null;
      }
    }

    function renderHitachiFleet(rows) {
      if (!hitachiFleetTbody) return;
      hitachiFleetTbody.innerHTML = "";

      if (!rows || !rows.length) {
        hitachiFleetTbody.innerHTML = `<tr>
      <td colspan="7" style="font-size:11px;color:#6b7280;">No Hitachi fleet data detected yet. Open portal once or press
        Refresh.</td>
  </tr>`;
        return;
      }

      rows.slice(0, 200).forEach(r => {
        const tr = document.createElement("tr");

        const machine = pickFirst(r, ["equipmentNo", "equipment_no", "machineNo", "machine_no", "assetId", "asset_id",
          "unitId", "unit_id", "machineId", "machine_id", "name", "machineName", "machine_name"]) || "—";
        const model = pickFirst(r, ["model", "modelName", "model_name", "machineModel", "machine_model", "equipmentType",
          "equipment_type", "type"]) || "—";
        const status = pickFirst(r, ["status", "machineStatus", "machine_status", "workStatus", "work_status",
          "runningStatus", "running_status", "state"]) || "—";
        const hours = toNum(pickFirst(r, ["operatingHours", "operating_hours", "hourMeter", "hour_meter", "hmr", "HMR",
          "hours", "totalHours", "total_hours"]));
        const fuel = pickFirst(r, ["fuel", "fuelLevel", "fuel_level", "fuelRemaining", "fuel_remaining", "fuelRemainRatio",
          "fuel_remain_ratio"]) || "";
        const location = pickFirst(r, ["location", "site", "siteName", "site_name", "address", "lastLocation",
          "last_location", "region"]) || "—";
        const last = pickFirst(r, ["lastUpdate", "last_update", "lastSignalTime", "last_signal_time", "updateTime",
          "update_time", "timestamp", "time", "gpsTime", "gps_time"]) || "";

        const cells = [
          safeText(machine),
          safeText(model),
          safeText(status),
          (hours != null ? hours.toFixed(1) : "—"),
          safeText(fuel) || "—",
          safeText(location),
          safeText(fmtDate(last)) || "—"
        ];

        cells.forEach((val, i) => {
          const td = document.createElement("td");
          td.textContent = val || "—";
          if (i === 3 || i === 4) td.className = "text-right";
          tr.appendChild(td);
        });

        hitachiFleetTbody.appendChild(tr);
      });
    }

    function renderHitachiAlarms(rows) {
      if (!hitachiAlarmsTbody) return;
      hitachiAlarmsTbody.innerHTML = "";

      if (!rows || !rows.length) {
        hitachiAlarmsTbody.innerHTML = `<tr>
      <td colspan="7" style="font-size:11px;color:#6b7280;">No Hitachi alarm/event data detected yet.</td>
  </tr>`;
        return;
      }

      rows.slice(0, 200).forEach(r => {
        const tr = document.createElement("tr");

        const machine = pickFirst(r, ["equipmentNo", "equipment_no", "machineNo", "machine_no", "assetId", "asset_id",
          "unitId", "unit_id", "machineId", "machine_id", "name", "machineName"]) || "—";
        const code = [
          pickFirst(r, ["troubleCode", "trouble_code", "alarmCode", "alarm_code", "code", "faultCode", "fault_code"]),
          [pickFirst(r, ["spn", "SPN"]), pickFirst(r, ["fmi", "FMI"])].filter(Boolean).join("/")
        ].filter(Boolean).join(" · ") || "—";

        const desc = pickFirst(r, ["troubleName", "trouble_name", "alarmName", "alarm_name", "name", "description", "desc",
          "message"]) || "—";
        const level = pickFirst(r, ["faultLevel", "fault_level", "level", "severity", "priority"]) || "—";
        const start = pickFirst(r, ["beginTime", "begin_time", "startTime", "start_time", "alarmTime", "alarm_time", "time",
          "timestamp"]) || "";
        const end = pickFirst(r, ["endTime", "end_time", "finishTime", "finish_time", "closeTime", "close_time"]) || "";
        const status = end ? "Closed" : "Open";

        if (!end) tr.classList.add("alarm-row");

        const cells = [
          safeText(machine),
          safeText(code),
          safeText(desc),
          safeText(level),
          safeText(fmtDate(start)) || "—",
          safeText(fmtDate(end)) || "—",
          status
        ];

        cells.forEach((val) => {
          const td = document.createElement("td");
          td.textContent = val || "—";
          tr.appendChild(td);
        });

        hitachiAlarmsTbody.appendChild(tr);
      });
    }

    async function hitachiRefreshSnapshot(reason = "") {
      if (!hitachiKeeper) {
        showToast("Hitachi webview not available.", "err", 3500);
        return;
      }

      setSyncState("syncing");
      try {
        await hitachiInstallSniffer(hitachiKeeper);
        await hitachiTryAutoLoginInWebview(hitachiKeeper);

        const snap = await hitachiPullSnapshot(hitachiKeeper);
        HITACHI_LAST_SNAPSHOT = snap;

        const fleetRows = snap && snap.fleet ? snap.fleet : null;
        const alarmRows = snap && snap.alarms ? snap.alarms : null;

        renderHitachiFleet(fleetRows || []);
        renderHitachiAlarms(alarmRows || []);

        const fleetCount = (fleetRows && fleetRows.length) ? fleetRows.length : 0;
        const alarmCount = (alarmRows && alarmRows.length) ? alarmRows.length : 0;
        const ts = snap && snap.ts ? new Date(snap.ts).toISOString().slice(0, 19).replace("T", " ") : "—";

        if (hitachiSummary) {
          hitachiSummary.innerHTML =
            `Detected <strong>${fleetCount}</strong> fleet rows and <strong>${alarmCount}</strong> alarm / event rows. ` +
            `Last capture: <strong>${ts}</strong>.`;
        }

        if (!fleetCount && !alarmCount) {
          showToast("Hitachi: no data captured yet. Opening portal to trigger API calls…", "warn", 4200);
          hitachiKickSession("No data captured");
        } else {
          showToast("Hitachi snapshot updated" + (reason ? " (" + reason + ")" : ""), "ok", 2200);
        }
      } catch (e) {
        console.error("hitachiRefreshSnapshot error:", e);
        showToast("Hitachi refresh failed.", "err", 4500);
      } finally {
        refreshOnlineState();
      }
    }

    function initHitachiSessionKeeper() {
      if (!hitachiKeeper) return;

      hitachiKeeper.addEventListener("dom-ready", async () => {
        await hitachiInstallSniffer(hitachiKeeper);
        await hitachiTryAutoLoginInWebview(hitachiKeeper);
        setTimeout(() => hitachiRefreshSnapshot("auto"), 2500);
      });

      hitachiKeeper.addEventListener("did-finish-load", async () => {
        await hitachiInstallSniffer(hitachiKeeper);
        await hitachiTryAutoLoginInWebview(hitachiKeeper);
        setTimeout(() => hitachiRefreshSnapshot("auto"), 2500);
      });

      hitachiKeeper.addEventListener("did-navigate-in-page", async () => {
        await hitachiInstallSniffer(hitachiKeeper);
        await hitachiTryAutoLoginInWebview(hitachiKeeper);
        setTimeout(() => hitachiRefreshSnapshot("auto"), 2500);
      });

      hitachiKickSession("Init");
    }

    // ---------------------------
    // ✅ Breakdown Log table renderer (module)
    // ---------------------------
    function renderBreakdownLogTable(rows) {
      if (!breakdownLogTbody) return;
      breakdownLogTbody.innerHTML = "";

      if (!rows || !rows.length) {
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = 6;
        td.style.fontSize = "11px";
        td.style.color = "#6b7280";
        td.textContent = "No breakdowns to display yet.";
        tr.appendChild(td);
        breakdownLogTbody.appendChild(tr);
        return;
      }

      rows.forEach((row, idx) => {
        const tr = document.createElement("tr");
        tr.dataset.index = String(idx);
        tr.style.cursor = "pointer";

        if (row.urgent) tr.classList.add("bd-row-urgent");
        else tr.classList.add("bd-row-open");

        const rootCause =
          row.root_cause ||
          row.rootcause ||
          row.cause ||
          row.breakdown_report ||
          row.report ||
          row.description ||
          "—";

        const statusLabel =
          row.status ||
          (row.end_date ? "Closed" : (row.urgent ? "Open · Urgent" : "Open"));

        const opened =
          row.breakdown_date ||
          row.start_date ||
          row.creation ||
          "—";

        const cells = [
          row.name || "",
          row.machine || "",
          row.customer || "",
          safeText(rootCause || "—"),
          safeText(statusLabel || "—"),
          safeText(opened || "—"),
        ];

        cells.forEach((val, i) => {
          const td = document.createElement("td");
          td.textContent = val || "—";
          if (i === 5) td.className = "text-right";
          tr.appendChild(td);
        });

        breakdownLogTbody.appendChild(tr);
      });
    }


    // ---------------------------
    // WhatsApp supervisor approval
    // ---------------------------
    async function sendBreakdownForApproval(rowOrName) {
      const name = typeof rowOrName === "string" ? rowOrName : (rowOrName && rowOrName.name) || "";
      if (!name) return;

      const machine = rowOrName && rowOrName.machine ? String(rowOrName.machine) : "";
      const customer = rowOrName && rowOrName.customer ? String(rowOrName.customer) : "";

      const ok = confirm(
        "Send this breakdown to the supervisor for WhatsApp approval?\n\n" +
        `Report: ${name} \n` +
        (machine ? `Machine: ${machine} \n` : "") +
        (customer ? `Customer: ${customer} \n` : "")
      );
      if (!ok) return;

      setSyncState("syncing");

      try {
        const url = FLEET_BASE_URL + FT_BREAKDOWN_SEND_APPROVAL_METHOD;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ name }),
        });

        const raw = await res.json().catch(() => ({}));
        if (!res.ok || raw.exc || raw.exception) {
          const msg = String(raw.exc || raw.exception || raw._server_messages || "Failed");
          showToast("Approval send failed: " + msg, "err", 4500);
          return;
        }

        showToast("Sent for approval via WhatsApp: " + name, "ok");
      } catch (e) {
        console.error("sendBreakdownForApproval error:", e);
        showToast("Approval send failed (network/endpoint).", "err", 4500);
      } finally {
        refreshOnlineState();
      }
    }

    // ---------------------------
    // Breakdown modal
    // ---------------------------
    function openBreakdownModal(row) {
      bdModalCurrent = row;
      if (bdModalOverlay) bdModalOverlay.classList.remove("hidden");

      const name = row.name || "";
      const machine = row.machine || "";
      const customer = row.customer || "";
      const ref = row.reference || "";
      const status = row.status || row.docstatus || "";
      const urgent = row.urgent ? "Yes" : "No";

      if (bdModalTitle) bdModalTitle.textContent = `Update ${name} `;
      if (bdModalBody) {
        bdModalBody.innerHTML =
          `<div><strong>Machine:</strong> ${machine || "—"}</div>` +
          `<div><strong>Customer:</strong> ${customer || "—"}</div>` +
          `<div><strong>Reference:</strong> ${ref || "—"}</div>`;
      }

      if (bdModalStatus && status) {
        Array.from(bdModalStatus.options).forEach(opt => {
          if (opt.value.toLowerCase() === status.toString().toLowerCase()) {
            bdModalStatus.value = opt.value;
          }
        });
      }

      if (bdModalLink) {
        const linkName = encodeURIComponent(name);
        bdModalLink.href = `${FLEET_BASE_URL}/app/ft-breakdown-log/${linkName}`;
      }
    }

    function closeBreakdownModal() {
      if (bdModalOverlay) bdModalOverlay.classList.add("hidden");
      bdModalCurrent = null;
    }

    // ---------------------------
    // Fleetrack KPI + breakdown list (Supabase version)
    // ---------------------------
    async function loadDashboardKpisFromSupabase() {
      setSyncState("syncing");
      try {
        const setKpi = (id, value) => {
          const el = document.getElementById(id);
          if (el) el.textContent = value != null ? value : "–";
        };

        // 1. Total Machines (Registry)
        const { count: totalMachinesRegistry, error: e1 } = await window.electron.invoke('supabase:query', {
          table: 'ft_machine', method: 'select', params: { columns: '*', count: 'exact', head: true, match: { fleetrack_managed: 1 } }
        });

        // 2. Open Breakdowns & Recent Breakdowns Table
        let openBreakdowns = [];
        let e2 = null;
        try {
          const raw = await callFrappe(FT_BREAKDOWN_DBR_METHOD, { _ts: Date.now() }, 'GET');
          if (raw && raw.message && raw.message.breakdowns) {
             openBreakdowns = raw.message.breakdowns.map(r => ({
                ...r,
                machine: r.model || r.machine,
                date: r.breakdown_date
             }));
          }
        } catch(err) {
          e2 = err;
        }
        if (!e2 && openBreakdowns) {
          FT_BREAKDOWN_ROWS_OPEN = openBreakdowns;
          FT_BREAKDOWN_ROWS_ALL = openBreakdowns; // partial, but we only strictly need open for home screen

          const urgentRows = openBreakdowns.filter(row => !!row.urgent);
          setKpi("kpi-open-breakdowns", openBreakdowns.length);
          setKpi("kpi-urgent-breakdowns", urgentRows.length);

            // Avg days open
            if (openBreakdowns.length > 0) {
              let totalDays = 0;
              let valid = 0;
              openBreakdowns.forEach(row => {
                 if (row.days_on_bd !== undefined) {
                   totalDays += (parseInt(row.days_on_bd) || 0);
                   valid++;
                 } else if (row.date || row.breakdown_date) {
                   const d = new Date(row.date || row.breakdown_date);
                   if (!isNaN(d)) { totalDays += ((new Date() - d) / (1000 * 60 * 60 * 24)); valid++; }
                 }
              });
              if (valid > 0) {
                 const avgDays = (totalDays / valid).toFixed(1);
                 const sub = document.getElementById("sub-open-breakdowns");
                 if (sub) sub.textContent = "Avg days (open): " + avgDays;
              }
            }

          const tbody = document.getElementById("tbl-recent-breakdowns");
          if (tbody) {
            tbody.innerHTML = "";
            const rowsToShow = openBreakdowns.slice(0, 10);
            if (!rowsToShow.length) {
              tbody.innerHTML = `<tr><td colspan="6" style="font-size:11px;color:#6b7280;">No open breakdowns.</td></tr>`;
            } else {
              rowsToShow.forEach((row, idx) => {
                const tr = document.createElement("tr");
                tr.dataset.index = String(idx);
                const statusLabel = row.urgent ? "Open · Urgent" : (row.status || "Open");
                if (row.urgent) tr.classList.add("bd-row-urgent");
                else tr.classList.add("bd-row-open");
                tr.innerHTML = `
                  <td>${row.name || ""}</td>
                  <td><div style="font-weight:600;">${row.machine || ""}</div><div style="font-size:10px;color:var(--text-muted);">${row.customer || ""}</div></td>
                  <td>${row.location || "—"}</td>
                  <td><span class="tag-pill" style="font-size:10px; padding:2px 6px;">${statusLabel}</span></td>
                  <td style="font-size:11px;">${row.breakdown_date || row.date || ""}</td>
                  <td><button class="tiny-btn tiny-btn-danger" onclick="sendBreakdownForApproval('${row.name}')">Approve</button></td>
                `;
                tbody.appendChild(tr);
              });
              if (openBreakdowns.length > 10) {
                  const trMore = document.createElement("tr");
                  trMore.innerHTML = `<td colspan="6" style="text-align:center; padding:10px;"><button class="tiny-btn" onclick="showView('view-reports')" style="background:#f1f5f9; color:#475569;">View all ${openBreakdowns.length} items in Reports</button></td>`;
                  tbody.appendChild(trMore);
              }
            }
          }
          renderBreakdownLogTable(openBreakdowns);
        }

        // 3. Open Defects & Active Machines
        const { data: defects, error: e3 } = await window.electron.invoke('supabase:query', {
          table: 'ft_defect', method: 'select', params: { columns: 'machine', neq: ['status', 'Closed'] }
        });
        if (!e3 && defects) {
          // Open Defects = Total open defect tickets
          setKpi("kpi-machines-defects", defects.length);

          // Active Machines = Total machines in registry - Machines that have open defects
          const uniqueMachinesWithDefects = new Set(defects.map(d => d.machine).filter(Boolean));
          if (!e1) {
             const activeMachinesCount = Math.max(0, totalMachinesRegistry - uniqueMachinesWithDefects.size);
             setKpi("kpi-active-machines", activeMachinesCount);
          }
        }

        // 4. Field Jobs Today
        const todayStr = new Date().toISOString().split('T')[0];
        const { count: jobsToday, error: e4 } = await window.electron.invoke('supabase:query', {
          table: 'ft_service_plan', method: 'select', params: { columns: '*', count: 'exact', head: true, eq: ['plan_for', todayStr] }
        });
        if (!e4) setKpi("kpi-field-jobs-today", jobsToday);

        // 5. Render FSP Calendar
        const fspContainer = document.getElementById("dashboard-fsp-container");
        if (fspContainer) {
          fspContainer.classList.remove("hidden");
          renderDashboardFsp();
        }

      } catch (e) {
        console.error("loadDashboardKpisFromSupabase error:", e);
        showToast("Dashboard KPIs failed to load.", "err", 4500);
      } finally {
        refreshOnlineState();
      }
    }

    async function loadFtBreakdownDashboard() {
      setSyncState("syncing");
      try {
        // Use callFrappe which handles IPC bridge authentication
        const raw = await callFrappe(FT_BREAKDOWN_API, {});

        if (raw.exc || raw.exception) {
          showToast("Breakdown API error.", "err", 4500);
          return;
        }

        const data = raw.message || raw || {};
        const k = data.kpis || {};
        const recent = data.recent_breakdowns || [];
        const aggregates = data.aggregates || {};

        FT_BREAKDOWN_ROWS_ALL = recent;
        FT_BREAKDOWN_ROWS_OPEN = recent.filter(row => !row.end_date);

        const urgentRows = FT_BREAKDOWN_ROWS_OPEN.filter(row => !!row.urgent);

        const setKpi = (id, value) => {
          const el = document.getElementById(id);
          if (el) el.textContent = value != null ? value : "–";
        };

        setKpi("kpi-active-machines", k.active_machines);
        setKpi("kpi-machines-defects", k.machines_with_defects);
        setKpi("kpi-open-breakdowns", FT_BREAKDOWN_ROWS_OPEN.length);
        setKpi("kpi-urgent-breakdowns", urgentRows.length);

        // -------- RENDER RECENT BREAKDOWNS --------

        if (k.avg_days_on_bd_open != null) {
          const sub = document.getElementById("sub-open-breakdowns");
          if (sub) sub.textContent = "Avg days (open): " + k.avg_days_on_bd_open;
        }

        const tbody = document.getElementById("tbl-recent-breakdowns");
        if (tbody) {
          tbody.innerHTML = "";
          // REDUCE DENSITY: Only show top 10 on home dashboard
          const rowsToShow = FT_BREAKDOWN_ROWS_OPEN.slice(0, 10);

          if (!rowsToShow.length) {
            tbody.innerHTML = `<tr><td colspan="6" style="font-size:11px;color:#6b7280;">No open breakdowns.</td></tr>`;
          } else {
            rowsToShow.forEach((row, idx) => {
              const tr = document.createElement("tr");
              tr.dataset.index = String(idx);
              const statusLabel = row.urgent ? "Open · Urgent" : (row.status || "Open");
              if (row.urgent) tr.classList.add("bd-row-urgent");
              else tr.classList.add("bd-row-open");

              tr.innerHTML = `
                <td>${row.name || ""}</td>
                <td><div style="font-weight:600;">${row.machine || ""}</div><div style="font-size:10px;color:var(--text-muted);">${row.customer || ""}</div></td>
                <td>${row.location || "—"}</td>
                <td><span class="tag-pill" style="font-size:10px; padding:2px 6px;">${statusLabel}</span></td>
                <td style="font-size:11px;">${row.breakdown_date || ""}</td>
                <td><button class="tiny-btn tiny-btn-danger" onclick="sendBreakdownForApproval('${row.name}')">Approve</button></td>
              `;
              tbody.appendChild(tr);
            });
            if (FT_BREAKDOWN_ROWS_OPEN.length > 10) {
                const trMore = document.createElement("tr");
                trMore.innerHTML = `<td colspan="6" style="text-align:center; padding:10px;"><button class="tiny-btn" onclick="showView('view-reports')" style="background:#f1f5f9; color:#475569;">View all ${FT_BREAKDOWN_ROWS_OPEN.length} items in Reports</button></td>`;
                tbody.appendChild(trMore);
            }
          }
        }

        renderBreakdownLogTable(FT_BREAKDOWN_ROWS_OPEN);

        // RENDER 2-WEEK DASHBOARD CALENDAR
        const fspContainer = document.getElementById("dashboard-fsp-container");
        if (fspContainer) {
          fspContainer.classList.remove("hidden");
          renderDashboardFsp();
        }

      } catch (e) {
        console.error("loadFtBreakdownDashboard error:", e);
        showToast("Breakdown dashboard failed.", "err", 4500);
      } finally {
        refreshOnlineState();
      }
    }


    // ---------------------------
    // Defects (unchanged)
    // ---------------------------
    function classifySeverity(row) {
      const pr = (row.priority || "").toString().trim().toLowerCase();
      const dt = (row.defect_type || "").toString().trim().toLowerCase();
      if (pr.includes("high") || dt.includes("critical")) return "critical";
      if (dt.includes("major") || pr.includes("med")) return "major";
      if (dt.includes("minor") || pr.includes("low")) return "minor";
      return "minor";
    }

    function isDefectOverdue(row) {
      const ted = row.ted || row.TED;
      const endDate = row.end_date;
      const onHold = row.on_hold === 1 || row.on_hold === "1" ||
        (row.on_hold || "").toString().toLowerCase() === "yes";

      if (onHold) return false;
      if (!ted || endDate) return false;

      try {
        const t = new Date(ted + "T00:00:00");
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return t < today;
      } catch { return false; }
    } function updateDefectFilterSummary() {
      if (!defectFilterSummary) return;
      const sevText = defectFilters.severity === "all" ? "all severities" : defectFilters.severity.charAt(0).toUpperCase() +
        defectFilters.severity.slice(1); const machineText = defectFilters.machine ? `machines containing
    "${defectFilters.machine}"` : "all machines"; const overdueText = defectFilters.overdueOnly ? "only overdue"
        : "open & closed"; defectFilterSummary.innerHTML = `Showing <strong>${sevText}</strong>,
      <strong>${machineText}</strong>, ` +
          `including <strong>${overdueText}</strong>.`;

      if (btnDefectFilterOverdue) {
        btnDefectFilterOverdue.textContent = defectFilters.overdueOnly
          ? "Show all (remove overdue filter)"
          : "Show only overdue";
      }
    }

    function applyDefectFilters(rows) {
      return rows.filter(r => {
        const sev = r._severity || classifySeverity(r);
        r._severity = sev;
        if (defectFilters.severity !== "all" && sev !== defectFilters.severity) return false;

        if (defectFilters.machine) {
          const m = (r.machine || "").toString().toLowerCase();
          if (!m.includes(defectFilters.machine.toLowerCase())) return false;
        }

        if (defectFilters.overdueOnly && !isDefectOverdue(r)) return false;
        return true;
      });
    }

    function renderDefectTable() {
      if (!defectsTbody) return;

      const rows = applyDefectFilters(FT_DEFECT_ROWS || []);
      defectsTbody.innerHTML = "";

      if (!rows.length) {
        defectsTbody.innerHTML = `<tr>
      <td colspan="6" style="font-size:11px;color:#6b7280;">No defects match the current filters.</td>
    </tr>`;
        return;
      }

      rows.forEach(r => {
        const tr = document.createElement("tr");
        const severityLabel = [
          (r.defect_type || "").toString().trim(),
          (r.priority || "").toString().trim(),
        ].filter(Boolean).join(" · ");

        const cells = [
          r.name || "",
          r.machine || "",
          severityLabel || "",
          r.status || "",
          "",
          r.start_date ? String(r.start_date) : "",
        ];

        cells.forEach((val, idx) => {
          const td = document.createElement("td");
          td.textContent = val || "";
          if (idx === 5) td.className = "text-right";
          tr.appendChild(td);
        });

        defectsTbody.appendChild(tr);
      });
    }

    async function loadFtDefectsDashboard() {
      try {
        if (!window.supabase) return;
        const { data: rows, error } = await window.supabase.from('ft_defect').select('machine, status, end_date');
        if (error) throw error;
        
        const currentDiv = window.currentDivision || 'fleetrack';
        const openDefects = (rows || []).filter(d => {
            const statusStr = (d.status || "").toLowerCase();
            const isOpen = statusStr === 'open' || (!d.end_date && statusStr !== 'closed');
            if (!isOpen) return false;
            
            let mDiv = 'fleetrack';
            const mObj = (window.MACHINES_MAP && window.MACHINES_MAP[d.machine]) || {};
            mDiv = mObj.division || 'fleetrack';
            
            if (mDiv === 'fleetrack') {
                const custLower = (d.customer || mObj.customer || '').toLowerCase();
                const modelLower = (d.model || mObj.model || '').toLowerCase();
                const oemLower = (d.oem || mObj.oem || '').toLowerCase();
                const machineLower = (d.machine || '').toLowerCase();
                
                const isSinopower = custLower.includes('sinopower') || 
                                    ['foton', 'sinotruk', 'howo', 'powerstar', 'powerseries', 'spt', 'sino', 'faw', 'shacman', 'van body', 'henred', 'triaxle', 'trailer', 'yutong', 'beaver', 'bus'].some(brand => 
                                        modelLower.includes(brand) || oemLower.includes(brand) || machineLower.includes(brand)
                                    );
                if (isSinopower) mDiv = 'sinopower';
            }
            return mDiv === currentDiv;
        });
        const uniqueMachines = new Set(openDefects.map(d => d.machine)).size;
        const el = document.getElementById("kpi-machines-defects");
        if (el) el.textContent = uniqueMachines;
      } catch (e) {
        console.error("loadFtDefectsDashboard error:", e);
        const el = document.getElementById("kpi-machines-defects");
        if (el) el.textContent = "?";
      }
    }

    // ---------------------------
    // Job Cards
    // ---------------------------
    async function loadDailyJobCards() {
      try {
        if (jobCardTbody) {
          jobCardTbody.innerHTML = '<tr><td colspan="6" style="padding:40px;text-align:center;color:#94a3b8;font-size:12px;">Loading job cards...</td></tr>';
        }

        const res = await callFrappe(FT_JOB_CARD_METHOD, {});
        const data = res.message || res || {};

        if (data.error) {
          showToast("Error loading job cards: " + data.error, "err", 5000);
          return;
        }

        renderWeeklyCalendarStrip(data.calendar || []);
        renderJobCardTable(data.jobs || []);

        if (jobCountToday) {
          jobCountToday.textContent = data.summary ? data.summary.today : 0;
        }

        // Update Job Card KPIs
        if (data.summary) {
          const s = data.summary;
          const statTotal = document.getElementById("jc-stat-total");
          const statOpen = document.getElementById("jc-stat-open");
          const statParts = document.getElementById("jc-stat-parts");
          const statToday = document.getElementById("jc-stat-today");

          if (statTotal) statTotal.textContent = s.total || 0;
          if (statOpen) statOpen.textContent = s.open || 0;
          if (statParts) statParts.textContent = s.awaiting_parts || 0;
          if (statToday) statToday.textContent = s.completed_today || 0;
        }

        // Also update the main dashboard KPI
        const mainKpi = document.getElementById("kpi-field-jobs-today");
        if (mainKpi) {
          mainKpi.textContent = data.summary ? data.summary.today : 0;
        }
      } catch (e) {
        console.error("loadDailyJobCards error:", e);
        showToast("Failed to load job cards.", "err");
      }
    }

    // --- Job Card Detail Modal Logic ---
    let currentJcName = null;

    async function openJobCardDetail(name) {
      if (!name) return;
      const overlay = document.getElementById("jc-modal-overlay");
      overlay.classList.remove("hidden");

      // Reset fields to loading state
      document.getElementById("jc-modal-id").textContent = "Loading " + name + "...";

      try {
        const method = "/api/method/mxg_fleet_track.omnis_dashboard.ft_jobcard_dashboard.get_job_card_detail";
        const res = await callFrappe(method, { name: name });
        const doc = res.message || {};

        if (doc.error) {
          showToast(doc.error, "err");
          closeJobCardModal();
          return;
        }

        renderJobCardModal(doc);
      } catch (e) {
        console.error("openJobCardDetail error:", e);
        showToast("Failed to fetch job card details.", "err");
        closeJobCardModal();
      }
    }

    function renderJobCardModal(doc) {
      currentJcName = doc.name;
      document.getElementById("jc-modal-id").textContent = doc.name || "";

      // Populate Read-only Fields
      document.getElementById("jc-val-machine").textContent = (doc.machine_make || "") + (doc.vin_number ? " / " + doc.vin_number : "");
      document.getElementById("jc-val-model").textContent = doc.model || "-";
      document.getElementById("jc-val-vin").textContent = doc.vin_number || "-";
      document.getElementById("jc-val-customer").textContent = doc.customer_name || "-";
      document.getElementById("jc-val-site").textContent = doc.site__location || "-";
      document.getElementById("jc-val-jobno").textContent = doc.job_no || "-";
      document.getElementById("jc-val-custref").textContent = doc.customer_ref || "-";
      document.getElementById("jc-val-hmr").textContent = doc.hmr || "-";
      document.getElementById("jc-val-lastservice").textContent = doc.last_service || "-";

      // Populate Editable Inputs
      document.getElementById("jc-input-description").value = doc.job_description || "";
      document.getElementById("jc-input-failure").value = doc.causes_of_failure || "";
      document.getElementById("jc-input-remedy").value = doc.remedy__details_of_workdone || "";

      document.getElementById("jc-input-technician").value = doc.technician || "";
      document.getElementById("jc-input-vehicle").value = doc.vehicle_registration || "";

      // Render Parts Table
      const partsBody = document.getElementById("jc-tbl-parts");
      if (doc.parts && doc.parts.length > 0) {
        partsBody.innerHTML = doc.parts.map(p => `
          <tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:8px;">${p.part_no || "-"}</td>
            <td style="padding:8px;">${p.description || "-"}</td>
            <td style="padding:8px; text-align:right;">${p.quantity || 0}</td>
          </tr>
        `).join("");
      } else {
        partsBody.innerHTML = '<tr><td colspan="3" style="padding:12px; text-align:center; color:#94a3b8;">No parts recorded.</td></tr>';
      }

      // Render Defects Table
      const defectsBody = document.getElementById("jc-tbl-defects");
      if (doc.job_items && doc.job_items.length > 0) {
        defectsBody.innerHTML = doc.job_items.map(d => `
          <tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:8px;">${d.description || "-"}</td>
            <td style="padding:8px;"><span class="tag-pill">${d.defect_type || "Minor"}</span></td>
            <td style="padding:8px;">${d.priority || "-"}</td>
            <td style="padding:8px;">${d.solution || "-"}</td>
          </tr>
        `).join("");
      } else {
        defectsBody.innerHTML = '<tr><td colspan="4" style="padding:12px; text-align:center; color:#94a3b8;">No defects recorded.</td></tr>';
      }
    }

    function closeJobCardModal() {
      document.getElementById("jc-modal-overlay").classList.add("hidden");
      currentJcName = null;
    }

    async function saveJobCardDetail() {
      if (!currentJcName) return;

      const saveBtn = document.getElementById("jc-modal-save");
      const originalText = saveBtn.textContent;
      saveBtn.disabled = true;
      saveBtn.textContent = "Saving...";

      const data = {
        name: currentJcName,
        job_description: document.getElementById("jc-input-description").value,
        causes_of_failure: document.getElementById("jc-input-failure").value,
        remedy__details_of_workdone: document.getElementById("jc-input-remedy").value,
        technician: document.getElementById("jc-input-technician").value,
        vehicle_registration: document.getElementById("jc-input-vehicle").value
      };

      try {
        const method = "/api/method/mxg_fleet_track.omnis_dashboard.ft_jobcard_dashboard.save_job_card_detail";
        const res = await callFrappe(method, { doc_json: JSON.stringify(data) });

        if (res.error) {
          showToast("Save failed: " + res.error, "err");
        } else {
          showToast("Job Card saved successfully!", "success");
          closeJobCardModal();
          loadDailyJobCards(); // Refresh the list
        }
      } catch (e) {
        console.error("saveJobCardDetail error:", e);
        showToast("An error occurred while saving.", "err");
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = originalText;
      }
    }

    function renderWeeklyCalendarStrip(days) {
      if (!jobCalendarStrip) return;
      jobCalendarStrip.innerHTML = "";

      days.forEach(d => {
        const div = document.createElement("div");
        div.className = "calendar-day" + (d.is_today ? " today" : "");

        div.innerHTML = `
          <div class="calendar-day-label">${d.label}</div>
          <div class="calendar-day-num">${d.day}</div>
          <div class="calendar-day-count">${d.count > 0 ? d.count + ' jobs' : '—'}</div>
        `;
        jobCalendarStrip.appendChild(div);
      });
    }

    function renderJobCardTable(jobs) {
      if (!jobCardTbody) return;
      jobCardTbody.innerHTML = "";

      if (!jobs || jobs.length === 0) {
        jobCardTbody.innerHTML = '<tr><td colspan="6" style="padding:40px;text-align:center;color:#94a3b8;font-size:12px;">No job cards found.</td></tr>';
        return;
      }

      jobs.forEach(j => {
        const tr = document.createElement("tr");
        tr.style.borderBottom = "1px solid #e5e7f0";
        tr.style.cursor = "pointer";

        const dateStr = j.creation ? j.creation.split(".")[0] : "—";
        // machine_make (from list) and model (from list)
        const machine = [j.machine_make, j.model, j.vin_number].filter(Boolean).join(" ");

        // Status fallback: workflow_state -> docstatus -> "Submitted/Draft"
        let statusText = j.workflow_state || j.status || "";
        if (!statusText) {
          if (j.docstatus === 1) statusText = "Submitted";
          else if (j.docstatus === 2) statusText = "Cancelled";
          else statusText = "Draft";
        }

        const cells = [
          j.name || "—",
          j.customer_name || "—",
          machine || "—",
          j.technician || "—",
          statusText,
          dateStr
        ];

        cells.forEach((val, i) => {
          const td = document.createElement("td");
          td.style.padding = "10px 8px";
          td.textContent = val;
          tr.appendChild(td);
        });

        tr.onclick = () => openJobCardDetail(j.name);
        jobCardTbody.appendChild(tr);
      });
    }

    // --- Job Card Creation Logic ---
    window.triggerJCCreationModal = function () {
      const overlay = document.getElementById("jc-create-modal-overlay");
      if (overlay) overlay.classList.remove("hidden");

      // Reset fields
      const input = document.getElementById("jc-create-machine-search");
      if (input) {
        input.value = "";
        input.dataset.selectedName = "";
      }
      const techInput = document.getElementById("jc-create-technician");
      if (techInput) techInput.value = "";

      const hmrInput = document.getElementById("jc-create-hmr");
      if (hmrInput) hmrInput.value = "";

      const descInput = document.getElementById("jc-create-description");
      if (descInput) descInput.value = "";

      const dropdown = document.getElementById("jc-create-machine-dropdown");
      if (dropdown) dropdown.classList.add("hidden");
    }

    function closeNewJobCardModal() {
      const overlay = document.getElementById("jc-create-modal-overlay");
      if (overlay) overlay.classList.add("hidden");
    }

    async function submitNewJobCard() {
      const input = document.getElementById("jc-create-machine-search");
      const machine = input?.dataset?.selectedName; // Must be selected from list
      const technician = document.getElementById("jc-create-technician")?.value;
      const hmr = document.getElementById("jc-create-hmr")?.value;
      const job_description = document.getElementById("jc-create-description")?.value;

      if (!machine) { showToast("Please select a machine from the dropdown", "err"); return; }
      if (!job_description) { showToast("Please enter a job description", "err"); return; }

      const btn = document.getElementById("jc-create-submit");
      const originalText = btn ? btn.textContent : "Create Job Card";
      if (btn) {
        btn.disabled = true;
        btn.textContent = "Creating...";
      }

      try {
        const method = "/api/method/mxg_fleet_track.omnis_dashboard.ft_jobcard_dashboard.create_ft_job_card";
        const res = await callFrappe(method, {
          machine, job_description, technician, hmr
        });

        if (res.error) {
          showToast("Failed to create Job Card: " + res.error, "err");
        } else {
          showToast("Job Card Created!", "success");
          closeNewJobCardModal();
          loadDailyJobCards(); // Refresh list
        }
      } catch (e) {
        console.error("submitNewJobCard error:", e);
        showToast("An error occurred during creation.", "err");
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.textContent = originalText;
        }
      }
    }

    // Initialize Job Card Machine Search
    (function initJobCardMachineSearch() {
      const input = document.getElementById("jc-create-machine-search");
      const dropdown = document.getElementById("jc-create-machine-dropdown");

      if (!input || !dropdown) return;

      // Force load on focus if empty
      input.addEventListener("focus", async () => {
        if (!window.MACHINES_MAP || Object.keys(window.MACHINES_MAP).length === 0) {
          showToast("Fetching machine list...", "info", 1500);
          if (typeof loadFtMachineRegister === "function") {
            await loadFtMachineRegister();
          }
        }
      });

      input.addEventListener("input", function () {
        const q = this.value.trim().toLowerCase();
        if (!q) {
          dropdown.classList.add("hidden");
          return;
        }

        if (!window.MACHINES_MAP) {
          dropdown.innerHTML = '<li style="padding:10px; color:#94a3b8;">Loading data...</li>';
          dropdown.classList.remove("hidden");
          return;
        }

        const matches = Object.values(window.MACHINES_MAP).filter(m => {
          const hay = [m.model, m.sn, m.name, m.fleet_no, m.mxg_fleet_no].map(s => (s || "").toLowerCase()).join(" ");
          // Debug specific searches
          // if (q.includes("66")) console.log("Checking match for", q, "against", hay, "Result:", hay.includes(q));
          return hay.includes(q);
        }).slice(0, 10);

        console.log(`[JobCard] Search '${q}' found ${matches.length} matches.`);

        dropdown.innerHTML = "";
        dropdown.classList.remove("hidden");

        if (matches.length === 0) {
          dropdown.innerHTML = '<li style="padding:10px; color:#94a3b8;">No machines found</li>';
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
          li.onclick = () => {
            input.value = `${m.model} - ${m.sn}`;
            input.dataset.selectedName = m.name;
            dropdown.classList.add("hidden");

            // Auto-fill other fields
            const custInput = document.getElementById("jc-val-customer"); // Wait, these are currently read-only divs in the detail modal, but this is creation modal.
            // Creation modal doesn't show customer/site inputs to user, but backend auto-fetches them.
            // DO NOTHING here as backend handles it.
          };
          li.onmouseenter = () => li.style.background = "#f1f5f9";
          li.onmouseleave = () => li.style.background = "white";
          dropdown.appendChild(li);
        });
      });

      // Close dropdown on click outside
      document.addEventListener("click", (e) => {
        if (!input.contains(e.target) && !dropdown.contains(e.target)) {
          dropdown.classList.add("hidden");
        }
      });
    })();

    // ---------------------------
    // ✅ Machine Register (Region split) + Machine detail
    // ---------------------------
    function groupMachinesByRegion(rows) {
      const map = {};
      rows.forEach(r => {
        const region = safeText(r.region || "Unassigned").trim() || "Unassigned";
        if (!map[region]) map[region] = [];
        map[region].push(r);
      });
      const regions = Object.keys(map).sort((a, b) => a.localeCompare(b));
      return { map, regions };
    }

    function renderMachineRegisterByRegion(rows, query) {
      if (!machineRegionWrap) return;

      const q = normalizeStr(query || "");
      const filtered = !q ? rows : rows.filter(r => {
        const hay = [
          r.name, r.model, r.oem, r.type, r.customer,
          r.mxg_fleet_no, r.fleet_no, r.sn, r.esn,
          r.location, r.region
        ].map(normalizeStr).join(" ");
        return hay.includes(q);
      });

      if (machineFilterSummary) {
        machineFilterSummary.innerHTML =
          `Showing <strong>${filtered.length}</strong> of <strong>${rows.length}</strong> machines. Grouped by <strong>Region</strong>.`;
      }

      machineRegionWrap.innerHTML = "";

      const { map, regions } = groupMachinesByRegion(filtered);
      if (!regions.length) {
        machineRegionWrap.innerHTML = `<div style="font-size:12px;color:#6b7280;">No machines match your search.</div>`;
        return;
      }

      regions.forEach(region => {
        const list = (map[region] || []).slice().sort((a, b) => safeText(a.name).localeCompare(safeText(b.name)));

        const section = document.createElement("div");
        section.style.background = "#ffffff";
        section.style.border = "1px solid #e5e7f0";
        section.style.borderRadius = "14px";
        section.style.overflow = "hidden";

        const header = document.createElement("div");
        header.style.display = "flex";
        header.style.alignItems = "center";
        header.style.justifyContent = "space-between";
        header.style.padding = "10px 12px";
        header.style.cursor = "pointer";

        const left = document.createElement("div");
        left.innerHTML =
          `<div style="font-size:12px;font-weight:700;">${region}</div>` +
          `<div style="font-size:11px;color:#6b7280;">${list.length} machine(s)</div>`;

        const chev = document.createElement("div");
        chev.className = "region-chevron";
        chev.style.color = "#6b7280";
        chev.textContent = "▾";

        header.appendChild(left);
        header.appendChild(chev);

        const body = document.createElement("div");
        body.className = "region-body";
        body.dataset.open = "1";

        // This old region-based logic is deprecated by Card View
        // keeping empty body just in case
        body.innerHTML = '<div style="padding:20px; color:#94a3b8; font-style:italic;">Use Grid View</div>';

        // Grid Container
        // const grid = document.createElement("div");
        // grid.style.display = "grid";
        // grid.style.gridTemplateColumns = "repeat(auto-fill, minmax(360px, 1fr))"; // Responsive cards
        // grid.style.gap = "16px";
        // grid.style.padding = "16px";
        // grid.style.background = "#f8fafc";

        // list.forEach(r => {
        //   const card = document.createElement("div");
        //   card.className = "mr-card hover-lift";
        //   card.style.background = "#ffffff";
        //   card.style.border = "1px solid #e2e8f0";
        //   card.style.borderRadius = "12px";
        //   card.style.padding = "12px";
        //   card.style.display = "flex";
        //   card.style.gap = "14px";
        //   card.style.cursor = "pointer";
        //   card.style.transition = "all 0.2s ease";
        //   card.style.position = "relative";

        //   // Warranty highlight
        //   if ((r.warranty_status || "").toLowerCase().includes("under")) {
        //     card.style.borderLeft = "4px solid #10b981"; // Green indicator
        //     card.style.background = "linear-gradient(to right, #ecfdf5, #ffffff 40%)";
        //   }

        //   card.onmouseenter = () => {
        //     card.style.borderColor = "#94a3b8";
        //     card.style.boxShadow = "0 10px 15px -3px rgba(0,0,0,0.1)";
        //     card.style.transform = "translateY(-2px)";
        //   };
        //   card.onmouseleave = () => {
        //     card.style.borderColor = "#e2e8f0";
        //     card.style.boxShadow = "none";
        //     card.style.transform = "none";
        //   };

        //   // Image
        //   const imgUrl = r.machine_picture || "";
        //   const imgDiv = document.createElement("div");
        //   imgDiv.style.flexShrink = "0";

        //   if (imgUrl) {
        //     imgDiv.innerHTML = renderMachineImageHtml(imgUrl, '80px', '8px');
        //   } else {
        //     imgDiv.innerHTML = renderMachineImageHtml('', '80px', '8px');
        //   }

        //   // Details Column
        //   const details = document.createElement("div");
        //   details.style.flex = "1";
        //   details.style.display = "flex";
        //   details.style.flexDirection = "column";
        //   details.style.gap = "2px";

        //   details.innerHTML = `
        //     <div style="display:flex; justify-content:space-between; align-items:start;">
        //       <div style="font-size:14px; font-weight:700; color:#1e293b; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
        //          ${title}
        //       </div>
        //       ${r.type ? `<span class="tag-pill" style="font-size:9px;">${safeText(r.type)}</span>` : ''}
        //     </div>

        //     <div style="font-size:12px; font-weight:600; color:#3b82f6; margin-bottom:4px;">
        //       ${safeText(r.customer || "Unassigned Customer")}
        //     </div>

        //     <div style="font-size:11px; color:#64748b; display:flex; flex-wrap:wrap; gap:6px; align-items:center;">
        //        <span style="background:#f1f5f9; padding:2px 6px; border-radius:4px;">${model}</span>
        //        <span>•</span>
        //        <span>SN: ${safeText(r.sn || "-")}</span>
        //     </div>

        //     <div style="margin-top:auto; padding-top:8px; border-top:1px solid #f1f5f9; display:flex; justify-content:space-between; align-items:center; font-size:10px; color:#475569;">
        //        <div style="display:flex; align-items:center; gap:4px;">
        //          <span>📍 ${safeText(r.location || "Unknown")}</span>
        //        </div>
        //        <div style="font-weight:600;">
        //          HMR: ${r.current_hmr != null ? Number(r.current_hmr).toFixed(1) : "—"}
        //        </div>
        //     </div>
        //   `;

        //   card.appendChild(imgDiv);
        //   card.appendChild(details);

        //   card.onclick = () => openMachineModal(r.name);
        //   grid.appendChild(card);
        // });

        // body.appendChild(grid);
        section.appendChild(header);
        section.appendChild(body);

        header.addEventListener("click", () => {
          const open = body.dataset.open === "1";
          body.dataset.open = open ? "0" : "1";
          body.style.display = open ? "none" : "block";
          chev.textContent = open ? "▸" : "▾";
        });

        machineRegionWrap.appendChild(section);
      });
    }

    // ---------------------------
    // 🚜 Machine Card Rendering & Pagination
    // ---------------------------
    let MR_PAGE_SIZE = 100;
    let MR_CURRENT_COUNT = 0;
    let MR_FILTERED_ROWS = []; // To keep track of current filtered set

    function renderMachineRegisterCards(rows, reset = false) {
      const grid = document.getElementById("mr-grid-container");
      const loadMoreBtn = document.getElementById("mr-pagination-controls");
      const loadingState = document.getElementById("mr-loading-state");

      if (!grid) return;

      if (reset) {
        grid.style.display = "block";
        grid.style.gridTemplateColumns = "none";
        grid.innerHTML = `
          <div style="overflow-x:auto;">
            <table id="mr-table" style="width:100%;border-collapse:collapse;font-size:10px;table-layout:auto;border:1px solid #e5e7f0;background:#fff;">
              <thead>
                <tr style="background:#f02510;color:#ffffff !important;">
                  <th style="padding:10px 8px;text-align:center;font-weight:700;color:#ffffff !important;border-bottom:2px solid #ef4444;width:36px;">#</th>
                  <th style="padding:10px 16px;text-align:left;font-weight:700;color:#ffffff !important;border-bottom:2px solid #ef4444;width:140px;">CUSTOMER</th>
                  <th style="padding:10px 16px;text-align:center;font-weight:700;color:#ffffff !important;border-bottom:2px solid #ef4444;width:60px;">IMG</th>
                  <th style="padding:10px 16px;text-align:left;font-weight:700;color:#ffffff !important;border-bottom:2px solid #ef4444;width:160px;"><span class="term-machine" style="text-transform:uppercase;">MACHINE</span></th>
                  <th style="padding:10px 16px;text-align:left;font-weight:700;color:#ffffff !important;border-bottom:2px solid #ef4444;width:240px;">SERVICE SCHEDULING</th>
                  <th style="padding:10px 16px;text-align:right;font-weight:700;color:#ffffff !important;border-bottom:2px solid #ef4444;width:120px;">CONDITION</th>
                </tr>
              </thead>
              <tbody id="mr-tbody">
              </tbody>
            </table>
          </div>
        `;

        MR_CURRENT_COUNT = 0;
        MR_FILTERED_ROWS = rows || [];
        if (loadingState) loadingState.classList.add("hidden");
      }

      const total = MR_FILTERED_ROWS.length;
      if (total === 0) {
        grid.innerHTML = `<div style="grid-column:1/-1; padding:40px; text-align:center; color:#64748b;">No machines found.</div>`;
        if (loadMoreBtn) loadMoreBtn.classList.add("hidden");
        return;
      }

      const tbody = document.getElementById("mr-tbody");
      if (!tbody) return;

      // Slice batch
      const start = MR_CURRENT_COUNT;
      const end = Math.min(start + MR_PAGE_SIZE, total);
      const batch = MR_FILTERED_ROWS.slice(start, end);

      const commonTdStyle = "padding:12px 16px; vertical-align: top; word-wrap: break-word; overflow-wrap: break-word; white-space: normal; border-bottom: 1px solid #e5e7eb;";

      // Compute rowspans for customer bundling if grouping is enabled
      const groupCustCheck = document.getElementById("mr-filter-group-cust");
      const grouping = groupCustCheck ? groupCustCheck.checked : true;
      const customerRowSpans = {};
      
      if (grouping) {
        let i = 0;
        while (i < batch.length) {
          const cust = batch[i].customer || "Unassigned";
          let count = 1;
          for (let j = i + 1; j < batch.length; j++) {
            if ((batch[j].customer || "Unassigned") === cust) {
              count++;
            } else {
              break;
            }
          }
          customerRowSpans[i] = count;
          for (let k = i + 1; k < i + count; k++) {
            customerRowSpans[k] = 0;
          }
          i += count;
        }
      }

      batch.forEach((r, idx) => {
        const tr = document.createElement("tr");
        // Row pointer removed; moved to specific column
        tr.onmouseenter = () => tr.style.background = "#f8fafc";
        tr.onmouseleave = () => tr.style.background = "transparent";

        // --- UI Setup & Service Math ---
        
        // 1. +FSP Action Ribbon (Image Column)
        let ribbonHtml = "";
        let isOverdue = false;
        let isDue = false;
        
        let hrsRemaining = r.hours_remaining_to_service;
        // Fallback calculation if API doesn't compute it
        if (hrsRemaining == null && r.next_service_hmr != null && r.current_hmr != null) {
          hrsRemaining = Number(r.next_service_hmr) - Number(r.current_hmr);
        }

        if (hrsRemaining != null) {
          if (hrsRemaining < 0) {
            isOverdue = true;
          } else if (hrsRemaining <= 50) {
            isDue = true;
          }
          
          if (isOverdue || isDue) {
            ribbonHtml = `
              <div onclick="event.stopPropagation(); addToServicePlan('${safeText(r.name)}')" 
                   style="position:absolute; right:0; top:0; bottom:0; width:22px; background:#ef4444; color:white; font-size:10px; font-weight:800; display:flex; align-items:center; justify-content:center; writing-mode:vertical-rl; transform:rotate(180deg); letter-spacing:1px; cursor:pointer; box-shadow:-2px 0 4px rgba(0,0,0,0.1); transition:background 0.2s;"
                   onmouseover="this.style.background='#dc2626'"
                   onmouseout="this.style.background='#ef4444'"
                   title="Add to Service Plan">
                +FSP
              </div>
            `;
          }
        }

        if (isOverdue) {
           tr.style.background = "#fff1f2";
           tr.onmouseleave = () => tr.style.background = "#fff1f2";
        }

        // --- Column 1: Image ---
        const imgUrl = machineAttachmentLink(r.machine_picture);
        let colImage = `<td style="${commonTdStyle}text-align:center;vertical-align:middle;">${renderMachineImageHtml(imgUrl, '60px', '6px')}</td>`;

        // --- Column 2: Customer ---
        let colCustomer = "";
        const customer = safeText(r.customer || "Unassigned");
        
        if (grouping) {
            if (customerRowSpans[idx] > 0) {
                // Render the unified customer column cell once per group 
                colCustomer = `<td rowspan="${customerRowSpans[idx]}" style="padding:12px 16px; vertical-align:middle; background:#f8fafc; word-wrap:break-word; border-bottom:1px solid #e5e7eb;"><div style="font-weight:800;color:#0f172a;font-size:11px;line-height:1.2;">${customer}</div><div style="font-size:9px; color:#64748b; margin-top:4px; font-weight:600;">${customerRowSpans[idx]} Machines</div></td>`;
            } // Else omit entirely
        } else {
            colCustomer = `<td style="${commonTdStyle}"><div style="font-weight:800;color:#0f172a;font-size:11px;line-height:1.2;">${customer}</div></td>`;
        }

        // --- Column 3: Machine ---
        let model = safeText(r.model || "");
        let sn = safeText(r.sn || "-");
        let fleetNo = safeText(r.mxg_fleet_no || r.fleet_no || "-");
        let region = safeText(r.region || "");
        let machineHtml = `<div style="font-weight:700;color:#0f172a;margin-bottom:4px;font-size:11px;">${safeText(r.name)}</div>`;
        if (model) machineHtml += `<div style="font-size:9px;color:var(--text-muted);">Model: <strong>${model}</strong></div>`;
        if (sn !== "-") machineHtml += `<div style="font-size:9px;color:var(--text-muted);">SN: ${sn}</div>`;
        if (fleetNo !== "-") machineHtml += `<div style="font-size:9px;color:var(--text-muted);">Fleet: <strong>${fleetNo}</strong></div>`;
        if (region) machineHtml += `<div style="font-size:9px;color:var(--text-muted);">Region: ${region}</div>`;
        let colMachine = `<td class="mr-machine-link" data-machine-name="${String(r.name).replace(/"/g, '&quot;')}" style="${commonTdStyle}cursor:pointer;">${machineHtml}</td>`;

        // --- Column 4: Service Scheduling ---
        let metricSuffix = (r.service_tracking_metric === 'Mileage' || r.service_tracking_metric === 'Kilometers') ? 'KM' : 'HRS';
        let metricSuffixLower = metricSuffix.toLowerCase();
        
        let schedHtml = "";
        
        let obligation = safeText(r.service_obligation || "Not Specified");
        let obColor = obligation === "MXG" ? "color:#2563eb;" : obligation === "Customer" ? "color:#059669;" : "color:#64748b;";
        schedHtml += `<div style="font-size:9px; margin-bottom:6px;"><strong style="color:#475569;">Obligation:</strong> <span style="font-weight:700;${obColor}">${obligation}</span></div>`;
        
        let interval = r.service_interval_hours ? Number(r.service_interval_hours) : "—";
        let lastHmr = r.last_service_hmr != null ? Number(r.last_service_hmr).toFixed(0) : "—";
        let lastType = safeText(r.last_service_type || "");
        let lastDate = r.last_service_date ? formatDateDA(r.last_service_date) : "—";
        
        let nextHmr = r.next_service_hmr != null ? Number(r.next_service_hmr).toFixed(0) : "—";
        let nextType = safeText(r.next_service_type || "");
        
        schedHtml += `<div style="font-size:9px;color:#475569;display:flex;flex-direction:column;gap:6px;margin-bottom:8px;margin-top:4px;">`;
        schedHtml += `  <div style="display:flex; justify-content:space-between; align-items:baseline;">
                          <span>Last Serviced:</span>
                          <div style="flex-grow:1; border-bottom:1px dotted #cbd5e1; margin:0 8px;"></div>
                          <span style="font-weight:600;color:#0f172a;">${lastHmr} ${metricSuffix} <span style="color:#94a3b8;">(${lastDate})</span></span>
                        </div>`;
        schedHtml += `  <div style="display:flex; justify-content:space-between; align-items:baseline;">
                          <span>Next Service (${interval}H interval):</span>
                          <div style="flex-grow:1; border-bottom:1px dotted #cbd5e1; margin:0 8px;"></div>
                          <span style="font-weight:600;color:#0f172a;">${nextHmr} ${metricSuffix} ${nextType ? '('+nextType+'H)' : ''}</span>
                        </div>`;
        schedHtml += `</div>`;
        
        if (hrsRemaining != null) {
          if (isOverdue) {
            schedHtml += `<div style="font-size:9px; font-weight:800; background:#fee2e2; color:#ef4444; padding:4px 8px; border-radius:4px; display:inline-block;">⚠ OVERDUE BY ${Math.abs(hrsRemaining).toFixed(0)} ${metricSuffix}</div>`;
          } else if (isDue) {
            schedHtml += `<div style="font-size:9px; font-weight:800; background:#fef3c7; color:#d97706; padding:4px 8px; border-radius:4px; display:inline-block;">⚠ DUE IN ${Number(hrsRemaining).toFixed(0)} ${metricSuffix}</div>`;
          } else {
            schedHtml += `<div style="font-size:9px; font-weight:700; color:#10b981; padding:2px 0;">${Number(hrsRemaining).toFixed(0)} ${metricSuffixLower} remaining</div>`;
          }
        } else {
            schedHtml += `<div style="font-size:9px; font-weight:600; color:#94a3b8; font-style:italic;">No schedule data</div>`;
        }

        let colSched = `<td style="${commonTdStyle}">${schedHtml}</td>`;

        // --- Column 5: Condition ---
        let currentHmr = r.current_hmr != null ? Number(r.current_hmr).toFixed(0) : "—";
        let runStatus = safeText(r.working_status || r.machine_status || "—");
        let wtyStatus = safeText(r.warranty_status || "");

        // Container to align everything to the right
        let condHtml = `<div style="display:flex; flex-direction:column; align-items:flex-end;">`;

        condHtml += `<div class="mr-hmr-trigger"
                          data-machine-name="${String(r.name).replace(/"/g, '&quot;').replace(/'/g, '&#39;')}"
                          onclick="event.stopPropagation();"
                          style="font-weight:900;color:#2563eb;font-size:14px; margin-bottom:2px; display:flex; align-items:flex-end; gap:4px; line-height:1; cursor:pointer; position:relative; z-index:10; pointer-events:auto !important;"
                          onmouseover="this.style.textDecoration='underline'; this.style.color='#1d4ed8';"
                          onmouseout="this.style.textDecoration='none'; this.style.color='#2563eb';"
                          title="Click to update HMR"
                        >
                          ${currentHmr} <span style="font-size:8px;font-weight:700;color:#64748b;background:#f1f5f9;padding:2px 4px;border-radius:4px;margin-bottom:2px; pointer-events:none;">${metricSuffix}</span>
                        </div>`;
        
        let hmrDate = r.modified ? formatDateDA(r.modified.split(" ")[0]) : "Unknown";
        condHtml += `<div style="font-size:8px; color:#94a3b8; font-weight:600; margin-bottom:8px;">Updated: ${hmrDate}</div>`;
        
        if (runStatus !== "—") {
           let statusBadgeColor = runStatus.toLowerCase().includes("active") ? "color:#16a34a;" : runStatus.toLowerCase().includes("maintenance") ? "color:#ea580c;" : "color:#64748b;";
           condHtml += `<div style="font-size:9px; font-weight:700; margin-bottom:4px; ${statusBadgeColor} text-align:right;">${runStatus}</div>`;
        }
        
        if (wtyStatus.toLowerCase().includes("under")) {
           condHtml += `<div style="font-size:8px;background:#d1fae5;color:#059669;padding:2px 6px;border-radius:4px;display:inline-block;font-weight:700;">✓ In Warranty</div>`;
        } else if (wtyStatus === "Out of Warranty") {
           condHtml += `<div style="font-size:8px;background:#f1f5f9;color:#64748b;padding:2px 6px;border-radius:4px;display:inline-block;font-weight:600;">Out of Warranty</div>`;
        }
        
        condHtml += `</div>`;

        // Inject right-padded position for condition column if ribbon exists
        let pr = (isOverdue || isDue) ? "padding-right: 32px;" : "";
        let colCond = `<td style="${commonTdStyle}text-align:right;position:relative;${pr}">${ribbonHtml}${condHtml}</td>`;

        // Output TR
        const rowNum = start + idx + 1;
        const colNum = `<td style="padding:10px 8px; text-align:center; vertical-align:middle; color:#64748b; font-size:10px; font-weight:800; border-bottom:1px solid #e5e7eb; white-space:nowrap;">${rowNum}</td>`;
        tr.innerHTML = colNum + colCustomer + colImage + colMachine + colSched + colCond;
        
        tbody.appendChild(tr);
      });
      
      // DELEGATED EVENT LISTENER FOR MACHINE CLICKS (High Reliability)
      if (tbody && !tbody._hasMachineListener) {
        tbody.addEventListener("click", (e) => {
          const trigger = e.target.closest(".mr-machine-link");
          if (trigger) {
            const machineName = trigger.getAttribute("data-machine-name");
            console.log("[MachineModal] Click detected via delegation for:", machineName);
            if (window.openMachineModal) window.openMachineModal(machineName);
          }
        });
        tbody._hasMachineListener = true;
      }

      MR_CURRENT_COUNT = end;

      // Update Load More Button
      if (MR_CURRENT_COUNT < total) {
        if (loadMoreBtn) {
          loadMoreBtn.classList.remove("hidden");
          const btn = loadMoreBtn.querySelector("button");
          if (btn) btn.textContent = `Load More (Showing ${MR_CURRENT_COUNT} of ${total})`;
        }
      } else {
        if (loadMoreBtn) loadMoreBtn.classList.add("hidden");
      }
    }

    function loadMoreMachines() {
      renderMachineRegisterCards(null, false); // false = append
    }

    async function loadFtMachineRegister(overrides = {}) {
      if (!navigator.onLine) {
        showToast("Offline: machine register needs connection.", "warn", 3500);
        return;
      }

      setSyncState("syncing");
      try {
        const showLoader = !overrides.quiet;
        const loaderMsg  = overrides.loaderMsg || 'Loading machines...';

        if (showLoader && window.showOmnisLoader) window.showOmnisLoader(loaderMsg);

        // ── PRIMARY SOURCE: Supabase ft_machine ──────────────────────────────
        // Supabase is now the single source of truth for the Machine Register.
        // The Frappe→Supabase sync below keeps data fresh from the ERP in the background.
        const PAGE_SIZE = 5000;
        let allRows = [];
        let from = 0;
        let keepFetching = true;

        while (keepFetching) {
          const res = await window.electron.invoke('supabase:query', {
            table: 'ft_machine',
            method: 'select',
            params: {
              columns: '*',
              range: { from, to: from + PAGE_SIZE - 1 }
            }
          });
          if (!res || !res.ok) throw new Error(res?.error || 'Supabase ft_machine query failed');
          const batch = res.data || [];
          allRows = allRows.concat(batch);
          if (batch.length < PAGE_SIZE) {
            keepFetching = false;
          } else {
            from += PAGE_SIZE;
          }
        }

        const currentDiv = window.currentDivision || 'fleetrack';
        window.FT_MACHINE_ROWS_ALL = allRows;
        window.FT_MACHINE_ROWS = allRows.filter(m => (m.division || 'fleetrack') === currentDiv);

        // Populate global map
        window.MACHINES_MAP = {};
        allRows.forEach(m => {
          if (m.name) window.MACHINES_MAP[m.name] = m;
        });
        
        if (typeof filterDefectsTable === 'function') filterDefectsTable();
        if (typeof loadFtDefectsDashboard === 'function') loadFtDefectsDashboard();

        // ── BACKGROUND SYNC: Frappe → Supabase (non-blocking, fire-and-forget) ──
        // This keeps Supabase current with the ERP. It runs silently after the
        // register is already displayed so the user sees data immediately.
        if (window.syncMachinesToSupabase) {
          // Fetch fresh from Frappe in background, then upsert to Supabase
          callFrappe(FT_MACHINE_REGISTER_METHOD, {}, 'GET', { showLoader: false })
            .then(raw => {
              if (!raw.exc && !raw.exception) {
                const payload = raw.message || raw;
                const frappe = payload.data || [];
                if (frappe.length) {
                  return window.syncMachinesToSupabase(frappe)
                    .then(() => {
                      // Update in-memory rows with any fresher Frappe data
                      frappe.forEach(fm => {
                        const idx = window.FT_MACHINE_ROWS.findIndex(r => r.name === fm.name);
                        if (idx >= 0) Object.assign(window.FT_MACHINE_ROWS[idx], fm);
                        else window.FT_MACHINE_ROWS.push(fm);
                        if (fm.name) window.MACHINES_MAP[fm.name] = window.FT_MACHINE_ROWS.find(r => r.name === fm.name);
                      });
                    });
                }
              }
            })
            .then(() => window.loadLibSupabaseUrls && window.loadLibSupabaseUrls())
            .catch(e => console.warn('[BgSync] Frappe→Supabase sync error:', e));
        }

        // Filter and sort the newly loaded array before rendering
        refreshMachineRegisterReport();

        // ---- Enhanced KPI Calculations ----
        const statMach = document.getElementById('mr-stat-machines');
        const statFleetrack = document.getElementById('mr-stat-fleetrack');
        const statCust = document.getElementById('mr-stat-customers');
        const statOverdue = document.getElementById('mr-stat-overdue');
        const statStale = document.getElementById('mr-stat-stale-hmr');
        const statWarranty = document.getElementById('mr-stat-warranty');
        const statFringe = document.getElementById('mr-stat-fringe');
        const statPlanner = document.getElementById('mr-stat-service-msg');

        if (statMach) statMach.textContent = FT_MACHINE_ROWS.length;
        if (statCust) {
          const uniqueCust = new Set(FT_MACHINE_ROWS.map(m => m.customer)).size;
          statCust.textContent = uniqueCust;
        }

        // Helper: count business days between two dates (excluding weekends)
        function businessDaysBetween(startDate, endDate) {
          let count = 0;
          const cur = new Date(startDate);
          while (cur <= endDate) {
            const dow = cur.getDay();
            if (dow !== 0 && dow !== 6) count++;
            cur.setDate(cur.getDate() + 1);
          }
          return count;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let ftCount = 0, overdue = 0, dueSoon = 0, staleCount = 0;
        let warrantyCount = 0, fringeCount = 0;

        FT_MACHINE_ROWS.forEach(m => {
          const isFT = (m.fleetrack_managed || "").toLowerCase() === "yes";
          m._isFleetrack = isFT;
          if (isFT) ftCount++;

          // Stale HMR calculation (for all machines, but KPI counts only FT)
          if (m.modified) {
            const modDate = new Date(m.modified);
            modDate.setHours(0, 0, 0, 0);
            const bizDays = businessDaysBetween(modDate, today);
            m._staleHmr = bizDays > 14;
          }

          // Only count operational KPIs for Fleetrack-managed machines
          if (!isFT) return;

          // Service overdue / due soon
          if (m.next_service_hmr != null && m.current_hmr != null) {
            const delta = Number(m.next_service_hmr) - Number(m.current_hmr);
            if (delta < 0) overdue++;
            else if (delta <= 50) dueSoon++;
          }

          if (m._staleHmr) staleCount++;

          // Warranty tracking
          const ws = (m.warranty_status || "").toLowerCase();
          if (ws === "under warranty") warrantyCount++;

          // Fringe warranty: "Parts Only" coverage
          const wt = (m.warranty_type || "").toLowerCase();
          if (wt === "parts only") {
            m._fringeWarranty = true;
            fringeCount++;
          }
        });

        if (statFleetrack) statFleetrack.textContent = ftCount;
        if (statOverdue) statOverdue.textContent = overdue;
        if (statStale) statStale.textContent = staleCount;
        if (statWarranty) statWarranty.textContent = warrantyCount;
        if (statFringe) statFringe.textContent = fringeCount;

        // Service Planner AI Message
        if (statPlanner) {
          let toggleId = "oai-toggle-" + Date.now();
          let parts = [];
          if (overdue > 0) parts.push(`<span style="color: #a4262c; font-weight: 600; padding: 2px 6px; background: #fcf4f4; border-radius: 4px; border: 1px solid #f3e7e7;">${overdue} Overdue</span>`);
          if (dueSoon > 0) parts.push(`<span style="color: #d83b01; font-weight: 600; padding: 2px 6px; background: #fff8eb; border-radius: 4px; border: 1px solid #fcebd1;">${dueSoon} Due soon</span>`);
          if (staleCount > 0) parts.push(`<span style="color: #8a8886; font-weight: 600; padding: 2px 6px; background: #f3f2f1; border-radius: 4px; border: 1px solid #edebe9;">${staleCount} Stale HMR</span>`);
          if (fringeCount > 0) parts.push(`<span style="color: #5c2d91; font-weight: 600; padding: 2px 6px; background: #f8f6f9; border-radius: 4px; border: 1px solid #ede8f2;">${fringeCount} Parts only</span>`);

          if (parts.length > 0) {
            let totalIssues = overdue + dueSoon + staleCount + fringeCount;
            let clickLogic = `
              let c = document.getElementById('${toggleId}');
              let i = document.getElementById('${toggleId}-icon');
              let exp = c.style.gridTemplateRows === '1fr';
              c.style.gridTemplateRows = exp ? '0fr' : '1fr';
              i.style.transform = exp ? 'rotate(0deg)' : 'rotate(180deg)';
            `;
            statPlanner.innerHTML = `
              <div style="width: 100%; display: block; background: #ffffff; border: 1px solid #e1dfdd; border-left: 4px solid #a4262c; border-radius: 4px; font-family: 'Segoe UI', system-ui, sans-serif; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.02)">
                <div onclick="${clickLogic.replace(/\n/g, '')}" style="display: flex; align-items: center; gap: 8px; padding: 12px 16px; cursor: pointer; font-size: 13px; font-weight: 600; color: #323130; user-select: none; transition: background 0.2s;" onmouseover="this.style.background='#fcfcfc'" onmouseout="this.style.background='none'">
                  <svg viewBox="0 0 20 20" width="16" height="16" fill="#a4262c" style="flex-shrink: 0;"><path d="M10 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16zM9 9v5h2V9H9zm0-4v2h2V5H9z"/></svg>
                  <span style="letter-spacing: 0.5px; flex: 1;">OAI Fleet Intelligence &mdash; Urgencies Detected</span>
                  <span style="font-size: 11px; color: #a4262c; font-weight: 700; background: #fcf4f4; padding: 2px 8px; border-radius: 12px; border: 1px solid #f3e7e7; margin-right: 8px;">${totalIssues} Issues</span>
                  <svg id="${toggleId}-icon" viewBox="0 0 16 16" width="14" height="14" fill="currentColor" style="color: #605e5c; transition: transform 0.3s ease-out;"><path d="M8 11.2L2.4 5.6h11.2z"/></svg>
                </div>
                <div id="${toggleId}" style="display: grid; grid-template-rows: 0fr; transition: grid-template-rows 0.3s ease-out;">
                  <div style="overflow: hidden;">
                    <div id="accordion-kpi-slot-${toggleId}"></div>
                    <div style="display: flex; align-items: center; flex-wrap: wrap; justify-content: space-between; font-size: 13px; color: #323130; line-height: 1.5; padding: 12px 16px 16px 20px;">
                      <div style="display: flex; align-items: center; gap: 16px;">
                        <div>Analysis of <strong>${ftCount}</strong> active machines reveals urgencies:</div>
                        <div style="display: flex; flex-wrap: wrap; gap: 8px;">${parts.join('')}</div>
                      </div>
                      <div style="display: flex; gap: 12px; align-items: center;">
                        <span style="color: #605e5c;">Schedule required in Field Service Plan.</span>
                        <button onclick="viewPlannerList()" style="background:#0f172a; color:#ffffff; border:none; padding:8px 16px; font-size:11px; font-weight:700; border-radius:4px; cursor:pointer; box-shadow:0 1px 2px rgba(0,0,0,0.1); transition:all 0.2s; white-space: nowrap;">View Planned List</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>`;
              
              let kpiNode = document.getElementById('kpi-dashboard-wrapper');
              if (kpiNode) {
                 document.getElementById(`accordion-kpi-slot-${toggleId}`).appendChild(kpiNode);
              }
              
          } else {
            let clickLogic = `
              let c = document.getElementById('${toggleId}');
              let i = document.getElementById('${toggleId}-icon');
              let exp = c.style.gridTemplateRows === '1fr';
              c.style.gridTemplateRows = exp ? '0fr' : '1fr';
              i.style.transform = exp ? 'rotate(0deg)' : 'rotate(180deg)';
            `;
            statPlanner.innerHTML = `
              <div style="width: 100%; display: block; background: #ffffff; border: 1px solid #e1dfdd; border-left: 4px solid #107c10; border-radius: 4px; font-family: 'Segoe UI', system-ui, sans-serif; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.02)">
                <div onclick="${clickLogic.replace(/\n/g, '')}" style="display: flex; align-items: center; gap: 8px; padding: 12px 16px; cursor: pointer; font-size: 13px; font-weight: 600; color: #323130; user-select: none; transition: background 0.2s;" onmouseover="this.style.background='#fcfcfc'" onmouseout="this.style.background='none'">
                  <svg viewBox="0 0 20 20" width="16" height="16" fill="#107c10" style="flex-shrink: 0;"><path d="M10 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16zm4.78 5.22l-5.5 5.5l-2.5-2.5l-1.06 1.06l3.56 3.56l6.56-6.56l-1.06-1.06z"/></svg>
                  <span style="letter-spacing: 0.5px; flex: 1;">OAI Fleet Intelligence &mdash; System Secure</span>
                  <svg id="${toggleId}-icon" viewBox="0 0 16 16" width="14" height="14" fill="currentColor" style="color: #605e5c; transition: transform 0.3s ease-out;"><path d="M8 11.2L2.4 5.6h11.2z"/></svg>
                </div>
                <div id="${toggleId}" style="display: grid; grid-template-rows: 0fr; transition: grid-template-rows 0.3s ease-out;">
                  <div style="overflow: hidden;">
                    <div id="accordion-kpi-slot-${toggleId}"></div>
                    <div style="display: flex; align-items: center; justify-content: space-between; font-size: 13px; color: #323130; line-height: 1.5; padding: 12px 16px 16px 20px;">
                      <div>All <strong>${ftCount}</strong> Fleetrack machines are operating optimally within set service parameters.</div>
                      <button onclick="viewPlannerList()" style="background:#0f172a; color:#ffffff; border:none; padding:8px 16px; font-size:11px; font-weight:700; border-radius:4px; cursor:pointer; box-shadow:0 1px 2px rgba(0,0,0,0.1); transition:all 0.2s; white-space: nowrap;">View Planned List</button>
                    </div>
                  </div>
                </div>
              </div>`;
              
              let kpiNode = document.getElementById('kpi-dashboard-wrapper');
              if (kpiNode) {
                 document.getElementById(`accordion-kpi-slot-${toggleId}`).appendChild(kpiNode);
              }
          }
        }

        console.log(`[MachineRegister] Loaded ${FT_MACHINE_ROWS.length} machines from Supabase`);
        if (showLoader && window.hideOmnisLoader) window.hideOmnisLoader();
        showToast("Machine register loaded: " + FT_MACHINE_ROWS.length, "ok", 2200);

      } catch (e) {
        console.error("loadFtMachineRegister error:", e);
        if (showLoader && window.hideOmnisLoader) window.hideOmnisLoader();
        showToast("Machine register failed to load.", "err", 4500);
      } finally {
        refreshOnlineState();
      }
    }

    // ---- KPI Category Filter ----
    function filterMRByCategory(category) {
      if (!FT_MACHINE_ROWS || FT_MACHINE_ROWS.length === 0) return;

      const ftOnly = FT_MACHINE_ROWS.filter(m => m._isFleetrack);
      let filtered;
      let label;

      switch (category) {
        case 'fleetrack':
          filtered = ftOnly;
          label = "Fleetrack™ Managed";
          break;

        case 'overdue':
          filtered = ftOnly.filter(m =>
            m.next_service_hmr != null && m.current_hmr != null &&
            (Number(m.next_service_hmr) - Number(m.current_hmr)) < 0
          );
          label = "Service Overdue (Fleetrack)";
          break;

        case 'stale':
          filtered = ftOnly.filter(m => m._staleHmr);
          label = "Stale HMR — 14+ business days (Fleetrack)";
          break;

        case 'warranty':
          filtered = ftOnly.filter(m => {
            const ws = (m.warranty_status || "").toLowerCase();
            return ws === "under warranty";
          });
          label = "Under Warranty (Fleetrack)";
          break;

        case 'fringe':
          filtered = ftOnly.filter(m => m._fringeWarranty);
          label = "Fringe Warranty — Parts Only (Fleetrack)";
          break;

        default:
          filtered = FT_MACHINE_ROWS;
          label = "All Machines";
      }

      renderMachineRegisterCards(filtered, true);
      showToast(`Showing ${filtered.length} machines: ${label}`, "info", 3000);
    }
    window.filterMRByCategory = filterMRByCategory;

    // Filter and show only Service Plan candidates
    function viewPlannerList() {
      if (!FT_MACHINE_ROWS || FT_MACHINE_ROWS.length === 0) {
        showToast("No machine data loaded.", "err");
        return;
      }

      // Filter: Overdue (<0) or Due Soon (<=50)
      const candidates = FT_MACHINE_ROWS.filter(m => {
        if (m.next_service_hmr != null && m.current_hmr != null) {
          const delta = Number(m.next_service_hmr) - Number(m.current_hmr);
          return delta <= 50;
        }
        return false;
      });

      renderMachineRegisterCards(candidates, true);

      // Update filter bar to reflect "custom view" status
      const grid = document.getElementById("mr-grid-container");
      if (grid) {
        // Prepend a clear filter message
        const msg = document.createElement("div");
        msg.style.gridColumn = "1/-1";
        msg.style.background = "#eff6ff";
        msg.style.color = "#1e40af";
        msg.style.padding = "10px";
        msg.style.borderRadius = "8px";
        msg.style.marginBottom = "10px";
        msg.style.fontSize = "13px";
        msg.style.display = "flex";
        msg.style.justifyContent = "space-between";
        msg.style.alignItems = "center";
        msg.innerHTML = `
            <span>Showing <b>${candidates.length}</b> Service Plan candidates.</span>
            <button onclick="refreshMachineRegisterReport()" style="border:1px solid #bfdbfe; background:white; color:#1e40af; padding:4px 10px; border-radius:6px; cursor:pointer;">Clear View</button>
          `;
        grid.prepend(msg);
      }

      showToast(`Showing ${candidates.length} machines for service planning.`, "ok");
    }

    // ---------------------------
    // Load Daily Breakdown Report (DBR) data
    // ---------------------------
    async function loadMachineRegisterReport() {
      // Wrapper for loading machine data for reports view
      await loadFtMachineRegister();
    }

    async function loadDailyBreakdownReport() {
      if (!navigator.onLine) {
        showToast("Offline: DBR needs connection.", "warn", 3500);
        return;
      }

      setSyncState("syncing");
      DBR_PAGE = 1;
      if (window.showOmnisLoader) window.showOmnisLoader('Loading breakdowns...');
      try {
        const filters = {
          region: document.getElementById('dbr-filter-region')?.value || '',
          customer: document.getElementById('dbr-filter-customer')?.value || '',
          machine: document.getElementById('dbr-filter-machine')?.value || '',
          responsibility: document.getElementById('dbr-filter-responsibility')?.value || '',
          ifn: document.getElementById('dbr-filter-ifn')?.value || '',
          cfn: document.getElementById('dbr-filter-cfn')?.value || '',
          urgent: document.getElementById('dbr-filter-urgent')?.checked ? 1 : 0,
          includeClosed: document.getElementById('dbr-filter-closed')?.checked ? 1 : 0,
          _ts: Date.now() // Force fresh fetch to bypass browser cache
        };
        const currentDiv = window.currentDivision || 'fleetrack';
        // Supabase fetch
        let dbData = [];
        let dbError = null;
        let limit = 1000;
        let offset = 0;
        let hasMore = true;

        while (hasMore) {
          let query = supabase.from('ft_breakdown_logs').select('*').eq('division', currentDiv);
          if (!filters.includeClosed) {
            query = query.or('breakdown_end_date.is.null');
          }
          if (filters.region) query = query.ilike('region', `%${filters.region}%`);
          if (filters.customer) query = query.ilike('customer', `%${filters.customer}%`);
          if (filters.ifn) query = query.ilike('fleet_no', `%${filters.ifn}%`);
          if (filters.cfn) query = query.ilike('customer_ref', `%${filters.cfn}%`);
          if (filters.machine) {
            query = query.or(`machine.ilike.%${filters.machine}%,model.ilike.%${filters.machine}%,serial_number.ilike.%${filters.machine}%,fleet_no.ilike.%${filters.machine}%`);
          }
          if (filters.responsibility) {
            query = query.ilike('responsibility', `%${filters.responsibility}%`);
          }
          if (filters.urgent) query = query.eq('urgent', true);

          const { data: pageData, error } = await query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

          if (error) {
            dbError = error;
            break;
          }

          if (pageData && pageData.length > 0) {
            dbData = dbData.concat(pageData);
            offset += limit;
            if (pageData.length < limit) hasMore = false;
          } else {
            hasMore = false;
          }
        }

        let data = { breakdowns: (dbData || []).map(r => {
          let bd = { ...r, name: r.frappe_name || r.id, supervisor_comment: r.manager_comments, resp: r.responsibility, end_date: r.breakdown_end_date };
          if (bd.breakdown_date) {
            const start = new Date(bd.breakdown_date);
            const end = bd.breakdown_end_date ? new Date(bd.breakdown_end_date) : new Date();
            bd.days_on_bd = Math.floor((end - start) / (1000 * 60 * 60 * 24));
          } else {
            bd.days_on_bd = 0;
          }
          return bd;
        }), efficiency: "0.0%", can_edit_comments: true, current_user: "Admin" };
        if (dbError) {
          data.error = true;
          data.traceback = dbError.message;
        }

        if (data.error) {
          console.error("DBR Backend Error:", data.traceback);
          showToast("DBR Error: Check debug area", "err", 4500);

          const efficiencyEl = document.getElementById('dbr-efficiency');
          if (efficiencyEl) efficiencyEl.textContent = "BACKEND ERROR";

          const debugContainer = document.getElementById('dbr-debug-container');
          const debugText = document.getElementById('dbr-debug-text');
          if (debugContainer && debugText && data.traceback) {
            debugContainer.classList.remove('hidden');
            debugText.textContent = data.traceback;
          }

          const tbody = document.getElementById("dbr-tbody");
          if (tbody) {
            tbody.innerHTML = `<tr>
      <td colspan="10" style="padding:40px;text-align:center;color:#ef4444;font-size:12px;font-weight:600;">Error
        loading data. See traceback below.</td>
    </tr>`;
          }
          return;
        }

        // Hide debug if it was shown
        const debugContainer = document.getElementById('dbr-debug-container');
        if (debugContainer) debugContainer.classList.add('hidden');

        const breakdowns = data.breakdowns || [];
        // Cache rows for modal use
        breakdowns.forEach(r => { if (r.name) DBR_ROWS_CACHE[r.name] = r; });

        CAN_EDIT_COMMENTS = !!data.can_edit_comments; // data.can_edit_comments is sent from backend
        // DEBUG ALERT
        // alert("DEBUG: Permissions Loaded. Can Edit Comments: " + CAN_EDIT_COMMENTS);
        CURRENT_SERVER_USER = data.current_user || "Guest";

        const efficiency = data.efficiency || "0.0%";

        // Update efficiency display
        const efficiencyEl = document.getElementById('dbr-efficiency');
        if (efficiencyEl) efficiencyEl.textContent = efficiency;

        // --- KPI: Supervisor Approved & Not Sent ---
        const kpiSup = document.getElementById('dbr-kpi-supervisor');
        const kpiSupCount = document.getElementById('dbr-sup-count');
        const kpiSupTimer = document.getElementById('dbr-sup-timer');

        if (kpiSup) {
          // Count logs that are approved but NOT sent
          const pendingReport = breakdowns.filter(b =>
            b.supervisor_approved == 1 && (!b.sent_to_customer || b.sent_to_customer == 0)
          );

          if (pendingReport.length > 0) {
            kpiSup.classList.remove('hidden');
            if (kpiSupCount) kpiSupCount.textContent = pendingReport.length;

            // Trigger Desktop Notification for Ready to Send
            pendingReport.forEach(x => {
              if (x.name && !NOTIFIED_IDS.has(x.name)) {
                saveNotifiedId(x.name);
                const title = `✅ Ready to Send`;
                const body = `${x.customer || 'Customer'} - ${x.machine || 'Machine'}`;
                sendDesktopNotification(title, body, `ready_${x.name}`);
              }
            });

            // Calculate max wait time (from modified timestamp)
            let maxDiffMs = 0;
            const now = new Date();

            pendingReport.forEach(x => {
              const t = x.modified ? new Date(x.modified) : null;
              if (t && !isNaN(t)) {
                const diff = now - t;
                if (diff > maxDiffMs) maxDiffMs = diff;
              }
            });

            if (kpiSupTimer && maxDiffMs > 0) {
              const totalMins = Math.floor(maxDiffMs / 60000);
              const h = Math.floor(totalMins / 60);
              const m = totalMins % 60;
              kpiSupTimer.textContent = `Longest: ${h}h ${m}m`;
            } else if (kpiSupTimer) {
              kpiSupTimer.textContent = "Longest: < 1m";
            }

          } else {
            kpiSup.classList.add('hidden');
          }
        }

        // Render the table
        renderDailyBreakdownReport(breakdowns);

        // Notify for NEW Urgent Breakdowns
        breakdowns.forEach(b => {
          if (b.urgent && b.name && !NOTIFIED_IDS.has(b.name)) {
            saveNotifiedId(b.name);
            const title = `🚨 Urgent Breakdown`;
            const body = `${b.customer || 'Customer'} - ${b.machine || 'Machine'}`;
            sendDesktopNotification(title, body, `urgent_${b.name}`);
          }
        });

        showToast(`DBR: ${breakdowns.length} records found`, "ok", 2200);
        // DEBUG: Show who the server sees us as
        if (data.current_user) {
          showToast(`Server User: ${data.current_user}`, "info", 5000);
        }

      } catch (e) {
        console.error("loadDailyBreakdownReport error:", e);
        showToast("DBR Connection Error.", "err", 4500);
      } finally {
        if (window.hideOmnisLoader) window.hideOmnisLoader();
        refreshOnlineState();
      }
    }

    function machineAttachmentLink(fileUrl) {
      if (!fileUrl) return "";
      const u = safeText(fileUrl);
      if (!u) return "";
      if (u.startsWith("http")) return u;
      return FLEET_BASE_URL + u;
    }

    function printMWR() {
      const mwrVisible = !document.getElementById('view-rpt-mwr').classList.contains('hidden');
      if (!mwrVisible) {
        showToast("Please open the Maintenance Warning Report first.", "warn");
        return;
      }
      
      const userName = localStorage.getItem('ft_user_name') || 'Administrator';
      const today = new Date().toLocaleDateString('en-GB'); // DD/MM/YYYY
      
      let html = `
<!DOCTYPE html>
<html>
<head>
  <title>Maintenance Warning Report (MWR)</title>
  <style>
    body { font-family: sans-serif; font-size: 11px; color: #1e293b; padding: 20px; }
    .header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px; border-bottom: 1px solid #cbd5e1; padding-bottom: 10px; }
    .logo-container { display:flex; flex-direction:column; gap:4px; }
    .title-block { text-align: right; display:flex; flex-direction:column; gap:10px; align-items:flex-end; }
    .title { font-size: 18px; font-weight: 400; color: #000; }
    .eff-pill { background: #000; color: #fff; padding: 4px; font-weight: bold; font-size: 10px; display: flex; border:1px solid #000; }
    .eff-pill span { background: #fff; color: #000; padding: 2px 6px; margin-left: 4px; }
    .meta-table { width: 300px; margin-bottom: 20px; font-size: 11px; color: #64748b; }
    .meta-table td { padding: 4px 0; }
    .meta-table strong { color: #1e293b; font-weight: 400; }
    table.dbr-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    .dbr-table th, .dbr-table td { border-bottom: 1px solid #cbd5e1; padding: 8px 6px; vertical-align: top; text-align: left; }
    .dbr-table th { background: #E53935; color: #fff; font-weight: bold; border: none; font-size:11px; }
    .sig-table { width: 100%; border-collapse: collapse; text-align: left; margin-top: 40px; }
    .sig-table th { background: #E53935; color: #fff; padding: 6px; font-weight: bold; border: 1px solid #E53935; font-size:11px; text-align:center; }
    .sig-table td { padding: 25px 6px; border: 1px solid #E53935; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; padding: 0; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo-container">
      <img src="${window.location.origin}${window.location.pathname.replace('index.html', '')}../../assets/images/omnis-logo.png" style="height:35px;" onerror="this.style.display='none'" />
      <img src="${window.location.origin}${window.location.pathname.replace('index.html', '')}../../assets/images/fleetrack-logo.png" style="height:15px;" onerror="this.style.display='none'" />
    </div>
    <div class="title-block">
      <div class="title">Maintenance Warning Report (MWR)</div>
      <div class="eff-pill">% Efficiency <span>15.0%</span></div>
    </div>
  </div>

  <table class="meta-table">
    <tr><td>Prepared by</td><td><strong>${userName}</strong></td></tr>
    <tr><td>Date</td><td><strong>${today}</strong></td></tr>
  </table>

  <table class="dbr-table">
    <thead>
      <tr>
        <th>Customer</th>
        <th>Machine</th>
        <th>Region</th>
        <th style="text-align:right;">Current HMR</th>
        <th style="text-align:right;">Last Service</th>
        <th style="text-align:right;">HMR Since Service</th>
        <th>Warning</th>
      </tr>
    </thead>
    <tbody>`;

      const trs = document.querySelectorAll('#mwr-tbody tr');
      if (trs.length === 0 || (trs.length === 1 && trs[0].textContent.includes('Loading'))) {
         showToast("No data to print", "warn");
         return;
      }

      trs.forEach(tr => {
         if (tr.style.display === 'none') return;
         html += `<tr>${tr.innerHTML}</tr>`;
      });

      html += `
    </tbody>
  </table>

  <table class="sig-table">
    <thead>
      <tr><th colspan="6" style="text-align:center;">Signatures</th></tr>
      <tr>
        <th style="width:16%;">FT Controller</th>
        <th style="width:16%;">PD Controller</th>
        <th style="width:16%;">AD Controller</th>
        <th style="width:16%;">CSD Supervisor</th>
        <th style="width:16%;">CSD Manager</th>
        <th style="width:20%;">MD</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td></td><td></td><td></td><td></td><td></td><td></td>
      </tr>
    </tbody>
  </table>

  </body>
</body>
</html>`;

      const pWin = window.open('', '_blank');
      if (pWin) {
        pWin.document.write(html);
        pWin.document.close();
        pWin.focus();
        setTimeout(() => { pWin.print(); pWin.close(); }, 800);
      }
    }

    function printDBR() {
      const dbrVisible = !document.getElementById('view-reports').classList.contains('hidden');
      if (!dbrVisible) {
        showToast("Please open the DBR report first.", "warn");
        return;
      }
      
      const region = document.getElementById('dbr-filter-region')?.value || '';
      const regionText = region ? ` - ${region}` : '';
      const efficiency = document.getElementById('dbr-efficiency')?.textContent || '0.0%';
      const userName = localStorage.getItem('ft_user_name') || 'Administrator';
      const today = new Date().toLocaleDateString('en-GB'); // DD/MM/YYYY

      let html = `
<!DOCTYPE html>
<html>
<head>
  <title>Daily Breakdown Report</title>
  <style>
    body { font-family: sans-serif; font-size: 11px; color: #1e293b; padding: 20px; }
    .header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px; border-bottom: 1px solid #cbd5e1; padding-bottom: 10px; }
    .logo-container { display:flex; flex-direction:column; gap:4px; }
    .title-block { text-align: right; display:flex; flex-direction:column; gap:10px; align-items:flex-end; }
    .title { font-size: 18px; font-weight: 400; color: #000; }
    .eff-pill { background: #000; color: #fff; padding: 4px; font-weight: bold; font-size: 10px; display: flex; border:1px solid #000; }
    .eff-pill span { background: #fff; color: #000; padding: 2px 6px; margin-left: 4px; }
    .meta-table { width: 300px; margin-bottom: 20px; font-size: 11px; color: #64748b; }
    .meta-table td { padding: 4px 0; }
    .meta-table strong { color: #1e293b; font-weight: 400; }
    table.dbr-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    .dbr-table th, .dbr-table td { border-bottom: 1px solid #cbd5e1; padding: 8px 6px; vertical-align: top; text-align: left; }
    .dbr-table th { background: #E53935; color: #fff; font-weight: bold; border: none; font-size:11px; }
    .sig-table { width: 100%; border-collapse: collapse; text-align: left; margin-top: 40px; }
    .sig-table th { background: #E53935; color: #fff; padding: 6px; font-weight: bold; border: 1px solid #E53935; font-size:11px; text-align:center; }
    .sig-table td { padding: 25px 6px; border: 1px solid #E53935; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; padding: 0; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo-container">
      <img src="${window.location.origin}${window.location.pathname.replace('index.html', '')}../../assets/images/omnis-logo.png" style="height:35px;" onerror="this.style.display='none'" />
      <img src="${window.location.origin}${window.location.pathname.replace('index.html', '')}../../assets/images/fleetrack-logo.png" style="height:15px;" onerror="this.style.display='none'" />
    </div>
    <div class="title-block">
      <div class="title">Daily Breakdown Report (DBR)${regionText}</div>
      <div class="eff-pill">% Efficiency <span>${efficiency}</span></div>
    </div>
  </div>
  <table class="meta-table">
    <tr><td style="color:#94a3b8;">Prepared<br>by</td><td><strong>${userName}</strong></td></tr>
    <tr><td style="color:#94a3b8;">Date</td><td><strong>${today}</strong></td></tr>
  </table>
  <table class="dbr-table">
    <thead>
      <tr>
        <th>Customer</th>
        <th>Machine</th>
        <th>Reported</th>
        <th>Description</th>
        <th>TED</th>
        <th>RED</th>
        <th>Status</th>
        <th style="text-align:center;">Days on BD</th>
        <th>ETA</th>
        <th>Manager's Comments</th>
      </tr>
    </thead>
    <tbody>
`;

      let rowsToPrint = [...CURRENT_DBR_ROWS];
      const isGrouped = document.getElementById('dbr-group-customer')?.checked;
      
      if (isGrouped) {
          rowsToPrint.sort((a,b) => {
              const cA = a.customer || '';
              const cB = b.customer || '';
              if (cA.localeCompare(cB) !== 0) return cA.localeCompare(cB);
              const daysA = parseInt(a.days_on_bd) || 0;
              const daysB = parseInt(b.days_on_bd) || 0;
              return daysB - daysA;
          });
      } else {
          rowsToPrint.sort((a,b) => {
              const daysA = parseInt(a.days_on_bd) || 0;
              const daysB = parseInt(b.days_on_bd) || 0;
              return daysB - daysA;
          });
      }

      const customerRowSpans = {};
      if (isGrouped) {
          let i = 0;
          while (i < rowsToPrint.length) {
              const cust = rowsToPrint[i].customer || 'Unknown Customer';
              let count = 1;
              for (let j = i + 1; j < rowsToPrint.length; j++) {
                  if ((rowsToPrint[j].customer || 'Unknown Customer') === cust) count++;
                  else break;
              }
              customerRowSpans[i] = count;
              for (let k = i + 1; k < i + count; k++) customerRowSpans[k] = 0;
              i += count;
          }
      }

      rowsToPrint.forEach((r, idx) => {
         const date = r.breakdown_date ? formatDateDA(r.breakdown_date) : "—";
         const ted = r.ted ? formatDateDA(r.ted) : (r.ted_status || "—");
         const red = r.red ? formatDateDA(r.red) : "—";

         const mObj = window.MACHINES_MAP?.[r.machine] || {};
         const cName = safeText(r.customer || mObj.customer) || "—";
         const cRefStr = safeText(r.customer_ref || mObj.customer_ref);
         const cRegionStr = safeText(r.region || mObj.region);
         
         let custCell = "";
         const cRef = cRefStr ? `<div style="font-size:10px;color:#64748b;margin-top:2px;">Ref ▶ <strong>${cRefStr}</strong></div>` : "";
         const cRegion = cRegionStr ? `<div style="font-size:10px;color:#64748b;margin-top:2px;">📍 ${cRegionStr}</div>` : "";
         
         if (isGrouped) {
             if (customerRowSpans[idx] > 0) {
                 custCell = `<td rowspan="${customerRowSpans[idx]}" style="vertical-align:middle; background:#fcfcfc;">
                     <div style="font-weight:400;color:#000;">${cName}</div>
                     ${cRef}
                     ${cRegion}
                 </td>`;
             }
         } else {
             custCell = `<td>
                 <div style="font-weight:400;color:#000;">${cName}</div>
                 ${cRef}
                 ${cRegion}
             </td>`;
         }

         const cModelStr = safeText(r.model || mObj.model);
         const cSnStr = safeText(r.serial_number || r.machine || mObj.sn || mObj.machine_sn);
         const cFleetStr = safeText(r.fleet_no || mObj.fleet_no || mObj.mxg_fleet_no);
         const cHmrStr = safeText(r.current_hmr || mObj.current_hmr || mObj.hmr);
         const cWtyStr = safeText(r.warranty_status || mObj.warranty_status);

         const srnHtml = `<div style="font-size:10px;color:#64748b;margin-top:2px;">SRN ▶ <strong>${cSnStr || ""}</strong></div>`;
         const fleetHtml = `<div style="font-size:10px;color:#64748b;margin-top:2px;">Fleet No ▶ <strong>${cFleetStr || ""}</strong></div>`;
         const hmrHtml = `<div style="font-size:10px;color:#64748b;margin-top:2px;">Current HMR ▶ <strong>${cHmrStr || ""}</strong></div>`;
         const machineRunningHtml = `<div style="font-size:10px;color:#64748b;margin-top:2px;">Machine Running? ▶ <strong>${safeText(r.machine_running || 'No')}</strong></div>`;
         const warrantyHtml = cWtyStr ? `<div style="font-size:9px;color:#0f172a;font-weight:bold;margin-top:4px;">${cWtyStr}</div>` : "";

         html += `
           <tr>
             ${custCell}
             <td>
               <div style="font-weight:400;color:#000;">${safeText(r.model) || "—"}</div>
               ${srnHtml}
               ${fleetHtml}
               ${hmrHtml}
               ${machineRunningHtml}
               ${warrantyHtml}
             </td>
             <td>${date}</td>
             <td>${safeText(r.description) || "—"}</td>
             <td>${ted}</td>
             <td>${red}</td>
             <td>
               <div style="margin-bottom:4px;">${safeText(r.status) || "—"}</div>
               ${r.quoted_date ? `<div style="font-weight:bold;font-size:10px;color:#000;">Quoted:<br>${formatDateDA(r.quoted_date)}</div>` : ''}
             </td>
             <td style="text-align:center;">${r.days_on_bd || 0}</td>
             <td>
               <div style="font-size:10px;color:#94a3b8;">Parts ▼</div>
               <div style="font-weight:bold;font-size:10px;margin-bottom:4px;color:#000;">${r.parts_eta ? formatDateDA(r.parts_eta) : ''}</div>
               <div style="font-size:10px;color:#94a3b8;">Outwork ▼</div>
               <div style="font-weight:bold;font-size:10px;color:#000;">${r.out_eta ? formatDateDA(r.out_eta) : ''}</div>
             </td>
             <td>${safeText(r.supervisor_comment) || ""}</td>
           </tr>
         `;
      });

      html += `
    </tbody>
  </table>
  <table class="sig-table">
    <tr><th colspan="5" style="border:none; text-align:center; padding:8px;">Signatures</th></tr>
    <tr>
      <th>FT Controller</th>
      <th>CSD Supervisor</th>
      <th>CSD Manager</th>
      <th>SRD Representative</th>
      <th>MD</th>
    </tr>
    <tr>
      <td></td><td></td><td></td><td></td><td></td>
    </tr>
  </table>
</body>
</html>
`;

      const printWin = window.open('', '_blank');
      printWin.document.write(html);
      printWin.document.close();
      printWin.focus();
      setTimeout(() => {
        printWin.print();
        printWin.close();
      }, 500);
    }

    function printGDR() {
      const defectsVisible = !document.getElementById('view-defects').classList.contains('hidden');
      if (!defectsVisible) {
        showToast("Please open the Defects view first.", "warn");
        return;
      }
      
      let rows = window.FT_DEFECTS_FILTERED_DATA || window.FT_DEFECTS_DATA || [];
      if (rows.length === 0) {
        showToast("No defects to print.", "warn");
        return;
      }

      const groupByCust = document.getElementById('defect-group-cust')?.checked;
      if (groupByCust) {
          rows = [...rows].sort((a,b) => {
              const mA = (window.MACHINES_MAP && window.MACHINES_MAP[a.machine]) || {};
              const mB = (window.MACHINES_MAP && window.MACHINES_MAP[b.machine]) || {};
              const cA = a.customer || mA.customer || "—";
              const cB = b.customer || mB.customer || "—";
              const custCmp = cA.localeCompare(cB);
              return custCmp !== 0 ? custCmp : (a.machine||'').localeCompare(b.machine||'');
          });
      }

      const customerRowSpans = {};
      if (groupByCust) {
        let i = 0;
        while (i < rows.length) {
          const mObjI = (window.MACHINES_MAP && window.MACHINES_MAP[rows[i].machine]) || {};
          const custI = rows[i].customer || mObjI.customer || "—";
          let count = 1;
          for (let j = i + 1; j < rows.length; j++) {
            const mObjJ = (window.MACHINES_MAP && window.MACHINES_MAP[rows[j].machine]) || {};
            const custJ = rows[j].customer || mObjJ.customer || "—";
            if (custJ === custI) count++;
            else break;
          }
          customerRowSpans[i] = count;
          for (let k = i + 1; k < i + count; k++) customerRowSpans[k] = 0;
          i += count;
        }
      }

      const machineRowSpans = {};
      if (groupByCust) {
        let i = 0;
        while (i < rows.length) {
          const mObjI = (window.MACHINES_MAP && window.MACHINES_MAP[rows[i].machine]) || {};
          const custI = rows[i].customer || mObjI.customer || "—";
          const machI = rows[i].machine || "—";
          let count = 1;
          for (let j = i + 1; j < rows.length; j++) {
            const mObjJ = (window.MACHINES_MAP && window.MACHINES_MAP[rows[j].machine]) || {};
            const custJ = rows[j].customer || mObjJ.customer || "—";
            const machJ = rows[j].machine || "—";
            if (custJ === custI && machJ === machI) count++;
            else break;
          }
          machineRowSpans[i] = count;
          for (let k = i + 1; k < i + count; k++) machineRowSpans[k] = 0;
          i += count;
        }
      }

      const userName = localStorage.getItem('ft_user_name') || 'Administrator';
      const today = new Date().toLocaleDateString('en-GB'); // DD/MM/YYYY
      
      const defTypeFilter = document.getElementById('filter-defect-type')?.value || '';
      let reportTitle = "General Defects Report (GDR)";
      if (defTypeFilter === "Major") reportTitle = "Major Defects Report";
      if (defTypeFilter === "Telematics Alert") reportTitle = "Telematics Alert Report";

      let html = `
<!DOCTYPE html>
<html>
<head>
  <title>${reportTitle}</title>
  <style>
    body { font-family: sans-serif; font-size: 11px; color: #1e293b; padding: 20px; }
    .header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px; border-bottom: 1px solid #cbd5e1; padding-bottom: 10px; }
    .logo-container { display:flex; flex-direction:column; gap:4px; }
    .title-block { text-align: right; display:flex; flex-direction:column; gap:10px; align-items:flex-end; }
    .title { font-size: 18px; font-weight: 400; color: #000; }
    .eff-pill { background: #000; color: #fff; padding: 4px; font-weight: bold; font-size: 10px; display: flex; border:1px solid #000; }
    .eff-pill span { background: #fff; color: #000; padding: 2px 6px; margin-left: 4px; }
    .meta-table { width: 300px; margin-bottom: 20px; font-size: 11px; color: #64748b; }
    .meta-table td { padding: 4px 0; }
    .meta-table strong { color: #1e293b; font-weight: 400; }
    table.dbr-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    .dbr-table th, .dbr-table td { border-bottom: 1px solid #cbd5e1; padding: 8px 6px; vertical-align: top; text-align: left; }
    .dbr-table th { background: #E53935; color: #fff; font-weight: bold; border: none; font-size:11px; }
    .sig-table { width: 100%; border-collapse: collapse; text-align: left; margin-top: 40px; }
    .sig-table th { background: #E53935; color: #fff; padding: 6px; font-weight: bold; border: 1px solid #E53935; font-size:11px; text-align:center; }
    .sig-table td { padding: 25px 6px; border: 1px solid #E53935; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; padding: 0; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo-container">
      <img src="${window.location.origin}${window.location.pathname.replace('index.html', '')}../../assets/images/omnis-logo.png" style="height:35px;" onerror="this.style.display='none'" />
      ${window.currentDivision === 'sinopower' 
        ? '<img src="' + window.location.origin + window.location.pathname.replace('index.html', '') + '../../assets/images/SPZ Full Logo (White)@3x.png" style="height:25px; filter:invert(1);" onerror="this.style.display=\'none\'" />'
        : '<img src="' + window.location.origin + window.location.pathname.replace('index.html', '') + '../../assets/images/fleetrack-logo.png" style="height:15px;" onerror="this.style.display=\'none\'" />'}
    </div>
    <div class="title-block">
      <div class="title">${reportTitle}</div>
      <div class="eff-pill">% Efficiency <span>100.0%</span></div>
    </div>
  </div>
  <table class="meta-table">
    <tr><td style="color:#94a3b8;">Prepared<br>by</td><td><strong>${userName}</strong></td></tr>
    <tr><td style="color:#94a3b8;">Date</td><td><strong>${today}</strong></td></tr>
  </table>
  <table class="dbr-table">
    <thead>
      <tr>
        <th>Customer</th>
        <th>Machine</th>
        <th>Reported Date</th>
        <th>Defect</th>
        <th>Parts ETA</th>
        <th>TED</th>
        <th>RED</th>
        <th>Status</th>
        <th style="text-align:center;">Defect Days</th>
      </tr>
    </thead>
    <tbody>
`;

      rows.forEach((r, idx) => {
         const mObj = (window.MACHINES_MAP && window.MACHINES_MAP[r.machine]) || {};
         const rawDate = r.start_date || r.creation || "";
         const date = rawDate ? new Date(rawDate.split(" ")[0]).toLocaleDateString('en-GB') : "—";
         const partsEta = (r.parts_eta && r.parts_eta.trim() !== '') ? new Date(r.parts_eta.split(" ")[0]).toLocaleDateString('en-GB') : "";
         const ted = (r.ted_status === 'TBA') ? 'TBA' : (r.ted ? new Date(r.ted.split(" ")[0]).toLocaleDateString('en-GB') : "TBA");
         const red = (r.red && r.red.trim() !== '') ? new Date(r.red.split(" ")[0]).toLocaleDateString('en-GB') : "";
         
         let daysOnBreakdown = 0;
         if (r.start_date) {
             const start = new Date(r.start_date.split(" ")[0]);
             const end = (r.end_date && r.end_date.trim() !== '') ? new Date(r.end_date.split(" ")[0]) : new Date();
             const diff = Math.floor((end - start) / (1000 * 60 * 60 * 24));
             daysOnBreakdown = diff >= 0 ? diff : 0;
         }

         const customer = r.customer || mObj.customer || "—";
         const ref = r.customer_ref || mObj.customer_ref || ""; 
         const region = r.region || mObj.region || "";

         const model = r.model || mObj.model || "—";
         const sn = r.machine || mObj.sn || mObj.machine_sn || "";
         const fleetNo = r.fleet_no || mObj.fleet_no || mObj.mxg_fleet_no || "";
         const hmr = r.current_hmr || mObj.current_hmr || "";
         const warranty = r.warranty_status || mObj.warranty_status || "";

         let statusStr = safeText(r.status || "—");
         if (r.quotation_sent_date && statusStr.indexOf("Quote sent") === -1) {
             statusStr = `Quote sent ${new Date(r.quotation_sent_date.split(" ")[0]).toLocaleDateString('en-GB')}<br>` + statusStr;
         }

         let custHtml = "";
         if (groupByCust) {
           if (customerRowSpans[idx] > 0) {
             custHtml = `<td rowspan="${customerRowSpans[idx]}" style="vertical-align:middle; text-align:center; border-right:1px solid #cbd5e1;">
               <div style="font-weight:400;color:#000;">${safeText(customer)}</div>
               ${ref ? `<div style="font-size:10px;color:#64748b;margin-top:2px;">Ref ▶ <strong>${safeText(ref)}</strong></div>` : ''}
               ${region ? `<div style="font-size:10px;color:#64748b;margin-top:2px;">📍 ${safeText(region)}</div>` : ''}
             </td>`;
           }
         } else {
             custHtml = `<td style="vertical-align:middle; text-align:center;">
               <div style="font-weight:400;color:#000;">${safeText(customer)}</div>
               ${ref ? `<div style="font-size:10px;color:#64748b;margin-top:2px;">Ref ▶ <strong>${safeText(ref)}</strong></div>` : ''}
               ${region ? `<div style="font-size:10px;color:#64748b;margin-top:2px;">📍 ${safeText(region)}</div>` : ''}
             </td>`;
         }

         let machHtml = "";
         const machineInnerHtml = `
                <div style="font-weight:400;color:#000;">${safeText(model)}</div>
                ${sn ? `<div style="font-size:10px;color:#64748b;margin-top:2px;">SRN ▶ <strong>${safeText(sn)}</strong></div>` : ''}
                ${fleetNo ? `<div style="font-size:10px;color:#64748b;margin-top:2px;">Fleet No ▶ <strong>${safeText(fleetNo)}</strong></div>` : ''}
                ${hmr ? `<div style="font-size:10px;color:#64748b;margin-top:2px;">Current HMR ▶ <strong>${safeText(hmr)}</strong></div>` : ''}
                ${warranty ? `<div style="font-size:9px;color:#0f172a;font-weight:bold;margin-top:4px;background:#f1f5f9;display:inline-block;padding:2px 4px;border-radius:2px;">${safeText(warranty)}</div>` : ''}
         `;
         
         if (groupByCust) {
            if (machineRowSpans[idx] > 0) {
               machHtml = `<td rowspan="${machineRowSpans[idx]}" style="vertical-align:middle; border-right:1px solid #cbd5e1;">${machineInnerHtml}</td>`;
            }
         } else {
            machHtml = `<td>${machineInnerHtml}</td>`;
         }

         html += `
           <tr>
             ${custHtml}
             ${machHtml}
             <td>${date}</td>
             <td>${safeText(r.description) || "—"}</td>
             <td>${partsEta}</td>
             <td>${ted}</td>
             <td>${red}</td>
             <td>${statusStr}</td>
             <td style="text-align:center;">${daysOnBreakdown}</td>
           </tr>
         `;
      });

      html += `
    </tbody>
  </table>
  <table class="sig-table">
    <tr><th colspan="5" style="border:none; text-align:center; padding:8px;">Signatures</th></tr>
    <tr>
      <th>FT Controller</th>
      <th>CSD Supervisor</th>
      <th>CSD Manager</th>
      <th>SRD Representative</th>
      <th>MD</th>
    </tr>
    <tr>
      <td></td><td></td><td></td><td></td><td></td>
    </tr>
  </table>
</body>
</html>
`;

      const printWin = window.open('', '_blank');
      printWin.document.write(html);
      printWin.document.close();
      printWin.focus();
      setTimeout(() => {
        printWin.print();
        printWin.close();
      }, 500);
    }

    // ---------------------------
    // Live Filtering Setup
    // ---------------------------
    function setupDbrLiveFilters() {
      const region = document.getElementById('dbr-filter-region');
      const customer = document.getElementById('dbr-filter-customer');
      const machine = document.getElementById('dbr-filter-machine');
      const resp = document.getElementById('dbr-filter-responsibility');
      const urgent = document.getElementById('dbr-filter-urgent');
      const closed = document.getElementById('dbr-filter-closed');

      let debounceTimer;
      const debouncedLoad = () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          loadDailyBreakdownReport();
        }, 500);
      };

      if (region) region.addEventListener('change', () => loadDailyBreakdownReport());
      if (resp) resp.addEventListener('change', () => loadDailyBreakdownReport());
      if (urgent) urgent.addEventListener('change', () => loadDailyBreakdownReport());
      if (closed) closed.addEventListener('change', () => loadDailyBreakdownReport());

      if (customer) customer.addEventListener('input', debouncedLoad);
      if (machine) machine.addEventListener('input', debouncedLoad);
    }

    // Initialize live filters
    setupDbrLiveFilters();

    function kvGrid(items) {
      const rows = items.map(([k, v]) => `
      <div style="display:flex;flex-direction:column;gap:4px;min-width:200px;flex:1 1 200px;">
      <div style="font-size:11px;color:var(--text-muted);font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">${k}</div>
      <div style="font-size:14px;font-weight:500;color:var(--text-main);word-break:break-word;">
        ${safeText(v) || "—"}
      </div>
    </div>
      `).join("");

      return `<div style="display:flex;flex-wrap:wrap;gap:20px 16px;padding:4px 0;">${rows}</div>`;
    }

    function sectionBlock(title, innerHtml, open) {
      const id = "sec_" + Math.random().toString(16).slice(2);
      return `
      <div style="background:var(--bg-card);border:1px solid var(--glass-border);border-radius:8px;overflow:hidden;box-shadow:0 1px 2px rgba(0,0,0,0.02);">
      <div style="padding:12px 16px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;background:rgba(255,255,255,0.01);"
        onclick="(function(){var b=document.getElementById('${id}');var i=document.getElementById('${id}_i'); if(!b) return; var isOpen=b.dataset.open==='1'; b.dataset.open=isOpen?'0':'1'; b.style.display=isOpen?'none':'block'; if(i) i.innerHTML=isOpen?'<span style=\\'font-size:16px\\'>+</span>':'<span style=\\'font-size:16px\\'>−</span>'; })();">
        <div style="font-size:14px;font-weight:600;color:var(--text-main);">${title}</div>
        <div id="${id}_i" style="color:var(--text-muted);display:flex;align-items:center;justify-content:center;">${open ? "<span style='font-size:16px'>−</span>" : "<span style='font-size:16px'>+</span>"}</div>
      </div>
      <div id="${id}" data-open="${open ? '1' : '0'}" style="display:${open ? 'block' : 'none'};padding:16px;border-top:1px solid var(--glass-border);">
        ${innerHtml}
      </div>
    </div>
      `;
    }

    window.openMachineModal = async function(name) {
      console.log("[MachineModal] Attempting to open:", name);
      if (!name) return;

      // Defensive retrieval of elements
      const overlay = window.mcModalOverlay || document.getElementById("mc-modal-overlay");
      const titleEl = window.mcTitle || document.getElementById("mc-title");
      const subEl = window.mcSubtitle || document.getElementById("mc-subtitle");
      const bodyEl = window.mcBody || document.getElementById("mc-body");

      if (!overlay) {
        console.error("[MachineModal] Fatal: mc-modal-overlay not found in DOM");
        return;
      }

      console.log("[MachineModal] Overlay found. Current state:", overlay.classList.contains("hidden") ? "Hidden" : "Visible");
      
      // Force visibility
      overlay.classList.remove("hidden");
      overlay.style.setProperty("display", "flex", "important");
      overlay.style.zIndex = "9000"; 
      
      if (titleEl) titleEl.textContent = name;
      if (subEl) subEl.textContent = "Loading machine…";
      if (bodyEl) bodyEl.innerHTML = `<div style="font-size:12px;color:var(--text-muted);padding:40px;text-align:center;">
        <span class="omnis-spinner-ring" style="width:24px;height:24px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:12px;"></span> Loading Machine Details...
      </div>`;

      try {
        console.log("[MachineModal] Fetching data for:", name);
        let doc = FT_MACHINE_DETAIL_CACHE[name];
        if (!doc) {
          // PRIMARY: read from Supabase data already in memory (MACHINES_MAP is populated
          // from ft_machine on every register load — this is always authoritative).
          const supabaseRow = window.MACHINES_MAP && window.MACHINES_MAP[name];
          if (supabaseRow && supabaseRow.name) {
            // Merge Supabase library URLs into the doc if available
            const libUrls = (window.LIB_SUPABASE_MAP && window.LIB_SUPABASE_MAP[name]) || {};
            doc = Object.assign({}, supabaseRow, { _libUrls: libUrls });
            FT_MACHINE_DETAIL_CACHE[name] = doc;
          } else {
            // FALLBACK: fetch from Frappe (machine not yet synced to Supabase)
            const raw = await callFrappe(FT_MACHINE_DETAIL_METHOD, { name: name });
            if (raw.exc || raw.exception || raw.error) throw new Error(raw.exc || raw.exception || raw.error || "Failed to load machine doc");
            doc = raw.message || raw.data || raw;
            if (doc && doc.name) {
              FT_MACHINE_DETAIL_CACHE[name] = doc;
            } else {
              throw new Error("Machine not found");
            }
          }
        }
        
        // Store current machine for action buttons
        window.MC_CURRENT_MACHINE = doc;

        const headerLine = [
          safeText(doc.model),
          safeText(doc.oem),
          safeText(doc.type),
          safeText(doc.customer)
        ].filter(Boolean).join(" · ");

        if (mcTitle) mcTitle.textContent = `${safeText(doc.model) || name} `;
        if (mcSubtitle) mcSubtitle.textContent = headerLine || name;

        const picUrl = machineAttachmentLink(doc.machine_picture);

        const top = `
      <div style="display:grid;grid-template-columns:240px minmax(0,1fr);gap:12px;align-items:start;margin-bottom:12px;">
      <div style="background:var(--bg-card);border:1px solid var(--glass-border);border-radius:16px;overflow:hidden;">
        <div style="padding:10px 12px;border-bottom:1px solid var(--glass-border);font-size:12px;font-weight:700;color:var(--text-main);">Machine</div>
        <div style="padding:10px 12px;">
          <div
            style="width:100%;height:180px;border-radius:14px;overflow:hidden;background:var(--bg-main);border:1px solid var(--glass-border);display:flex;align-items:center;justify-content:center;">
            ${renderMachineImageHtml(picUrl, '100%', '14px')}
          </div>
          <div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:6px;">
            <span class="tag-pill">Region: ${safeText(doc.region) || "—"}</span>
            <span class="tag-pill">Location: ${safeText(doc.location) || "—"}</span>
            <span class="tag-pill">Warranty: ${safeText(doc.warranty_status) || "—"}</span>
          </div>
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:0;min-height:450px;">
        <div class="mc-tabs-nav" style="display:flex;gap:8px;margin-bottom:12px;border-bottom:1px solid var(--glass-border);padding-bottom:10px;">
          <button class="mc-tab-btn active" onclick="window.mcSwitchTab(event, 'overview')" style="padding:6px 12px;font-size:12px;font-weight:600;border:none;border-radius:6px;cursor:pointer;background:var(--brand-primary, #ef4444);color:#fff;">Overview & Specs</button>
          <button class="mc-tab-btn" onclick="window.mcSwitchTab(event, 'service')" style="padding:6px 12px;font-size:12px;font-weight:600;border:none;border-radius:6px;cursor:pointer;color:var(--text-muted);background:transparent;">Service & HMR</button>
          <button class="mc-tab-btn" onclick="window.mcSwitchTab(event, 'warranty')" style="padding:6px 12px;font-size:12px;font-weight:600;border:none;border-radius:6px;cursor:pointer;color:var(--text-muted);background:transparent;">Warranty & Parts</button>
          <button class="mc-tab-btn" onclick="window.mcSwitchTab(event, 'library')" style="padding:6px 12px;font-size:12px;font-weight:600;border:none;border-radius:6px;cursor:pointer;color:var(--text-muted);background:transparent;">Library & Notes</button>
        </div>
      `;

        
        let mcBodyHtml = "";

        if (window.currentDivision === 'sinopower') {
          const docHeader = sectionBlock("Document Header", kvGrid([
            ["On Powertrack?", doc.on_powertrack || "Yes"],
            ["PTZ Supplied", doc.ptz_supplied || "Yes"],
            ["Client", doc.customer],
            ["Handover Date", doc.handover_date],
            ["Service Branch", doc.service_branch || "Harare"],
            ["Region", doc.region],
            ["Client Name", doc.customer],
            ["Customer Fleet No.", doc.mxg_fleet_no || doc.fleet_no],
          ]), true);

          const truckDetails = sectionBlock("Truck Details", kvGrid([
            ["Service Tracking Metric", doc.service_tracking_metric || "Mileage"],
            ["Make", doc.make || "PowerSeries"],
            ["Location", doc.location],
            ["LBZ", doc.lbz],
            ["Engine Type", doc.engine_type],
            ["OEM Registered?", doc.oem_registered || "Not Specified"],
            ["Total Running", doc.total_running_hours],
            ["Type", doc.type],
            ["Fleet No", doc.fleet_no],
            ["Model", doc.model],
            ["Reg Number", doc.reg_number || doc.chassis_number],
          ]), true);

          const customerFile = sectionBlock("Customer File", kvGrid([
            ["Prepare Welcome Report", doc.prepare_welcome_report || "N/A"],
            ["Welcome Report Status", doc.welcome_report_status || "PENDING"],
          ]), true);

          const logging = sectionBlock("Logging", kvGrid([
            ["Current Reading", doc.current_hmr],
            ["Last Reading Date", doc.last_hmr_date],
            ["Last Log", doc.last_hmr_log],
            ["Initial Reading", doc.starting_hmr],
            ["Days Since", doc.days_since_last_hmr],
          ]), true);

          const initialService = sectionBlock("Initial Service", kvGrid([
            ["Track initial Service", doc.track_initial_service || "No"],
            ["Initial Service Type", doc.initial_service_type],
            ["Initial Service Status", doc.initial_service_status || "Pending"],
          ]), true);

          const serviceDetails = sectionBlock("Service Details", kvGrid([
            ["Last Service Date", doc.last_service_date],
            ["Service Interval", doc.service_interval_hours],
            ["Last Service Reading", doc.last_service_hmr],
            ["Last Service Type", doc.last_service_type],
            ["Next Service Reading", doc.next_service_hmr],
            ["Next Service Type", doc.next_service_type],
            ["Reading to Service", doc.hours_remaining_to_service],
          ]), true);

          const warrantyDetails = sectionBlock("Warranty Details", kvGrid([
            ["Warranty Status", doc.warranty_status || "Under Warranty"],
            ["OEM Ref Number", doc.oem_ref_number],
            ["Warranty Type", doc.warranty_type],
            ["Warranty Duration (Months)", doc.warranty_period || 0],
            ["Expiry Date", doc.expiry_date],
            ["Expiry Reading", doc.expiry_reading || 0],
          ]), true);

          const fileLibrary = sectionBlock("File Library", kvGrid([
            ["Compatible GET", doc.compatible_get],
            ["Wty. Certificate", doc.wty_certificate ? `<a href="${machineAttachmentLink(doc.wty_certificate)}" target="_blank">Attach</a>` : ""],
            ["PDI Checklist", doc.pdi_checklist ? `<a href="${machineAttachmentLink(doc.pdi_checklist)}" target="_blank">Attach</a>` : ""],
            ["Truck Data Plate", doc.machine_data_plate ? `<a href="${machineAttachmentLink(doc.machine_data_plate)}" target="_blank">Attach</a>` : ""],
            ["Lube Types", doc.lube_types],
            ["Belt Dimensions", doc.belt_dimensions ? `<a href="${machineAttachmentLink(doc.belt_dimensions)}" target="_blank">Attach</a>` : ""],
            ["HYD Filters Dimensions", doc.hyd_filters_dimensions ? `<a href="${machineAttachmentLink(doc.hyd_filters_dimensions)}" target="_blank">Attach</a>` : ""],
            ["Engine Data Plate", doc.engine_data_plate ? `<a href="${machineAttachmentLink(doc.engine_data_plate)}" target="_blank">Attach</a>` : ""],
            ["Filters List", doc.filters_list ? `<a href="${machineAttachmentLink(doc.filters_list)}" target="_blank">Attach</a>` : ""],
            ["NEI Checklist", doc.nei_checklist ? `<a href="${machineAttachmentLink(doc.nei_checklist)}" target="_blank">Attach</a>` : ""],
            ["Equipment Information Form", doc.equipment_information_form ? `<a href="${machineAttachmentLink(doc.equipment_information_form)}" target="_blank">Attach</a>` : ""],
          ]), true);

          const notes = sectionBlock("Notes", `
      <div style="padding:4px 0;">
        <div style="font-size:14px;font-weight:500;color:var(--text-main);white-space:pre-wrap;word-break:break-word;">
          ${safeText(doc.notes) || "—"}
        </div>
      </div>
      `, true);

          mcBodyHtml = `
          <div id="mc-pane-overview" class="mc-tab-pane" style="display:flex;flex-direction:column;gap:10px;">
            ${docHeader}
            ${customerFile}
            ${truckDetails}
          </div>
          <div id="mc-pane-service" class="mc-tab-pane" style="display:none;flex-direction:column;gap:10px;">
            ${logging}
            ${initialService}
            ${serviceDetails}
          </div>
          <div id="mc-pane-warranty" class="mc-tab-pane" style="display:none;flex-direction:column;gap:10px;">
            ${warrantyDetails}
          </div>
          <div id="mc-pane-library" class="mc-tab-pane" style="display:none;flex-direction:column;gap:10px;">
            ${fileLibrary}
            ${notes}
          </div>
          `;

        } else {
          const machineDetails = sectionBlock("Machine Details", kvGrid([
                ["Name", doc.name],
                ["Customer", doc.customer],
                ["Fleet No.", doc.mxg_fleet_no || doc.fleet_no],
                ["SN", doc.sn],
                ["ESN", doc.esn],
                ["Chassis Number", doc.chassis_number],
                ["Has Telematics?", doc.has_telematics_device],
                ["Telematics Params", doc.enabled_parameters],
                ["Engine Type", doc.engine_type],
                ["Operating Weight (t)", doc.operating_weight],
                ["Bin Capacity (m3)", doc.bin_capacity],
                ["Std Fuel Cons (L/hr)", doc.standard_fuel_consumption],
                ["Working Voltage", doc.working_voltage],
                ["Tyre Size", doc.tyre_size],
                ["Unique Attachments", doc.unique_attachments_fitted],
                ["Mobility", doc.mobility],
              ]), true);

          const warrantyDetails = sectionBlock("Warranty Details", kvGrid([
                ["Warranty Status", doc.warranty_status],
                ["Warranty Type", doc.warranty_type],
                ["Period (Months)", doc.warranty_period],
                ["Handover Date", doc.handover_date],
                ["Expiry Date", doc.expiry_date],
                ["Warranty Hours", doc.warranty_hours],
              ]), true);

          const hmr = sectionBlock("HMR", kvGrid([
                ["Starting HMR", doc.starting_hmr],
                ["Last HMR Date", doc.last_hmr_date],
                ["Last Log", doc.last_hmr_log],
                ["Current HMR", doc.current_hmr],
                ["Total Running Hours", doc.total_running_hours],
                ["Days Since", doc.days_since_last_hmr],
              ]), true);

          const initialService = sectionBlock("Initial Service Tracking", kvGrid([
            ["Track Initial Service?", doc.track_initial_service],
            ["Initial Service Type", doc.initial_service_type],
            ["Initial Service Status", doc.initial_service_status],
          ]), true);

          const service = sectionBlock("Service Configuration", kvGrid([
            ["Service Obligation", doc.service_obligation],
            ["Service Interval (hrs)", doc.service_interval_hours],
            ["Last Service Date", doc.last_service_date],
            ["Last Service HMR", doc.last_service_hmr],
            ["Last Service Type", doc.last_service_type],
            ["Next Service HMR", doc.next_service_hmr],
            ["Next Service Type", doc.next_service_type],
            ["Hours to Service", doc.hours_remaining_to_service],
          ]), true);

          const underCarriage = sectionBlock("Under Carriage & Specs", kvGrid([
            ["Chain Make", doc.chain_make],
            ["Chain Length", doc.chain_length],
            ["Chain Width", doc.chain_width],
            ["Sprocket LHS Teeth", doc.sproket_lhs_teeth],
            ["Sprocket RHS Teeth", doc.sproket_rhs_teeth],
          ]), true);

          const consumables = sectionBlock("Consumables (Filters & Lubes)", `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px 16px;padding:4px 0;">
          <div style="display:flex;flex-direction:column;gap:4px;">
            <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;">Filters List</div>
            <div style="font-size:14px;font-weight:500;color:var(--text-main);white-space:pre-wrap;word-break:break-word;">
              ${safeText(doc.filters_list) || "—"}
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:4px;">
            <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;">Lube Types</div>
            <div style="font-size:14px;font-weight:500;color:var(--text-main);white-space:pre-wrap;word-break:break-word;">
              ${safeText(doc.lube_types) || "—"}
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:4px;">
            <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;">Belt Dimensions</div>
            <div style="font-size:14px;font-weight:500;color:var(--text-main);white-space:pre-wrap;word-break:break-word;">
              ${safeText(doc.belt_dimensions) || "—"}
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:4px;">
            <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;">Hydraulic Filters</div>
            <div style="font-size:14px;font-weight:500;color:var(--text-main);white-space:pre-wrap;word-break:break-word;">
              ${safeText(doc.hyd_filters_dimensions) || "—"}
            </div>
          </div>
        </div>
        `, true);

        const notes = sectionBlock("Notes", `
      <div style="padding:4px 0;">
        <div style="font-size:14px;font-weight:500;color:var(--text-main);white-space:pre-wrap;word-break:break-word;">
          ${safeText(doc.notes) || "—"}
        </div>
      </div>
      `, true);

        const libLinks = [
          ["PDI Checklist", doc.pdi_checklist],
          ["Equipment Info Form", doc.equipment_information_form],
          ["Wty. Certificate", doc.wty_certificate],
          ["NEI Checklist", doc.nei_checklist],
          ["Machine Data Plate", doc.machine_data_plate],
          ["Engine Data Plate", doc.engine_data_plate],
          ["RPC List", doc.rpc_list],
          ["Parts Manuals", doc.parts_manuals],
          ["Parts Manuals 2", doc.parts_manuals_2],
          ["Parts Manuals 3", doc.parts_manuals_3],
          ["Misc Files", doc.misc_files],
        ];

        const libHtml = libLinks.map(([label, url], idx) => {
          const fieldKey = [
            'pdi_checklist','equipment_information_form','wty_certificate',
            'nei_checklist','machine_data_plate','engine_data_plate',
            'rpc_list','parts_manuals','parts_manuals_2','parts_manuals_3','misc_files'
          ][idx];
          const u = (window.getLibraryUrl && doc?.name)
            ? window.getLibraryUrl(doc.name, fieldKey, url)
            : machineAttachmentLink(url);
          const safeLabel = safeText(label);
          const safeUrl = u ? u.replace(/'/g, "\\'") : "";
          const isSupa = u && u.includes('supabase.co/storage');
          return `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;background:var(--bg-card);border:1px solid var(--glass-border);border-radius:12px;padding:8px 10px;">
      <div style="min-width:0;">
        <div style="font-size:12px;font-weight:600;">${safeLabel}</div>
        ${isSupa ? '<div style="font-size:9px;color:#10b981;font-weight:700;margin-top:1px;">☁ Supabase CDN</div>' : ''}
      </div>
      ${u
        ? `<button class="tiny-btn tiny-btn-primary" onclick="openLibraryViewer('${safeUrl}', '${safeLabel}')">Open</button>`
        : `<span style="font-size:11px;color:#6b7280;">—</span>`
      }
    </div>
      `;
        }).join("");

        const library = sectionBlock("Library", `
      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;">
        ${libHtml}
      </div>
      `, true);
          
          mcBodyHtml = `
          <div id="mc-pane-overview" class="mc-tab-pane" style="display:flex;flex-direction:column;gap:10px;">
            ${machineDetails}
          </div>
          <div id="mc-pane-service" class="mc-tab-pane" style="display:none;flex-direction:column;gap:10px;">
            ${hmr}
            ${initialService}
            ${service}
          </div>
          <div id="mc-pane-warranty" class="mc-tab-pane" style="display:none;flex-direction:column;gap:10px;">
            ${warrantyDetails}
            ${underCarriage}
            ${consumables}
          </div>
          <div id="mc-pane-library" class="mc-tab-pane" style="display:none;flex-direction:column;gap:10px;">
            ${notes}
            ${library}
          </div>
          `;
        }

        if (mcBody) {
          window.mcSwitchTab = function(event, tabId) {
            document.querySelectorAll('.mc-tab-pane').forEach(el => el.style.display = 'none');
            document.querySelectorAll('.mc-tab-btn').forEach(el => {
              el.classList.remove('active');
              el.style.background = 'transparent';
              el.style.color = 'var(--text-muted)';
            });
            document.getElementById('mc-pane-' + tabId).style.display = 'flex';
            if (event && event.currentTarget) {
              event.currentTarget.classList.add('active');
              event.currentTarget.style.background = 'var(--brand-primary, #ef4444)';
              event.currentTarget.style.color = '#fff';
            }
          };

          mcBody.innerHTML = `
    ${top}
      ${mcBodyHtml}
    </div> <!-- Close the right column -->
    </div> <!-- Close the grid -->
    `;
        }


      } catch (e) {
        console.error("openMachineModal error:", e);
        if (window.mcSubtitle) window.mcSubtitle.textContent = "Failed to load machine";
        if (window.mcBody) window.mcBody.innerHTML = `<div style="font-size:12px;color:#b91c1c;">${safeText(e.message || e)}</div>`;
      }
    }

    function closeMachineModal() {
      if (window.mcModalOverlay) window.mcModalOverlay.classList.add("hidden");
    }

    if (window.mcClose) window.mcClose.addEventListener("click", closeMachineModal);
    if (mcModalOverlay) {
      mcModalOverlay.addEventListener("click", (e) => {
        if (e.target === mcModalOverlay) closeMachineModal();
      });
    }

    if (btnMachineRefresh) btnMachineRefresh.addEventListener("click", () => loadFtMachineRegister());

    if (machineSearchInput) {
      machineSearchInput.addEventListener("input", () => {
        FT_MACHINE_LAST_QUERY = safeText(machineSearchInput.value);
        renderMachineRegisterByRegion(FT_MACHINE_ROWS, FT_MACHINE_LAST_QUERY);
      });
    }

    function setAllRegionSections(open) {
      if (!machineRegionWrap) return;
      machineRegionWrap.querySelectorAll(".region-body").forEach(b => {
        b.dataset.open = open ? "1" : "0";
        b.style.display = open ? "block" : "none";
      });
      machineRegionWrap.querySelectorAll(".region-chevron").forEach(c => {
        c.textContent = open ? "▾" : "▸";
      });
    }

    if (btnMachineExpandAll) btnMachineExpandAll.addEventListener("click", () => setAllRegionSections(true));
    if (btnMachineCollapseAll) btnMachineCollapseAll.addEventListener("click", () => setAllRegionSections(false));

    // ---------------------------
    // Modal handlers
    // ---------------------------
    if (bdModalClose) bdModalClose.addEventListener("click", closeBreakdownModal);
    if (bdModalCancel) bdModalCancel.addEventListener("click", closeBreakdownModal);
    if (bdModalOverlay) {
      bdModalOverlay.addEventListener("click", (e) => {
        if (e.target === bdModalOverlay) closeBreakdownModal();
      });
    }

    if (bdModalSendApproval) {
      bdModalSendApproval.addEventListener("click", async () => {
        if (!bdModalCurrent) return;
        await sendBreakdownForApproval(bdModalCurrent);
      });
    }

    if (bdModalSave) {
      bdModalSave.addEventListener("click", async () => {
        if (!bdModalCurrent) { closeBreakdownModal(); return; }
        const newStatus = bdModalStatus.value;

        try {
          const url = FLEET_BASE_URL + FT_BREAKDOWN_UPDATE_METHOD;
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ name: bdModalCurrent.name, status: newStatus }),
          });

          const raw = await res.json().catch(() => ({}));
          if (!res.ok || raw.exc || raw.exception) {
            showToast("Could not update breakdown status.", "err", 4500);
            return;
          }

          showToast("Breakdown updated: " + bdModalCurrent.name, "ok");
          await loadFtBreakdownDashboard();
          closeBreakdownModal();
        } catch (e) {
          console.error("Error updating breakdown:", e);
          showToast("Could not update breakdown.", "err", 4500);
        }
      });
    }

    if (bdTableBody) {
      bdTableBody.addEventListener("click", (e) => {
        const tr = e.target.closest("tr");
        if (!tr) return;
        const idx = Number(tr.dataset.index);
        if (!Number.isFinite(idx)) return;
        const row = FT_BREAKDOWN_ROWS_OPEN[idx];
        if (row) openBreakdownModal(row);
      });
    }

    if (breakdownLogTbody) {
      breakdownLogTbody.addEventListener("click", (e) => {
        const tr = e.target.closest("tr");
        if (!tr) return;
        const idx = Number(tr.dataset.index);
        if (!Number.isFinite(idx)) return;
        const row = FT_BREAKDOWN_ROWS_OPEN[idx];
        if (row) openBreakdownModal(row);
      });
    }

    // ---------------------------
    // Chat stub
    // ---------------------------
    function appendChatMessage(role, text) {
      if (!text) return;
      const wrapper = document.createElement("div");
      wrapper.className = "chat-message " + (role === "user" ? "user" : "assistant");
      const bubble = document.createElement("div");
      bubble.className = "chat-bubble";
      bubble.textContent = text;
      wrapper.appendChild(bubble);
      chatMessages.appendChild(wrapper);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function setChatStatus(text) { if (chatStatus) chatStatus.textContent = text || ""; }

    function sendChatStub() {
      const question = (chatInput.value || "").trim();
      if (!question) return;
      appendChatMessage("user", question);
      chatInput.value = "";
      chatInput.focus();
      setChatStatus("Thinking (stub)…");
      setTimeout(() => {
        appendChatMessage(
          "assistant",
          "This is a placeholder reply.\n\nOnce Omnis AI is wired for Fleetrack, I'll be able to answer with live data."
        );
        setChatStatus("");
      }, 600);
    }

    if (searchFab) {
      searchFab.addEventListener("click", (e) => {
        e.stopPropagation();
        window.electron.invoke("window:openAuxiliary", "systems/fleetrack/index.html");
      });
    }

    if (chatClose) chatClose.addEventListener("click", () => chatWidget.classList.add("hidden"));
    if (chatSend) chatSend.addEventListener("click", () => sendChatStub());
    if (chatInput) {
      chatInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          sendChatStub();
        }
      });
    }

    // ---------------------------
    // Navigation + primary action
    // ---------------------------

    // ---- Dropdown toggle (click-based) ----
    function toggleDropdown(e, menuId, triggerEl) {
      if (e && e.stopPropagation) e.stopPropagation();
      const menu = document.getElementById(menuId);
      if (!menu) return;
      const isOpen = menu.classList.contains('open');
      closeAllDropdowns();
      if (!isOpen) {
        menu.classList.add('open');
        if (triggerEl) triggerEl.closest('.top-nav-dropdown').classList.add('dd-open');
      }
    }
    function closeAllDropdowns() {
      document.querySelectorAll('.top-nav-dropdown-menu.open').forEach(m => m.classList.remove('open'));
      document.querySelectorAll('.top-nav-dropdown.dd-open').forEach(d => d.classList.remove('dd-open'));
    }
    // Close dropdowns when clicking outside the nav
    document.addEventListener('click', function(e) {
      if (!e.target.closest('.top-nav-dropdown')) closeAllDropdowns();
    });

    // ---- Active nav highlighting ----
    function updateNavActive(viewId) {
      // Clear ALL active states (both hardcoded 'active' and JS 'nav-active')
      document.querySelectorAll('.top-nav-item').forEach(el => {
        el.classList.remove('nav-active', 'active');
      });
      document.querySelectorAll('.top-nav-dropdown').forEach(el => {
        el.classList.remove('nav-active');
      });
      document.querySelectorAll('.top-nav-dropdown-item').forEach(el => {
        el.classList.remove('nav-active');
      });

      // Highlight matching top-level item
      const topItem = document.querySelector(`.top-nav-item[data-view="${viewId}"]`);
      if (topItem) {
        topItem.classList.add('nav-active');
        return;
      }
      // Highlight matching dropdown item + its parent trigger
      const ddItem = document.querySelector(`.top-nav-dropdown-item[data-view="${viewId}"]`);
      if (ddItem) {
        ddItem.classList.add('nav-active');
        const parentDD = ddItem.closest('.top-nav-dropdown');
        if (parentDD) parentDD.classList.add('nav-active');
      }
    }

    function openNewBreakdown() {
      window.open(FLEET_BASE_URL + "/app/ft-breakdown-log/new-ft-breakdown-log", "_blank");
    }

    function openNewJobCard() {
      window.open(FLEET_BASE_URL + "/app/ft-job-card/new-ft-job-card", "_blank");
    }

    function showView(viewId) {
      // Scroll to top when switching views
      const mainEl = document.querySelector('main.main');
      if (mainEl) mainEl.scrollTop = 0;
      window.scrollTo(0, 0);
      // Update active nav highlight
      updateNavActive(viewId);
      [
        viewDashboard,
        viewReports,
        viewBreakdowns,
        viewMachines,
        viewDefects,
        viewFsi,
        viewTechnicians,
        viewTeleHitachi,
        viewTeleShantui,
        viewTeleWirtgen,
        viewTeleBobcat,
        viewJobCards,
        viewAbout,
        viewSettings,
        viewLicensing,
        viewArchives,
        // Native standalone report views
        document.getElementById('view-rpt-machine-reg'),
        document.getElementById('view-rpt-due-service'),
        document.getElementById('view-rpt-gdr'),
        document.getElementById('view-rpt-sts'),
        document.getElementById('view-rpt-mwr'),
        document.getElementById('view-rpt-wwu'),
        document.getElementById('view-rpt-isr'),
        document.getElementById('view-customer-portal-admin'),
        document.getElementById('view-user-mgmt'),
        document.getElementById('view-customers'),
        document.getElementById('view-tech-hour-analytics'),
      ].forEach(v => v && v.classList.add("hidden"));

      // After-Sales Hub overlay — hide when switching away
      const asHub = document.getElementById('view-aftersales-hub');
      if (asHub) asHub.style.display = 'none';

      const mapping = {
        "view-dashboard": {
          el: viewDashboard,
          title: "Fleet dashboard",
          subtitle: "High-level view of machines, breakdowns and field jobs.",
          actionLabel: "New breakdown",
          action: openNewBreakdown,
        },
        "view-reports": {
          el: viewReports,
          title: "Reports",
          subtitle: "Run and share Fleetrack reports.",
          actionLabel: "Refresh Reports",
          action: () => {
            loadDailyBreakdownReport();
            loadMachineRegisterReport();
          },
        },
        "view-breakdowns": {
          el: viewBreakdowns,
          title: "Breakdown log",
          subtitle: "Full log of breakdowns captured in Fleetrack.",
          actionLabel: "New breakdown",
          action: openNewBreakdown,
        },
        "view-machines": {
          el: viewMachines,
          title: "Machine register",
          subtitle: "Master list of tracked machines (split by region).",
          actionLabel: "Refresh",
          action: () => loadFtMachineRegister(),
        },
        "view-defects": {
          el: viewDefects,
          title: "Defects",
          subtitle: "Monitor and resolve open defects.",
          actionLabel: "New defect",
          action: () => window.open(FLEET_BASE_URL + "/app/ft-defects-log/new-ft-defects-log", "_blank"),
        },
        "view-fsi": {
          el: viewFsi,
          title: "Field Service Planning",
          subtitle: "Plan and monitor field service jobs.",
          actionLabel: "New Plan",
          action: () => openFspModal(),
        },
        "view-customers": {
          el: document.getElementById("view-customers"),
          title: "Customers",
          subtitle: "Manage customer directory and contacts.",
          actionLabel: "Refresh",
          action: () => loadFtCustomers(),
        },
        "view-technicians": {
          el: viewTechnicians,
          title: "Technician Management",
          subtitle: "Manage your field service technicians and their contact details.",
          actionLabel: "Refresh",
          action: () => loadTechniciansView(),
        },
                "view-tech-hour-analytics": {
          el: document.getElementById('view-tech-hour-analytics'),
          title: "Technician Hour Analytics",
          subtitle: "Historical hour logs and KPIs grouped by technician.",
          actionLabel: "Refresh",
          action: () => loadTechHourAnalytics(),
        },
        "view-telematics-hitachi": {
          el: viewTeleHitachi,
          title: "Telematics – Hitachi",
          subtitle: "Hitachi machines telematics overview.",
          actionLabel: "Refresh",
          action: () => hitachiRefreshSnapshot("manual"),
        },
        "view-telematics-shantui": {
          el: viewTeleShantui,
          title: "Telematics – Shantui",
          subtitle: "Shantui portal access (no embedded login automation).",
          actionLabel: "Open portal",
          action: () => openExternal(SHANTUI_PORTAL_URL),
        },
        "view-telematics-wirtgen": {
          el: viewTeleWirtgen,
          title: "Telematics – Wirtgen",
          subtitle: "Wirtgen machines telematics overview.",
          actionLabel: "Portal",
          action: () => showToast("Wirtgen portal wiring pending.", "warn"),
        },
        "view-telematics-bobcat": {
          el: viewTeleBobcat,
          title: "Telematics – Bobcat",
          subtitle: "Bobcat machines telematics overview.",
          actionLabel: "Portal",
          action: () => showToast("Bobcat portal wiring pending.", "warn"),
        },
        "view-job-cards": {
          el: document.getElementById("view-job-cards"),
          title: "Job Cards",
          subtitle: "Manage field service jobs and weekly reminders.",
          actionLabel: "Refresh",
          action: () => loadDailyJobCards(),
        },
        "view-about": {
          el: document.getElementById("view-about"),
          title: "About",
          subtitle: "System version and security patches.",
          actionLabel: "Support",
          action: () => window.open("mailto:support@omnis.ai", "_blank"),
        },
        "view-settings": {
          el: document.getElementById("view-settings"),
          title: "Settings",
          subtitle: "Customize your dashboard experience.",
          actionLabel: "Save",
          action: () => showToast("Settings updated locally.", "success"),
        },
        "view-licensing": {
          el: document.getElementById("view-licensing"),
          title: "Licensing",
          subtitle: "Enterprise license and usage agreement.",
          actionLabel: "Contact billing",
          action: () => window.open("mailto:billing@omnis.ai", "_blank"),
        },
        "view-archives": {
          el: viewArchives,
          title: "Report Archives",
          subtitle: "Search and download previously signed reports.",
          actionLabel: "Refresh",
          action: () => loadReportArchives(),
        },
        // ── Native standalone report views ──────────────────
        "view-rpt-machine-reg": {
          el: document.getElementById('view-rpt-machine-reg'),
          title: "FT Machine Register",
          subtitle: "Full fleet — all machines, HMR and warranty status.",
          actionLabel: "Refresh",
          action: () => loadRptMachineReg(),
        },
        "view-rpt-due-service": {
          el: document.getElementById('view-rpt-due-service'),
          title: "Machines Due for Service",
          subtitle: "Machines approaching or past scheduled service HMR.",
          actionLabel: "Refresh",
          action: () => loadRptDueService(),
        },
        "view-rpt-gdr": {
          el: document.getElementById('view-rpt-gdr'),
          title: "General Defects Report (GDR)",
          subtitle: "All open and in-progress defects across the fleet.",
          actionLabel: "Refresh",
          action: () => loadRptGdr(),
        },
        "view-rpt-sts": {
          el: document.getElementById('view-rpt-sts'),
          title: "Service Tracking Summary (STS)",
          subtitle: "All field service plans — status and scheduling overview.",
          actionLabel: "Refresh",
          action: () => loadRptSts(),
        },

        "view-rpt-mwr": {
          el: document.getElementById('view-rpt-mwr'),
          title: "Maintenance Warning Report (MWR)",
          subtitle: "Machines with pending maintenance warnings from HMR thresholds.",
          actionLabel: "Refresh",
          action: () => loadRptMwr(),
        },
        "view-rpt-wwu": {
          el: document.getElementById('view-rpt-wwu'),
          title: "Weekly Warranty Update (WWU)",
          subtitle: "Warranty status, expiry and handover dates for all managed machines.",
          actionLabel: "Refresh",
          action: () => loadRptWwu(),
        },
        "view-rpt-isr": {
          el: document.getElementById('view-rpt-isr'),
          title: "Initial Service Report (ISR)",
          subtitle: "Machines with no recorded last service — candidates for first scheduled service.",
          actionLabel: "Refresh",
          action: () => loadRptIsr(),
        },
        "view-customer-portal-admin": {
          el: document.getElementById('view-customer-portal-admin'),
          title: "Customer Portal Accounts",
          subtitle: "Create and manage customer portal access — machines, defects and reports.",
          actionLabel: "New Account",
          action: () => openPortalAccountModal(null),
        },
        "view-user-mgmt": {
          el: document.getElementById('view-user-mgmt'),
          title: "User Management",
          subtitle: "Create, suspend, reset passwords and delete Fleetrack user accounts.",
          actionLabel: "New User",
          action: () => openUserMgmtModal(),
        },
        "view-aftersales-hub": {
          el: null, // fixed overlay — handled separately below
          title: "After-Sales Hub",
          subtitle: "PSV and CDV visit logs from Salestrack.",
          actionLabel: "Refresh",
          action: () => window.ftAsLoad && window.ftAsLoad(),
        },
      };

      const cfg = mapping[viewId] || mapping["view-dashboard"];
      if (cfg.el) cfg.el.classList.remove("hidden");
      if (mainTitle) mainTitle.textContent = cfg.title;
      if (mainSubtitle) mainSubtitle.textContent = cfg.subtitle;

      try { 
        btnPrimaryAction.querySelector("span:nth-child(2)").textContent = cfg.actionLabel;
        btnPrimaryAction.onclick = cfg.action;
      } catch { }

      currentViewId = viewId;

      if (viewId === "view-breakdowns") {
        renderBreakdownLogTable(FT_BREAKDOWN_ROWS_OPEN);
      }

      if (viewId === "view-reports") {
        // Load DBR data from dedicated endpoint
        loadDailyBreakdownReport();
        // Load Machine Register report
        loadMachineRegisterReport();
      }

      if (viewId === "view-machines") {
        if (machineSearchInput) machineSearchInput.value = FT_MACHINE_LAST_QUERY || "";
        renderMachineRegisterByRegion(FT_MACHINE_ROWS, FT_MACHINE_LAST_QUERY);
        if (!FT_MACHINE_ROWS.length) loadFtMachineRegister();
      }

      if (viewId === "view-dashboard") {
        if (typeof loadDashboardKpisFromSupabase === 'function') loadDashboardKpisFromSupabase();
      }

      if (viewId === "view-telematics-hitachi") {
        if (!HITACHI_LAST_SNAPSHOT) hitachiRefreshSnapshot("auto-open");
      }

      if (viewId === "view-job-cards") {
        loadDailyJobCards();
      }

      if (viewId === "view-archives") {
        loadReportArchives();
      }

      if (viewId === "view-defects") {
        loadFtDefects();
      }

      if (viewId === "view-fsi") {
        loadFieldServicePlan();
      }

      if (viewId === "view-customers") {
        loadFtCustomers();
      }

      if (viewId === "view-technicians") {
        if (typeof loadTechniciansView === 'function') loadTechniciansView();
      }

      // ── Native report auto-load ──────────────────────────
      if (viewId === 'view-rpt-machine-reg') loadRptMachineReg();
      if (viewId === 'view-rpt-due-service') loadRptDueService();
      if (viewId === 'view-rpt-gdr')         loadRptGdr();
      if (viewId === 'view-rpt-sts')         loadRptSts();

      if (viewId === 'view-rpt-mwr')         loadRptMwr();
      if (viewId === 'view-rpt-wwu')         loadRptWwu();
      if (viewId === 'view-rpt-isr')         loadRptIsr();
      if (viewId === 'view-customer-portal-admin') {
        if (typeof loadPortalAccounts === 'function') loadPortalAccounts();
      }

      // After-Sales Hub overlay
      if (viewId === 'view-aftersales-hub') {
        const hub = document.getElementById('view-aftersales-hub');
        if (hub) hub.style.display = 'block';
        if (typeof window.ftAsLoad === 'function') window.ftAsLoad();
      }

      btnPrimaryAction.onclick = (e) => {
        e.preventDefault();
        if (cfg.action) cfg.action();
      };
    }

    document.querySelectorAll(".nav-item, .top-nav-item").forEach(item => {
      item.addEventListener("click", () => {
        if (item.id === "nav-logout") {
          doLogout();
          return;
        }
        const viewId = item.getAttribute("data-view");
        if (!viewId) return;
        document.querySelectorAll(".nav-item, .top-nav-item").forEach(el => el.classList.remove("active"));
        item.classList.add("active");
        showView(viewId);
      });
    });

    // ---------------------------
    // Button wiring: Shantui + Hitachi
    // ---------------------------
    if (btnShantuiOpen) btnShantuiOpen.addEventListener("click", () => openExternal(SHANTUI_PORTAL_URL));

    if (btnHitachiCred) btnHitachiCred.addEventListener("click", () => hitachiSetCredentialsInteractive());
    if (btnHitachiOpen) btnHitachiOpen.addEventListener("click", () => openExternal(HITACHI_PORTAL_URL));
    if (btnHitachiRefresh) btnHitachiRefresh.addEventListener("click", () => hitachiRefreshSnapshot("manual"));

    // ---------------------------
    // Boot
    // ---------------------------
    showView("view-dashboard");
    initHitachiSessionKeeper();

    // ... other boot sequence calls ...
    loadFtBreakdownDashboard();
    loadFtDefectsDashboard();
    loadDailyJobCards();
    // Set initial active nav state
    updateNavActive('view-dashboard');

    // Ensure modal init runs after DOM is ready
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initDbrEditModal);
    } else {
      initDbrEditModal();
    }


    // ---------------------------
    // Render Daily Breakdown Report (DBR)
    // ---------------------------

    function renderDailyBreakdownReport(rows, skipStateUpdate = false) {
      const tbody = document.querySelector("#dbr-table tbody");
      if (!tbody) return;
      tbody.innerHTML = "";

      if (!skipStateUpdate) {
        CURRENT_DBR_ROWS = rows || [];
      } else {
        // If sorting, rows are passed in sorted, but maintain reference if needed or just use input
        // In sortDbrData we pass CURRENT_DBR_ROWS which is already sorted in place
      }

      // Use local reference for rendering
      const dataToRender = skipStateUpdate ? rows : CURRENT_DBR_ROWS;

      if (!dataToRender || dataToRender.length === 0) {
        tbody.innerHTML = `
        <tr>
      <td colspan="9" style="padding:16px;text-align:center;color:#64748b;">
        No breakdowns found for this filter.
      </td>
    </tr>
      `;
        return;
      }

      // Update KPI Cards
      const totalBd = dataToRender.length;
      let totalDays = 0;
      let urgentCount = 0;
      dataToRender.forEach(r => {
        totalDays += (parseInt(r.days_on_bd) || 0);
        if (r.urgent) urgentCount++;
      });
      const avgDays = totalBd > 0 ? (totalDays / totalBd).toFixed(1) : 0;
      
      const elTotal = document.getElementById('dbr-kpi-total');
      const elAvg = document.getElementById('dbr-kpi-avg-days');
      const elUrgent = document.getElementById('dbr-kpi-urgent');
      if (elTotal) elTotal.textContent = totalBd;
      if (elAvg) elAvg.textContent = avgDays;
      if (elUrgent) elUrgent.textContent = urgentCount;

      const isGrouped = document.getElementById("dbr-group-customer")?.checked;
      if (isGrouped) {
          dataToRender.sort((a,b) => (a.customer||'').localeCompare(b.customer||''));
      }

      // Slice for pagination
      const startIndex = (DBR_PAGE - 1) * DBR_PAGE_SIZE;
      const paginatedData = dataToRender.slice(startIndex, startIndex + DBR_PAGE_SIZE);

      const customerRowSpans = {};
      if (isGrouped) {
          let i = 0;
          while (i < paginatedData.length) {
              const cust = paginatedData[i].customer || 'Unknown Customer';
              let count = 1;
              for (let j = i + 1; j < paginatedData.length; j++) {
                  if ((paginatedData[j].customer || 'Unknown Customer') === cust) count++;
                  else break;
              }
              customerRowSpans[i] = count;
              for (let k = i + 1; k < i + count; k++) customerRowSpans[k] = 0;
              i += count;
          }
      }

      paginatedData.forEach((row, i) => {
        const index = startIndex + i;
        const tr = document.createElement("tr");
        tr.style.cssText = "border-bottom:1px solid #e5e7f0;";

        const mObj = window.MACHINES_MAP?.[row.machine] || {};

        const customer = row.customer || mObj.customer || "—";
        const cRefStr = safeText(row.customer_ref || mObj.customer_ref);
        const cRegionStr = safeText(row.region || mObj.region);

        const customerRef = cRefStr ? `<div style="font-size:10px;color:var(--text-muted);">Ref: <strong>${cRefStr}</strong></div>` : "";
        const region = cRegionStr ? `<div style="font-size:10px;color:var(--text-muted);">${cRegionStr}</div>` : "";

        const machine = row.model || mObj.model || "—";
        const snStr = safeText(row.serial_number || row.machine || mObj.sn || mObj.machine_sn);
        const fleetNoStr = safeText(row.fleet_no || mObj.fleet_no || mObj.mxg_fleet_no);
        const hmrStr = safeText(row.current_hmr || mObj.current_hmr || mObj.hmr);
        const wtyStr = safeText(row.warranty_status || mObj.warranty_status);

        const sn = `<div style="font-size:10px;color:var(--text-muted);">SN: <strong>${snStr || ""}</strong></div>`;
        const fleetNo = `<div style="font-size:10px;color:var(--text-muted);">Fleet: <strong>${fleetNoStr || ""}</strong></div>`;
        const hmr = `<div style="font-size:10px;color:var(--text-muted);">HMR: <strong>${hmrStr || ""}</strong></div>`;

        let wtyBadge = "";
        if (wtyStr && wtyStr !== "Out of Warranty" && wtyStr !== "N/A") {
          wtyBadge = `<span style="font-size:9px;background:#fee2e2;color:#ef4444;padding:2px 4px;border-radius:4px;display:inline-block;margin-top:2px;">${wtyStr}</span>`;
        }

        const date = row.breakdown_date ? formatDateDA(row.breakdown_date) : "—";

        // TED / RED / ETA formatting
        const ted = row.ted ? formatDateDA(row.ted) : (row.ted_status || "—");
        const red = row.red ? formatDateDA(row.red) : "—";

        // Status formatting
        const status = safeText(row.status);
        const quoted = row.quoted_date ? `<div style="font-size:9px;color:#64748b;margin-top:2px;">Quoted: ${formatDateDA(row.quoted_date)}</div>` : "";

        // ETA
        const partsEta = row.parts_eta ? `<div>${formatDateDA(row.parts_eta)}</div>` : "";
        const outEta = row.out_eta ? `<div style="font-size:10px;color:#64748b;margin-top:2px;">Outwork: ${formatDateDA(row.out_eta)}</div>` : "";

        const commonTdStyle = "padding:12px 8px; vertical-align: top; word-wrap: break-word; overflow-wrap: break-word; white-space: normal; border-right: 1px solid #f1f5f9;";

        if (row.urgent) {
          tr.classList.add("urgent-row");
        }

        let custCell = "";
        const cName = safeText(customer);
        if (isGrouped) {
            if (customerRowSpans[i] > 0) {
                custCell = `<td rowspan="${customerRowSpans[i]}" style="padding:12px 16px; vertical-align:middle; background:#fcfcfc; word-wrap:break-word; border-bottom:1px solid #e5e7eb; border-right:1px solid #e5e7eb; min-width:140px;">
                    <div style="font-weight:800;color:#0f172a;font-size:12px;line-height:1.2;">${cName}</div>
                    ${customerRef}
                    ${region}
                    <div style="font-size:10px; color:#64748b; margin-top:4px; font-weight:600;">${customerRowSpans[i]} Breakdowns</div>
                </td>`;
            }
        } else {
            custCell = `<td style="${commonTdStyle}">
                <div style="font-weight:700;color:#0f172a;margin-bottom:4px;">${cName}</div>
                ${customerRef}
                ${region}
            </td>`;
        }

        tr.innerHTML = `
      <td style="${commonTdStyle}text-align:center;font-weight:700;color:#64748b;font-size:12px;">${index + 1}</td>
      ${custCell}
      <td style="${commonTdStyle}">
        <div style="font-weight:700;color:#0f172a;margin-bottom:4px;">${safeText(machine)}</div>
      ${sn}
      ${fleetNo}
      ${hmr}
      ${wtyBadge}
    </td>
    <td style="${commonTdStyle}white-space:nowrap;">${date}</td>
    <td style="${commonTdStyle}min-width:200px;font-size:12px;color:#1e293b;">
      ${safeText(row.description)}
    </td>
    <td style="${commonTdStyle}white-space:nowrap;">
      ${row.on_hold ? '<span style="color:#ef4444;font-weight:700;">On Hold</span>' : ted}
    </td>
    <td style="${commonTdStyle}white-space:nowrap;">${red}</td>
    <td style="${commonTdStyle}text-align:center;">
      <span style="display:inline-block;padding:2px 8px;background:#f1f5f9;border-radius:4px;font-size:10px;font-weight:700;color:#475569;">${safeText(row.resp || 'FSD')}</span>
    </td>
    <td style="${commonTdStyle}min-width:140px;">
      <div style="font-weight:600;color:#1e293b;margin-bottom:4px;">${status}</div>
      ${quoted}
    </td>
    <td
      style="${commonTdStyle}text-align:center;font-weight:800;font-size:13px;color:#b91c1c;border-right:1px solid #f1f5f9;">
      ${row.days_on_bd}
    </td>
    <td style="${commonTdStyle}">
      ${partsEta}
      ${outEta}
    </td>
    <td
      style="padding:12px 8px;vertical-align:top;word-wrap:break-word;overflow-wrap:break-word;white-space:normal;font-size:11.5px;color:#475569;min-width:180px;">
      ${safeText(row.supervisor_comment)}
    </td>
    <td style="padding:12px 6px; text-align:center; vertical-align:middle; border-left:1px solid #f1f5f9;">
      <!-- Button will be appended below to ensure event binding -->
    </td>
    `;

        // Create button element programmatically
        const btnEdit = document.createElement("button");
        btnEdit.textContent = "Edit";
        btnEdit.style.cssText = "background:#eff6ff; color:#2563eb; border:1px solid #bfdbfe; border-radius:6px; padding:4px 10px; font-size: 11px; font-weight: 600; cursor: pointer;";
        btnEdit.onclick = function (e) {
          e.preventDefault();
          e.stopPropagation();
          
          try {
            openDbrEditModal(row.name);
            
          } catch(err) {
            alert("Edit Button Crash: " + err.message);
          }
        };

        // Find the last cell and append button
        const lastTd = tr.querySelector("td:last-child");
        if (lastTd) lastTd.appendChild(btnEdit);

        tbody.appendChild(tr);
      });

      // Pagination Controls Row
      const totalPages = Math.ceil(dataToRender.length / DBR_PAGE_SIZE) || 1;
      const pagTr = document.createElement("tr");
      pagTr.innerHTML = `
        <td colspan="10" style="padding:12px 16px; background:#f8fafc; border-top:1px solid #e2e8f0; border-radius:0 0 8px 8px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div style="font-size:12px; color:#64748b; font-weight:600;">
              Page ${DBR_PAGE} of ${totalPages} (${dataToRender.length} total)
            </div>
            <div style="display:flex; gap:8px;">
              <button onclick="changeDbrPage(-1)" ${DBR_PAGE <= 1 ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : 'style="cursor:pointer;"'} class="tiny-btn">Previous</button>
              <button onclick="changeDbrPage(1)" ${DBR_PAGE >= totalPages ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : 'style="cursor:pointer;"'} class="tiny-btn">Next</button>
            </div>
          </div>
        </td>
      `;
      tbody.appendChild(pagTr);

      const dbrDate = document.getElementById("dbr-date");
      if (dbrDate) dbrDate.textContent = new Date().toLocaleDateString("en-GB");
    }
    
    window.changeDbrPage = function(delta) {
      const maxPage = Math.ceil(CURRENT_DBR_ROWS.length / DBR_PAGE_SIZE) || 1;
      const newPage = DBR_PAGE + delta;
      if (newPage >= 1 && newPage <= maxPage) {
        DBR_PAGE = newPage;
        renderDailyBreakdownReport(CURRENT_DBR_ROWS, true); // true = skipStateUpdate
      }
    };

    // DBR Sorting State
    let DBR_SORT_COL = null;
    let DBR_SORT_ASC = true;


    function sortDbrData(col) {
      if (DBR_SORT_COL === col) {
        DBR_SORT_ASC = !DBR_SORT_ASC;
      } else {
        DBR_SORT_COL = col;
        DBR_SORT_ASC = true;
      }

      CURRENT_DBR_ROWS.sort((a, b) => {
        let valA = a[col] || "";
        let valB = b[col] || "";

        // Numeric Sort
        if (col === 'days_on_bd') {
          return DBR_SORT_ASC ? (Number(valA) - Number(valB)) : (Number(valB) - Number(valA));
        }

        // Date Sort (String comparison usually works for ISO, but safety check)
        // String Sort
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        if (valA < valB) return DBR_SORT_ASC ? -1 : 1; if (valA > valB) return DBR_SORT_ASC ? 1 : -1;
        return 0;
      });

      renderDailyBreakdownReport(CURRENT_DBR_ROWS, true); // true = skip state update
    }

    // Helper for date formatting DD MMM YY
    function formatDateDA(isoStr) {
      if (!isoStr || isoStr === "0000-00-00") return "—";
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr;
      const day = d.getDate();
      const month = d.toLocaleString('default', { month: 'short' });
      const year = d.getFullYear().toString().slice(-2);
      return `${day} ${month}. ${year} `;
    }

    // ---------------------------
    // 📡 API Helper & Loaders
    // ---------------------------
    window.showOmnisLoader = function(msg) {
      const loader = document.getElementById("omnis-global-loader");
      const msgEl = document.getElementById("omnis-loader-msg");
      if (msgEl && msg) msgEl.textContent = msg;
      if (loader) loader.classList.add("active");
    };

    window.hideOmnisLoader = function() {
      const loader = document.getElementById("omnis-global-loader");
      if (loader) loader.classList.remove("active");
    };

    // ============================================================
    // 🔄 callFrappe → Supabase Adapter
    // Transparently routes Fleetrack API calls to Supabase.
    // Methods not yet migrated (WhatsApp, PDFs) fall back to Frappe.
    // ============================================================

    // Helper: invoke Supabase query via Electron IPC
    async function supaQuery(table, method, params = {}) {
      if (window.electron && window.electron.invoke) {
        return window.electron.invoke('supabase:query', { table, method, params });
      }
      throw new Error('Electron bridge not available for Supabase query');
    }

    // Helper: parse the Frappe method name from a full path
    function getFtMethod(fullPath) {
      const parts = fullPath.split('.');
      return parts[parts.length - 1];
    }

    // Methods handled natively by Supabase (Phase 4a + 4b)
    const SUPABASE_HANDLERS = {

      // ─── Machine Register ───────────────────────────────────────
      get_ft_machine_register: async (p) => {
        const res = await supaQuery('ft_machine', 'select', {
          columns: 'name,model,oem,sn,customer,region,warranty_status,current_hmr,fleetrack_managed,last_hmr_date,days_since_last_hmr,next_service_hmr,service_interval_hours,warranty_type,last_service_type,next_service_type,type',
          filters: p.filters || {},
          order: { column: 'name', ascending: true },
          limit: 2000
        });
        return { message: { data: res.data || [] } };
      },

      get_ft_machine_detail: async (p) => {
        const res = await supaQuery('ft_machine', 'getOne', { name: p.machine || p.name });
        return { message: res.data };
      },

      // ─── Defects ─────────────────────────────────────────────────
      get_ft_defect_summary: async (p) => {
        const res = await supaQuery('ft_defect', 'select', {
          columns: 'name,defect_type,machine,customer,fleetrack_managed,oem,model,location,region,warranty_status,start_date,priority,status,description,on_hold,ted,end_date,defect_days,technician,reported_by,hmr_at_defect',
          filters: p.filters || {},
          order: { column: 'start_date', ascending: false },
          limit: 5000
        });
        return { message: { data: res.data || [] } };
      },

      create_ft_defect: async (p) => {
        const res = await supaQuery('ft_defect', 'insert', { data: p });
        if (res.error) throw new Error(res.error);
        return { message: { ok: true, name: res.data?.[0]?.name } };
      },

      update_ft_defect: async (p) => {
        const { name, ...updates } = p;
        const res = await supaQuery('ft_defect', 'update', { name, data: updates });
        if (res.error) throw new Error(res.error);
        return { message: { ok: true } };
      },

      // ─── Service Plan (FSP) ───────────────────────────────────────
      get_ft_service_plan_list: async (p) => {
        const res = await supaQuery('ft_service_plan', 'select', {
          columns: 'id,machine_id,machine_name,customer,region,raw_date,status,technician,description,frappe_name',
          filters: p.filters || {},
          order: { column: 'raw_date', ascending: true },
          limit: 500
        });
        return { message: { data: res.data || [] } };
      },

      add_ft_service_plan_entry: async (p) => {
        const res = await supaQuery('ft_service_plan', 'insert', { data: p });
        if (res.error) throw new Error(res.error);
        return { message: { ok: true, id: res.data?.[0]?.id } };
      },

      update_ft_service_plan_entry: async (p) => {
        const { id, ...updates } = p;
        const res = await supaQuery('ft_service_plan', 'update', { id, data: updates });
        if (res.error) throw new Error(res.error);
        return { message: { ok: true } };
      },

      delete_ft_service_plan_entry: async (p) => {
        const res = await supaQuery('ft_service_plan', 'delete', { id: p.id });
        if (res.error) throw new Error(res.error);
        return { message: { ok: true } };
      },

      // ─── Breakdowns ───────────────────────────────────────────────
      get_ft_breakdown_overview: async (p) => {
        const res = await supaQuery('ft_breakdown', 'select', {
          columns: 'name,customer_name,status,comment,last_notification_date,order_date,committed_lead_time,assigned_to,region,is_overdue,updated_at',
          filters: p.filters || {},
          order: { column: 'updated_at', ascending: false },
          limit: 1000
        });
        return { message: { data: res.data || [] } };
      },

      update_ft_breakdown_status: async (p) => {
        const { name, status, comment } = p;
        const res = await supaQuery('ft_breakdown', 'update', { name, data: { status, comment, updated_at: new Date().toISOString() } });
        if (res.error) throw new Error(res.error);
        return { message: { ok: true } };
      },

      update_ft_breakdown_full: async (p) => {
        const { name, ...updates } = p;
        updates.updated_at = new Date().toISOString();
        const res = await supaQuery('ft_breakdown', 'update', { name, data: updates });
        if (res.error) throw new Error(res.error);
        return { message: { ok: true } };
      },

      get_ft_breakdown_dbr_v2: async (p) => {
        const res = await supaQuery('ft_breakdown_machine', 'select', {
          columns: 'name,parent,item,qty,target_handover_date,revised_handover_date,actual_handover_date,serial_no,oem,model',
          filters: { parent: p.name || p.parent },
          limit: 200
        });
        return { message: { data: res.data || [] } };
      },

      // ─── Job Cards ────────────────────────────────────────────────
      get_ft_job_cards: async (p) => {
        const res = await supaQuery('ft_job_card', 'select', {
          columns: 'name,machine,customer,technician,status,job_type,start_date,end_date,region,notes',
          filters: p.filters || {},
          order: { column: 'created_at', ascending: false },
          limit: 500
        });
        return { message: { data: res.data || [] } };
      },

      get_job_card_detail: async (p) => {
        const res = await supaQuery('ft_job_card', 'getOne', { name: p.name });
        return { message: res.data };
      },

      save_job_card_detail: async (p) => {
        const { name, ...updates } = p;
        updates.updated_at = new Date().toISOString();
        const res = await supaQuery('ft_job_card', 'update', { name, data: updates });
        if (res.error) throw new Error(res.error);
        return { message: { ok: true } };
      },

      update_jc_status: async (p) => {
        const res = await supaQuery('ft_job_card', 'update', { name: p.name, data: { status: p.status, updated_at: new Date().toISOString() } });
        if (res.error) throw new Error(res.error);
        return { message: { ok: true } };
      },

      create_ft_job_card: async (p) => {
        const res = await supaQuery('ft_job_card', 'insert', { data: p });
        if (res.error) throw new Error(res.error);
        return { message: { ok: true, name: res.data?.[0]?.name } };
      },

      // ─── HMR Logs ─────────────────────────────────────────────────
      submit_ft_hmr_log: async (p) => {
        const res = await supaQuery('ft_hmr_log', 'insert', { data: { ...p, created_at: new Date().toISOString() } });
        if (res.error) throw new Error(res.error);
        // Also update ft_machine.current_hmr
        if (p.machine && p.hmr_reading) {
          await supaQuery('ft_machine', 'update', {
            name: p.machine,
            data: { current_hmr: p.hmr_reading, last_hmr_date: p.log_date || new Date().toISOString().split('T')[0] }
          });
        }
        return { message: { ok: true } };
      },

      get_hmr_activity_report: async (p) => {
        const res = await supaQuery('ft_hmr_log', 'select', {
          columns: 'id,machine,customer,region,hmr_reading,log_date,logged_by,notes',
          filters: p.filters || {},
          order: { column: 'log_date', ascending: false },
          limit: 1000
        });
        return { message: { data: res.data || [] } };
      },

      // ─── ISR ──────────────────────────────────────────────────────
      get_ft_isr: async (p) => {
        const res = await supaQuery('ft_isr', 'select', {
          columns: 'name,machine,customer,isr_date,technician,status',
          filters: p.filters || {},
          order: { column: 'isr_date', ascending: false },
          limit: 500
        });
        return { message: { data: res.data || [] } };
      },

      // ─── Technicians ──────────────────────────────────────────────
      get_technician_contact: async (p) => {
        const res = await supaQuery('ft_technician', 'select', {
          columns: 'name,email,mobile,region',
          filters: p.filters || {},
          limit: 100
        });
        return { message: { data: res.data || [] } };
      },
    };

    // Methods that stay on Frappe (WhatsApp, PDFs) — do NOT migrate yet
    const FRAPPE_ONLY_METHODS = new Set([
      'send_internal_report',
      'send_customer_report',
      'get_signed_reports',
      'archive_signed_report',
      'get_whatsapp_report',
      'run',    // frappe.desk.query_report.run
    ]);

    async function callFrappe(method, params = {}, httpMethod = 'GET', options = {}) {
      const showLoader = options.showLoader || false;
      const loaderMsg = options.loaderMsg || "Fetching Data";

      if (showLoader) window.showOmnisLoader(loaderMsg);

      try {
        // USE NATIVE FRAPPE CALL IF AVAILABLE (Fixes Session/Guest issues)
        if (window.frappe && window.frappe.call) {
          return new Promise((resolve, reject) => {
            window.frappe.call({
              method: method,
              type: httpMethod,
              args: params,
              callback: function (res) {
                if (showLoader) window.hideOmnisLoader();
                resolve(res);
              },
              error: function (err) {
                console.error("frappe.call error", err);
                if (showLoader) window.hideOmnisLoader();
                reject(err);
              }
            });
          });
        }

        // Determine base URL: use production server if running from local file (Electron)
        let baseUrl = window.location.origin;
        const isElectron = baseUrl === 'null' || baseUrl.startsWith('file');

        if (isElectron) {
          baseUrl = 'https://fleetrack.machinery-exchange.com';
        }

        // For GET requests, append params as query string
        let url = `${baseUrl}${method}`;
        let requestData = params;

        if (httpMethod.toUpperCase() === 'GET' && Object.keys(params).length > 0) {
          const queryString = new URLSearchParams(params).toString();
          url = `${url}?${queryString}`;
          requestData = null;
        }

        // In Electron, use the IPC bridge which handles cookies properly
        if (isElectron && window.frappeAPI && window.frappeAPI.request) {
          try {
            // Build auth headers for IPC bridge
            const _ipcApiKey    = localStorage.getItem('ft_api_key');
            const _ipcApiSecret = localStorage.getItem('ft_api_secret');
            const _ipcHeaders   = {};
            if (_ipcApiKey && _ipcApiSecret) {
              _ipcHeaders['Authorization'] = `token ${_ipcApiKey}:${_ipcApiSecret}`;
            }

            console.log(`[callFrappe] IPC Request (${httpMethod}): ${url}`);
            const res = await window.frappeAPI.request({
              url: url,
              method: httpMethod,
              data: requestData,
              headers: _ipcHeaders,
              syncCookies: true
            });

            console.log(`[callFrappe] IPC Response: ${res.status}`, res.data);

            if (!res.ok) {
              const errorData = res.data || {};
              const errorMsg = errorData.message || errorData.exception || res.error || 'Unknown error';
              throw new Error(`API Error ${res.status}: ${errorMsg}`);
            }

            return res.data;
          } catch (e) {
            console.error("[callFrappe] IPC error:", e);
            throw e;
          }
        }

        // Fetch fallback — applies API key token auth whenever credentials are stored
        let headers = {
          'Content-Type': 'application/json',
          'X-Frappe-CSRF-Token': (window.frappe && window.frappe.csrf_token) || ''
        };

        // Always inject API key auth if stored (works in both browser and Electron fallback)
        const _apiKey    = localStorage.getItem('ft_api_key');
        const _apiSecret = localStorage.getItem('ft_api_secret');
        if (_apiKey && _apiSecret) {
          headers['Authorization'] = `token ${_apiKey}:${_apiSecret}`;
        }

        const res = await fetch(url, {
          method: 'POST',
          headers: headers,
          credentials: 'include', // Ensure session cookies are sent
          body: JSON.stringify(params)
        });

        if (!res.ok) {
          const txt = await res.text();
          throw new Error(`API Error ${res.status}: ${txt}`);
        }

        return await res.json();
      } finally {
        if (showLoader) window.hideOmnisLoader();
      }
    }

    // ---------------------------
    // 🚜 Machine Register Logic
    // ---------------------------

    async function loadMachineRegister() {
      try {
        const r = await callFrappe("/api/method/mxg_fleet_track.ft_machine_register.get_ft_machine_register", {}, 'GET', { 
            showLoader: true, 
            loaderMsg: "Fetching Fleet Data" 
        });
        if (r && r.message && r.message.data) {
          renderMachineList(r.message.data);
        } else {
          tbody.innerHTML = `<tr>
      <td colspan="8" class="text-center p-4 text-red-500">Failed to load data.</td>
      </tr>`;
        }
      } catch (e) {
        console.error("Machine load error:", e);
        tbody.innerHTML = `<tr>
      <td colspan="8" class="text-center p-4 text-red-500">Error: ${safeText(e.message)}</td>
      </tr>`;
      }
    }

    function renderMachineList(machines) {
      const tbody = document.querySelector("#machine-list-table tbody");
      if (!machines || machines.length === 0) {
        tbody.innerHTML = `<tr>
      <td colspan="8" class="text-center p-4">No machines found.</td>
      </tr>`;
        return;
      }

      tbody.innerHTML = machines.map(m => `
      <tr class="hover:bg-gray-50 cursor-pointer" onclick="openMachineDetail('${m.name}')">
        <td class="font-medium text-blue-600">${safeText(m.mxg_fleet_no || m.name)}</td>
        <td>${safeText(m.model) || '-'}</td>
        <td>${safeText(m.sn) || '-'}</td>
        <td>${safeText(m.customer) || '-'}</td>
        <td>${safeText(m.region) || '-'}</td>
        <td><span class="status-badge ${getStatusClass(m.status)}">${safeText(m.status) || 'Unknown'}</span></td>
        <td>${m.current_hmr ? safeText(m.current_hmr) + ' h' : '-'}</td>
        <td style="text-align:right">
          <button class="btn-xs btn-secondary">View</button>
        </td>
      </tr>
      `).join("");
    }

    function getStatusClass(status) {
      if (!status) return 'status-unknown';
      const s = status.toLowerCase();
      if (s.includes('breakdown') || s.includes('defect')) return 'status-breakdown';
      if (s === 'working' || s === 'active') return 'status-active';
      return 'status-idle';
    }

    function refreshMachineList() {
      loadMachineRegister();
    }

    let searchTimeout;
    function handleMachineSearch(e) {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(async () => {
        const query = e.target.value;
        const tbody = document.querySelector("#machine-list-table tbody");
        if (tbody) tbody.innerHTML = `<tr>
      <td colspan="8" class="text-center p-4">Searching...</td>
      </tr>`;

        try {
          const r = await callFrappe("/api/method/mxg_fleet_track.ft_machine_register.get_ft_machine_register", {
            search: query
          });
          if (r && r.message && r.message.data) {
            renderMachineList(r.message.data);
          }
        } catch (err) {
          console.error(err);
        }
      }, 500);
    }

    // ---------------------------
    // DBR Edit Modal Logic
    // ---------------------------
    let CURRENT_EDIT_ROW = null;


    function initDbrEditModal() {
      const overlay = document.getElementById("db-edit-modal-overlay");
      if (!overlay) return;

      // Event delegation for Edit buttons
      const tbody = document.getElementById("dbr-tbody");
      if (tbody) {
        tbody.addEventListener("click", (e) => {
          const btn = e.target.closest(".btn-dbr-edit");
          if (btn) {
            const name = btn.dataset.name;
            showToast("DEBUG: Edit clicked for " + name, "info"); // VISIBLE DEBUG
            if (name) openDbrEditModal(name);
          }
        });
      }

      document.getElementById("db-edit-close").addEventListener("click", closeDbrEditModal);
      document.getElementById("db-edit-cancel").addEventListener("click", closeDbrEditModal);

      document.getElementById("db-edit-save").addEventListener("click", () => saveDbrEdit(false));
      document.getElementById("db-edit-approve").addEventListener("click", () => saveDbrEdit(true));
      document.getElementById("db-edit-delete").addEventListener("click", deleteDbrEntry);
    }

    function formatDateOnly(dateStr) {
      if (!dateStr) return "";
      if (dateStr.includes(" ")) return dateStr.split(" ")[0];
      if (dateStr.includes("T")) return dateStr.split("T")[0];
      return dateStr;
    }

    function openDbrEditModal(name) {
    try {
      const row = DBR_ROWS_CACHE[name];
      if (!row) {
        showToast("Row data not found", "err");
        return;
      }
      CURRENT_EDIT_ROW = row;

      const overlay = document.getElementById("db-edit-modal-overlay");
      if (!overlay) {
        showToast("DEBUG: Modal Overlay NOT FOUND!", "err");
        return;
      }
      if (overlay.parentElement !== document.body) {
        document.body.appendChild(overlay);
      }
      overlay.classList.remove("hidden");
      overlay.style.display = "flex";
      overlay.style.visibility = "visible";
      overlay.style.opacity = "1";
      overlay.style.zIndex = "2147483647";
      overlay.style.backdropFilter = "none"; // Fix for potential WebGL crash

      // Populate Header Info
      document.getElementById("db-edit-info").textContent = 
        `${row.model || row.machine || 'Machine'} | User: ${CURRENT_SERVER_USER} | Access: ${CAN_EDIT_COMMENTS ? 'Manager' : 'Read-Only'}`;

      // Populate Metadata Fields
      document.getElementById("db-edit-customer").value = row.customer || "";
      document.getElementById("db-edit-machine").value = row.model || row.machine || "";
      document.getElementById("db-edit-sn").value = row.serial_number || "-";
      document.getElementById("db-edit-fleet").value = row.fleet_no || "-";

      // ROW 1: PRIMARY DATES
      document.getElementById("db-edit-date").value = formatDateOnly(row.breakdown_date);
      document.getElementById("db-edit-end-date").value = formatDateOnly(row.end_date);
      document.getElementById("db-edit-quote-date").value = formatDateOnly(row.quote_date);

      // ROW 2: SELECTS
      document.getElementById("db-edit-ted-status").value = row.ted_status || "TBA";
      document.getElementById("db-edit-resp").value = row.resp || "FSD";
      document.getElementById("db-edit-category").value = row.category || "Unscheduled";

      // ROW 3: ADVANCED DATES
      document.getElementById("db-edit-ted").value = formatDateOnly(row.ted);
      document.getElementById("db-edit-red").value = formatDateOnly(row.red);
      document.getElementById("db-edit-out-eta").value = formatDateOnly(row.out_eta);

      // ROW 4: OPERATIONAL
      document.getElementById("db-edit-eta").value = row.parts_eta || "";
      document.getElementById("db-edit-running").value = row.is_the_machine_still_running || "No";
      document.getElementById("db-edit-status").value = row.status || "";

      // NARRATIVE
      document.getElementById("db-edit-description").value = row.description || "";
      
      const commentsInput = document.getElementById("db-edit-comments");
      commentsInput.value = row.supervisor_comment || "";

      // CHECKBOXES
      document.getElementById("db-edit-urgent").checked = !!row.urgent;
      document.getElementById("db-edit-hold").checked = !!row.on_hold;

      // PERMISSIONS
      const note = document.getElementById("db-edit-comments-note");
      if (CAN_EDIT_COMMENTS) {
        commentsInput.disabled = false;
        commentsInput.style.background = "#fff";
        note.style.display = "none";
        document.getElementById("db-edit-approve").style.display = "block";
      } else {
        commentsInput.disabled = true;
        commentsInput.style.background = "#f1f5f9";
        note.style.display = "block";
        document.getElementById("db-edit-approve").style.display = "none";
      }
    } catch(err) {
      showToast("Edit Modal Error: " + err.message, "err", 10000);
      console.error(err);
    }
  }

    async function deleteDbrEntry() {
      if (!CURRENT_EDIT_ROW) return;
      if (!confirm(`??? WARNING: DELETION IS PERMANENT ???\n\nAre you sure you want to permanently delete the breakdown log for ${CURRENT_EDIT_ROW.model || CURRENT_EDIT_ROW.machine || 'Unknown Machine'} (${CURRENT_EDIT_ROW.customer || 'Unknown Customer'})?\n\nThis action cannot be undone.`)) {
        return;
      }
      
      const btn = document.getElementById("db-edit-delete");
      const originalText = btn.textContent;
      btn.textContent = "Deleting...";
      btn.disabled = true;

      try {
        let query;
        if (CURRENT_EDIT_ROW.id) {
          query = supabase.from('ft_breakdown_logs').delete({ match: { id: CURRENT_EDIT_ROW.id } });
        } else {
          query = supabase.from('ft_breakdown_logs').delete({ match: { frappe_name: CURRENT_EDIT_ROW.name } });
        }
        const { error } = await query;
        if (error) throw error;
        
        showToast("Breakdown log deleted successfully.", "ok");
        closeDbrEditModal();
        loadDailyBreakdownReport(); // Refresh list
      } catch (err) {
        console.error("Delete Error:", err);
        showToast("Failed to delete: " + err.message, "err");
      } finally {
        btn.textContent = originalText;
        btn.disabled = false;
      }
    }

    async function saveDbrEdit(isApprove) {
      if (!CURRENT_EDIT_ROW) return;

      const payload = {
        name: CURRENT_EDIT_ROW.name,
        description: document.getElementById("db-edit-description").value,
        breakdown_date: document.getElementById("db-edit-date").value,
        end_date: document.getElementById("db-edit-end-date").value,
        quote_date: document.getElementById("db-edit-quote-date").value,
        ted_status: document.getElementById("db-edit-ted-status").value,
        resp: document.getElementById("db-edit-resp").value,
        category: document.getElementById("db-edit-category").value,
        ted: (document.getElementById("db-edit-ted").value || "").replace("T", " "),
        red: (document.getElementById("db-edit-red").value || "").replace("T", " "),
        out_eta: document.getElementById("db-edit-out-eta").value,
        parts_eta: document.getElementById("db-edit-eta").value,
        is_the_machine_still_running: document.getElementById("db-edit-running").value,
        status: document.getElementById("db-edit-status").value,
        urgent: document.getElementById("db-edit-urgent").checked ? 1 : 0,
        on_hold: document.getElementById("db-edit-hold").checked ? 1 : 0
      };

      // Add comments only if editable
      const commentsInput = document.getElementById("db-edit-comments");
      if (!commentsInput.disabled) {
        payload.supervisor_comment = commentsInput.value;
      }

      if (isApprove) {
        payload.supervisor_approved = 1;
      }

      const btn = isApprove ? document.getElementById("db-edit-approve") : document.getElementById("db-edit-save");
      const originalText = btn.textContent;
      btn.textContent = "Saving...";
      btn.disabled = true;

      try {
        
      // Update in Supabase
      const safeDate = (d) => (d && d.trim() !== '') ? d : null;
      const updateData = {
        description: payload.description,
        urgent: !!payload.urgent,
        responsibility: payload.resp,
        ted_status: payload.ted_status,
        category: payload.category,
        parts_eta: payload.parts_eta,
        on_hold: !!payload.on_hold,
        quote_date: safeDate(payload.quote_date),
        breakdown_end_date: safeDate(payload.end_date),
        breakdown_date: safeDate(payload.breakdown_date),
        ted: safeDate(payload.ted),
        red: safeDate(payload.red),
        out_eta: safeDate(payload.out_eta),
        status: payload.status,
        is_the_machine_still_running: payload.is_the_machine_still_running
      };
      if (payload.supervisor_comment !== undefined) updateData.manager_comments = payload.supervisor_comment;
      if (payload.supervisor_approved) updateData.supervisor_approved = true;

      let query;
      if (CURRENT_EDIT_ROW.id) {
        query = supabase.from('ft_breakdown_logs').update(updateData, { match: { id: CURRENT_EDIT_ROW.id } });
      } else {
        query = supabase.from('ft_breakdown_logs').update(updateData, { match: { frappe_name: CURRENT_EDIT_ROW.name } });
      }
      
      const { error: updateError } = await query;

      if (updateError) throw new Error(updateError.message);
      
      showToast(isApprove ? "Breakdown Signed Off!" : "Breakdown updated successfully", "ok");
      closeDbrEditModal();
      loadDailyBreakdownReport(); // Reload table

      } catch (e) {
        console.error(e);
        showToast("Update error: " + e.message, "err");
      } finally {
        btn.textContent = originalText;
        btn.disabled = false;
      }
    }

    function closeDbrEditModal() {
      const overlay = document.getElementById("db-edit-modal-overlay");
      if (overlay) overlay.classList.add("hidden");
      CURRENT_EDIT_ROW = null;
    }


    // --- FORM BUILDER CONFIG ---
    // Defined based on user requirements
    const MACHINE_FORM_FIELDS = [
      { type: 'section', label: 'Edit' }, // section_break_2
      { type: 'select', label: 'On Fleetrack™?', name: 'fleetrack_managed', options: ['No', 'Yes'] },
      { type: 'col_break' },
      { type: 'select', label: 'MXG Supplied?', name: 'supplied', options: ['Not Specified', 'No', 'Yes'] },
      { type: 'col_break' },
      { type: 'link', label: 'Customer', name: 'customer' },
      { type: 'col_break' },
      { type: 'data', label: 'Fleet No.', name: 'mxg_fleet_no' },
      { type: 'col_break' },
      { type: 'data', label: 'SN', name: 'sn' },

      { type: 'section', label: 'Customer File' },
      {
        type: 'select', label: 'Prepare Welcome Report', name: 'prepare_welcome_report', options: ['No', 'Yes', 'N/A']
      },
      { type: 'col_break' },
      {
        type: 'select', label: 'Welcome Report Status', name: 'machine_welcome_report_status', options: ['SENT',
          'PENDING']
      },
      // Button omitted in view mode for now

      { type: 'section', label: 'Machine Details' },
      { type: 'link', label: 'Model', name: 'model' },
      { type: 'data', label: 'ESN', name: 'esn' },
      { type: 'data', label: 'Chassis Number', name: 'chassis_number' },
      { type: 'float', label: 'Operating Weight (Ton)', name: 'operating_weight' },
      { type: 'col_break' },
      { type: 'link', label: 'OEM', name: 'oem' },
      { type: 'data', label: 'Gearbox', name: 'gearbox' },
      { type: 'select', label: 'Has Telematics Device?', name: 'has_telematics_device', options: ['No', 'Yes'] },
      { type: 'float', label: 'Bin/Bucket Capacity (m3)', name: 'bin_capacity' },
      { type: 'col_break' },
      { type: 'link', label: 'Type', name: 'type' },
      { type: 'link', label: 'Location', name: 'location' },
      { type: 'date', label: 'EPR Entry Date', name: 'epr_entry_date' },
      { type: 'float', label: 'STD Fuel Consumption (L/Hr)', name: 'standard_fuel_consumption' },
      { type: 'col_break' },
      { type: 'data', label: 'Customer Ref', name: 'fleet_no' },
      { type: 'link', label: 'Region', name: 'region' },
      { type: 'data', label: 'Engine Type', name: 'engine_type' },
      { type: 'link', label: 'Tyre Size', name: 'tyre_size' },
      { type: 'col_break' },
      { type: 'select', label: 'OEM Registered?', name: 'oem_registered', options: ['Yes', 'No'] },
      { type: 'link', label: 'Supplier', name: 'supplier' },
      { type: 'select', label: 'CANBUS Enabled', name: 'canbus_enabled', options: ['Yes', 'No'] },
      { type: 'int', label: 'Unique Attachments Fitted', name: 'unique_attachments_fitted' },

      { type: 'section', label: 'Warranty Details' },
      {
        type: 'select', label: 'Warranty Status', name: 'warranty_status', options: ['N/A', 'Under Warranty', 'Out of Warranty']
      },
      { type: 'col_break' },
      {
        type: 'select', label: 'Warranty Type', name: 'warranty_type', options: ['Not Specified', 'Parts Only', 'Full Warranty', 'No Warranty']
      },
      { type: 'col_break' },
      { type: 'float', label: 'Period (Months)', name: 'warranty_period' },
      { type: 'col_break' },
      { type: 'date', label: 'Handover Date', name: 'handover_date' },
      { type: 'col_break' },
      { type: 'date', label: 'Expiry Date', name: 'expiry_date' },
      { type: 'col_break' },
      { type: 'float', label: 'Hours', name: 'warranty_hours' },

      { type: 'section', label: 'HMR' },
      { type: 'float', label: 'Starting HMR', name: 'starting_hmr' },
      { type: 'col_break' },
      { type: 'date', label: 'Last HMR Date', name: 'last_hmr_date' },
      { type: 'col_break' },
      { type: 'link', label: 'Last Log', name: 'last_hmr_log' },
      { type: 'col_break' },
      { type: 'float', label: 'Current HMR', name: 'current_hmr' },
      { type: 'float', label: 'Total Running Hours', name: 'total_running_hours' },
      { type: 'col_break' },
      { type: 'int', label: 'Days Since', name: 'days_since_last_hmr', readonly: true },

      { type: 'section', label: 'Service Configuration' },
      {
        type: 'select', label: 'Service Obligation', name: 'service_obligation', options: ['Not Specified', 'Customer',
          'MXG']
      },
      { type: 'col_break' },
      { type: 'float', label: 'Service Interval', name: 'service_interval_hours' },
      { type: 'col_break' },
      { type: 'date', label: 'Last Service Date', name: 'last_service_date' },
      { type: 'col_break' },
      { type: 'float', label: 'Last Service HMR', name: 'last_service_hmr' },
      { type: 'col_break' },
      { type: 'float', label: 'Last Service Type', name: 'last_service_type' },
      { type: 'col_break' },
      { type: 'float', label: 'Next Service HMR', name: 'next_service_hmr' },
      { type: 'col_break' },
      { type: 'float', label: 'Next Service Type', name: 'next_service_type' },
      { type: 'col_break' },
      { type: 'float', label: 'Hours to Service', name: 'hours_remaining_to_service', readonly: true },

      { type: 'section', label: 'Notes' },
      { type: 'small_text', label: 'Notes', name: 'notes' }
    ];

    async function openMachineDetail(name) {
      showView('view-machine-detail');
      const container = document.getElementById("machine-form-content");

      document.getElementById("detail-machine-title").innerText = "Machine: " + name;
      container.innerHTML = `<div class="text-center p-8">Loading details...</div>`;

      try {
        const r = await callFrappe("/api/method/mxg_fleet_track.ft_machine_register.get_ft_machine_details", {
          machine_id: name
        });
        if (r && r.message && r.message.data) {
          renderDynamicForm(container, r.message.data);
          const statusBadge = document.getElementById("detail-machine-status");
          if (statusBadge) {
            statusBadge.className = `status-badge ${getStatusClass(r.message.data.status)}`;
            statusBadge.innerText = r.message.data.status || 'Unknown';
          }
        } else {
          container.innerHTML = `<div class="text-red-500 p-8">Details not found.</div>`;
        }
      } catch (e) {
        container.innerHTML = `<div class="text-red-500 p-8">Error loading details: ${e.message}</div>`;
      }
    }

    function renderDynamicForm(container, data) {
      let html = '<div class="form-grid">';
      let currentSection = null;
      let openRow = false;

      // Close previous row function
      const closeRow = () => {
        if (openRow) { html += '</div>'; openRow = false; }
      };

      // Open new row function
      const openNewRow = () => {
        closeRow();
        html += '<div class="form-row">';
        openRow = true;
      };

      MACHINE_FORM_FIELDS.forEach(field => {
        if (field.type === 'section') {
          closeRow();
          html += `<h3 class="form-section-title">${field.label}</h3>`;
          openNewRow(); // Start first row of section
        } else if (field.type === 'col_break') {
          // In CSS grid, col_break might just be implicitly handled or we start a new 'column' in our flex row
          // For simplicity, let's keep adding to the same flex row, or wrap if needed.
          // If we want checking visual columns, we might need nested divs.
          // A simple approach: closing row and opening new one is actually a 'Row Break'.
          // A 'Column Break' in Frappe means "start next column".
          // We'll mimic this by just letting the flex items flow.
        } else {
          if (!openRow) openNewRow();

          const value = data[field.name] != null ? data[field.name] : '';
          let inputHtml = '';

          if (field.type === 'select') {
            inputHtml = `<select class="form-input" name="${field.name}">
      <option value="">--</option>
          ${(field.options || []).map(opt => `<option value="${opt}" ${value === opt ? 'selected' : ''}>${opt}</option>
          `).join('')
              }
        </select>`;
          } else if (field.type === 'small_text') {
            inputHtml = `<textarea class="form-input" name="${field.name}" rows="3">${value}</textarea>`;
          } else {
            let inputType = 'text';
            if (field.type === 'date') inputType = 'date';
            if (field.type === 'int' || field.type === 'float') inputType = 'number';

            inputHtml = `<input type="${inputType}" class="form-input" name="${field.name}" value="${value}">`;
          }

          html += `
      <div class="form-group">
        <label class="form-label" style="color:var(--text-main);">${field.label}</label>
          ${inputHtml}
        </div>
      `;
        }
      });

      closeRow();
      html += '</div>';
      container.innerHTML = html;
    }

    function saveMachineDetails() {
      alert("Save functionality not yet wired up.");
    }

    // ===== MACHINE REGISTER REPORT =====
    async function loadMachineRegisterReport() {
      const tbody = document.getElementById('mr-tbody');
      const preparedBy = document.getElementById('mr-prepared-by');
      const dateEl = document.getElementById('mr-date');
      const totalEl = document.getElementById('mr-total');

      // Set header info
      if (preparedBy) preparedBy.innerText = 'System';
      if (dateEl) dateEl.innerText = new Date().toLocaleDateString('en-GB');

      // Show loading state
      if (tbody) {
        tbody.innerHTML = `
        <tr>
      <td colspan="10" style="padding:40px;text-align:center;color:#94a3b8;font-size:12px;">
        Loading machine register...
      </td>
      </tr>
      `;
      }


      try {
        const filters = {
          region: document.getElementById('mr-filter-region')?.value || '',
          customer: document.getElementById('mr-filter-customer')?.value || '',
          model: document.getElementById('mr-filter-model')?.value || '',
          warranty_status: document.getElementById('mr-filter-warranty')?.value || ''
        };

        console.log('🔍 DEBUG: Calling Machine Register API with filters:', filters);
        const response = await
          callFrappe('/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.get_ft_machine_register', filters);
        console.log('🔍 DEBUG: Full API Response:', response);

        if (response && response.message && response.message.data) {
          const machines = response.message.data;
          console.log('🔍 DEBUG: Number of machines:', machines.length);
          console.log('🔍 DEBUG: First machine:', machines[0]);

          if (totalEl) totalEl.innerText = machines.length;

          if (machines.length === 0) {
            tbody.innerHTML = `
        <tr>
      <td colspan="10" style="padding:40px;text-align:center;color:#94a3b8;font-size:12px;">
        No machines found
      </td>
      </tr>
      `;
            return;
          }

          // Render machine rows
          let html = '';
          machines.forEach(machine => {
            const fleetNo = machine.mxg_fleet_no || '-';
            const customerRef = machine.fleet_no || '';
            const customer = machine.customer || '-';
            const model = machine.model || '-';
            const serialNumber = machine.name || '-';
            const currentHMR = machine.current_hmr || '-';
            const location = machine.location || '-';
            const region = machine.region || '-';
            const status = machine.status || 'Unknown';
            const warrantyStatus = machine.warranty_status || '-';
            const commissionDate = machine.commission_date || '-';
            const warrantyExpiry = machine.warranty_expiry || '';

            // Status badge styling
            let statusBadge = '';
            if (status === 'Active') {
              statusBadge = `<span style="background:#dcfce7;color:#15803d;padding:2px 6px;border-radius:4px;font-size:9px;font-weight:600;">${status}</span>`;
            } else if (status === 'Under Maintenance') {
              statusBadge = `<span style="background:#fef9c3;color:#a16207;padding:2px 6px;border-radius:4px;font-size:9px;font-weight:600;">Maintenance</span>`;
            } else if (status === 'Inactive') {
              statusBadge = `<span style="background:#f3f4f6;color:#6b7280;padding:2px 6px;border-radius:4px;font-size:9px;font-weight:600;">${status}</span>`;
            } else {
              statusBadge = status;
            }

            // Warranty badge styling
            let warrantyBadge = '';
            if (warrantyStatus === 'Under Warranty') {
              warrantyBadge = `<span style="background:#dcfce7;color:#15803d;padding:2px 6px;border-radius:4px;font-size:9px;font-weight:600;">Under Warranty</span>`;
            } else if (warrantyStatus === 'Out of Warranty') {
              warrantyBadge = `<span style="background:#fee2e2;color:#b91c1c;padding:2px 6px;border-radius:4px;font-size:9px;font-weight:600;">Out of Warranty</span>`;
            } else {
              warrantyBadge = `<span style="color:#94a3b8;">${warrantyStatus}</span>`;
            }

            html += `
      <tr style="border-bottom:1px solid #e5e7eb;">
        <td style="padding:5px;word-break:break-word;">
          <strong>${fleetNo}</strong>
          ${customerRef ? `<br><span style="font-size:8px;color:#6b7280;">Ref: ${customerRef}</span>` : ''}
        </td>
        <td style="padding:5px;word-break:break-word;">${customer}</td>
        <td style="padding:5px;word-break:break-word;">${model}</td>
        <td style="padding:5px;word-break:break-all;">${serialNumber}</td>
        <td style="padding:5px;text-align:center;">
          ${currentHMR}
        </td>
        <td style="padding:5px;word-break:break-word;">
          ${location}
        </td>
        <td style="padding:5px;">${region}</td>
        <td style="padding:5px;">${statusBadge}</td>
        <td style="padding:5px;">
          ${warrantyBadge}
          ${warrantyExpiry ? `<br><span style="font-size:8px;color:#6b7280;">Exp: ${warrantyExpiry}</span>` : ''}
        </td>
        <td style="padding:5px;">
          ${commissionDate !== '-' ? commissionDate : '<span style="color:#94a3b8;">-</span>'}
        </td>
      </tr >
      `;
          });

          tbody.innerHTML = html;
        } else {
          tbody.innerHTML = `
      <tr>
      <td colspan="10" style="padding:40px;text-align:center;color:#ef4444;font-size:12px;">
        Failed to load machine register
      </td>
      </tr>
      `;
        }
      } catch (error) {
        console.error('Error loading machine register:', error);
        const errorDetails = `
      <div style="padding:20px;text-align:left;">
        <h3 style="color:#ef4444;margin-bottom:10px;">Error Loading Machine Register</h3>
        <p><strong>Message:</strong> ${error.message}</p>
        <p><strong>Type:</strong> ${error.name}</p>
        <p><strong>Stack:</strong></p>
        <pre
          style="background:#f3f4f6;padding:10px;border-radius:4px;font-size:10px;overflow:auto;">${error.stack || 'No stack trace'}</pre>
        <p><strong>API Endpoint:</strong>
          /api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.get_ft_machine_register</p>
      </div>
      `;
        tbody.innerHTML = `
      <tr>
      <td colspan="10" style="padding:0;">
        ${errorDetails}
      </td>
      </tr>
      `;
      }
    }

    function refreshMachineRegisterReport() {
      const region = document.getElementById("mr-filter-region")?.value;
      const customer = document.getElementById("mr-filter-customer")?.value;
      const model = document.getElementById("mr-filter-model")?.value;
      const wty = document.getElementById("mr-filter-warranty")?.value;
      const ftFilter = document.getElementById("mr-filter-fleetrack")?.value;
      const dateFrom = document.getElementById("mr-filter-date-from")?.value;
      const dateTo = document.getElementById("mr-filter-date-to")?.value;

      // If we already have data loaded, apply filters client-side for speed
      if (FT_MACHINE_ROWS && FT_MACHINE_ROWS.length > 0) {
        let filtered = FT_MACHINE_ROWS;

        if (region && region !== "All Regions" && region !== "") {
          filtered = filtered.filter(m => (m.region || "") === region);
        }
        if (customer) {
          const q = customer.toLowerCase();
          filtered = filtered.filter(m => (m.customer || "").toLowerCase().includes(q));
        }
        if (model) {
          const q = model.toLowerCase();
          filtered = filtered.filter(m =>
            (m.model || "").toLowerCase().includes(q) ||
            (m.sn || "").toLowerCase().includes(q) ||
            (m.name || "").toLowerCase().includes(q)
          );
        }
        if (wty && wty !== "All Statuses" && wty !== "") {
          filtered = filtered.filter(m => (m.warranty_status || "") === wty);
        }
        if (ftFilter && ftFilter !== "") {
          const ftLower = ftFilter.toLowerCase();
          filtered = filtered.filter(m => (m.fleetrack_managed || "no").toLowerCase() === ftLower);
        }

        // --- HMR Updated Date Filtering ---
        if (dateFrom) {
          const dFrom = new Date(dateFrom);
          dFrom.setHours(0, 0, 0, 0);
          filtered = filtered.filter(m => {
            if (!m.modified) return false;
            const mDate = new Date(m.modified.split(" ")[0]); // Ensure date only for comparison
            mDate.setHours(0,0,0,0);
            return mDate.getTime() >= dFrom.getTime();
          });
        }

        if (dateTo) {
          const dTo = new Date(dateTo);
          dTo.setHours(0, 0, 0, 0);
          filtered = filtered.filter(m => {
            if (!m.modified) return false;
            const mDate = new Date(m.modified.split(" ")[0]);
            mDate.setHours(0,0,0,0);
            return mDate.getTime() <= dTo.getTime();
          });
        }

        const groupCust = document.getElementById("mr-filter-group-cust") ? document.getElementById("mr-filter-group-cust").checked : true;
        
        // Calculate a due score for sorting
        filtered.forEach(r => {
            if (r.hours_remaining_to_service != null) {
                r._due = Number(r.hours_remaining_to_service);
            } else if (r.next_service_hmr != null && r.current_hmr != null) {
                r._due = Number(r.next_service_hmr) - Number(r.current_hmr);
            } else {
                r._due = 999999; // Deprioritize machines with no schedule
            }
        });

        if (groupCust) {
            filtered.sort((a, b) => {
                let cA = (a.customer || "Unassigned").toLowerCase();
                let cB = (b.customer || "Unassigned").toLowerCase();
                if (cA < cB) return -1;
                if (cA > cB) return 1;
                return a._due - b._due; // Sub-sort by who is most due
            });
        } else {
            filtered.sort((a, b) => a._due - b._due); // Pure severity sort
        }

        renderMachineRegisterCards(filtered, true);
        showToast(`Showing ${filtered.length} of ${FT_MACHINE_ROWS.length} machines`, "info", 2500);
        return;
      }

      // Fallback: reload from server
      const filters = {};
      if (region && region !== "All Regions") filters.region = region;
      if (customer) filters.customer = customer;
      if (model) filters.model = model;
      if (wty && wty !== "All Statuses") filters.warranty_status = wty;
      if (ftFilter && ftFilter !== "All" && ftFilter !== "") filters.fleetrack_managed = ftFilter;
      filters._ts = Date.now();

      loadFtMachineRegister(filters);
    }

  

    // --- CREATE MODAL LOGIC ---
    let MACHINES_DATALIST_POPULATED = false;

    async function openCreateModal(prefillMachineName) {
      const overlay = document.getElementById("db-create-modal-overlay");
      
      if (overlay && overlay.parentElement !== document.body) {
        document.body.appendChild(overlay);
      }
      
      overlay.classList.remove("hidden");

      // Set default date to today
      const dateInput = document.getElementById("db-create-date");
      if (dateInput) dateInput.valueAsDate = new Date();

      // Ensure machines are loaded
      if (!window.MACHINES_MAP || Object.keys(window.MACHINES_MAP).length === 0) {
        showToast("Loading machine list...", "info", 2000);
        await loadFtMachineRegister();
      }

      // Fetch dynamic categories from Frappe DB
      // callFrappe returns { message: [...] } so we read .message
      try {
        const catRes = await callFrappe("/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.get_breakdown_categories", {});
        const catList = catRes?.message;
        if (catList && Array.isArray(catList) && catList.length > 0) {
          const catSelect = document.getElementById("db-create-category");
          catSelect.innerHTML = ""; // Clear hardcoded options

          catList.forEach(cat => {
            const opt = document.createElement("option");
            opt.value = cat;
            opt.textContent = cat;
            if (cat === "Unscheduled") opt.selected = true;
            catSelect.appendChild(opt);
          });

          // If Unscheduled not in DB list, select first available
          if (!catList.includes("Unscheduled") && catSelect.options.length > 0) {
            catSelect.selectedIndex = 0;
          }
        }
        // If catList is empty or null, keep the hardcoded fallback options
      } catch (e) {
        console.error("Failed to load categories — keeping defaults:", e);
        // Keep the hardcoded <select> options intact (no innerHTML clear happened)
      }

      // Populate machines if not done
      if (!MACHINES_DATALIST_POPULATED && window.MACHINES_MAP) {
        MACHINES_DATALIST_POPULATED = true;
      }

      // Handle pre-fill if machine name is passed
      if (prefillMachineName && window.MACHINES_MAP && window.MACHINES_MAP[prefillMachineName]) {
        const input = document.getElementById("db-create-machine-search");
        if (input) {
          input.value = prefillMachineName;
          input.dataset.selectedName = prefillMachineName;
          
          // Trigger the 'select' effect to fill customer/region etc.
          const m = window.MACHINES_MAP[prefillMachineName];
          document.getElementById("db-create-customer").value = m.customer || "";
          document.getElementById("db-create-region").value = m.region || "";
          
          if (window.ftDebugLog) window.ftDebugLog(`Pre-filled Breakdown for: ${prefillMachineName}`);
        }
      }
    }

    function closeCreateModal() {
      document.getElementById("db-create-modal-overlay").classList.add("hidden");
      // Reset Fields
      const input = document.getElementById("db-create-machine-search");
      input.value = "";
      input.dataset.selectedName = ""; // Clear selection

      document.getElementById("db-create-machine-dropdown").classList.add("hidden");
      document.getElementById("db-create-customer").value = "";
      document.getElementById("db-create-region").value = "";
      document.getElementById("db-create-description").value = "";
      document.getElementById("db-create-urgent").checked = false;
      document.getElementById("db-create-hold").checked = false;

      // Default selects
      document.getElementById("db-create-ted").value = "TBA";
      document.getElementById("db-create-status").value = "Open";
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
          
          // Save to Supabase instead of Frappe
          const { data: insertedData, error: insertError } = await supabase.from('ft_breakdown_logs').insert([{
            machine: machine,
            description: description,
            breakdown_date: date,
            urgent: !!urgent,
            responsibility: resp,
            ted_status: ted_status,
            category: bd_category,
            parts_eta: parts_eta,
            on_hold: !!on_hold,
            quote_date: quote_date,
            breakdown_end_date: breakdown_end_date,
            ted: ted,
            red: red,
            out_eta: out_eta,
            is_the_machine_still_running: is_running,
            status: entry_status
          }]).select();
          
          if (insertError) throw new Error(insertError.message);
          const res = { message: insertedData };


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
      if (tbody) tbody.innerHTML = '';
      window.showOmnisLoader('Loading defects...');
      try {
        if (!window.supabase) throw new Error("Supabase client not found");
        
        // Fetch total count for parallel pagination
        const { count, error: countErr } = await window.supabase.from('ft_defect').select('*', { count: 'exact', head: true });
        if (countErr) throw countErr;
        
        let allData = [];
        const limit = 1000;
        const total = count || 0;
        
        if (total > 0) {
          const requests = [];
          for (let i = 0; i < total; i += limit) {
             requests.push(window.supabase.from('ft_defect').select('*').order('start_date', { ascending: false }).range(i, i + limit - 1));
          }
          
          const results = await Promise.all(requests);
          for (const res of results) {
             if (res.error) throw res.error;
             if (res.data) allData = allData.concat(res.data);
          }
        }

        FT_DEFECTS_DATA = allData;
        window.FT_DEFECTS_DATA = FT_DEFECTS_DATA;
        
        if (typeof window.DEFECTS_CURRENT_PAGE === 'undefined') {
            window.DEFECTS_CURRENT_PAGE = 1;
        }
        
        filterDefectsTable(); // Re-apply existing filters after data loads
        // Auto-run force sync once
        if (!localStorage.getItem('did_auto_sync_defects_v3')) {
            localStorage.setItem('did_auto_sync_defects_v3', 'true');
            if (typeof forceSyncDefects === 'function') {
                setTimeout(forceSyncDefects, 1000);
            }
        }
        if (typeof loadDefectCategories === 'function') loadDefectCategories();
      } catch (e) {
        console.error("Load Defects Error:", e);
        if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:24px;color:#ef4444;">Failed to load defects. Check connection.</td></tr>';
        showToast("Failed to load defects", "err");
      } finally {
        window.hideOmnisLoader();
      }
    }

    async function loadDefectCategories() {
      const datalist = document.getElementById('defect-categories-list');
      const filterSelect = document.getElementById('filter-defect-category');
      
      if (window.DEFECT_CATEGORIES) return;
      try {
        const res = await callFrappe('/api/method/frappe.client.get_list', { doctype: 'FT Defect Category', fields: '["name", "category"]', limit_page_length: 500 }, 'GET');
        let cats = res.message || [];
        
        // Store globally for custom dropdown
        window.DEFECT_CATEGORIES = cats;
        
        
        // Populate the filter dropdown
        if (filterSelect) {
           filterSelect.innerHTML = '<option value="">All</option>' + cats.map(c => `<option value="${c.name}">${c.category || c.name}</option>`).join('');
        }
      } catch(e) {
         console.warn("Failed to load defect categories", e);
      }
    }

    window.changeDefectsPage = function(dir) {
      window.DEFECTS_CURRENT_PAGE += dir;
      renderDefectsTable(window.FT_DEFECTS_FILTERED_DATA || FT_DEFECTS_DATA);
    };

    function clearDefectFilters() {
      if(document.getElementById('filter-defect-status')) document.getElementById('filter-defect-status').value = '';
      if(document.getElementById('filter-defect-type')) document.getElementById('filter-defect-type').value = '';
      if(document.getElementById('filter-defect-category')) document.getElementById('filter-defect-category').value = '';
      if(document.getElementById('filter-defect-machine')) document.getElementById('filter-defect-machine').value = '';
      if(document.getElementById('filter-defect-customer')) document.getElementById('filter-defect-customer').value = '';
      filterDefectsTable();
    }

    function filterDefectsTable() {
      const status   = (document.getElementById('filter-defect-status')?.value || '').toLowerCase();
      const defType  = (document.getElementById('filter-defect-type')?.value || '').toLowerCase();
      const machine  = (document.getElementById('filter-defect-machine')?.value || '').toLowerCase();
      const customer = (document.getElementById('filter-defect-customer')?.value || '').toLowerCase();
      const category = (document.getElementById('filter-defect-category')?.value || '').toLowerCase();

      window.FT_DEFECTS_FILTERED_DATA = (FT_DEFECTS_DATA || []).filter(r => {
        const currentDiv = window.currentDivision || 'fleetrack';
        let mDiv = 'fleetrack';
        const mObj = (window.MACHINES_MAP && window.MACHINES_MAP[r.machine]) || {};
        mDiv = mObj.division || 'fleetrack';
        
        if (mDiv === 'fleetrack') {
            const custLower = (r.customer || mObj.customer || '').toLowerCase();
            const modelLower = (r.model || mObj.model || '').toLowerCase();
            const oemLower = (r.oem || mObj.oem || '').toLowerCase();
            const machineLower = (r.machine || '').toLowerCase();
            
            const isSinopower = custLower.includes('sinopower') || 
                                ['foton', 'sinotruk', 'howo', 'powerstar', 'powerseries', 'spt', 'sino', 'faw', 'shacman', 'van body', 'henred', 'triaxle', 'trailer', 'yutong', 'beaver', 'bus'].some(brand => 
                                    modelLower.includes(brand) || oemLower.includes(brand) || machineLower.includes(brand)
                                );
            if (isSinopower) mDiv = 'sinopower';
        }
        if (mDiv !== currentDiv) return false;
        
        // Status is determined by presence of end_date
        const computedStatus = (r.end_date && r.end_date.trim() !== '') ? 'closed' : 'open';
        const rDefType = (r.defect_type || 'minor').toLowerCase();
        const rMach = ((r.machine || '') + ' ' + (r.model || '')).toLowerCase();
        const rCust = (r.customer || '').toLowerCase();
        const rCat  = (r.category || '').toLowerCase();

        return (!status || computedStatus === status) &&
               (!defType || rDefType === defType) &&
               (!machine || rMach.includes(machine)) &&
               (!customer || rCust.includes(customer)) &&
               (!category || rCat === category);
      });
      window.DEFECTS_CURRENT_PAGE = 1;
      renderDefectsTable(window.FT_DEFECTS_FILTERED_DATA);
    }

    function renderDefectsTable(rows) {
      if (!window.DEFECTS_CURRENT_PAGE) window.DEFECTS_CURRENT_PAGE = 1;
      const PAGE_SIZE = 50;

      const tbody = document.getElementById("tbl-defects");
      if (!tbody) return;
      tbody.innerHTML = "";
      
      if (rows) {
        const total = rows.length;
        const open = rows.filter(r => !(r.end_date && r.end_date.trim() !== '')).length;
        const high = rows.filter(r => (r.priority || 'Low').toLowerCase() === 'high' && !(r.end_date && r.end_date.trim() !== '')).length;
        
        if (document.getElementById('defects-kpi-total')) document.getElementById('defects-kpi-total').innerText = total;
        if (document.getElementById('defects-kpi-open')) document.getElementById('defects-kpi-open').innerText = open;
        if (document.getElementById('defects-kpi-high')) document.getElementById('defects-kpi-high').innerText = high;
      }

      if (!rows || rows.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:20px; color:#94a3b8;">No defects found</td></tr>';
        return;
      }

      let displayRows = [...rows];
      const groupByCust = document.getElementById('defect-group-cust')?.checked;
      if (groupByCust) {
        displayRows.sort((a,b) => {
            const cmp = (a.customer||'').localeCompare(b.customer||'');
            return cmp !== 0 ? cmp : (a.machine||'').localeCompare(b.machine||'');
        });
      }

      const totalRows = displayRows.length;
      const totalPages = Math.ceil(totalRows / PAGE_SIZE) || 1;
      if (window.DEFECTS_CURRENT_PAGE > totalPages) window.DEFECTS_CURRENT_PAGE = totalPages;
      if (window.DEFECTS_CURRENT_PAGE < 1) window.DEFECTS_CURRENT_PAGE = 1;

      const startIdx = (window.DEFECTS_CURRENT_PAGE - 1) * PAGE_SIZE;
      const endIdx = startIdx + PAGE_SIZE;
      const pageRows = displayRows.slice(startIdx, endIdx);

      const customerRowSpans = {};
      if (groupByCust) {
        let i = 0;
        while (i < pageRows.length) {
          const cust = pageRows[i].customer || 'Unknown Customer';
          let count = 1;
          for (let j = i + 1; j < pageRows.length; j++) {
            if ((pageRows[j].customer || 'Unknown Customer') === cust) count++;
            else break;
          }
          customerRowSpans[i] = count;
          for (let k = i + 1; k < i + count; k++) customerRowSpans[k] = 0;
          i += count;
        }
      }

      const machineRowSpans = {};
      if (groupByCust) {
        let i = 0;
        while (i < pageRows.length) {
          const mach = pageRows[i].machine || 'Unknown Machine';
          const cust = pageRows[i].customer || 'Unknown Customer';
          let count = 1;
          for (let j = i + 1; j < pageRows.length; j++) {
            if ((pageRows[j].machine || 'Unknown Machine') === mach && (pageRows[j].customer || 'Unknown Customer') === cust) count++;
            else break;
          }
          machineRowSpans[i] = count;
          for (let k = i + 1; k < i + count; k++) machineRowSpans[k] = 0;
          i += count;
        }
      }

      pageRows.forEach((r, idx) => {
        const tr = document.createElement("tr");
        tr.className = "df-row";
        tr.onclick = () => openDefectModal(r.name);

        const status = (r.end_date && r.end_date.trim() !== '') ? "Closed" : "Open";
        const s = status.toLowerCase();
        const badgeClass = s === "open" ? "df-badge-open" : s === "closed" ? "df-badge-closed" : "df-badge-other";
        const priority   = r.priority   || "Low";
        const desc       = r.description ? r.description.slice(0, 80) + (r.description.length > 80 ? "…" : "") : "No description";
        const technician = r.technician || r.oem || "—";
        
        const rawDate    = r.start_date || r.creation || "—";
        const reported   = rawDate !== "—" ? new Date(rawDate.split(" ")[0]).toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'}) : "—";

        // Severity colour pill
        const sevBg = priority === "High" ? "#fee2e2" : priority === "Medium" ? "#fef3c7" : "#f1f5f9";
        const sevText = priority === "High" ? "#ef4444" : priority === "Medium" ? "#f59e0b" : "#64748b";
        const sevBorder = priority === "High" ? "#fca5a5" : priority === "Medium" ? "#fcd34d" : "#cbd5e1";

        const rowBg = s === "closed" ? "transparent" 
                    : priority === "High" ? "#fef2f2" 
                    : priority === "Medium" ? "#fffbeb" 
                    : "transparent";

        tr.style.background = rowBg;
        if (r.machine_running === false) {
            tr.style.borderLeft = "4px solid #ef4444";
            tr.style.background = "#fef2f2";
            rowBg = "#fef2f2"; // Update rowBg so mouseleave restores to red tint
        }
        tr.onmouseenter = () => tr.style.background = (priority === "High" && s === "open") ? "#fee2e2" : (priority === "Medium" && s === "open") ? "#fef3c7" : "#f8fafc";
        tr.onmouseleave = () => tr.style.background = rowBg;

        const defectType = r.defect_type || "Minor";
        let typeBg = "#f1f5f9";
        let typeColor = "#64748b";
        const dtLower = defectType.toLowerCase();
        if (dtLower.includes("major") || dtLower.includes("critical")) {
            typeBg = "#fee2e2"; typeColor = "#ef4444";
        }
        
        let custCell = "";
        const cName = r.customer || 'Unknown Customer';
        if (groupByCust) {
          if (customerRowSpans[idx] > 0) {
            custCell = `<td class="df-cell" rowspan="${customerRowSpans[idx]}" style="padding:10px 16px; font-weight:700; color:#0f172a; font-size:12px; border-right:1px solid #e2e8f0; vertical-align:middle; text-align:center; background:#f8fafc; max-width:140px; white-space:normal; word-wrap:break-word;">${cName}</td>`;
          }
        } else {
          custCell = `<td class="df-cell" style="padding:10px 16px; font-weight:700; color:#0f172a; font-size:12px; vertical-align:middle; text-align:center; max-width:140px; white-space:normal; word-wrap:break-word;">${cName}</td>`;
        }

        const defectHtml = `
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="background:${typeBg}; color:${typeColor}; padding:2px 8px; border-radius:12px; font-size:9px; font-weight:800; text-transform:uppercase; letter-spacing:0.5px;">${defectType}</span>
            </div>
            <div style="font-size:11px;color:#64748b;margin-top:4px; max-width:250px; white-space:normal; word-wrap:break-word; line-height:1.4;">${desc}</div>
        `;

        const machineModel = r.model || r.oem || 'Unknown Machine';
        const machineInnerHtml = `
            <div style="font-weight:700;color:#0f172a;font-size:13px;">${machineModel}</div>
            <div style="font-size:11px;color:#64748b;margin-top:2px;">SN: ${r.machine || ''}</div>
        `;
        
        let machCell = "";
        if (groupByCust) {
          if (machineRowSpans[idx] > 0) {
            machCell = `<td class="df-cell" rowspan="${machineRowSpans[idx]}" style="padding:10px 16px; border-right:1px solid #e2e8f0; vertical-align:middle; background:#f8fafc;">${machineInnerHtml}</td>`;
          }
        } else {
          machCell = `<td class="df-cell" style="padding:10px 16px;">${machineInnerHtml}</td>`;
        }

        const statusColor = s === 'closed' ? '#22c55e' : (s === 'open' ? '#3b82f6' : '#64748b');
        
        let extraStatusHtml = "";
        if (r.quotation_sent_date && r.quotation_sent_date.trim() !== '') {
            const qDate = new Date(r.quotation_sent_date.split(" ")[0]).toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'});
            extraStatusHtml += `<div style="font-size:10px;color:#64748b;margin-top:2px;">Quote: ${qDate}</div>`;
        }
        if (r.parts_eta && r.parts_eta.trim() !== '') {
            const pDate = new Date(r.parts_eta.split(" ")[0]).toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'});
            extraStatusHtml += `<div style="font-size:10px;color:#64748b;margin-top:2px;">Parts ETA: ${pDate}</div>`;
        }
        
        let displayStatus = r.status || status;
        if (displayStatus.length > 50) displayStatus = displayStatus.substring(0, 47) + '...';

        const statusHtml = `<div style="font-weight:800;color:${statusColor};font-size:11px;text-transform:uppercase; max-width:180px; white-space:normal; word-wrap:break-word; line-height:1.4;">${displayStatus}</div>${extraStatusHtml}`;
        
        const tedStr = (r.ted_status === 'TBA') ? 'TBA' : ((r.ted && r.ted.trim() !== '') ? new Date(r.ted.split(" ")[0]).toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'}) : "-");
        const redStr = (r.red && r.red.trim() !== '') ? new Date(r.red.split(" ")[0]).toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'}) : "-";

        let daysOnBreakdown = "";
        if (r.start_date) {
            const start = new Date(r.start_date.split(" ")[0]);
            const end = (r.end_date && r.end_date.trim() !== '') ? new Date(r.end_date.split(" ")[0]) : new Date();
            const diff = Math.floor((end - start) / (1000 * 60 * 60 * 24));
            daysOnBreakdown = diff >= 0 ? diff : 0;
        }

        // Severity Ribbon
        let ribbonHtml = "";
        if (priority === "High" || priority === "Medium") {
            ribbonHtml = `
              <div style="position:absolute; right:4px; top:4px; bottom:4px; width:20px; background:${sevText}; color:white; font-size:8px; font-weight:600; display:flex; align-items:center; justify-content:center; writing-mode:vertical-rl; transform:rotate(180deg); letter-spacing:0.5px; opacity:0.85; box-shadow:0 2px 4px rgba(0,0,0,0.1); border-radius: 4px;">
                ${priority.toUpperCase()}
              </div>
            `;
        }

        tr.innerHTML = `
          <td class="df-cell" style="padding:10px; font-weight:800; color:#94a3b8; font-size:11px; text-align:center; border-right: 1px solid #f1f5f9;">${startIdx + idx + 1}</td>
          ${custCell}
          ${machCell}
          <td class="df-cell" style="padding:10px 16px;">${defectHtml}</td>
          <td class="df-cell" style="padding:10px 16px;">${statusHtml}</td>
          <td class="df-cell" style="color:#0f172a; padding:10px 16px; font-size:11px; font-weight:500;">${tedStr}</td>
          <td class="df-cell" style="color:#0f172a; padding:10px 16px; font-size:11px; font-weight:500;">${redStr}</td>
          <td class="df-cell" style="color:var(--text-muted); padding:10px 16px; font-weight:600; text-align:center;">${daysOnBreakdown}</td>
          <td class="df-cell" style="text-align:right; font-weight:600; padding:10px 32px 10px 16px; color:#475569; position:relative; overflow:hidden;">
            ${reported}
            ${ribbonHtml}
          </td>
        `;
        tbody.appendChild(tr);
      });

      // Pagination Controls Row
      const pagTr = document.createElement("tr");
      pagTr.innerHTML = `<td colspan="9" style="padding:12px 16px; background:#f8fafc; border-top:1px solid #e2e8f0; border-radius:0 0 8px 8px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div style="font-size:11px; color:#64748b; font-weight:600;">Showing ${startIdx + 1} to ${Math.min(endIdx, totalRows)} of ${totalRows} defects</div>
          <div style="display:flex; gap:6px;">
            <button class="btn btn-secondary btn-sm" onclick="window.changeDefectsPage(-1)" ${window.DEFECTS_CURRENT_PAGE === 1 ? 'disabled' : ''} style="font-size:11px; padding:6px 12px;">Previous</button>
            <button class="btn btn-secondary btn-sm" onclick="window.changeDefectsPage(1)" ${window.DEFECTS_CURRENT_PAGE === totalPages ? 'disabled' : ''} style="font-size:11px; padding:6px 12px;">Next</button>
          </div>
        </div>
      </td>`;
      tbody.appendChild(pagTr);
    }

    // --- ADD TECHNICIAN LOGIC ---
    function openAddTechnicianModal() {
      document.getElementById('at-full-name').value = '';
      document.getElementById('at-mobile').value = '';
      document.getElementById('at-site').value = '';
      document.getElementById('at-designation').value = '';
      document.getElementById('modal-add-technician').classList.remove('hidden');
    }

    function closeAddTechnicianModal() {
      document.getElementById('modal-add-technician').classList.add('hidden');
    }

    function openLogHoursModal(techName) {
      document.getElementById('lh-technician').value = techName || '';
      const searchInput = document.getElementById('lh-technician-search');
      if (searchInput) {
        searchInput.value = techName || '';
        searchInput.readOnly = !!techName;
      }
      document.getElementById('lh-date').value = new Date().toISOString().split('T')[0];
      document.getElementById('lh-productive').value = '0.0';
      document.getElementById('lh-travel').value = '0.0';
      document.getElementById('lh-admin').value = '0.0';
      document.getElementById('lh-house-keeping').value = '0.0';
      document.getElementById('lh-non-productive').value = '0.0';
      document.getElementById('modal-log-hours').classList.remove('hidden');
    }

    function closeLogHoursModal() {
      document.getElementById('modal-log-hours').classList.add('hidden');
    }

    async function saveLogHours() {
      const btn = document.getElementById('btn-save-log-hours');
      const tech = document.getElementById('lh-technician').value;
      const date = document.getElementById('lh-date').value;
      
      if (!date) {
        showToast("Date is required.", "error");
        return;
      }
      
      btn.disabled = true;
      btn.innerHTML = 'Saving...';
      
      const sbPayload = {
        technician: tech,
        date: date,
        productive: parseFloat(document.getElementById('lh-productive').value) || 0.0,
        travel: parseFloat(document.getElementById('lh-travel').value) || 0.0,
        admin: parseFloat(document.getElementById('lh-admin').value) || 0.0,
        house_keeping: parseFloat(document.getElementById('lh-house-keeping').value) || 0.0,
        non_productive: parseFloat(document.getElementById('lh-non-productive').value) || 0.0
      };
      
      try {
        const res = await window.electron.invoke('supabase:query', {
          table: 'ft_technician_hour_log',
          method: 'insert',
          params: {
            data: sbPayload
          }
        });
        
        if (res && res.ok) {
          showToast("Hours logged successfully in Supabase", "success");
          closeLogHoursModal();
        } else {
          console.error("Supabase error:", res?.error);
          showToast("Failed to log hours in Supabase", "error");
        }
      } catch (e) {
        console.error("saveLogHours error:", e);
        showToast("Error logging hours", "error");
      } finally {
        btn.disabled = false;
        btn.innerHTML = 'Save';
      }
    }

    async function saveNewTechnician() {
      const name = document.getElementById('at-full-name').value.trim();
      const mobile = document.getElementById('at-mobile').value.trim();
      const site = document.getElementById('at-site').value;
      const designation = document.getElementById('at-designation').value;
      const btn = document.getElementById('btn-save-technician');

      if (!name || !mobile) {
        showToast("Full Name and Mobile Phone are required.", "error");
        return;
      }

      btn.disabled = true;
      btn.innerHTML = 'Saving...';

      try {
        const res = await window.electron.invoke('supabase:query', {
          table: 'ft_technicians',
          method: 'insert',
          params: { records: [{
            frappe_name: name, // Use name as frappe_name fallback for unique constraint
            full_name: name,
            mobile_phone: mobile,
            site: site || null,
            designation: designation || null,
            status: 'Active'
          }] }
        });

        if (res && res.ok) {
          showToast("Technician saved successfully", "success");
          closeAddTechnicianModal();
          
          // Invalidate cache
          FT_TECH_CACHE.data = null;
          FT_TECH_CACHE.ts = 0;
          if (typeof loadTechniciansView === 'function' && document.getElementById('view-technicians') && !document.getElementById('view-technicians').classList.contains('hidden')) {
            loadTechniciansView();
          }
          
          // Automatically select in the New FSP modal if it's open
          const searchEl = document.getElementById('fsp-new-technician-search');
          const hiddenEl = document.getElementById('fsp-new-technician');
          if (searchEl && searchEl.offsetParent !== null) {
            searchEl.value = name;
            if (hiddenEl) hiddenEl.value = name;
          }
          
          // Also check the Edit FSP modal
          const editSearchEl = document.getElementById('fsp-edit-technician-search');
          const editHiddenEl = document.getElementById('fsp-edit-technician');
          if (editSearchEl && editSearchEl.offsetParent !== null) {
            editSearchEl.value = name;
            if (editHiddenEl) editHiddenEl.value = name;
          }
        } else {
          showToast(res?.error?.message || "Failed to save technician", "error");
        }
      } catch (e) {
        console.error("saveNewTechnician error:", e);
        showToast("Error saving technician", "error");
      } finally {
        btn.disabled = false;
        btn.innerHTML = 'Save';
      }
    }

    // --- TECHNICIANS VIEW LOGIC ---
    async function loadTechniciansView() {
      const tbody = document.getElementById('technicians-table-body');
      if (!tbody) return;
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px; color:#64748b;">Loading technicians...</td></tr>';

      try {
        const res = await window.electron.invoke('supabase:query', {
          table: 'ft_technicians',
          method: 'select',
          params: { columns: '*', range: { from: 0, to: 1000 } }
        });
        
        if (!res || !res.ok) throw new Error(res?.error?.message || "Failed to load technicians");
        const techs = res.data || [];
        techs.sort((a,b) => (a.full_name || '').localeCompare(b.full_name || ''));
        
        tbody.innerHTML = '';
        if (techs.length === 0) {
          tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px; color:#64748b;">No technicians found.</td></tr>';
          return;
        }

        techs.forEach(t => {
          const tr = document.createElement('tr');
          const statColor = t.status === 'Active' ? '#22c55e' : '#ef4444';
          tr.innerHTML = `
            <td style="font-weight:600; color:#0f172a;">${t.full_name || '-'}</td>
            <td>${t.mobile_phone || '-'}</td>
            <td>${t.site || '-'}</td>
            <td>${t.designation || '-'}</td>
            <td><span style="display:inline-flex; align-items:center; gap:6px; padding:4px 8px; border-radius:12px; font-size:11px; font-weight:700; background:${statColor}1a; color:${statColor};"><span style="width:6px;height:6px;border-radius:50%;background:${statColor};"></span>${t.status || 'Active'}</span></td>
            <td>
              <div style="display:flex; gap:8px;">
                <button onclick="toggleTechnicianStatus('${t.id}', '${t.status}')" class="btn btn-secondary btn-sm" style="padding:4px 8px; font-size:11px;" title="Toggle Status">Toggle</button>
                <button onclick="deleteTechnician('${t.id}', '${t.full_name}')" class="btn btn-secondary btn-sm" style="padding:4px 8px; font-size:11px; color:#ef4444; border-color:#fecaca;" title="Delete">Del</button>
                <button onclick="openLogHoursModal('${(t.full_name || '').replace(/'/g, "\\'")}')" class="btn btn-secondary btn-sm" style="padding:4px 8px; font-size:11px; color:#3b82f6; border-color:#bfdbfe;" title="Log Hours">Log Hours</button>
              </div>
            </td>
          `;
          tbody.appendChild(tr);
        });
        
      } catch (e) {
        console.error(e);
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px; color:#ef4444;">Error loading technicians.</td></tr>';
      }
    }

    async function toggleTechnicianStatus(id, currentStatus) {
      const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
      try {
        const res = await window.electron.invoke('supabase:query', {
          table: 'ft_technicians',
          method: 'update',
          params: { updates: { status: newStatus }, match: { id: id } }
        });
        if (res && res.ok) {
          showToast(`Technician marked as ${newStatus}`, "success");
          loadTechniciansView();
          FT_TECH_CACHE.data = null; // Invalidate cache
        } else {
          showToast("Failed to update status", "error");
        }
      } catch (e) {
        showToast("Error updating status", "error");
      }
    }

    async function deleteTechnician(id, name) {
      if (!confirm(`Are you sure you want to delete technician: ${name}?`)) return;
      try {
        const res = await window.electron.invoke('supabase:query', {
          table: 'ft_technicians',
          method: 'delete',
          params: { match: { id: id } }
        });
        if (res && res.ok) {
          showToast("Technician deleted", "success");
          loadTechniciansView();
          FT_TECH_CACHE.data = null; // Invalidate cache
        } else {
          showToast("Failed to delete technician", "error");
        }
      } catch (e) {
        showToast("Error deleting technician", "error");
      }
    }

    // --- FSP TECHNICIAN TYPEAHEAD ---
    const FT_TECH_CACHE = { data: null, ts: 0 };

    async function fspTechSearch(q, hiddenId, dropId) {
      const drop = document.getElementById(dropId);
      const hidden = document.getElementById(hiddenId);
      if (!drop) return;

      // Load technician list from Supabase (cached for 60s)
      let techs = FT_TECH_CACHE.data;
      if (!techs || (Date.now() - FT_TECH_CACHE.ts) > 60000) {
        try {
          const res = await window.electron.invoke('supabase:query', {
            table: 'ft_technicians',
            method: 'select',
            params: { columns: '*', range: { from: 0, to: 1000 } }
          });
          techs = (res && res.data) ? res.data : [];
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
            (t.full_name || '').toLowerCase().includes(ql) ||
            (t.mobile_phone || '').toLowerCase().includes(ql)
          )
        : techs.slice(0, 15);

      // Render dropdown
      drop.innerHTML = '';
      if (matches.length === 0) {
        drop.innerHTML = '<li style="padding:10px 14px; color:#94a3b8; font-size:12px;">No technicians found</li>';
      } else {
        matches.forEach(t => {
          const li = document.createElement('li');
          li.style.cssText = 'padding:8px 14px; cursor:pointer; font-size:12px; border-bottom:1px solid #f1f5f9; display:flex; flex-direction:column;';
          li.innerHTML = `<span style="font-weight:700; color:#1e293b;">${t.full_name}</span>`
                       + (t.mobile_phone ? `<span style="font-size:10px; color:#64748b;">${t.mobile_phone}</span>` : '');
          li.onmouseenter = () => li.style.background = '#f8fafc';
          li.onmouseleave = () => li.style.background = '';
          li.onmousedown  = (e) => {
            e.preventDefault();
            if (hidden) hidden.value = t.full_name;
            const searchEl = document.getElementById(hiddenId + '-search');
            if (searchEl) searchEl.value = t.full_name;
            drop.style.display = 'none';
          };
          drop.appendChild(li);
        });
      }

      // Add "New Technician" Button
      const addLi = document.createElement('li');
      addLi.style.cssText = 'padding:8px 14px; cursor:pointer; font-size:12px; border-top:1px solid #e2e8f0; display:flex; align-items:center; gap:8px; background:#f8fafc; color:#2563eb; font-weight:700;';
      addLi.innerHTML = `<span>+</span> <span>Add New Technician</span>`;
      addLi.onmouseenter = () => addLi.style.background = '#eff6ff';
      addLi.onmouseleave = () => addLi.style.background = '#f8fafc';
      addLi.onmousedown = (e) => {
        e.preventDefault();
        drop.style.display = 'none';
        openAddTechnicianModal();
      };
      drop.appendChild(addLi);

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
    function openFspModal(presetDate = null, preselectedMachine = null) {
      const modal = document.getElementById("modal-fsp-new");
      if (!modal) return;
      
      if (modal.parentElement !== document.body) {
        document.body.appendChild(modal);
      }
      
      // Reset fields
      if (preselectedMachine) {
        let mObj = typeof preselectedMachine === 'object' ? preselectedMachine : ((window.MACHINES_MAP && window.MACHINES_MAP[preselectedMachine]) ? window.MACHINES_MAP[preselectedMachine] : { name: preselectedMachine });
        let snDisp = mObj.sn || mObj.name || "";
        document.getElementById("fsp-new-sn").value = String(snDisp);
        document.getElementById("fsp-new-sn").dataset.selectedName = String(mObj.name || "");
        document.getElementById("fsp-new-customer").value = String(mObj.customer || "");
        document.getElementById("fsp-new-warranty").value = String(mObj.warranty_status || "Standard");
        document.getElementById("fsp-new-location").value = String(mObj.current_location || mObj.location || "");
        if (typeof loadFspMachineDefects === 'function') loadFspMachineDefects(mObj.name);
      } else {
        document.getElementById("fsp-new-sn").value = "";
        document.getElementById("fsp-new-sn").dataset.selectedName = "";
        document.getElementById("fsp-new-customer").value = "";
        document.getElementById("fsp-new-warranty").value = "";
        document.getElementById("fsp-new-location").value = "";
      }
      document.getElementById("fsp-new-description").value = "";
      document.getElementById("fsp-new-technician").value = "";
      const techSearch = document.getElementById("fsp-new-technician-search");
      if (techSearch) techSearch.value = "";
      const techDrop = document.getElementById("fsp-tech-drop-new");
      if (techDrop) techDrop.style.display = "none";
      document.getElementById("fsp-new-date").value = presetDate || new Date().toISOString().split('T')[0];
      document.getElementById("fsp-new-defects").value = "";
      
      const defContainer = document.getElementById("fsp-defects-container");
      if (defContainer) defContainer.style.display = "block";
      const defTbody = document.getElementById("fsp-defects-tbody");
      if (defTbody) defTbody.innerHTML = '<tr><td colspan="3" style="padding:12px; text-align:center; color:#94a3b8; font-size:11px;">🔍 Please select a machine to view its open defects</td></tr>';

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

            // Service Recommendation Logic (80 HMR threshold)
            const suggBox = document.getElementById("fsp-service-suggestion");
            const suggText = document.getElementById("fsp-service-suggestion-text");
            let hrsRemaining = m.hours_remaining_to_service;
            if (hrsRemaining == null && m.next_service_hmr != null && m.current_hmr != null) {
              hrsRemaining = Number(m.next_service_hmr) - Number(m.current_hmr);
            }
            
            if (hrsRemaining != null && hrsRemaining <= 80) {
              const svcType = m.next_service_type ? `${m.next_service_type}H ` : "";
              const hrsText = hrsRemaining < 0 ? `OVERDUE by ${Math.abs(hrsRemaining).toFixed(0)} hrs` : `due in ${Number(hrsRemaining).toFixed(0)} hrs`;
              suggText.innerHTML = `Since you are attending a defect, consider doing the <strong>${svcType}Service</strong> which is ${hrsText}.`;
              suggBox.dataset.serviceType = `${svcType}Service`.trim();
              suggBox.style.display = "flex";
            } else if (suggBox) {
              suggBox.style.display = "none";
              suggBox.dataset.serviceType = "";
            }

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

    function fspAddSuggestedService() {
      const suggBox = document.getElementById("fsp-service-suggestion");
      const descInput = document.getElementById("fsp-new-description");
      const tbody = document.getElementById("fsp-defects-tbody");
      
      if (!suggBox || !descInput) return;
      
      const svcType = suggBox.dataset.serviceType;
      if (!svcType) return;
      
      // 1. Add to the Description field
      let currentVal = descInput.value.trim();
      if (currentVal && !currentVal.includes(svcType)) {
        descInput.value = currentVal + ", " + svcType;
      } else if (!currentVal) {
        descInput.value = svcType;
      }
      
      // 2. Add as a checked row in the defects table so it's formally listed
      if (tbody) {
        // Clear the empty state message if it exists
        if (tbody.innerHTML.includes("No open defects") || tbody.innerHTML.includes("Please select a machine")) {
          tbody.innerHTML = "";
        }
        
        const tr = document.createElement("tr");
        tr.style.borderBottom = "1px solid #fde68a";
        tr.style.background = "#fffbeb";
        tr.innerHTML = `
          <td style="padding:6px 10px; vertical-align:middle;">
            <input type="checkbox" class="fsp-defect-check" data-name="Scheduled Service" data-desc="${svcType}" checked style="cursor:pointer; accent-color:#f59e0b;">
          </td>
          <td style="padding:6px 10px; line-height:1.3;">
            <div style="font-weight:600; color:#92400e; font-size:12px;">Recommended Service</div>
            <div style="font-size:10px; color:#b45309; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:280px;">${svcType} (Added from suggestion)</div>
          </td>
          <td style="padding:6px 10px; white-space:nowrap;">
            <span style="font-size:9px; font-weight:700; color:#f59e0b; text-transform:uppercase;">MEDIUM</span>
          </td>
        `;
        // Insert at top of list
        tbody.insertBefore(tr, tbody.firstChild);
      }
      
      // Hide suggestion banner after adding
      suggBox.style.display = "none";
    }

    async function loadFspMachineDefects(machineName, targetTbody = "fsp-defects-tbody") {
      const containerId = targetTbody === "fsp-edit-defects-tbody" ? "fsp-edit-defects-container" : "fsp-defects-container";
      const container = document.getElementById(containerId);
      const tbody = document.getElementById(targetTbody);
      if (!container || !tbody) return;

      tbody.innerHTML = '';
      window.showOmnisLoader('Loading defects...');
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
              'description','on_hold','ted','end_date','defect_days','category','solution','quotation_sent_date','parts_eta','ted_status','red'
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
            match: { machine: machineName }
          }
        });

        // Filter based on end_date (if no end_date, it is open)
        const defects = (sbRes?.data || []).filter(d => {
            return !d.end_date || String(d.end_date).trim() === "";
        });
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
        tbody.innerHTML = `<tr><td colspan="3" style="padding:10px; text-align:center; color:#ef4444; font-size:11px;">Failed to load defects  ${err.message}</td></tr>`;
      } finally {
        window.hideOmnisLoader();
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
      const contact_person = document.getElementById("fsp-new-contact").value.trim();
      const contact_number = document.getElementById("fsp-new-contact-number").value.trim();
      const warranty_status = document.getElementById("fsp-new-warranty").value;
      const location = document.getElementById("fsp-new-location").value.trim();

      // Aggregate selected defects from checklist + manual notes
      const selectedDefects = Array.from(document.querySelectorAll(".fsp-defect-check:checked"))
        .map(el => "• " + (el.dataset.desc || el.dataset.name))
        .join("\n");
      
      const manualDefects = document.getElementById("fsp-new-defects").value.trim();
      const additionalNotes = document.getElementById("fsp-new-notes").value.trim();
      let finalDefects = selectedDefects;
      if (manualDefects) {
        finalDefects = (finalDefects ? finalDefects + "\n" : "") + manualDefects;
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
        const payload = {
          machine_name: machine,
          description, 
          raw_date: planned_date, 
          technician, 
          contact_person,
          contact_number,
          defects: finalDefects, 
          additional_notes: additionalNotes,
          status: "Proposed",
          location
        };
        
        // Attempt to auto-fill customer if available in local machine register
        if (typeof FT_MACHINE_ROWS !== 'undefined') {
          const mObj = FT_MACHINE_ROWS.find(m => m.name === machine || m.machine_name === machine);
          if (mObj) payload.customer = mObj.customer;
        }

        const { error } = await window.electron.invoke('supabase:query', {
          table: 'ft_service_plan',
          method: 'insert',
          params: {
            data: payload
          }
        });

        if (!error) {
          console.log("✅ Success confirmed via Supabase insert. Closing modal.");
          showToast("✅ Service Plan Entry Created", "success");
          closeFspModal();
          if (typeof loadFieldServicePlan === "function") loadFieldServicePlan();
        } else {
          console.warn("⚠️ Supabase error:", error);
          const msg = error.message || "Entry might have been created (check list)";
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
      const scuArea = document.getElementById("fsp-text-scu");
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
      document.getElementById("fsp-edit-contact").value = r.contact_person || "";
      document.getElementById("fsp-edit-contact-number").value = r.contact_number || "";
      const editNotes = document.getElementById("fsp-edit-notes");
      if (editNotes) editNotes.value = r.additional_notes || "";

      let machineInfo = (window.MACHINES_MAP && window.MACHINES_MAP[r.machine]) || {};
      const customerField = document.getElementById("fsp-edit-customer");
      if (customerField) customerField.value = r.customer || machineInfo.customer || "Auto-filled";
      const warrantyField = document.getElementById("fsp-edit-warranty");
      if (warrantyField) warrantyField.value = r.warranty_status || machineInfo.warranty_status || "Auto-filled";
      
      // Load defects checklist for this machine
      if (typeof loadFspMachineDefects === "function" && r.machine) {
        loadFspMachineDefects(r.machine, "fsp-edit-defects-tbody");
      }
      if (r.machine) {
        try {
          const res = await window.electron.invoke('supabase:query', {
            table: 'ft_machine',
            method: 'getOne',
            params: { name: r.machine }
          });
          if (res && res.data) {
            machineInfo = res.data;
            if (window.MACHINES_MAP) window.MACHINES_MAP[r.machine] = machineInfo;
          }
        } catch(e) {}
      }

      const model = machineInfo.model || "Unknown Model";
      const sn = machineInfo.sn || r.machine;
      const fleet = machineInfo.fleet_no || "NA";
      const internalFleet = machineInfo.mxg_fleet_no || "NA";
      
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
      const formattedDefects = rawScope.map(s => s.startsWith("•") || s.startsWith("*") ? s : "• " + s).join("\n");
      let scopeLines = `* ${r.description || "Service/Repair"}`;
      if (formattedDefects) {
        scopeLines += `\n${formattedDefects}`;
      }

      let fsiContact = r.contact_person || "[To be added]";
      if (r.contact_number) {
        fsiContact += ` - ${r.contact_number}`;
      }

      // FSI Template
      const fsi = `${contact}
FSI ${dateFmt}
*CUSTOMER* : ${r.customer}
*MACHINE* : ${model} SN: ${sn}
*CFN* : ${fleet}
*IFN* : ${internalFleet}
*WARRANTY STATUS* : ${r.warranty_status || "NA"}
*SCOPE OF WORK* :  
${scopeLines}
*Additional Notes* :
${r.additional_notes || "[To be added]"}
*LOCATION* : ${r.location}
*ETA* : TBA
*CONTACT* : ${fsiContact}`;

      // FSB Template
      const fsb = `Good evening
*Field Service Booking*
*Date*: ${dateFmt}

*MACHINE*: ${model} *SN*: ${sn}
*CFN*: ${fleet}
*IFN*: ${internalFleet}
*SCOPE OF WORK*:
${scopeLines}

*LOCATION*: ${r.location}
*ATTENDING TECHNICIANS*:
* ${r.technician || "TBA"}
*HOTLINE*: 0774454839
*ETA*: TBA
We will let you know if there are any changes to the field service booking.`;

      // SCU Template
      const formatResolution = (txt) => {
        let t = txt.trim();
        if (t.startsWith('•') || t.startsWith('*') || t.startsWith('-')) t = t.substring(1).trim();
        let lower = t.toLowerCase();
        
        if (lower.includes("needs topup") || lower.includes("needs top up") || lower.includes("needs topping up")) {
          return "- " + t.replace(/needs top\s*up/gi, "was topped up").replace(/needs topping up/gi, "was topped up");
        }
        if (lower.includes("needs replace")) {
          return "- " + t.replace(/needs replace(ment|ing)?/gi, "was replaced");
        }
        if (lower.includes("needs repair")) {
          return "- " + t.replace(/needs repair(ing)?/gi, "was repaired");
        }
        if (lower.includes("needs servic")) {
          return "- " + t.replace(/needs servic(e|ing)?/gi, "was serviced");
        }
        if (lower.includes("needs check")) {
          return "- " + t.replace(/needs check(ing)?/gi, "was checked");
        }
        
        if (lower.startsWith("check ")) return "- " + t.replace(/^check\s/i, "Checked ");
        if (lower.startsWith("inspect ")) return "- " + t.replace(/^inspect\s/i, "Inspected ");
        if (lower.startsWith("replace ")) return "- " + t.replace(/^replace\s/i, "Replaced ");
        if (lower.startsWith("fix ")) return "- " + t.replace(/^fix\s/i, "Fixed ");
        if (lower.startsWith("repair ")) return "- " + t.replace(/^repair\s/i, "Repaired ");
        
        return "- Attended to: " + t;
      };
      
      let scuScope = "- Completed " + (r.description || "Service/Repair") + "\n";
      rawScope.forEach(s => {
        if (s.trim()) scuScope += formatResolution(s) + "\n";
      });
      scuScope += "- Checked machine for any additional defects\n- Tested machine – operating normally";

      const scu = `Good day,
SERVICE COMPLETION UPDATE 

MACHINE: ${model} SN: ${sn}
CUSTOMER FLEET NUMBER: ${fleet}
INTERNAL FLEET NUMBER: ${internalFleet}
SCOPE OF WORK:  
${scuScope}
DEFECTS / FINDINGS:  
- None
RECOMMENDATIONS / NEXT STEPS:  
- NA`;

      fsiArea.value = fsi;
      fsbArea.value = fsb;
      if (scuArea) scuArea.value = scu;
      
      modal.classList.remove("hidden");
      switchFspTab("fsi");
    }

    async function saveFspEdit() {
      const name = document.getElementById("fsp-edit-name").value;
      const btn = document.getElementById("btn-fsp-edit-save");
      if (!name) return;

      let existingDefects = document.getElementById("fsp-edit-defects").value;
      const modalEdit = document.getElementById("modal-fsp-detail");
      if (modalEdit) {
        const newlySelected = Array.from(modalEdit.querySelectorAll(".fsp-defect-check:checked"))
          .map(el => "• " + (el.dataset.desc || el.dataset.name));
        newlySelected.forEach(d => {
          if (!existingDefects.includes(d)) {
            existingDefects = (existingDefects ? existingDefects + "\n" : "") + d;
          }
        });
      }

      const payload = {
        name: name,
        description: document.getElementById("fsp-edit-description").value,
        location: document.getElementById("fsp-edit-location").value,
        contact_person: document.getElementById("fsp-edit-contact").value,
        contact_number: document.getElementById("fsp-edit-contact-number").value,
        technician: document.getElementById("fsp-edit-technician").value,
        raw_date: document.getElementById("fsp-edit-date").value,
        status: document.getElementById("fsp-edit-status").value,
        defects: existingDefects,
        additional_notes: document.getElementById("fsp-edit-notes").value
      };

      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-small"></span> Updating...';
      }

      try {
        const { error } = await window.electron.invoke('supabase:query', {
          table: 'ft_service_plan',
          method: 'update',
          params: {
            data: payload,
            match: name.length > 20 ? { id: name } : { frappe_name: name }
          }
        });
        if (!error) {
          showToast("✅ FSP Entry Updated", "success");
          closeFspDetailModal();
          loadFieldServicePlan();
        } else {
          showToast(error.message || "Update failed", "error");
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

    function deleteFspEntry(id) {
      if (!id) return;
      showUiConfirm('Delete Job Plan', 'Are you sure you want to delete this job plan? This action cannot be undone.', async () => {
        showToast("Deleting entry...", "info");
        try {
          const { error } = await window.electron.invoke('supabase:query', {
            table: 'ft_service_plan',
            method: 'delete',
            params: { match: { id: id } }
          });
          
          if (error) throw new Error(error.message);
          
          showToast("✅ Entry deleted", "success");
          loadFieldServicePlan();
        } catch (e) {
          console.error(e);
          showToast("Failed to delete entry", "error");
        }
      });
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

    
    window.forceSyncDefects = async function() {
      try {
        console.log("Forcing sync of all defects from Frappe...");
        showToast("Force syncing defects from Frappe...", "info");
        const res = await callFrappe("/api/method/mxg_fleet_track.omnis_dashboard.ft_defects_dashboard.get_ft_defect_summary", {}, "GET");
        
        // Workaround for remote server not having 'category' in summary endpoint yet:
        let defectCats = {};
        try {
           let start = 0;
           let limit = 1000;
           while (true) {
               const catRes = await callFrappe("/api/method/frappe.client.get_list", { doctype: "FT Defects Log", fields: '["name", "category", "solution", "quotation_sent_date", "parts_eta", "ted_status", "red", "ted"]', limit_page_length: limit, limit_start: start }, "GET");
               if (catRes.message && catRes.message.length > 0) {
                   catRes.message.forEach(c => { defectCats[c.name] = c; });
                   if (catRes.message.length < limit) break;
                   start += limit;
               } else {
                   break;
               }
           }
        } catch(e) { console.warn("Failed to fetch defect categories mapping from Frappe", e); }

        if (res.message && res.message.rows) {
          const rows = res.message.rows;
          const toUpsert = rows.map(r => {
            // Merge natively fetched fields
            if (defectCats[r.name]) {
               const extra = defectCats[r.name];
               r.category = extra.category;
               r.solution = extra.solution;
               r.quotation_sent_date = extra.quotation_sent_date;
               r.parts_eta = extra.parts_eta;
               r.ted_status = extra.ted_status;
               r.red = extra.red;
               if (!r.ted) r.ted = extra.ted; // prefer summary ted if exists
            }

            const row = {};
            const ALLOWED = new Set([
              'name','defect_type','machine','customer','fleetrack_managed','oem','model',
              'location','region','warranty_status','start_date','priority','status',
              'description','on_hold','ted','end_date','defect_days','category','solution','quotation_sent_date','parts_eta','ted_status','red'
            ]);
            for (const [k, v] of Object.entries(r)) {
              if (ALLOWED.has(k)) row[k] = v ?? null;
            }
            return row;
          });
          
          // Backfill extra fields (category, solution, etc.) for historical records not in summary
          const summaryNames = new Set(rows.map(r => r.name));
          if (window.FT_DEFECTS_DATA) {
              window.FT_DEFECTS_DATA.forEach(d => {
                  if (!summaryNames.has(d.name) && defectCats[d.name]) {
                      const extra = defectCats[d.name];
                      if (d.category !== extra.category || d.solution !== extra.solution || d.red !== extra.red) {
                          const updatedRow = { ...d };
                          updatedRow.category = extra.category;
                          updatedRow.solution = extra.solution;
                          updatedRow.quotation_sent_date = extra.quotation_sent_date;
                          updatedRow.parts_eta = extra.parts_eta;
                          updatedRow.ted_status = extra.ted_status;
                          updatedRow.red = extra.red;
                          if (!updatedRow.ted) updatedRow.ted = extra.ted;
                          
                          // Clean up undefined/null values before upsert to match allowed schema
                          const ALLOWED = new Set([
                            'name','defect_type','machine','customer','fleetrack_managed','oem','model',
                            'location','region','warranty_status','start_date','priority','status',
                            'description','on_hold','ted','end_date','defect_days','category','solution','quotation_sent_date','parts_eta','ted_status','red'
                          ]);
                          const cleanRow = {};
                          for (const [k, v] of Object.entries(updatedRow)) {
                            if (ALLOWED.has(k)) cleanRow[k] = v ?? null;
                          }
                          toUpsert.push(cleanRow);
                      }
                  }
              });
          }

          const BATCH_SIZE = 500;
          for (let i = 0; i < toUpsert.length; i += BATCH_SIZE) {
              const batch = toUpsert.slice(i, i + BATCH_SIZE);
              await window.electron.invoke('supabase:query', {
                  table: 'ft_defect', method: 'upsert', params: { options: { onConflict: 'name', ignoreDuplicates: true } }, data: batch
              });
          }
          showToast(`Synced ${toUpsert.length} defects!`, "success");
          
          // Reload
          loadFtDefects();
        }
      } catch (e) {
        console.error(e);
        showToast("Failed to force sync", "err");
      }
    };

    
    let FT_DEFECT_CATEGORY_DROPDOWN_INIT = false;
    function initDefectCategorySearch() {
      if (FT_DEFECT_CATEGORY_DROPDOWN_INIT) return;
      const input = document.getElementById("defect-category");
      const dropdown = document.getElementById("defect-category-dropdown");
      if (!input || !dropdown) return;
      
      const renderCats = (q) => {
        if (!window.DEFECT_CATEGORIES) return;
        const matches = window.DEFECT_CATEGORIES.filter(c => c.name.toLowerCase().includes(q) || (c.category && c.category.toLowerCase().includes(q)));
        dropdown.innerHTML = "";
        if (matches.length === 0) {
           dropdown.classList.add("hidden");
           return;
        }
        dropdown.classList.remove("hidden");
        matches.forEach(m => {
          const li = document.createElement('li');
          li.style.cssText = "padding:8px 12px; cursor:pointer; font-size:13px; color:#1e293b; border-bottom:1px solid #f1f5f9;";
          li.textContent = m.category || m.name;
          li.onmouseover = () => { li.style.background = "#f1f5f9"; };
          li.onmouseout = () => { li.style.background = "#fff"; };
          li.onmousedown = (e) => {
            e.preventDefault();
            input.value = m.name;
            dropdown.classList.add("hidden");
          };
          dropdown.appendChild(li);
        });
      };
      
      input.addEventListener("focus", () => renderCats(""));
      input.addEventListener("input", function() { renderCats(this.value.trim().toLowerCase()); });
      input.addEventListener("blur", () => setTimeout(() => dropdown.classList.add("hidden"), 150));
      FT_DEFECT_CATEGORY_DROPDOWN_INIT = true;
    }

    function openDefectModal(defectId = null, preselectedMachine = null) {
      const modal = document.getElementById("modal-defect");
      const title = document.getElementById("defect-modal-title");
      const idInput = document.getElementById("defect-id");
      const mSearch = document.getElementById("defect-machine-search");
      
      if (modal && modal.parentElement !== document.body) {
        document.body.appendChild(modal);
      }
      
      if (typeof loadDefectCategories === 'function') loadDefectCategories();

      initDefectMachineSearch();
      initDefectCategorySearch();
      modal.classList.remove("hidden");

      if (defectId) {
        // EDIT MODE
        const defect = FT_DEFECTS_DATA.find(d => d.name === defectId);
        if (!defect) return;

        title.textContent = "Edit Defect: " + defectId;
        idInput.value = defectId;
        mSearch.value = defect.machine || "";
        mSearch.dataset.selectedName = defect.machine;
        mSearch.disabled = true;

        document.getElementById("defect-on-hold").checked = defect.on_hold ? true : false;
        document.getElementById("defect-machine-running").checked = defect.machine_running === false ? false : true;
        const delBtn = document.getElementById("btn-delete-defect");
        if (delBtn) delBtn.style.display = "block";
        document.getElementById("defect-customer").value = defect.customer || "";
        document.getElementById("defect-machine-display").value = defect.model ? defect.model + " [" + defect.machine + "]" : defect.machine || "";
        
        document.getElementById("defect-type").value = defect.defect_type || "Minor";
        document.getElementById("defect-ted-status").value = defect.ted_status || "Available";
        document.getElementById("defect-category").value = defect.category || "";
        document.getElementById("defect-priority").value = (defect.priority || "Low").split(" ")[0];
        document.getElementById("defect-status").value = defect.status || "Open";
        document.getElementById("defect-description").value = defect.description || "";
        document.getElementById("defect-solution").value = defect.solution || "";

        const splitDate = d => d ? d.split('T')[0] : "";
        document.getElementById("defect-start-date").value = splitDate(defect.start_date);
        document.getElementById("defect-end-date").value = splitDate(defect.end_date);
        document.getElementById("defect-quotation-date").value = splitDate(defect.quotation_sent_date);
        document.getElementById("defect-parts-eta").value = splitDate(defect.parts_eta);
        document.getElementById("defect-ted").value = splitDate(defect.ted);
        document.getElementById("defect-red").value = splitDate(defect.red);
        
      } else {
        // NEW MODE
        title.textContent = "Log New Defect";
        idInput.value = "";
        
        if (preselectedMachine) {
          let mObj = typeof preselectedMachine === 'object' ? preselectedMachine : ((window.MACHINES_MAP && window.MACHINES_MAP[preselectedMachine]) ? window.MACHINES_MAP[preselectedMachine] : { name: preselectedMachine });
          let disp = mObj.model ? `${mObj.model} [${mObj.name}]` : (mObj.sn || mObj.name || "");
          mSearch.value = String(disp);
          mSearch.dataset.selectedName = String(mObj.name || "");
          mSearch.disabled = false;
          document.getElementById("defect-customer").value = mObj.customer || "";
          document.getElementById("defect-machine-display").value = mObj.model ? `${mObj.model} [${mObj.name}]` : (mObj.sn || mObj.name);
        } else {
          mSearch.value = "";
          mSearch.dataset.selectedName = "";
          mSearch.disabled = false;
          document.getElementById("defect-customer").value = "";
          document.getElementById("defect-machine-display").value = "";
        }
        
        document.getElementById("defect-on-hold").checked = false;
        document.getElementById("defect-machine-running").checked = true;
        const delBtn = document.getElementById("btn-delete-defect");
        if (delBtn) delBtn.style.display = "none";
        document.getElementById("defect-type").value = "Minor";
        document.getElementById("defect-ted-status").value = "Available";
        document.getElementById("defect-category").value = "";
        document.getElementById("defect-priority").value = "Low";
        document.getElementById("defect-status").value = "Open";
        document.getElementById("defect-description").value = "";
        document.getElementById("defect-solution").value = "";

        const today = new Date().toISOString().split('T')[0];
        document.getElementById("defect-start-date").value = today;
        document.getElementById("defect-end-date").value = "";
        document.getElementById("defect-quotation-date").value = "";
        document.getElementById("defect-parts-eta").value = "";
        document.getElementById("defect-ted").value = "";
        document.getElementById("defect-red").value = "";


      }
    }

    function closeDefectModal() {
      document.getElementById("modal-defect").classList.add("hidden");
    }

    function _fillDefectMachineInfo(name) {
      const m = window.MACHINES_MAP?.[name];
      if(!m) return;
      const cu = document.getElementById('defect-customer');
      const md = document.getElementById('defect-machine-display');
      if(cu) cu.value = m.customer || '';
      if(md) md.value = (m.model ? m.model + " [" + m.name + "]" : m.name) || '';
      const hi = document.getElementById('defect-hmr');
      if(hi && m.current_hmr != null) hi.value = m.current_hmr;
    }
    function _clearDefectMachineInfo(){
      const cu = document.getElementById('defect-customer');
      const md = document.getElementById('defect-machine-display');
      if(cu) cu.value = '';
      if(md) md.value = '';
    }
    
    async function submitDefect() {
      const id = document.getElementById("defect-id").value;
      const machine = document.getElementById("defect-machine-search").dataset.selectedName || document.getElementById("defect-machine-search").value;
      
      const on_hold = document.getElementById("defect-on-hold").checked;
      const machine_running = document.getElementById("defect-machine-running").checked;
      const defect_type = document.getElementById("defect-type").value;
      const ted_status = document.getElementById("defect-ted-status").value;
      const category = document.getElementById("defect-category").value;
      const priority = document.getElementById("defect-priority").value;
      const status = document.getElementById("defect-status").value;
      
      const start_date = document.getElementById("defect-start-date").value || null;
      const end_date = document.getElementById("defect-end-date").value || null;
      const quotation_sent_date = document.getElementById("defect-quotation-date").value || null;
      const parts_eta = document.getElementById("defect-parts-eta").value || null;
      const ted = document.getElementById("defect-ted").value || null;
      const red = document.getElementById("defect-red").value || null;
      
      const description = document.getElementById("defect-description").value;
      const solution = document.getElementById("defect-solution").value;

      if (!machine && !id) { showToast("Select a machine", "err"); return; }
      if (!description) { showToast("Description required", "err"); return; }
      if (!category) { showToast("Category required", "err"); return; }

      showToast("Saving...", "info", 1000);

      try {
        const md = window.MACHINES_MAP?.[machine] || {};
        
        // Supabase Insert/Update
        const payload = {
          machine, defect_type, priority, status, description, start_date, end_date,
          on_hold, machine_running, ted_status, category, quotation_sent_date, parts_eta, ted, red, solution,
          customer: md.customer||null, model: md.model||null, oem: md.oem||null,
          region: md.region||null, location: md.current_location||md.location||null,
          warranty_status: md.warranty_status||null
        };

        if (id) {
           payload.name = id;
           payload.modified_at = new Date().toISOString();
        } else {
           payload.name = 'DEF-' + Date.now();
        }

        const { error } = await window.supabase.from('ft_defect').upsert(payload);
        if (error) throw new Error(error.message);
        
        // Ensure new category is passed to Frappe if typed (best effort)
        try {
            const existing = (window.DEFECT_CATEGORIES || []).map(c => c.category || c.name);
            if (!existing.includes(category)) {
               callFrappe('/api/method/frappe.client.insert', { doc: { doctype: 'FT Defect Category', category: category } }, 'POST').catch(e => console.warn(e));
            }
        } catch(e) {}
        
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

  

    // --- AUTHENTICATION LOGIC ---

    function checkLoginAndInit() {
      const isFile = window.location.origin === "null" || window.location.origin.startsWith("file");

      // Only enforce login check if running as file (Electron)
      if (isFile) {
        const hasSupabaseToken = localStorage.getItem("supabase_access_token");
        const hasUserEmail     = localStorage.getItem("ft_user_email");
        const hasApiKey        = localStorage.getItem("ft_api_key");
        const hasOmnisUser     = localStorage.getItem("omnisUser");

        // Primary: Supabase token (new auth). Fallback: legacy Frappe keys.
        if (!hasSupabaseToken && !hasUserEmail && !hasApiKey && !hasOmnisUser) {
          console.log("[Fleetrack Auth] No credentials found — redirecting to login.");
          window.location.href = "../../index.html";
          return;
        }

        console.log("[Fleetrack Auth] Session OK:", {
          supabase: !!hasSupabaseToken,
          email: hasUserEmail,
          legacy: !!hasApiKey,
        });
      }
    }

    async function doLogout() {
      if (!confirm("Log out?")) return;
      // Sign out from Supabase server-side
      try {
        if (window.electron && window.electron.invoke) {
          await window.electron.invoke('supabase:signOut');
        }
      } catch(e) { console.warn('[Logout] Supabase signOut failed:', e.message); }
      // Clear all local auth tokens
      localStorage.removeItem("supabase_access_token");
      localStorage.removeItem("supabase_refresh_token");
      localStorage.removeItem("ft_user_email");
      localStorage.removeItem("ft_api_key");
      localStorage.removeItem("ft_api_secret");
      localStorage.removeItem("omnisUser");
      localStorage.removeItem("omnisSystemKey");
      window.location.href = "../../index.html";
    }

    async function addToServicePlan(machineName) {
      if (!machineName) return;

      showToast("Adding " + machineName + " to plan...", "info");

      try {
        const result = await callFrappe(FT_ADD_SERVICE_PLAN_METHOD, {
          machine: machineName,
          description: "Service Due",
          planned_date: frappe.datetime.get_today()
        }, 'POST');

        if (result && result.message && result.message.status === "success") {
          showToast("✅ Added to Service Plan", "ok");

          // If we are on the FSP view, refresh it
          if (!document.getElementById("view-fsi").classList.contains("hidden")) {
            loadFieldServicePlan();
          }
        } else {
          // Try to get error from standard Frappe response format or our custom format
          let errMsg = "Failed";
          if (result.message && result.message.message) errMsg = result.message.message;
          else if (result.message && result.message.error) errMsg = result.message.error;
          else if (result.error) errMsg = result.error;
          else if (result._server_messages) {
            try {
              const msgs = JSON.parse(result._server_messages);
              errMsg = msgs.map(m => JSON.parse(m).message).join(", ");
            } catch (e) { }
          }

          console.error("FSP Add Failed:", result);
          showToast("❌ " + errMsg, "error");
        }
      } catch (e) {
        console.error(e);
        showToast("❌ Error adding to plan", "error");
      }
    }

    async function loadFieldServicePlan() {
      const tbody = document.getElementById("tbl-fsi");
      if (!tbody) return;

      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:20px;">Loading plan...</td></tr>`;

      try {
        const filters = {
          region: document.getElementById("fsp-filter-region")?.value || "",
          customer: document.getElementById("fsp-filter-customer")?.value || "",
          machine: document.getElementById("fsp-filter-machine")?.value || "",
          status: document.getElementById("fsp-filter-status")?.value || ""
        };

        const match = {};
        if (filters.region) match.region = filters.region;
        if (filters.customer) match.customer = filters.customer;
        if (filters.status) match.status = filters.status;
        
        let queryParams = { columns: '*', match: match, order: { column: 'created_at', ascending: false } };
        if (filters.machine) queryParams.ilike = [{ col: 'machine_name', pat: `%${filters.machine}%` }];
        
        const { data: rowsResult, error } = await window.electron.invoke('supabase:query', {
          table: 'ft_service_plan',
          method: 'select',
          params: queryParams
        });

        // Check for backend errors
        if (error) throw new Error(error.message);

        let rows = rowsResult || [];
        const currentDiv = window.currentDivision || 'fleetrack';
        rows = rows.filter(r => {
           const mName = r.machine_name || r.machine;
           const mDiv = (window.MACHINES_MAP && window.MACHINES_MAP[mName]) ? (window.MACHINES_MAP[mName].division || 'fleetrack') : 'fleetrack';
           return mDiv === currentDiv;
        });
        rows.forEach(r => {
           r.name = r.frappe_name || r.id; 
           r.machine = r.machine_name || r.machine_id;
           r.plan_for = r.raw_date;
        });
        
        // Update Weekly Calendar
        window._fspRows = rows;   // ← cache for full calendar
        renderFspWeeklyCalendar(rows);

        if (rows.length === 0) {
          tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:20px; color:#64748b;">No planned jobs found. Connect FSI data or add machines from Register.</td></tr>`;
          return;
        }

        tbody.innerHTML = "";
        rows.forEach(r => {
          const tr = document.createElement("tr");
          tr.style.borderBottom = "1px solid #f1f5f9";
          tr.style.cursor = "pointer";
          tr.setAttribute("data-name", r.name || "");
          tr.setAttribute("data-machine", r.machine || "");
          
          // Shield row click from delete button
          tr.onclick = (e) => {
            if (e.target.closest(".fsp-row-del-btn")) return;
            openFspDetailModal(r);
          };

          tr.innerHTML = `
                  <td style="padding:10px 16px;"><div style="font-weight:600; color:#1e293b;">${safeText(r.customer)}</div></td>
                  <td style="padding:10px 16px;"><div style="font-weight:600; color:#334155;">${safeText(r.machine)}</div></td>
                  <td style="padding:10px 16px;">${safeText(r.description)}</td>
                  <td style="padding:10px 16px; color:#64748b;">${safeText(r.location)}</td>
                  <td style="padding:10px 16px;">
                    <span style="display:inline-flex; align-items:center; gap:4px; background:#f8fafc; padding:2px 8px; border-radius:12px; border:1px solid #e2e8f0; font-size:9px; color:#475569;">
                      <span style="color:#ef4444;">👤</span> ${safeText(r.technician || "Unassigned")}
                    </span>
                  </td>
                  <td style="padding:10px 16px; color:#64748b; font-size:9px; max-width:150px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${safeText(r.defects || "—")}</td>
                  <td style="padding:10px 16px;">
                    <span style="font-size:9px; padding:2px 6px; border-radius:4px; font-weight:600; 
                      background:${(r.warranty_status || "").toLowerCase().includes("active") ? "#dcfce7" : "#fef2f2"}; 
                      color:${(r.warranty_status || "").toLowerCase().includes("active") ? "#166534" : "#991b1b"};">
                      ${safeText(r.warranty_status || "Out of Warranty")}
                    </span>
                  </td>
                  <td style="padding:10px 16px; font-weight:600; color:#334155;">${safeText(r.plan_for)}</td>
                  <td style="padding:10px 16px;">
                    <select 
                      onchange="updateFspStatusInline('${r.name}', this.value)" 
                      onclick="event.stopPropagation()"
                      style="
                        padding:4px 8px; border-radius:12px; font-size:9px; font-weight:700; text-transform:uppercase; border:none; cursor:pointer; outline:none;
                        background: ${r.status === 'Proposed' ? '#f1f5f9' : r.status === 'Planned' ? '#eff6ff' : r.status === 'In Progress' ? '#fef9c3' : '#dcfce7'};
                        color: ${r.status === 'Proposed' ? '#64748b' : r.status === 'Planned' ? '#2563eb' : r.status === 'In Progress' ? '#854d0e' : '#166534'};
                      ">
                      <option value="Proposed" ${r.status === 'Proposed' ? 'selected' : ''}>Proposed</option>
                      <option value="Planned" ${r.status === 'Planned' ? 'selected' : ''}>Planned</option>
                      <option value="In Progress" ${r.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                      <option value="Completed" ${r.status === 'Completed' ? 'selected' : ''}>Completed</option>
                    </select>
                  </td>
                  <td style="padding:10px 16px; text-align:center;">
                    <button class="fsp-row-del-btn"
                      onclick="event.stopPropagation(); deleteFspEntry('${r.id}');"
                      title="Delete Entry"
                      style="background:#fef2f2; color:#ef4444; border:1px solid #fecaca; border-radius:6px; padding:8px; cursor:pointer; line-height:1; font-size:14px; transition:all 0.2s; position:relative; z-index:10; pointer-events:auto !important;">
                      🗑️
                    </button>
                  </td>
                `;
          tbody.appendChild(tr);
        });

      } catch (e) {
        console.error(e);
        let failMsg = e.message || e.toString();
        // Handle frappe server messages if present in error object
        if (e._server_messages) {
          try {
            failMsg = JSON.parse(e._server_messages).map(m => JSON.parse(m).message).join(", ");
          } catch (x) { }
        }
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:red;">Error: ${failMsg}</td></tr>`;
      }
    }
    // Ensure globally available for hoisted logic
    window.loadFieldServicePlan = loadFieldServicePlan;

    // ============================================================
    // HMR ACTIVITY REPORT
    // ============================================================
    const FT_HMR_ACTIVITY_METHOD = "/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.get_hmr_activity_report";

    let HMR_ACTIVITY_DATA = []; // cache for export/print

    function openHmrActivityReport() {
      const overlay = document.getElementById("hmr-activity-overlay");
      if (!overlay) return;

      // Default to current month
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, "0");
      const firstDay = `${y}-${m}-01`;
      const lastDay  = new Date(y, now.getMonth() + 1, 0).toISOString().split("T")[0];

      const fromEl = document.getElementById("hmr-act-from");
      const toEl   = document.getElementById("hmr-act-to");
      if (fromEl && !fromEl.value) fromEl.value = firstDay;
      if (toEl   && !toEl.value)   toEl.value   = lastDay;

      overlay.classList.remove("hidden");
      overlay.style.display = "flex";
    }

    function closeHmrActivityReport() {
      const overlay = document.getElementById("hmr-activity-overlay");
      if (overlay) {
        overlay.classList.add("hidden");
        overlay.style.display = "none";
      }
    }

    async function runHmrActivityReport() {
      const dateFrom   = document.getElementById("hmr-act-from")?.value;
      const dateTo     = document.getElementById("hmr-act-to")?.value;
      const region     = document.getElementById("hmr-act-region")?.value || "";
      const customer   = document.getElementById("hmr-act-customer")?.value || "";

      if (!dateFrom || !dateTo) {
        alert("Please select both a From and To date.");
        return;
      }

      const stateEl = document.getElementById("hmr-act-state");
      const tableEl = document.getElementById("hmr-act-table");
      const summEl  = document.getElementById("hmr-act-summary");

      stateEl.textContent = "⏳ Loading HMR activity data...";
      stateEl.style.display = "block";
      tableEl.classList.add("hidden");
      if (summEl) summEl.style.display = "none";

      try {
        const result = await callFrappe(FT_HMR_ACTIVITY_METHOD, { date_from: dateFrom, date_to: dateTo, region, customer });
        const data = result.message || result;

        if (data.error) throw new Error(data.error);

        let rows = data.rows || [];
        rows.sort((a, b) => (a.customer || "").localeCompare(b.customer || ""));
        HMR_ACTIVITY_DATA = rows;

        if (rows.length === 0) {
          stateEl.textContent = "No HMR updates found for the selected period.";
          stateEl.style.display = "block";
          return;
        }

        // Summary bar
        const totalLogs = rows.reduce((s, r) => s + r.update_count, 0);
        const avg = (totalLogs / rows.length).toFixed(1);
        document.getElementById("hmr-act-sum-period").textContent  = `${dateFrom} → ${dateTo}`;
        document.getElementById("hmr-act-sum-total").textContent   = rows.length;
        document.getElementById("hmr-act-sum-logs").textContent    = totalLogs;
        document.getElementById("hmr-act-sum-avg").textContent     = avg;
        if (summEl) summEl.style.display = "block";

        // Render table
        const tbody = document.getElementById("hmr-act-tbody");
        tbody.innerHTML = "";
        
        let customerRowSpans = {};
        rows.forEach(r => {
           let c = r.customer || "Unknown";
           customerRowSpans[c] = (customerRowSpans[c] || 0) + 1;
        });

        let renderedCustomers = new Set();

        rows.forEach((r, i) => {
          const tr = document.createElement("tr");
          tr.style.cssText = "border-bottom:1px solid #1e293b;";
          tr.onmouseover = () => tr.style.background = "#1e2d3d";
          tr.onmouseout  = () => tr.style.background = "";

          const c = r.customer || "Unknown";
          const isFirstOfCustomer = !renderedCustomers.has(c);
          if (isFirstOfCustomer) renderedCustomers.add(c);

          // Color-code update count
          const countColor = r.update_count >= 5 ? "#34d399" : r.update_count >= 2 ? "#fbbf24" : "#94a3b8";
          // Color-code HMR delta
          const delta = r.hmr_change;
          const deltaColor = delta > 100 ? "#34d399" : delta > 0 ? "#94a3b8" : "#ef4444";
          const deltaStr   = delta != null ? `+${delta}` : "—";
          
          let customerCellHTML = "";
          if (isFirstOfCustomer) {
            customerCellHTML = `<td rowspan="${customerRowSpans[c]}" style="padding:10px 12px; color:#e2e8f0; font-weight:700; border-right:1px solid #334155; vertical-align:top; background:rgba(255,255,255,0.02);">${safeText(r.customer)}</td>`;
            tr.style.borderTop = "2px solid #334155";
          }

          tr.innerHTML = `
            <td style="padding:10px 12px; color:#475569;">${i + 1}</td>
            ${customerCellHTML}
            <td style="padding:10px 12px;">
              <div style="font-weight:700; color:#f1f5f9;">${safeText(r.machine)}</div>
              ${r.fleet_no !== "—" ? `<div style="font-size:9px; color:#64748b;">Fleet: ${safeText(r.fleet_no)}</div>` : ""}
            </td>
            <td style="padding:10px 12px; color:#cbd5e1;">${safeText(r.model)}</td>
            <td style="padding:10px 12px; color:#94a3b8;">${safeText(r.region)}</td>
            <td style="padding:10px 12px; text-align:center;">
              <span style="display:inline-block; background:${r.update_count >= 5 ? '#0d3321' : r.update_count >= 2 ? '#3a2800' : '#1e293b'}; color:${countColor}; font-weight:800; font-size:14px; padding:2px 10px; border-radius:20px;">${r.update_count}</span>
            </td>
            <td style="padding:10px 12px; text-align:right; color:#94a3b8; font-family:monospace;">${r.hmr_start != null ? r.hmr_start.toLocaleString() : "—"}</td>
            <td style="padding:10px 12px; text-align:right; color:#e2e8f0; font-weight:700; font-family:monospace;">${r.hmr_end != null ? r.hmr_end.toLocaleString() : "—"}</td>
            <td style="padding:10px 12px; text-align:right; color:${deltaColor}; font-weight:700; font-family:monospace;">${deltaStr}</td>
            <td style="padding:10px 12px; color:#64748b; font-size:10px;">${safeText(r.first_update_date)}</td>
            <td style="padding:10px 12px; color:#7dd3fc; font-size:10px;">${safeText(r.last_update_date)}</td>
            <td style="padding:10px 12px; color:#94a3b8; font-size:10px; max-width:140px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${safeText(r.loggers)}">${safeText(r.loggers)}</td>
          `;
          tbody.appendChild(tr);
        });

        stateEl.style.display = "none";
        tableEl.classList.remove("hidden");

      } catch (err) {
        stateEl.textContent = `Error: ${err.message || err}`;
        stateEl.style.display = "block";
      }
    }

    function exportHmrActivityCsv() {
      if (!HMR_ACTIVITY_DATA.length) { alert("Generate the report first."); return; }
      const headers = ["#","Customer","Machine","Model","Region","Fleet No","Updates","HMR Start","HMR End","HMR Change","First Update","Last Update","Logger(s)"];
      const rows = HMR_ACTIVITY_DATA.map((r, i) => [
        i+1, r.customer, r.machine, r.model, r.region, r.fleet_no,
        r.update_count, r.hmr_start ?? "", r.hmr_end ?? "", r.hmr_change ?? "",
        r.first_update_date, r.last_update_date, r.loggers
      ].map(v => `"${String(v).replace(/"/g,'""')}"`).join(","));

      const csv = [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      const from = document.getElementById("hmr-act-from")?.value || "from";
      const to   = document.getElementById("hmr-act-to")?.value   || "to";
      a.download = `HMR_Activity_${from}_to_${to}.csv`;
      a.click();
    }

    function printHmrActivityReport() {
      if (!HMR_ACTIVITY_DATA.length) { alert("Generate the report first."); return; }
      const from = document.getElementById("hmr-act-from")?.value || "";
      const to   = document.getElementById("hmr-act-to")?.value   || "";
      const rows = HMR_ACTIVITY_DATA;
      const tableRows = rows.map((r, i) => `
        <tr>
          <td>${i+1}</td>
          <td>${r.customer}</td>
          <td><strong>${r.machine}</strong>${r.fleet_no !== "—" ? ` <small>(Fleet: ${r.fleet_no})</small>` : ""}</td>
          <td>${r.model}</td>
          <td>${r.region}</td>
          <td style="text-align:center; font-weight:bold; color:${r.update_count >= 5 ? "green" : r.update_count >= 2 ? "darkorange" : "gray"}">${r.update_count}</td>
          <td style="text-align:right;">${r.hmr_start ?? "—"}</td>
          <td style="text-align:right; font-weight:bold;">${r.hmr_end ?? "—"}</td>
          <td style="text-align:right; color:${(r.hmr_change||0) > 0 ? "green" : "red"}; font-weight:bold;">+${r.hmr_change ?? "—"}</td>
          <td>${r.first_update_date}</td>
          <td>${r.last_update_date}</td>
          <td style="font-size:9px;">${r.loggers}</td>
        </tr>`).join("");

      const win = window.open("", "_blank");
      win.document.write(`
        <!DOCTYPE html><html><head><title>HMR Activity Report ${from} to ${to}</title>
        <style>
          body { font-family: Arial, sans-serif; font-size: 11px; padding: 20px; }
          h1 { font-size: 18px; margin-bottom: 4px; }
          p.sub { color: #666; font-size: 11px; margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #1e293b; color: white; padding: 8px 10px; text-align: left; font-size: 10px; }
          td { padding: 7px 10px; border-bottom: 1px solid #e5e7eb; }
          tr:nth-child(even) td { background: #f8fafc; }
          @media print { body { padding: 0; } }
            /* Frameless window dragging and controls */
        .sidebar-brand {
            -webkit-app-region: drag;
            cursor: move;
        }

        .nav-item, .utility-item, .btn-primary, .win-btn-dash {
            -webkit-app-region: no-drag !important;
        }

        .win-controls-dash {
            display: flex;
            gap: 12px;
            margin-left: 15px;
            padding-left: 15px;
            border-left: 1px solid var(--border-color);
        }

        .win-btn-dash {
            background: transparent;
            border: none;
            color: var(--text-muted);
            cursor: pointer;
            padding: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
        }

        .win-btn-dash:hover {
            color: var(--text-main);
            transform: scale(1.1);
        }

        .win-btn-dash.close:hover {
            color: #ef4444;
        }
    
    /* --- HIDE LEGACY NAVBAR AND TOPBAR --- */
    .sidebar { display: none !important; }
    .topbar { display: none !important; }
    .main { padding-top: 80px !important; margin-left: 0 !important; width: 100% !important; height: auto !important; }

</style></head><body>
        <h1>📊 HMR Activity Report</h1>
        <p class="sub">Period: <strong>${from}</strong> to <strong>${to}</strong> &nbsp;|&nbsp; Generated: ${new Date().toLocaleString()} &nbsp;|&nbsp; Total Machines: <strong>${rows.length}</strong></p>
        <table>
          <thead><tr>
            <th>#</th><th>Customer</th><th>Machine</th><th>Model</th><th>Region</th>
            <th>Updates</th><th>HMR Start</th><th>HMR End</th><th>Δ HMR</th>
            <th>First Update</th><th>Last Update</th><th>Logger(s)</th>
          </tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
        <script>window.onload=()=>window.print();<\/script>
        


    <!-- ═══════════════════════════════════════════════════ -->
    <!--        NATIVE STANDALONE REPORT VIEWS              -->
    <!-- ═══════════════════════════════════════════════════ -->

    <!-- Shared report toolbar template (rendered by JS) -->

    <!-- ── 1. FT MACHINE REGISTER ─────────────────────── -->

    <!-- ═══════════ END NATIVE REPORT VIEWS ════════════ -->

  </body></html>`);
      win.document.close();
    }

    window.openHmrActivityReport  = openHmrActivityReport;
    window.closeHmrActivityReport = closeHmrActivityReport;
    window.runHmrActivityReport   = runHmrActivityReport;
    window.exportHmrActivityCsv   = exportHmrActivityCsv;
    window.printHmrActivityReport = printHmrActivityReport;

    // Wire up events
    document.addEventListener("DOMContentLoaded", () => {
      checkLoginAndInit();
      requestNotificationPermission(); // Ask for notification permission early

      const logoutBtn = document.getElementById("menu-logout");
      if (logoutBtn) {
        logoutBtn.addEventListener("click", doLogout);
      }

      // Check for Supervisor Alerts (Popup)
      checkSupervisorPopup();

      // NOTE: btn-primary-action is managed by showView() per-view.
      // Do NOT add a global listener here — each view sets its own action.

      // Wire up New Job Card Button
      const jcBtn = document.getElementById("btn-new-job-card");
      if (jcBtn) {
        jcBtn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log("New Job Card button clicked");
          if (typeof window.triggerJCCreationModal === "function") {
            window.triggerJCCreationModal();
          } else {
            console.error("triggerJCCreationModal not found");
          }
        });
      }
    });

    // Fallback if DOMContentLoaded already fired
    if (document.readyState === "complete" || document.readyState === "interactive") {
      setTimeout(checkLoginAndInit, 100);
      setTimeout(checkSupervisorPopup, 1000);
    }

    async function checkSupervisorPopup() {
      // Avoid checking if not logged in (rudimentary check logic reuse)
      const hasAuth = localStorage.getItem("ft_api_key") || localStorage.getItem("ft_user_email") || localStorage.getItem("omnisUser");
      if (!hasAuth && window.location.origin.startsWith("file")) return;

      try {
        // Fetch DBR data to check counts
        // Reuse global method constant if available, else hardcode for safety
        const method = (typeof FT_BREAKDOWN_DBR_METHOD !== 'undefined') ? FT_BREAKDOWN_DBR_METHOD : "mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.get_ft_breakdown_dbr_v2";

        const res = await callFrappe(method, { _ts: Date.now() });
        const data = res.message || {};
        const breakdowns = data.breakdowns || [];

        const count = breakdowns.filter(b => b.supervisor_approved == 1 && (!b.sent_to_customer || b.sent_to_customer == 0)).length;

        if (count > 0) {
          const modal = document.getElementById("modal-sup-alert");
          const countEl = document.getElementById("sup-alert-count");
          if (modal && countEl) {
            countEl.textContent = count;
            modal.classList.remove("hidden");

            // Wire buttons
            document.getElementById("btn-sup-alert-view").onclick = () => {
              modal.classList.add("hidden");
              // Navigate to DBR View
              const dbrNav = document.querySelector('.nav-item[data-view="view-reports"]');
              if (dbrNav) dbrNav.click();
            };

            document.getElementById("btn-sup-alert-close").onclick = () => {
              modal.classList.add("hidden");
            };
          }
        }
      } catch (e) {
        console.error("Popup check failed", e);
      }
    }

    /**
     * GLOBAL DELETION HANDLERS
     */
    window.closeHmrDeleteModal = function() {
      const modal = document.getElementById("fsp-delete-confirm-overlay");
      if (modal) modal.classList.add("hidden");
    };

    window.executeDeleteFsp = async function(name) {
      if (!name) return;
      try {
        if (typeof showToast === 'function') showToast("Deleting entry...", "info");
        const res = await callFrappe("mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.delete_ft_service_plan_entry", { name: name });
        if (res.status === "success" || (res.message && res.message.status === "success")) {
          if (typeof showToast === 'function') showToast("Entry deleted successfully", "success");
          window.closeHmrDeleteModal();
          if (window.loadFieldServicePlan) window.loadFieldServicePlan(); 
        } else {
          if (typeof showToast === 'function') showToast("Delete failed", "error");
        }
      } catch (err) {
        if (typeof showToast === 'function') showToast("Error connecting to server", "error");
      }
    };
  

  (function() {
    var API = "/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.get_hmr_activity_report";
    var data = [];
    var modal = null;

    function buildModal() {
      if (modal) return; // already built
      modal = document.createElement("div");
      modal.id = "hmr-act-modal-root";
      modal.style.cssText = "display:none;position:fixed;inset:0;background:rgba(10,17,35,0.93);z-index:99999;align-items:center;justify-content:center;backdrop-filter:blur(10px);font-family:inherit;";

      modal.innerHTML = [
        '<div style="width:96vw;max-width:1120px;max-height:92vh;background:#0f172a;border-radius:16px;border:1px solid #334155;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 30px 60px rgba(0,0,0,0.7);">',
          // Header
          '<div style="padding:18px 24px;background:linear-gradient(135deg,#0f172a,#1e293b);border-bottom:1px solid #334155;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">',
            '<div>',
              '<div style="font-size:19px;font-weight:800;color:#f8fafc;">&#x1F4CA; HMR Activity Report</div>',
              '<div style="font-size:12px;color:#94a3b8;margin-top:3px;">Track machines whose HMR was updated within a selected period</div>',
            '</div>',
            '<button id="hmrActClose" style="background:none;border:none;color:#94a3b8;font-size:24px;cursor:pointer;padding:4px 10px;line-height:1;">&times;</button>',
          '</div>',
          // Filters
          '<div style="padding:14px 24px;background:#0f172a;border-bottom:1px solid #334155;flex-shrink:0;">',
            '<div style="display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end;">',
              '<div><div style="font-size:10px;font-weight:700;color:#64748b;margin-bottom:4px;text-transform:uppercase;">From</div><input type="date" id="hmrActFrom" style="padding:8px 10px;border:1px solid #334155;border-radius:8px;font-size:12px;background:#1e293b;color:#e2e8f0;outline:none;width:145px;"></div>',
              '<div><div style="font-size:10px;font-weight:700;color:#64748b;margin-bottom:4px;text-transform:uppercase;">To</div><input type="date" id="hmrActTo" style="padding:8px 10px;border:1px solid #334155;border-radius:8px;font-size:12px;background:#1e293b;color:#e2e8f0;outline:none;width:145px;"></div>',
              '<div style="flex:1;min-width:140px;"><div style="font-size:10px;font-weight:700;color:#64748b;margin-bottom:4px;text-transform:uppercase;">Region</div><select id="hmrActRegion" style="width:100%;padding:8px 10px;border:1px solid #334155;border-radius:8px;font-size:12px;background:#1e293b;color:#e2e8f0;outline:none;"><option value="">All Regions</option><option>North</option><option>South</option><option>East</option><option>West</option></select></div>',
              '<div style="flex:2;min-width:180px;"><div style="font-size:10px;font-weight:700;color:#64748b;margin-bottom:4px;text-transform:uppercase;">Customer</div><input type="text" id="hmrActCustomer" placeholder="Filter by customer..." style="width:100%;padding:8px 10px;border:1px solid #334155;border-radius:8px;font-size:12px;background:#1e293b;color:#e2e8f0;outline:none;box-sizing:border-box;"></div>',
              '<div style="display:flex;gap:8px;flex-shrink:0;">',
                '<button id="hmrActRun" style="background:linear-gradient(135deg,#0ea5e9,#6366f1);color:white;border:none;padding:9px 18px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;">&#x1F50D; Generate</button>',
                '<button id="hmrActCsv" style="background:#1e293b;color:#94a3b8;border:1px solid #334155;padding:9px 12px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;">&#x2B07; CSV</button>',
                '<button id="hmrActPrint" style="background:#1e293b;color:#94a3b8;border:1px solid #334155;padding:9px 12px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;">&#x1F5A8;</button>',
              '</div>',
            '</div>',
          '</div>',
          // Summary
          '<div id="hmrActSummary" style="display:none;padding:10px 24px;background:#1e293b;border-bottom:1px solid #334155;flex-shrink:0;">',
            '<div style="display:flex;gap:20px;flex-wrap:wrap;font-size:11px;color:#94a3b8;">',
              'Period: <strong id="hmrActSumPeriod" style="color:#e2e8f0;"></strong>',
              '&nbsp;|&nbsp; Machines Updated: <strong id="hmrActSumTotal" style="color:#38bdf8;font-size:16px;"></strong>',
              '&nbsp;|&nbsp; Total Logs: <strong id="hmrActSumLogs" style="color:#a78bfa;"></strong>',
              '&nbsp;|&nbsp; Avg/Machine: <strong id="hmrActSumAvg" style="color:#34d399;"></strong>',
            '</div>',
          '</div>',
          // State message
          '<div id="hmrActState" style="padding:48px;text-align:center;color:#475569;font-size:13px;">Select a date range and click <strong style=\'color:#94a3b8;\'>Generate</strong></div>',
          // Table area — LIGHT theme
          '<div style="overflow-y:auto;flex:1;background:#f8fafc;">',
            '<table id="hmrActTable" style="display:none;width:100%;border-collapse:collapse;font-size:11.5px;">',
              '<thead><tr style="background:#1e293b;border-bottom:2px solid #0f172a;position:sticky;top:0;z-index:1;">',
                '<th style="padding:10px 12px;color:#94a3b8;text-align:left;white-space:nowrap;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;">#</th>',
                '<th style="padding:10px 12px;color:#94a3b8;text-align:left;white-space:nowrap;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;">Customer</th>',
                '<th style="padding:10px 12px;color:#94a3b8;text-align:left;white-space:nowrap;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;">Machine</th>',
                '<th style="padding:10px 12px;color:#94a3b8;text-align:left;white-space:nowrap;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;">Model</th>',
                '<th style="padding:10px 12px;color:#94a3b8;text-align:left;white-space:nowrap;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;">Region</th>',
                '<th style="padding:10px 12px;color:#94a3b8;text-align:center;white-space:nowrap;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;">Updates</th>',
                '<th style="padding:10px 12px;color:#94a3b8;text-align:right;white-space:nowrap;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;">HMR Start</th>',
                '<th style="padding:10px 12px;color:#94a3b8;text-align:right;white-space:nowrap;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;">HMR End</th>',
                '<th style="padding:10px 12px;color:#94a3b8;text-align:right;white-space:nowrap;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;">&Delta; HMR</th>',
                '<th style="padding:10px 12px;color:#94a3b8;text-align:left;white-space:nowrap;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;">First</th>',
                '<th style="padding:10px 12px;color:#94a3b8;text-align:left;white-space:nowrap;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;">Last</th>',
                '<th style="padding:10px 12px;color:#94a3b8;text-align:left;white-space:nowrap;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;">Logger(s)</th>',
              '</tr></thead>',
              '<tbody id="hmrActTbody"></tbody>',
            '</table>',
          '</div>',
        '</div>'
      ].join("");

      document.body.appendChild(modal);

      document.getElementById("hmrActClose").onclick = function() { modal.style.display = "none"; };
      document.getElementById("hmrActRun").onclick   = runReport;
      document.getElementById("hmrActCsv").onclick   = exportCsv;
      document.getElementById("hmrActPrint").onclick = printReport;
    }

    function openModal() {
      buildModal();
      var now = new Date(), y = now.getFullYear(), m = String(now.getMonth()+1).padStart(2,"0");
      var f = document.getElementById("hmrActFrom"), t = document.getElementById("hmrActTo");
      if (f && !f.value) f.value = y+"-"+m+"-01";
      if (t && !t.value) { var ld = new Date(y, now.getMonth()+1, 0); t.value = ld.toISOString().split("T")[0]; }
      modal.style.display = "flex";
    }

    async function runReport() {
      var tbEl = document.getElementById("hmrActTable");
      var smEl = document.getElementById("hmrActSummary");
      var stEl = document.getElementById("hmrActState");

      var df = document.getElementById("hmrActFrom").value;
      var dt = document.getElementById("hmrActTo").value;
      var rg = document.getElementById("hmrActRegion").value;
      var cu = document.getElementById("hmrActCustomer").value;
      if (!df || !dt) { alert("Select both From and To dates."); return; }
      
      stEl.textContent = "Loading...";
      tbEl.style.display = "none"; smEl.style.display = "none";
      try {
        var res = await window.callFrappe(API, {date_from:df, date_to:dt, region:rg, customer:cu}, 'GET', { 
          showLoader: true, 
          loaderMsg: "Generating Report" 
        });
        var d = (res && res.message) ? res.message : res;
        if (d && d.error) throw new Error(d.error);
        var rows = (d && d.rows) ? d.rows : [];
        rows.sort(function(a,b){ return (a.customer||"").localeCompare(b.customer||""); });
        data = rows;
        if (!rows.length) { stEl.textContent = "No HMR updates found for selected period."; return; }
        var tl = rows.reduce(function(s,r){return s+r.update_count;},0);
        document.getElementById("hmrActSumPeriod").textContent = df+" → "+dt;
        document.getElementById("hmrActSumTotal").textContent  = rows.length;
        document.getElementById("hmrActSumLogs").textContent   = tl;
        document.getElementById("hmrActSumAvg").textContent    = (tl/rows.length).toFixed(1);
        smEl.style.display = "block";
        var tbody = document.getElementById("hmrActTbody"); tbody.innerHTML = "";
        var customerSpans = {};
        rows.forEach(function(r){ customerSpans[r.customer] = (customerSpans[r.customer]||0) + 1; });
        var seen = {};

        rows.forEach(function(r,i) {
          var tr = document.createElement("tr");
          var isEven = i % 2 === 0;
          tr.style.background = isEven ? "#ffffff" : "#f1f5f9";
          tr.style.borderBottom = "1px solid #e2e8f0";
          tr.onmouseover = function(){tr.style.background="#dbeafe";};
          tr.onmouseout  = function(){tr.style.background = isEven ? "#ffffff" : "#f1f5f9";};
          
          var isFirst = !seen[r.customer];
          if(isFirst) { seen[r.customer] = true; tr.style.borderTop = "2px solid #cbd5e1"; }

          // Update count badge colors — keep vivid on light bg
          var cc = r.update_count>=5?"#16a34a":r.update_count>=2?"#d97706":"#64748b";
          var cbg= r.update_count>=5?"#dcfce7":r.update_count>=2?"#fef3c7":"#f1f5f9";
          var dc = (r.hmr_change||0)>100?"#16a34a":(r.hmr_change||0)>0?"#0369a1":"#dc2626";
          
          var html = '<td style="padding:9px 12px;color:#94a3b8;font-size:11px;">'+(i+1)+'</td>';
          if(isFirst){
            html += '<td rowspan="'+customerSpans[r.customer]+'" style="padding:9px 12px;color:#0f172a;font-weight:700;font-size:12px;vertical-align:middle;background:#f8fafc;border-right:1px solid #e2e8f0;">'+(r.customer||'—')+'</td>';
          }
          html +=
            '<td style="padding:9px 12px;"><div style="font-weight:700;color:#0f172a;font-size:12px;">'+(r.machine||'')+'</div>'+
            (r.fleet_no&&r.fleet_no!=="—"?'<div style="font-size:9px;color:#94a3b8;">Fleet: '+r.fleet_no+'</div>':'')+'</td>'+
            '<td style="padding:9px 12px;color:#475569;font-size:11px;">'+(r.model||'—')+'</td>'+
            '<td style="padding:9px 12px;color:#64748b;font-size:11px;">'+(r.region||'—')+'</td>'+
            '<td style="padding:9px 12px;text-align:center;"><span style="background:'+cbg+';color:'+cc+';font-weight:800;font-size:13px;padding:2px 10px;border-radius:20px;border:1px solid '+cc+'20;">'+r.update_count+'</span></td>'+
            '<td style="padding:9px 12px;text-align:right;color:#64748b;font-family:monospace;font-size:11px;">'+(r.hmr_start!=null?r.hmr_start:'—')+'</td>'+
            '<td style="padding:9px 12px;text-align:right;color:#0f172a;font-weight:700;font-family:monospace;font-size:12px;">'+(r.hmr_end!=null?r.hmr_end:'—')+'</td>'+
            '<td style="padding:9px 12px;text-align:right;color:'+dc+';font-weight:700;font-family:monospace;font-size:12px;">'+(r.hmr_change!=null?"+"+r.hmr_change:'—')+'</td>'+
            '<td style="padding:9px 12px;color:#94a3b8;font-size:10px;">'+(r.first_update_date||'—')+'</td>'+
            '<td style="padding:9px 12px;color:#0369a1;font-size:10px;font-weight:600;">'+(r.last_update_date||'—')+'</td>'+
            '<td style="padding:9px 12px;color:#94a3b8;font-size:10px;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+(r.loggers||'—')+'</td>';
          tr.innerHTML = html;
          tbody.appendChild(tr);
        });
        stEl.style.display = "none"; tbEl.style.display = "table";
      } catch(e) { stEl.textContent = "Error: "+(e.message||String(e)); }
    }

    function exportCsv() {
      if (!data.length) { alert("Generate the report first."); return; }
      var h = ["#","Customer","Machine","Model","Region","Fleet No","Updates","HMR Start","HMR End","HMR Change","First Update","Last Update","Loggers"];
      var rows = data.map(function(r,i){
        return [i+1,r.customer,r.machine,r.model,r.region,r.fleet_no,r.update_count,
          r.hmr_start!=null?r.hmr_start:"",r.hmr_end!=null?r.hmr_end:"",r.hmr_change!=null?r.hmr_change:"",
          r.first_update_date,r.last_update_date,r.loggers]
          .map(function(v){return '"'+String(v).replace(/"/g,'""')+'"';}).join(",");
      });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([[h.join(",")].concat(rows).join("\n")],{type:"text/csv"}));
      a.download = "HMR_Activity_"+(document.getElementById("hmrActFrom").value||"")+"_to_"+(document.getElementById("hmrActTo").value||"")+".csv";
      a.click();
    }

    function printReport() {
      if (!data.length) { alert("Generate the report first."); return; }
      var df = document.getElementById("hmrActFrom").value;
      var dt = document.getElementById("hmrActTo").value;
      
      var customerSpans = {};
      data.forEach(function(r){ customerSpans[r.customer] = (customerSpans[r.customer]||0) + 1; });
      
      var seenPrint = {};
      var tr = data.map(function(r,i){
        var isFirstPrint = !seenPrint[r.customer];
        if(isFirstPrint) seenPrint[r.customer] = true;
        var custCell = isFirstPrint ? "<td rowspan='"+customerSpans[r.customer]+"'><b>"+(r.customer||"—")+"</b></td>" : "";
        return "<tr style='"+(isFirstPrint?"border-top:2px solid #334155;":"")+"'><td>"+(i+1)+"</td>"+custCell+"<td><b>"+r.machine+"</b></td><td>"+r.model+"</td><td>"+r.region+"</td>"+
          "<td style='text-align:center;color:"+(r.update_count>=5?"green":r.update_count>=2?"darkorange":"gray")+"'><b>"+r.update_count+"</b></td>"+
          "<td style='text-align:right;'>"+(r.hmr_start!=null?r.hmr_start:"—")+"</td><td style='text-align:right;'><b>"+(r.hmr_end!=null?r.hmr_end:"—")+"</b></td>"+
          "<td style='text-align:right;color:"+((r.hmr_change||0)>0?"green":"red")+";'><b>+"+(r.hmr_change!=null?r.hmr_change:"—")+"</b></td>"+
          "<td>"+r.first_update_date+"</td><td>"+r.last_update_date+"</td><td style='font-size:9px;'>"+r.loggers+"</td></tr>";
      }).join("");
      var w = window.open("","_blank");
      w.document.write("<!DOCTYPE html><html><head><title>HMR Activity Report</title>"+
        "<style>body{font-family:Arial,sans-serif;font-size:11px;padding:16px;}table{width:100%;border-collapse:collapse;}"+
        "th{background:#1e293b;color:white;padding:6px 8px;text-align:left;font-size:10px;}td{padding:6px 8px;border-bottom:1px solid #e5e7eb;vertical-align:middle;}"+
        "tr:nth-child(even) td{background:#f8fafc;}</style></head><body>"+
        "<h2>HMR Activity Report &mdash; "+df+" to "+dt+"</h2><p>Generated: "+new Date().toLocaleString()+" | Machines: "+data.length+"</p>"+
        "<table><thead><tr><th>#</th><th>Customer</th><th>Machine</th><th>Model</th><th>Region</th><th>Updates</th>"+
        "<th>HMR Start</th><th>HMR End</th><th>&Delta; HMR</th><th>First</th><th>Last</th><th>Loggers</th></tr></thead>"+
        "<tbody>"+tr+"</tbody></table><script>window.onload=function(){window.print();};<"+"/script>"+
        "</body></html>");
      w.document.close();
    }

    window.openHmrActivityReport = openModal;
  })();
  

    // ============================================================
    // BULK HMR ENTRY LOGIC
    // ============================================================
    let BULK_VERIFIED_DATA = [];

    window.openBulkHmrModal = function() {
      const modal = document.getElementById("bulk-hmr-modal");
      document.getElementById("bulk-hmr-input").value = "";
      window.showBulkStep(1);
      modal.classList.add("active");
    };

    window.closeBulkHmrModal = function() {
      document.getElementById("bulk-hmr-modal").classList.remove("active");
    };

    window.showBulkStep = function(step) {
      document.getElementById("bulk-step-1").style.display = (step === 1) ? "block" : "none";
      document.getElementById("bulk-step-2").style.display = (step === 2) ? "block" : "none";
    };

    window.verifyBulkData = function() {
      const input = document.getElementById("bulk-hmr-input").value;
      const lines = input.split("\n");
      const tbody = document.getElementById("bulk-verify-tbody");
      tbody.innerHTML = "";
      BULK_VERIFIED_DATA = [];

      let matchedCount = 0;

      lines.forEach(line => {
        line = line.trim();
        if (!line) return;

        // Try to find a 4-digit S/N and an HMR value (int or float)
        // Format example: "8793 5266.5" or "8793, 5266"
        const regex = /(\d{4})[\s,]+([\d.,]+)/;
        const match = line.match(regex);

        if (match) {
          const suffix = match[1];
          let hmrStr = match[2].replace(",", ""); // Handle comma as decimal if needed but primary is dot
          const hmrValue = parseFloat(hmrStr);

          // Find machine in window.FT_MACHINE_ROWS
          const machines = (window.FT_MACHINE_ROWS || []).filter(m => (m.sn || "").endsWith(suffix));
          
          let machineName = "❌ Not Found";
          let customer = "—";
          let statusHtml = '<span style="color: #ef4444; font-weight: 700;">No Match</span>';
          let rowClass = "";
          let isValid = false;

          if (machines.length === 1) {
            const m = machines[0];
            machineName = `${m.model} (${m.sn})`;
            customer = m.customer || "Unknown";
            isValid = true;
            matchedCount++;
            
            // Check if HMR is suspicious (lower than current)
            const currentHmr = parseFloat(m.current_hmr || 0);
            if (hmrValue < currentHmr) {
              statusHtml = '<span style="color: #f59e0b; font-weight: 700;">⚠️ Low HMR</span>';
              rowClass = 'style="background: #fffbeb;"';
            } else {
              statusHtml = '<span style="color: #10b981; font-weight: 700;">Ready</span>';
            }

            BULK_VERIFIED_DATA.push({
              machine: m.name,
              hmr: hmrValue,
              prev: currentHmr,
              model: m.model,
              sn: m.sn,
              customer: m.customer
            });

          } else if (machines.length > 1) {
            statusHtml = '<span style="color: #3b82f6; font-weight: 700;">Multi Match</span>';
            machineName = `<select style="font-size: 10px; width: 100%; border: 1px solid #3b82f6; border-radius: 4px;" onchange="window.updateBulkMatch(this, '${suffix}', ${hmrValue})">
              <option value="">Select Machine...</option>
              ${machines.map(m => `<option value="${m.name}">${m.model} - ${m.sn} (${m.customer})</option>`).join("")}
            </select>`;
          }

          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; font-family: monospace; font-weight: 700;">${suffix}</td>
            <td style="padding: 10px; border-bottom: 1px solid #f1f5f9;">
              <div style="font-weight: 600;">${machineName}</div>
              <div style="font-size: 10px; color: #94a3b8;">${customer}</div>
            </td>
            <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; text-align: right; font-weight: 700;">${hmrValue.toLocaleString()}</td>
            <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; text-align: center;">${statusHtml}</td>
          `;
          if (rowClass) tr.setAttribute("style", rowClass.split('"')[1]);
          tbody.appendChild(tr);
        }
      });

      if (tbody.innerHTML === "") {
        tbody.innerHTML = '<tr><td colspan="4" style="padding: 40px; text-align: center; color: #94a3b8;">No valid data patterns found in paste.</td></tr>';
        document.getElementById("btn-submit-bulk").disabled = true;
        document.getElementById("btn-submit-bulk").style.opacity = "0.5";
      } else {
        document.getElementById("btn-submit-bulk").disabled = false;
        document.getElementById("btn-submit-bulk").style.opacity = "1";
      }

      document.getElementById("bulk-confirm-count").textContent = matchedCount;
      window.showBulkStep(2);
    };

    window.updateBulkMatch = function(select, suffix, hmrValue) {
      if (!select.value) return;
      const m = window.FT_MACHINE_ROWS.find(x => x.name === select.value);
      if (m) {
        // Update data array
        BULK_VERIFIED_DATA.push({
          machine: m.name,
          hmr: hmrValue,
          prev: parseFloat(m.current_hmr || 0),
          model: m.model,
          sn: m.sn,
          customer: m.customer
        });
        document.getElementById("bulk-confirm-count").textContent = BULK_VERIFIED_DATA.length;
        // Update UI status
        const statusTd = select.closest("tr").querySelector("td:last-child");
        statusTd.innerHTML = '<span style="color: #10b981; font-weight: 700;">Fixed</span>';
      }
    };

    window.submitBulkHmr = async function() {
      if (BULK_VERIFIED_DATA.length === 0) return;

      const btn = document.getElementById("btn-submit-bulk");
      const originalHtml = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<span class="omnis-spinner-ring" style="width: 16px; height: 16px; border-width: 2px;"></span> Processing...';

      let successCount = 0;
      let failCount = 0;

      for (const item of BULK_VERIFIED_DATA) {
        try {
          // Use standard submission API
          const res = await callFrappe(
            "/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.submit_ft_hmr_log",
            {
              machine:    item.machine,
              customer:   item.customer || "",
              model:      item.model || "",
              date:       new Date().toISOString().split("T")[0],
              hmr:        Number(item.hmr),
              hmr_on_log: Number(item.prev),
              op_hours:   0,
              telematics: "No"
            },
            "POST"
          );

          if (res && (res.message?.status === "success" || res.status === "success")) {
            successCount++;
          } else {
            failCount++;
          }
        } catch (e) {
          console.error(`Bulk update failed for ${item.machine}:`, e);
          failCount++;
        }
      }

      showToast(`Bulk Sync Complete: ${successCount} updated, ${failCount} failed.`, successCount > 0 ? "success" : "err");
        window.closeBulkHmrModal();
        if (window.loadFtMachineRegister) window.loadFtMachineRegister({ quiet: true });
    };

    // --- REPORTING QUEUE (Phase 4 Parity) ---
    async function refreshReportQueue() {
        // Report scheduling is not available on this server – skip silently
        return;
    }

    function renderReportQueue(schedule) {
        const queueEl = document.getElementById('ft-report-queue');
        if (!queueEl) return;
        queueEl.innerHTML = '';
        
        schedule.forEach(day => {
            const dayCard = document.createElement('div');
            // Reusing calendar-day styles defined earlier
            dayCard.className = `calendar-day ${day.is_today ? 'today' : ''}`;
            dayCard.style.cursor = 'pointer';
            dayCard.onclick = () => openScheduleDetail(day);
            
            dayCard.innerHTML = `
                <div class="calendar-day-label">${day.day}</div>
                <div class="calendar-day-num">${day.date.split(' ')[0]}</div>
                <div class="calendar-day-count">${day.count} Reports</div>
            `;
            queueEl.appendChild(dayCard);
        });
    }

    function openScheduleDetail(day) {
        // Placeholder for detailed view modal (Detailed Schedule Parity)
        if (day.count === 0) {
            showToast("No reports scheduled for " + day.date, "info");
            return;
        }
        
        let content = `<div style="display:flex; flex-direction:column; gap:12px;">`;
        day.items.forEach(item => {
            content += `
                <div style="padding:12px; border:1px solid #e2e8f0; border-radius:10px; background:#fff;">
                    <div style="font-weight:800; color:#0f172a; display:flex; justify-content:space-between;">
                        <span>${item.customer}</span>
                        <span style="font-size:10px; background:#f1f5f9; padding:2px 6px; border-radius:4px;">${item.time}</span>
                    </div>
                    <div style="font-size:12px; color:#ef4444; font-weight:700; margin-top:4px;">${item.type} Report</div>
                    <div style="font-size:11px; color:#64748b; margin-top:2px;">${item.preview}</div>
                    <div style="margin-top:10px; display:flex; gap:8px;">
                        <button onclick="sendNow('${item.type}', '${item.customer}')" style="flex:1; background:#0f172a; color:white; border:none; padding:6px; border-radius:6px; font-size:11px; font-weight:700; cursor:pointer;">Send Now</button>
                    </div>
                </div>
            `;
        });
        content += `</div>`;
        
        // Using existing mcModal (Omnis Standard)
        const mcModalOverlay = document.getElementById('mc-modal-overlay');
        const mcTitle = document.getElementById('mc-title');
        const mcSubtitle = document.getElementById('mc-subtitle');
        const mcBody = document.getElementById('mc-body');

        if (mcModalOverlay) {
            mcTitle.innerText = "Daily Schedule: " + day.date;
            mcSubtitle.innerText = day.count + " automated reports queued";
            mcBody.innerHTML = content;
            mcModalOverlay.classList.remove('hidden');
            mcModalOverlay.style.display = 'flex';
        }
    }

    async function sendNow(type, customer) {
        showToast(`Dispatching ${type} to ${customer}...`, "info");
        try {
            const res = await callFrappe('/api/method/ptz_powertrack.omnis_dashboard.pt_dashboard.send_report_now', {
                report_type: type,
                customer: customer,
                channels_json: JSON.stringify(['email', 'whatsapp'])
            });
            showToast("Report dispatched via Email & WhatsApp", "success");
        } catch (err) {
            showToast("Dispatch failed: " + err.message, "error");
        }
    }

    // Auto-refresh queue on load
    setTimeout(refreshReportQueue, 1500);

    // --- SYSTEM SETTINGS & GOVERNANCE ---
    window.openSettingsModal = function openSettingsModal() {
        document.getElementById('settings-modal').classList.remove('hidden');
        // Pre-fill email settings from localStorage or similar if needed
    };

    window.closeSettingsModal = function closeSettingsModal() {
        document.getElementById('settings-modal').classList.add('hidden');
    };

    window.switchSettingsTab = function switchSettingsTab(tab) {
        // Deactivate all tabs and panes
        document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.settings-pane').forEach(p => p.classList.remove('active'));

        // Activate the matching tab button dynamically (no hardcoded index)
        document.querySelectorAll('.settings-tab').forEach(t => {
            const oc = t.getAttribute('onclick') || '';
            if (oc.includes(`'${tab}'`)) t.classList.add('active');
        });

        // Activate the matching pane
        const pane = document.getElementById(`pane-${tab}`);
        if (pane) pane.classList.add('active');
    };

    window.saveActiveSettings = async function saveActiveSettings() {
        const config = {
            host: document.getElementById('set-smtp-host').value,
            port: document.getElementById('set-smtp-port').value,
            user: document.getElementById('set-smtp-user').value,
            pass: document.getElementById('set-smtp-pass').value,
            security: 'TLS'
        };

        const statusEl = document.getElementById('settings-status');
        statusEl.innerText = "Saving...";
        statusEl.style.color = "#64748b";

        try {
            // Updated to use whitelisted method update_email_settings
            const res = await callFrappe('/api/method/ptz_powertrack.omnis_dashboard.pt_dashboard.update_email_settings', {
                config_json: JSON.stringify(config)
            });
            
            statusEl.innerText = "✓ Settings Saved Successfully";
            statusEl.style.color = "#10b981";
            showToast("Email configuration updated.", "success");
            setTimeout(() => { statusEl.innerText = ""; }, 3000);
        } catch (err) {
            statusEl.innerText = "Error saving settings";
            statusEl.style.color = "#ef4444";
            showToast("Save failed: " + err.message, "error");
        }
    };

    window.saveApiCredentials = function saveApiCredentials() {
      const key    = (document.getElementById('set-frappe-api-key')?.value || '').trim();
      const secret = (document.getElementById('set-frappe-api-secret')?.value || '').trim();
      const statusEl = document.getElementById('api-cred-status');
      if (!key || !secret) {
        if (statusEl) { statusEl.textContent = 'Both Key and Secret are required.'; statusEl.style.color = '#ef4444'; }
        return;
      }
      localStorage.setItem('ft_api_key', key);
      localStorage.setItem('ft_api_secret', secret);
      if (statusEl) { statusEl.textContent = '✓ Credentials saved — Backfill will now authenticate.'; statusEl.style.color = '#10b981'; }
      showToast('Frappe API credentials saved.', 'success');
      setTimeout(() => { if (statusEl) statusEl.textContent = ''; }, 4000);
    };

    window.clearApiCredentials = function clearApiCredentials() {
      localStorage.removeItem('ft_api_key');
      localStorage.removeItem('ft_api_secret');
      const kEl = document.getElementById('set-frappe-api-key');
      const sEl = document.getElementById('set-frappe-api-secret');
      if (kEl) kEl.value = '';
      if (sEl) sEl.value = '';
      const statusEl = document.getElementById('api-cred-status');
      if (statusEl) { statusEl.textContent = 'Credentials cleared.'; statusEl.style.color = '#64748b'; }
      showToast('API credentials cleared.', 'info');
    };

    // Pre-fill API fields when settings modal opens
    function _prefillApiFields() {
      const k = localStorage.getItem('ft_api_key');
      const s = localStorage.getItem('ft_api_secret');
      const kEl = document.getElementById('set-frappe-api-key');
      const sEl = document.getElementById('set-frappe-api-secret');
      if (kEl && k) kEl.value = k;
      if (sEl && s) sEl.value = s;
    }
    document.addEventListener('DOMContentLoaded', _prefillApiFields);
    setTimeout(_prefillApiFields, 1800);

    window.testEmailConnection = async function testEmailConnection() {
        const config = {
            host: document.getElementById('set-smtp-host').value,
            port: document.getElementById('set-smtp-port').value,
            user: document.getElementById('set-smtp-user').value,
            pass: document.getElementById('set-smtp-pass').value,
            security: 'TLS'
        };

        const statusEl = document.getElementById('settings-status');
        statusEl.innerText = "Testing connection...";
        statusEl.style.color = "#64748b";

        try {
            const res = await callFrappe('/api/method/ptz_powertrack.omnis_dashboard.pt_dashboard.test_email_connection', {
                config_json: JSON.stringify(config)
            });
            
            if (res && res.message && res.message.status === "success") {
                statusEl.innerText = "✅ " + res.message.message;
                statusEl.style.color = "#16a34a";
            } else {
                statusEl.innerText = "❌ " + (res.message ? res.message.message : "Connection Failed");
                statusEl.style.color = "#dc2626";
            }
        } catch (err) {
            statusEl.innerText = "❌ Error: " + err.message;
            statusEl.style.color = "#dc2626";
        }
    };

    window.openWaLinkModal = function openWaLinkModal() {
        document.getElementById('wa-link-modal').classList.remove('hidden');
        const status = document.getElementById('wa-status-text');
        const qr = document.getElementById('wa-qr-code');
        
        status.innerText = "Generating secure QR code...";
        qr.style.opacity = "0.3";
        
        setTimeout(() => {
            status.innerText = "Scan with your WhatsApp";
            qr.style.opacity = "1";
        }, 1500);
    };

    window.closeWaLinkModal = function closeWaLinkModal() {
        document.getElementById('wa-link-modal').classList.add('hidden');
    };
    
    // All settings functions are now directly on window at definition site

    // =====================================================================
    // AUDIT TRAIL VIEWER
    // =====================================================================
    var _auditCurrentPage = 1;
    var _auditPageSize    = 50;
    var _auditTotal       = 0;

    window.loadAuditTrail = async function(reset) {
      if (reset !== false) _auditCurrentPage = 1;
      var tbody  = document.getElementById('audit-tbody');
      var cntEl  = document.getElementById('audit-count');
      var pgLbl  = document.getElementById('audit-page-lbl');
      var prevBtn = document.getElementById('audit-prev');
      var nextBtn = document.getElementById('audit-next');
      if (!tbody) return;
      tbody.innerHTML = '<tr><td colspan="5" style="padding:30px;text-align:center;color:#9ca3af;">Loading...</td></tr>';

      try {
        var evtFilter  = (document.getElementById('audit-filter-type') || {}).value || '';
        var searchTerm = ((document.getElementById('audit-search') || {}).value || '').trim().toLowerCase();
        var from = (_auditCurrentPage - 1) * _auditPageSize;
        var to   = from + _auditPageSize - 1;

        var params = {
          columns: 'id,event_type,entity_type,entity_name,user_email,details,created_at',
          order:   { column: 'created_at', ascending: false },
          range:   { from: from, to: to }
        };
        if (evtFilter) params.filter = { event_type: evtFilter };

        var res = await window.electron.invoke('supabase:query', {
          table: 'omnis_audit_trail',
          method: 'select',
          params: params
        });

        var rows = (res && res.data) || [];
        _auditTotal = res && res.count != null ? res.count : (_auditCurrentPage * _auditPageSize + (rows.length < _auditPageSize ? 0 : 1));

        // Client-side search filter (fast enough for 50 rows)
        if (searchTerm) {
          rows = rows.filter(function(r) {
            return (r.event_type || '').toLowerCase().includes(searchTerm) ||
                   (r.entity_name || '').toLowerCase().includes(searchTerm) ||
                   (r.user_email || '').toLowerCase().includes(searchTerm) ||
                   (r.entity_type || '').toLowerCase().includes(searchTerm);
          });
        }

        // Render
        var EVENT_COLORS = {
          MACHINE_CREATED: { bg: '#dcfce7', color: '#166534' },
          MACHINE_EDITED:  { bg: '#fef9c3', color: '#854d0e' },
          MACHINE_DELETED: { bg: '#fee2e2', color: '#991b1b' },
          MACHINE_FILE_UPLOADED: { bg: '#ede9fe', color: '#5b21b6' },
          USER_LOGIN:      { bg: '#dbeafe', color: '#1e40af' },
          USER_LOGOUT:     { bg: '#f3f4f6', color: '#374151' },
          HMR_UPDATED:     { bg: '#ffedd5', color: '#9a3412' }
        };

        if (!rows.length) {
          tbody.innerHTML = '<tr><td colspan="5" style="padding:40px;text-align:center;color:#9ca3af;">No audit records found.</td></tr>';
        } else {
          tbody.innerHTML = rows.map(function(r, i) {
            var c = EVENT_COLORS[r.event_type] || { bg: '#f3f4f6', color: '#374151' };
            var evtLabel = (r.event_type || '').replace(/_/g, ' ');
            var dt = r.created_at ? new Date(r.created_at).toLocaleString('en-ZA', { dateStyle: 'short', timeStyle: 'medium' }) : '--';
            var detailStr = '';
            if (r.details) {
              try {
                var d = typeof r.details === 'string' ? JSON.parse(r.details) : r.details;
                var keys = Object.keys(d).slice(0, 3);
                detailStr = keys.map(function(k) { return k + ': ' + JSON.stringify(d[k]).slice(0, 40); }).join(', ');
              } catch(_) { detailStr = String(r.details).slice(0, 80); }
            }
            var bg = i % 2 === 0 ? '#fff' : '#f9fafb';
            return '<tr style="background:' + bg + ';border-bottom:1px solid #f3f4f6;">' +
              '<td style="padding:9px 12px;color:#374151;white-space:nowrap;font-size:11px;">' + dt + '</td>' +
              '<td style="padding:9px 12px;">' +
                '<span style="background:' + c.bg + ';color:' + c.color + ';padding:2px 7px;border-radius:4px;font-size:10px;font-weight:600;letter-spacing:0.3px;">' + evtLabel + '</span>' +
              '</td>' +
              '<td style="padding:9px 12px;font-size:12px;font-weight:600;color:#111;">' + (r.entity_name || '<span style="color:#9ca3af;">--</span>') + '</td>' +
              '<td style="padding:9px 12px;font-size:11px;color:#6b7280;">' + (r.user_email || '--') + '</td>' +
              '<td style="padding:9px 12px;font-size:11px;color:#6b7280;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + detailStr + '">' + (detailStr || '--') + '</td>' +
            '</tr>';
          }).join('');
        }

        var totalPages = Math.ceil(_auditTotal / _auditPageSize) || 1;
        if (cntEl) cntEl.textContent = _auditTotal + ' total records';
        if (pgLbl) pgLbl.textContent = 'Page ' + _auditCurrentPage + ' of ' + totalPages;
        if (prevBtn) prevBtn.disabled = _auditCurrentPage <= 1;
        if (nextBtn) nextBtn.disabled = rows.length < _auditPageSize;
      } catch(e) {
        tbody.innerHTML = '<tr><td colspan="5" style="padding:30px;text-align:center;color:#dc2626;">Error: ' + (e.message || String(e)) + '</td></tr>';
      }
    };

    window.auditPage = function(dir) {
      _auditCurrentPage = Math.max(1, _auditCurrentPage + dir);
      window.loadAuditTrail(false);
    };

    window.exportAuditCsv = async function() {
      try {
        var res = await window.electron.invoke('supabase:query', {
          table: 'omnis_audit_trail',
          method: 'select',
          params: {
            columns: 'created_at,event_type,entity_type,entity_name,user_email,details',
            order: { column: 'created_at', ascending: false },
            range: { from: 0, to: 4999 }
          }
        });
        var rows = (res && res.data) || [];
        var header = ['Timestamp', 'Event', 'Entity Type', 'Entity Name', 'User', 'Details'];
        var lines = [header.join(',')];
        rows.forEach(function(r) {
          var detStr = '';
          try { detStr = JSON.stringify(r.details || '').replace(/"/g, "'"); } catch(_) {}
          lines.push([
            '"' + (r.created_at || '') + '"',
            '"' + (r.event_type || '') + '"',
            '"' + (r.entity_type || '') + '"',
            '"' + (r.entity_name || '') + '"',
            '"' + (r.user_email || '') + '"',
            '"' + detStr + '"'
          ].join(','));
        });
        var csv = lines.join('\r\n');
        var blob = new Blob([csv], { type: 'text/csv' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url; a.download = 'omnis-audit-trail-' + new Date().toISOString().slice(0,10) + '.csv';
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
        if (typeof showToast === 'function') showToast('Audit trail exported (' + rows.length + ' records).', 'ok', 3000);
      } catch(e) {
        if (typeof showToast === 'function') showToast('Export failed: ' + e.message, 'err', 4000);
      }
    };

    // ══════════════════════════════════════════════════════
    //  SYNC MONITOR — compare Frappe ↔ Supabase record counts
    // ══════════════════════════════════════════════════════
    const SYNC_ENTITIES = [
      {
        id: 'machines',
        label: 'Machines',
        supaTable: 'ft_machine',
        // Use in-memory data if the register is loaded, else fetch it (whitelisted endpoint)
        localFn: async () => {
          const n = (window.FT_MACHINE_ROWS || []).length;
          if (n) return { count: n };
          // Register not loaded yet — count from Supabase (fast, no Frappe needed)
          try {
            const res = await window.electron.invoke('supabase:query', {
              table: 'ft_machine', method: 'select',
              params: { columns: 'name', range: { from: 0, to: 0 } }
            });
            // Supabase count: use count option via head query if supported, else just return null
            if (res && res.count != null) return { count: res.count };
          } catch (_) {}
          return null; // fall through to frappePath
        },
        frappePath: '/api/method/frappe.client.get_count',
        frappParams: { doctype: 'FT Machine' }
      },
      {
        id: 'breakdowns',
        label: 'Breakdown Logs',
        supaTable: 'ft_breakdown_log',
        // Use frappe.client.get_count for accurate total; fall back to in-memory if already loaded
        localFn: async () => {
          const n = (window.FT_BREAKDOWN_ROWS || []).length;
          return n ? { count: n } : null; // null → fall through to frappePath
        },
        frappePath: '/api/method/frappe.client.get_count',
        frappParams: { doctype: 'FT Breakdown Log' }
      },
      {
        id: 'defects',
        label: 'Defect Reports',
        supaTable: 'ft_defect',
        // Use get_count for accurate total (summary API is capped at 200)
        frappePath: '/api/method/frappe.client.get_count',
        frappParams: { doctype: 'FT Defects Log' }
      },
      {
        id: 'service',
        label: 'Service Plans',
        supaTable: 'ft_service_plan',
        frappePath: '/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.get_ft_service_plan_list',
        frappParams: {}
      }
    ];

    async function _syncGetSupaCount(table) {
      try {
        const res = await window.electron.invoke('supabase:query', {
          table,
          method: 'select',
          // count:'exact' + head:true → PostgREST returns true total in header,
          // zero rows fetched, works correctly beyond the 1000-row default page limit
          params: { columns: '*', options: { count: 'exact', head: true } }
        });
        if (res.error) return { count: null, err: res.error.message || 'Supabase error' };
        // supabase-js exposes the header count via result.count
        const n = res.count;
        return { count: (typeof n === 'number') ? n : null };
      } catch(e) {
        return { count: null, err: e.message };
      }
    }

    async function _syncGetFrappCount(e) {
      // 1. Try localFn first (in-memory, no network call)
      if (e.localFn) {
        try {
          const local = await e.localFn();
          if (local !== null) return local; // null means "fall through to Frappe"
        } catch (_) {}
      }
      // 2. Fall back to Frappe API if path provided
      if (!e.frappePath) return { count: null, err: 'No Frappe source configured' };
      try {
        const res = await callFrappe(e.frappePath, e.frappParams, 'GET');
        const val = res.message;
        if (typeof val === 'number') return { count: val };
        if (typeof val === 'string' && !isNaN(parseInt(val))) return { count: parseInt(val) };
        if (Array.isArray(val)) return { count: val.length };
        if (val && Array.isArray(val.rows)) return { count: val.rows.length };
        if (val && Array.isArray(val.data)) return { count: val.data.length };
        return { count: null, err: 'Unexpected response shape: ' + JSON.stringify(val).slice(0, 120) };
      } catch(e) {
        return { count: null, err: e.message };
      }
    }

    function _syncSetRow(id, fr, sb, running) {
      const frEl = document.getElementById('sc-fr-' + id);
      const sbEl = document.getElementById('sc-sb-' + id);
      const dlEl = document.getElementById('sc-dl-' + id);
      const stEl = document.getElementById('sc-st-' + id);
      if (!frEl) return;

      if (running) {
        frEl.textContent = '…'; sbEl.textContent = '…';
        dlEl.textContent = '…';
        stEl.textContent = 'Checking'; stEl.className = 'sync-badge';
        return;
      }

      const frCount = fr.count;
      const sbCount = sb.count;
      frEl.textContent = frCount !== null ? frCount.toLocaleString() : '—';
      sbEl.textContent = sbCount !== null ? sbCount.toLocaleString() : '—';

      // Actual errors (fr.err or sb.err set) → red Error badge
      if (fr.err || sb.err) {
        dlEl.textContent = '—';
        stEl.textContent = 'Error'; stEl.className = 'sync-badge error';
        return 'error';
      }

      // Either count null but no explicit error → grey N/A (data not loaded)
      if (frCount === null || sbCount === null) {
        dlEl.textContent = '—';
        stEl.textContent = 'N/A'; stEl.className = 'sync-badge';
        return 'ok'; // Don't count as worst-case error
      }

      const delta = frCount - sbCount;
      dlEl.textContent = delta === 0 ? '0' : (delta > 0 ? '+' + delta : delta);
      const absDelta = Math.abs(delta);
      if (absDelta === 0) {
        stEl.textContent = '✓ Synced'; stEl.className = 'sync-badge ok';
        return 'ok';
      } else if (absDelta <= 10) {
        stEl.textContent = '⚠ Lag'; stEl.className = 'sync-badge lag';
        return 'lag';
      } else {
        stEl.textContent = '✗ Drift'; stEl.className = 'sync-badge drift';
        return 'drift';
      }
    }

    async function runSyncCheck() {
      const btn      = document.getElementById('sync-run-btn');
      const dot      = document.getElementById('sync-health-dot');
      const label    = document.getElementById('sync-health-label');
      const sub      = document.getElementById('sync-health-sub');
      const lastEl   = document.getElementById('sync-last-checked');
      const dbgLog   = document.getElementById('sync-debug-log');
      const dbgToggle= document.getElementById('sync-debug-toggle');
      const dbgLabel = document.getElementById('sync-debug-toggle-label');
      const dbgCount = document.getElementById('sync-debug-err-count');

      if (btn) { btn.disabled = true; btn.style.opacity = '0.6'; }

      // Reset debug log for this run
      if (dbgLog) dbgLog.innerHTML = '';
      if (dbgToggle) dbgToggle.style.display = 'none';

      const debugEntries = [];

      function addDebugEntry(entity, source, level, message) {
        const ts = new Date().toLocaleTimeString();
        const colors = { error: { bg:'#7f1d1d', border:'#991b1b', tag:'#fca5a5', text:'#fecaca' },
                         warn:  { bg:'#451a03', border:'#92400e', tag:'#fcd34d', text:'#fde68a' },
                         info:  { bg:'#052e16', border:'#14532d', tag:'#6ee7b7', text:'#a7f3d0' } };
        const c = colors[level] || colors.info;
        debugEntries.push({ entity, source, level, message, ts });
        if (dbgLog) {
          dbgLog.innerHTML += `
            <div style="background:${c.bg};border:1px solid ${c.border};border-radius:6px;padding:8px 10px;display:flex;flex-direction:column;gap:3px;">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:2px;">
                <span style="color:${c.tag};font-weight:800;font-size:10px;text-transform:uppercase;">${level}</span>
                <span style="color:#94a3b8;font-size:9px;">${ts}</span>
                <span style="color:#64748b;font-size:9px;">·</span>
                <span style="color:#cbd5e1;font-size:10px;font-weight:700;">${entity}</span>
                <span style="color:#64748b;font-size:9px;">·</span>
                <span style="color:#64748b;font-size:9px;">${source}</span>
              </div>
              <div style="color:${c.text};font-size:10px;line-height:1.5;word-break:break-all;">${message}</div>
            </div>`;
        }
      }

      // Set all rows to "checking..."
      SYNC_ENTITIES.forEach(e => _syncSetRow(e.id, {}, {}, true));
      if (dot)   dot.style.background = '#94a3b8';
      if (label) label.textContent = 'Checking…';
      if (sub)   sub.textContent = 'Querying Frappe and Supabase…';

      // Run all checks concurrently
      const results = await Promise.all(SYNC_ENTITIES.map(async e => {
        const [fr, sb] = await Promise.all([
          _syncGetFrappCount(e),
          _syncGetSupaCount(e.supaTable)
        ]);

        // Log to debug panel
        if (fr.err)       addDebugEntry(e.label, 'Frappe',   'error', fr.err);
        else if (fr.count !== null) addDebugEntry(e.label, 'Frappe', 'info', `Count: ${fr.count}`);
        // else: silent null (no error, data just not loaded) — don't pollute debug log
        if (sb.err)       addDebugEntry(e.label, 'Supabase', 'error', sb.err);
        else if (sb.count !== null) addDebugEntry(e.label, 'Supabase', 'info', `Count: ${sb.count}`);

        const status = _syncSetRow(e.id, fr, sb, false);
        return status;
      }));

      // Show debug toggle if there are any entries
      const errCount = debugEntries.filter(e => e.level === 'error').length;
      if (dbgToggle && debugEntries.length > 0) {
        dbgToggle.style.display = 'block';
        if (dbgLabel) dbgLabel.textContent = `🐛 Debug Log — ${debugEntries.length} entries`;
        if (dbgCount) {
          dbgCount.textContent = errCount > 0 ? `${errCount} error${errCount > 1 ? 's' : ''}` : '';
          dbgCount.style.display = errCount > 0 ? 'inline' : 'none';
        }
        // Auto-open if there are errors
        const panel = document.getElementById('sync-debug-panel');
        if (panel && errCount > 0) panel.style.display = 'block';
      }

      // Overall health
      const worstOrder = ['drift', 'error', 'lag', 'ok'];
      const worst = worstOrder.find(s => results.includes(s)) || 'ok';
      const colours  = { ok: '#16a34a', lag: '#d97706', drift: '#ef4444', error: '#64748b' };
      const messages = {
        ok:    { label: 'All systems synced',         sub: 'Frappe and Supabase are in perfect alignment.' },
        lag:   { label: 'Minor lag detected',         sub: 'Some records are still propagating to Supabase.' },
        drift: { label: 'Significant drift detected', sub: 'One or more entities are out of sync — review the table below.' },
        error: { label: 'Check incomplete',           sub: `${errCount} error(s) encountered — see Debug Log below.` }
      };

      if (dot)    dot.style.background = colours[worst];
      if (label)  label.textContent = messages[worst].label;
      if (sub)    sub.textContent   = messages[worst].sub;
      if (lastEl) lastEl.textContent = 'Last checked: ' + new Date().toLocaleTimeString();
      if (btn)  { btn.disabled = false; btn.style.opacity = '1'; }
    }

    window.runSyncCheck = runSyncCheck;

    // ══════════════════════════════════════════════════════
    //  SOFTWARE UPDATES — About System tab
    // ══════════════════════════════════════════════════════

    function ftCheckUpdatesManually() {
      if (!window.electron?.checkForUpdates) return;
      const btn = document.getElementById('ft-btn-check-update');
      if (btn) { btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> CHECKING…'; btn.disabled = true; }
      window.electron.checkForUpdates().then(() => {
        setTimeout(() => {
          if (btn) { btn.innerHTML = '<i class="fas fa-sync-alt"></i> CHECK FOR UPDATES'; btn.disabled = false; }
        }, 2500);
      }).catch(() => {
        if (btn) { btn.innerHTML = '<i class="fas fa-sync-alt"></i> CHECK FOR UPDATES'; btn.disabled = false; }
      });
    }
    window.ftCheckUpdatesManually = ftCheckUpdatesManually;

    async function ftLoadReleaseNotes() {
      const el = document.getElementById('ft-update-changelog');
      if (!el) return;
      try {
        const res = await fetch('../../RELEASE_NOTES.md');
        if (!res.ok) throw new Error('Stream unreachable');
        const text = await res.text();
        const startMark = "## \uD83D\uDE80 What's New";
        const endMark   = '---';
        const si = text.indexOf(startMark);
        if (si === -1) throw new Error('Changelog format mismatch');
        let section = text.substring(si + startMark.length);
        const ei = section.indexOf(endMark);
        if (ei !== -1) section = section.substring(0, ei);
        const lines = section.split('\n').filter(l => l.trim());
        let html = '';
        lines.forEach(line => {
          const t = line.trim();
          if (t.startsWith('###')) {
            html += `<div style="font-size:11px;font-weight:850;color:#0f172a;margin-top:6px;border-left:3px solid #2563eb;padding-left:8px;text-transform:uppercase;letter-spacing:0.4px;">${t.replace('###','').trim()}</div>`;
          } else if (t.startsWith('*')) {
            const c = t.replace('*','').trim().replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');
            html += `<div style="display:flex;gap:9px;align-items:flex-start;background:white;padding:10px 12px;border-radius:9px;border:1px solid #e2e8f0;transition:all 0.2s;" onmouseover="this.style.borderColor='#2563eb';this.style.transform='translateX(3px)'" onmouseout="this.style.borderColor='#e2e8f0';this.style.transform='none'"><div style="color:#2563eb;font-size:9px;margin-top:3px;">&#x2714;</div><div style="font-size:12px;color:#475569;line-height:1.5;font-weight:500;">${c}</div></div>`;
          }
        });
        if (!html) html = `<div style="padding:20px;text-align:center;color:#94a3b8;font-size:12px;">No features listed for this version.</div>`;
        el.innerHTML = html;
      } catch (e) {
        el.innerHTML = `<div style="padding:20px;text-align:center;color:#94a3b8;font-size:12px;">Release notes unavailable (${e.message}).</div>`;
      }
    }

    // Listen for update events forwarded by main.js autoUpdater
    if (window.electron?.on) {
      window.electron.on('update-message', (event, data) => {
        const statusEl = document.getElementById('ft-update-status');
        const progWrap = document.getElementById('ft-update-progress-wrap');
        if (statusEl && data.text) statusEl.textContent = data.text;

        if (data.type === 'uptodate') {
          if (progWrap) progWrap.style.display = 'none';
          ftLoadReleaseNotes();
        } else if (data.type === 'available') {
          if (progWrap) progWrap.style.display = 'block';
          ftLoadReleaseNotes();
        } else if (data.type === 'downloaded') {
          const bar = document.getElementById('ft-update-bar');
          const pct = document.getElementById('ft-update-pct');
          if (bar) bar.style.width = '100%';
          if (pct) pct.textContent = '100%';
        } else if (data.type === 'progress' && data.progress) {
          const info = data.progress;
          if (progWrap) progWrap.style.display = 'block';
          const bar   = document.getElementById('ft-update-bar');
          const pct   = document.getElementById('ft-update-pct');
          const stats = document.getElementById('ft-update-stats');
          const eta   = document.getElementById('ft-update-eta');
          const p = Math.floor(info.percent || 0);
          if (bar)   bar.style.width = p + '%';
          if (pct)   pct.textContent  = p + '%';
          const speed = (info.bytesPerSecond / 1024 / 1024).toFixed(2);
          const xfr   = (info.transferred   / 1024 / 1024).toFixed(1);
          const tot   = (info.total         / 1024 / 1024).toFixed(1);
          if (stats) stats.textContent = `${xfr} MB / ${tot} MB • ${speed} MB/s`;
          if (eta && info.bytesPerSecond > 0) {
            const secs = Math.round((info.total - info.transferred) / info.bytesPerSecond);
            eta.textContent = secs < 60 ? `ETA: ${secs}s` : `ETA: ${Math.floor(secs/60)}m ${secs % 60}s`;
          }
        }
      });
    }

    // Seed the version label; load release notes after short delay
    if (window.electron?.getVersion) {
      window.electron.getVersion().then(v => {
        const s = document.getElementById('ft-update-status');
        if (s) s.textContent = `Version ${v}`;
      });
    }
    setTimeout(() => ftLoadReleaseNotes(), 800);

    // ══════════════════════════════════════════════════════════════════════
    //  CLIENT-SIDE FULL BACKFILL
    //  Reads from Frappe REST API → upserts directly into Supabase
    //  No server-side changes needed — uses existing Electron IPC bridge
    // ══════════════════════════════════════════════════════════════════════

    // Frappe metadata fields to ALWAYS strip (never valid Supabase columns)
    const _BF_FRAPPE_META = new Set([
      'doctype','modified_by','owner','idx','docstatus',
      'parent','parenttype','parentfield','naming_series',
      '__islocal','__unsaved','_liked_by','_comments','_assign','_user_tags',
      'amended_from','_seen','is_local','read_only','in_list_view'
    ]);

    // Exact column whitelists from the Supabase schema SQL
    // Only fields in this list will be sent to Supabase for each entity
    const _BF_COLS = {
      ft_machine: new Set([
        'name','model','oem','sn','type','esn','section_break_4','column_break_7','gearbox',
        'section_break_10','notes','fleet_no','location','region','supplied',
        'warranty_details_section','handover_date','expiry_date','column_break_19',
        'warranty_hours','hmr_section','starting_hmr','column_break_23','current_hmr',
        'service_details_section','service_interval_hours','column_break_27',
        'last_service_date','last_service_hmr','next_service_hmr','initial_service_type',
        'warranty_status','service_obligation','initial_service_section','track_initial_service',
        'column_break_37','initial_service_status','customer','hours_remaining_to_service',
        'last_hmr_date','fleetrack_managed','section_break_2','colb1','colb2','colbr3',
        'colbr4','colbr6','cb1','cb2','has_telematics_device','column_break_32',
        'column_break_47','column_break_49','column_break_34','last_hmr_log',
        'days_since_last_hmr','column_break_38','column_break_54','column_break_44',
        'column_break_24','warranty_type','chassis_number','epr_entry_date','engine_type',
        'warranty_period','cbbb2','mxg_fleet_no','colbr_nre_fleet','section_break_57',
        'col_br_nst','next_service_type','col_br_service_hdr','last_service_type',
        'cbroemreg','oem_registered','library_section','filters_list','compatible_get',
        'pdi_checklist','lube_types','belt_dimensions','hyd_filters_dimensions',
        'equipment_information_form','wty_certificate','nei_checklist','column_break_81',
        'column_break_83','machine_picture','machine_data_plate','engine_data_plate',
        'supplier','misc_files','madr_section','track_components','rpc_list',
        'parts_manuals','parts_manuals_2','parts_manuals_3','operating_weight','bin_capacity',
        'standard_fuel_consumption','tyre_size','canbus_enabled','unique_attachments_fitted',
        'telematics_section','telematics_device','column_break_yztmf','telematics_device_sn',
        'sim_card','enabled_parameters','service_guide_section','standard_service_configuration',
        'btn_view_unique_attachments','mobility','under_carriage_section','chain_make',
        'column_break_gwqvk','chain_length','column_break_jociq','chain_width',
        'sprokects_section','sproket_lhs_teeth','sproket_lhs_holes','column_break_guec2',
        'sproket_rhs_teeth','sproket_rhs_holes','other_uc_info','get_components_section',
        'get_components','fb_section','filters_and_belts','customer_file_section',
        'machine_welcome_report_status','column_break_duu5t','column_break_4ctjf',
        'prepare_welcome_report','btn_prepare_machine_welcome_report',
        'total_running_hours','working_voltage','created_at','updated_at'
      ]),
      ft_breakdown_log: new Set([
        'name','machine','column_break_2','oem','customer','breakdown_date','location',
        'breakdown_details_section','column_break_8','description','status','days_on_bd',
        'end_date','model','fleetrack_managed','warranty_status','parts_eta','ted','red',
        'fsb','resp','responsibility','section_break_19','last_col_br_oeta','section_break_17','dobd_col_br',
        'oeta_col_br','out_eta','section_break_27','on_hold','ted_status','bd_duration',
        'category','created_at','updated_at'
      ]),
      ft_defect: new Set([
        'name','defect_type','machine','customer','fleetrack_managed','oem','model',
        'location','region','warranty_status','start_date','priority','status',
        'description','on_hold','ted','end_date','defect_days',
        'technician','reported_by','hmr_at_defect',
        'created_at','modified_at'
      ])
    };

    // Clean a Frappe record: strip meta fields, map dates, apply column whitelist
    function _bfClean(record, allowedCols) {
      const out = {};
      for (const [k, v] of Object.entries(record)) {
        if (_BF_FRAPPE_META.has(k)) continue;
        // Map Frappe creation/modified → Supabase timestamp columns
        if (k === 'creation') {
          if (v && (!allowedCols || allowedCols.has('created_at'))) { out['created_at'] = v; }
          continue;
        }
        if (k === 'modified') {
          // ft_defect uses modified_at; others use updated_at
          if (v) {
            if (!allowedCols || allowedCols.has('updated_at'))  out['updated_at']  = v;
            if (!allowedCols || allowedCols.has('modified_at')) out['modified_at'] = v;
          }
          continue;
        }
        if (k === 'resp' || k === 'responsibility') {
          if (v && (!allowedCols || allowedCols.has('responsibility'))) out['responsibility'] = v;
          continue;
        }
        // Apply whitelist if provided — skip unknown columns
        if (allowedCols && !allowedCols.has(k)) continue;
        out[k] = v;
      }
      return out;
    }

    // Page through /api/resource/{doctype} and return ALL records
    async function _bfFetchAll(doctype, onCount) {
      const PAGE = 200;
      const all  = [];
      let offset = 0;
      while (true) { // eslint-disable-line no-constant-condition
        const res = await callFrappe(
          '/api/resource/' + encodeURIComponent(doctype),
          { fields: '["*"]', limit_page_length: PAGE, limit_start: offset },
          'GET'
        );
        const batch = res.data || [];
        all.push(...batch);
        if (onCount) onCount(all.length);
        if (batch.length < PAGE) break;
        offset += PAGE;
      }
      return all;
    }

    // Upsert records to Supabase in batches — returns { pushed, errors, lastError }
    // ipcParams: optional extra args forwarded to supabase:query (e.g. { onConflict: 'frappe_name' })
    async function _bfUpsert(table, records, batchSize, allowedCols, ipcParams, onProgress) {
      let pushed = 0, errors = 0, lastError = null;
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize).map(r => _bfClean(r, allowedCols));
        const res = await window.electron.invoke('supabase:query', {
          table, method: 'upsert', params: ipcParams || {}, data: batch
        });
        if (res.error || !res.ok) {
          const errMsg = res.error
            ? (res.error.message || res.error.details || JSON.stringify(res.error))
            : 'Unknown upsert error';

          // ── FK recovery: if a machine/breakdown foreign key blocks the batch,
          //    retry with the offending FK column nulled out so valid records still sync
          const isFkError = errMsg && (errMsg.includes('foreign key') || errMsg.includes('_fkey'));
          if (isFkError) {
            // Extract constraint name e.g. "ft_defect_machine_fkey" → column = "machine"
            // Constraint pattern: {table}_{column}_fkey → take last segment before _fkey
            const constraintRaw = errMsg.match(/constraint "([^"]+)"/)?.[1] || '';
            const withoutFkey   = constraintRaw.replace(/_fkey$/i, ''); // "ft_defect_machine"
            // Column = last underscore-delimited token: "machine"
            const fkCol = withoutFkey.split('_').pop() || 'machine';
            console.warn('[Backfill] FK violation on', table, '— column:', fkCol, '— retrying batch with null');
            const retryBatch = batch.map(r => ({ ...r, [fkCol]: null }));
            const retry = await window.electron.invoke('supabase:query', {
              table, method: 'upsert', params: ipcParams || {}, data: retryBatch
            });
            if (retry.ok && !retry.error) {
              pushed += batch.length;
              if (onProgress) onProgress(pushed, records.length, null);
              continue; // recovered — don't count as error
            }
          }

          console.warn('[Backfill] Upsert error on', table, ':', errMsg);
          lastError = errMsg;
          errors++;
        } else {
          pushed += batch.length;
        }
        if (onProgress) onProgress(pushed, records.length, lastError);
      }
      return { pushed, errors, lastError };
    }

    // ── UI helpers ──────────────────────────────────────────────────────
    function _bfRowHTML(id, label, note) {
      return `
        <div id="bf-row-${id}" style="background:#fff;border:1px solid #fed7aa;border-radius:8px;padding:10px 14px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
            <div>
              <span style="font-size:12px;font-weight:700;color:#374151;">${label}</span>
              ${note ? `<div style="font-size:9px;color:#94a3b8;margin-top:1px;">${note}</div>` : ''}
            </div>
            <span id="bf-badge-${id}" style="font-size:10px;font-weight:700;padding:2px 10px;border-radius:20px;background:#f1f5f9;color:#64748b;">Queued</span>
          </div>
          <div style="background:#f1f5f9;border-radius:4px;height:6px;overflow:hidden;">
            <div id="bf-bar-${id}" style="height:100%;width:0%;background:#f97316;border-radius:4px;transition:width 0.3s ease;"></div>
          </div>
          <div id="bf-msg-${id}" style="font-size:10px;color:#64748b;margin-top:5px;"></div>
        </div>`;
    }

    function _bfSetBadge(id, text, color, bg) {
      const el = document.getElementById('bf-badge-' + id);
      if (el) { el.textContent = text; el.style.color = color; el.style.background = bg; }
    }
    function _bfSetBar(id, pct, color) {
      const el = document.getElementById('bf-bar-' + id);
      if (el) { el.style.width = pct + '%'; if (color) el.style.background = color; }
    }
    function _bfSetMsg(id, msg) {
      const el = document.getElementById('bf-msg-' + id);
      if (el) el.textContent = msg;
    }

    // ── Main backfill orchestrator ──────────────────────────────────────
    async function triggerFullBackfill() {
      const btn        = document.getElementById('backfill-trigger-btn');
      const wrap       = document.getElementById('backfill-progress-wrap');
      const rowsEl     = document.getElementById('backfill-entity-rows');
      const statusEl   = document.getElementById('backfill-overall-status');
      const doneBanner = document.getElementById('backfill-done-banner');

      if (btn) { btn.disabled = true; btn.style.opacity = '0.5'; }
      if (wrap) wrap.style.display = 'flex';
      if (doneBanner) doneBanner.style.display = 'none';
      if (statusEl) statusEl.textContent = '⏳ Backfill running — do not close this panel…';

      // ── Entity definitions ──────────────────────────────────────────────
      //  type:'resource' → pages /api/resource/{doctype}
      //  type:'method'   → single call to a custom API method
      //  type:'skip'     → Supabase-native table, not mirrored from Frappe
      const ENTITIES = [
        {
          id: 'machines',
          label: 'Machines',
          type: 'resource',
          doctype: 'FT Machine',
          supaTable: 'ft_machine',
          batchSize: 100
        },
        {
          id: 'breakdowns',
          label: 'Breakdown Logs',
          type: 'resource',
          doctype: 'FT Breakdown Log',
          supaTable: 'ft_breakdown_log',
          batchSize: 100
        },
        {
          id: 'defects',
          label: 'Defect Reports',
          type: 'resource',          // Paginate all 5000+ records via /api/resource
          doctype: 'FT Defects Log',
          supaTable: 'ft_defect',
          batchSize: 100
        },
        {
          id: 'service',
          label: 'Service Plans',
          type: 'service_plan',
          // Fetches from Frappe get_ft_service_plan_list then maps fields to ft_service_plan schema.
          // Requires: ALTER TABLE public.ft_service_plan ADD COLUMN IF NOT EXISTS frappe_name text UNIQUE;
          path: '/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.get_ft_service_plan_list',
          supaTable: 'ft_service_plan'
        }
      ];

      // Build UI rows
      if (rowsEl) {
        rowsEl.innerHTML = ENTITIES.map(e => _bfRowHTML(e.id, e.label, e.note)).join('');
      }

      let totalPushed = 0, failCount = 0;

      for (const entity of ENTITIES) {
        // ── SKIP ──
        if (entity.type === 'skip') {
          _bfSetBar(entity.id, 100, '#94a3b8');
          _bfSetBadge(entity.id, '— Skipped', '#64748b', '#f1f5f9');
          _bfSetMsg(entity.id, entity.note || 'Skipped.');
          continue;
        }

        // ── SERVICE PLAN (special: fetch + field-map + upsert on frappe_name) ──
        if (entity.type === 'service_plan') {
          _bfSetBadge(entity.id, '⬇ Fetching…', '#92400e', '#fef3c7');
          _bfSetBar(entity.id, 15);
          _bfSetMsg(entity.id, 'Fetching service plans from Frappe…');
          try {
            const res = await callFrappe(entity.path, {}, 'GET');
            const raw  = Array.isArray(res.message) ? res.message : [];

            if (raw.length === 0) {
              _bfSetBar(entity.id, 100, '#d97706');
              _bfSetBadge(entity.id, '⚠ Empty', '#b45309', '#fef3c7');
              _bfSetMsg(entity.id, 'Frappe returned 0 service plans — nothing to push.');
              continue;
            }

            // Map Frappe FT Field Service Plan → Supabase ft_service_plan
            // Requires: ALTER TABLE public.ft_service_plan
            //           ADD COLUMN IF NOT EXISTS frappe_name text UNIQUE;
            const mapped = raw.map(r => ({
              machine_id:  r.machine  || null,
              customer:    r.customer || null,
              raw_date:    r.raw_date || null,
              status:      r.status   || 'Proposed',
              technician:  r.technician || null,
              description: r.description || null,
              frappe_name: r.name   // deduplication key
            }));

            _bfSetMsg(entity.id, `Fetched ${mapped.length} plans — uploading to Supabase…`);
            _bfSetBar(entity.id, 40);
            _bfSetBadge(entity.id, '⬆ Uploading…', '#1e40af', '#dbeafe');

            const { pushed, errors, lastError } = await _bfUpsert(
              entity.supaTable,
              mapped,
              50,            // small batch — only ~29 records
              null,          // allowedCols: null → pass all mapped keys as-is
              { onConflict: 'frappe_name' },   // ipcParams
              (done, total, errMsg) => {
                _bfSetBar(entity.id, 40 + Math.round((done / total) * 60));
                _bfSetMsg(entity.id, `Upserted ${done} / ${total}…${errMsg ? ' ⚠ ' + errMsg.slice(0, 60) : ''}`);
              }
            );

            totalPushed += pushed;
            if (errors > 0) {
              const hint = (lastError || '').includes('frappe_name')
                ? ' Run SQL first: ALTER TABLE public.ft_service_plan ADD COLUMN IF NOT EXISTS frappe_name text UNIQUE;'
                : '';
              _bfSetBar(entity.id, 100, '#f97316');
              _bfSetBadge(entity.id, `⚠ ${errors} error(s)`, '#b45309', '#fef3c7');
              _bfSetMsg(entity.id, `Error: ${(lastError || '').slice(0, 100)}${hint}`);
              failCount++;
            } else {
              _bfSetBar(entity.id, 100, '#16a34a');
              _bfSetBadge(entity.id, `✓ ${pushed} synced`, '#15803d', '#dcfce7');
              _bfSetMsg(entity.id, `All ${pushed} service plans upserted successfully.`);
            }
          } catch (e) {
            _bfSetBar(entity.id, 100, '#ef4444');
            _bfSetBadge(entity.id, '✗ Error', '#b91c1c', '#fee2e2');
            _bfSetMsg(entity.id, (e.message || String(e)).slice(0, 200));
            failCount++;
          }
          continue; // skip the generic try block below
        }

        try {
          // ── Step 1: Fetch from Frappe ──────────────────────────────────
          _bfSetBadge(entity.id, '⬇ Fetching…', '#92400e', '#fef3c7');
          _bfSetBar(entity.id, 10);
          _bfSetMsg(entity.id, 'Fetching records from Frappe…');

          let records = [];

          if (entity.type === 'resource') {
            records = await _bfFetchAll(entity.doctype, (n) => {
              _bfSetMsg(entity.id, `Fetched ${n} records from Frappe…`);
            });
          } else if (entity.type === 'method') {
            const res = await callFrappe(entity.path, {}, 'GET');
            const msg = res.message;
            if (entity.resultKey && msg && Array.isArray(msg[entity.resultKey])) {
              records = msg[entity.resultKey];
            } else if (Array.isArray(msg)) {
              records = msg;
            } else {
              throw new Error('Unexpected API response shape: ' + JSON.stringify(msg).slice(0, 80));
            }
          }

          if (records.length === 0) {
            _bfSetBar(entity.id, 100, '#d97706');
            _bfSetBadge(entity.id, '⚠ Empty', '#b45309', '#fef3c7');
            _bfSetMsg(entity.id, 'Frappe returned 0 records — nothing to push.');
            continue;
          }

          _bfSetMsg(entity.id, `Fetched ${records.length} records — uploading to Supabase…`);
          _bfSetBar(entity.id, 40);

          // ── Step 2: Upsert to Supabase ─────────────────────────────────
          _bfSetBadge(entity.id, '⬆ Uploading…', '#1e40af', '#dbeafe');

          const allowedCols = _BF_COLS[entity.supaTable] || null;
          const { pushed, errors, lastError } = await _bfUpsert(
            entity.supaTable,
            records,
            entity.batchSize,
            allowedCols,
            null,           // ipcParams: default upsert (conflict on PK 'name')
            (done, total, errMsg) => {
              const pct = 40 + Math.round((done / total) * 60);
              _bfSetBar(entity.id, pct);
              _bfSetMsg(entity.id, `Upserted ${done} / ${total} records…${errMsg ? ' ⚠ ' + errMsg.slice(0, 60) : ''}`);
            }
          );

          totalPushed += pushed;

          if (errors > 0) {
            _bfSetBar(entity.id, 100, '#f97316');
            _bfSetBadge(entity.id, `⚠ ${errors} batch error(s)`, '#b45309', '#fef3c7');
            _bfSetMsg(entity.id, `Pushed ${pushed} of ${records.length} records. Error: ${(lastError || '').slice(0, 120)}`);
            failCount++;
          } else {
            _bfSetBar(entity.id, 100, '#16a34a');
            _bfSetBadge(entity.id, `✓ ${pushed} synced`, '#15803d', '#dcfce7');
            _bfSetMsg(entity.id, `All ${pushed} records upserted successfully.`);
          }

        } catch (e) {
          _bfSetBar(entity.id, 100, '#ef4444');
          _bfSetBadge(entity.id, '✗ Error', '#b91c1c', '#fee2e2');
          _bfSetMsg(entity.id, (e.message || String(e)).slice(0, 200));
          failCount++;
        }
      }

      // ── Final summary ──────────────────────────────────────────────────
      if (statusEl) {
        statusEl.textContent = failCount === 0
          ? `✓ Backfill complete — ${totalPushed} records pushed to Supabase.`
          : `Finished with ${failCount} issue(s) — ${totalPushed} records pushed.`;
        statusEl.style.color = failCount === 0 ? '#15803d' : '#b91c1c';
      }
      if (doneBanner) {
        doneBanner.style.display = 'flex';
        doneBanner.style.background = failCount === 0 ? '#dcfce7' : '#fef3c7';
        doneBanner.style.color      = failCount === 0 ? '#15803d' : '#92400e';
        doneBanner.textContent = failCount === 0
          ? `✓ Backfill complete — ${totalPushed} records synced. Re-running sync check…`
          : `⚠ Backfill finished with issues — re-running sync check…`;
      }
      if (btn) { btn.disabled = false; btn.style.opacity = '1'; }

      // Refresh the sync counts after 2 s
      setTimeout(() => runSyncCheck(), 2000);
    }

    window.triggerFullBackfill = triggerFullBackfill;



    // Re-initialize modal elements after they've been relocated to the bottom of the DOM
    window.mcModalOverlay = document.getElementById("mc-modal-overlay");
    window.mcTitle = document.getElementById("mc-title");
    window.mcSubtitle = document.getElementById("mc-subtitle");
    window.mcBody = document.getElementById("mc-body");
    window.mcAddBreakdown = document.getElementById("mc-add-breakdown");
    window.mcAddDefect = document.getElementById("mc-add-defect");
    window.mcAddFsp = document.getElementById("mc-add-fsp");
    window.mcAddHmr = document.getElementById("mc-add-hmr");
    window.mcEditMachine = document.getElementById("mc-edit-machine");
    window.mcDeleteMachine = document.getElementById("mc-delete-machine");
    window.mcClose = document.getElementById("mc-close");
    if (window.mcEditMachine) {
      window.mcEditMachine.addEventListener('click', function() {
        var name = (window.MC_CURRENT_MACHINE && window.MC_CURRENT_MACHINE.name) || '';
        if (name) openEditMachineModal(name);
      });
    }
    if (window.mcDeleteMachine) {
      window.mcDeleteMachine.addEventListener('click', function() {
        var m = window.MC_CURRENT_MACHINE || {};
        if (!m.name) return;
        window.openDeleteMachineConfirm(m.name, m.customer || '');
      });
    }
    
    // Safety check
    if (window.ftDebugLog) window.ftDebugLog("Modal elements re-registered at bottom.");
    
    // =====================================================================
    // AUDIT TRAIL HELPER
    // =====================================================================
    window.logAudit = async function(eventType, entityType, entityName, details) {
      try {
        var email = '';
        try { email = window.FT_USER_EMAIL || localStorage.getItem('ft_user_email') || ''; } catch(_) {}
        await window.electron.invoke('supabase:query', {
          table: 'omnis_audit_trail',
          method: 'insert',
          params: { data: {
            event_type:  eventType,
            entity_type: entityType,
            entity_name: String(entityName || '').slice(0, 200),
            user_email:  email,
            details:     details || null
          }}
        });
      } catch(e) { console.warn('[AuditLog]', e); }
    };

    // =====================================================================
    // DELETE MACHINE CONFIRMATION OVERLAY
    // =====================================================================
    window.openDeleteMachineConfirm = function(machineName, customer, model) {
      var old = document.getElementById('del-machine-overlay');
      if (old) old.remove();

      var ov = document.createElement('div');
      ov.id = 'del-machine-overlay';
      ov.style.cssText = [
        'position:fixed;inset:0;z-index:999999;display:flex;',
        'align-items:center;justify-content:center;',
        'background:rgba(0,0,0,0.65);backdrop-filter:blur(4px);'
      ].join('');

      var meta = [model, customer].filter(Boolean).join(' — ');

      var card = document.createElement('div');
      card.style.cssText = [
        'background:#fff;border-radius:12px;width:480px;max-width:92vw;overflow:hidden;',
        "font-family:'Segoe UI',system-ui,sans-serif;",
        'box-shadow:0 24px 64px rgba(0,0,0,0.28);'
      ].join('');

      // Header
      var hdr = document.createElement('div');
      hdr.style.cssText = 'background:linear-gradient(135deg,#dc2626,#b91c1c);padding:20px 24px;color:#fff;';
      hdr.innerHTML = (
        '<div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;">' +
          '<svg viewBox="0 0 20 20" width="20" height="20" fill="#fff">' +
            '<path d="M10 2a8 8 0 1 1 0 16A8 8 0 0 1 10 2zM9 9v5h2V9H9zm0-4v2h2V5H9z"/>' +
          '</svg>' +
          '<span style="font-size:15px;font-weight:700;">Permanent Deletion Warning</span>' +
        '</div>' +
        '<div style="font-size:12px;opacity:0.85;">This action cannot be reversed or recovered.</div>'
      );

      // Body
      var body = document.createElement('div');
      body.style.cssText = 'padding:22px 24px;';

      var machineBox = document.createElement('div');
      machineBox.style.cssText = 'background:#fff8f8;border:1px solid #fca5a5;border-radius:8px;padding:12px 14px;margin-bottom:18px;';
      var lbl = document.createElement('div');
      lbl.style.cssText = 'font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;';
      lbl.textContent = 'Machine to be deleted';
      var nm = document.createElement('div');
      nm.style.cssText = 'font-size:14px;font-weight:700;color:#111;';
      nm.textContent = machineName;
      var mt = document.createElement('div');
      mt.style.cssText = 'font-size:12px;color:#6b7280;margin-top:2px;';
      mt.textContent = meta;
      machineBox.appendChild(lbl); machineBox.appendChild(nm); machineBox.appendChild(mt);

      var p1 = document.createElement('p');
      p1.style.cssText = 'font-size:13px;color:#374151;line-height:1.55;margin:0 0 6px;';
      p1.innerHTML = 'Deleting this machine will <strong>permanently remove</strong> its record from the Machine Registry. ' +
        'Service history and HMR logs will be retained in the database, but the machine will no longer appear in any register or report.';

      var p2 = document.createElement('p');
      p2.style.cssText = 'font-size:12px;color:#9ca3af;margin:0 0 18px;';
      p2.innerHTML = 'This action is logged in the Audit Trail and <strong>cannot be undone</strong>.';

      var confirmLbl = document.createElement('label');
      confirmLbl.style.cssText = 'display:block;font-size:12px;font-weight:600;color:#374151;margin-bottom:6px;';
      var code = document.createElement('span');
      code.style.cssText = 'font-family:monospace;background:#f3f4f6;padding:1px 5px;border-radius:3px;color:#b91c1c;';
      code.textContent = machineName;
      confirmLbl.appendChild(document.createTextNode('Type '));
      confirmLbl.appendChild(code);
      confirmLbl.appendChild(document.createTextNode(' to confirm:'));

      var inp = document.createElement('input');
      inp.id = 'del-confirm-input';
      inp.type = 'text'; inp.autocomplete = 'off';
      inp.placeholder = 'Type the machine ID exactly as shown above...';
      inp.style.cssText = 'width:100%;box-sizing:border-box;border:1.5px solid #d1d5db;border-radius:6px;padding:9px 12px;font-size:13px;outline:none;transition:border-color 0.2s;';

      var errDiv = document.createElement('div');
      errDiv.id = 'del-error';
      errDiv.style.cssText = 'color:#dc2626;font-size:11px;margin-top:6px;min-height:16px;';

      body.appendChild(machineBox);
      body.appendChild(p1); body.appendChild(p2);
      body.appendChild(confirmLbl); body.appendChild(inp); body.appendChild(errDiv);

      // Footer
      var ftr = document.createElement('div');
      ftr.style.cssText = 'padding:16px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;display:flex;justify-content:flex-end;gap:10px;';

      var cancelBtn = document.createElement('button');
      cancelBtn.id = 'del-cancel-btn';
      cancelBtn.textContent = 'Cancel';
      cancelBtn.style.cssText = 'padding:9px 18px;border:1px solid #d1d5db;border-radius:6px;background:#fff;color:#374151;font-size:13px;font-weight:600;cursor:pointer;';

      var delBtn = document.createElement('button');
      delBtn.id = 'del-confirm-btn';
      delBtn.textContent = 'Permanently Delete';
      delBtn.disabled = true;
      delBtn.style.cssText = 'padding:9px 20px;border:none;border-radius:6px;background:#9ca3af;color:#fff;font-size:13px;font-weight:700;cursor:not-allowed;transition:background 0.2s;';

      ftr.appendChild(cancelBtn); ftr.appendChild(delBtn);
      card.appendChild(hdr); card.appendChild(body); card.appendChild(ftr);
      ov.appendChild(card);
      document.body.appendChild(ov);

      cancelBtn.addEventListener('click', function() { ov.remove(); });
      ov.addEventListener('click', function(e) { if (e.target === ov) ov.remove(); });

      inp.addEventListener('input', function() {
        var ok = inp.value.trim() === machineName;
        delBtn.disabled = !ok;
        delBtn.style.background = ok ? '#dc2626' : '#9ca3af';
        delBtn.style.cursor = ok ? 'pointer' : 'not-allowed';
        if (ok) errDiv.textContent = '';
      });

      delBtn.addEventListener('click', async function() {
        if (delBtn.disabled) return;
        delBtn.disabled = true; delBtn.textContent = 'Deleting...'; errDiv.textContent = '';
        try {
          var res = await window.electron.invoke('supabase:query', {
            table: 'ft_machine', method: 'delete',
            params: { match: { name: machineName } }
          });
          if (!res || !res.ok) throw new Error(res && res.error ? res.error : 'Delete failed');

          if (window.FT_MACHINE_ROWS) window.FT_MACHINE_ROWS = window.FT_MACHINE_ROWS.filter(function(r){ return r.name !== machineName; });
          if (window.MACHINES_MAP) delete window.MACHINES_MAP[machineName];
          if (window.FT_MACHINE_DETAIL_CACHE) delete window.FT_MACHINE_DETAIL_CACHE[machineName];
          if (window.LIB_SUPABASE_MAP) delete window.LIB_SUPABASE_MAP[machineName];

          if (typeof window.logAudit === 'function') {
            window.logAudit('MACHINE_DELETED', 'machine', machineName, { customer: customer, model: model });
          }

          ov.remove();
          var mcOv = document.getElementById('mc-modal-overlay') || window.mcModalOverlay;
          if (mcOv) { mcOv.classList.add('hidden'); mcOv.style.setProperty('display','none','important'); }
          if (typeof showToast === 'function') showToast('Machine "' + machineName + '" permanently deleted.', 'ok', 5000);
          setTimeout(function() { if (typeof refreshMachineRegisterReport === 'function') refreshMachineRegisterReport(); }, 80);
        } catch(e) {
          errDiv.textContent = 'Error: ' + (e.message || String(e));
          delBtn.disabled = false; delBtn.textContent = 'Permanently Delete'; delBtn.style.background = '#dc2626';
        }
      });
      setTimeout(function() { if (inp) inp.focus(); }, 60);
    };

    // Add actions
    if (window.mcAddHmr) {
      window.mcAddHmr.addEventListener("click", () => {
        if (window.MC_CURRENT_MACHINE && typeof window.openHmrLogModal === "function") {
          window.openHmrLogModal(window.MC_CURRENT_MACHINE);
        }
      });
    }
    if (window.mcAddBreakdown) {
      window.mcAddBreakdown.addEventListener("click", () => {
        if (window.MC_CURRENT_MACHINE && typeof window.openCreateModal === "function") {
          window.openCreateModal(window.MC_CURRENT_MACHINE.name);
        }
      });
    }
    
    if (window.mcAddDefect) {
      window.mcAddDefect.addEventListener("click", () => {
        if (window.MC_CURRENT_MACHINE && typeof window.openDefectModal === "function") {
          window.openDefectModal(null, window.MC_CURRENT_MACHINE);
        }
      });
    }
    
    if (window.mcAddFsp) {
      window.mcAddFsp.addEventListener("click", () => {
        if (window.MC_CURRENT_MACHINE && typeof window.openFspModal === "function") {
          window.openFspModal(null, window.MC_CURRENT_MACHINE);
        }
      });
    }
    
    // Add close listeners for the new elements
    const setModalHidden = () => {
      if (window.mcModalOverlay) {
        window.mcModalOverlay.classList.add("hidden");
        window.mcModalOverlay.style.setProperty("display", "none", "important");
      }
    };

    if (window.mcClose) {
      window.mcClose.addEventListener("click", setModalHidden);
    }
    
    if (window.mcModalOverlay) {
      window.mcModalOverlay.addEventListener("click", (e) => {
        if (e.target === window.mcModalOverlay) {
          setModalHidden();
        }
      });
    }
  
window.loadISR = async function() {
      const region = document.getElementById('isr-filter-region')?.value || '';
      const container = document.getElementById('isr-table-container');
      const kpi = document.getElementById('isr-kpi-badge');
      if (!container) return;
      container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted);font-size:13px;">? Loading ISR data...</div>';
      try {
        const params = { range: { from: 0, to: 9999 } };
        if (region) params.match = { region: region };
        const raw = await window.electron.invoke('supabase:query', {
            table: 'ft_machine',
            method: 'select',
            params: params
        });
        if (raw.error) throw new Error(raw.error.message || JSON.stringify(raw.error));
        const allMachines = raw.data || [];
        ISR_ROWS = allMachines.filter(m => !m.last_service_date);
        if (kpi) {
          kpi.textContent = ISR_ROWS.length + ' machine' + (ISR_ROWS.length !== 1 ? 's' : '') + ' - No Service Date';
          kpi.style.display = 'block';
        }
        renderISRTable(ISR_ROWS);
      } catch(e) {
        container.innerHTML = '<div style="text-align:center;padding:40px;color:#ef4444;font-size:13px;">? Error loading ISR: ' + e.message + '</div>';
        console.error('[ISR] load error:', e);
      }
    }

    // ════════════════════════════════════════════════════════
    //  NATIVE STANDALONE REPORT ENGINE
    //  Data source: Frappe API now → swap fetchReport() for Supabase later
    // ════════════════════════════════════════════════════════

    // ── Shared helpers ───────────────────────────────────────

    function rptBadge(text, cls) {
      return '<span class="rpt-badge rpt-badge-' + cls + '">' + (text || '—') + '</span>';
    }
    function rptEmpty(colspan, msg) {
      return '<tr><td colspan="' + colspan + '" class="rpt-loading">' + (msg || 'No data found') + '</td></tr>';
    }
    function rptError(colspan, err) {
      return '<tr><td colspan="' + colspan + '" class="rpt-loading" style="color:#ef4444;">Error: ' + (err || 'Failed to load') + '</td></tr>';
    }
    function daysBetween(d1, d2) {
      if (!d1 || !d2) return null;
      return Math.round((new Date(d2) - new Date(d1)) / 86400000);
    }
    function fmtDate(s) {
      if (!s) return '—';
      try { return new Date(s).toLocaleDateString('en-GB'); } catch { return s; }
    }

    // ── Column filter (text search) ──────────────────────────
    function filterRptTable(tableId, q, colIdxs) {
      const tbody = document.querySelector('#' + tableId + ' tbody');
      if (!tbody) return;
      const ql = (q || '').toLowerCase().trim();
      tbody.querySelectorAll('tr').forEach(row => {
        if (row.querySelector('.rpt-loading')) return;
        const match = !ql || colIdxs.some(ci => {
          const cell = row.cells[ci];
          return cell && cell.textContent.toLowerCase().includes(ql);
        });
        row.classList.toggle('rpt-row-hidden', !match);
      });
    }

    // ── Select filter ────────────────────────────────────────
    function filterRptTableSelect(tableId, val, colIdx) {
      const tbody = document.querySelector('#' + tableId + ' tbody');
      if (!tbody) return;
      const vl = (val || '').toLowerCase().trim();
      tbody.querySelectorAll('tr').forEach(row => {
        if (row.querySelector('.rpt-loading')) return;
        const cell = row.cells[colIdx];
        const match = !vl || (cell && cell.textContent.toLowerCase().includes(vl));
        row.classList.toggle('rpt-row-hidden', !match);
      });
    }

    // ── CSV Export ───────────────────────────────────────────
    function exportRptCsv(tableId, filename) {
      const table = document.getElementById(tableId);
      if (!table) return;
      let csv = '';
      table.querySelectorAll('tr').forEach(row => {
        if (row.classList.contains('rpt-row-hidden')) return;
        const cells = Array.from(row.querySelectorAll('th,td'));
        csv += cells.map(c => '"' + c.textContent.replace(/"/g,'""').trim() + '"').join(',') + '\n';
      });
      const blob = new Blob([csv], { type: 'text/csv' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename + '_' + new Date().toISOString().slice(0,10) + '.csv';
      a.click();
    }

    // ── Sortable columns ─────────────────────────────────────
    function initRptSort(tableId) {
      const table = document.getElementById(tableId);
      if (!table) return;
      table.querySelectorAll('thead th').forEach((th, idx) => {
        th._sortDir = 1;
        th.addEventListener('click', () => {
          const tbody = table.querySelector('tbody');
          const rows  = Array.from(tbody.querySelectorAll('tr:not(.rpt-row-hidden)'));
          rows.sort((a, b) => {
            const av = (a.cells[idx] || {}).textContent || '';
            const bv = (b.cells[idx] || {}).textContent || '';
            const an = parseFloat(av), bn = parseFloat(bv);
            if (!isNaN(an) && !isNaN(bn)) return (an - bn) * th._sortDir;
            return av.localeCompare(bv) * th._sortDir;
          });
          th._sortDir *= -1;
          rows.forEach(r => tbody.appendChild(r));
        });
      });
    }

    // ════════════════════════════════════════════════════════
    //  1. FT MACHINE REGISTER
    // ════════════════════════════════════════════════════════
    async function loadRptMachineReg() {
      const tbody = document.getElementById('mr2-tbody');
      if (tbody) tbody.innerHTML = rptEmpty(10, 'Loading…');
      try {
        const filters = {
          region:           document.getElementById('mr2-region')?.value || '',
          customer:         document.getElementById('mr2-customer')?.value || '',
          model:            document.getElementById('mr2-model')?.value || '',
          warranty_status:  document.getElementById('mr2-warranty-filter')?.value || '',
          status:           document.getElementById('mr2-status-filter')?.value || '',
        };
        const res = await callFrappe(
          '/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.get_ft_machine_register',
          filters, 'GET');
        const machines = (res?.message?.data) || (Array.isArray(res?.message) ? res.message : []);
        if (!machines.length) { tbody.innerHTML = rptEmpty(10); return; }

        // KPIs
        let active=0, maint=0, warranty=0;
        machines.forEach(m => {
          if (m.status === 'Active') active++;
          if (m.status === 'Under Maintenance') maint++;
          if (m.warranty_status === 'Under Warranty') warranty++;
        });
        document.getElementById('mr2-total').textContent    = machines.length;
        document.getElementById('mr2-active').textContent   = active;
        document.getElementById('mr2-maint').textContent    = maint;
        document.getElementById('mr2-warranty').textContent = warranty;

        const statusBadge = s => {
          if (s === 'Active') return rptBadge(s, 'green');
          if (s === 'Under Maintenance') return rptBadge('Maint.', 'yellow');
          if (s === 'Inactive') return rptBadge(s, 'gray');
          return rptBadge(s, 'gray');
        };
        const wBadge = w => {
          if (w === 'Under Warranty') return rptBadge(w, 'green');
          if (w === 'Out of Warranty') return rptBadge('Out', 'red');
          return rptBadge(w || '—', 'gray');
        };

        tbody.innerHTML = machines.map(m => `
          <tr>
            <td><strong>${m.mxg_fleet_no || '—'}</strong>${m.fleet_no ? '<br><span style="font-size:10px;color:#94a3b8;">Ref: '+m.fleet_no+'</span>':''}</td>
            <td>${m.customer || '—'}</td>
            <td>${m.model || '—'}</td>
            <td style="font-family:monospace;font-size:11px;">${m.name || '—'}</td>
            <td style="text-align:right;font-weight:600;">${m.current_hmr || '—'}</td>
            <td>${m.location || '—'}</td>
            <td>${m.region || '—'}</td>
            <td>${statusBadge(m.status)}</td>
            <td>${wBadge(m.warranty_status)}${m.warranty_expiry?'<br><span style="font-size:10px;color:#94a3b8;">Exp: '+fmtDate(m.warranty_expiry)+'</span>':''}</td>
            <td>${fmtDate(m.commission_date)}</td>
          </tr>`).join('');
        initRptSort('mr2-table');
      } catch(e) {
        if (tbody) tbody.innerHTML = rptError(10, e.message);
      }
    }

    // ════════════════════════════════════════════════════════
    //  2. MACHINES DUE FOR SERVICE
    // ════════════════════════════════════════════════════════
    async function loadRptDueService() {
      const tbody = document.getElementById('ds-tbody');
      if (tbody) tbody.innerHTML = rptEmpty(10, 'Loading…');
      try {
        const filters = { region: document.getElementById('ds-region')?.value || '' };
        const res = await callFrappe(
          '/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.get_ft_machine_register',
          filters, 'GET');
        const all = (res?.message?.data) || [];
        const SERVICE_INTERVAL = 500;
        const WARN_THRESHOLD   = 500;

        const machines = all
          .map(m => {
            const cur  = parseFloat(m.current_hmr)    || 0;
            const last = parseFloat(m.last_service_hmr) || 0;
            const next = last + SERVICE_INTERVAL;
            const diff = next - cur;
            return { ...m, cur, last, next, diff };
          })
          .filter(m => m.diff <= WARN_THRESHOLD)
          .sort((a, b) => a.diff - b.diff);

        if (!machines.length) { tbody.innerHTML = rptEmpty(10, 'No machines due for service'); return; }

        let overdue=0, soon=0;
        machines.forEach(m => { if (m.diff <= 0) overdue++; else soon++; });
        document.getElementById('ds-overdue').textContent = overdue;
        document.getElementById('ds-soon').textContent    = soon;
        document.getElementById('ds-total').textContent   = machines.length;

        tbody.innerHTML = machines.map(m => {
          const isOverdue = m.diff <= 0;
          const badge = isOverdue
            ? rptBadge('OVERDUE', 'red')
            : rptBadge('Due Soon', 'yellow');
          return `<tr data-urgency="${isOverdue?'overdue':'soon'}">
            <td><strong>${m.mxg_fleet_no || '—'}</strong></td>
            <td>${m.customer || '—'}</td>
            <td>${m.model || '—'}</td>
            <td style="font-family:monospace;font-size:11px;">${m.name || '—'}</td>
            <td>${m.region || '—'}</td>
            <td style="font-weight:700;${isOverdue?'color:#b91c1c':''}">${m.cur}</td>
            <td>${m.last || '—'}</td>
            <td>500 HMR</td>
            <td>${m.next}</td>
            <td>${badge} <span style="font-size:10px;color:${isOverdue?'#b91c1c':'#a16207'};font-weight:700;">${Math.abs(Math.round(m.diff))} HMR ${isOverdue?'overdue':'remaining'}</span></td>
          </tr>`;
        }).join('');
        initRptSort('ds-table');
      } catch(e) {
        if (tbody) tbody.innerHTML = rptError(10, e.message);
      }
    }

    function filterDsUrgency(val) {
      document.querySelectorAll('#ds-tbody tr').forEach(row => {
        if (row.querySelector('.rpt-loading')) return;
        const urg = row.dataset.urgency || '';
        row.classList.toggle('rpt-row-hidden', val !== '' && urg !== val);
      });
    }

    // ════════════════════════════════════════════════════════
    //  3. GENERAL DEFECTS REPORT (GDR)
    // ════════════════════════════════════════════════════════
    // Warranty pill for GDR rows
    function _gdrWtyPill(ws) {
      const w=(ws||'').toLowerCase();
      if(w.includes('under')||w==='in warranty') return `<span style="font-size:9px;font-weight:700;padding:2px 8px;border-radius:99px;background:#dcfce7;color:#15803d;white-space:nowrap;">${ws}</span>`;
      if(w.includes('fringe')||w.includes('expir')) return `<span style="font-size:9px;font-weight:700;padding:2px 8px;border-radius:99px;background:#fef9c3;color:#a16207;white-space:nowrap;">${ws}</span>`;
      if(w.includes('out')||w.includes('expired')) return `<span style="font-size:9px;font-weight:700;padding:2px 8px;border-radius:99px;background:#fee2e2;color:#b91c1c;white-space:nowrap;">${ws}</span>`;
      return ws?`<span style="font-size:9px;color:#94a3b8;">${ws}</span>`:'\u2014';
    }

    async function loadRptGdr() {
      const tbody = document.getElementById('gdr-tbody');
      if (tbody) tbody.innerHTML = rptEmpty(10, 'Loading\u2026');
      try {
        const GDR_URL = '/api/method/mxg_fleet_track.omnis_dashboard.ft_defects_dashboard.get_ft_defect_summary';
        const res  = await callFrappe(GDR_URL, {});
        const msg  = res?.message || res || {};
        const rows = Array.isArray(msg.rows)?msg.rows:Array.isArray(msg.data)?msg.data:Array.isArray(msg)?msg:[];

        if (!rows.length) {
          tbody.innerHTML = rptEmpty(10, 'No defects found');
          ['gdr-open','gdr-progress','gdr-closed'].forEach(id=>{const e=document.getElementById(id);if(e)e.textContent=0;});
          return;
        }
        let open=0,prog=0,closed=0;
        rows.forEach(r=>{const s=(r.status||'').toLowerCase();if(s==='open')open++;else if(s==='in progress'||s==='in-progress')prog++;else if(s==='closed'||s==='resolved')closed++;});
        document.getElementById('gdr-open').textContent=open;
        document.getElementById('gdr-progress').textContent=prog;
        document.getElementById('gdr-closed').textContent=closed;

        // Keep global in sync so Machine Lookup can use fresh data
        if (typeof FT_DEFECTS_DATA !== 'undefined') window.FT_DEFECTS_DATA = rows;
        else window.FT_DEFECTS_DATA = rows;

        const priBadge=p=>{const pc=(p||'').toLowerCase();if(pc==='critical')return rptBadge(p,'red');if(pc==='high')return rptBadge(p,'yellow');if(pc==='medium')return rptBadge(p,'blue');return rptBadge(p||'Low','gray');};
        const stBadge=s=>{const sc=(s||'').toLowerCase();if(sc==='open')return rptBadge(s,'red');if(sc.includes('progress'))return rptBadge('In Progress','yellow');if(sc==='closed'||sc==='resolved')return rptBadge(s,'green');return rptBadge(s||'\u2014','gray');};

        const today=new Date();
        tbody.innerHTML=rows.map(r=>{
          const desc=r.description?r.description.slice(0,80)+(r.description.length>80?'\u2026':''):'\u2014';
          const machine=r.machine||'\u2014',cust=r.customer||'\u2014',tech=r.technician||r.oem||'\u2014';
          const dateStr=r.start_date||r.creation||null;
          const days=dateStr?Math.round((today-new Date(dateStr))/86400000):'\u2014';
          const mSafe=(r.machine||'').replace(/'/g,"\\'");
          return `<tr>
            <td style="font-family:monospace;font-size:11px;font-weight:700;">${machine}</td>
            <td>${cust}</td>
            <td>${_gdrWtyPill(r.warranty_status)}</td>
            <td title="${(r.description||'').replace(/"/g,'&quot;')}">${desc}</td>
            <td>${priBadge(r.priority||'Low')}</td>
            <td>${stBadge(r.status||'Open')}</td>
            <td>${tech}</td>
            <td>${fmtDate(dateStr)}</td>
            <td style="font-weight:700;${typeof days==='number'&&days>7?'color:#b91c1c':''}">${days}</td>
            <td style="text-align:center;"><button onclick="openDefectModal(null,'${mSafe}')" style="background:#b91c1c;color:#fff;border:none;border-radius:6px;padding:3px 9px;font-size:11px;font-weight:700;cursor:pointer;" onmouseover="this.style.opacity='.8'" onmouseout="this.style.opacity='1'">+ Log</button></td>
          </tr>`;
        }).join('');
        initRptSort('gdr-table');
      } catch(e) {
        console.error('[GDR]',e);
        if(tbody)tbody.innerHTML=rptError(10,e.message);
      }
    }

    // ════════════════════════════════════════════════════════
    //  4. SERVICE TRACKING SUMMARY (STS / STR)
    // ════════════════════════════════════════════════════════
    let _stsAllRows = [];
    let _stsSortCol = 'hrsRemaining';
    let _stsSortAsc = true;

    function sortStsTable(colKey) {
        if (_stsSortCol === colKey) {
            _stsSortAsc = !_stsSortAsc;
        } else {
            _stsSortCol = colKey;
            _stsSortAsc = true;
        }
        filterStsTable();
    }

    async function loadRptSts() {
      const tbody = document.getElementById('sts-tbody');
      if (tbody) tbody.innerHTML = '<tr><td colspan="8" class="rpt-loading">Loading…</td></tr>';
      try {
        const filters = {
          region:   document.getElementById('sts-region')?.value  || '',
          customer: document.getElementById('sts-customer')?.value || '',
          model:    document.getElementById('sts-model')?.value   || '',
        };
        const res = await callFrappe(
          '/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.get_ft_machine_register',
          filters, 'GET');
        const raw = res?.message?.data ?? (Array.isArray(res?.message) ? res.message : []);

        let modelsDict = {};
        try {
          const modelRes = await callFrappe(
            '/api/resource/FT%20Machine%20Model',
            { fields: '["*"]', limit_page_length: 2000 },
            'GET'
          );
          if (modelRes && modelRes.data) {
            modelRes.data.forEach(mdl => { 
              modelsDict[mdl.name] = mdl; 
              if (mdl.model) modelsDict[mdl.model] = mdl;
            });
          }
        } catch(e) { console.warn("Could not fetch machine models", e); }

        raw.forEach(m => {
          if (m.model && modelsDict[m.model]) {
            m.model_data = modelsDict[m.model];
          }
        });

        _stsAllRows = raw;

        // Populate region filter
        const regionSel = document.getElementById('sts-region');
        if (regionSel && regionSel.options.length <= 1) {
          const regions = [...new Set(raw.map(m => m.region).filter(Boolean))].sort();
          regionSel.innerHTML = '<option value="">All Regions</option>' +
            regions.map(r => `<option value="${r}">${r}</option>`).join('');
        }

        filterStsTable();
      } catch (e) {
        console.error('[STS] load error', e);
        if (tbody) tbody.innerHTML = '<tr><td colspan="8" class="rpt-loading" style="color:#ef4444;">Error loading data — check connection.</td></tr>';
      }
    }

    function renderStsTable(rows) {
      const tbody = document.getElementById('sts-tbody');
      if (!tbody) return;
      if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="rpt-loading" style="color:#94a3b8;">No machines found.</td></tr>';
        document.getElementById('sts-overdue').textContent = '0';
        document.getElementById('sts-approaching').textContent = '0';
        return;
      }
      
      const now = new Date();
      let overdueCount = 0;
      let approachingCount = 0;

      const enrichedRows = rows.map(m => {
        const mData = m.model_data || {};
        
        let mInterval = mData.si_hours || mData.service_interval_hours || m.service_interval_hours;
        if (!mInterval) mInterval = 250;
        let isType = mInterval + 'H';
        
        const currentHmr = Number(m.current_hmr || 0);
        const lastSrvHmr = Number(m.last_service_hmr || 0);
        let nextSrvHmr = Number(m.next_service_hmr || 0);
        
        if (nextSrvHmr === 0) {
            nextSrvHmr = lastSrvHmr > 0 ? (lastSrvHmr + Number(mInterval)) : Number(mInterval);
        }
        
        const hrsRemaining = nextSrvHmr - currentHmr;
        
        const lastDateVal = m.last_service_date;
        const lastServiceStr = lastDateVal ? new Date(lastDateVal.split(" ")[0]).toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'}) : '—';
        
        const lastHmrDateVal = m.last_hmr_date || m.modified;
        const lastHmrDateObj = lastHmrDateVal ? new Date(lastHmrDateVal.split(" ")[0]) : null;
        const lastHmrStr = lastHmrDateObj ? lastHmrDateObj.toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'}) : '—';

        const daysSinceHmr = lastHmrDateObj ? Math.round((now - lastHmrDateObj) / (1000 * 60 * 60 * 24)) : 999;
        
        const isApproaching = hrsRemaining <= 50 && hrsRemaining > 0;
        const isOverdue = hrsRemaining <= 0;
        
        const maxStaleDays = isApproaching ? 1 : 5;
        const isStale = daysSinceHmr > maxStaleDays && daysSinceHmr !== 999;
        
        let estimatedHmr = currentHmr;
        let likelyOverdue = false;
        
        if (isStale) {
            let daysSinceHandover = 999;
            if (m.handover_date) {
                const hoDate = new Date(m.handover_date.split(" ")[0]);
                daysSinceHandover = Math.max(1, Math.round((now - hoDate) / 86400000));
            } else if (m.creation) {
                const crDate = new Date(m.creation.split(" ")[0]);
                daysSinceHandover = Math.max(1, Math.round((now - crDate) / 86400000));
            }
            
            const avgDailyHmr = currentHmr / daysSinceHandover;
            estimatedHmr = currentHmr + (daysSinceHmr * avgDailyHmr);
            
            if (estimatedHmr >= nextSrvHmr && !isOverdue) {
                likelyOverdue = true;
            }
        }
        
        if (isOverdue || likelyOverdue) overdueCount++;
        if (isApproaching && !likelyOverdue) approachingCount++;

        return { 
          m, isType, lastServiceStr, currentHmr, nextSrvHmr, hrsRemaining, lastHmrStr, isStale, likelyOverdue, estimatedHmr, isOverdue, isApproaching
        };
      });

      document.getElementById('sts-overdue').textContent = overdueCount;
      document.getElementById('sts-approaching').textContent = approachingCount;

      enrichedRows.sort((a, b) => {
         let valA, valB;
         if (_stsSortCol === 'hrsRemaining') {
             valA = a.hrsRemaining; valB = b.hrsRemaining;
         } else if (_stsSortCol === 'hmr') {
             valA = a.currentHmr; valB = b.currentHmr;
         } else if (_stsSortCol === 'nextHmr') {
             valA = a.nextSrvHmr; valB = b.nextSrvHmr;
         } else if (_stsSortCol === 'lastUpdate') {
             valA = a.m.last_hmr_date || ''; valB = b.m.last_hmr_date || '';
         } else {
             valA = (a.m[_stsSortCol] || '').toString().toLowerCase();
             valB = (b.m[_stsSortCol] || '').toString().toLowerCase();
         }
         
         if (valA < valB) return _stsSortAsc ? -1 : 1;
         if (valA > valB) return _stsSortAsc ? 1 : -1;
         return 0;
      });

      tbody.innerHTML = enrichedRows.map(obj => {
         const { m, isType, lastServiceStr, currentHmr, nextSrvHmr, hrsRemaining, lastHmrStr, isStale, likelyOverdue, isOverdue, isApproaching } = obj;
         
         let hmrDisplay = currentHmr.toLocaleString();
         let warningIcon = '';
         
         if (likelyOverdue) {
             warningIcon = `<span title="Likely Overdue: HMR is stale and estimated usage (${Math.round(obj.estimatedHmr)}h) puts it over the next service target." style="cursor:help;color:#f59e0b;font-size:14px;margin-left:4px;">⚠️</span>`;
         }
         
         let hrsColour = '#0f172a';
         if (isOverdue || likelyOverdue) hrsColour = '#ef4444';
         else if (isApproaching) hrsColour = '#f59e0b';
         
         let dateColour = isStale ? '#ef4444' : '#475569';
         let dateWarning = isStale ? `<br><span style="font-size:10px;color:#ef4444;font-weight:600;">Stale (>&nbsp;${isApproaching ? 1 : 5}d)</span>` : '';

         return `<tr>
          <td style="font-weight:600;color:#0f172a;">${m.customer || '—'}</td>
          <td>
            <div style="font-weight:700;color:#0f172a;">${m.model || '—'}</div>
            <div style="font-size:11px;color:#64748b;margin-top:2px;">${m.name || '—'} | SN: ${m.sn || '—'}</div>
          </td>
          <td style="font-weight:500;">${isType}</td>
          <td style="font-weight:500;color:#0f172a;">${lastServiceStr}</td>
          <td style="text-align:right;font-weight:700;color:#0f172a;">${hmrDisplay}${warningIcon}</td>
          <td style="text-align:right;font-weight:700;color:#475569;">${nextSrvHmr.toLocaleString()}</td>
          <td style="text-align:right;font-weight:800;color:${hrsColour};">${hrsRemaining.toLocaleString()}</td>
          <td style="color:${dateColour};font-weight:${isStale?'700':'400'};">${lastHmrStr}${dateWarning}</td>
        </tr>`;
      }).join('');
    }

    function filterStsTable() {
      const region    = (document.getElementById('sts-region')?.value    || '').toLowerCase();
      const customer  = (document.getElementById('sts-customer')?.value  || '').toLowerCase();
      const model     = (document.getElementById('sts-model')?.value     || '').toLowerCase();
      const fleetrack = (document.getElementById('sts-fleetrack')?.value || '');
      
      const filtered = _stsAllRows.filter(m => {
        const ftVal = (m.fleetrack_managed || '').trim();
        const ftMatch = !fleetrack || ftVal.toLowerCase() === fleetrack.toLowerCase();
        return (
          ftMatch &&
          (!region   || (m.region   || '').toLowerCase().includes(region))   &&
          (!customer || (m.customer || '').toLowerCase().includes(customer)) &&
          (!model    || (m.model    || '').toLowerCase().includes(model))
        );
      });
      renderStsTable(filtered);
    }


    // ════════════════════════════════════════════════════════
    //  6. MAINTENANCE WARNING REPORT (MWR)
    // ════════════════════════════════════════════════════════
    async function loadRptMwr() {
      const tbody = document.getElementById('mwr-tbody');
      if (tbody) tbody.innerHTML = rptEmpty(9, 'Loading…');
      try {
        const filters = { region: document.getElementById('mwr-region')?.value || '' };
        const res = await callFrappe(
          '/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.get_ft_machine_register',
          filters, 'GET');
        // API returns { message: { data: [...] } } OR { message: [...] }
        const all = res?.message?.data || (Array.isArray(res?.message) ? res.message : []);

        const CRITICAL_HMR = 5000;  // HMR above which machine is in critical need of service
        const WARNING_HMR  = 2500;  // HMR above which machine needs attention

        // Show machines with high current HMR (no last_service_hmr field available)
        // OR show all machines sorted by HMR descending
        const withHmr = all
          .map(m => {
            const cur  = parseFloat(m.current_hmr)      || 0;
            const last = parseFloat(m.last_service_hmr) || 0;
            // If we have last_service_hmr, use HMR since last service
            // Otherwise use current HMR as the warning metric
            const since = last > 0 ? cur - last : cur;
            return { ...m, cur, last, since };
          })
          .filter(m => m.cur > 0)  // only machines with known HMR
          .sort((a, b) => b.since - a.since)
          .slice(0, 200);  // Top 200 by HMR/since-service

        if (!withHmr.length) {
          tbody.innerHTML = rptEmpty(9, 'No machine HMR data available');
          document.getElementById('mwr-critical').textContent = 0;
          document.getElementById('mwr-warning').textContent  = 0;
          document.getElementById('mwr-total').textContent    = 0;
          return;
        }

        let critical=0, warning=0;
        withHmr.forEach(m => {
          if (m.cur >= CRITICAL_HMR) critical++;
          else if (m.cur >= WARNING_HMR) warning++;
        });
        document.getElementById('mwr-critical').textContent = critical;
        document.getElementById('mwr-warning').textContent  = warning;
        document.getElementById('mwr-total').textContent    = withHmr.length;

        window.MWR_DATA = withHmr;
        renderMwrTable();
      } catch(e) {
        console.error('[MWR]', e);
        if (tbody) tbody.innerHTML = rptError(9, e.message);
      }
    }

    function renderMwrTable() {
      const tbody = document.getElementById('mwr-tbody');
      if (!tbody) return;
      if (!window.MWR_DATA) return;
      
      const customer = document.getElementById('mwr-customer')?.value.toLowerCase() || '';
      const ifn = document.getElementById('mwr-ifn')?.value.toLowerCase() || '';
      const cfn = document.getElementById('mwr-cfn')?.value.toLowerCase() || '';
      const groupByCust = document.getElementById('mwr-group-cust')?.checked;
      
      let filtered = window.MWR_DATA.filter(m => {
        const rowCust = (m.customer || '').toLowerCase();
        const rowIfn = (m.mxg_fleet_no || '').toLowerCase();
        const rowCfn = (m.fleet_no || '').toLowerCase();
        
        const matchCust = !customer || rowCust.includes(customer);
        const matchIfn = !ifn || rowIfn.includes(ifn);
        const matchCfn = !cfn || rowCfn.includes(cfn);
        
        return matchCust && matchIfn && matchCfn;
      });
      
      if (groupByCust) {
        filtered.sort((a, b) => {
          const custA = (a.customer || 'Unknown').toLowerCase();
          const custB = (b.customer || 'Unknown').toLowerCase();
          if (custA < custB) return -1;
          if (custA > custB) return 1;
          return b.since - a.since;
        });
      }
      
      const customerRowSpans = {};
      if (groupByCust) {
        let i = 0;
        while (i < filtered.length) {
          const cust = filtered[i].customer || "Unknown";
          let count = 1;
          for (let j = i + 1; j < filtered.length; j++) {
            if ((filtered[j].customer || "Unknown") === cust) count++;
            else break;
          }
          customerRowSpans[i] = count;
          for (let k = i + 1; k < i + count; k++) customerRowSpans[k] = 0;
          i += count;
        }
      }
      
      let html = '';
      const CRITICAL_HMR = 5000;
      const WARNING_HMR  = 2500;

      filtered.forEach((m, idx) => {
        const isCrit  = m.cur >= CRITICAL_HMR;
        const isWarn  = m.cur >= WARNING_HMR;
        const badge   = isCrit ? rptBadge('HIGH HMR','red')
                      : isWarn ? rptBadge('MONITOR','yellow')
                      : rptBadge('OK','green');
        const sinceLabel = m.last > 0
          ? `${Math.round(m.since)} HMR since svc`
          : `${Math.round(m.cur)} HMR total`;
          
        let custCell = "";
        const cName = safeText(m.customer || "Unknown");
        if (groupByCust) {
          if (customerRowSpans[idx] > 0) {
            custCell = `<td rowspan="${customerRowSpans[idx]}" style="padding:12px 16px; vertical-align:middle; background:#f8fafc; word-wrap:break-word; border-bottom:1px solid #e5e7eb; border-right:1px solid #e5e7eb;">
              <div style="font-weight:800;color:#0f172a;font-size:11px;line-height:1.2;">${cName}</div>
              <div style="font-size:9px; color:#64748b; margin-top:4px; font-weight:600;">${customerRowSpans[idx]} Machines</div>
            </td>`;
          }
        } else {
          custCell = `<td><strong>${cName}</strong></td>`;
        }
        
        html += `<tr>
          ${custCell}
          <td>
            <div style="font-weight:700;">${m.model||'—'}</div>
            <div style="font-size:11px;color:#94a3b8;margin-top:2px;font-family:monospace;">SN: ${m.name||'—'}${m.mxg_fleet_no ? ` | IFN: ${m.mxg_fleet_no}` : ''}${m.fleet_no ? ` | CFN: ${m.fleet_no}` : ''}</div>
          </td>
          <td>${m.region||'—'}</td>
          <td style="font-weight:700;${isCrit?'color:#b91c1c':isWarn?'color:#a16207':''}">${m.cur}</td>
          <td>${m.last > 0 ? m.last : '—'}</td>
          <td style="font-weight:600;">${sinceLabel}</td>
          <td>${badge}</td>
        </tr>`;
      });
      
      if (!filtered.length) {
         html = `<tr><td colspan="7" style="text-align:center; padding:20px; color:#64748b;">No matching machines found.</td></tr>`;
      }
      
      tbody.innerHTML = html;
      initRptSort('mwr-table');
    }

    // ════════════════════════════════════════════════════════
    //  7. WEEKLY WARRANTY UPDATE (WWU)
    // ════════════════════════════════════════════════════════
    async function loadRptWwu() {
      const tbody = document.getElementById('wwu-tbody');
      if (tbody) tbody.innerHTML = rptEmpty(9, 'Loading…');
      try {
        const filters = { region: document.getElementById('wwu-region')?.value || '' };
        const res  = await callFrappe(
          '/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.get_ft_machine_register',
          filters, 'GET');
        // Support both response shapes
        const all  = res?.message?.data || (Array.isArray(res?.message) ? res.message : []);
        // Show ALL machines — warranty_status may be empty string, show as 'Unknown'
        const rows = all.filter(m => m.name); // any machine with a serial number

        window.FT_WWU_DATA = rows;
        renderWwuTable();
        initRptSort('wwu-table');
      } catch(e) {
        console.error('[WWU]', e);
        if (tbody) tbody.innerHTML = rptError(9, e.message);
      }
    }

    function renderWwuTable() {
      const tbody = document.getElementById('wwu-tbody');
      if (!tbody) return;
      
      let rows = window.FT_WWU_DATA || [];
      const search = (document.getElementById('wwu-search')?.value || '').toLowerCase();
      const statusFilter = (document.getElementById('wwu-status')?.value || '').toLowerCase();
      
      rows = rows.filter(m => {
        const cMatch = !search || (m.customer || '').toLowerCase().includes(search);
        const sMatch = !statusFilter || (m.warranty_status || '').toLowerCase() === statusFilter;
        return cMatch && sMatch;
      });

      if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:20px; color:#94a3b8;">No machines found</td></tr>';
        document.getElementById('wwu-active').textContent   = 0;
        document.getElementById('wwu-expired').textContent  = 0;
        document.getElementById('wwu-expiring').textContent = 0;
        return;
      }

      const today = new Date();
      let active=0, expired=0, expiring=0;
      rows.forEach(m => {
        const ws = (m.warranty_status||'').toLowerCase();
        if (ws === 'under warranty') {
          active++;
          const expiry = m.warranty_expiry ? new Date(m.warranty_expiry) : null;
          if (expiry && Math.round((expiry - today) / 86400000) < 90) expiring++;
        } else if (ws === 'out of warranty') {
          expired++;
        }
      });
      document.getElementById('wwu-active').textContent   = active;
      document.getElementById('wwu-expired').textContent  = expired;
      document.getElementById('wwu-expiring').textContent = expiring;

      const groupByCust = document.getElementById('wwu-group-cust')?.checked;
      if (groupByCust) {
        rows.sort((a,b) => (a.customer||'').localeCompare(b.customer||''));
      }

      const customerRowSpans = {};
      if (groupByCust) {
        let i = 0;
        while (i < rows.length) {
          const cust = rows[i].customer || 'Unknown Customer';
          let count = 1;
          for (let j = i + 1; j < rows.length; j++) {
            if ((rows[j].customer || 'Unknown Customer') === cust) count++;
            else break;
          }
          customerRowSpans[i] = count;
          for (let k = i + 1; k < i + count; k++) customerRowSpans[k] = 0;
          i += count;
        }
      }

      tbody.innerHTML = rows.map((m, idx) => {
        const ws     = (m.warranty_status || '').toLowerCase();
        const expiry = m.warranty_expiry ? new Date(m.warranty_expiry) : null;
        const daysLeft = expiry ? Math.round((expiry - today) / 86400000) : null;

        const wBadge = ws === 'under warranty'   ? rptBadge('Under Warranty','green')
                     : ws === 'out of warranty'  ? rptBadge('Out of Warranty','red')
                     : rptBadge(m.warranty_status || 'Unknown','gray');

        const daysCell = daysLeft !== null
          ? `<span style="font-weight:700;color:${daysLeft<0?'#b91c1c':daysLeft<90?'#a16207':'#15803d'};">
              ${daysLeft<0 ? Math.abs(daysLeft)+' days ago' : daysLeft+' days'}
             </span>`
          : '<span style="color:#94a3b8;">—</span>';

        const cName = m.customer || '—';
        let custCell = "";
        if (groupByCust) {
          if (customerRowSpans[idx] > 0) {
            custCell = `<td rowspan="${customerRowSpans[idx]}" style="padding:10px 16px; font-weight:700; color:#0f172a; font-size:12px; border-right:1px solid #e2e8f0; vertical-align:middle; text-align:center; background:#f8fafc;">${cName}</td>`;
          }
        } else {
          custCell = `<td style="padding:10px 16px; font-weight:700; color:#0f172a; font-size:12px; vertical-align:middle; text-align:center;">${cName}</td>`;
        }

        return `<tr>
          ${custCell}
          <td style="font-family:monospace;font-size:11px;">${m.name||'—'}</td>
          <td>${m.model||'—'}</td>
          <td>${m.region||'—'}</td>
          <td>${wBadge}</td>
          <td>${m.warranty_type||'—'}</td>
          <td>${fmtDate(m.commission_date)}</td>
          <td>${fmtDate(m.warranty_expiry)}</td>
          <td>${daysCell}</td>
        </tr>`;
      }).join('');
    }

    function printWwu() {
      const wwuVisible = !document.getElementById('view-rpt-wwu').classList.contains('hidden');
      if (!wwuVisible) {
        showToast("Please open the WWU view first.", "warn");
        return;
      }
      
      let rows = window.FT_WWU_DATA || [];
      const search = (document.getElementById('wwu-search')?.value || '').toLowerCase();
      const statusFilter = (document.getElementById('wwu-status')?.value || '').toLowerCase();
      
      rows = rows.filter(m => {
        const cMatch = !search || (m.customer || '').toLowerCase().includes(search);
        const sMatch = !statusFilter || (m.warranty_status || '').toLowerCase() === statusFilter;
        return cMatch && sMatch;
      });

      if (rows.length === 0) {
        showToast("No data to print.", "warn");
        return;
      }

      const groupByCust = document.getElementById('wwu-group-cust')?.checked;
      if (groupByCust) {
          rows = [...rows].sort((a,b) => (a.customer||'').localeCompare(b.customer||''));
      }

      const customerRowSpans = {};
      if (groupByCust) {
        let i = 0;
        while (i < rows.length) {
          const cust = rows[i].customer || 'Unknown Customer';
          let count = 1;
          for (let j = i + 1; j < rows.length; j++) {
            if ((rows[j].customer || 'Unknown Customer') === cust) count++;
            else break;
          }
          customerRowSpans[i] = count;
          for (let k = i + 1; k < i + count; k++) customerRowSpans[k] = 0;
          i += count;
        }
      }

      const userName = localStorage.getItem('ft_user_name') || 'Administrator';
      const todayDate = new Date().toLocaleDateString('en-GB'); // DD/MM/YYYY
      const today = new Date();

      let html = `
<!DOCTYPE html>
<html>
<head>
  <title>Weekly Warranty Update (WWU)</title>
  <style>
    body { font-family: sans-serif; font-size: 11px; color: #1e293b; padding: 20px; }
    .header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px; border-bottom: 1px solid #cbd5e1; padding-bottom: 10px; }
    .logo-container { display:flex; flex-direction:column; gap:4px; }
    .title-block { text-align: right; display:flex; flex-direction:column; gap:10px; align-items:flex-end; }
    .title { font-size: 18px; font-weight: 400; color: #000; }
    .eff-pill { background: #000; color: #fff; padding: 4px; font-weight: bold; font-size: 10px; display: flex; border:1px solid #000; }
    .eff-pill span { background: #fff; color: #000; padding: 2px 6px; margin-left: 4px; }
    .meta-table { width: 300px; margin-bottom: 20px; font-size: 11px; color: #64748b; }
    .meta-table td { padding: 4px 0; }
    .meta-table strong { color: #1e293b; font-weight: 400; }
    table.dbr-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    .dbr-table th, .dbr-table td { border-bottom: 1px solid #cbd5e1; padding: 8px 6px; vertical-align: top; text-align: left; }
    .dbr-table th { background: #E53935; color: #fff; font-weight: bold; border: none; font-size:11px; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; padding: 0; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo-container">
      <img src="${window.location.origin}${window.location.pathname.replace('index.html', '')}../../assets/images/omnis-logo.png" style="height:35px;" onerror="this.style.display='none'" />
      <img src="${window.location.origin}${window.location.pathname.replace('index.html', '')}../../assets/images/fleetrack-logo.png" style="height:15px;" onerror="this.style.display='none'" />
    </div>
    <div class="title-block">
      <div class="title">Weekly Warranty Update (WWU)</div>
      <div class="eff-pill">% Efficiency <span>100.0%</span></div>
    </div>
  </div>
  <table class="meta-table">
    <tr><td style="color:#94a3b8;">Prepared<br>by</td><td><strong>${userName}</strong></td></tr>
    <tr><td style="color:#94a3b8;">Date</td><td><strong>${todayDate}</strong></td></tr>
  </table>
  <table class="dbr-table">
    <thead>
      <tr>
        <th>Customer</th>
        <th>Serial No</th>
        <th>Model</th>
        <th>Region</th>
        <th>Warranty Status</th>
        <th>Warranty Type</th>
        <th>Handover Date</th>
        <th>Expiry Date</th>
        <th>Days Remaining</th>
      </tr>
    </thead>
    <tbody>
`;

      rows.forEach((m, idx) => {
        const ws = (m.warranty_status || '').toLowerCase();
        const expiry = m.warranty_expiry ? new Date(m.warranty_expiry) : null;
        const daysLeft = expiry ? Math.round((expiry - today) / 86400000) : null;
        
        let daysHtml = "—";
        if (daysLeft !== null) {
            daysHtml = `<span style="font-weight:700;color:${daysLeft<0?'#b91c1c':daysLeft<90?'#a16207':'#15803d'};">${daysLeft<0 ? Math.abs(daysLeft)+' days ago' : daysLeft+' days'}</span>`;
        }

        const customer = m.customer || "—";
        let custHtml = "";
        if (groupByCust) {
          if (customerRowSpans[idx] > 0) {
            custHtml = `<td rowspan="${customerRowSpans[idx]}" style="vertical-align:middle; text-align:center; border-right:1px solid #cbd5e1;">${safeText(customer)}</td>`;
          }
        } else {
            custHtml = `<td style="vertical-align:middle; text-align:center;">${safeText(customer)}</td>`;
        }

        html += `<tr>
          ${custHtml}
          <td>${safeText(m.name||'—')}</td>
          <td>${safeText(m.model||'—')}</td>
          <td>${safeText(m.region||'—')}</td>
          <td>${safeText(m.warranty_status||'Unknown')}</td>
          <td>${safeText(m.warranty_type||'—')}</td>
          <td>${fmtDate(m.commission_date)}</td>
          <td>${fmtDate(m.warranty_expiry)}</td>
          <td>${daysHtml}</td>
        </tr>`;
      });

      html += `
    </tbody>
  </table>
</body>
</html>
`;

      const printWin = window.open('', '_blank');
      printWin.document.write(html);
      printWin.document.close();
      printWin.focus();
      setTimeout(() => {
        printWin.print();
        printWin.close();
      }, 500);
    }

    // ════════════════════════════════════════════════════════
    //  END NATIVE REPORT ENGINE

    // ════════════════════════════════════════════════════════

    
    // ── Initial Service Report (ISR) ─────────────────────────────────────
    let _isrAllRows = [];
    let _isrSortCol = 'hrsRemaining'; // Default sorting
    let _isrSortAsc = true;           // Default sorting

    function sortIsrTable(colKey) {
        if (_isrSortCol === colKey) {
            _isrSortAsc = !_isrSortAsc;
        } else {
            _isrSortCol = colKey;
            _isrSortAsc = true;
        }
        filterIsrTable(); // re-evaluates the array and re-renders
    }

    async function loadRptIsr() {
      const tbody = document.getElementById('isr-tbody');
      if (tbody) tbody.innerHTML = '<tr><td colspan="9" class="rpt-loading">Loading…</td></tr>';
      try {
        const filters = {
          region:   document.getElementById('isr-region')?.value  || '',
          customer: document.getElementById('isr-customer')?.value || '',
          model:    document.getElementById('isr-model')?.value   || '',
        };
        const res = await callFrappe(
          '/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.get_ft_machine_register',
          filters, 'GET');
        const raw = res?.message?.data ?? (Array.isArray(res?.message) ? res.message : []);

        let modelsDict = {};
        try {
          const modelRes = await callFrappe(
            '/api/resource/FT%20Machine%20Model',
            { fields: '["*"]', limit_page_length: 2000 },
            'GET'
          );
          if (modelRes && modelRes.data) {
            modelRes.data.forEach(mdl => { 
              modelsDict[mdl.name] = mdl; 
              if (mdl.model) modelsDict[mdl.model] = mdl;
            });
          }
        } catch(e) { console.warn("Could not fetch machine models", e); }

        // ISR = machines where last_service_date AND last_service_hmr are both absent/zero
        const isr = raw.filter(m => {
          const noDate = !m.last_service_date || m.last_service_date === '';
          const noHmr  = !m.last_service_hmr  || Number(m.last_service_hmr) === 0;
          return noDate && noHmr;
        });

        isr.forEach(m => {
          if (m.model && modelsDict[m.model]) {
            m.model_data = modelsDict[m.model];
          }
        });

        _isrAllRows = isr;

        // Populate region filter
        const regionSel = document.getElementById('isr-region');
        if (regionSel) {
          const regions = [...new Set(isr.map(m => m.region).filter(Boolean))].sort();
          regionSel.innerHTML = '<option value="">All Regions</option>' +
            regions.map(r => `<option value="${r}">${r}</option>`).join('');
        }

        // KPIs
        const highHmr = isr.filter(m => Number(m.current_hmr) >= 500).length;
        const countEl = document.getElementById('isr-count');
        const hmrEl   = document.getElementById('isr-high-hmr');
        if (countEl) countEl.textContent = isr.length;
        if (hmrEl)   hmrEl.textContent   = highHmr;

        filterIsrTable();  // respects default Fleetrack=Yes
      } catch (e) {
        console.error('[ISR] load error', e);
        const tbody = document.getElementById('isr-tbody');
        if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="rpt-loading" style="color:#ef4444;">Error loading data — check connection.</td></tr>';
      }
    }

    function renderIsrTable(rows) {
      const tbody = document.getElementById('isr-tbody');
      if (!tbody) return;
      if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="rpt-loading" style="color:#22c55e;">✓ All machines have a recorded last service date.</td></tr>';
        return;
      }
      // Precompute values so we can sort dynamically
      const enrichedRows = rows.map(m => {
        const hmr = Number(m.current_hmr || 0);
        const hmrColour = hmr >= 1000 ? '#ef4444' : hmr >= 500 ? '#f59e0b' : '#64748b';
        
        const mData = m.model_data || {};
        let mInterval = mData.si_hours || mData.service_interval_hours;
        
        let isType = mInterval ? mInterval + 'H' : '—';
        
        let hrsRemaining = m.hours_remaining_to_service;
        if (hrsRemaining == null && mInterval) {
           hrsRemaining = Math.max(0, parseInt(mInterval) - hmr);
        } else if (hrsRemaining == null && isType !== '—') {
           const match = isType.match(/\d+/);
           if (match) hrsRemaining = Math.max(0, parseInt(match[0]) - hmr);
        }
        hrsRemaining = hrsRemaining != null ? hrsRemaining : '—';
        const hrColour = (hrsRemaining !== '—' && hrsRemaining <= 50) ? '#ef4444' : '#0f172a';
        
        const lastDateVal = m.last_hmr_date || m.modified;
        const lastHmrDate = lastDateVal ? new Date(lastDateVal.split(" ")[0]).toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'}) : '—';

        const l_hr = mData.fuel_consumption || mData.l_hr || '—';
        const fc_cat = mData.fuel_consumption_class || '—';
        const fuelDisplay = l_hr !== '—' ? `${l_hr} L/hr <br><span style="font-size:10px;color:#64748b;">${fc_cat !== '—' ? fc_cat : ''}</span>` : '—';

        return { m, hmr, hmrColour, isType, hrsRemaining, hrColour, lastHmrDate, fuelDisplay };
      });

      // Sort by dynamically chosen column
      enrichedRows.sort((a, b) => {
         let valA, valB;
         if (_isrSortCol === 'hmr') {
             valA = a.hmr;
             valB = b.hmr;
         } else { // hrsRemaining
             valA = a.hrsRemaining === '—' ? 999999 : Number(a.hrsRemaining);
             valB = b.hrsRemaining === '—' ? 999999 : Number(b.hrsRemaining);
         }
         if (valA < valB) return _isrSortAsc ? -1 : 1;
         if (valA > valB) return _isrSortAsc ? 1 : -1;
         return 0;
      });

      tbody.innerHTML = enrichedRows.map(obj => {
         const { m, hmr, hmrColour, isType, hrsRemaining, hrColour, lastHmrDate, fuelDisplay } = obj;
         return `<tr>
          <td style="font-weight:600;color:#0f172a;">${m.customer || '—'}</td>
          <td>
            <div style="font-weight:700;color:#0f172a;">${m.model || '—'}</div>
            <div style="font-size:11px;color:#64748b;margin-top:2px;">${m.name || '—'} | SN: ${m.sn || '—'}</div>
          </td>
          <td style="font-weight:500;">${isType}</td>
          <td style="font-weight:500;">${fuelDisplay}</td>
          <td style="text-align:right;font-weight:700;color:${hmrColour};">${hmr.toLocaleString()}</td>
          <td style="text-align:right;font-weight:600;color:${hrColour};">${hrsRemaining}</td>
          <td style="color:#475569;">${lastHmrDate}</td>
        </tr>`;
      }).join('');
    }

    function filterIsrTable() {
      const region    = (document.getElementById('isr-region')?.value    || '').toLowerCase();
      const customer  = (document.getElementById('isr-customer')?.value  || '').toLowerCase();
      const model     = (document.getElementById('isr-model')?.value     || '').toLowerCase();
      const minHmr    = Number(document.getElementById('isr-min-hmr')?.value || 0);
      const fleetrack = (document.getElementById('isr-fleetrack')?.value || '');
      const filtered = _isrAllRows.filter(m => {
        const ftVal = (m.fleetrack_managed || '').trim();
        const ftMatch = !fleetrack || ftVal.toLowerCase() === fleetrack.toLowerCase();
        return (
          ftMatch &&
          (!region   || (m.region   || '').toLowerCase().includes(region))   &&
          (!customer || (m.customer || '').toLowerCase().includes(customer)) &&
          (!model    || (m.model    || '').toLowerCase().includes(model))    &&
          (Number(m.current_hmr || 0) >= minHmr)
        );
      });
      renderIsrTable(filtered);
    }

    

    (function() {
        window.openSettingsModal = function() {
            var m = document.getElementById('settings-modal');
            if (m) m.classList.remove('hidden');
        };
        window.closeSettingsModal = function() {
            var m = document.getElementById('settings-modal');
            if (m) m.classList.add('hidden');
        };
        window.switchSettingsTab = function(tab) {
            document.querySelectorAll('.settings-tab').forEach(function(t) { t.classList.remove('active'); });
            document.querySelectorAll('.settings-pane').forEach(function(p) { p.classList.remove('active'); });
            document.querySelectorAll('.settings-tab').forEach(function(t) {
                var oc = t.getAttribute('onclick') || '';
                if (oc.indexOf("'" + tab + "'") !== -1) t.classList.add('active');
            });
            var pane = document.getElementById('pane-' + tab);
            if (pane) pane.classList.add('active');
        };
    })();
    

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

  

(function() {
    'use strict';

    // ── Supabase client for Salestrack DB (same project, read-only from here) ──
    const SUPA_URL = 'https://pfqaeewmlwfayxbgmuaq.supabase.co';
    // Reuse the key that main.js uses — it's already in global scope via electron IPC
    // We call via electron IPC so we don't need to expose the key in browser
    async function supaQuery(table, filters) {
        if (window.electron && window.electron.ipcRenderer) {
            const res = await window.electron.ipcRenderer.invoke('supabase:query', {
                table, method: 'select',
                params: { match: filters, order: { column: 'visit_date', options: { ascending: false } } }
            });
            return (res.ok && res.data) ? res.data : [];
        }
        // Fallback: direct fetch if supabase client is available
        if (window._ftSupa) {
            const q = window._ftSupa.from(table).select('*').order('visit_date', { ascending: false });
            Object.entries(filters||{}).forEach(([k,v]) => q.eq(k, v));
            const { data } = await q;
            return data || [];
        }
        return [];
    }

    async function supaUpdate(table, id, payload) {
        if (window.electron && window.electron.ipcRenderer) {
            await window.electron.ipcRenderer.invoke('supabase:query', {
                table, method: 'upsert', data: { id, ...payload }
            });
        } else if (window._ftSupa) {
            await window._ftSupa.from(table).update(payload).eq('id', id);
        }
    }

    // ── State ───────────────────────────────────────────────────────────────
    let _items  = [];
    let _tab    = 'all';
    let _ftMachineCache = null;

    async function getFtMachines() {
        if (_ftMachineCache) return _ftMachineCache;
        try {
            const res = await frappe.call({ method: 'mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.get_ft_machine_register', args: {} });
            _ftMachineCache = (res.message && res.message.machines) ? res.message.machines : (Array.isArray(res.message) ? res.message : []);
        } catch(e) { _ftMachineCache = []; }
        return _ftMachineCache;
    }

    // ── Hook into showView ──────────────────────────────────────────────────
    const _origFt2 = window.showView;
    if (typeof _origFt2 === 'function') {
        window.showView = function(id) {
            _origFt2(id);
            if (id === 'view-ft-psv-queue') {
                const v = document.getElementById('view-ft-psv-queue');
                if (v) v.style.display = 'block';
                window.ftq2Load();
            } else {
                const v = document.getElementById('view-ft-psv-queue');
                if (v) v.style.display = 'none';
            }
        };
    }

    // ── Load ────────────────────────────────────────────────────────────────
    window.ftq2Load = async function() {
        const body = document.getElementById('ftq2-body');
        if (!body) return;
        body.innerHTML = `<div style="text-align:center;padding:80px 0;color:rgba(255,255,255,0.3);"><div style="font-size:28px;margin-bottom:16px;">⏳</div><div style="font-size:15px;font-weight:600;">Loading action items…</div></div>`;

        try {
            const [psv, cdv] = await Promise.all([
                supaQuery('psv_logs', { action_required: true }),
                supaQuery('cdv_logs', { action_required: true })
            ]);
            _items = [
                ...psv.map(p => ({...p, _src:'PSV'})),
                ...cdv.map(c => ({...c, _src:'CDV'}))
            ].filter(i => !i.ft_defect_logged)
             .sort((a,b) => new Date(b.visit_date||b.created_at||0) - new Date(a.visit_date||a.created_at||0));

            const pending = _items.length;
            const el = document.getElementById('ftq2-count-pending');
            if (el) el.textContent = pending;
            const badge = document.getElementById('ft-psv-queue-badge');
            if (badge) { badge.style.display = pending > 0 ? 'inline' : 'none'; badge.textContent = pending; }

            ftq2Render();
        } catch(e) {
            body.innerHTML = `<div style="text-align:center;padding:80px 0;color:#e74c3c;"><div style="font-size:15px;font-weight:700;">Failed to load: ${e.message}</div></div>`;
        }
    };

    window.ftq2Tab = function(tab) {
        _tab = tab;
        ['all','psv','cdv'].forEach(t => {
            const b = document.getElementById(`ftq2-tab-${t}`);
            if (!b) return;
            b.style.background = t === tab ? 'rgba(192,57,43,0.8)' : 'rgba(255,255,255,0.07)';
            b.style.color      = t === tab ? 'white'              : 'rgba(255,255,255,0.6)';
        });
        ftq2Render();
    };

    function ftq2Render() {
        const body = document.getElementById('ftq2-body');
        if (!body) return;
        let items = _items;
        if (_tab === 'psv') items = items.filter(i => i._src === 'PSV');
        if (_tab === 'cdv') items = items.filter(i => i._src === 'CDV');

        if (items.length === 0) {
            body.innerHTML = `<div style="text-align:center;padding:100px 0;color:rgba(255,255,255,0.25);">
                <div style="font-size:52px;margin-bottom:20px;color:rgba(39,174,96,0.3);">✔</div>
                <div style="font-size:18px;font-weight:800;color:rgba(255,255,255,0.4);">Queue is clear</div>
                <div style="font-size:13px;margin-top:6px;">No pending PSV/CDV items requiring Fleetrack review.</div>
            </div>`;
            return;
        }

        const cc = { Good:'#27ae60', Fair:'#f39c12', Poor:'#e67e22', Critical:'#e74c3c' };
        body.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(460px,1fr));gap:16px;">` +
            items.map(item => {
                const sid   = (item.id||'').replace(/[^a-zA-Z0-9\-]/g,'');
                const typBg = item._src==='PSV' ? 'rgba(245,158,11,0.15)' : 'rgba(59,130,246,0.15)';
                const typCl = item._src==='PSV' ? '#f59e0b' : '#3b82f6';
                const cond  = item.overall_condition||'';
                const condCl= cc[cond]||'#94a3b8';
                const ds    = item.visit_date ? new Date(item.visit_date).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : 'N/A';
                const mach  = item._src==='PSV' ? `${item.machine_model||''} ${item.machine_sn ? '· SN:'+item.machine_sn : ''}` : '';
                const finds = item._src==='PSV' ? (item.findings||'') : (item.potential_issues||item.topics_discussed||'');
                const notes = item.action_notes||'';
                const sn    = item.machine_sn||item.machine_fleet_no||'';
                return `<div id="ftq2-card-${sid}" style="background:linear-gradient(145deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02));border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden;transition:border-color 0.2s,box-shadow 0.2s;"
                    onmouseover="this.style.borderColor='rgba(192,57,43,0.4)';this.style.boxShadow='0 8px 24px rgba(0,0,0,0.3)';"
                    onmouseout="this.style.borderColor='rgba(255,255,255,0.08)';this.style.boxShadow='none';">
                    <div style="padding:14px 18px;background:rgba(255,255,255,0.03);border-bottom:1px solid rgba(255,255,255,0.06);display:flex;align-items:center;justify-content:space-between;gap:10px;">
                        <div style="display:flex;align-items:center;gap:8px;">
                            <span style="font-size:9px;font-weight:900;color:${typCl};background:${typBg};padding:2px 8px;border-radius:20px;">${item._src}</span>
                            <span style="font-size:13px;font-weight:800;color:white;">${item.customer||'Unknown'}</span>
                        </div>
                        <div style="display:flex;gap:8px;align-items:center;flex-shrink:0;">
                            ${cond ? `<span style="font-size:10px;font-weight:800;color:${condCl};background:${condCl}18;padding:3px 10px;border-radius:20px;">${cond}</span>` : ''}
                            <span style="font-size:11px;color:rgba(255,255,255,0.4);">${ds}</span>
                        </div>
                    </div>
                    ${mach ? `<div style="padding:8px 18px 0;font-size:12px;color:rgba(255,255,255,0.5);font-weight:600;">⚙ ${mach.trim()}</div>` : ''}
                    ${finds ? `<div style="padding:8px 18px 0;"><div style="font-size:10px;font-weight:800;color:rgba(255,255,255,0.3);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:3px;">Findings</div><div style="font-size:13px;color:rgba(255,255,255,0.7);line-height:1.5;max-height:54px;overflow:hidden;">${finds}</div></div>` : ''}
                    <div style="padding:8px 18px 12px;">
                        <div style="font-size:10px;font-weight:800;color:#e74c3c;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">Action Required</div>
                        <div style="font-size:13px;font-weight:600;color:rgba(255,255,255,0.9);padding:10px 14px;background:rgba(231,76,60,0.08);border:1px solid rgba(231,76,60,0.2);border-radius:8px;line-height:1.5;">${notes||'(No notes)'}</div>
                    </div>
                    <div style="padding:12px 18px;display:flex;gap:10px;border-top:1px solid rgba(255,255,255,0.05);">
                        <button onclick="window.ftq2OpenModal('${sid}','${(notes||'').replace(/'/g,"\\'").replace(/\n/g,'\\n')}','${(sn||'').replace(/'/g,"\\'")}')"
                            style="flex:2;padding:10px;background:linear-gradient(135deg,#c0392b,#8b2219);border:none;color:white;border-radius:10px;font-weight:800;font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;"
                            onmouseover="this.style.opacity='.85';" onmouseout="this.style.opacity='1';">⚒ Log Defect</button>
                        <button onclick="window.ftq2Dismiss('${sid}','${item._src}')"
                            style="flex:1;padding:10px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:rgba(255,255,255,0.5);border-radius:10px;font-weight:700;font-size:12px;cursor:pointer;"
                            onmouseover="this.style.background='rgba(255,255,255,0.1)';" onmouseout="this.style.background='rgba(255,255,255,0.05)';">✕ Dismiss</button>
                    </div>
                </div>`;
            }).join('') + `</div>`;
    }

    // ── Modal ───────────────────────────────────────────────────────────────
    window.ftq2OpenModal = async function(itemId, notes, sn) {
        const m = document.getElementById('ftq2-modal');
        if (!m) return;
        document.getElementById('ftq2-visit-id').value      = itemId;
        document.getElementById('ftq2-machine-input').value = sn || '';
        document.getElementById('ftq2-machine-docname').value = '';
        document.getElementById('ftq2-defect-type').value   = 'Major';
        document.getElementById('ftq2-priority').value      = 'Medium';
        document.getElementById('ftq2-description').value   = notes || '';
        document.getElementById('ftq2-error').style.display = 'none';
        document.getElementById('ftq2-machine-dd').style.display = 'none';
        document.getElementById('ftq2-modal-ctx').innerHTML = `<b style="color:white;">SN:</b> ${sn||'—'}<br><b style="color:rgba(255,255,255,0.6);">Action:</b> ${notes||'—'}`;
        if (sn) await window.ftq2SearchMachine(sn, true);
        m.style.display = 'flex';
    };

    window.ftq2CloseModal = function() {
        const m = document.getElementById('ftq2-modal');
        if (m) m.style.display = 'none';
    };

    window.ftq2SearchMachine = async function(q, auto) {
        const dd = document.getElementById('ftq2-machine-dd');
        if (!dd) return;
        const machines = await getFtMachines();
        const qlo = (q||'').toLowerCase().trim();
        if (!qlo) { dd.style.display='none'; return; }
        const hits = machines.filter(m => {
            return [(m.serial_number||m.serial_no||m.chassis_number||''),(m.name||''),(m.model||''),(m.customer||'')]
                .some(s => s.toLowerCase().includes(qlo));
        }).slice(0,10);
        if (auto && hits.length===1) {
            document.getElementById('ftq2-machine-input').value   = `${hits[0].name} — ${hits[0].model||''}`;
            document.getElementById('ftq2-machine-docname').value = hits[0].name;
            dd.style.display='none'; return;
        }
        if (!hits.length) { dd.style.display='none'; return; }
        dd.innerHTML = hits.map(m => `<div onclick="window.ftq2PickMachine('${m.name}','${(m.model||'').replace(/'/g,"\\'")}' )"
            style="padding:10px 14px;cursor:pointer;border-bottom:1px solid rgba(255,255,255,0.05);"
            onmouseover="this.style.background='rgba(192,57,43,0.15)';" onmouseout="this.style.background='transparent';">
            <div style="font-size:13px;font-weight:700;color:white;">${m.name}</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.5);">${m.model||''} ${m.customer ? '·'+m.customer : ''}</div>
        </div>`).join('');
        dd.style.display='block';
    };

    window.ftq2PickMachine = function(docname, model) {
        document.getElementById('ftq2-machine-input').value   = `${docname} — ${model}`.trim();
        document.getElementById('ftq2-machine-docname').value = docname;
        document.getElementById('ftq2-machine-dd').style.display = 'none';
    };

    window.ftq2Submit = async function() {
        const machine     = document.getElementById('ftq2-machine-docname').value.trim();
        const defect_type = document.getElementById('ftq2-defect-type').value;
        const priority    = document.getElementById('ftq2-priority').value;
        const description = document.getElementById('ftq2-description').value.trim();
        const visitId     = document.getElementById('ftq2-visit-id').value;
        const errEl       = document.getElementById('ftq2-error');
        const btn         = document.getElementById('ftq2-submit-btn');

        errEl.style.display = 'none';
        if (!machine)     { errEl.textContent='Please select a machine.'; errEl.style.display='block'; return; }
        if (!description) { errEl.textContent='Please provide a description.'; errEl.style.display='block'; return; }

        btn.innerHTML = '⏳ Logging…'; btn.disabled = true;

        try {
            const res = await frappe.call({
                method: 'mxg_fleet_track.omnis_dashboard.ft_defects_dashboard.create_ft_defect',
                args: { machine, defect_type, priority, description }
            });
            const r = res.message || {};
            if (r.error) throw new Error(r.error);

            // Mark as logged in Salestrack Supabase
            const item = _items.find(i => (i.id||'').replace(/[^a-zA-Z0-9\-]/g,'') === visitId);
            if (item) {
                await supaUpdate(item._src==='PSV' ? 'psv_logs' : 'cdv_logs', item.id, {
                    ft_defect_logged: true,
                    ft_defect_name: r.name || 'logged',
                    ft_defect_logged_at: new Date().toISOString()
                });
                item.ft_defect_logged = true;
            }

            window.ftq2CloseModal();
            showToast(`Defect logged${r.name ? ': '+r.name : ''}`, 'ok', 3000);

            const card = document.getElementById(`ftq2-card-${visitId}`);
            if (card) { card.style.transition='opacity 0.4s'; card.style.opacity='0'; setTimeout(()=>card.remove(),400); }

            const pending = _items.filter(i=>!i.ft_defect_logged).length;
            const el = document.getElementById('ftq2-count-pending'); if(el) el.textContent=pending;
            const badge = document.getElementById('ft-psv-queue-badge');
            if(badge){ badge.style.display=pending>0?'inline':'none'; badge.textContent=pending; }
        } catch(e) {
            errEl.textContent = 'Failed: ' + e.message; errEl.style.display='block';
        } finally {
            btn.innerHTML = '⚒ Log Defect'; btn.disabled=false;
        }
    };

    window.ftq2Dismiss = async function(itemId, src) {
        if (!confirm('Dismiss without logging? This removes it from the queue.')) return;
        const item = _items.find(i => (i.id||'').replace(/[^a-zA-Z0-9\-]/g,'') === itemId);
        if (item) {
            try { await supaUpdate(src==='PSV'?'psv_logs':'cdv_logs', item.id, { ft_defect_logged:true, ft_defect_name:'dismissed', ft_defect_logged_at:new Date().toISOString() }); }
            catch(e){/* ignore */}
            item.ft_defect_logged = true;
        }
        const card = document.getElementById(`ftq2-card-${itemId}`);
        if (card) { card.style.transition='opacity 0.3s'; card.style.opacity='0'; setTimeout(()=>card.remove(),300); }
        const pending = _items.filter(i=>!i.ft_defect_logged).length;
        const el = document.getElementById('ftq2-count-pending'); if(el) el.textContent=pending;
        showToast('Dismissed from queue.', 'ok', 2000);
        // Also update dashboard KPI
        window.updatePsvKpiCard(pending);
    };

    // Expose KPI updater globally so queue loads can also refresh it
    window.updatePsvKpiCard = function(pending) {
        const countEl = document.getElementById('kpi-psv-queue-count');
        const subEl   = document.getElementById('kpi-psv-queue-sub');
        const stripe  = document.getElementById('kpi-psv-stripe');
        const card    = document.getElementById('kpi-card-psv-queue');
        const badge   = document.getElementById('ft-psv-queue-badge');
        if (countEl) countEl.textContent = pending;
        if (subEl)   subEl.textContent   = pending > 0 ? `${pending} pending — click to review` : 'All clear ✔';
        if (stripe)  stripe.style.display = pending > 0 ? 'block' : 'none';
        if (card) {
            card.style.borderLeftColor = pending > 0 ? '#c0392b' : '#27ae60';
            if (pending > 0) {
                card.classList.add('kpi-psv-flashing');
            } else {
                card.classList.remove('kpi-psv-flashing');
                card.style.background   = '#fff';
                card.style.boxShadow    = '';
            }
        }
        if (badge)   { badge.style.display = pending > 0 ? 'inline' : 'none'; badge.textContent = pending; }
    };

})();


// ── Load PSV/CDV KPI count on dashboard boot ───────────────────────────────
(function() {
    async function loadPsvQueueKpi() {
        try {
            let psvCount = 0, cdvCount = 0;
            if (window.electron && window.electron.ipcRenderer) {
                const [pr, cr] = await Promise.all([
                    window.electron.ipcRenderer.invoke('supabase:query', {
                        table: 'psv_logs', method: 'select',
                        params: { match: { action_required: true } }
                    }),
                    window.electron.ipcRenderer.invoke('supabase:query', {
                        table: 'cdv_logs', method: 'select',
                        params: { match: { action_required: true } }
                    })
                ]);
                psvCount = pr.ok && pr.data ? pr.data.filter(r => !r.ft_defect_logged).length : 0;
                cdvCount = cr.ok && cr.data ? cr.data.filter(r => !r.ft_defect_logged).length : 0;
            }
            const total = psvCount + cdvCount;
            window.updatePsvKpiCard && window.updatePsvKpiCard(total);
        } catch(e) {
            console.warn('[PSV KPI] Could not load count:', e.message);
            const subEl = document.getElementById('kpi-psv-queue-sub');
            if (subEl) subEl.textContent = 'Unable to connect';
            const countEl = document.getElementById('kpi-psv-queue-count');
            if (countEl) countEl.textContent = '?';
        }
    }

    // Run after a short delay to let the dashboard finish loading
    document.addEventListener('DOMContentLoaded', () => setTimeout(loadPsvQueueKpi, 2500));
    // Also expose so other parts can trigger a refresh
    window.loadPsvQueueKpi = loadPsvQueueKpi;
})();


// ── CUSTOMER PORTAL ADMIN LOGIC ─────────────────────────────────────────
(function(){
  let _cpaAccounts = [];
  let _cpaAllMachines = [];
  let _cpaSelectedMachines = new Set();
  let _cpaEditId = null;

  // Load machine list once
  async function fetchAllMachines() {
    if (_cpaAllMachines.length) return;
    try {
      // Use already-loaded Supabase machine data if available
      let rows = (window.FT_MACHINE_ROWS || []);
      if (!rows.length) {
        // Fallback: query Supabase directly
        const res = await window.electron.invoke('supabase:query', {
          table: 'ft_machine',
          method: 'select',
          params: { columns: 'name,sn,customer,type,model,mxg_fleet_no,fleet_no', range: { from: 0, to: 4999 } }
        });
        rows = (res && res.data) || [];
      }
      // Map to consistent shape using Frappe field names
      _cpaAllMachines = rows
        .map(m => ({
          name:          m.name        || '',   // machine doctype name / fleet no
          serial_number: m.sn          || m.serial_number || '',
          customer:      m.customer    || '',
          machine_type:  m.type        || m.machine_type || '',
          model:         m.model       || '',
          fleet_no:      m.mxg_fleet_no || m.fleet_no || '',
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
    } catch(e) {
      console.warn('[CPA] fetchAllMachines error:', e);
      _cpaAllMachines = [];
    }
  }

  window.loadPortalAccounts = async function() {
    const tbody = document.getElementById('cpa-tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:#64748b;">Loading…</td></tr>';

    try {
      // Load accounts
      const accRes = await window.electron.invoke('supabase:query', {
        table: 'ft_customer_portal_accounts',
        method: 'select',
        params: { columns: '*', options: {}, order: { column: 'created_at', options: { ascending: false } } }
      });
      _cpaAccounts = accRes.data || [];

      // Load machine assignments
      const machRes = await window.electron.invoke('supabase:query', {
        table: 'ft_portal_machine_assignments',
        method: 'select',
        params: { columns: '*', options: {} }
      });
      const assignments = machRes.data || [];
      const assignMap = {};
      assignments.forEach(a => {
        if (!assignMap[a.portal_account_id]) assignMap[a.portal_account_id] = [];
        assignMap[a.portal_account_id].push(a.machine_name);
      });

      // Load portal report count
      const rptRes = await window.electron.invoke('supabase:query', {
        table: 'ft_portal_defect_reports',
        method: 'select',
        params: { columns: '*', options: {}, order: { column: 'created_at', options: { ascending: false } } }
      });
      const reports = rptRes.data || [];

      // KPIs
      document.getElementById('cpa-kpi-total').textContent = _cpaAccounts.length;
      document.getElementById('cpa-kpi-active').textContent = _cpaAccounts.filter(a=>a.is_active).length;
      document.getElementById('cpa-kpi-suspended').textContent = _cpaAccounts.filter(a=>!a.is_active).length;
      document.getElementById('cpa-kpi-reports').textContent = reports.length;
      // New KPIs
      const totalMachines = assignments.length;
      const openReports = reports.filter(r=>r.status==='New'||r.status==='In Progress').length;
      const machEl = document.getElementById('cpa-kpi-machines'); if(machEl) machEl.textContent = totalMachines;
      const openEl = document.getElementById('cpa-kpi-open-reports'); if(openEl) openEl.textContent = openReports;
      const badge = document.getElementById('cpa-open-badge');
      if(badge){ badge.textContent=openReports; badge.style.display=openReports>0?'inline':'none'; }
      // Store reports for filter
      window._cpaReports = reports;

      // Render accounts table
      renderCpaTable(_cpaAccounts, assignMap);

      // Render portal reports table
      renderCpaReportsTable(reports);
    } catch(e) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:#dc2626;">Error: ${e.message}</td></tr>`;
    }
  };

  function renderCpaTable(accounts, assignMap) {
    assignMap = assignMap || {};
    const tbody = document.getElementById('cpa-tbody');
    if (!accounts || accounts.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:#64748b;">No customer accounts yet. Click "New Account" to get started.</td></tr>';
      return;
    }
    tbody.innerHTML = accounts.map(a => {
      const machines = assignMap[a.id] || [];
      const active = a.is_active !== false;
      return `<tr style="border-bottom:1px solid #f1f5f9;">
        <td style="padding:12px 16px;">
          <div style="font-weight:700;color:#1e293b;">${safeText(a.customer_name)}</div>
          <div style="font-size:11px;color:#64748b;margin-top:1px;">${safeText(a.contact_name)}</div>
        </td>
        <td style="padding:12px 16px;color:#334155;">${safeText(a.email)}</td>
        <td style="padding:12px 16px;">
          <div style="display:flex;flex-wrap:wrap;gap:3px;">
            ${machines.slice(0,3).map(m=>`<span style="background:#f1f5f9;color:#475569;font-size:10px;padding:1px 7px;border-radius:10px;">${m}</span>`).join('')}
            ${machines.length > 3 ? `<span style="background:#f1f5f9;color:#94a3b8;font-size:10px;padding:1px 7px;border-radius:10px;">+${machines.length-3} more</span>` : ''}
            ${machines.length === 0 ? '<span style="color:#94a3b8;font-size:11px;">None assigned</span>' : ''}
          </div>
        </td>
        <td style="padding:12px 16px;font-size:11px;color:#475569;">${safeText(a.access_level||'Reporter')}</td>
        <td style="padding:12px 16px;">
          <span style="display:inline-block;padding:2px 9px;border-radius:20px;font-size:10px;font-weight:800;text-transform:uppercase;
            background:${active?'rgba(16,185,129,0.1)':'rgba(239,68,68,0.1)'};
            color:${active?'#059669':'#dc2626'};">
            ${active ? 'Active' : 'Suspended'}
          </span>
        </td>
        <td style="padding:12px 16px;color:#94a3b8;font-size:12px;">
          ${a.created_at ? new Date(a.created_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '—'}
        </td>
        <td style="padding:12px 16px;text-align:center;">
          <div style="display:flex;gap:5px;justify-content:center;">
            <button onclick="openPortalAccountModal(${JSON.stringify(a).replace(/"/g,'&quot;')})"
              title="Edit account"
              style="background:#f1f5f9;border:none;color:#475569;padding:5px 9px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;">Edit</button>
            <button onclick="togglePortalAccountActive('${a.id}', ${!active})"
              title="${active?'Suspend':'Reactivate'}"
              style="background:${active?'rgba(239,68,68,0.08)':'rgba(16,185,129,0.08)'};border:none;color:${active?'#dc2626':'#059669'};padding:5px 9px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;">
              ${active?'Suspend':'Activate'}
            </button>
            <button onclick="deletePortalAccount('${a.id}', '${safeText(a.customer_name)}')"
              title="Delete account"
              style="background:rgba(239,68,68,0.06);border:none;color:#dc2626;padding:5px 8px;border-radius:6px;font-size:14px;cursor:pointer;">🗑</button>
          </div>
        </td>
      </tr>`;
    }).join('');
  }


  function renderCpaReportsTable(reports) {
    const rTbody = document.getElementById('cpa-reports-tbody');
    if (!rTbody) return;
    if (!reports || reports.length === 0) {
      rTbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:48px;color:#64748b;font-size:13px;">No portal defect reports found.</td></tr>';
      return;
    }
    rTbody.innerHTML = reports.map(r => {
      const sevBg = r.severity==='Critical' ? '#fef2f2' : r.severity==='Major' ? '#fff7ed' : '#f8fafc';
      const sevColor = r.severity==='Critical' ? '#dc2626' : r.severity==='Major' ? '#d97706' : '#64748b';
      const stBg = r.status==='New' ? '#fef2f2' : r.status==='In Progress' ? '#fef9c3' : '#f0fdf4';
      const stColor = r.status==='New' ? '#dc2626' : r.status==='In Progress' ? '#92400e' : '#166534';
      return `<tr style="border-bottom:1px solid #f1f5f9; transition:background 0.15s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''">
        <td style="padding:11px 16px;font-weight:700;color:#1e293b;">${safeText(r.customer_name)}</td>
        <td style="padding:11px 16px;color:#334155;font-family:monospace;font-size:12px;">${safeText(r.machine_name)}</td>
        <td style="padding:11px 16px;color:#64748b;">${safeText(r.category)}</td>
        <td style="padding:11px 16px;">
          <span style="background:${sevBg};color:${sevColor};font-size:10px;font-weight:800;padding:2px 8px;border-radius:20px;text-transform:uppercase;">${safeText(r.severity)}</span>
        </td>
        <td style="padding:11px 16px;color:#475569;max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${safeText(r.description)}">${safeText(r.description)}</td>
        <td style="padding:11px 16px;color:#94a3b8;font-size:12px;">${r.created_at ? new Date(r.created_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '—'}</td>
        <td style="padding:11px 16px;">
          <select onchange="updatePortalReportStatus('${r.id}', this.value)"
            style="padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;border:none;background:${stBg};color:${stColor};cursor:pointer;outline:none;">
            <option value="New" ${r.status==='New'?'selected':''}>New</option>
            <option value="In Progress" ${r.status==='In Progress'?'selected':''}>In Progress</option>
            <option value="Resolved" ${r.status==='Resolved'?'selected':''}>Resolved</option>
          </select>
        </td>
      </tr>`;
    }).join('');
  }

  window.filterPortalAccounts = function() {
    const q = (document.getElementById('cpa-search')?.value || '').toLowerCase();
    const filtered = _cpaAccounts.filter(a =>
      (a.customer_name||'').toLowerCase().includes(q) ||
      (a.contact_name||'').toLowerCase().includes(q) ||
      (a.email||'').toLowerCase().includes(q)
    );
    renderCpaTable(filtered, {});
  };

  // ── MODAL ──────────────────────────────────────────────────────────────
  window.openPortalAccountModal = async function(account) {
    _cpaEditId = account ? account.id : null;
    document.getElementById('cpa-modal-title').textContent = account ? 'Edit Account' : 'New Customer Account';
    document.getElementById('cpa-customer-name').value = account?.customer_name || '';
    document.getElementById('cpa-contact-name').value  = account?.contact_name  || '';
    document.getElementById('cpa-email').value         = account?.email         || '';
    document.getElementById('cpa-phone').value         = account?.phone         || '';
    document.getElementById('cpa-access-level').value  = account?.access_level  || 'Reporter';
    document.getElementById('cpa-modal-error').style.display = 'none';

    _cpaSelectedMachines = new Set();
    _cpaAllMachines      = []; // reset so fresh data loads each time
    _cpaFilterCustomer   = ''; // reset customer filter

    // Load machines first (so customer list can fall back to _cpaAllMachines)
    await fetchAllMachines();

    // Load distinct customers list
    await fetchCpaCustomerList();

    // Fetch existing assignments if editing
    if (_cpaEditId) {
      const res = await window.electron.invoke('supabase:query', {
        table: 'ft_portal_machine_assignments',
        method: 'select',
        params: { columns: 'machine_name', options: {}, match: { portal_account_id: _cpaEditId } }
      });
      (res.data||[]).forEach(a => _cpaSelectedMachines.add(a.machine_name));

      // In edit mode, pre-filter the machine list to this customer's machines
      _cpaFilterCustomer = (account.customer_name || '').trim();
    }

    // Show/hide auth buttons (only in edit mode)
    const resetBtn  = document.getElementById('cpa-reset-pwd-btn');
    const setPwdBtn = document.getElementById('cpa-set-pwd-btn');
    const impBtn    = document.getElementById('cpa-impersonate-btn');
    if (resetBtn)  resetBtn.style.display  = _cpaEditId ? 'block' : 'none';
    if (setPwdBtn) setPwdBtn.style.display = _cpaEditId ? 'block' : 'none';
    if (impBtn)    impBtn.style.display    = _cpaEditId ? 'block' : 'none';

    renderCpaMachineList();
    updateCpaSelectedCount();

    document.getElementById('cpa-machine-search').value = '';
    const modal = document.getElementById('cpa-modal');
    modal.style.display = 'flex';
  };

  window.closePortalAccountModal = function() {
    document.getElementById('cpa-modal').style.display = 'none';
  };

  window.filterCpaMachineList = function() {
    renderCpaMachineList();
  };

  function renderCpaMachineList() {
    const q    = (document.getElementById('cpa-machine-search')?.value || '').toLowerCase();
    const list = document.getElementById('cpa-machine-list');

    // If a customer is selected, restrict list to their machines only
    let pool = _cpaAllMachines;
    if (_cpaFilterCustomer) {
      const lc = _cpaFilterCustomer.toLowerCase();
      pool = _cpaAllMachines.filter(m => (m.customer || '').toLowerCase().trim() === lc);
    }

    // Apply search query within the pool
    const filtered = q
      ? pool.filter(m =>
          (m.name||'').toLowerCase().includes(q) ||
          (m.serial_number||'').toLowerCase().includes(q)
        )
      : pool;

    if (!filtered.length) {
      const msg = _cpaFilterCustomer
        ? `No machines registered for <strong>${_cpaFilterCustomer}</strong>`
        : 'No machines found';
      list.innerHTML = `<div style="color:#94a3b8;font-size:12px;text-align:center;padding:12px;">${msg}</div>`;
      return;
    }

    const rows = filtered.map(m => {
      const checked  = _cpaSelectedMachines.has(m.name);
      const safeName = m.name.replace(/"/g,'&quot;');
      return `<label style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:6px;cursor:pointer;background:${checked?'#eff6ff':'transparent'};">
        <input type="checkbox" ${checked?'checked':''} value="${safeName}" onchange="toggleCpaMachine(this)"
          style="accent-color:#2563eb;width:14px;height:14px;flex-shrink:0;"/>
        <span style="min-width:0;">
          <span style="font-size:13px;font-weight:600;color:#1e293b;">${m.name}</span>
          ${m.serial_number ? `<span style="font-size:10px;color:#94a3b8;margin-left:6px;">#${m.serial_number}</span>` : ''}
          ${m.model         ? `<span style="font-size:10px;color:#64748b;margin-left:6px;">${m.model}</span>`         : ''}
        </span>
      </label>`;
    }).join('');

    list.innerHTML = rows;
  }

  window.toggleCpaMachine = function(checkbox) {
    if (checkbox.checked) _cpaSelectedMachines.add(checkbox.value);
    else                   _cpaSelectedMachines.delete(checkbox.value);
    updateCpaSelectedCount();
    renderCpaMachineList();
  };

  function updateCpaSelectedCount() {
    const el = document.getElementById('cpa-selected-count');
    if (el) el.textContent = _cpaSelectedMachines.size;
  }

  // ── SAVE ───────────────────────────────────────────────────────────────
  window.savePortalAccount = async function() {
    const customerName = document.getElementById('cpa-customer-name').value.trim();
    const contactName  = document.getElementById('cpa-contact-name').value.trim();
    const email        = document.getElementById('cpa-email').value.trim();
    const phone        = document.getElementById('cpa-phone').value.trim();
    const accessLevel  = document.getElementById('cpa-access-level').value;
    const errEl        = document.getElementById('cpa-modal-error');
    const btn          = document.getElementById('cpa-save-btn');

    errEl.style.display = 'none';
    if (!customerName || !contactName || !email) {
      errEl.textContent = 'Please fill in Customer Name, Contact Name and Email.';
      errEl.style.display = 'block';
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Saving…';

    try {
      let accountId = _cpaEditId;

      if (_cpaEditId) {
        // Update existing
        await window.electron.invoke('supabase:query', {
          table: 'ft_customer_portal_accounts',
          method: 'upsert',
          data: { id: _cpaEditId, customer_name: customerName, contact_name: contactName, email, phone: phone||null, access_level: accessLevel },
          params: { onConflict: 'id' }
        });
      } else {
        // Create new account row (auth user created separately by admin from Supabase)
        const res = await window.electron.invoke('supabase:query', {
          table: 'ft_customer_portal_accounts',
          method: 'insert',
          data: { customer_name: customerName, contact_name: contactName, email, phone: phone||null, access_level: accessLevel, is_active: true, created_at: new Date().toISOString() }
        });
        accountId = (res.data && res.data[0]) ? res.data[0].id : null;
      }

      if (accountId) {
        // Delete existing assignments then re-insert
        await window.electron.invoke('supabase:query', {
          table: 'ft_portal_machine_assignments',
          method: 'delete',
          params: { match: { portal_account_id: accountId } }
        });

        const machineRows = [..._cpaSelectedMachines].map(name => ({
          portal_account_id: accountId,
          machine_name: name,
          created_at: new Date().toISOString()
        }));
        if (machineRows.length) {
          await window.electron.invoke('supabase:query', {
            table: 'ft_portal_machine_assignments',
            method: 'insert',
            data: machineRows
          });
        }
      }

      closePortalAccountModal();
      loadPortalAccounts();
    } catch(e) {
      errEl.textContent = e.message || 'Save failed.';
      errEl.style.display = 'block';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Save Account';
    }
  };

  window.togglePortalAccountActive = async function(id, newState) {
    await window.electron.invoke('supabase:query', {
      table: 'ft_customer_portal_accounts',
      method: 'upsert',
      data: { id, is_active: newState },
      params: { onConflict: 'id' }
    });
    loadPortalAccounts();
  };

  window.resetPortalPassword = async function() {
    const email = document.getElementById('cpa-email').value.trim();
    const name  = document.getElementById('cpa-contact-name').value.trim() || email;
    if (!email) { showToast('No email address on this account.', 'warn', 3000); return; }

    const btn = document.getElementById('cpa-reset-pwd-btn');
    btn.disabled = true;
    btn.textContent = 'Generating…';

    try {
      const res = await window.electron.invoke('supabase:auth', { action: 'resetPassword', email });

      if (!res || !res.ok) {
        showToast('Failed: ' + (res?.error || 'Unknown error'), 'err', 5000);
        return;
      }

      const link = res.link;
      const isInvite = res.type === 'invite';

      // Auto-copy to clipboard
      try { await navigator.clipboard.writeText(link); } catch(_) {}

      // Show a styled overlay with the copyable link
      const overlay = document.createElement('div');
      overlay.id = 'cpa-pwd-link-overlay';
      overlay.style.cssText = `
        position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:99999;
        display:flex; align-items:center; justify-content:center;
      `;
      overlay.innerHTML = `
        <div style="background:#fff; border-radius:16px; padding:28px 32px; max-width:540px; width:90%;
                    box-shadow:0 20px 60px rgba(0,0,0,0.3); font-family:inherit;">
          <div style="font-size:22px; margin-bottom:4px;">🔑 Password ${isInvite ? 'Invite' : 'Reset'} Link</div>
          <div style="color:#64748b; font-size:13px; margin-bottom:20px;">
            For <strong>${name}</strong> (${email})<br>
            ${isInvite
              ? 'This user has no account yet — this link will let them set their password for the first time.'
              : 'Share this link with the customer so they can set a new password.'}
          </div>
          <div style="background:#f1f5f9; border:1.5px solid #e2e8f0; border-radius:10px; padding:12px 14px;
                      font-size:11px; font-family:monospace; word-break:break-all; color:#1e293b;
                      margin-bottom:16px; max-height:80px; overflow-y:auto;">
            ${link}
          </div>
          <div style="display:flex; gap:10px; flex-wrap:wrap;">
            <button id="cpa-copy-link-btn" onclick="
              navigator.clipboard.writeText('${link.replace(/'/g,"\\'")}');
              this.textContent='✅ Copied!';
              setTimeout(()=>this.textContent='📋 Copy Link',1500);
            " style="padding:9px 18px; background:#1e293b; color:#fff; border:none; border-radius:8px;
                     font-size:13px; font-weight:700; cursor:pointer; font-family:inherit;">
              📋 Copy Link
            </button>
            <button onclick="document.getElementById('cpa-pwd-link-overlay').remove()"
              style="padding:9px 18px; background:#f1f5f9; color:#475569; border:none; border-radius:8px;
                     font-size:13px; font-weight:600; cursor:pointer; font-family:inherit;">
              Close
            </button>
          </div>
          <div style="margin-top:14px; font-size:11px; color:#94a3b8;">
            ⚠️ This link expires in 24 hours. Link was auto-copied to your clipboard.
          </div>
        </div>`;
      document.body.appendChild(overlay);
      overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    } catch(e) {
      showToast('Error: ' + e.message, 'err', 4000);
    } finally {
      btn.disabled = false;
      btn.textContent = '🔑 Reset Password';
    }
  };

  window.setPortalPassword = async function() {
    const email = document.getElementById('cpa-email').value.trim();
    const name  = document.getElementById('cpa-contact-name').value.trim() || email;
    if (!email) { showToast('No email address on this account.', 'warn', 3000); return; }

    // Build set-password overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:99999;display:flex;align-items:center;justify-content:center;';
    overlay.innerHTML = `
      <div style="background:#fff;border-radius:16px;padding:28px 32px;max-width:420px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.3);font-family:inherit;">
        <div style="font-size:20px;font-weight:800;margin-bottom:4px;">🔐 Set Password</div>
        <div style="font-size:13px;color:#64748b;margin-bottom:20px;">
          Set a new password for <strong>${name}</strong> (${email})<br>
          <span style="color:#15803d;">No email sent — password is updated immediately.</span>
        </div>
        <div style="margin-bottom:14px;">
          <label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#64748b;margin-bottom:6px;">NEW PASSWORD *</label>
          <input id="cpa-new-pwd" type="password" autocomplete="new-password"
            style="width:100%;padding:10px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:14px;font-family:inherit;outline:none;"
            placeholder="Min. 8 characters"/>
        </div>
        <div style="margin-bottom:20px;">
          <label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#64748b;margin-bottom:6px;">CONFIRM PASSWORD *</label>
          <input id="cpa-confirm-pwd" type="password" autocomplete="new-password"
            style="width:100%;padding:10px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:14px;font-family:inherit;outline:none;"
            placeholder="Re-enter password"/>
        </div>
        <div id="cpa-pwd-err" style="background:#fef2f2;border:1px solid #fecaca;color:#dc2626;border-radius:8px;padding:9px 12px;font-size:13px;margin-bottom:14px;display:none;"></div>
        <div style="display:flex;gap:10px;">
          <button id="cpa-set-pwd-confirm" style="flex:1;padding:11px;background:#15803d;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;">Set Password</button>
          <button id="cpa-set-pwd-cancel" style="padding:11px 20px;background:#f1f5f9;color:#475569;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;">Cancel</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    const newPwd     = overlay.querySelector('#cpa-new-pwd');
    const confirmPwd = overlay.querySelector('#cpa-confirm-pwd');
    const errEl      = overlay.querySelector('#cpa-pwd-err');
    const confirmBtn = overlay.querySelector('#cpa-set-pwd-confirm');
    const cancelBtn  = overlay.querySelector('#cpa-set-pwd-cancel');

    setTimeout(() => newPwd.focus(), 50);

    cancelBtn.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    confirmBtn.addEventListener('click', async () => {
      errEl.style.display = 'none';
      const pwd  = newPwd.value;
      const pwd2 = confirmPwd.value;

      if (pwd.length < 8) {
        errEl.textContent = 'Password must be at least 8 characters.';
        errEl.style.display = 'block'; return;
      }
      if (pwd !== pwd2) {
        errEl.textContent = 'Passwords do not match.';
        errEl.style.display = 'block'; return;
      }

      confirmBtn.disabled = true;
      confirmBtn.textContent = '⏳ Setting…';

      try {
        const res = await window.electron.invoke('supabase:auth', {
          action: 'setPasswordByEmail', email, password: pwd
        });

        if (!res || !res.ok) {
          errEl.textContent = res?.error || 'Failed to set password.';
          errEl.style.display = 'block';
          confirmBtn.disabled = false;
          confirmBtn.textContent = 'Set Password';
          return;
        }

        overlay.remove();
        showToast('✅ Password set for ' + email, 'ok', 4000);
      } catch(e) {
        errEl.textContent = 'Error: ' + e.message;
        errEl.style.display = 'block';
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Set Password';
      }
    });
  };

  window.impersonatePortalAccount = async function() {
    const email    = document.getElementById('cpa-email').value.trim();
    const custName = document.getElementById('cpa-customer-name').value.trim();
    const contact  = document.getElementById('cpa-contact-name').value.trim();
    if (!email) { showToast('No email address on this account.', 'warn', 3000); return; }

    // Remove any stale overlay
    document.getElementById('cpa-imp-overlay')?.remove();

    // Build overlay entirely via DOM — no inline onclick inside innerHTML
    const overlay = document.createElement('div');
    overlay.id = 'cpa-imp-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.65);z-index:99999;display:flex;align-items:center;justify-content:center;';

    const box = document.createElement('div');
    box.style.cssText = 'background:#fff;border-radius:16px;padding:28px 32px;max-width:480px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.3);font-family:inherit;';
    box.innerHTML = `
      <div style="font-size:19px;font-weight:700;color:#1e293b;margin-bottom:4px;">👤 Impersonate Customer Account</div>
      <div style="font-size:13px;color:#64748b;margin-bottom:18px;">
        Logging in as <strong>${contact}</strong> (${email}).<br>
        This action will be recorded in the audit log.
      </div>
      <label style="display:block;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;margin-bottom:6px;">Reason *</label>
      <textarea id="cpa-imp-reason" rows="3" placeholder="e.g. Customer reported login issue…"
        style="width:100%;padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:9px;font-size:13px;font-family:inherit;outline:none;resize:vertical;box-sizing:border-box;margin-bottom:16px;"></textarea>
      <div style="display:flex;gap:10px;justify-content:flex-end;">
        <button id="cpa-imp-cancel" style="padding:9px 18px;background:#f1f5f9;color:#475569;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;">Cancel</button>
        <button id="cpa-imp-go" disabled style="padding:9px 20px;background:#4338ca;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;opacity:0.4;transition:opacity 0.15s;">👤 Open Customer Portal</button>
      </div>
      <div style="margin-top:12px;font-size:11px;color:#f59e0b;">⚠️ Impersonation is logged. The magic link expires in 1 hour.</div>`;

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    const reasonEl  = document.getElementById('cpa-imp-reason');
    const goBtn     = document.getElementById('cpa-imp-go');
    const cancelBtn = document.getElementById('cpa-imp-cancel');

    // Close on cancel or backdrop click
    cancelBtn.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    // Enable Go button only when reason is typed
    reasonEl.addEventListener('input', () => {
      const ok = reasonEl.value.trim().length > 0;
      goBtn.disabled    = !ok;
      goBtn.style.opacity = ok ? '1' : '0.4';
    });

    // Main action — all logic here, no global _doImpersonate needed
    goBtn.addEventListener('click', async () => {
      const reason = reasonEl.value.trim();
      if (!reason) return;

      goBtn.disabled = true;
      goBtn.textContent = '⏳ Generating session…';
      goBtn.style.opacity = '0.7';

      try {
        console.log('[Impersonate] Requesting session for:', email);
        const res = await window.electron.invoke('supabase:auth', {
          action: 'impersonate', email, reason
        });
        console.log('[Impersonate] IPC result:', res?.ok, res?.error || '');

        if (!res || !res.ok) {
          const errMsg = res?.error || 'Could not create session';
          console.error('[Impersonate] Failed:', errMsg);
          showToast('Impersonate failed: ' + errMsg, 'err', 6000);
          goBtn.disabled = false;
          goBtn.textContent = '👤 Open Customer Portal';
          goBtn.style.opacity = '1';
          return;
        }

        // Audit log — best-effort
        try {
          await window.electron.invoke('supabase:query', {
            table: 'ft_portal_impersonation_log',
            method: 'insert',
            data: { admin_name: 'Omnis Admin', customer_name: custName, customer_email: email, reason, created_at: new Date().toISOString() }
          });
        } catch(_) {}

        overlay.remove();

        // Open portal in a new Electron window — session pre-injected into localStorage
        const openRes = await window.electron.invoke('portal:impersonate', {
          access_token:  res.access_token,
          refresh_token: res.refresh_token,
          expires_in:    res.expires_in,
          user:          res.user,
          email
        });

        if (openRes && openRes.ok) {
          showToast('👤 Portal opened as ' + email, 'ok', 4000);
        } else {
          showToast('Could not open portal: ' + (openRes?.error || 'unknown error'), 'err', 5000);
        }

      } catch(e) {
        console.error('[Impersonate] Exception:', e.message);
        showToast('Error: ' + e.message, 'err', 5000);
        goBtn.disabled = false;
        goBtn.textContent = '👤 Open Customer Portal';
        goBtn.style.opacity = '1';
      }
    });

    setTimeout(() => reasonEl.focus(), 50);
  };

  function _showImpersonateLink(link, email) {
    // Fallback: show the magic link in a copyable dialog
    try { navigator.clipboard.writeText(link); } catch(_) {}
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:99999;display:flex;align-items:center;justify-content:center;';
    d.innerHTML = `
      <div style="background:#fff;border-radius:16px;padding:28px 32px;max-width:540px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.3);font-family:inherit;">
        <div style="font-size:20px;margin-bottom:4px;">👤 Impersonation Link</div>
        <div style="font-size:13px;color:#64748b;margin-bottom:16px;">
          Copy this link and open it in any browser to log in as <strong>${email}</strong>.
        </div>
        <div id="imp-link-box" style="background:#f1f5f9;border:1.5px solid #e2e8f0;border-radius:10px;padding:12px 14px;font-size:11px;font-family:monospace;word-break:break-all;color:#1e293b;max-height:80px;overflow-y:auto;margin-bottom:16px;">${link}</div>
        <div style="display:flex;gap:10px;">
          <button id="imp-copy-btn" style="padding:9px 18px;background:#1e293b;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;">📋 Copy Link</button>
          <button id="imp-close-btn" style="padding:9px 18px;background:#f1f5f9;color:#475569;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;">Close</button>
        </div>
        <div style="margin-top:12px;font-size:11px;color:#94a3b8;">⚠️ Expires in 1 hour. Link was auto-copied to clipboard.</div>
      </div>`;
    document.body.appendChild(d);
    d.querySelector('#imp-copy-btn').addEventListener('click', () => {
      navigator.clipboard.writeText(link);
      d.querySelector('#imp-copy-btn').textContent = '✅ Copied!';
      setTimeout(() => { d.querySelector('#imp-copy-btn').textContent = '📋 Copy Link'; }, 1500);
    });
    d.querySelector('#imp-close-btn').addEventListener('click', () => d.remove());
    d.addEventListener('click', e => { if (e.target === d) d.remove(); });
  }

  window.deletePortalAccount = async function(id, name) {
    if (!confirm(`Delete the portal account for "${name}"? This cannot be undone.`)) return;
    await window.electron.invoke('supabase:query', {
      table: 'ft_portal_machine_assignments',
      method: 'delete',
      params: { match: { portal_account_id: id } }
    });
    await window.electron.invoke('supabase:query', {
      table: 'ft_customer_portal_accounts',
      method: 'delete',
      params: { match: { id } }
    });
    loadPortalAccounts();
  };

  window.updatePortalReportStatus = async function(reportId, status) {
    await window.electron.invoke('supabase:query', {
      table: 'ft_portal_defect_reports',
      method: 'upsert',
      data: { id: reportId, status },
      params: { onConflict: 'id' }
    });
  };

  // ── CUSTOMER NAME AUTOCOMPLETE (safe: data-attr + delegated listener) ──────
  let _cpaCustomerNames  = [];
  let _cpaFilterCustomer = ''; // currently selected customer — limits machine list

  async function fetchCpaCustomerList() {
    try {
      // Use Frappe machine data already in memory
      let rows = (window.FT_MACHINE_ROWS || []);
      if (!rows.length && _cpaAllMachines.length) rows = _cpaAllMachines;
      _cpaCustomerNames = [...new Set(
        rows.map(r => (r.customer || '').trim()).filter(Boolean)
      )].sort((a, b) => a.localeCompare(b));
    } catch(e) {
      _cpaCustomerNames = [];
    }

    // Wire up the delegated listener once (idempotent guard)
    const dd = document.getElementById('cpa-cust-dropdown');
    if (dd && !dd._listenerAttached) {
      dd._listenerAttached = true;
      dd.addEventListener('mousedown', function(e) {
        e.preventDefault(); // stop input blur
        const item = e.target.closest('[data-cpa-name]');
        if (!item) return;
        const name = item.dataset.cpaName;
        _applyCpaCustomer(name);
      });
    }

    // Close dropdown on input blur (with delay so mousedown fires first)
    const inp = document.getElementById('cpa-customer-name');
    if (inp && !inp._blurAttached) {
      inp._blurAttached = true;
      inp.addEventListener('blur', function() {
        setTimeout(() => {
          const dd2 = document.getElementById('cpa-cust-dropdown');
          if (dd2) dd2.style.display = 'none';
        }, 150);
      });
    }
  }

  function _applyCpaCustomer(name) {
    const input = document.getElementById('cpa-customer-name');
    const dd    = document.getElementById('cpa-cust-dropdown');
    if (input) input.value = name;
    if (dd)    dd.style.display = 'none';

    // Set the active customer filter
    _cpaFilterCustomer = (name || '').trim();

    // Auto-select all machines belonging to this customer
    if (_cpaFilterCustomer) {
      const lc = _cpaFilterCustomer.toLowerCase();
      _cpaAllMachines
        .filter(m => (m.customer || '').toLowerCase().trim() === lc)
        .forEach(m => _cpaSelectedMachines.add(m.name));
    }

    // Clear search box — filtered list will show only this customer's machines
    const machSearch = document.getElementById('cpa-machine-search');
    if (machSearch) machSearch.value = '';

    updateCpaSelectedCount();
    renderCpaMachineList();
  }

  window.cpaCustomerSearch = function(query) {
    const dd = document.getElementById('cpa-cust-dropdown');
    if (!dd) return;
    const q = (query || '').toLowerCase().trim();

    const matches = q
      ? _cpaCustomerNames.filter(n => n.toLowerCase().includes(q))
      : _cpaCustomerNames;

    let html = '';

    if (matches.length > 0) {
      html += matches.map(name => {
        const safe = name.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
        return `<div data-cpa-name="${safe}"
          style="padding:9px 14px;font-size:13px;cursor:pointer;color:#1e293b;
                 border-bottom:1px solid #f1f5f9;transition:background 0.1s;"
          onmouseover="this.style.background='#f8fafc'"
          onmouseout="this.style.background=''">${name}</div>`;
      }).join('');
    } else if (q) {
      html += `<div style="padding:9px 14px;font-size:12px;color:#94a3b8;font-style:italic;">No match for "${q}"</div>`;
    }

    // "Create new" row — always present
    const isNew = q && !_cpaCustomerNames.map(n => n.toLowerCase()).includes(q);
    const safeQ = (query || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
    const createLabel = isNew
      ? `<strong>+ Create "${safeQ}"</strong>&nbsp;as new customer`
      : `<strong>+ Create new customer</strong>&nbsp;(type a name above)`;
    html += `<div data-cpa-name="${safeQ}"
      style="padding:10px 14px;font-size:12px;cursor:pointer;color:#2563eb;
             border-top:2px solid #e2e8f0;background:#f8faff;"
      onmouseover="this.style.background='#eff6ff'"
      onmouseout="this.style.background='#f8faff'">${createLabel}</div>`;

    dd.innerHTML = html;
    dd.style.display = 'block';
  };

  // Expose for external call (e.g. edit mode pre-fill) — no-op kept for compat
  window.cpaSelectCustomer = function(name) { _applyCpaCustomer(name); };

  // Close modal on backdrop click
  document.getElementById('cpa-modal').addEventListener('click', function(e) {
    if (e.target === this) closePortalAccountModal();
  });
})();


(function() {
    'use strict';
    var _records = [];

    /* ── After-Sales Hub: Load + Render + Detail Modal ── */
    (function() {
        'use strict';
        var _records = [];
        var _raw     = [];   /* full raw API objects for the modal */

        /* ── Resolve Salestrack base URL ── */
        var _stBase = 'https://salestrack.powerstar.co.zw';
        try { if (window.CURRENT_SYSTEM && window.CURRENT_SYSTEM.baseUrl) _stBase = window.CURRENT_SYSTEM.baseUrl; } catch(e){}

        /* ── Map raw API record → display record ── */
        function _mapRec(o) {
            /* Determine aftersales status from local storage override or order status */
            var localKey = 'ftas_status_' + (o.name || '');
            var localSt  = localStorage.getItem(localKey); /* "Pending" | "Completed" */
            var status   = localSt || 'Pending';

            return {
                id:               o.name || '',
                order_id:         o.name || '',
                company:          o.customer_name || o.customer || '',
                equipment_model:  o.machine_label || o.machine || o.model || '',
                qty:              o.quantity || o.qty || '',
                chassis_number:   o.chassis_number || o.serial_no || '',
                oem:              o.oem || o.brand || '',
                date_of_sale:     o.order_date || o.date || '',
                handover_date:    o.target_handover_date || o.handover_date || '',
                salesperson:      o.salesperson || '',
                raw_status:       o.status || '',
                status:           status,
                _raw:             o
            };
        }

        /* ── Load ── */
        window.ftAsLoad = async function() {
            var body = document.getElementById('ftas-body');
            if (!body) return;
            body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;padding:60px 0;color:#94a3b8;gap:12px;"><span style="font-size:24px;">&#9203;</span><span style="font-size:15px;font-weight:600;">Loading aftersales records...</span></div>';
            try {
                var raw = [];

                /* Strategy 1 – SQLite cache (only trust if ≥10 valid order records) */
                if (window.cacheAPI) {
                    try {
                        var c = await window.cacheAPI.getAll('orders');
                        var cData = [];
                        if (c && c.ok && Array.isArray(c.data)) cData = c.data;
                        else if (Array.isArray(c)) cData = c;
                        /* Validate: record must have a real 'name' AND a customer field */
                        var validCache = cData.filter(function(o){
                            return o && o.name && !o._ft_as_batch && (o.customer_name || o.customer);
                        });
                        if (validCache.length >= 10) raw = validCache;
                    } catch(e) {}
                }

                /* Strategy 2 – Direct Salestrack API (always used if cache is small/empty) */
                if (raw.length < 10 && window.frappeAPI) {
                    body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;padding:60px 0;color:#94a3b8;gap:12px;"><span style="font-size:24px;">&#9203;</span><span style="font-size:15px;font-weight:600;">Fetching from Salestrack...</span></div>';
                    try {
                        var res = await window.frappeAPI.request({
                            url: _stBase + '/api/method/powerstar_salestrack.omnis_dashboard.get_omnis_orders',
                            method: 'GET',
                            data: { page_length: 1000 }
                        });
                        if (res && res.ok && res.data && res.data.message) {
                            var msg = res.data.message;
                            var apiData = msg.data || (Array.isArray(msg) ? msg : []);
                            if (apiData.length > 0) raw = apiData;
                        }
                    } catch(e) { console.warn('[FTAS] API fetch failed:', e.message); }
                }

                /* Strategy 3 – group_sales cache */
                if (!raw.length && window.cacheAPI) {
                    try {
                        var gc = await window.cacheAPI.getAll('group_sales');
                        if (gc && gc.ok && Array.isArray(gc.data) && gc.data.length) raw = gc.data;
                        else if (Array.isArray(gc) && gc.length) raw = gc;
                    } catch(e) {}
                }

                _raw     = raw;
                _records = raw.map(_mapRec);

                /* Populate company filter */
                var companies = ['All'].concat([...new Set(_records.map(function(r){return r.company;}).filter(Boolean))].sort());
                var cf = document.getElementById('ftas-company-filter');
                if (cf) {
                    var prev = cf.value;
                    cf.innerHTML = companies.map(function(c){return '<option value="'+c+'">'+c+'</option>';}).join('');
                    cf.value = companies.includes(prev) ? prev : 'All';
                }

                window.ftAsRender();

            } catch(e) {
                console.error('[FTAS] Load error:', e);
                body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;padding:60px 0;color:#ef4444;"><span style="font-size:15px;font-weight:600;">Failed to load: ' + e.message + '</span></div>';
            }
        };

        /* ── Nav badge helper ── */
        function ftAsUpdateNavBadge(n) {
            var b = document.getElementById('ft-as-nav-badge');
            if (!b) return;
            b.style.display = n > 0 ? 'inline' : 'none';
            b.textContent   = n > 99 ? '99+' : String(n);
        }
        window.ftAsUpdateNavBadge = ftAsUpdateNavBadge;

        /* ── Populate badge on startup from local cache (no API hit) ── */
        function ftAsBadgeInit() {
            (async function() {
                try {
                    var raw = [];
                    if (window.cacheAPI) {
                        var c = await window.cacheAPI.getAll('orders');
                        var cData = (c && c.ok && Array.isArray(c.data)) ? c.data
                                  : (Array.isArray(c) ? c : []);
                        raw = cData.filter(function(o) {
                            return o && o.name && !o._ft_as_batch && (o.customer_name || o.customer);
                        });
                    }
                    if (raw.length > 0) {
                        var pending = raw.filter(function(o) {
                            var lk = 'ftas_status_' + (o.name || '');
                            var ls = localStorage.getItem(lk);
                            return !ls || ls === 'Pending';
                        }).length;
                        ftAsUpdateNavBadge(pending);
                        /* Also seed the dashboard KPI card */
                        var kc  = document.getElementById('kpi-aftersales-count');
                        var ks  = document.getElementById('kpi-aftersales-sub');
                        var kst = document.getElementById('kpi-aftersales-stripe');
                        if (kc)  kc.textContent  = pending;
                        if (ks)  ks.textContent  = pending === 1 ? '1 handover pending' : pending + ' handovers pending';
                        if (kst) kst.style.display = pending > 0 ? 'block' : 'none';
                    } else if (!window.cacheAPI) {
                        /* cacheAPI not ready yet — retry once more */
                        setTimeout(ftAsBadgeInit, 2500);
                    }
                } catch(e) { /* silent — badge is non-critical */ }
            })();
        }
        /* Delay to let Electron preload / cacheAPI initialise first */
        setTimeout(ftAsBadgeInit, 800);

        /* ── Render list ── */
        window.ftAsRender = function() {
            var body = document.getElementById('ftas-body');
            if (!body) return;
            var q       = ((document.getElementById('ftas-search')||{}).value||'').toLowerCase().trim();
            var status  = ((document.getElementById('ftas-status-filter')||{}).value||'Pending');
            var company = ((document.getElementById('ftas-company-filter')||{}).value||'All');

            var items = _records.slice();
            if (status !== 'All')    items = items.filter(function(r){return (r.status||'Pending') === status;});
            if (company !== 'All')   items = items.filter(function(r){return r.company === company;});
            if (q) items = items.filter(function(r){
                return [r.equipment_model,r.company,r.chassis_number,r.order_id,r.raw_status].some(function(s){return (s||'').toLowerCase().includes(q);});
            });

            /* Stat pills */
            var nPending   = _records.filter(function(r){return r.status==='Pending';}).length;
            var nCompleted = _records.filter(function(r){return r.status==='Completed';}).length;
            var ep = document.getElementById('ftas-pending-label');   if(ep) ep.textContent = nPending   + ' Pending';
            var ec = document.getElementById('ftas-completed-label'); if(ec) ec.textContent = nCompleted + ' Completed';
            ftAsUpdateNavBadge(nPending);
            /* Also update dashboard KPI card */
            (function(n) {
                var kc = document.getElementById('kpi-aftersales-count');
                var ks = document.getElementById('kpi-aftersales-sub');
                var kst = document.getElementById('kpi-aftersales-stripe');
                if (kc)  kc.textContent  = n;
                if (ks)  ks.textContent  = n === 1 ? '1 handover pending' : n + ' handovers pending';
                if (kst) kst.style.display = n > 0 ? 'block' : 'none';
            })(nPending);

            if (!items.length) {
                body.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px 0;color:#94a3b8;"><span style="font-size:40px;margin-bottom:12px;">&#10004;</span><span style="font-size:16px;font-weight:700;color:#334155;">' + (status==='Pending'?'All clear \u2014 no pending handovers!':'No records found.') + '</span></div>';
                return;
            }

            var bgPalette = ['#0f172a','#1e3a5f','#7c3aed','#064e3b','#92400e','#1a2e1a','#1e1b4b','#450a0a','#0c4a6e','#3b0764'];

            body.innerHTML = items.map(function(r) {
                var isPending = r.status !== 'Completed';
                var badge = isPending
                    ? '<span style="font-size:10px;font-weight:800;background:#fef3c7;color:#92400e;padding:2px 10px;border-radius:20px;letter-spacing:0.04em;">PENDING</span>'
                    : '<span style="font-size:10px;font-weight:800;background:#d1fae5;color:#047857;padding:2px 10px;border-radius:20px;letter-spacing:0.04em;">COMPLETED</span>';

                var initials = (r.company||'?').replace(/[^A-Za-z0-9\s]/g,' ').trim().split(/\s+/).slice(0,2).map(function(w){return w[0]||'';}).join('').toUpperCase() || '?';
                var avatarBg = bgPalette[initials.charCodeAt(0) % bgPalette.length];

                var machineLabel = r.equipment_model || '';
                var qty          = r.qty ? ' \xd7' + r.qty : '';
                var hDateStr     = r.handover_date ? new Date(r.handover_date).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : 'N/A';
                var dateStr      = r.date_of_sale  ? new Date(r.date_of_sale).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '';

                var safeId = (r.id||'').replace(/[^a-zA-Z0-9\-_]/g,'_');
                var markBtn = isPending
                    ? '<button onclick="event.stopPropagation();window.ftAsMarkComplete(\''+safeId+'\')" style="flex-shrink:0;padding:7px 14px;background:#fff;border:1px solid #e2e8f0;border-radius:8px;font-size:11px;font-weight:800;color:#047857;cursor:pointer;white-space:nowrap;">&#10003; Mark Done</button>'
                    : '';
                var registerBtn = '<button onclick="event.stopPropagation();window.ftAsRegisterMachine(\''+safeId+'\')" style="flex-shrink:0;padding:7px 14px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;font-size:11px;font-weight:800;color:#1d4ed8;cursor:pointer;white-space:nowrap;">&#43; Fleetrack</button>';
                var actionBtns = '<div style="display:flex;flex-direction:column;gap:5px;flex-shrink:0;align-items:flex-end;">' + registerBtn + markBtn + '</div>';

                return '<div class="ftas-row" onclick="window.ftAsOpenModal(\''+safeId+'\')" style="display:flex;align-items:center;padding:14px 20px;border-bottom:1px solid #f1f5f9;gap:14px;cursor:pointer;transition:background .12s;" onmouseenter="this.style.background=\'#f8fafc\'" onmouseleave="this.style.background=\'\'">' +
                    '<div style="width:46px;height:46px;border-radius:12px;background:'+avatarBg+';color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:900;flex-shrink:0;">'+initials+'</div>' +
                    '<div style="flex:1;min-width:0;">' +
                        '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px;">' +
                            '<span style="font-size:15px;font-weight:900;color:#0f172a;">'+(r.company||'Unknown')+'</span>' +
                            badge +
                        '</div>' +
                        (machineLabel ? '<div style="font-size:13px;font-weight:700;color:#334155;margin-bottom:4px;">'+machineLabel+qty+'</div>' : '') +
                        '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">' +
                            (dateStr ? '<span style="font-size:11px;color:#64748b;">&#128197; '+dateStr+'</span>' : '') +
                            (r.raw_status ? '<span style="font-size:11px;color:#64748b;">'+r.raw_status+'</span>' : '') +
                        '</div>' +
                    '</div>' +
                    '<div style="text-align:right;flex-shrink:0;min-width:130px;">' +
                        '<div style="font-size:12px;font-weight:700;color:#3b82f6;margin-bottom:3px;">Handover: '+hDateStr+'</div>' +
                        (r.order_id ? '<div style="font-size:10px;color:#94a3b8;font-family:monospace;">'+r.order_id+'</div>' : '') +
                    '</div>' +
                    actionBtns +
                '</div>';
            }).join('');
        };

        /* ── Open detail modal ── */
        window.ftAsOpenModal = function(safeId) {
            var rec = _records.find(function(r){return (r.id||'').replace(/[^a-zA-Z0-9\-_]/g,'_') === safeId;});
            if (!rec) return;
            var raw = rec._raw || {};

            /* Remove existing modal */
            var existing = document.getElementById('ftas-modal');
            if (existing) existing.remove();

            var isPending = rec.status !== 'Completed';
            var hDate  = rec.handover_date  ? new Date(rec.handover_date).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '—';
            var oDate  = rec.date_of_sale   ? new Date(rec.date_of_sale).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})  : '—';
            var modDate= raw.modified ? new Date(raw.modified).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—';

            function field(label, value, accent) {
                if (!value) return '';
                return '<div style="padding:14px 0;border-bottom:1px solid #f1f5f9;">' +
                    '<div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.07em;margin-bottom:4px;">'+label+'</div>' +
                    '<div style="font-size:14px;font-weight:700;color:'+(accent||'#0f172a')+';">'+value+'</div>' +
                '</div>';
            }

            var safeOid = (rec.order_id||'').replace(/[^a-zA-Z0-9\-_]/g,'_');
            var modal = document.createElement('div');
            modal.id = 'ftas-modal';
            modal.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(15,23,42,0.55);backdrop-filter:blur(4px);';
            modal.innerHTML =
                '<div style="background:#fff;border-radius:20px;width:520px;max-width:96vw;max-height:90vh;overflow-y:auto;box-shadow:0 24px 80px rgba(0,0,0,0.22);display:flex;flex-direction:column;">' +
                    /* Header */
                    '<div style="padding:24px 28px 20px;border-bottom:1px solid #f1f5f9;display:flex;align-items:flex-start;gap:16px;">' +
                        '<div style="width:56px;height:56px;border-radius:14px;background:#0f172a;color:#fff;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:900;flex-shrink:0;">' +
                            (rec.company||'?').replace(/[^A-Za-z0-9\s]/g,' ').trim().split(/\s+/).slice(0,2).map(function(w){return w[0]||'';}).join('').toUpperCase() +
                        '</div>' +
                        '<div style="flex:1;">' +
                            '<div style="font-size:20px;font-weight:900;color:#0f172a;margin-bottom:4px;">'+(rec.company||'Unknown Customer')+'</div>' +
                            '<div style="font-size:13px;color:#64748b;font-family:monospace;">'+(rec.order_id||'')+'</div>' +
                            '<div style="margin-top:8px;">' +
                                (isPending
                                    ? '<span style="font-size:11px;font-weight:800;background:#fef3c7;color:#92400e;padding:3px 12px;border-radius:20px;">PENDING</span>'
                                    : '<span style="font-size:11px;font-weight:800;background:#d1fae5;color:#047857;padding:3px 12px;border-radius:20px;">COMPLETED</span>') +
                                '&nbsp;<span style="font-size:11px;color:#94a3b8;margin-left:4px;">'+(rec.raw_status||'')+'</span>' +
                            '</div>' +
                        '</div>' +
                        '<button onclick="document.getElementById(\'ftas-modal\').remove()" style="background:none;border:none;font-size:22px;color:#94a3b8;cursor:pointer;line-height:1;padding:0;margin:-4px -4px 0 0;">&times;</button>' +
                    '</div>' +
                    /* Body fields */
                    '<div style="padding:4px 28px 20px;">' +
                        field('Machine / Model',   rec.equipment_model || (raw.machine_label || raw.machine || '')) +
                        field('Quantity',           rec.qty ? rec.qty + ' unit' + (rec.qty > 1 ? 's' : '') : '') +
                        field('Order Date',         oDate) +
                        field('Target Handover',    hDate, '#3b82f6') +
                        field('Order Status',       rec.raw_status) +
                        field('Salesperson',        rec.salesperson) +
                        field('Chassis / Serial',   rec.chassis_number) +
                        field('OEM / Brand',        rec.oem) +
                        field('Last Modified',      modDate, '#64748b') +
                    '</div>' +
                    /* Actions */
                    '<div style="padding:16px 28px 24px;border-top:1px solid #f1f5f9;display:flex;gap:10px;justify-content:flex-end;">' +
                        (isPending
                            ? '<button onclick="window.ftAsMarkComplete(\''+safeOid+'\');document.getElementById(\'ftas-modal\').remove();" style="padding:10px 22px;background:#047857;color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:800;cursor:pointer;">&#10003; Mark as Completed</button>'
                            : '<button onclick="window.ftAsMarkPending(\''+safeOid+'\');document.getElementById(\'ftas-modal\').remove();" style="padding:10px 22px;background:#f59e0b;color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:800;cursor:pointer;">&#8635; Mark as Pending</button>') +
                        '<button onclick="document.getElementById(\'ftas-modal\').remove()" style="padding:10px 22px;background:#f1f5f9;color:#334155;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;">Close</button>' +
                    '</div>' +
                '</div>';

            /* Close on backdrop click */
            modal.addEventListener('click', function(e){ if (e.target === modal) modal.remove(); });
            document.body.appendChild(modal);
        };

        /* ── Mark as completed ── */
        window.ftAsMarkComplete = function(safeId) {
            var rec = _records.find(function(r){return (r.id||'').replace(/[^a-zA-Z0-9\-_]/g,'_') === safeId;});
            if (!rec) return;
            rec.status = 'Completed';
            localStorage.setItem('ftas_status_' + rec.id, 'Completed');
            window.ftAsRender();
            if (window.showToast) window.showToast('Marked as completed.', 'ok', 2500);
        };

        /* ── Mark back as pending ── */
        window.ftAsMarkPending = function(safeId) {
            var rec = _records.find(function(r){return (r.id||'').replace(/[^a-zA-Z0-9\-_]/g,'_') === safeId;});
            if (!rec) return;
            rec.status = 'Pending';
            localStorage.removeItem('ftas_status_' + rec.id);
            window.ftAsRender();
            if (window.showToast) window.showToast('Moved back to pending.', 'ok', 2500);
        };

        /* ── Register machine in Fleetrack Supabase ── */
        window.ftAsRegisterMachine = function(safeId) {
            var rec = _records.find(function(r){ return (r.id||'').replace(/[^a-zA-Z0-9\-_]/g,'_') === safeId; });
            if (!rec) return;

            /* Auto-generate a name from chassis / model */
            var yr  = new Date().getFullYear();
            var snB = (rec.chassis_number||'').replace(/[^A-Za-z0-9]/g,'').substring(0,10).toUpperCase();
            var autoName = snB ? 'FT-'+yr+'-'+snB : 'FT-'+yr+'-'+Date.now().toString(36).toUpperCase();

            /* Pre-fill form */
            var f = function(id, val) { var el=document.getElementById(id); if(el) el.value = val||''; };
            f('ftas-reg-name',         autoName);
            f('ftas-reg-model',        rec.equipment_model);
            f('ftas-reg-oem',          rec.oem);
            f('ftas-reg-customer',     rec.company);
            f('ftas-reg-sn',           rec.chassis_number);
            f('ftas-reg-chassis',      rec.chassis_number);
            f('ftas-reg-fleet',        '');
            f('ftas-reg-type',         '');
            f('ftas-reg-handover',     rec.handover_date ? rec.handover_date.substring(0,10) : '');
            f('ftas-reg-epr',          rec.date_of_sale  ? rec.date_of_sale.substring(0,10)  : '');
            f('ftas-reg-notes',        'Registered via Aftersales Hub. Order: '+(rec.order_id||''));
            var chk = document.getElementById('ftas-reg-managed'); if(chk) chk.checked = true;
            var err = document.getElementById('ftas-reg-error');   if(err) err.style.display='none';

            /* Store safeId on modal for submit */
            var m = document.getElementById('ftas-register-modal');
            if(m) { m.dataset.safeId = safeId; m.style.display='flex'; }
        };

        window.ftAsCloseRegister = function() {
            var m = document.getElementById('ftas-register-modal');
            if(m) m.style.display='none';
        };

        window.ftAsRegisterSubmit = async function() {
            var g = function(id) { var el=document.getElementById(id); return el ? el.value.trim() : ''; };
            var name     = g('ftas-reg-name');
            var model    = g('ftas-reg-model');
            var customer = g('ftas-reg-customer');
            var sn       = g('ftas-reg-sn');
            var err      = document.getElementById('ftas-reg-error');
            var btn      = document.getElementById('ftas-reg-submit-btn');

            if (!name)  { if(err){err.textContent='Machine ID is required.'; err.style.display='block';} return; }
            if (!model) { if(err){err.textContent='Model is required.'; err.style.display='block';} return; }
            if(err) err.style.display='none';

            var payload = {
                name:           name,
                model:          g('ftas-reg-model'),
                oem:            g('ftas-reg-oem'),
                customer:       customer,
                sn:             sn,
                chassis_number: g('ftas-reg-chassis'),
                fleet_no:       g('ftas-reg-fleet'),
                type:           g('ftas-reg-type'),
                handover_date:  g('ftas-reg-handover') || null,
                epr_entry_date: g('ftas-reg-epr')      || null,
                notes:          g('ftas-reg-notes'),
                fleetrack_managed: document.getElementById('ftas-reg-managed') ? document.getElementById('ftas-reg-managed').checked : true,
                created_at:     new Date().toISOString(),
                updated_at:     new Date().toISOString()
            };

            if(btn){ btn.textContent='Registering…'; btn.disabled=true; }

            try {
                if (!window.supabase) throw new Error('Supabase client not available — ensure the app is connected.');
                var result = await window.supabase.from('ft_machine').upsert([payload]);
                if (result.error) throw new Error(result.error.message);

                window.ftAsCloseRegister();
                if (window.showToast) window.showToast('\u2714 Machine registered in Fleetrack: '+name, 'ok', 4000);

                /* Optionally mark the record as done */
                var m = document.getElementById('ftas-register-modal');
                var sid = m ? m.dataset.safeId : null;
                if (sid && confirm('Machine registered! Mark this handover as Complete?')) {
                    window.ftAsMarkComplete(sid);
                }
            } catch(e) {
                if(err){ err.textContent='Failed: '+e.message; err.style.display='block'; }
            } finally {
                if(btn){ btn.textContent='Register Machine'; btn.disabled=false; }
            }
        };

        /* Close modal on backdrop click */
        (function(){
            var m = document.getElementById('ftas-register-modal');
            if(m) m.addEventListener('click', function(e){ if(e.target===m) window.ftAsCloseRegister(); });
        })();

    })();

})();

//  USER MANAGEMENT MODULE — Admin only
// ══════════════════════════════════════════════════════════
(function() {

  const SUPER_ADMIN_EMAILS = ['takunda@industrial-exchange.group', 'zaranyika.rt@gmail.com'];
  let UM_USERS = [];

  function isSuperAdmin(u) { return u.email && SUPER_ADMIN_EMAILS.some(e => e.toLowerCase() === u.email.toLowerCase()); }
  function isAdmin(u) { return isSuperAdmin(u) || u.app_metadata?.role === 'admin'; }

  // ── Show nav item for admin/super-admin ──────────────────
  function initAdminFeatures(email) {
    if (!email) return;
    if (SUPER_ADMIN_EMAILS.some(e => e.toLowerCase() === email.toLowerCase())) {
      const ddItem = document.getElementById('dd-user-mgmt-item');
      if (ddItem) ddItem.style.display = '';
    }
  }
  window.initAdminFeatures = initAdminFeatures;

  // ── Show nav item — robust 3-layer detection ─────────────
  function revealUserMgmtNav() {
    var el = document.getElementById('dd-user-mgmt-item');
    if (el) el.style.display = '';
  }

  function getEmailFromJwt(token) {
    try {
      var b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      var payload = JSON.parse(atob(b64));
      return payload.email || null;
    } catch(e) { return null; }
  }

  function checkCurrentUserIsAdmin(email) {
    if (!email) return false;
    return SUPER_ADMIN_EMAILS.some(e => e.toLowerCase() === email.toLowerCase());
  }

  // Run immediately (scripts at bottom of body, DOM already parsed)
  (function checkAdminOnLoad() {
    console.log('[UserMgmt] Checking admin status...');
    console.log('[UserMgmt] localStorage keys:', Object.keys(localStorage));

    // Layer 1: ft_user_email in localStorage
    var email1 = localStorage.getItem('ft_user_email') || '';
    console.log('[UserMgmt] ft_user_email:', email1);
    if (email1 && checkCurrentUserIsAdmin(email1)) { revealUserMgmtNav(); console.log('[UserMgmt] Revealed via ft_user_email'); return; }

    // Layer 2: decode the Supabase JWT from supabase_access_token
    var token = localStorage.getItem('supabase_access_token') || '';
    if (token) {
      var email2 = getEmailFromJwt(token);
      console.log('[UserMgmt] JWT email:', email2);
      if (email2 && checkCurrentUserIsAdmin(email2)) { revealUserMgmtNav(); console.log('[UserMgmt] Revealed via JWT'); return; }
    }

    // Layer 3: scan ALL localStorage values for Supabase session JSON (sb-*-auth-token)
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        var val = localStorage.getItem(key) || '';
        // Check if it's a JSON session object containing user.email
        if (val.indexOf('"email"') !== -1 || SUPER_ADMIN_EMAILS.some(e => val.indexOf(e) !== -1)) {
          console.log('[UserMgmt] Found admin email hint in key:', key);
          // Try to parse as JSON session
          try {
            var parsed = JSON.parse(val);
            var foundEmail = (parsed.user && parsed.user.email)
              || (parsed.email)
              || (parsed.session && parsed.session.user && parsed.session.user.email)
              || '';
            if (foundEmail && checkCurrentUserIsAdmin(foundEmail)) { revealUserMgmtNav(); console.log('[UserMgmt] Revealed via localStorage scan'); return; }
          } catch(pe) {
            // Plain string match
            if (SUPER_ADMIN_EMAILS.some(e => val.toLowerCase().indexOf(e.toLowerCase()) !== -1)) {
              revealUserMgmtNav(); console.log('[UserMgmt] Revealed via plain string match'); return;
            }
          }
        }
      }
    } catch(e) { console.warn('[UserMgmt] localStorage scan error:', e); }

    // Layer 4: async IPC session check
    if (window.electron && window.electron.invoke) {
      console.log('[UserMgmt] Trying IPC getSession...');
      window.electron.invoke('supabase:getSession').then(function(sess) {
        console.log('[UserMgmt] IPC session result:', sess);
        if (sess && sess.ok && sess.session && sess.session.user) {
          if (checkCurrentUserIsAdmin(sess.session.user.email || '')) { revealUserMgmtNav(); console.log('[UserMgmt] Revealed via IPC'); }
        }
      }).catch(function(e){ console.warn('[UserMgmt] IPC error:', e); });
    }
  })();

  // ── Load users ───────────────────────────────────────────
  async function loadUserMgmt() {
    const tbody = document.getElementById('um-tbody');
    const counter = document.getElementById('um-counter');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:32px;color:#94a3b8;">Loading users…</td></tr>';
    try {
      const res = await window.electron.invoke('supabase:auth', { action: 'listUsers' });
      if (!res?.ok) throw new Error(res?.error || 'Failed to list users');
      UM_USERS = res.users || [];
      if (counter) counter.textContent = UM_USERS.length + ' user' + (UM_USERS.length !== 1 ? 's' : '');
      renderUserTable(UM_USERS);
    } catch(e) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:32px;color:#ef4444;">Error: ' + e.message + '</td></tr>';
    }
  }
  window.loadUserMgmt = loadUserMgmt;

  function renderUserTable(users) {
    const tbody = document.getElementById('um-tbody');
    if (!tbody) return;
    if (!users.length) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:32px;color:#94a3b8;">No users found.</td></tr>';
      return;
    }
    tbody.innerHTML = users.map(function(u) {
      const banned    = u.banned_until && new Date(u.banned_until) > new Date();
      const confirmed = !!(u.confirmed_at || u.email_confirmed_at);
      const lastSign  = u.last_sign_in_at
        ? new Date(u.last_sign_in_at).toLocaleDateString('en-ZA', {day:'2-digit',month:'short',year:'numeric'})
        : 'Never';
      const sa  = isSuperAdmin(u);
      const adm = isAdmin(u);
      const ini = (u.email ? u.email[0] : '?').toUpperCase();
      const id  = u.id || '';
      const em  = u.email || '—';

      const roleBadge = sa
        ? '<span style="font-size:10px;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;border-radius:4px;padding:2px 6px;margin-left:5px;">⭐ Super Admin</span>'
        : adm
          ? '<span style="font-size:10px;background:#6366f1;color:#fff;border-radius:4px;padding:2px 6px;margin-left:5px;">Admin</span>'
          : '';

      const avatarStyle = sa
        ? 'background:linear-gradient(135deg,#f59e0b,#d97706);'
        : adm ? '' : 'background:linear-gradient(135deg,#64748b,#475569);';

      const setPwBtn  = '<button class="um-btn um-btn-setpw" onclick="openSetPasswordModal(\'' + id + '\',\'' + em + '\')" title="Set password directly"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Set Password</button>';
      const emailBtn  = '<button class="um-btn um-btn-reset" onclick="resetUserPassword(\'' + em + '\',\'' + id + '\')" title="Send reset email"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg> Email Reset</button>';
      const suspBtn   = sa ? '<span style="font-size:11px;color:#94a3b8;font-style:italic;">Protected</span>'
        : !banned
          ? '<button class="um-btn um-btn-suspend" onclick="suspendUser(\'' + id + '\',\'' + em + '\')">⛔ Suspend</button>'
          : '<button class="um-btn um-btn-unsuspend" onclick="unsuspendUser(\'' + id + '\',\'' + em + '\')">✓ Unsuspend</button>';
      const roleBtn   = sa ? ''
        : adm
          ? '<button class="um-btn um-btn-demote" onclick="removeAdmin(\'' + id + '\',\'' + em + '\')">↓ Remove Admin</button>'
          : '<button class="um-btn um-btn-promote" onclick="makeAdmin(\'' + id + '\',\'' + em + '\')">↑ Make Admin</button>';
      const delBtn    = sa ? '' : '<button class="um-btn um-btn-delete" onclick="deleteUser(\'' + id + '\',\'' + em + '\')">🗑 Delete</button>';

      return '<tr class="um-row' + (sa ? ' um-row-superadmin' : '') + '" data-id="' + id + '">'
        + '<td><div style="display:flex;align-items:center;gap:10px;">'
        +   '<div class="um-avatar" style="' + avatarStyle + '">' + ini + '</div>'
        +   '<div><div style="font-weight:600;font-size:13px;color:#1e293b;">' + em + roleBadge + '</div>'
        +   '<div style="font-size:11px;color:#94a3b8;font-family:monospace;">' + id.substring(0,8) + '…</div></div>'
        + '</div></td>'
        + '<td><span class="um-badge um-badge-' + (confirmed ? 'confirmed' : 'pending') + '">' + (confirmed ? '✓ Confirmed' : '⏳ Pending') + '</span></td>'
        + '<td><span class="um-badge um-badge-' + (banned ? 'suspended' : 'active') + '">' + (banned ? '⛔ Suspended' : '● Active') + '</span></td>'
        + '<td style="font-size:12px;color:#64748b;">' + lastSign + '</td>'
        + '<td><div style="display:flex;gap:5px;flex-wrap:wrap;">' + setPwBtn + emailBtn + roleBtn + suspBtn + delBtn + '</div></td>'
        + '</tr>';
    }).join('');
  }

  window.filterUserTable = function(q) {
    const f = q ? UM_USERS.filter(function(u){ return u.email && u.email.toLowerCase().indexOf(q.toLowerCase()) !== -1; }) : UM_USERS;
    renderUserTable(f);
    const c = document.getElementById('um-counter');
    if (c) c.textContent = f.length + ' user' + (f.length !== 1 ? 's' : '');
  };

  // ── Create / Invite modal ──────────────────────────────
  window.openUserMgmtModal = function() {
    var m = document.getElementById('um-create-modal');
    if (!m) return;
    document.getElementById('um-new-email').value = '';
    document.getElementById('um-new-password').value = '';
    document.getElementById('um-modal-error').textContent = '';
    document.getElementById('um-modal-success').textContent = '';
    m.style.display = 'flex';
    setTimeout(function(){ document.getElementById('um-new-email').focus(); }, 100);
  };
  window.closeUserMgmtModal = function() {
    var m = document.getElementById('um-create-modal');
    if (m) m.style.display = 'none';
  };
  window.submitCreateUser = async function() {
    var email = document.getElementById('um-new-email').value.trim();
    var pw    = document.getElementById('um-new-password').value.trim();
    var errEl = document.getElementById('um-modal-error');
    var sucEl = document.getElementById('um-modal-success');
    var btn   = document.getElementById('um-create-btn');
    errEl.textContent = ''; sucEl.textContent = '';
    if (!email) { errEl.textContent = 'Email is required.'; return; }
    if (pw && pw.length < 8) { errEl.textContent = 'Password must be at least 8 characters.'; return; }
    btn.disabled = true; btn.textContent = 'Creating…';
    try {
      var res = await window.electron.invoke('supabase:createUser', { 
        email: email, 
        password: pw || 'ChangeMe123!', 
        is_admin: false, 
        systems: ['fleetrack'] 
      });
      if (!res?.ok) throw new Error(res?.error);
      sucEl.textContent = 'User created successfully!';
      sucEl.textContent = '✓ ' + email + ' created! ' + (pw ? 'Password set.' : 'Invite email sent.');
      setTimeout(function(){ closeUserMgmtModal(); loadUserMgmt(); }, 2000);
    } catch(e) { errEl.textContent = e.message; }
    finally { btn.disabled = false; btn.textContent = 'Create User'; }
  };

  // ── Set Password Directly modal ────────────────────────
  window.openSetPasswordModal = function(userId, email) {
    document.getElementById('um-setpw-userid').value = userId;
    document.getElementById('um-setpw-email-label').textContent = email;
    document.getElementById('um-setpw-new').value = '';
    document.getElementById('um-setpw-confirm').value = '';
    document.getElementById('um-setpw-error').textContent = '';
    document.getElementById('um-setpw-success').textContent = '';
    document.getElementById('um-setpw-modal').style.display = 'flex';
    setTimeout(function(){ document.getElementById('um-setpw-new').focus(); }, 100);
  };
  window.closeSetPasswordModal = function() {
    document.getElementById('um-setpw-modal').style.display = 'none';
  };
  window.submitSetPassword = async function() {
    var userId = document.getElementById('um-setpw-userid').value;
    var pw1    = document.getElementById('um-setpw-new').value;
    var pw2    = document.getElementById('um-setpw-confirm').value;
    var errEl  = document.getElementById('um-setpw-error');
    var sucEl  = document.getElementById('um-setpw-success');
    var btn    = document.getElementById('um-setpw-btn');
    errEl.textContent = ''; sucEl.textContent = '';
    if (!pw1)           { errEl.textContent = 'Password is required.'; return; }
    if (pw1.length < 8) { errEl.textContent = 'Minimum 8 characters.'; return; }
    if (pw1 !== pw2)    { errEl.textContent = 'Passwords do not match.'; return; }
    btn.disabled = true; btn.textContent = 'Setting…';
    try {
      var res = await window.electron.invoke('supabase:auth', { action: 'setPasswordDirect', userId: userId, password: pw1 });
      if (!res?.ok) throw new Error(res?.error || 'Failed');
      sucEl.textContent = '✓ Password updated successfully.';
      setTimeout(function(){ closeSetPasswordModal(); }, 1800);
    } catch(e) { errEl.textContent = e.message; }
    finally { btn.disabled = false; btn.textContent = 'Set Password'; }
  };

  // ── Email reset ────────────────────────────────────────
  window.resetUserPassword = async function(email, userId) {
    if (!confirm('Send a password reset email to ' + email + '?')) return;
    try {
      var res = await window.electron.invoke('supabase:auth', { action: 'resetPassword', email: email });
      if (!res?.ok) throw new Error(res?.error);
      showToast('✓ Reset email sent to ' + email, 'ok', 4000);
    } catch(e) { showToast('Failed: ' + e.message, 'error', 5000); }
  };

  // ── Make / Remove admin ────────────────────────────────
  window.makeAdmin = async function(userId, email) {
    if (!confirm('Grant admin privileges to ' + email + '?\n\nThey will be able to manage users.')) return;
    try {
      var res = await window.electron.invoke('supabase:auth', { action: 'makeAdmin', userId: userId });
      if (!res?.ok) throw new Error(res?.error || 'Failed');
      showToast('↑ ' + email + ' is now an Admin.', 'ok', 4000);
      loadUserMgmt();
    } catch(e) { showToast('Failed: ' + e.message, 'error', 5000); }
  };
  window.removeAdmin = async function(userId, email) {
    if (!confirm('Remove admin privileges from ' + email + '?')) return;
    try {
      var res = await window.electron.invoke('supabase:auth', { action: 'removeAdmin', userId: userId });
      if (!res?.ok) throw new Error(res?.error || 'Failed');
      showToast('↓ ' + email + ' is now a regular user.', 'warn', 4000);
      loadUserMgmt();
    } catch(e) { showToast('Failed: ' + e.message, 'error', 5000); }
  };

  // ── Suspend / Unsuspend ────────────────────────────────
  window.suspendUser = async function(userId, email) {
    if (!confirm('Suspend account for ' + email + '?\n\nThey won\'t be able to log in.')) return;
    try {
      var res = await window.electron.invoke('supabase:auth', { action: 'suspendUser', userId: userId });
      if (!res?.ok) throw new Error(res?.error || 'Suspend failed');
      showToast('⛔ ' + email + ' suspended.', 'warn', 4000);
      loadUserMgmt();
    } catch(e) { showToast('Failed: ' + e.message, 'error', 5000); }
  };
  window.unsuspendUser = async function(userId, email) {
    if (!confirm('Restore access for ' + email + '?')) return;
    try {
      var res = await window.electron.invoke('supabase:auth', { action: 'unsuspendUser', userId: userId });
      if (!res?.ok) throw new Error(res?.error || 'Unsuspend failed');
      showToast('✓ ' + email + ' unsuspended.', 'ok', 4000);
      loadUserMgmt();
    } catch(e) { showToast('Failed: ' + e.message, 'error', 5000); }
  };

  // ── Delete ────────────────────────────────────────────
  window.deleteUser = async function(userId, email) {
    if (!confirm('PERMANENTLY delete user ' + email + '?\n\nThis cannot be undone.')) return;
    if (!confirm('Second confirmation: delete ' + email + '?')) return;
    try {
      var res = await window.electron.invoke('supabase:auth', { action: 'deleteUser', userId: userId });
      if (!res?.ok) throw new Error(res?.error || 'Delete failed');
      showToast('🗑 ' + email + ' deleted.', 'warn', 4000);
      loadUserMgmt();
    } catch(e) { showToast('Failed: ' + e.message, 'error', 5000); }
  };

  // Load when view shown
  var _origSV = window.showView;
  if (typeof _origSV === 'function') {
    window.showView = function(viewId) {
      _origSV(viewId);
      if (viewId === 'view-user-mgmt') loadUserMgmt();
    };
  }

})();



(function MigrationModal() {
  window.openMigrationModal = function() {
    // Pre-populate counts from current state
    var machines = window.FT_MACHINE_ROWS || [];
    var imgCount = machines.filter(function(m) {
      return m.machine_picture && !m.machine_picture.includes('supabase.co/storage');
    }).length;
    var libCount = 0;
    var cache = window.FT_MACHINE_DETAIL_CACHE || {};
    Object.values(cache).forEach(function(m) {
      if (!window.LIB_FIELDS) return;
      window.LIB_FIELDS.forEach(function(f) {
        var field = f[1];
        var val = m[field];
        if (!val) return;
        var sbUrl = (window.LIB_SUPABASE_MAP && window.LIB_SUPABASE_MAP[m.name] && window.LIB_SUPABASE_MAP[m.name][field]) || '';
        if (!sbUrl || !sbUrl.includes('supabase.co/storage')) libCount++;
      });
    });

    var el = function(id, v) { var e = document.getElementById(id); if (e) e.textContent = v; };
    el('mig-count-machines', machines.length);
    el('mig-count-images', imgCount + ' pending');
    el('mig-count-lib', libCount + ' pending (from loaded)');
    el('mig-progress-label', 'Ready to start');
    el('mig-progress-pct', '0%');
    el('mig-stat', '');
    var bar = document.getElementById('mig-progress-bar');
    if (bar) bar.style.width = '0%';
    var log = document.getElementById('mig-log');
    if (log) log.innerHTML = '';
    var startBtn = document.getElementById('mig-start-btn');
    if (startBtn) { startBtn.disabled = false; startBtn.textContent = 'Start Migration'; startBtn.style.background = 'linear-gradient(135deg,#7c3aed,#6d28d9)'; }

    document.getElementById('mig-overlay').style.display = 'flex';
  };

  window.closeMigrationModal = function() {
    document.getElementById('mig-overlay').style.display = 'none';
  };

  document.getElementById('mig-overlay').addEventListener('click', function(e) {
    if (e.target === this) closeMigrationModal();
  });
})();


// ══════════════════════════════════════════════════════════
//  ADD / EDIT MACHINE MODAL
// ══════════════════════════════════════════════════════════
(function AddMachineMod() {

  var AM_EDIT_MODE = false;
  var AM_EDIT_NAME = '';
  var AM_CURRENT_STEP = 1;

  // Library file slots: [label, supabase_key, accept_mime, accept_attr]
  var AM_LIB_FIELDS = [
    ['Filters List',          'filters_list',              'application/pdf,image/*', '.pdf,.jpg,.jpeg,.png,.webp'],
    ['PDI Checklist',        'pdi_checklist',             'application/pdf,image/*', '.pdf,.jpg,.jpeg,.png,.webp'],
    ['Equipment Info Form',  'equipment_information_form','application/pdf,image/*', '.pdf,.jpg,.jpeg,.png,.webp'],
    ['Belt Dimensions',      'belt_dimensions',           'application/pdf,image/*', '.pdf,.jpg,.jpeg,.png,.webp'],
    ['Hyd. Filters Dim.',    'hyd_filters_dimensions',    'application/pdf,image/*', '.pdf,.jpg,.jpeg,.png,.webp'],
    ['Wty. Certificate',     'wty_certificate',           'application/pdf,image/*', '.pdf,.jpg,.jpeg,.png,.webp'],
    ['NEI Checklist',        'nei_checklist',             'application/pdf,image/*', '.pdf,.jpg,.jpeg,.png,.webp'],
    ['Machine Data Plate',   'machine_data_plate',        'application/pdf,image/*', '.pdf,.jpg,.jpeg,.png,.webp'],
    ['Engine Data Plate',    'engine_data_plate',         'application/pdf,image/*', '.pdf,.jpg,.jpeg,.png,.webp'],
    ['RPC List',             'rpc_list',                  'application/pdf,image/*', '.pdf,.jpg,.jpeg,.png,.webp'],
    ['Parts Manuals',        'parts_manuals',             'application/pdf,image/*', '.pdf,.jpg,.jpeg,.png,.webp'],
    ['Parts Manuals 2',      'parts_manuals_2',           'application/pdf,image/*', '.pdf,.jpg,.jpeg,.png,.webp'],
    ['Parts Manuals 3',      'parts_manuals_3',           'application/pdf,image/*', '.pdf,.jpg,.jpeg,.png,.webp'],
    ['Misc Files',           'misc_files',                'application/zip,application/x-zip-compressed', '.zip'],
  ];

  // ── Build library grid ──────────────────────────────────
  // existingUrls = LIB_SUPABASE_MAP entry, fullDoc = raw machine doc (has Frappe file paths too)
  function buildLibGrid(existingUrls, fullDoc) {
    var grid = document.getElementById('am-lib-grid');
    if (!grid) return;
    grid.innerHTML = AM_LIB_FIELDS.map(function(f) {
      var label = f[0], key = f[1], accept = f[3];
      var isMisc = key === 'misc_files';
      var icon = isMisc ? '🗜️' : '📄';
      var hint = isMisc ? 'ZIP archive' : 'PDF or Image';

      // Resolve best URL: Supabase first, then Frappe path via getLibraryUrl helper
      var existUrl = '';
      if (existingUrls && existingUrls[key]) {
        existUrl = existingUrls[key];
      } else if (fullDoc && fullDoc[key] && typeof window.getLibraryUrl === 'function') {
        existUrl = window.getLibraryUrl(fullDoc.name || '', key, fullDoc[key]) || '';
      } else if (fullDoc && fullDoc[key]) {
        // Raw Frappe path fallback
        var raw = String(fullDoc[key]).trim();
        if (raw) existUrl = raw.startsWith('http') ? raw : ((typeof FLEET_BASE_URL !== 'undefined' ? FLEET_BASE_URL : '') + raw);
      }

      var existHtml = existUrl
        ? '<div class="am-lib-existing"><span style="color:#16a34a;">✓</span> Existing — <a href="' + existUrl + '" target="_blank" style="color:#6366f1;text-decoration:underline;">View</a> &nbsp;<span style="color:#94a3b8;">(upload to replace)</span></div>'
        : '<div class="am-lib-existing" style="color:#94a3b8;">— No file uploaded yet</div>';

      return '<div class="am-lib-item">'
        + '<div class="am-lib-item-label">' + icon + ' ' + label + '</div>'
        + '<div class="am-lib-dropzone">'
        + '<input type="file" data-libkey="' + key + '" accept="' + accept + '" onchange="amLibFileChosen(this)" />'
        + '<div style="font-size:11px;color:#94a3b8;">' + hint + ' — click to upload</div>'
        + '</div>'
        + '<div id="am-lib-preview-' + key + '" style="font-size:11px;color:#16a34a;margin-top:5px;display:none;"></div>'
        + existHtml
        + '</div>';
    }).join('');
  }

  // ── Populate Model Datalist ─────────────────────────────
  function buildModelList() {
    var dl = document.getElementById('am-model-list');
    if (!dl) return;
    window.AM_MODELS_MAP = {};
    for (var key in window.MACHINES_MAP) {
      var m = window.MACHINES_MAP[key];
      if (m.model && m.model.trim()) {
        window.AM_MODELS_MAP[m.model.trim()] = m.oem || '';
      }
    }
    var html = '';
    for (var mod in window.AM_MODELS_MAP) {
      html += '<option value="' + mod + '">';
    }
    dl.innerHTML = html;
  }

  // ── OEM Auto-fill from Model ──────────────────────────────
  window.amModelAutofillOem = function(val) {
    if (!val || !window.AM_MODELS_MAP) return;
    var trimmed = val.trim();
    if (window.AM_MODELS_MAP[trimmed]) {
      var oemField = document.getElementById('am-f-oem');
      var hint = document.getElementById('am-model-hint');
      if (oemField && !oemField.value) {
        oemField.value = window.AM_MODELS_MAP[trimmed];
        if (hint) { hint.style.display = 'block'; setTimeout(function(){ hint.style.display='none'; }, 3000); }
      }
    }
  };

  // ── Customer Live Search ──────────────────────────────────
  var AM_CUSTOMERS_CACHE = [];

  async function amLoadCustomers() {
    if (AM_CUSTOMERS_CACHE.length > 0) return;
    try {
      var res = await window.electron.invoke('supabase:query', {
        table: 'customers',
        method: 'select',
        params: { columns: 'id, customer_name, territory, account_manager', range: { from: 0, to: 4999 } }
      });
      if (res && res.ok && res.data) {
        AM_CUSTOMERS_CACHE = res.data.sort(function(a,b){ return (a.customer_name||'').localeCompare(b.customer_name||''); });
      }
    } catch(e) { console.warn('Could not load customers', e); }
  }

  window.amShowCustomerDropdown = function() {
    amLoadCustomers().then(function() {
      amFilterCustomers(document.getElementById('am-f-customer').value || '');
    });
  };

  window.amFilterCustomers = function(q) {
    var dd = document.getElementById('am-customer-dropdown');
    if (!dd) return;
    var lower = (q || '').toLowerCase();
    var matches = lower
      ? AM_CUSTOMERS_CACHE.filter(function(c){ return (c.customer_name||'').toLowerCase().includes(lower); })
      : AM_CUSTOMERS_CACHE.slice(0, 40);
    if (matches.length === 0 && lower) {
      dd.innerHTML = '<div style="padding:10px 14px;color:#94a3b8;font-size:12px;">No match — <button type="button" onclick="amOpenNewCustomerModal()" style="color:#1d4ed8;background:none;border:none;cursor:pointer;font-size:12px;font-weight:700;padding:0;">+ Add new customer</button></div>';
      dd.style.display = 'block';
      return;
    }
    var html = matches.slice(0, 50).map(function(c) {
      var safeName = (c.customer_name || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
      var safeTerr = (c.territory || '').replace(/&/g,'&amp;').replace(/</g,'&lt;');
      return '<div class="am-cust-opt" data-custname="' + safeName + '" onclick="amSelectCustomer(this.dataset.custname)" style="padding:9px 14px;cursor:pointer;font-size:13px;font-weight:600;color:#0f172a;border-bottom:1px solid #f1f5f9;" onmouseover="this.style.background=\'#f8fafc\'" onmouseout="this.style.background=\'white\'">'
        + safeName
        + (safeTerr ? '<span style="font-size:11px;color:#64748b;font-weight:400;"> &mdash; ' + safeTerr + '</span>' : '')
        + '</div>';
    }).join('');
    dd.innerHTML = html;
    dd.style.display = matches.length ? 'block' : 'none';
  };

  window.amSelectCustomer = function(name) {
    var inp = document.getElementById('am-f-customer');
    if (inp) inp.value = name;
    var dd = document.getElementById('am-customer-dropdown');
    if (dd) dd.style.display = 'none';
  };

  // Close dropdown when clicking outside
  document.addEventListener('click', function(e) {
    var dd = document.getElementById('am-customer-dropdown');
    var inp = document.getElementById('am-f-customer');
    if (dd && inp && !inp.contains(e.target) && !dd.contains(e.target)) {
      dd.style.display = 'none';
    }
  });

  // ── Add New Customer Modal ────────────────────────────────
  window.amOpenNewCustomerModal = function() {
    document.getElementById('am-new-cust-overlay').style.display = 'flex';
    document.getElementById('am-nc-name').focus();
    // Pre-fill name from whatever was typed
    var typed = (document.getElementById('am-f-customer').value || '').trim();
    if (typed) document.getElementById('am-nc-name').value = typed;
  };

  window.amCloseNewCustomerModal = function() {
    document.getElementById('am-new-cust-overlay').style.display = 'none';
    ['am-nc-name','am-nc-group','am-nc-territory','am-nc-type','am-nc-account-mgr','am-nc-phone','am-nc-email','am-nc-address'].forEach(function(id){
      var el = document.getElementById(id);
      if (el) el.value = '';
    });
    document.getElementById('am-nc-error').textContent = '';
  };

  window.amSaveNewCustomer = async function() {
    var errEl = document.getElementById('am-nc-error');
    errEl.textContent = '';
    var name = (document.getElementById('am-nc-name').value || '').trim();
    if (!name) { errEl.textContent = 'Customer name is required.'; return; }

    var btn = document.getElementById('am-nc-save-btn');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
      var row = {
        customer_name:    name,
        customer_group:   (document.getElementById('am-nc-group').value || '').trim() || null,
        territory:        (document.getElementById('am-nc-territory').value || '').trim() || null,
        customer_type:    document.getElementById('am-nc-type').value || 'Company',
        account_manager:  (document.getElementById('am-nc-account-mgr').value || '').trim() || null,
        phone:            (document.getElementById('am-nc-phone').value || '').trim() || null,
        email_id:         (document.getElementById('am-nc-email').value || '').trim() || null,
        address:          (document.getElementById('am-nc-address').value || '').trim() || null,
        frappe_id:        'MANUAL-' + Date.now(),
        updated_at:       new Date().toISOString()
      };

      var res = await window.electron.invoke('supabase:query', {
        table: 'customers',
        method: 'upsert',
        params: { data: row, options: { onConflict: 'frappe_id' } }
      });
      if (!res || !res.ok) throw new Error(res && res.error ? res.error : 'Failed to save customer');

      // Add to cache
      AM_CUSTOMERS_CACHE.push(Object.assign({}, row));
      AM_CUSTOMERS_CACHE.sort(function(a,b){ return (a.customer_name||'').localeCompare(b.customer_name||''); });

      // Pre-fill the machine form customer field
      amSelectCustomer(name);

      showToast('✓ Customer "' + name + '" created successfully.', 'ok', 4000);
      amCloseNewCustomerModal();
    } catch(e) {
      errEl.textContent = '⚠ ' + e.message;
    } finally {
      btn.disabled = false;
      btn.textContent = 'Save Customer';
    }
  };

  // ── Open helpers ────────────────────────────────────────
  window.openAddMachineModal = function() {
    AM_EDIT_MODE = false;
    AM_EDIT_NAME = '';
    resetForm();
    document.getElementById('am-header-label').innerHTML = 'Add <span class="term-machine">Machine</span>';
    document.getElementById('am-save-label').textContent = 'Create Machine';
    document.getElementById('am-f-name').readOnly = false;
    document.getElementById('am-warning').style.display = 'none';
    buildModelList();
    buildLibGrid(null);
    document.getElementById('am-overlay').style.display = 'flex';
    setTimeout(function(){ document.getElementById('am-f-name').focus(); }, 100);
  };

  window.openEditMachineModal = function(machineName) {
    AM_EDIT_MODE = true;
    AM_EDIT_NAME = machineName;

    // ── Close the machine detail popup so it doesn't sit behind ──
    var mcOverlay = document.getElementById('mc-modal-overlay') || window.mcModalOverlay;
    if (mcOverlay) {
      mcOverlay.classList.add('hidden');
      mcOverlay.style.removeProperty('display');
    }

    resetForm();
    document.getElementById('am-header-label').textContent = 'Edit Machine: ' + machineName;
    document.getElementById('am-save-label').textContent = 'Save Changes';
    document.getElementById('am-f-name').readOnly = true;
    document.getElementById('am-warning').style.display = 'flex';
    document.getElementById('am-error').textContent = '';
    document.getElementById('am-overlay').style.display = 'flex';
    buildModelList();

    // Use MC_CURRENT_MACHINE (full Frappe doc) for richest data, fall back to MACHINES_MAP
    var fullDoc = window.MC_CURRENT_MACHINE || {};
    var m = (fullDoc.name === machineName ? fullDoc : null)
          || (window.MACHINES_MAP && window.MACHINES_MAP[machineName])
          || {};

    if (m.name) fillForm(m);

    // Lib URLs: merge Supabase map with full doc for Frappe-hosted files
    var libUrls = (window.LIB_SUPABASE_MAP && window.LIB_SUPABASE_MAP[machineName]) || {};
    buildLibGrid(libUrls, m);

    // Cover image — use best available URL
    var picField = m.machine_picture || '';
    var picUrl = typeof machineAttachmentLink === 'function'
      ? machineAttachmentLink(picField)
      : (picField.startsWith('http') ? picField : ((typeof FLEET_BASE_URL !== 'undefined' ? FLEET_BASE_URL : '') + picField));
    var imgPrev = document.getElementById('am-img-preview');
    var cur = document.getElementById('am-img-current');
    if (picUrl && picUrl.length > 4) {
      imgPrev.src = picUrl;
      imgPrev.style.display = 'block';
      if (cur) { cur.textContent = '✓ Existing cover image'; cur.style.display = 'block'; }
    } else {
      imgPrev.style.display = 'none';
      if (cur) cur.style.display = 'none';
    }
  };

  window.closeAddMachineModal = function() {
    document.getElementById('am-overlay').style.display = 'none';
    resetForm();
  };

  // ── Reset form ──────────────────────────────────────────
  function resetForm() {
    var ids = ['am-f-name','am-f-model','am-f-oem','am-f-esn','am-f-chassis','am-f-customer',
               'am-f-fleet-no','am-f-mxg-fleet-no','am-f-location','am-f-engine-type','am-f-hmr',
               'am-f-supplier','am-f-gearbox','am-f-bin','am-f-fuel','am-f-weight','am-f-voltage',
               'am-f-tyre','am-f-attachments','am-f-tsn','am-f-wty-period','am-f-wty-hrs',
               'am-f-handover','am-f-expiry','am-f-notes','am-f-is-type','am-f-start-hmr',
               'am-f-total-run-hrs','am-f-last-hmr-date','am-f-svc-interval','am-f-last-svc-hmr',
               'am-f-next-svc-hmr','am-f-last-svc-type','am-f-next-svc-type','am-f-hrs-rem',
               'am-f-last-svc-date','am-f-chain-make','am-f-chain-len','am-f-chain-wid',
               'am-f-sprok-lhs-t','am-f-sprok-rhs-t','am-f-tele-params','am-f-filters',
               'am-f-lubes','am-f-belts','am-f-hyd-filters'];
    ids.forEach(function(id){ var el=document.getElementById(id); if(el) el.value=''; });
    var selects = ['am-f-type','am-f-region','am-f-warranty','am-f-telematics','am-f-fleetrack',
                   'am-f-supplied','am-f-oem-reg','am-f-canbus','am-f-mobility','am-f-wty-type',
                   'am-f-track-is','am-f-is-status','am-f-svc-ob'];
    selects.forEach(function(id){ var el=document.getElementById(id); if(el) el.value=''; });
    var imgPrev = document.getElementById('am-img-preview');
    if (imgPrev) { imgPrev.src=''; imgPrev.style.display='none'; }
    var imgCur = document.getElementById('am-img-current');
    if (imgCur) { imgCur.textContent=''; imgCur.style.display='none'; }
    var imgInput = document.getElementById('am-img-input');
    if (imgInput) imgInput.value = '';
    var errEl = document.getElementById('am-error');
    if (errEl) errEl.textContent = '';
    setProgress('', 0, false);
    var btn = document.getElementById('am-save-btn');
    if (btn) btn.disabled = false;
    amGoToStep(1);
  }

  // ── Wizard Logic ─────────────────────────────────────────
  window.amGoToStep = function(step) {
    if (step < 1) step = 1;
    if (step > 4) step = 4;

    // Validate Step 1 before allowing transition to 2, 3 or 4
    if (step > 1) {
      var nameVal = (document.getElementById('am-f-name').value || '').trim();
      if (!nameVal) {
        var errEl = document.getElementById('am-error');
        if (errEl) errEl.textContent = '⚠ Machine ID / SN is required to proceed.';
        return;
      }
      var errEl2 = document.getElementById('am-error');
      if (errEl2 && errEl2.textContent.includes('Machine ID')) errEl2.textContent = '';
    }

    AM_CURRENT_STEP = step;
    
    for (var i = 1; i <= 4; i++) {
      var cont = document.getElementById('am-step-' + i);
      var ind = document.getElementById('am-ind-' + i);
      if (cont) {
        if (i === step) cont.classList.add('active');
        else cont.classList.remove('active');
      }
      if (ind) {
        ind.className = 'am-step-indicator';
        if (i < step) ind.classList.add('done');
        if (i === step) ind.classList.add('active');
      }
    }

    var prev = document.getElementById('am-btn-prev');
    var next = document.getElementById('am-btn-next');
    var save = document.getElementById('am-save-btn');
    
    if (prev) prev.style.display = step === 1 ? 'none' : 'block';
    if (next) next.style.display = step === 4 ? 'none' : 'block';
    if (save) save.style.display = step === 4 ? 'flex' : 'none';
  };

  window.amNextStep = function() { amGoToStep(AM_CURRENT_STEP + 1); };
  window.amPrevStep = function() { amGoToStep(AM_CURRENT_STEP - 1); };

  // ── Fill form from machine object ───────────────────────
  function fillForm(m) {
    function set(id, val) { var el=document.getElementById(id); if(el) el.value=val||''; }
    set('am-f-name',       m.name);
    set('am-f-fleetrack',  m.fleetrack_managed || 'Yes');
    set('am-f-supplied',   m.supplied || 'Not Specified');
    set('am-f-model',      m.model);
    set('am-f-oem',        m.oem);
    set('am-f-esn',        m.esn);
    set('am-f-chassis',    m.chassis_number);
    set('am-f-customer',   m.customer);
    set('am-f-fleet-no',   m.fleet_no);
    set('am-f-mxg-fleet-no', m.mxg_fleet_no);
    set('am-f-location',   m.location);
    set('am-f-region',     m.region);
    set('am-f-warranty',   m.warranty_status);
    set('am-f-oem-reg',    m.oem_registered);
    set('am-f-supplier',   m.supplier);
    set('am-f-engine-type',m.engine_type);
    set('am-f-gearbox',    m.gearbox);
    set('am-f-telematics', m.has_telematics_device || m.has_telematics);
    set('am-f-bin',        m.bin_capacity);
    set('am-f-fuel',       m.standard_fuel_consumption);
    set('am-f-canbus',     m.canbus_enabled);
    set('am-f-weight',     m.operating_weight);
    set('am-f-voltage',    m.working_voltage);
    set('am-f-tyre',       m.tyre_size);
    set('am-f-attachments',m.unique_attachments_fitted);
    set('am-f-tsn',        m.tsn);
    set('am-f-mobility',   m.mobility);
    set('am-f-hmr',        m.current_hmr);
    set('am-f-wty-type',   m.warranty_type);
    set('am-f-wty-period', m.warranty_period);
    set('am-f-wty-hrs',    m.warranty_hours);
    set('am-f-handover',   m.handover_date ? m.handover_date.split('T')[0] : '');
    set('am-f-expiry',     m.expiry_date ? m.expiry_date.split('T')[0] : '');
    set('am-f-notes',      m.notes);
    // Extended Specs
    set('am-f-track-is',      m.track_initial_service);
    set('am-f-is-type',       m.initial_service_type);
    set('am-f-is-status',     m.initial_service_status);
    set('am-f-start-hmr',     m.starting_hmr);
    set('am-f-total-run-hrs', m.total_running_hours);
    set('am-f-last-hmr-date', m.last_hmr_date ? m.last_hmr_date.split('T')[0] : '');
    set('am-f-svc-interval',  m.service_interval_hours);
    set('am-f-last-svc-hmr',  m.last_service_hmr);
    set('am-f-next-svc-hmr',  m.next_service_hmr);
    set('am-f-last-svc-type', m.last_service_type);
    set('am-f-next-svc-type', m.next_service_type);
    set('am-f-hrs-rem',       m.hours_remaining_to_service);
    set('am-f-last-svc-date', m.last_service_date ? m.last_service_date.split('T')[0] : '');
    set('am-f-svc-ob',        m.service_obligation);
    set('am-f-chain-make',    m.chain_make);
    set('am-f-chain-len',     m.chain_length);
    set('am-f-chain-wid',     m.chain_width);
    set('am-f-sprok-lhs-t',   m.sproket_lhs_teeth);
    set('am-f-sprok-rhs-t',   m.sproket_rhs_teeth);
    set('am-f-tele-params',   m.enabled_parameters);
    set('am-f-filters',       m.filters_list);
    set('am-f-lubes',         m.lube_types);
    set('am-f-belts',         m.belt_dimensions);
    set('am-f-hyd-filters',   m.hyd_filters_dimensions);
    // type select
    var typeEl = document.getElementById('am-f-type');
    if (typeEl && m.type) typeEl.value = m.type;
  }

  // ── Image preview ────────────────────────────────────────
  window.amPreviewImage = function(input) {
    var file = input.files && input.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(e) {
      var img = document.getElementById('am-img-preview');
      if (img) { img.src = e.target.result; img.style.display = 'block'; }
    };
    reader.readAsDataURL(file);
  };

  window.amHandleImgDrop = function(e) {
    e.preventDefault();
    document.getElementById('am-img-zone').classList.remove('am-drag-over');
    var file = e.dataTransfer && e.dataTransfer.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    var input = document.getElementById('am-img-input');
    var dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    window.amPreviewImage(input);
  };

  // ── Library file chosen ──────────────────────────────────
  window.amLibFileChosen = function(input) {
    var key = input.dataset.libkey;
    var file = input.files && input.files[0];
    var prev = document.getElementById('am-lib-preview-' + key);
    if (prev) {
      if (file) {
        prev.textContent = '📎 ' + file.name + ' (' + (file.size/1024).toFixed(0) + ' KB)';
        prev.style.display = 'block';
      } else {
        prev.style.display = 'none';
      }
    }
  };

  // ── Progress helper ──────────────────────────────────────
  function setProgress(msg, pct, show) {
    var t = document.getElementById('am-progress-text');
    var w = document.getElementById('am-progress-bar-wrap');
    var b = document.getElementById('am-progress-bar');
    if (t) t.textContent = msg;
    if (w) w.style.display = show ? 'block' : 'none';
    if (b) b.style.width = pct + '%';
  }

  // ── File → base64 ────────────────────────────────────────
  function fileToBase64(file) {
    return new Promise(function(resolve, reject) {
      var reader = new FileReader();
      reader.onload = function(e) { resolve(e.target.result.split(',')[1]); };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // ── Upload one file via IPC ──────────────────────────────
  async function uploadFile(bucket, path, file) {
    var base64 = await fileToBase64(file);
    var res = await window.electron.invoke('storage:upload', {
      bucket: bucket,
      path: path,
      base64Data: base64,
      contentType: file.type || 'application/octet-stream'
    });
    if (!res || !res.ok) throw new Error(res && res.error ? res.error : 'Upload failed: ' + path);
    return res.url;
  }

  // ── Main save handler ────────────────────────────────────
  window.submitMachineSave = async function() {
    var errEl = document.getElementById('am-error');
    errEl.textContent = '';

    var nameVal = (document.getElementById('am-f-name').value || '').trim();
    if (!nameVal) { errEl.textContent = '⚠ Machine ID / SN is required.'; return; }

    if (AM_EDIT_MODE) {
      if (!confirm('Save changes to "' + AM_EDIT_NAME + '"?\n\nThis will overwrite the current record in Supabase.')) return;
    }

    var btn = document.getElementById('am-save-btn');
    btn.disabled = true;
    setProgress('Preparing…', 5, true);

    try {
      // 1. Build machine row
      var row = {
        name:            nameVal,
        fleetrack_managed: document.getElementById('am-f-fleetrack').value || null,
        supplied:        document.getElementById('am-f-supplied').value || null,
        model:           document.getElementById('am-f-model').value.trim() || null,
        oem:             document.getElementById('am-f-oem').value.trim() || null,
        type:            document.getElementById('am-f-type').value || null,
        esn:             document.getElementById('am-f-esn').value.trim() || null,
        chassis_number:  document.getElementById('am-f-chassis').value.trim() || null,
        customer:        document.getElementById('am-f-customer').value.trim() || null,
        fleet_no:        document.getElementById('am-f-fleet-no').value.trim() || null,
        mxg_fleet_no:    document.getElementById('am-f-mxg-fleet-no').value.trim() || null,
        region:          document.getElementById('am-f-region').value || null,
        location:        document.getElementById('am-f-location').value.trim() || null,
        warranty_status: document.getElementById('am-f-warranty').value || null,
        oem_registered:  document.getElementById('am-f-oem-reg').value || null,
        supplier:        document.getElementById('am-f-supplier').value.trim() || null,
        engine_type:     document.getElementById('am-f-engine-type').value.trim() || null,
        gearbox:         document.getElementById('am-f-gearbox').value.trim() || null,
        has_telematics_device: document.getElementById('am-f-telematics').value || null,
        bin_capacity:    parseFloat(document.getElementById('am-f-bin').value) || null,
        standard_fuel_consumption: parseFloat(document.getElementById('am-f-fuel').value) || null,
        canbus_enabled:  document.getElementById('am-f-canbus').value || null,
        operating_weight:parseFloat(document.getElementById('am-f-weight').value) || null,
        working_voltage: parseFloat(document.getElementById('am-f-voltage').value) || null,
        tyre_size:       document.getElementById('am-f-tyre').value.trim() || null,
        unique_attachments_fitted: parseFloat(document.getElementById('am-f-attachments').value) || null,
        tsn:             document.getElementById('am-f-tsn').value.trim() || null,
        mobility:        document.getElementById('am-f-mobility').value || null,
        current_hmr:     parseFloat(document.getElementById('am-f-hmr').value) || null,
        warranty_type:   document.getElementById('am-f-wty-type').value || null,
        warranty_period: parseFloat(document.getElementById('am-f-wty-period').value) || null,
        warranty_hours:  parseFloat(document.getElementById('am-f-wty-hrs').value) || null,
        handover_date:   document.getElementById('am-f-handover').value || null,
        expiry_date:     document.getElementById('am-f-expiry').value || null,
        notes:           document.getElementById('am-f-notes').value.trim() || null,
        track_initial_service:      document.getElementById('am-f-track-is').value || null,
        initial_service_type:       parseFloat(document.getElementById('am-f-is-type').value) || null,
        initial_service_status:     document.getElementById('am-f-is-status').value || null,
        starting_hmr:               parseFloat(document.getElementById('am-f-start-hmr').value) || null,
        total_running_hours:        parseFloat(document.getElementById('am-f-total-run-hrs').value) || null,
        last_hmr_date:              document.getElementById('am-f-last-hmr-date').value || null,
        service_interval_hours:     parseFloat(document.getElementById('am-f-svc-interval').value) || null,
        last_service_hmr:           parseFloat(document.getElementById('am-f-last-svc-hmr').value) || null,
        next_service_hmr:           parseFloat(document.getElementById('am-f-next-svc-hmr').value) || null,
        last_service_type:          document.getElementById('am-f-last-svc-type').value.trim() || null,
        next_service_type:          document.getElementById('am-f-next-svc-type').value.trim() || null,
        hours_remaining_to_service: parseFloat(document.getElementById('am-f-hrs-rem').value) || null,
        last_service_date:          document.getElementById('am-f-last-svc-date').value || null,
        service_obligation:         document.getElementById('am-f-svc-ob').value || null,
        chain_make:                 document.getElementById('am-f-chain-make').value.trim() || null,
        chain_length:               parseFloat(document.getElementById('am-f-chain-len').value) || null,
        chain_width:                parseFloat(document.getElementById('am-f-chain-wid').value) || null,
        sproket_lhs_teeth:          parseFloat(document.getElementById('am-f-sprok-lhs-t').value) || null,
        sproket_rhs_teeth:          parseFloat(document.getElementById('am-f-sprok-rhs-t').value) || null,
        enabled_parameters:         document.getElementById('am-f-tele-params').value.trim() || null,
        filters_list:               document.getElementById('am-f-filters').value.trim() || null,
        lube_types:                 document.getElementById('am-f-lubes').value.trim() || null,
        belt_dimensions:            document.getElementById('am-f-belts').value.trim() || null,
        hyd_filters_dimensions:     document.getElementById('am-f-hyd-filters').value.trim() || null,
      };

      // 2. Upload cover image (if selected)
      var imgInput = document.getElementById('am-img-input');
      if (imgInput && imgInput.files && imgInput.files[0]) {
        setProgress('Uploading cover image…', 15, true);
        var imgFile = imgInput.files[0];
        var imgExt = imgFile.name.split('.').pop() || 'jpg';
        var imgUrl = await uploadFile('machine-images', nameVal + '/cover.' + imgExt, imgFile);
        row.machine_picture = imgUrl;
      }

      // 3. Upload library files
      var libUrls = (window.LIB_SUPABASE_MAP && window.LIB_SUPABASE_MAP[nameVal])
        ? Object.assign({}, window.LIB_SUPABASE_MAP[nameVal])
        : {};
      var libInputs = document.querySelectorAll('#am-lib-grid input[type=file][data-libkey]');
      var libCount = 0;
      var libTotal = 0;
      libInputs.forEach(function(inp) { if (inp.files && inp.files[0]) libTotal++; });

      for (var i = 0; i < libInputs.length; i++) {
        var inp = libInputs[i];
        if (!inp.files || !inp.files[0]) continue;
        var lFile = inp.files[0];
        var lKey  = inp.dataset.libkey;
        var lExt  = lFile.name.split('.').pop() || 'bin';
        libCount++;
        setProgress('Uploading library file ' + libCount + ' of ' + libTotal + '…',
          15 + Math.round(libCount / Math.max(libTotal,1) * 70), true);
        var lUrl = await uploadFile('machine-library', nameVal + '/' + lKey + '.' + lExt, lFile);
        libUrls[lKey] = lUrl;
      }

      if (Object.keys(libUrls).length) {
        row.library_supabase_urls = libUrls;
      }

      // 4. Upsert to ft_machine
      setProgress('Saving to database…', 90, true);
      var res = await window.electron.invoke('supabase:query', {
        table: 'ft_machine',
        method: 'upsert',
        params: { data: row, options: { onConflict: 'name' } }
      });
      if (!res || !res.ok) throw new Error(res && res.error ? res.error : 'Database save failed');

      // 5. Update in-memory maps
      if (!window.FT_MACHINE_ROWS) window.FT_MACHINE_ROWS = [];
      var idx = window.FT_MACHINE_ROWS.findIndex(function(m){ return m.name === nameVal; });
      if (idx >= 0) {
        Object.assign(window.FT_MACHINE_ROWS[idx], row);
      } else {
        window.FT_MACHINE_ROWS.push(row);
      }
      if (!window.MACHINES_MAP) window.MACHINES_MAP = {};
      window.MACHINES_MAP[nameVal] = Object.assign(window.MACHINES_MAP[nameVal] || {}, row);
      if (Object.keys(libUrls).length) {
        if (!window.LIB_SUPABASE_MAP) window.LIB_SUPABASE_MAP = {};
        window.LIB_SUPABASE_MAP[nameVal] = libUrls;
      }

      // 6. Update in-memory register \u2014 close modal FIRST, then refresh after a tick.
      //    Deferring the DOM-heavy refreshMachineRegisterReport prevents UI freeze.
      var _savedName = nameVal;
      var _wasEdit   = AM_EDIT_MODE;
      var label = _wasEdit ? 'updated' : 'created';

      showToast((_wasEdit ? '\u270e ' : '\u2713 ') + _savedName + ' ' + label + ' successfully.', 'ok', 4000);

      // Log to audit trail (non-blocking)
      if (typeof window.logAudit === 'function') {
        window.logAudit(_wasEdit ? 'MACHINE_EDITED' : 'MACHINE_CREATED', 'machine', _savedName, { row: row });
      }

      // Close modal immediately (no delay), then refresh register after 80ms
      closeAddMachineModal();
      setTimeout(function() {
        var filterCust  = document.getElementById('mr-filter-customer');
        var filterModel = document.getElementById('mr-filter-model');
        if (filterCust)  filterCust.value  = '';
        if (filterModel) filterModel.value = '';
        if (typeof refreshMachineRegisterReport === 'function') refreshMachineRegisterReport();
      }, 80);

    } catch(e) {
      errEl.textContent = '⚠ ' + e.message;
      btn.disabled = false;
      setProgress('', 0, false);
    }
  };

  // Close on overlay click (not panel click)
  document.getElementById('am-overlay').addEventListener('click', function(e) {
    if (e.target === this) closeAddMachineModal();
  });

  // ── Setup Autofill Event Listener ────────────────────────
  var modelInput = document.getElementById('am-f-model');
  if (modelInput) {
    modelInput.addEventListener('input', function(e) {
      var val = (e.target.value || '').trim();
      if (window.AM_MODELS_MAP && window.AM_MODELS_MAP[val]) {
        var oemInput = document.getElementById('am-f-oem');
        if (oemInput && !oemInput.value.trim()) {
           oemInput.value = window.AM_MODELS_MAP[val];
        }
      }
    });
  }

})();



    // ── Dashboard inline machine search ──────────────────────────────────
    function _dashMachineSearch(q) {
      const res  = document.getElementById('dash-machine-results');
      const cnt  = document.getElementById('dash-search-count');
      if (!res) return;
      q = (q || '').trim().toLowerCase();
      if (!q) {
        res.innerHTML = '<div style="padding:10px 14px;font-size:11px;color:#94a3b8;font-weight:500;">Start typing to search machines\u2026</div>';
        if (cnt) cnt.textContent = '';
        return;
      }
      const pool = window.FT_MACHINE_ROWS || [];
      const hits = pool.filter(m => {
        const sn     = (m.sn     || m.name || '').toLowerCase();
        const model  = (m.model  || '').toLowerCase();
        const fleet  = (m.fleet_no || m.mxg_fleet_no || '').toLowerCase();
        const cust   = (m.customer || '').toLowerCase();
        return sn.includes(q) || model.includes(q) || fleet.includes(q) || cust.includes(q);
      }).slice(0, 6);

      if (cnt) cnt.textContent = hits.length ? `${hits.length} found` : 'No matches';

      if (!hits.length) {
        res.innerHTML = '<div style="padding:10px 14px;font-size:11px;color:#94a3b8;">No machines match \u201c' + q.substring(0,30) + '\u201d</div>';
        return;
      }

      res.innerHTML = hits.map(m => {
        const wty = (m.warranty_status || '').toLowerCase();
        const wtyColor = wty.includes('in') ? '#15803d' : wty.includes('expire') ? '#b45309' : '#64748b';
        const wtyBg    = wty.includes('in') ? '#dcfce7' : wty.includes('expire') ? '#fef3c7' : '#f1f5f9';
        const wtyPill  = m.warranty_status
          ? `<span style="padding:1px 7px;border-radius:99px;background:${wtyBg};color:${wtyColor};font-size:9px;font-weight:700;">${m.warranty_status}</span>`
          : '';
        const hmr = m.current_hmr != null ? `<span style="font-family:monospace;font-weight:800;color:#1e40af;font-size:10px;">${Number(m.current_hmr).toLocaleString()} hrs</span>` : '';
        const machineName = m.sn || m.name || '—';
        return `<div onclick="openMachineLookup('${(machineName).replace(/'/g,"\\'")}')"
          style="display:flex;align-items:center;gap:10px;padding:7px 14px;cursor:pointer;border-bottom:1px solid #f8fafc;transition:background .1s;"
          onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''">
          <div style="flex:1;min-width:0;">
            <div style="font-size:11px;font-weight:700;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${m.model || machineName} <span style="color:#64748b;font-weight:500;">&middot; ${m.customer || '—'}</span></div>
            <div style="font-size:10px;color:#94a3b8;font-weight:500;">${machineName} &nbsp;&bull;&nbsp; Fleet: ${m.fleet_no || m.mxg_fleet_no || '—'}</div>
          </div>
          <div style="display:flex;gap:6px;align-items:center;flex-shrink:0;">${hmr}${wtyPill}</div>
        </div>`;
      }).join('');
    }

    let _mlookupMachine=null;
    function openMachineLookup(p){
      const pan=document.getElementById('modal-machine-lookup'),bg=document.getElementById('modal-machine-lookup-backdrop');
      pan.style.display='flex';bg.style.display='block';
      requestAnimationFrame(()=>{pan.style.transform='translateX(0)';});
      if(p)mlookupShowMachine(p);else setTimeout(()=>document.getElementById('mlookup-search')?.focus(),300);
      if(!window.MACHINES_MAP||!Object.keys(window.MACHINES_MAP).length)if(typeof loadFtMachineRegister==='function')loadFtMachineRegister();
    }
    function openQuickHmrModal(){if(typeof window.openHmrLogModal==='function')window.openHmrLogModal(null);else openMachineLookup();}
    function closeMachineLookup(){
      const pan=document.getElementById('modal-machine-lookup'),bg=document.getElementById('modal-machine-lookup-backdrop');
      pan.style.transform='translateX(100%)';
      setTimeout(()=>{pan.style.display='none';bg.style.display='none';},300);
      _mlookupMachine=null;
    }
    function mlookupSearch(q){
      const dd=document.getElementById('mlookup-dropdown'),ql=(q||'').trim().toLowerCase();
      if(!ql){dd.style.display='none';return;}
      const hits=Object.values(window.MACHINES_MAP||{}).filter(m=>[m.model,m.sn,m.name,m.fleet_no,m.customer].some(v=>(v||'').toLowerCase().includes(ql))).slice(0,8);
      dd.innerHTML='';
      if(!hits.length){dd.innerHTML='<li style="padding:10px 14px;color:#94a3b8;font-size:12px;">No machines found</li>';dd.style.display='block';return;}
      hits.forEach(m=>{
        const li=document.createElement('li');
        li.style.cssText='padding:10px 14px;cursor:pointer;border-bottom:1px solid #f1f5f9;transition:background .1s;';
        li.innerHTML=`<div style="font-weight:700;font-size:13px;color:#0f172a;">${m.model||m.name}</div><div style="font-size:11px;color:#64748b;">${m.name} &middot; ${m.customer||'\u2014'}</div>`;
        li.onclick=()=>{document.getElementById('mlookup-search').value=`${m.model||m.name} \u2014 ${m.name}`;dd.style.display='none';mlookupShowMachine(m.name);};
        li.onmouseenter=()=>li.style.background='#f8fafc';li.onmouseleave=()=>li.style.background='#fff';
        dd.appendChild(li);
      });
      dd.style.display='block';
    }
    function mlookupShowMachine(name){
      const m=window.MACHINES_MAP?.[name];if(!m)return;_mlookupMachine=name;
      document.getElementById('mlookup-empty').style.display='none';
      document.getElementById('mlookup-card').style.display='block';
      const acts=document.getElementById('mlookup-actions');acts.style.display='flex';acts.style.flexDirection='column';

      // ── Hero fields ──
      document.getElementById('mlookup-model').textContent=m.model||'\u2014';
      document.getElementById('mlookup-serial').textContent=m.name||'\u2014';
      document.getElementById('mlookup-fleet').textContent=m.mxg_fleet_no||m.fleet_no?'Fleet: '+(m.mxg_fleet_no||m.fleet_no):'';
      document.getElementById('mlookup-hmr').textContent=m.current_hmr!=null?Number(m.current_hmr).toLocaleString():'\u2014';

      // Status badge
      const sb=document.getElementById('mlookup-status-badge'),st=(m.status||'').toLowerCase();
      const stStyles={active:'background:#dcfce7;color:#15803d',inactive:'background:#fee2e2;color:#b91c1c','under maintenance':'background:#fef9c3;color:#a16207',breakdown:'background:#fee2e2;color:#b91c1c'};
      sb.style.cssText='font-size:10px;font-weight:700;padding:4px 10px;border-radius:99px;flex-shrink:0;margin-top:2px;'+(stStyles[st]||'background:#e2e8f0;color:#64748b');
      sb.textContent=m.status||'Unknown';

      // Warranty pill
      const wp=document.getElementById('mlookup-warranty-pill'),ws=(m.warranty_status||'').toLowerCase();
      wp.style.cssText=ws.includes('under')||ws==='in warranty'?'font-size:11px;font-weight:700;padding:5px 14px;border-radius:99px;background:#dcfce7;color:#15803d;':ws.includes('fringe')||ws.includes('expir')?'font-size:11px;font-weight:700;padding:5px 14px;border-radius:99px;background:#fef9c3;color:#a16207;':ws.includes('out')||ws.includes('expired')?'font-size:11px;font-weight:700;padding:5px 14px;border-radius:99px;background:#fee2e2;color:#b91c1c;':'font-size:11px;font-weight:700;padding:5px 14px;border-radius:99px;background:#e2e8f0;color:#64748b;';
      wp.textContent=m.warranty_status||'N/A';

      // ── Service HMR progress bar ──
      const barWrap=document.getElementById('mlookup-service-bar-wrap');
      if(m.current_hmr!=null&&m.last_service_hmr!=null&&m.next_service_hmr!=null){
        const cur=Number(m.current_hmr),last=Number(m.last_service_hmr),next=Number(m.next_service_hmr);
        const range=Math.max(next-last,1),done=cur-last,pct=Math.min(Math.max(done/range*100,0),100);
        const remaining=next-cur,overdue=remaining<0;
        document.getElementById('mlookup-bar-last').textContent=last.toLocaleString();
        document.getElementById('mlookup-bar-next').textContent=next.toLocaleString();
        const fill=document.getElementById('mlookup-bar-fill');
        fill.style.width=pct+'%';
        fill.style.background=overdue?'#ef4444':pct>80?'#f59e0b':'#22c55e';
        const remEl=document.getElementById('mlookup-bar-remaining');
        remEl.style.color=overdue?'#b91c1c':'#15803d';
        remEl.textContent=overdue?'OVERDUE by '+(Math.abs(remaining)).toLocaleString()+' h':(remaining).toLocaleString()+' h to next service';
        const dueLabel=document.getElementById('mlookup-bar-due-label');
        dueLabel.style.color=overdue?'#b91c1c':'#64748b';
        barWrap.style.display='block';
      } else {barWrap.style.display='none';}

      // ── Info grid ──
      document.getElementById('mlookup-customer').textContent=m.customer||'\u2014';
      document.getElementById('mlookup-region').textContent=m.region||'\u2014';
      document.getElementById('mlookup-oem').textContent=m.oem||'\u2014';
      document.getElementById('mlookup-fleet-no').textContent=m.mxg_fleet_no||m.fleet_no||'\u2014';
      document.getElementById('mlookup-last-srvc').textContent=m.last_service_hmr!=null?Number(m.last_service_hmr).toLocaleString()+' h':'\u2014';
      const nxEl=document.getElementById('mlookup-next-srvc');
      if(m.next_service_hmr!=null){
        const over=m.current_hmr!=null&&Number(m.current_hmr)>Number(m.next_service_hmr);
        nxEl.style.color=over?'#b91c1c':'#0f172a';
        nxEl.textContent=Number(m.next_service_hmr).toLocaleString()+' h'+(over?' \u26a0 OVERDUE':'');
      } else {nxEl.textContent='\u2014';nxEl.style.color='#0f172a';}
      document.getElementById('mlookup-serial-no').textContent=m.serial_no||m.sn||m.name||'\u2014';

      // ── Breakdowns summary ──
      const allBd=(window.FT_BREAKDOWN_ROWS||[]).filter(b=>b.machine===name);
      const openBd=allBd.filter(b=>!['closed','resolved','completed'].includes((b.status||'').toLowerCase()));
      document.getElementById('mlookup-breakdown-count').textContent=openBd.length||'0';
      document.getElementById('mlookup-breakdown-total').textContent=allBd.length||'0';
      const bdList=document.getElementById('mlookup-breakdowns-list');
      const recentBd=allBd.sort((a,b)=>new Date(b.breakdown_date||0)-new Date(a.breakdown_date||0)).slice(0,4);
      // Store rows so onclick can retrieve by index
      window._mlookupBdRows = recentBd;
      bdList.innerHTML=recentBd.length?recentBd.map((b,i)=>`<div onclick="if(typeof openBreakdownModal==='function')openBreakdownModal(window._mlookupBdRows[${i}])" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:9px 12px;border-left:3px solid ${['open','pending'].includes((b.status||'').toLowerCase())?'#f59e0b':'#94a3b8'};margin-bottom:6px;cursor:pointer;transition:opacity .15s;" onmouseover="this.style.opacity='.82'" onmouseout="this.style.opacity='1'">
        <div style="font-size:11px;font-weight:700;color:#0f172a;">${(b.description||b.problem||'Breakdown').slice(0,80)}</div>
        <div style="font-size:10px;color:#64748b;margin-top:3px;">${b.status||'Unknown'} &middot; ${b.breakdown_date||''} &middot; Days open: ${b.days_open||'—'} <span style="float:right;font-size:9px;color:#94a3b8;">&#9998; Edit</span></div>
      </div>`).join(''):'<div style="font-size:11px;color:#94a3b8;text-align:center;padding:12px 0;font-weight:600;">✔ No breakdown history</div>';

      // ── Service Tracking ──
      const renderServiceTracking = (fspRows) => {
        const svcEl = document.getElementById('mlookup-service-list');
        if (!svcEl) return;
        // Filter to this machine — match on machine or machine_name field
        const machineSvcs = fspRows.filter(r =>
          (r.machine||'')===name || (r.machine_name||'')===name ||
          (r.machine||'').toLowerCase()===(m.model||'').toLowerCase()
        );
        if (!machineSvcs.length) {
          svcEl.innerHTML = '<div style="font-size:11px;color:#94a3b8;text-align:center;padding:12px 0;font-weight:600;">No service records in FSP for this machine</div>';
          return;
        }
        const today = new Date();
        // Last completed service
        const completed = machineSvcs
          .filter(r => (r.status||'').toLowerCase() === 'completed')
          .sort((a,b) => new Date(b.plan_for||b.raw_date||0) - new Date(a.plan_for||a.raw_date||0));
        const lastSvc = completed[0] || null;
        // Next upcoming (Planned / In Progress / Proposed) — closest future date first
        const upcoming = machineSvcs
          .filter(r => !['completed'].includes((r.status||'').toLowerCase()))
          .sort((a,b) => new Date(a.plan_for||a.raw_date||0) - new Date(b.plan_for||b.raw_date||0));
        const nextSvc = upcoming[0] || null;
        const stBg = {proposed:'#f1f5f9',planned:'#eff6ff','in progress':'#fef9c3',completed:'#dcfce7'};
        const stCol = {proposed:'#64748b',planned:'#1d4ed8','in progress':'#854d0e',completed:'#166534'};
        // Cache FSP rows for onclick retrieval
        window._mlookupFspRows = machineSvcs;
        const svcCard = (r, label, borderCol, idx) => {
          const dateStr = r.plan_for || r.raw_date || '';
          const daysAgo = dateStr ? Math.round((today - new Date(dateStr))/86400000) : null;
          const st = (r.status||'').toLowerCase();
          const bgC = stBg[st]||'#f1f5f9', txC = stCol[st]||'#64748b';
          return `<div onclick="if(typeof openFspDetailModal==='function')openFspDetailModal(window._mlookupFspRows[${idx}])" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:11px 14px;border-left:3px solid ${borderCol};margin-bottom:8px;cursor:pointer;transition:opacity .15s;" onmouseover="this.style.opacity='.82'" onmouseout="this.style.opacity='1'">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
              <span style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.4px;color:#94a3b8;">${label}</span>
              <div style="display:flex;align-items:center;gap:6px;">
                <span style="font-size:9px;font-weight:700;padding:2px 8px;border-radius:99px;background:${bgC};color:${txC};">${r.status||'—'}</span>
                <span style="font-size:9px;color:#94a3b8;">&#9998;</span>
              </div>
            </div>
            <div style="font-size:12px;font-weight:700;color:#0f172a;">${dateStr||'—'} ${daysAgo!==null?'<span style="font-size:10px;color:#94a3b8;font-weight:500;">('+Math.abs(daysAgo)+'d '+(daysAgo>=0?'ago':'away')+')</span>':''}</div>
            ${r.description?`<div style="font-size:11px;color:#475569;margin-top:4px;">${r.description.slice(0,90)}</div>`:''}
            ${r.technician?`<div style="font-size:10px;color:#94a3b8;margin-top:3px;">&#128100; ${r.technician}</div>`:''}
          </div>`;
        };
        // Find indices in machineSvcs for last/next
        const lastIdx = lastSvc ? machineSvcs.indexOf(lastSvc) : -1;
        const nextIdx = nextSvc ? machineSvcs.indexOf(nextSvc) : -1;
        svcEl.innerHTML =
          (lastSvc ? svcCard(lastSvc, 'Last Completed Service', '#22c55e', lastIdx) : '<div style="font-size:11px;color:#94a3b8;padding:4px 0 8px;">No completed services recorded</div>') +
          (nextSvc ? svcCard(nextSvc, 'Next / Upcoming Service', '#3b82f6', nextIdx) : '<div style="font-size:11px;color:#94a3b8;padding:4px 0;">No upcoming service planned</div>');
      };

      const fspSource = window._fspRows || [];
      if (fspSource.length > 0) {
        renderServiceTracking(fspSource);
      } else {
        document.getElementById('mlookup-service-list').innerHTML = '<div style="font-size:11px;color:#94a3b8;text-align:center;padding:8px 0;">Fetching service records…</div>';
        (async () => {
          try {
            const res = await callFrappe('/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.get_ft_service_plan_list', {});
            const msg = res?.message || res || {};
            const rows = Array.isArray(msg.data)?msg.data:Array.isArray(msg)?msg:[];
            window._fspRows = rows;
            if (_mlookupMachine === name) renderServiceTracking(rows);
          } catch(e) {
            if (_mlookupMachine === name)
              document.getElementById('mlookup-service-list').innerHTML = '<div style="font-size:11px;color:#ef4444;text-align:center;padding:8px 0;">Could not load service records</div>';
          }
        })();
      }

      // ── Open Defects ──
      // Merge all available defect sources
      const _allDefectSources = [
        ...(window.FT_DEFECTS_DATA || []),
        ...(window.FT_DEFECT_ROWS  || []),
      ];
      // Deduplicate by defect name/id
      const _seenDef = new Set();
      const _mergedDefs = _allDefectSources.filter(d => {
        const k = d.name || d.id || (d.machine + '|' + d.description);
        if (_seenDef.has(k)) return false;
        _seenDef.add(k); return true;
      });

      const renderDefects = (defs) => {
        const list=document.getElementById('mlookup-defects-list'),cntEl=document.getElementById('mlookup-defect-count');
        const openDefs=defs.filter(d=>d.machine===name&&!['closed','resolved'].includes((d.status||'').toLowerCase()));
        cntEl.textContent=openDefs.length;
        const pc={critical:'#b91c1c',high:'#b91c1c',medium:'#a16207',low:'#64748b'};
        list.innerHTML=openDefs.length?openDefs.slice(0,8).map(d=>`<div onclick="openDefectModal('${(d.name||'').replace(/'/g,"\\'")}')" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:9px 12px;border-left:3px solid ${pc[(d.priority||'low').toLowerCase()]||'#64748b'};margin-bottom:6px;cursor:pointer;transition:opacity .15s;" onmouseover="this.style.opacity='.82'" onmouseout="this.style.opacity='1'">
          <div style="font-size:11px;font-weight:700;color:#0f172a;">${(d.description||'').slice(0,80)}</div>
          <div style="font-size:10px;color:#64748b;margin-top:3px;">${d.priority||'Low'} &middot; ${d.status||'Open'} &middot; ${d.start_date||''} <span style="float:right;font-size:9px;color:#94a3b8;">&#9998; Edit</span></div>
        </div>`).join(''):'<div style="color:#15803d;font-size:12px;text-align:center;padding:14px 0;font-weight:600;">✔ No open defects</div>';
      };

      if (_mergedDefs.length > 0) {
        renderDefects(_mergedDefs);
      } else {
        // Neither global has data yet — fetch live for this machine
        document.getElementById('mlookup-defects-list').innerHTML = '';
        window.showOmnisLoader('Loading defects...');
        (async () => {
          try {
            const GDR_URL = '/api/method/mxg_fleet_track.omnis_dashboard.ft_defects_dashboard.get_ft_defect_summary';
            const res = await callFrappe(GDR_URL, {});
            const msg = res?.message || res || {};
            const fetched = Array.isArray(msg.rows)?msg.rows:Array.isArray(msg.data)?msg.data:Array.isArray(msg)?msg:[];
            window.FT_DEFECTS_DATA = fetched;
            if (_mlookupMachine === name) renderDefects(fetched); // only update if still viewing same machine
          } catch(e) {
            if (_mlookupMachine === name)
              document.getElementById('mlookup-defects-list').innerHTML = '<div style="font-size:11px;color:#ef4444;text-align:center;padding:10px;">Could not load defects</div>';
          } finally {
            window.hideOmnisLoader();
          }
        })();
      }
    }
    function mlookupLogDefect(){
      const machineName = _mlookupMachine;
      closeMachineLookup();
      setTimeout(() => openDefectModal(null, machineName), 340);
    }
    function mlookupUpdateHmr(){
      const m = window.MACHINES_MAP?.[_mlookupMachine];
      const machineCopy = m ? Object.assign({}, m) : null;
      closeMachineLookup();
      setTimeout(() => {
        if (typeof window.openHmrLogModal === 'function' && machineCopy) {
          window.openHmrLogModal(machineCopy);
        } else {
          showToast('HMR modal not available', 'err', 2500);
        }
      }, 340);
    }
    function mlookupViewBreakdowns(){
      const machineName = _mlookupMachine;
      closeMachineLookup();
      setTimeout(() => {
        if (typeof showView === 'function') showView('view-breakdowns');
        // If there is a machine filter input in the breakdowns view, prefill it
        const filters = ['bd-machine-filter','breakdown-machine','brk-machine','bd-search'];
        for (const fid of filters) {
          const el = document.getElementById(fid);
          if (el) { el.value = machineName; el.dispatchEvent(new Event('input')); break; }
        }
      }, 340);
    }
    document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMachineLookup();});
    
    // Custom logic for TED visibility
    document.addEventListener("DOMContentLoaded", () => {
      const tedStatus = document.getElementById("defect-ted-status");
      const tedGroup = document.getElementById("defect-ted-group");
      if (tedStatus && tedGroup) {
        tedStatus.addEventListener("change", () => {
          if (tedStatus.value === "TBA") {
            tedGroup.style.display = "none";
          } else {
            tedGroup.style.display = "block";
          }
        });
      }
    });

    function promptDeleteDefect() {
      document.getElementById('delete-prompt-email').value = "";
      document.getElementById('delete-prompt-pwd').value = "";
      document.getElementById('modal-delete-prompt').style.display = "flex";
    }

    async function executeDeleteDefect() {
      const email = document.getElementById('delete-prompt-email').value;
      const pwd = document.getElementById('delete-prompt-pwd').value;
      if (!email || !pwd) {
        showToast("Email and password are required", "err");
        return;
      }

      document.getElementById('modal-delete-prompt').style.display = "none";
      window.showOmnisLoader("Verifying Admin credentials...");
      try {
        const { data, error } = await window.supabase.auth.signInWithPassword({
          email: email,
          password: pwd
        });
        
        if (error) throw error;

        const id = document.getElementById("defect-id").value;
        const { error: delErr } = await window.supabase.from("ft_defect").delete().eq("name", id);
        if (delErr) throw delErr;

        showToast("Defect deleted securely", "success");
        closeDefectModal();
        if (typeof loadFtDefects === "function") loadFtDefects();
        if (typeof forceSyncDefects === "function") setTimeout(forceSyncDefects, 500);
      } catch (err) {
        console.error(err);
        showToast("Authentication or Deletion failed: " + err.message, "err");
      } finally {
        window.hideOmnisLoader();
      }
    }

    // ==========================================
    // CUSTOMERS MODULE
    // ==========================================
    let allFtCustomers = [];

    async function loadFtCustomers() {
      const tbody = document.getElementById("tbl-customers");
      if (!tbody) return;
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px; color:#64748b;">Loading customers...</td></tr>`;
      
      try {
        const { data, error } = await window.electron.invoke('supabase:query', {
          table: 'ft_customer',
          method: 'select',
          params: { columns: '*', order: { column: 'customer_name', ascending: true } }
        });
        
        if (error) throw new Error(error.message);
        
        allFtCustomers = data || [];
        filterCustomersTable();
      } catch (err) {
        console.error(err);
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px; color:#ef4444;">Failed to load customers</td></tr>`;
      }
    }

    function filterCustomersTable() {
      const q = (document.getElementById("filter-customer-text")?.value || "").toLowerCase();
      const filtered = allFtCustomers.filter(c => {
        return (c.customer_name || "").toLowerCase().includes(q) ||
               (c.contact_person_1 || "").toLowerCase().includes(q) ||
               (c.management_email || "").toLowerCase().includes(q);
      });
      renderCustomersTable(filtered);
    }

    function renderCustomersTable(rows) {
      const tbody = document.getElementById("tbl-customers");
      if (!tbody) return;
      
      if (rows.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px; color:#64748b;">No customers found.</td></tr>`;
        return;
      }
      
      tbody.innerHTML = "";
      rows.forEach(r => {
        const tr = document.createElement("tr");
        tr.style.borderBottom = "1px solid #f1f5f9";
        
        tr.innerHTML = `
          <td style="padding:10px 16px;">
            <div style="font-weight:700; color:#0f172a;">${safeText(r.customer_name)}</div>
            <div style="font-size:10px; color:#64748b;">ID: ${safeText(r.name)}</div>
            ${r.on_fleetrack === 'Yes' ? '<span style="font-size:9px; background:#dcfce7; color:#166534; padding:2px 6px; border-radius:4px; margin-top:4px; display:inline-block;">On Fleetrack</span>' : ''}
          </td>
          <td style="padding:10px 16px; color:#334155;">${safeText(r.contact_person_1 || "—")}</td>
          <td style="padding:10px 16px; color:#334155;">${safeText(r.mobile_1 || "—")}</td>
          <td style="padding:10px 16px; color:#334155;">${safeText(r.management_email || "—")}</td>
          <td style="padding:10px 16px; text-align:center;">
            <button onclick="openCustomerModal('edit', '${r.name}')" title="Edit Customer" style="background:#f1f5f9; color:#475569; border:1px solid #cbd5e1; border-radius:6px; padding:6px; cursor:pointer; margin-right:4px;">✏️</button>
            <button onclick="deleteCustomer('${r.name}')" title="Delete Customer" style="background:#fef2f2; color:#ef4444; border:1px solid #fecaca; border-radius:6px; padding:6px; cursor:pointer;">🗑️</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    }

    function openCustomerModal(mode, id = null) {
      const modal = document.getElementById("modal-customer");
      
      if (mode === "new") {
        document.getElementById("customer-modal-title").innerText = "Add Customer";
        document.getElementById("cust-id").value = "";
        document.getElementById("cust-name").value = "";
        document.getElementById("cust-on-fleetrack").value = "No";
        document.getElementById("cust-contact-1").value = "";
        document.getElementById("cust-mobile-1").value = "";
        document.getElementById("cust-mgmt-email").value = "";
        document.getElementById("cust-contact-2").value = "";
        document.getElementById("cust-mobile-2").value = "";
        document.getElementById("cust-tech-email").value = "";
      } else if (mode === "edit") {
        document.getElementById("customer-modal-title").innerText = "Edit Customer";
        const c = allFtCustomers.find(x => x.name === id);
        if (!c) return;
        
        document.getElementById("cust-id").value = c.name || "";
        document.getElementById("cust-name").value = c.customer_name || "";
        document.getElementById("cust-on-fleetrack").value = c.on_fleetrack || "No";
        document.getElementById("cust-contact-1").value = c.contact_person_1 || "";
        document.getElementById("cust-mobile-1").value = c.mobile_1 || "";
        document.getElementById("cust-mgmt-email").value = c.management_email || "";
        document.getElementById("cust-contact-2").value = c.contact_person_2 || "";
        document.getElementById("cust-mobile-2").value = c.mobile_2 || "";
        document.getElementById("cust-tech-email").value = c.technical_email || "";
      }
      
      modal.classList.remove("hidden");
    }

    async function saveCustomer() {
      const id = document.getElementById("cust-id").value;
      const cName = document.getElementById("cust-name").value.trim();
      
      if (!cName) return showToast("Customer Name is required", "error");
      
      const payload = {
        customer_name: cName,
        on_fleetrack: document.getElementById("cust-on-fleetrack").value,
        contact_person_1: document.getElementById("cust-contact-1").value.trim(),
        mobile_1: document.getElementById("cust-mobile-1").value.trim(),
        management_email: document.getElementById("cust-mgmt-email").value.trim(),
        contact_person_2: document.getElementById("cust-contact-2").value.trim(),
        mobile_2: document.getElementById("cust-mobile-2").value.trim(),
        technical_email: document.getElementById("cust-tech-email").value.trim()
      };
      
      if (!id) {
        payload.name = "CUST-" + Date.now();
      } else {
        payload.name = id;
      }
      
      showToast("Saving...", "info");
      try {
        const { error } = await window.electron.invoke('supabase:query', {
          table: 'ft_customer',
          method: 'upsert',
          params: { values: payload }
        });
        
        if (error) throw new Error(error.message);
        
        showToast("Customer saved successfully", "success");
        document.getElementById("modal-customer").classList.add("hidden");
        loadFtCustomers();
      } catch (err) {
        console.error(err);
        showToast("Failed to save customer", "error");
      }
    }

    function deleteCustomer(id) {
      if (!id) return;
      showUiConfirm('Delete Customer', 'Are you sure you want to delete this customer? This action cannot be undone.', async () => {
        showToast("Deleting customer...", "info");
        try {
          const { error } = await window.electron.invoke('supabase:query', {
            table: 'ft_customer',
            method: 'delete',
            params: { match: { name: id } }
          });
          
          if (error) throw new Error(error.message);
          
          showToast("Customer deleted", "success");
          loadFtCustomers();
        } catch (err) {
          console.error(err);
          showToast("Failed to delete. Ensure there are no linked machines.", "error");
        }
      });
    }



    function openExportModal() {
      const m = document.getElementById("modal-export-reports");
      if(m) m.classList.remove("hidden");
    }
    function closeExportModal() {
      const m = document.getElementById("modal-export-reports");
      if(m) m.classList.add("hidden");
    }
  

    let uiConfirmCallback = null;
    function showUiConfirm(title, message, onConfirm, btnText="Delete", btnColor="#ef4444") {
      document.getElementById("ui-confirm-title").innerText = title;
      document.getElementById("ui-confirm-message").innerText = message;
      const btn = document.getElementById("ui-confirm-btn");
      btn.innerText = btnText;
      btn.style.background = btnColor;
      uiConfirmCallback = onConfirm;
      
      btn.onclick = () => {
        document.getElementById("modal-ui-confirm").classList.add("hidden");
        if (uiConfirmCallback) uiConfirmCallback();
      };
      
      document.getElementById("modal-ui-confirm").classList.remove("hidden");
    }
  

    // === TECHNICIAN HOUR ANALYTICS ===
    async function loadTechHourAnalytics() {
      try {
        const tbody = document.getElementById('tha-table-body');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:40px; color:#64748b;">Loading analytics...</td></tr>';
        
        const res = await window.electron.invoke('supabase:query', {
          table: 'ft_technician_hour_log',
          method: 'select',
          params: { columns: '*' }
        });
        
        if (!res || !res.ok) {
          throw new Error(res?.error?.message || "Failed to load hour logs");
        }
        
        const data = res.data || [];
        
        // Group by technician
        const grouped = {};
        let totalProd = 0;
        let totalNonProd = 0;
        
        data.forEach(log => {
          const tech = log.technician || 'Unknown';
          if (!grouped[tech]) {
            grouped[tech] = {
              productive: 0,
              travel: 0,
              admin: 0,
              house_keeping: 0,
              non_productive: 0,
              count: 0,
              logs: []
            };
          }
          grouped[tech].logs.push(log);
          const p = parseFloat(log.productive) || 0;
          const t = parseFloat(log.travel) || 0;
          const a = parseFloat(log.admin) || 0;
          const hk = parseFloat(log.house_keeping) || 0;
          const np = parseFloat(log.non_productive) || 0;
          
          grouped[tech].productive += p;
          grouped[tech].travel += t;
          grouped[tech].admin += a;
          grouped[tech].house_keeping += hk;
          grouped[tech].non_productive += np;
          grouped[tech].count += 1;
          
          totalProd += p;
          totalNonProd += (t + a + hk + np);
        });
        
        // Globally expose for modal drilldown
        window.thaGroupedLogs = grouped;
        
        const overallTotal = totalProd + totalNonProd;
        const util = overallTotal > 0 ? ((totalProd / overallTotal) * 100).toFixed(1) : 0;
        
        document.getElementById('tha-kpi-total').textContent = overallTotal.toFixed(1);
        document.getElementById('tha-kpi-productive').textContent = totalProd.toFixed(1);
        document.getElementById('tha-kpi-non-productive').textContent = totalNonProd.toFixed(1);
        document.getElementById('tha-kpi-utilization').textContent = util + '%';
        
        tbody.innerHTML = '';
        
        if (Object.keys(grouped).length === 0) {
          tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:40px; color:#64748b;">No hour logs found</td></tr>';
          return;
        }
        
        // Sort by tech name
        const techs = Object.keys(grouped).sort();
        
        techs.forEach(tech => {
          const stats = grouped[tech];
          const techTotal = stats.productive + stats.travel + stats.admin + stats.house_keeping + stats.non_productive;
          
          const tr = document.createElement('tr');
          tr.style.borderBottom = "1px solid #f1f5f9";
          tr.style.cursor = "pointer";
          // Add hover effect via class or inline
          tr.onmouseover = () => { tr.style.backgroundColor = "#f8fafc"; };
          tr.onmouseout = () => { tr.style.backgroundColor = "transparent"; };
          tr.onclick = () => showTechHourDetails(tech);
          
          tr.innerHTML = `
            <td style="padding:16px 20px; font-size:14px; color:#0f172a; font-weight:600;">${tech} <span style="font-size:11px; color:#94a3b8; font-weight:400; margin-left:6px;">(${stats.count} logs)</span></td>
            <td style="padding:16px 20px; text-align:right; font-size:14px; color:#10b981; font-weight:600;">${stats.productive.toFixed(1)}</td>
            <td style="padding:16px 20px; text-align:right; font-size:14px; color:#64748b;">${stats.travel.toFixed(1)}</td>
            <td style="padding:16px 20px; text-align:right; font-size:14px; color:#64748b;">${stats.admin.toFixed(1)}</td>
            <td style="padding:16px 20px; text-align:right; font-size:14px; color:#64748b;">${stats.house_keeping.toFixed(1)}</td>
            <td style="padding:16px 20px; text-align:right; font-size:14px; color:#ef4444; font-weight:600;">${stats.non_productive.toFixed(1)}</td>
            <td style="padding:16px 20px; text-align:right; font-size:14px; color:#0f172a; font-weight:700; background:#f8fafc;">${techTotal.toFixed(1)}</td>
          `;
          tbody.appendChild(tr);
        });
        
      } catch (e) {
        console.error("loadTechHourAnalytics error:", e);
        const tbody = document.getElementById('tha-table-body');
        if (tbody) {
          tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:40px; color:#ef4444;">Failed to load analytics: ${e.message}</td></tr>`;
        }
      }
    }


    function showTechHourDetails(tech) {
      document.getElementById('tha-details-title').textContent = tech + ' - Hour Logs';
      const tbody = document.getElementById('tha-details-table-body');
      tbody.innerHTML = '';
      
      const logs = window.thaGroupedLogs[tech]?.logs || [];
      // Sort descending by date
      logs.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      logs.forEach(log => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = "1px solid #f1f5f9";
        
        const total = (parseFloat(log.productive) || 0) + 
                      (parseFloat(log.travel) || 0) + 
                      (parseFloat(log.admin) || 0) + 
                      (parseFloat(log.house_keeping) || 0) + 
                      (parseFloat(log.non_productive) || 0);
                      
        tr.innerHTML = `
          <td style="padding:12px 20px; font-size:13px; color:#475569;">${log.date}</td>
          <td style="padding:12px 20px; text-align:right; font-size:13px; color:#10b981; font-weight:600;">${(parseFloat(log.productive) || 0).toFixed(1)}</td>
          <td style="padding:12px 20px; text-align:right; font-size:13px; color:#64748b;">${(parseFloat(log.travel) || 0).toFixed(1)}</td>
          <td style="padding:12px 20px; text-align:right; font-size:13px; color:#64748b;">${(parseFloat(log.admin) || 0).toFixed(1)}</td>
          <td style="padding:12px 20px; text-align:right; font-size:13px; color:#64748b;">${(parseFloat(log.house_keeping) || 0).toFixed(1)}</td>
          <td style="padding:12px 20px; text-align:right; font-size:13px; color:#ef4444; font-weight:600;">${(parseFloat(log.non_productive) || 0).toFixed(1)}</td>
          <td style="padding:12px 20px; text-align:right; font-size:13px; color:#0f172a; font-weight:700; background:#f8fafc;">${total.toFixed(1)}</td>
        `;
        tbody.appendChild(tr);
      });
      
      const modal = document.getElementById('modal-tha-details');
      modal.style.display = 'flex';
      setTimeout(() => modal.classList.remove('hidden'), 10);
    }


    function printTechHourAnalytics() {
      const printContents = document.getElementById("tha-print-section").innerHTML;
      const originalContents = document.body.innerHTML;
      
      const kpiTotal = document.getElementById('tha-kpi-total').textContent;
      const kpiProd = document.getElementById('tha-kpi-productive').textContent;
      const kpiNonProd = document.getElementById('tha-kpi-non-productive').textContent;
      const kpiUtil = document.getElementById('tha-kpi-utilization').textContent;

      document.body.innerHTML = `
        <div style="font-family:sans-serif; padding:20px;">
          <h2 style="text-align:center; color:#0f172a; margin-bottom:5px;">Technician Hour Analytics</h2>
          <p style="text-align:center; color:#64748b; font-size:12px; margin-top:0; margin-bottom:20px;">Generated on: ${new Date().toLocaleDateString()}</p>
          
          <div style="display:flex; justify-content:space-around; margin-bottom:30px; border-bottom:2px solid #e2e8f0; padding-bottom:20px;">
            <div style="text-align:center;">
              <div style="font-size:11px; color:#64748b; text-transform:uppercase;">Total Hours</div>
              <div style="font-size:24px; font-weight:bold;">${kpiTotal}</div>
            </div>
            <div style="text-align:center;">
              <div style="font-size:11px; color:#64748b; text-transform:uppercase;">Productive</div>
              <div style="font-size:24px; font-weight:bold; color:#10b981;">${kpiProd}</div>
            </div>
            <div style="text-align:center;">
              <div style="font-size:11px; color:#64748b; text-transform:uppercase;">Non-Productive</div>
              <div style="font-size:24px; font-weight:bold; color:#ef4444;">${kpiNonProd}</div>
            </div>
            <div style="text-align:center;">
              <div style="font-size:11px; color:#64748b; text-transform:uppercase;">Utilization</div>
              <div style="font-size:24px; font-weight:bold; color:#3b82f6;">${kpiUtil}</div>
            </div>
          </div>
          
          ${printContents}
        </div>
      `;
      window.print();
      document.body.innerHTML = originalContents;
      window.location.reload();
    }
  

  // Auto-injected Frappe API Credentials
  localStorage.setItem('ft_api_key', '07660480c74686c');
  localStorage.setItem('ft_api_secret', 'b43fd8b40ca211b');
  window.currentDivision = localStorage.getItem('omnis_active_division') || 'fleetrack';
  
  document.addEventListener('DOMContentLoaded', () => {
    const dt = document.getElementById('division-toggle');
    if (dt) dt.value = window.currentDivision;
    
    // Update text labels
    const termMachine = window.currentDivision === 'sinopower' ? 'Truck' : 'Machine';
    const termMachines = window.currentDivision === 'sinopower' ? 'Trucks' : 'Machines';
    const termHMR = window.currentDivision === 'sinopower' ? 'Mileage' : 'HMR';
    
    document.querySelectorAll('.term-machine').forEach(el => el.textContent = termMachine);
    document.querySelectorAll('.term-machines').forEach(el => el.textContent = termMachines);
    document.querySelectorAll('.term-hmr').forEach(el => el.textContent = termHMR);
    document.querySelectorAll('.term-machine-ph').forEach(el => {
      if (el.placeholder) el.placeholder = "Filter by " + termMachine.toLowerCase() + "...";
    });
    // Wait, the mr-filter-model says "Search SN/Model..." we can change it to "Search SN/Truck..." if needed, 
    // but the user said "on fillter on the table it should be Truck / Model". We handled the label above.
    
  });

  window.switchDivision = function(div) {
  localStorage.setItem('omnis_active_division', div);
  window.currentDivision = div;
  const termMachine = div === 'sinopower' ? 'Truck' : 'Machine';
  const termMachines = div === 'sinopower' ? 'Trucks' : 'Machines';
  const termHMR = div === 'sinopower' ? 'Mileage' : 'HMR';
  
  document.querySelectorAll('.term-machine').forEach(el => el.textContent = termMachine);
  document.querySelectorAll('.term-machines').forEach(el => el.textContent = termMachines);
  document.querySelectorAll('.term-hmr').forEach(el => el.textContent = termHMR);
  
  const ftFilter = document.getElementById('mr-filter-fleetrack');
  if (ftFilter) {
    ftFilter.value = div === 'fleetrack' ? 'Yes' : '';
  }
  
  if (typeof loadDailyBreakdownReport === 'function') loadDailyBreakdownReport();
  if (typeof loadFtCustomers === 'function') loadFtCustomers();
  if (typeof loadFtMachineRegister === 'function') loadFtMachineRegister();
  if (typeof filterDefectsTable === 'function') {
      try { filterDefectsTable(); } catch(e){}
  }
  if (typeof loadFieldServicePlan === 'function') {
      try { loadFieldServicePlan(); } catch(e){}
    }
    if (typeof renderDashboardFsp === 'function') {
        try { renderDashboardFsp(); } catch(e){}
    }
    if (typeof loadFtDefectsDashboard === 'function') {
        try { loadFtDefectsDashboard(); } catch(e){}
    }
  };
