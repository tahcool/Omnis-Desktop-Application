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
            title: \DBR  - \,
            region: region,
            signatories: signatoriesList || "System",
            content_b64: base64data
          };

          const stamp = new Date().toISOString().replace(/T/, '_').replace(/:/g, '-').split('.')[0];
          const filename = \DBR__.pdf\;
          let fileUrl = null;
          
          // 1. Upload to Supabase Storage
          const uploadRes = await window.electron.invoke('storage:upload', {
              bucket: 'reports',
              path: filename,
              base64Data: base64data,
              contentType: 'application/pdf'
          });
          if (!uploadRes.ok) throw new Error(uploadRes.error || "Upload failed");
          fileUrl = uploadRes.publicUrl;

          // 2. Save metadata to native ft_service_report table
          const res = await window.electron.invoke('supabase:query', {
              table: 'ft_service_report',
              method: 'insert',
              params: { data: {
                  report_type: 'DBR',
                  title: payload.title,
                  region: payload.region,
                  signatories: payload.signatories,
                  file_url: fileUrl
              }}
          });

          if (!res.error) {
            showToast("? Report Archived Successfully", "success");
            closeSignatureModal();
            setTimeout(() => { showView("view-archives"); }, 1500);
          } else {
            throw new Error(res.error.message || "Archival failed");
          }openHmrLogModal = function(machineData) {
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
          <tr style="border-bottom:1px solid #e2e8f0; font-size:13px; color:#475569; transition:background 0.2s; cursor:default;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">
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

    // ─────────────────────────────────────────────────────────────────────
    // Initial Service Report (ISR)
    // ─────────────────────────────────────────────────────────────────────
    let ISR_ROWS = [];

    window.loadISR = async function() {
      const region = document.getElementById('isr-filter-region')?.value || '';
      const container = document.getElementById('isr-table-container');
      const kpi = document.getElementById('isr-kpi-badge');
      if (!container) return;
      container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted);font-size:13px;">⏳ Loading ISR data...</div>';
      try {
        const params = {};
        if (region) params.region = region;
        const raw = await callFrappe(window.FT_ISR_METHOD, params, 'GET', { timeout: 30000 });
        const payload = raw.message || raw;
        ISR_ROWS = payload.machines || [];
        if (kpi) {
          kpi.textContent = ISR_ROWS.length + ' machine' + (ISR_ROWS.length !== 1 ? 's' : '') + ' — No Service Date';
          kpi.style.display = 'block';
        }
        renderISRTable(ISR_ROWS);
      } catch(e) {
        container.innerHTML = '<div style="text-align:center;padding:40px;color:#ef4444;font-size:13px;">❌ Error loading ISR: ' + e.message + '</div>';
        console.error('[ISR] load error:', e);
      }
    };

    window.filterISRTable = function() {
      const custQ = (document.getElementById('isr-filter-customer')?.value || '').toLowerCase();
      const modelQ = (document.getElementById('isr-filter-model')?.value || '').toLowerCase();
      const filtered = ISR_ROWS.filter(r => {
        const custOk = !custQ || (r.customer||'').toLowerCase().includes(custQ);
        const modelOk = !modelQ || (r.model||'').toLowerCase().includes(modelQ) ||
          (r.sn||'').toLowerCase().includes(modelQ) || (r.fleet_no||'').toLowerCase().includes(modelQ);
        return custOk && modelOk;
      });
      renderISRTable(filtered);
    };

    function renderISRTable(rows) {
      const container = document.getElementById('isr-table-container');
      if (!container) return;
      if (!rows.length) {
        container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted);font-size:13px;">✅ No machines without a service date for the selected filters.</div>';
        return;
      }
      const headers = ['#','CUSTOMER','MODEL','SN / FLEET NO','REGION','LOCATION','CURRENT HMR','NEXT SVC HMR','WARRANTY','LAST MODIFIED'];
      const ths = headers.map(h => '<th style="padding:9px 10px;text-align:left;font-size:9px;font-weight:700;text-transform:uppercase;color:#fff;border-right:1px solid rgba(255,255,255,.15);">' + h + '</th>').join('');
      const trs = rows.map((r,i) => {
        const wBg = r.warranty_status && r.warranty_status.toLowerCase().includes('under')
          ? 'background:#dcfce7;color:#16a34a' : 'background:#f1f5f9;color:#64748b';
        const mod = r.modified ? r.modified.substring(0,10) : '—';
        return '<tr style="border-bottom:1px solid var(--glass-border);">' +
          '<td style="padding:8px 10px;font-size:10px;color:var(--text-muted);">' + (i+1) + '</td>' +
          '<td style="padding:8px 10px;font-size:11px;font-weight:700;color:var(--text-main);">' + (r.customer||'—') + '</td>' +
          '<td style="padding:8px 10px;font-size:10px;">' + (r.model||'—') + '</td>' +
          '<td style="padding:8px 10px;font-size:10px;color:var(--text-muted);">' + (r.sn||'—') + (r.fleet_no ? ' / '+r.fleet_no : '') + '</td>' +
          '<td style="padding:8px 10px;font-size:10px;">' + (r.region||'—') + '</td>' +
          '<td style="padding:8px 10px;font-size:10px;color:var(--text-muted);">' + (r.location||'—') + '</td>' +
          '<td style="padding:8px 10px;font-size:10px;text-align:right;font-weight:700;">' + (r.current_hmr != null ? Number(r.current_hmr).toFixed(0) + ' h' : '—') + '</td>' +
          '<td style="padding:8px 10px;font-size:10px;text-align:right;">' + (r.next_service_hmr != null ? Number(r.next_service_hmr).toFixed(0) + ' h' : '—') + '</td>' +
          '<td style="padding:8px 10px;"><span style="font-size:9px;font-weight:700;padding:2px 7px;border-radius:4px;' + wBg + ';">' + (r.warranty_status||'—') + '</span></td>' +
          '<td style="padding:8px 10px;font-size:10px;color:var(--text-muted);">' + mod + '</td>' +
          '</tr>';
      }).join('');
      container.innerHTML =
        '<table style="width:100%;border-collapse:collapse;">' +
        '<thead><tr style="background:#f02510;">' + ths + '</tr></thead>' +
        '<tbody>' + trs + '</tbody></table>' +
        '<div style="padding:8px 4px;font-size:10px;color:var(--text-muted);text-align:right;">Showing ' + rows.length + ' machine' + (rows.length!==1?'s':'') + ' with no service date recorded.</div>';
    }

    window.printISR = function() {
      const rows = ISR_ROWS;
      if (!rows.length) { showToast('No ISR data. Load the report first.', 'warn'); return; }
      const region = document.getElementById('isr-filter-region')?.value || 'All Regions';
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-ZW', {day:'2-digit',month:'short',year:'numeric'});
      const timeStr = now.toLocaleTimeString('en-ZW', {hour:'2-digit',minute:'2-digit'});
      const tbody = rows.map((r,i) => {
        const wStyle = r.warranty_status && r.warranty_status.toLowerCase().includes('under')
          ? 'background:#dcfce7;color:#16a34a' : 'background:#f1f5f9;color:#64748b';
        return '<tr style="border-bottom:1px solid #f1f5f9;">' +
          '<td style="padding:5px 6px;font-size:9px;color:#94a3b8;">' + (i+1) + '</td>' +
          '<td style="padding:5px 6px;font-size:10px;font-weight:700;">' + (r.customer||'—') + '</td>' +
          '<td style="padding:5px 6px;font-size:10px;">' + (r.model||'—') + '</td>' +
          '<td style="padding:5px 6px;font-size:9px;color:#64748b;">' + (r.sn||'—') + (r.fleet_no?' / '+r.fleet_no:'') + '</td>' +
          '<td style="padding:5px 6px;font-size:10px;">' + (r.region||'—') + '</td>' +
          '<td style="padding:5px 6px;font-size:9px;color:#64748b;">' + (r.location||'—') + '</td>' +
          '<td style="padding:5px 6px;font-size:10px;text-align:right;font-weight:700;">' + (r.current_hmr!=null?Number(r.current_hmr).toFixed(0)+' h':'—') + '</td>' +
          '<td style="padding:5px 6px;font-size:10px;text-align:right;">' + (r.next_service_hmr!=null?Number(r.next_service_hmr).toFixed(0)+' h':'—') + '</td>' +
          '<td style="padding:5px 6px;"><span style="font-size:8px;font-weight:700;padding:2px 5px;border-radius:3px;' + wStyle + ';">' + (r.warranty_status||'—') + '</span></td>' +
          '</tr>';
      }).join('');
      const html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>ISR - ' + region + '</title>' +
        '<style>*{box-sizing:border-box;margin:0;padding:0;}html,body{height:auto!important;overflow:visible!important;background:#fff;color:#0f172a;font-family:Segoe UI,Arial,sans-serif;font-size:10px;padding:12px;}' +
        '*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}' +
        '.hdr{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #f02510;padding-bottom:8px;margin-bottom:10px;}' +
        '.brand{font-size:20px;font-weight:900;}.brand span{color:#f02510;}' +
        '.subbrand{font-size:8px;color:#64748b;text-transform:uppercase;letter-spacing:.1em;}' +
        '.rtitle{font-size:16px;font-weight:800;text-align:right;}.rtitle em{color:#f02510;font-style:normal;}' +
        '.notice{background:#fef3c7;border:1px solid #fcd34d;border-radius:6px;padding:8px 12px;font-size:10px;font-weight:600;color:#92400e;margin-bottom:10px;}' +
        'table{width:100%;border-collapse:collapse;}thead tr{background:#f02510!important;}' +
        'th{padding:7px 6px;text-align:left;color:#fff!important;font-weight:700;font-size:9px;text-transform:uppercase;border-right:1px solid rgba(255,255,255,.2);}' +
        'tbody tr:nth-child(even) td{background:#fafafa!important;}td{padding:6px;font-size:10px;vertical-align:top;border-bottom:1px solid #f1f5f9;}' +
        '.ftr{margin-top:10px;padding-top:6px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-size:9px;color:#94a3b8;}' +
        '@media print{@page{size:A4 landscape;margin:8mm;}body{padding:0;}}</style></head><body>' +
        '<div class="hdr"><div><div class="brand">OMNIS<span>.</span></div><div class="subbrand">Fleetrack — Machinery Exchange</div></div>' +
        '<div><div class="rtitle"><em>Initial</em> Service Report (ISR) — ' + region + '</div>' +
        '<div style="font-size:9px;color:#64748b;text-align:right;">Records: ' + rows.length + ' | Generated: ' + dateStr + ' ' + timeStr + '</div></div></div>' +
        '<div class="notice">⚠ The following ' + rows.length + ' machine' + (rows.length!==1?'s':'') + ' have NO recorded Last Service Date and require an initial service.</div>' +
        '<table><thead><tr><th>#</th><th>CUSTOMER</th><th>MODEL</th><th>SERIAL NO.</th><th>REGION</th><th>LOCATION</th><th>CURRENT HMR</th><th>NEXT SVC HMR</th><th>WARRANTY</th></tr></thead>' +
        '<tbody>' + tbody + '</tbody></table>' +
        '<div class="ftr"><span>Omnis v2 — Fleetrack</span><span>Machinery Exchange &copy; ' + now.getFullYear() + '</span><span>' + dateStr + ' ' + timeStr + '</span></div>' +
        '</body></html>';
      if (typeof window.openReportPrintModal === 'function') {
        window.openReportPrintModal(html, 'Initial Service Report (ISR) — ' + region);
      }
    };

    window.printJobCard = function(row) {
      if (!row) { showToast('No job card data.', 'warn'); return; }
      // For job cards, use the branded buildReportHtml since it's structured data
      const f = (label, val) => val
        ? '<tr><td style="font-size:9px;color:#64748b;font-weight:700;text-transform:uppercase;padding:5px 8px;width:130px;">'+label+'</td><td style="padding:5px 8px;">'+val+'</td></tr>'
        : '';
      const sB = s => {
        if (!s) return '—';
        const sl = s.toLowerCase();
        if (sl.includes('open')||sl.includes('active')) return '<span class="br">'+s+'</span>';
        if (sl.includes('progress')) return '<span class="ba">'+s+'</span>';
        if (sl.includes('complet')||sl.includes('close')) return '<span class="bg">'+s+'</span>';
        return '<span class="bz">'+s+'</span>';
      };
      const tableHtml =
        '<table style="margin-bottom:16px;"><thead><tr><th colspan="2">Job Card Details</th></tr></thead><tbody>'+
        f('Job Card ID',row.name)+f('Customer',row.customer)+
        f('Machine / SN',row.machine||row.machine_name)+f('Model',row.model)+
        f('Technician',row.technician||row.assigned_to)+f('Status',sB(row.status))+
        f('Start Date',row.start_date)+f('End Date',row.end_date)+f('Current HMR',row.current_hmr)+
        f('Description',(row.description||'').substring(0,300))+
        f('Parts Required',row.parts_required)+
        f('Notes',(row.technician_notes||row.comments||'').substring(0,300))+
        '</tbody></table>'+
        '<table><thead><tr><th colspan="2">Authorisation</th></tr></thead><tbody>'+
        '<tr><td colspan="2" style="padding:20px 8px;color:#64748b;font-size:9px;text-align:center;">'+
        'Customer Signature: _________________________  Technician Signature: _________________________  Date: _____________'+
        '</td></tr></tbody></table>';
      const html = buildReportHtml({
        title: 'Job Card — '+(row.name||''),
        subtitle: 'Customer: '+(row.customer||'—')+' | Machine: '+(row.machine||row.machine_name||'—'),
        tableHtml,
        metaLines: ['Status: '+(row.status||'—')+' | Technician: '+(row.technician||row.assigned_to||'—')]
      });
      if (typeof window.openReportPrintModal === 'function') { window.openReportPrintModal(html, 'Job Card — '+(row.name||'')); }
    };

    // ----------------------------------------------------------
    // 📄 printCurrentReportPDF() — routes to modal
    // ----------------------------------------------------------
    window.printCurrentReportPDF = function() {
      if (typeof window.openReportPrintModal === 'function') { window.openReportPrintModal(); }
    };

    // ----------------------------------------------------------
    // 🖶 openReportPrintModal() — In-app Print Preview Modal
    // ----------------------------------------------------------
    window.openReportPrintModal = function(customHtml, customTitle) {
      const reportName = customTitle || window.__activeReportName || 'Report';
      let fullHtml = customHtml || null;

      // If no pre-built HTML: build from active report data
      if (!fullHtml) {
        const reportData = window.__activeReportData;
        const filters    = window.__activeReportFilters || {};
        if (!reportData || !reportData.result || !reportData.result.length) {
          showToast('No report data. Run the report first.', 'warn');
          return;
        }
        const cols = reportData.columns || [];
        const rows = reportData.result || [];
        const filterMeta = Object.entries(filters).filter(([,v])=>v).map(([k,v])=>k+': '+v).join('  |  ') || 'No filters applied';
        const ths = cols.map(col => '<th>'+(col.label||col.fieldname||col)+'</th>').join('');
        const trs = rows.map(row => {
          const tds = cols.map(col => {
            const key = typeof col === 'object' ? col.fieldname : col;
            let val = row[key]; if (val===null||val===undefined) val='';
            return '<td>'+String(val)+'</td>';
          }).join('');
          return '<tr>'+tds+'</tr>';
        }).join('');
        const tableHtml = '<table><thead><tr>'+ths+'</tr></thead><tbody>'+trs+'</tbody></table>';
        fullHtml = buildReportHtml({ title: reportName, subtitle: filterMeta, tableHtml, metaLines: ['Records: '+rows.length] });
      }

      const modal = document.getElementById('rpt-print-modal');
      const iframe = document.getElementById('rpt-print-iframe');
      const titleEl = document.getElementById('rpt-print-modal-title');
      if (!modal || !iframe) { console.error('[Print] Modal elements missing'); return; }
      if (titleEl) titleEl.textContent = reportName;
      // Set srcdoc — iframe fires 'load' when done; triggerReportPrint waits for that
      iframe.srcdoc = fullHtml;
      modal.classList.remove('hidden');
      modal.style.display = 'flex';
    };

    window.closeReportPrintModal = function() {
      const modal = document.getElementById('rpt-print-modal');
      if (modal) { modal.style.display = 'none'; modal.classList.add('hidden'); }
    };

    window.triggerReportPrint = function() {
      const iframe = document.getElementById('rpt-print-iframe');
      if (!iframe) return;

      const doPrint = () => {
        try {
          iframe.contentWindow.focus();
          setTimeout(() => {
            try { iframe.contentWindow.print(); }
            catch(e) { console.error('[Print]', e); }
          }, 400); // extra render settle time
        } catch(e) { console.error('[Print] focus failed:', e); }
      };

      // Check if iframe has already loaded its current srcdoc
      if (iframe.contentDocument && iframe.contentDocument.readyState === 'complete' &&
          iframe.contentDocument.body && iframe.contentDocument.body.innerHTML.trim().length > 10) {
        doPrint();
      } else {
        // Wait for load event
        iframe.onload = () => { iframe.onload = null; doPrint(); };
      }
    };

    window.printCurrentReportPrinter = window.openReportPrintModal;

    // ---------------------------
    //
    // Live Filtering Setup
    // ---------------------------
    function setupDbrLiveFilters() {
      const region = document.getElementById('dbr-filter-region');
      const customer = document.getElementById('dbr-filter-customer');
      const machine = document.getElementById('dbr-filter-machine');
      const resp = document.getElementById('dbr-filter-responsibility');
      const urgent = document.getElementById('dbr-filter-urgent');

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

      if (customer) customer.addEventListener('input', debouncedLoad);
      if (machine) machine.addEventListener('input', debouncedLoad);
    }

    // Initialize live filters
    setupDbrLiveFilters();

    function kvGrid(items) {
      const rows = items.map(([k, v]) => `
      <div style="display:flex;flex-direction:column;gap:3px;min-width:220px;">
      <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;">${k}</div>
      <div
        style="font-size:12px;font-weight:600;color:var(--text-main);background:var(--bg-main);border:1px solid var(--glass-border);border-radius:10px;padding:8px 10px;word-break:break-word;">
        ${safeText(v) || "—"}
      </div>
    </div>
      `).join("");

      return `<div style="display:flex;flex-wrap:wrap;gap:10px;">${rows}</div>`;
    }

    function sectionBlock(title, innerHtml, open) {
      const id = "sec_" + Math.random().toString(16).slice(2);
      return `
      <div style="background:var(--bg-card);border:1px solid var(--glass-border);border-radius:14px;overflow:hidden;">
      <div style="padding:10px 12px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;"
        onclick="(function(){var b=document.getElementById('${id}');var i=document.getElementById('${id}_i'); if(!b) return; var isOpen=b.dataset.open==='1'; b.dataset.open=isOpen?'0':'1'; b.style.display=isOpen?'none':'block'; if(i) i.textContent=isOpen?'▸':'▾'; })();">
        <div style="font-size:12px;font-weight:700;color:var(--text-main);">${title}</div>
        <div id="${id}_i" style="color:var(--text-muted);">${open ? "▾" : "▸"}</div>
      </div>
      <div id="${id}" data-open="${open ? "1" : "0"}" style="display:${open ? "block" : "none"};padding:10px 12px;border-top:1px solid var(--glass-border);">
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
      overlay.style.zIndex = "99999"; 
      
      if (titleEl) titleEl.textContent = name;
      if (subEl) subEl.textContent = "Loading machine…";
      if (bodyEl) bodyEl.innerHTML = `<div style="font-size:12px;color:var(--text-muted);padding:40px;text-align:center;">
        <span class="omnis-spinner-ring" style="width:24px;height:24px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:12px;"></span> Loading Machine Details...
      </div>`;

      try {
        console.log("[MachineModal] Fetching data for:", name);
        let doc = window.FT_MACHINE_DETAIL_CACHE && window.FT_MACHINE_DETAIL_CACHE[name];
        if (!doc) {
          // fetch via Frappe call to avoid permission error on direct REST resource
          const raw = await callFrappe(FT_MACHINE_DETAIL_METHOD, { name: name });
          if (raw.exc || raw.exception || raw.error) throw new Error(raw.exc || raw.exception || raw.error || "Failed to load machine doc");

          doc = raw.message || raw.data || raw;
          // If message wrapper is used, doc is inside message
          if (doc && doc.name) {
            if (window.FT_MACHINE_DETAIL_CACHE) window.FT_MACHINE_DETAIL_CACHE[name] = doc;
          } else {
            throw new Error("Machine not found");
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

      <div style="display:flex;flex-direction:column;gap:10px;">
        ${sectionBlock("Machine Details", kvGrid([
              ["Name", doc.name],
              ["Customer", doc.customer],
              ["Fleet No.", doc.mxg_fleet_no || doc.fleet_no],
              ["SN", doc.sn],
              ["ESN", doc.esn],
              ["Chassis Number", doc.chassis_number],
              ["Has Telematics?", doc.has_telematics_device],
              ["Engine Type", doc.engine_type],
            ]), true)}

        ${sectionBlock("Warranty Details", kvGrid([
              ["Warranty Status", doc.warranty_status],
              ["Warranty Type", doc.warranty_type],
              ["Period (Months)", doc.warranty_period],
              ["Handover Date", doc.handover_date],
              ["Expiry Date", doc.expiry_date],
              ["Warranty Hours", doc.warranty_hours],
            ]), false)}

        ${sectionBlock("HMR", kvGrid([
              ["Starting HMR", doc.starting_hmr],
              ["Last HMR Date", doc.last_hmr_date],
              ["Last Log", doc.last_hmr_log],
              ["Current HMR", doc.current_hmr],
              ["Total Running Hours", doc.total_running_hours],
              ["Days Since", doc.days_since_last_hmr],
            ]), false)}
      </div>
    </div>
      `;

        const service = sectionBlock("Service Configuration", kvGrid([
          ["Service Obligation", doc.service_obligation],
          ["Service Interval (hrs)", doc.service_interval_hours],
          ["Last Service Date", doc.last_service_date],
          ["Last Service HMR", doc.last_service_hmr],
          ["Last Service Type", doc.last_service_type],
          ["Next Service HMR", doc.next_service_hmr],
          ["Next Service Type", doc.next_service_type],
          ["Hours to Service", doc.hours_remaining_to_service],
        ]), false);

        const notes = sectionBlock("Notes", `
      <div style="background:var(--bg-main);border:1px solid var(--glass-border);border-radius:14px;padding:10px 12px;min-height:70px;white-space:pre-wrap;color:var(--text-main);">
      ${safeText(doc.notes) || "—"}
    </div>
      `, false);

        const libLinks = [
          ["Filters List", doc.filters_list],
          ["PDI Checklist", doc.pdi_checklist],
          ["Equipment Info Form", doc.equipment_information_form],
          ["Belt Dimensions", doc.belt_dimensions],
          ["Hyd. Filters Dimensions", doc.hyd_filters_dimensions],
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

        const libHtml = libLinks.map(([label, url]) => {
          const u = machineAttachmentLink(url);
          return `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;background:var(--bg-card);border:1px solid var(--glass-border);border-radius:12px;padding:8px 10px;">
      <div style="font-size:12px;font-weight:600;">${label}</div>
      ${u ? `<a class="tiny-btn tiny-btn-primary" href="${u}" target="_blank">Open</a>`
              : `<span style="font-size:11px;color:#6b7280;">—</span>`
            }
    </div>
      `;
        }).join("");

        const library = sectionBlock("Library", `
      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;">
        ${libHtml}
    </div>
      `, false);

        if (mcBody) {
          mcBody.innerHTML = `
    ${top}
    <div style="display:flex;flex-direction:column;gap:10px;">
      ${service}
      ${notes}
      ${library}
    </div>
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
          "This is a placeholder reply.\n\nOnce Omnis AI is wired for Fleetrack, I’ll be able to answer with live data."
        );
        setChatStatus("");
      }, 600);
    }

    if (searchFab) {
      searchFab.addEventListener("click", (e) => {
        e.stopPropagation();
        const hidden = chatWidget.classList.contains("hidden");
        if (hidden) {
          chatWidget.classList.remove("hidden");
          if (!chatMessages.children.length) {
            appendChatMessage(
              "assistant",
              `Hi, I'm Omnis Assist for Fleetrack.\n\nLater I'll be able to answer:\n• Open breakdowns today\n• Machines with defects\n• FSIs due tomorrow\n`
            );
          }
          chatInput.focus();
        } else {
          chatWidget.classList.add("hidden");
        }
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
    function openNewBreakdown() {
      window.open(FLEET_BASE_URL + "/app/ft-breakdown-log/new-ft-breakdown-log", "_blank");
    }

    function openNewJobCard() {
      window.open(FLEET_BASE_URL + "/app/ft-job-card/new-ft-job-card", "_blank");
    }

    // --- Frappe Native Report Engine ---
    window.__ = function(str) { return str; }; // Mock Frappe translation

    function renderMicroTemplate(str, data) {
        var fn = new Function("obj",
            "var p=[],print=function(){p.push.apply(p,arguments);};" +
            "with(obj){p.push('" +
            str
              .replace(/[\r\t\n]/g, " ")
              .split("{%").join("\t")
              .replace(/((^|%})[^\t]*)'/g, "$1\r")
              .replace(/\t=(.*?)%}/g, "',$1,'")
              .split("\t").join("');")
              .split("%}").join("p.push('")
              .split("\r").join("\\'")
          + "');}return p.join('');");
        return fn(data);
    }
    
    async function processIncludes(htmlStr) {
        const includeRegex = /\{%\s*include\s+['"]([^'"]+)['"]\s*%\}/g;
        let match;
        let processedHtml = htmlStr;
        while ((match = includeRegex.exec(processedHtml)) !== null) {
            const includePath = match[1];
            const localPath = includePath.replace('mxg_fleet_track/report/', './report/');
            try {
                const includeRes = await fetch(localPath);
                if (includeRes.ok) {
                    const includeContent = await includeRes.text();
                    processedHtml = processedHtml.replace(match[0], includeContent);
                } else {
                    processedHtml = processedHtml.replace(match[0], `<!-- Failed to load include: ${localPath} -->`);
                }
            } catch (e) {
                processedHtml = processedHtml.replace(match[0], `<!-- Error loading include: ${localPath} -->`);
            }
            includeRegex.lastIndex = 0;
        }
        return processedHtml;
    }

    async function runNativeReport(encodedReportName, folderName) {
        const reportNameStr = decodeURIComponent(encodedReportName);
        const container = document.getElementById("native-report-container");
        container.innerHTML = '<div style="padding: 40px; text-align: center; color: #64748b;">Fetching data from Frappe...</div>';
        
        try {
            const filters = {};
            if (window.__currentReportFilters) {
                window.__currentReportFilters.forEach(f => {
                    const el = document.getElementById(`filter-${f.fieldname}`);
                    if (el) filters[f.fieldname] = el.value;
                });
            }

            const rawData = await callFrappe('/api/method/frappe.desk.query_report.run', {
                report_name: reportNameStr,
                filters: JSON.stringify(filters),
                ignore_prepared_report: 1
            }, 'POST', { showLoader: true, loaderMsg: "Running Report" });
            
            if (!rawData || !rawData.message || !rawData.message.result) {
                container.innerHTML = `<div style="color: red; padding: 20px; font-family: monospace; font-size: 11px;">Error: Missing result. Payload: ${JSON.stringify(rawData || 'null')}</div>`;
                return;
            }
            if (rawData.message.result.length === 0) {
                container.innerHTML = '<div style="padding: 60px; text-align: center; color: #64748b; font-size: 14px;"><svg style="width:48px;height:48px;opacity:0.2;margin-bottom:12px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg><br>No data available for the selected filters.</div>';
                return;
            }
            
            let rawHtml = "";
            let isDynamicFallback = false;
            try {
                const htmlRes = await fetch(`./report/${folderName}/${folderName}.html`);
                if (!htmlRes.ok) throw new Error("Not found");
                rawHtml = await htmlRes.text();
                rawHtml = await processIncludes(rawHtml);
            } catch (e) {
                isDynamicFallback = true;
                // Fallback to auto-generating a standard data table
                const cols = rawData.message.columns || [];
                const rows = rawData.message.result || [];
                
                let ths = cols.map(c => `<th style="padding: 10px 12px; border-bottom: 2px solid #cbd5e1; text-align: left; font-size: 12px; font-weight: 700; color: #475569; white-space: nowrap; background: #f8fafc;">${c.label || c.fieldname || ''}</th>`).join('');
                let trs = rows.map(r => {
                    let tds = cols.map(c => {
                        let val = r[c.fieldname];
                        if (val === null || val === undefined) val = '';
                        return `<td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #0f172a;">${val}</td>`;
                    }).join('');
                    return `<tr style="transition: background 0.15s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='transparent'">${tds}</tr>`;
                }).join('');
                
                rawHtml = `<div style="background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 20px; overflow-x: auto;">
                    <h2 style="margin-top: 0; margin-bottom: 20px; font-size: 20px; color: #0f172a;">${reportNameStr}</h2>
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead><tr>${ths}</tr></thead>
                        <tbody>${trs}</tbody>
                    </table>
                </div>`;
            }
            
            if (isDynamicFallback) {
                container.innerHTML = rawHtml;
                // Store state for dynamic fallback path too
                window.__activeReportName = reportNameStr;
                window.__activeReportData = rawData.message;
                window.__activeReportFilters = filters;
                const _pb2 = document.getElementById('native-report-print-bar');
                if (_pb2) _pb2.style.display = 'flex';
                const _ce2 = document.getElementById('native-report-row-count');
                const _rc2 = rawData.message && rawData.message.result ? rawData.message.result.length : 0;
                if (_ce2) _ce2.textContent = _rc2 + ' records';
            } else {
                const context = {
                    data: rawData.message.result,
                    filters: filters,
                    frappe: {
                        user_info: () => ({ fullname: "Omnis User" }),
                        datetime: { now_date: () => new Date() }
                    }
                };
                
                const renderedHtml = renderMicroTemplate(rawHtml, context);
                container.innerHTML = renderedHtml;
            }

            // Store report state for universal print functions
            window.__activeReportName = reportNameStr;
            window.__activeReportData = rawData.message;
            window.__activeReportFilters = filters;

            // Show print bar and update record count
            const printBar = document.getElementById('native-report-print-bar');
            if (printBar) printBar.style.display = 'flex';
            const countEl = document.getElementById('native-report-row-count');
            const rowCount = (rawData.message && rawData.message.result) ? rawData.message.result.length : 0;
            if (countEl) countEl.textContent = rowCount + ' records';

        } catch(err) {
            console.error("Native report error", err);
            container.innerHTML = `<div style="color: red; padding: 20px; font-weight: 600;">Failed to run report: ${err.message}</div>`;
        }
    }

    async function openFrappeReport(encodedReportName) {
      const reportNameStr = decodeURIComponent(encodedReportName);
      
      showView("view-frappe-report");
      const mainTitle = document.getElementById("main-title");
      if (mainTitle) mainTitle.textContent = reportNameStr;
      
      const container = document.getElementById("native-report-container");
      const filterBar = document.getElementById("native-report-filter-bar");
      
      container.innerHTML = '<div style="padding: 40px; text-align: center; color: #64748b;">Loading report module...</div>';
      filterBar.innerHTML = '';

      // Hide print bar on new report load
      const _pb = document.getElementById('native-report-print-bar');
      if (_pb) _pb.style.display = 'none';
      window.__activeReportName = reportNameStr;
      window.__activeReportData = null;
      
      // Inject Custom Action Buttons for Specific Reports
      if (reportNameStr === 'Daily Breakdown Report (DBR)') {
          const actionContainer = document.createElement('div');
          actionContainer.style.display = 'flex';
          actionContainer.style.gap = '10px';
          actionContainer.style.marginLeft = 'auto'; // push to the right side of the filter bar
          actionContainer.innerHTML = `
              <div onclick="openCreateModal()" style="background:var(--accent);color:#ffffff;padding:8px 16px;border-radius:var(--radius);font-size:13px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px;box-shadow:var(--shadow-sm);">
                <span>+</span><span>New BD</span>
              </div>
              <div onclick="window.print()" style="background:var(--bg-main);border:1px solid var(--border-color);color:var(--text-main);padding:8px 16px;border-radius:var(--radius);font-size:13px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;">
                <span>🖨️</span><span>Print PDF</span>
              </div>
              <button onclick="openSignatureModal()" style="background:#ef4444; color:#fff; border:none; padding:8px 16px; border-radius:8px; font-size:13px; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:6px; box-shadow: 0 4px 6px -1px rgba(239, 68, 68, 0.3);">
                <span>📝</span><span>Finalize & Sign</span>
              </button>
          `;
          filterBar.appendChild(actionContainer);
      }

      const folderName = reportNameStr.toLowerCase().replace(/ /g, '_');
      
      try {
          let filtersDef = [];
          try {
              const jsRes = await fetch(`./report/${folderName}/${folderName}.js`);
              if (jsRes.ok) {
                  const jsCode = await jsRes.text();
                  window.frappe = window.frappe || {};
                  window.frappe.query_reports = window.frappe.query_reports || {};
                  eval(jsCode);
                  if (window.frappe.query_reports[reportNameStr] && window.frappe.query_reports[reportNameStr].filters) {
                      filtersDef = window.frappe.query_reports[reportNameStr].filters;
                  }
              }
          } catch(e) { console.warn("Could not load filters for", reportNameStr, e); }

          let filterHtml = '';
          filtersDef.forEach(f => {
              if (f.fieldtype === 'Link' || f.fieldtype === 'Select') {
                  filterHtml += `<div style="display: flex; flex-direction: column; gap: 4px;">
                      <label style="font-size: 11px; font-weight: 600; color: #475569; text-transform: uppercase;">${f.label}</label>
                      <select id="filter-${f.fieldname}" style="padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; outline: none; background: white; min-width: 150px; transition: border 0.2s;" onfocus="this.style.borderColor='#be185d'" onblur="this.style.borderColor='#cbd5e1'" ${f.fieldtype === 'Link' ? `data-link-doctype="${f.options}"` : ''}>
                        <option value="">Select ${f.label}...</option>
                      </select>
                  </div>`;
              } else if (f.fieldtype === 'Date') {
                  filterHtml += `<div style="display: flex; flex-direction: column; gap: 4px;">
                      <label style="font-size: 11px; font-weight: 600; color: #475569; text-transform: uppercase;">${f.label}</label>
                      <input type="date" id="filter-${f.fieldname}" style="padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; outline: none; transition: border 0.2s;" onfocus="this.style.borderColor='#be185d'" onblur="this.style.borderColor='#cbd5e1'" />
                  </div>`;
              } else {
                  filterHtml += `<div style="display: flex; flex-direction: column; gap: 4px;">
                      <label style="font-size: 11px; font-weight: 600; color: #475569; text-transform: uppercase;">${f.label}</label>
                      <input type="text" id="filter-${f.fieldname}" placeholder="${f.label}" style="padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; outline: none; transition: border 0.2s;" onfocus="this.style.borderColor='#be185d'" onblur="this.style.borderColor='#cbd5e1'" />
                  </div>`;
              }
          });
          filterHtml += `<button onclick="runNativeReport('${encodedReportName}', '${folderName}')" style="padding: 8px 16px; background: #be185d; color: white; border: none; border-radius: 6px; font-size: 13px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 6px -1px rgba(190,24,93,0.3); transition: background 0.2s;" onmouseover="this.style.background='#9d174d'" onmouseout="this.style.background='#be185d'">Run Report</button>
          <div id="native-report-print-bar" style="display:none;align-items:center;gap:8px;margin-left:auto;border-left:2px solid #e2e8f0;padding-left:14px;">
            <button onclick="openReportPrintModal()" style="background:#0f172a;color:white;border:none;padding:8px 18px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:7px;white-space:nowrap;transition:background 0.2s;" onmouseover="this.style.background='#334155'" onmouseout="this.style.background='#0f172a'">🖶 Print</button>
            <span id="native-report-row-count" style="font-size:11px;color:#94a3b8;white-space:nowrap;padding-left:4px;"></span>
          </div>`;
          filterBar.innerHTML = filterHtml;

          // Fetch options for Link fields
          const linkSelects = filterBar.querySelectorAll("select[data-link-doctype]");
          for (let sel of linkSelects) {
              const doctype = sel.getAttribute("data-link-doctype");
              try {
                  callFrappe("/api/method/frappe.client.get_list", { doctype: doctype, limit_page_length: 50 }, "GET")
                  .then(data => {
                      if (data && data.message) {
                          data.message.forEach(row => {
                              const opt = document.createElement("option");
                              opt.value = row.name;
                              opt.textContent = row.name;
                              sel.appendChild(opt);
                          });
                      }
                  });
              } catch(e) { console.error("Could not fetch options for", doctype, e); }
          }

          container.innerHTML = '<div style="padding: 60px; text-align: center; color: #64748b; font-size: 14px;"><svg style="width:48px;height:48px;opacity:0.2;margin-bottom:12px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg><br>Select your filters and click <b>Run Report</b> to load the data.</div>';
          
          window.__currentReportFilters = filtersDef;
      } catch (err) {
          container.innerHTML = '<div style="color: red; padding: 20px;">Error initializing report: ' + err.message + '</div>';
      }
    }

    function showView(viewId) {
      [
        viewDashboard,
        viewReports,
        viewBreakdowns,
        viewMachines,
        viewDefects,
        viewFsi,
        viewTeleHitachi,
        viewTeleShantui,
        viewTeleWirtgen,
        viewTeleBobcat,
        viewJobCards,
        viewAbout,
        viewSettings,
        viewLicensing,
        viewArchives,
        document.getElementById("view-frappe-report"),
        document.getElementById("view-service-due"),
        document.getElementById("view-customers"),
      ].forEach(v => v && v.classList.add("hidden"));

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
        "view-frappe-report": {
          el: document.getElementById("view-frappe-report"),
          title: "Report Viewer",
          subtitle: "Frappe Query Report",
          actionLabel: "Open in Tab",
          action: () => {
             const frame = document.getElementById("frappe-report-frame");
             if (frame && frame.src) window.open(frame.src, "_blank");
          }
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
        "view-service-due": {
          el: document.getElementById("view-service-due"),
          title: "Service Due",
          subtitle: "Machines approaching or overdue for scheduled service.",
          actionLabel: "Refresh",
          action: () => window.loadServiceDueView && window.loadServiceDueView(),
        },
        "view-customers": {
          el: document.getElementById("view-customers"),
          title: "Customers",
          subtitle: "FT Customer directory — contacts, machines and WhatsApp groups.",
          actionLabel: "New Customer",
          action: () => window.openNewCustomerModal && window.openNewCustomerModal(),
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

      // (initDbrEditModal call moved to Boot)

      if (viewId === "view-telematics-hitachi") {
        if (!HITACHI_LAST_SNAPSHOT) hitachiRefreshSnapshot("auto-open");
      }

      if (viewId === "view-job-cards") {
        loadDailyJobCards();
      }

      if (viewId === "view-archives") {
        loadReportArchives();
      }

      if (viewId === "view-service-due") {
        if (typeof window.loadServiceDueView === "function") window.loadServiceDueView();
      }

      if (viewId === "view-customers") {
        if (typeof window.loadCustomersView === "function") window.loadCustomersView();
      }

      btnPrimaryAction.onclick = (e) => {
        e.preventDefault();
        if (cfg.action) cfg.action();
      };
    }

    document.querySelectorAll(".nav-item, .top-nav-item, .top-nav-dropdown-item").forEach(item => {
      item.addEventListener("click", () => {
        if (item.id === "nav-logout") {
          doLogout();
          return;
        }
        const viewId = item.getAttribute("data-view");
        if (!viewId) return;
        document.querySelectorAll(".nav-item, .top-nav-item, .top-nav-dropdown-item").forEach(el => el.classList.remove("active"));
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

      dataToRender.forEach(row => {
        const tr = document.createElement("tr");
        tr.style.cssText = "border-bottom:1px solid #e5e7f0;";

        // Map snake_case to format
        const customer = row.customer || "—";
        const customerRef = row.customer_ref ? `<div style="font-size:10px;color:var(--text-muted);">Ref: <strong>${safeText(row.customer_ref)}</strong></div>` : "";
        const region = row.region ? `<div style="font-size:10px;color:var(--text-muted);">${safeText(row.region)}</div>` : "";

        const machine = row.model || "—";
        const sn = row.serial_number ? `<div style="font-size:10px;color:var(--text-muted);">SN: ${safeText(row.serial_number)}</div>` : "";
        const fleetNo = row.fleet_no ? `<div style="font-size:10px;color:var(--text-muted);">Fleet: <strong>${safeText(row.fleet_no)}</strong></div>` : "";
        const hmr = row.current_hmr ? `<div style="font-size:10px;color:var(--text-muted);">HMR: ${safeText(row.current_hmr)}</div>` : "";

        let wtyBadge = "";
        if (row.warranty_status && row.warranty_status !== "Out of Warranty" && row.warranty_status !== "N/A") {
          wtyBadge = `<span style="font-size:9px;background:#fee2e2;color:#ef4444;padding:2px 4px;border-radius:4px;display:inline-block;margin-top:2px;">${safeText(row.warranty_status)}</span>`;
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

        tr.innerHTML = `
      <td style="${commonTdStyle}">
        <div style="font-weight:700;color:#0f172a;margin-bottom:4px;">${safeText(customer)}</div>
      ${customerRef}
      ${region}
    </td>
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
          showToast("DEBUG: Direct Click on " + row.name, "info");
          openDbrEditModal(row.name);
        };

        // Find the last cell and append button
        const lastTd = tr.querySelector("td:last-child");
        if (lastTd) lastTd.appendChild(btnEdit);

        tbody.appendChild(tr);
      });

      const dbrDate = document.getElementById("dbr-date");
      if (dbrDate) dbrDate.textContent = new Date().toLocaleDateString("en-GB");
    }

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
            console.log(`[callFrappe] IPC Request (${httpMethod}): ${url}`);
            const res = await window.frappeAPI.request({
              url: url,
              method: httpMethod,
              data: requestData,
              syncCookies: true,
              timeout: options.timeout // Support custom timeouts for heavy requests
            });

            console.log(`[callFrappe] IPC Response: ${res.status}`, res.data);

            if (!res.ok) {
              const errorData = res.data || {};
              let serverMsg = "";
              if (errorData._server_messages) {
                  try {
                      serverMsg = JSON.parse(errorData._server_messages).map(m => JSON.parse(m).message).join(' | ');
                  } catch(e) { serverMsg = errorData._server_messages; }
              }
              let errorMsg = serverMsg || errorData.message || errorData.exception || res.error || 'Unknown error';
              if (errorData.exc) {
                  try {
                      // Frappe stores tracebacks as JSON strings
                      let excObj = JSON.parse(errorData.exc);
                      if (Array.isArray(excObj)) errorMsg = excObj.join('');
                      else errorMsg = excObj;
                  } catch(e) { errorMsg = errorData.exc; }
              }
              if (errorMsg === 'Unknown error') {
                  errorMsg = 'Raw: ' + JSON.stringify(errorData).substring(0, 200);
              }
              throw new Error(`API Error ${res.status}: ${errorMsg}`);
            }

            return res.data;
          } catch (e) {
            console.error("[callFrappe] IPC error:", e);
            throw e;
          }
        }

        // Fallback to fetch for browser or if IPC not available
        let headers = {
          'Content-Type': 'application/json',
          'X-Frappe-CSRF-Token': (window.frappe && window.frappe.csrf_token) || ''
        };

        // Legacy API key auth (if available)
        if (isElectron) {
          const apiKey = localStorage.getItem("ft_api_key");
          const apiSecret = localStorage.getItem("ft_api_secret");
          if (apiKey && apiSecret) {
            headers['Authorization'] = `token ${apiKey}:${apiSecret}`;
          }
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
      // Wire up close-breakdown button
      const closeBdBtn = document.getElementById("db-edit-close-bd");
      if (closeBdBtn) closeBdBtn.addEventListener("click", closeBreakdown);
    }

    function formatDateOnly(dateStr) {
      if (!dateStr) return "";
      if (dateStr.includes(" ")) return dateStr.split(" ")[0];
      if (dateStr.includes("T")) return dateStr.split("T")[0];
      return dateStr;
    }

    function openDbrEditModal(name) {
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
      overlay.classList.remove("hidden");

      // Populate Header Info
      document.getElementById("db-edit-info").textContent = 
        `${row.machine || 'Machine'} | User: ${CURRENT_SERVER_USER} | Access: ${CAN_EDIT_COMMENTS ? 'Manager' : 'Read-Only'}`;

      // Populate Metadata Fields
      document.getElementById("db-edit-customer").value = row.customer || "";
      document.getElementById("db-edit-machine").value = row.machine || "";
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
      document.getElementById("db-edit-ted").value = formatForInput(row.ted);
      document.getElementById("db-edit-red").value = formatForInput(row.red);
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
        const res = await callFrappe("/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.update_ft_breakdown_full", payload);
        if (res.message && res.message.ok) {
          showToast(isApprove ? "Breakdown Signed Off!" : "Breakdown updated successfully", "ok");
          closeDbrEditModal();
          loadDailyBreakdownReport(); // Reload table
        } else {
          const errMsg = (res.message && res.message.error) ? res.message.error : "Failed to update breakdown";
          showToast(errMsg, "err");
          console.error("Update failed response:", res);
        }
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

    async function closeBreakdown() {
      if (!CURRENT_EDIT_ROW) return;
      const name = CURRENT_EDIT_ROW.name;
      const today = new Date().toISOString().split("T")[0];

      if (!confirm(`Mark breakdown "${name}" as CLOSED with today (${today}) as the end date?`)) return;

      const btn = document.getElementById("db-edit-close-bd");
      if (btn) { btn.textContent = "Closing..."; btn.disabled = true; }

      try {
        const res = await callFrappe("/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.update_ft_breakdown_full", {
          name,
          end_date: today,
          status: document.getElementById("db-edit-status")?.value || "Closed"
        }, "POST");

        const ok = res?.message?.ok || res?.ok;
        if (ok) {
          showToast(`Breakdown ${name} closed successfully!`, "ok");
          closeDbrEditModal();
          if (typeof loadDailyBreakdownReport === "function") loadDailyBreakdownReport();
        } else {
          const err = res?.message?.error || res?.error || "Failed to close breakdown";
          showToast(err, "err");
        }
      } catch (e) {
        console.error("closeBreakdown error:", e);
        showToast("Error: " + e.message, "err");
      } finally {
        if (btn) { btn.textContent = "&#x2714; Mark as Closed"; btn.disabled = false; }
      }
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