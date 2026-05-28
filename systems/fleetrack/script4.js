
    /**
     * HMR LOG MODAL LOGIC
     */
    let CURRENT_HMR_MACHINE_DATA = null;

    window.openHmrLogModal = function(machineData) {
      CURRENT_HMR_MACHINE_DATA = machineData;
      
      const overlay = document.getElementById("hmr-log-overlay");
      if (!overlay) return;

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

      // 2. Build the HTML
      container.innerHTML = "";
      weekDays.forEach(day => {
        // Match against raw_date (substring in case of timestamps)
        const dayRows = rows.filter(r => (r.raw_date || "").startsWith(day.iso));
        
        let chipsHtml = "";
        if (dayRows.length === 0) {
          chipsHtml = `<div style="font-size: 10px; color: #cbd5e1; text-align: center; margin-top: 10px;">No jobs</div>`;
        } else {
          dayRows.forEach(r => {
            const statusColor = r.status === 'Proposed' ? '#94a3b8' : r.status === 'Planned' ? '#3b82f6' : r.status === 'In Progress' ? '#eab308' : '#22c55e';
            const statusBg = r.status === 'Proposed' ? '#f1f5f9' : r.status === 'Planned' ? '#eff6ff' : r.status === 'In Progress' ? '#fef9c3' : '#f0fdf4';
            
            chipsHtml += `
              <div 
                onclick="event.stopPropagation(); window.openFspDetailModal && window.openFspDetailModal(${JSON.stringify(r).replace(/"/g, '&quot;')})"
                style="
                  padding: 8px 10px; margin-bottom: 8px; border-radius: 8px; background: ${statusBg}; border-left: 4px solid ${statusColor};
                  font-size: 11px; color: #1e293b; cursor: pointer; transition: all 0.2s; box-shadow: 0 1px 2px rgba(0,0,0,0.02);
                "
                onmouseover="this.style.boxShadow='0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)'"
                onmouseout="this.style.boxShadow='0 1px 2px rgba(0,0,0,0.02)'"
              >
                <div style="font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 2px;" title="${r.customer}">
                  ${safeText(r.customer)}
                </div>
                <div style="font-size: 9px; color: #64748b; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${r.machine}">
                  ${safeText(r.machine)}
                </div>
                <div style="font-size: 8px; color: ${statusColor}; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">${r.status}</div>
              </div>
            `;
          });
        }

        container.innerHTML += `
          <div style="flex: 1; min-width: 120px; display: flex; flex-direction: column;">
            <div style="
              font-size: 11px; font-weight: 700; color: ${day.isToday ? '#f02510' : '#64748b'}; 
              margin-bottom: 10px; padding-bottom: 6px; border-bottom: 2px solid ${day.isToday ? '#f02510' : '#e2e8f0'};
              text-align: center;
            ">
              ${day.display}
            </div>
            <div style="flex: 1; overflow-y: auto; max-height: 150px; padding-right: 4px;">
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

        // Prepare Archive Payload
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64data = reader.result.split(',')[1];
          const sigData = JSON.parse(localStorage.getItem("ft_signatories") || "{}");
          const signatoriesList = Object.keys(sigData).filter(k => sigData[k]).join(", ");
          
          const payload = {
            type: "DBR",
            title: `DBR ${region} - ${new Date().toLocaleDateString('en-GB')}`,
            region: region,
            signatories: signatoriesList || "System",
            content_b64: base64data
          };

          const res = await callFrappe("/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.archive_signed_report", payload, 'POST', { 
            showLoader: true, 
            loaderMsg: "Archiving Report..." 
          });
          
          if (res.message && res.message.status === "success") {
            showToast("✅ Report Archived Successfully", "success");
            closeSignatureModal();
            
            // Give the server 1.5s to synchronize the file system before redirecting
            setTimeout(() => {
                showView("view-archives");
            }, 1500);
          } else {
            throw new Error(res.message?.message || "Archival failed");
          }
        };
        reader.readAsDataURL(pdfBlob);

      } catch (err) {
        console.error("[Archive] Error:", err);
        showToast("❌ Archival failed", "error");
      }
    }

    async function loadReportArchives() {
      const typeFilter = document.getElementById("archive-filter-type")?.value || "";
      const tbody = document.getElementById("archive-tbody");
      if (!tbody) return;

      tbody.innerHTML = '<tr><td colspan="6" style="padding:40px; text-align:center; color:#64748b;">Loading archives...</td></tr>';

      try {
        const match = {};
        if (typeFilter) match.report_type = typeFilter;
        
        const r = await window.electron.invoke('supabase:query', {
            table: 'ft_service_report',
            method: 'select',
            params: { columns: '*', match: Object.keys(match).length ? match : undefined, range: {from: 0, to: 9999} }
        });
        if (r.error) throw new Error(r.error.message || JSON.stringify(r.error));
        const list = r.data || [];
        
        console.log("[Archive] Loaded:", list);

        if (list.length === 0) {
          tbody.innerHTML = '<tr><td colspan="6" style="padding:60px; text-align:center; color:#94a3b8;">No archived reports found.</td></tr>';
          return;
        }

        tbody.innerHTML = list.map(a => 
          `<tr style="border-bottom:1px solid #e2e8f0; font-size:13px; color:#475569; transition:background 0.2s; cursor:default;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">
            <td style="padding:14px 16px;"><span style="background:#f1f5f9; padding:2px 8px; border-radius:4px; font-weight:600; font-size:10px; color:#64748b; text-transform:uppercase;"></span></td>
            <td style="padding:14px 16px; font-weight:600; color:#1e293b;"></td>
            <td style="padding:14px 16px;"></td>
            <td style="padding:14px 16px;"></td>
            <td style="padding:14px 16px; font-style:italic;"></td>
            <td style="padding:14px 16px; text-align:center;">
              <div style="display:flex; justify-content:center; gap:8px;">
                <button onclick="openPdfPreview('', '')" style="background:#3b82f6; color:white; border:none; padding:6px 12px; border-radius:6px; font-size:11px; font-weight:600; cursor:pointer;">View</button>
              </div>
            </td>
          </tr>
        ).join('');

      } catch (err) {
        console.error("[Archive] fetch error:", err);
        tbody.innerHTML = '<tr><td colspan="6" style="padding:40px; text-align:center; color:#ef4444;">Failed to load archives. Check console.</td></tr>';
      }
    }

      async function loadFtDefectsDashboard() {
      try {
        const raw = await window.electron.invoke('supabase:query', {
            table: 'ft_defect',
            method: 'select',
            params: {
                columns: 'machine',
                match: { status: 'Open' }
            }
        });
        if (raw.error) throw new Error(raw.error.message || JSON.stringify(raw.error));
        
        const openDefects = raw.data || [];
        const uniqueMachines = new Set(openDefects.map(d => d.machine)).size;
        setKpi("kpi-machines-defects", uniqueMachines);
      } catch (e) {
        console.error("loadFtDefectsDashboard error:", e);
        setKpi("kpi-machines-defects", "?");
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
      if (!overlay) { console.error("jc-modal-overlay not found"); return; }
      // Teleport to body to escape app-shell stacking context
      if (overlay.parentNode !== document.body) document.body.appendChild(overlay);
      overlay.classList.remove("hidden");
      overlay.style.setProperty("display", "flex", "important");

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
      const ov = document.getElementById("jc-modal-overlay");
      if (ov) { ov.classList.add("hidden"); ov.style.removeProperty("display"); }
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
        jobCardTbody.innerHTML = '<tr><td colspan="7" style="padding:40px;text-align:center;color:#94a3b8;font-size:12px;">No job cards found.</td></tr>';
        return;
      }

      jobs.forEach(j => {
        const tr = document.createElement("tr");
        tr.style.cssText = "border-bottom:1px solid #e5e7f0; transition:background 0.15s;";
        tr.onmouseenter = () => tr.style.background = "#f8fafc";
        tr.onmouseleave = () => tr.style.background = "";

        const dateStr = j.creation ? j.creation.split(" ")[0] : "—";
        const machine = [j.machine_make, j.model].filter(Boolean).join(" ") || j.vin_number || "—";

        let statusText = j.workflow_state || j.status || "";
        if (!statusText) {
          statusText = j.docstatus === 1 ? "Completed" : j.docstatus === 2 ? "Cancelled" : "Draft";
        }

        const s = statusText.toLowerCase();
        const statusColor =
          s.includes("clos") || s.includes("complet") ? "#10b981" :
          s.includes("part")  ? "#f59e0b" :
          s.includes("hold")  ? "#94a3b8" :
          s.includes("progr") ? "#3b82f6" :
          s.includes("cancel") ? "#dc2626" : "#64748b";
        const isClosed = s.includes("clos") || s.includes("complet") || j.docstatus >= 1;

        const escapedName = String(j.name).replace(/'/g, "\\'");

        tr.innerHTML = `
          <td style="padding:10px 8px; font-size:11px; font-weight:700; color:#0f172a;">${j.name || "—"}</td>
          <td style="padding:10px 8px; font-size:11px;">${j.customer_name || "—"}</td>
          <td style="padding:10px 8px; font-size:11px;">${machine}</td>
          <td style="padding:10px 8px; font-size:11px; color:#64748b;">${j.technician || "—"}</td>
          <td style="padding:10px 8px;">
            <span style="font-size:9px;font-weight:800;color:white;background:${statusColor};padding:2px 8px;border-radius:10px;white-space:nowrap;">${statusText}</span>
          </td>
          <td style="padding:10px 8px; font-size:10px; color:#94a3b8; font-family:monospace;">${dateStr}</td>
          <td style="padding:10px 8px; white-space:nowrap;">
            <button onclick="event.stopPropagation(); window.CURRENT_JC_ROW=j; openJobCardDetail('${escapedName}')"
              style="font-size:9px;font-weight:700;padding:3px 9px;border:none;background:#2563eb;color:white;border-radius:5px;cursor:pointer;margin-right:4px;">
              ✎ View/Edit</button>
            <button onclick="event.stopPropagation(); window.printJobCard(j);"
              style="font-size:9px;font-weight:700;padding:3px 9px;border:none;background:#0f172a;color:white;border-radius:5px;cursor:pointer;margin-right:4px;">
              🖨️ PDF</button>
            ${!isClosed ? `<button onclick="event.stopPropagation(); updateJobCardStatus('${escapedName}', 'Closed', this)"
              style="font-size:9px;font-weight:700;padding:3px 9px;border:none;background:#10b981;color:white;border-radius:5px;cursor:pointer;">
              ✓ Close</button>` : ""}
          </td>`;
        jobCardTbody.appendChild(tr);
      });
    }

    // Quick status update from table row
    window.updateJobCardStatus = async function(name, status, btn) {
      if (!confirm("Mark job card " + name + " as " + status + "?")) return;
      const orig = btn.textContent;
      btn.textContent = "…"; btn.disabled = true;
      try {
        const res = await callFrappe(
          "/api/method/mxg_fleet_track.omnis_dashboard.ft_jobcard_dashboard.update_jc_status",
          { name, status }, "POST"
        );
        const result = res?.message || res;
        if (result?.ok) {
          showToast("✅ Job Card " + status, "ok");
          loadDailyJobCards();
        } else {
          showToast("Error: " + (result?.error || "Failed"), "err");
        }
      } catch(e) { showToast("Error: " + e.message, "err"); }
      finally { btn.textContent = orig; btn.disabled = false; }
    };

    // --- Job Card Creation Logic ---
    window.triggerJCCreationModal = function () {
      const overlay = document.getElementById("jc-create-modal-overlay");
      if (!overlay) { console.error("jc-create-modal-overlay not found"); return; }
      // Teleport to body to escape app-shell stacking context
      if (overlay.parentNode !== document.body) document.body.appendChild(overlay);
      overlay.classList.remove("hidden");
      overlay.style.setProperty("display", "flex", "important");

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
      if (overlay) { overlay.classList.add("hidden"); overlay.style.removeProperty("display"); }
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
                  <th style="padding:10px 16px;text-align:left;font-weight:700;color:#ffffff !important;border-bottom:2px solid #ef4444;width:160px;">MACHINE</th>
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
                          <span style="font-weight:600;color:#0f172a;">${lastHmr} HRS <span style="color:#94a3b8;">(${lastDate})</span></span>
                        </div>`;
        schedHtml += `  <div style="display:flex; justify-content:space-between; align-items:baseline;">
                          <span>Next Service (${interval}H interval):</span>
                          <div style="flex-grow:1; border-bottom:1px dotted #cbd5e1; margin:0 8px;"></div>
                          <span style="font-weight:600;color:#0f172a;">${nextHmr} HRS ${nextType ? '('+nextType+'H)' : ''}</span>
                        </div>`;
        schedHtml += `</div>`;
        
        if (hrsRemaining != null) {
          if (isOverdue) {
            schedHtml += `<div style="font-size:9px; font-weight:800; background:#fee2e2; color:#ef4444; padding:4px 8px; border-radius:4px; display:inline-block;">⚠ OVERDUE BY ${Math.abs(hrsRemaining).toFixed(0)} HRS</div>`;
          } else if (isDue) {
            schedHtml += `<div style="font-size:9px; font-weight:800; background:#fef3c7; color:#d97706; padding:4px 8px; border-radius:4px; display:inline-block;">⚠ DUE IN ${Number(hrsRemaining).toFixed(0)} HRS</div>`;
          } else {
            schedHtml += `<div style="font-size:9px; font-weight:700; color:#10b981; padding:2px 0;">${Number(hrsRemaining).toFixed(0)} hrs remaining</div>`;
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
                          ${currentHmr} <span style="font-size:8px;font-weight:700;color:#64748b;background:#f1f5f9;padding:2px 4px;border-radius:4px;margin-bottom:2px; pointer-events:none;">HRS</span>
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

        // ── Quick-Action Buttons ──
        const escapedName = String(r.name).replace(/'/g, "\\'").replace(/"/g, '&quot;');
        condHtml += `<div style="display:flex;gap:4px;margin-top:8px;justify-content:flex-end;">
          <button onclick="event.stopPropagation(); window.openMachineEditModal('${escapedName}');"
            style="font-size:9px;font-weight:700;padding:3px 8px;border:none;background:#2563eb;color:white;border-radius:5px;cursor:pointer;line-height:1.4;"
            title="Edit this machine">&#9998; Edit</button>
          <button onclick="event.stopPropagation(); window.openLogServiceModal('${escapedName}');"
            style="font-size:9px;font-weight:700;padding:3px 8px;border:none;background:#7c3aed;color:white;border-radius:5px;cursor:pointer;line-height:1.4;"
            title="Log a service for this machine">&#128295; Service</button>
          <button onclick="event.stopPropagation(); window.openCreateModal('${escapedName}');"
            style="font-size:9px;font-weight:700;padding:3px 8px;border:none;background:#ef4444;color:white;border-radius:5px;cursor:pointer;line-height:1.4;"
            title="Log new breakdown for this machine">+ BD</button>
        </div>`;

        condHtml += `</div>`;

        // Inject right-padded position for condition column if ribbon exists
        let pr = (isOverdue || isDue) ? "padding-right: 32px;" : "";
        let colCond = `<td style="${commonTdStyle}text-align:right;position:relative;${pr}">${ribbonHtml}${condHtml}</td>`;

        // Output TR
        const rowNum = start + idx + 1;
        const colNum = `<td style="padding:10px 8px; text-align:center; vertical-align:middle; color:#94a3b8; font-size:10px; font-weight:700; border-bottom:1px solid #e5e7eb; white-space:nowrap;">${rowNum}</td>`;
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
        const fields = [
          "name", "customer", "model", "oem", "type",
          "mxg_fleet_no", "fleet_no", "sn", "esn",
          "location", "region", "warranty_status",
          "current_hmr", "machine_picture"
        ];

        // Use callFrappe which handles IPC bridge authentication
        const showLoader = !overrides.quiet;
        const filterOpts = {
          table: 'ft_machine',
          method: 'select',
          params: { columns: '*', range: { from: 0, to: 9999 } }
        };
        
        if (Object.keys(overrides).length > 0 && !overrides.quiet) {
          filterOpts.params.match = {};
          if (overrides.region) filterOpts.params.match.region = overrides.region;
          if (overrides.customer) filterOpts.params.match.customer = overrides.customer;
          if (overrides.model) filterOpts.params.match.model = overrides.model;
          if (overrides.warranty_status) filterOpts.params.match.warranty_status = overrides.warranty_status;
          if (Object.keys(filterOpts.params.match).length === 0) delete filterOpts.params.match;
        }

        const raw = await window.electron.invoke('supabase:query', filterOpts);
        if (!raw || raw.error) {
          let msg = raw?.error?.message || "Failed to load machines from Supabase";
          showToast("Machine register error: " + msg, "err", 4500);
          return;
        }
        const payload = { data: raw.data || [] };
        window.FT_MACHINE_ROWS = payload.data || [];

        // Populate global map
        window.MACHINES_MAP = {};
        FT_MACHINE_ROWS.forEach(m => {
          if (m.name) window.MACHINES_MAP[m.name] = m;
        });

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

        showToast("Machine register loaded: " + FT_MACHINE_ROWS.length, "ok", 2200);

      } catch (e) {
        console.error("loadFtMachineRegister error:", e);
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
      try {
        const filters = {
          region: document.getElementById('dbr-filter-region')?.value || '',
          customer: document.getElementById('dbr-filter-customer')?.value || '',
          machine: document.getElementById('dbr-filter-machine')?.value || '',
          responsibility: document.getElementById('dbr-filter-responsibility')?.value || '',
          urgent: document.getElementById('dbr-filter-urgent')?.checked ? 1 : 0,
          _ts: Date.now() // Force fresh fetch to bypass browser cache
        };
        const raw = await callFrappe(FT_BREAKDOWN_DBR_METHOD, filters, 'GET', { 
            showLoader: true, 
            loaderMsg: "Syncing Breakdowns" 
        });
        const data = raw.message || {};

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

    // ============================================================
    // 🖨️ PHASE 9 — NATIVE PDF EXPORT ENGINE
    // ============================================================

    // ─────────────────────────────────────────────────────────────────────
    // captureStyledHTML — Serialize a live DOM node as a printable HTML doc
    // Only extracts :root CSS vars (NOT all styles — that causes blank prints)
    // ─────────────────────────────────────────────────────────────────────
    function captureStyledHTML(el, title, hideSelectors, subtitle) {
      // Extract ONLY :root CSS custom property definitions (tiny, critical for color vars)
      let rootVars = '';
      try {
        Array.from(document.querySelectorAll('style')).forEach(styleEl => {
          const matches = styleEl.textContent.match(/:root\s*\{[^}]+\}/g);
          if (matches) rootVars += matches.join('\n') + '\n';
        });
      } catch(_) {}

      // Build CSS to hide non-print elements
      const hideCSS = (hideSelectors || []).map(sel => sel + ' { display: none !important; }').join('\n');

      // Clone and strip unwanted elements
      const clone = el.cloneNode(true);
      (hideSelectors || []).forEach(sel => {
        try { clone.querySelectorAll(sel).forEach(n => n.remove()); } catch(_) {}
      });
      // Always strip buttons and action elements from the clone
      ['button','[onclick*="printDBR"],[onclick*="printMachineRegister"]',
       '#btn-print-dbr','#btn-new-bd-dbr','#btn-finalize-dbr','#dbr-kpi-supervisor',
       '.filter-bar','#native-report-print-bar','.top-nav','.sidebar','.topbar'
      ].forEach(sel => {
        try { clone.querySelectorAll(sel).forEach(n => n.remove()); } catch(_) {}
      });

      const now = new Date();
      const dateStr = now.toLocaleDateString('en-ZW', { day:'2-digit', month:'short', year:'numeric' });
      const timeStr = now.toLocaleTimeString('en-ZW', { hour:'2-digit', minute:'2-digit' });

      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title || 'Report'}</title>
  <style>
    /* CSS custom properties from the app */
    ${rootVars}

    /* ── Print-safe reset ── */
    *, *::before, *::after { box-sizing: border-box; }
    html, body {
      height: auto !important; max-height: none !important;
      overflow: visible !important;
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 10px; background: #fff; color: #0f172a;
      margin: 0; padding: 12px;
    }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }

    /* ── Layout fixes ── */
    div, section, article { overflow: visible !important; height: auto !important; max-height: none !important; }
    [style*="overflow"] { overflow: visible !important; }

    /* ── Hide non-print UI ── */
    button, .filter-bar, .top-nav, .sidebar, .topbar,
    .modal-overlay, .toast-container, .view-page,
    #btn-print-dbr, #btn-new-bd-dbr, #btn-finalize-dbr, #dbr-kpi-supervisor,
    #native-report-print-bar, [onclick*="print"], [onclick*="Print"] { display: none !important; }
    ${hideCSS}

    /* ── Table styles ── */
    table { width: 100%; border-collapse: collapse; table-layout: auto; }
    th { background: #f02510 !important; color: #fff !important;
         font-size: 9px; font-weight: 700; text-transform: uppercase;
         padding: 7px 6px; text-align: left; }
    td { padding: 6px 6px; font-size: 10px; vertical-align: top;
         border-bottom: 1px solid #f1f5f9; }
    tr:nth-child(even) td { background: #fafafa !important; }

    /* ── Status badges ── */
    .br, [style*="fee2e2"] { background: #fee2e2 !important; color: #dc2626 !important;
      padding: 2px 5px; border-radius: 3px; font-weight: 700; font-size: 9px; }
    .ba, [style*="fef3c7"] { background: #fef3c7 !important; color: #d97706 !important;
      padding: 2px 5px; border-radius: 3px; font-weight: 700; font-size: 9px; }
    .bg, [style*="dcfce7"] { background: #dcfce7 !important; color: #16a34a !important;
      padding: 2px 5px; border-radius: 3px; font-weight: 700; font-size: 9px; }
    .bz { background: #f1f5f9 !important; color: #475569 !important;
      padding: 2px 5px; border-radius: 3px; font-weight: 700; font-size: 9px; }

    /* ── Efficiency bar ── */
    [style*="background:#000"],[style*="background: #000"],
    [style*="background:#0f172a"],[style*="background: #0f172a"] {
      background: #0f172a !important; color: #fff !important;
    }

    /* ── Print footer ── */
    .rpt-capture-footer {
      margin-top: 12px; padding-top: 8px; border-top: 1px solid #e2e8f0;
      display: flex; justify-content: space-between; font-size: 9px; color: #94a3b8;
    }

    @media print {
      @page { size: A4 landscape; margin: 8mm; }
      body { padding: 0; }
    }
  </style>
</head>
<body>
  ${clone.innerHTML}
  <div class="rpt-capture-footer">
    <span>Omnis v2 — Fleetrack Dashboard</span>
    <span>Machinery Exchange &copy; ${now.getFullYear()}</span>
    <span>${dateStr} ${timeStr}</span>
  </div>

<script>
