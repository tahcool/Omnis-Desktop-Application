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
    const FT_ISR_METHOD =
      "/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.get_ft_isr";
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
        
        // Auto-refresh logic based on view
        if (viewId === 'view-archives') loadReportArchives();
        if (viewId === 'view-reports') loadDailyBreakdownReport();
        if (viewId === 'view-defects') loadFtDefects();
        if (viewId === 'view-machines') loadFtMachineRegister();
        if (viewId === 'view-isr') loadISR();
        if (viewId === 'view-fsi') loadFieldServicePlan();
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
    window.FT_MACHINE_DETAIL_CACHE = {}; // Exposed globally for cross-script access

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

        // Custom icon using flat SVG silhouette
        const icon = L.divIcon({
          className: 'map-label-icon',
          html: `
  <div class="map-marker-wrap" style="transform:translate(-50%,-50%); width:auto !important;">
    <div style="
      width:48px;
      height:48px;
      background:${overlayColor};
      border:3px solid white;
      border-radius:50%;
      display:flex;
      align-items:center;
      justify-content:center;
      box-shadow:0 6px 12px rgba(0,0,0,0.3);
      position:relative;
    ">
      ${svgHtml}
      ${p.urgent ? '<div style="position:absolute; top:-4px; right:-4px; background:#ef4444; color:white; font-size:10px; font-weight:800; width:18px; height:18px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:2px solid white; box-shadow:0 2px 4px rgba(0,0,0,0.2);">!</div>' : ''}
    </div>
  </div>
  `,
          iconSize: [48, 48],
          iconAnchor: [24, 24]
        });
        const marker = L.marker([lat, lng], { icon: icon });

        // Rich tooltip with machine image
        const machineImgUrl = machineAttachmentLink(p.machine_picture);
        const tooltipContent = `
  <div style="display:flex; gap:12px; font-family:'Inter',sans-serif; min-width:280px; padding:4px;">
    <div style="width:80px; height:80px; flex-shrink:0;">
      ${renderMachineImageHtml(machineImgUrl, '80px', '8px')}
    </div>
    <div style="flex:1; display:flex; flex-direction:column; gap:4px;">
      <div style="font-weight:800; font-size:14px; color:#1e1b4b;">
        ${machineName}
        ${p.urgent ? '<span style="background:#fef2f2; color:#ef4444; padding:2px 6px; border-radius:4px; font-size:9px; margin-left:4px; font-weight:700;">URGENT</span>' : ''}
      </div>
      <div style="font-size:11px; color:#64748b; margin-bottom:2px;">${safeText(p.model || "—")}</div>
      <div style="font-size:10px; display:flex; flex-direction:column; gap:2px;">
        <div style="display:flex; justify-content:space-between;">
          <span style="color:#94a3b8;">Customer:</span>
          <span style="font-weight:600; color:#475569;">${safeText(p.customer || "—")}</span>
        </div>
        <div style="display:flex; justify-content:space-between;">
          <span style="color:#94a3b8;">Location:</span>
          <span style="font-weight:600; color:#475569;">${safeText(p.location || "—")}</span>
        </div>
      </div>
    </div>
  </div>
        `;

        // Bind tooltip for hover
        marker.bindTooltip(tooltipContent, {
          permanent: false,
          sticky: true,
          direction: 'top',
          offset: [0, -20],
          className: 'custom-tooltip'
        });

        // Click popup for more details
        const popupContent = `
  <div style="font-family: 'Inter', sans-serif; font-size:12px; min-width:200px; padding:4px;">
    <div style="font-weight:800; color:#1e1b4b; margin-bottom:6px; border-bottom:1px solid #e5e7f0; padding-bottom:6px; display:flex; justify-content:space-between; align-items:center;">
      <span>${machineName}</span>
      ${p.urgent ? '<span style="background:#fee2e2; color:#ef4444; padding:2px 6px; border-radius:4px; font-size:9px;">URGENT</span>' : ''}
    </div>
    <div style="margin-bottom:3px; display:flex; justify-content:space-between;">
      <span style="color:#64748b;">Customer:</span>
      <span style="font-weight:600;">${safeText(p.customer || "—")}</span>
    </div>
    <div style="margin-bottom:3px; display:flex; justify-content:space-between;">
      <span style="color:#64748b;">Location:</span>
      <span style="font-weight:600;">${safeText(p.location || "—")}</span>
    </div>
    <div style="margin-top:8px; font-size:10px; color:#94a3b8; border-top:1px dashed #e2e8f0; padding-top:6px;">
      Ref: ${safeText(p.name || "—")}
    </div>
  </div>
        `;

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
    // Fleetrack KPI + breakdown list
    // ---------------------------
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
                trMore.innerHTML = `<td colspan="6" style="text-align:center; padding:10px;"><button class="tiny-btn" onclick="openFrappeReport('Daily%20Breakdown%20Report%20(DBR)')" style="background:#f1f5f9; color:#475569;">View all ${FT_BREAKDOWN_ROWS_OPEN.length} items in Reports</button></td>`;
                tbody.appendChild(trMore);
            }
          }
        }

        renderBreakdownLogTable(FT_BREAKDOWN_ROWS_OPEN);

        // MAP: Render if points exist
        const points = data.map_points || [];
        if (points.length > 0) {
          renderFleetMap(points);
        } else {
          // Hide map if no points? Or show empty zimbabwe?
          // For now, try to render empty zimbabwe map
          renderFleetMap([]);
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
    “${defectFilters.machine}”` : "all machines"; const overdueText = defectFilters.overdueOnly ? "only overdue"
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
        const url = FLEET_BASE_URL + FT_DEFECTS_METHOD;
        const res = await fetch(url, { method: "GET" });
        const raw = await res.json().catch(() => ({}));
        const message = raw.message || raw || {};
        const rows = message.rows || [];
        FT_DEFECT_ROWS = rows || [];
        updateDefectFilterSummary();
        renderDefectTable();
      } catch (e) {
        console.error("loadFtDefectsDashboard error:", e);
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
        const raw = await callFrappe(FT_MACHINE_REGISTER_METHOD, overrides, 'GET', { 
            showLoader: showLoader, 
            loaderMsg: "Syncing Machines",
            timeout: 60000 // Increase timeout for full machine list
        });

        if (raw.exc || raw.exception) {
          // Extract clean error message, avoiding full tracebacks
          let msg = "Failed to load machines";

          if (raw._server_messages) {
            try {
              const parsed = JSON.parse(raw._server_messages);
              if (Array.isArray(parsed) && parsed.length > 0) {
                const firstMsg = JSON.parse(parsed[0]);
                msg = firstMsg.message || msg;
              }
            } catch {
              msg = String(raw._server_messages).slice(0, 100);
            }
          } else if (raw.exception) {
            // Extract just the exception type and first line
            const excStr = String(raw.exception);
            const firstLine = excStr.split('\n')[0];
            msg = firstLine.slice(0, 150);
          } else if (raw.exc) {
            const excStr = String(raw.exc);
            const firstLine = excStr.split('\n')[0];
            msg = firstLine.slice(0, 150);
          }

          showToast("Machine register error: " + msg, "err", 4500);
          return;
        }

        // Check if wrapped in message (standard framework behavior)
        const payload = raw.message || raw;
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
</body>
</html>`;
    }

    function buildReportHtml({ title, subtitle, tableHtml, metaLines }) {
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-ZW', { day:'2-digit', month:'short', year:'numeric' });
      const timeStr = now.toLocaleTimeString('en-ZW', { hour:'2-digit', minute:'2-digit' });
      const metaHtml = (metaLines || []).map(m => '<div style="font-size:10px;color:#64748b;margin-bottom:2px;">'+m+'</div>').join('');
      return '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>'+title+'</title><style>' +
        '* { box-sizing: border-box; margin: 0; padding: 0; }' +
        'body { font-family: Segoe UI, Arial, sans-serif; font-size: 11px; color: #1e293b; background: #fff; padding: 10mm 12mm; }' +
        '.rpt-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #f02510; padding-bottom: 10px; margin-bottom: 14px; }' +
        '.rpt-brand { font-size: 22px; font-weight: 900; color: #0f172a; }' +
        '.rpt-brand span { color: #f02510; }' +
        '.rpt-subbrand { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; }' +
        '.rpt-title { font-size: 17px; font-weight: 800; color: #0f172a; margin-top: 8px; }' +
        '.rpt-subtitle { font-size: 11px; color: #64748b; margin-top: 3px; }' +
        '.rpt-header-right { text-align: right; }' +
        '.rpt-date { font-size: 11px; font-weight: 700; }' +
        '.rpt-time { font-size: 10px; color: #64748b; }' +
        '.rpt-meta { margin-top: 6px; }' +
        'table { width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 4px; }' +
        'thead tr { background: #f02510 !important; color: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }' +
        'th { padding: 7px 5px; text-align: left; font-weight: 700; font-size: 9px; text-transform: uppercase; letter-spacing: 0.04em; border-right: 1px solid rgba(255,255,255,0.25); color: #fff !important; }' +
        'th:last-child { border-right: none; }' +
        'td { padding: 5px 5px; border-bottom: 0.5px solid #e2e8f0; vertical-align: middle; }' +
        'tr:nth-child(even) td { background: #f8fafc; }' +
        '.section-header td { background: #0f172a !important; color: #fff !important; font-weight: 700; font-size: 10px; padding: 6px 8px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }' +
        '.br { background:#fee2e2;color:#dc2626;padding:2px 5px;border-radius:3px;font-weight:700;font-size:9px; }' +
        '.ba { background:#fef3c7;color:#d97706;padding:2px 5px;border-radius:3px;font-weight:700;font-size:9px; }' +
        '.bg { background:#dcfce7;color:#16a34a;padding:2px 5px;border-radius:3px;font-weight:700;font-size:9px; }' +
        '.bz { background:#f1f5f9;color:#475569;padding:2px 5px;border-radius:3px;font-weight:700;font-size:9px; }' +
        '.rpt-footer { margin-top: 14px; border-top: 1px solid #e2e8f0; padding-top: 6px; display: flex; justify-content: space-between; font-size: 9px; color: #94a3b8; }' +
        '</style></head><body>' +
        '<div class="rpt-header">' +
        '  <div><div class="rpt-brand">OMNIS<span>.</span></div><div class="rpt-subbrand">Fleetrack — Machinery Exchange</div>' +
        '  <div class="rpt-title">'+title+'</div>'+(subtitle?'<div class="rpt-subtitle">'+subtitle+'</div>':'')+'</div>' +
        '  <div class="rpt-header-right"><div class="rpt-date">'+dateStr+'</div><div class="rpt-time">Generated '+timeStr+'</div>' +
        '  <div class="rpt-meta">'+metaHtml+'</div></div></div>' +
        tableHtml +
        '<div class="rpt-footer"><span>Omnis v2 — Fleetrack</span><span>Machinery Exchange &copy; '+now.getFullYear()+'</span><span>'+dateStr+' '+timeStr+'</span></div>' +
        '</body></html>';
    }

    async function omnisExportPDF({ htmlContent, filename, landscape }) {
      showToast('Preparing PDF…', 'ok', 2000);
      try {
        if (window.electron && typeof window.electron.invoke === 'function') {
          const res = await window.electron.invoke('print:toPDF', { htmlContent, filename, landscape: !!landscape });
          if (res && res.ok) { showToast('PDF saved ✅', 'ok', 3500); }
          else if (res && res.canceled) { showToast('Cancelled.', 'warn', 2000); }
          else { showToast('PDF error: '+(res&&res.error?res.error:'unknown'), 'err', 4000); }
        } else {
          const w = window.open('', '_blank');
          if (w) { w.document.write(htmlContent); w.document.close(); setTimeout(() => w.print(), 700); }
        }
      } catch (e) { showToast('PDF failed: '+e.message, 'err', 4000); }
    }

    function printDBR() {
      const rows = (typeof CURRENT_DBR_ROWS !== 'undefined' ? CURRENT_DBR_ROWS : []);
      if (!rows.length) { showToast('No DBR data loaded. Run the report first.', 'warn'); return; }
      const region  = (document.getElementById('dbr-filter-region')?.value || 'All');
      const prepBy  = (document.getElementById('dbr-prepared-by')?.textContent || 'Omnis User').trim();
      const dbrDate = (document.getElementById('dbr-date')?.textContent || new Date().toLocaleDateString('en-ZW')).trim();
      const effPct  = (document.getElementById('dbr-efficiency')?.textContent || '0.0%').trim();
      const now = new Date();
      const genTime = now.toLocaleTimeString('en-ZW',{hour:'2-digit',minute:'2-digit'});

      const badge = s => {
        if (!s) return '<span style="background:#f1f5f9;color:#475569;padding:2px 5px;border-radius:3px;font-weight:700;font-size:9px;">—</span>';
        const sl = s.toLowerCase();
        if (sl.includes('hold'))      return '<span style="background:#e0e7ff;color:#4338ca;padding:2px 5px;border-radius:3px;font-weight:700;font-size:9px;">'+s+'</span>';
        if (sl.includes('open')||sl.includes('active')) return '<span style="background:#fee2e2;color:#dc2626;padding:2px 5px;border-radius:3px;font-weight:700;font-size:9px;">'+s+'</span>';
        if (sl.includes('progress')||sl.includes('pending')) return '<span style="background:#fef3c7;color:#d97706;padding:2px 5px;border-radius:3px;font-weight:700;font-size:9px;">'+s+'</span>';
        if (sl.includes('close')||sl.includes('complet')) return '<span style="background:#dcfce7;color:#16a34a;padding:2px 5px;border-radius:3px;font-weight:700;font-size:9px;">'+s+'</span>';
        return '<span style="background:#f1f5f9;color:#475569;padding:2px 5px;border-radius:3px;font-weight:700;font-size:9px;">'+s+'</span>';
      };

      const tbody = rows.map(r => {
        const machine =
          '<strong style="font-size:10px;display:block;">'+(r.machine||r.machine_name||r.equipment||'�')+'</strong>'+
          (r.sn ? '<span style="font-size:8px;color:#94a3b8;">SN: '+r.sn+'</span><br>' : '')+
          (r.current_hmr != null ? '<span style="font-size:8px;color:#94a3b8;">HMR = '+r.current_hmr+'</span><br>' : '')+
          '<span style="font-size:8px;color:#94a3b8;">Machine Running? '+(r.machine_running||'�')+'</span><br>'+
          '<span style="font-size:8px;color:'+(r.warranty_status&&r.warranty_status.toLowerCase().includes('under')?'#16a34a':'#94a3b8')+';">'+(r.warranty_status||'�')+'</span>';
        return '<tr style="border-bottom:1px solid #f1f5f9;">'+
          '<td style="padding:6px;font-weight:700;font-size:10px;vertical-align:top;white-space:nowrap;">'+(r.customer||'�')+'</td>'+
          '<td style="padding:6px;vertical-align:top;min-width:120px;">'+machine+'</td>'+
          '<td style="padding:6px;font-size:10px;vertical-align:top;white-space:nowrap;">'+(r.reported_on||r.start_date||'�')+'</td>'+
          '<td style="padding:6px;font-size:10px;vertical-align:top;max-width:180px;">'+(r.description||'�').substring(0,100)+'</td>'+
          '<td style="padding:6px;font-size:10px;vertical-align:top;text-align:center;">'+(r.ted||'TBA')+'</td>'+
          '<td style="padding:6px;font-size:10px;vertical-align:top;text-align:center;">'+(r.red||r.bed||'�')+'</td>'+
          '<td style="padding:6px;font-size:10px;vertical-align:top;">'+badge(r.status)+'</td>'+
          '<td style="padding:6px;font-size:10px;vertical-align:top;text-align:right;font-weight:700;">'+(r.days_on_bd??'�')+'</td>'+
          '<td style="padding:6px;font-size:10px;vertical-align:top;text-align:center;">'+(r.parts_eta||'�')+'</td>'+
          '<td style="padding:6px;font-size:9px;vertical-align:top;color:#0ea5e9;max-width:140px;">'+(r.manager_comments||r.comments||'').substring(0,80)+'</td>'+
          '</tr>';
      }).join('');

      const html = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">'+
        '<title>Daily Breakdown Report (DBR) - '+region+'</title>'+
        '<style>*{box-sizing:border-box;margin:0;padding:0;}'+
        'html,body{height:auto!important;overflow:visible!important;background:#fff;color:#0f172a;font-family:Segoe UI,Arial,sans-serif;font-size:10px;padding:12px;}'+
        '*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}'+
        '.hdr{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #f02510;padding-bottom:8px;margin-bottom:8px;}'+
        '.brand{font-size:20px;font-weight:900;color:#0f172a;letter-spacing:-1px;}.brand span{color:#f02510;}'+
        '.subbrand{font-size:8px;color:#64748b;text-transform:uppercase;letter-spacing:.1em;}'+
        '.title{font-size:16px;font-weight:800;text-align:right;}.title em{color:#f02510;font-style:normal;}'+
        '.meta{font-size:9px;color:#64748b;text-align:right;margin-top:2px;}'+
        '.eff{background:#0f172a!important;color:#fff!important;padding:5px 10px;border-radius:5px;display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;font-weight:700;}'+
        '.eff-val{background:#f02510!important;color:#fff!important;padding:2px 10px;border-radius:4px;font-size:11px;font-weight:800;}'+
        '.prep{display:flex;gap:20px;margin-bottom:8px;font-size:9px;color:#64748b;padding:3px 0;border-bottom:1px solid #f1f5f9;}'+
        '.prep strong{color:#0f172a;}'+
        'table{width:100%;border-collapse:collapse;}'+
        'thead tr{background:#f02510!important;}'+
        'th{padding:7px 6px;text-align:left;color:#fff!important;font-weight:700;font-size:9px;text-transform:uppercase;border-right:1px solid rgba(255,255,255,.2);}'+
        'tbody tr:nth-child(even) td{background:#fafafa!important;}'+
        '.ftr{margin-top:10px;padding-top:6px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-size:9px;color:#94a3b8;}'+
        '@media print{@page{size:A4 landscape;margin:8mm;}body{padding:0;}}'+
        '</style></head><body>'+
        '<div class="hdr"><div><div class="brand">OMNIS<span>.</span></div><div class="subbrand">Fleetrack — Machinery Exchange</div></div>'+
        '<div><div class="title"><em>Daily</em> Breakdown Report (DBR) — '+region+'</div>'+
        '<div class="meta">Records: '+rows.length+' &nbsp;|&nbsp; Generated: '+genTime+'</div></div></div>'+
        '<div class="eff"><span>% EFFICIENCY</span><span class="eff-val">'+effPct+'</span></div>'+
        '<div class="prep"><span><strong>PREPARED BY:</strong> '+prepBy+'</span><span><strong>DATE:</strong> '+dbrDate+'</span><span><strong>REGION:</strong> '+region+'</span></div>'+
        '<table><thead><tr>'+
        '<th>CUSTOMER</th><th>MACHINE</th><th>REPORTED ON</th><th>DESCRIPTION</th>'+
        '<th>TED</th><th>RED</th><th>STATUS</th><th style="text-align:right">DAYS ON BD</th>'+
        '<th>PARTS ETA</th><th>MANAGER\'S COMMENTS</th>'+
        '</tr></thead><tbody>'+tbody+'</tbody></table>'+
        '<div class="ftr"><span>Omnis v2 — Fleetrack</span><span>Machinery Exchange &copy; '+now.getFullYear()+'</span><span>'+dbrDate+' '+genTime+'</span></div>'+
        '</body></html>';

      if (typeof window.openReportPrintModal === 'function') {
        window.openReportPrintModal(html, 'Daily Breakdown Report (DBR) — '+region);
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
