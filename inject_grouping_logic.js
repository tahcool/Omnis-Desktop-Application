const fs = require('fs');
const filePath = 'systems/fleetrack/index.html';
let html = fs.readFileSync(filePath, 'utf8');

const targetSearch = `      // Slice for pagination
      const startIndex = (DBR_PAGE - 1) * DBR_PAGE_SIZE;
      const paginatedData = dataToRender.slice(startIndex, startIndex + DBR_PAGE_SIZE);`;

const targetReplace = `      const accordionWrap = document.getElementById("dbr-accordion-wrap");
      const tableWrap = document.getElementById("dbr-table-wrap");
      const isGrouped = document.getElementById("dbr-group-customer")?.checked;

      if (isGrouped) {
         if (tableWrap) tableWrap.style.display = "none";
         if (accordionWrap) {
             accordionWrap.style.display = "flex";
             accordionWrap.innerHTML = "";
         }
      } else {
         if (tableWrap) tableWrap.style.display = "block";
         if (accordionWrap) accordionWrap.style.display = "none";
      }

      // Slice for pagination
      const startIndex = (DBR_PAGE - 1) * DBR_PAGE_SIZE;
      let paginatedData;

      if (!isGrouped) {
          paginatedData = dataToRender.slice(startIndex, startIndex + DBR_PAGE_SIZE);
      } else {
          // generate accordions
          const groups = {};
          dataToRender.forEach(r => {
             const cust = r.customer_name || r.customer || 'Unknown';
             if (!groups[cust]) groups[cust] = [];
             groups[cust].push(r);
          });
          
          let htmlAcc = "";
          Object.keys(groups).sort().forEach(cust => {
             const custRows = groups[cust];
             let tableRowsHtml = "";
             custRows.forEach((r, idx) => {
                 let custCell = \`<td class="df-cell" style="padding:10px 16px; font-weight:700; color:#0f172a; font-size:11px;">\${r.customer_name || r.customer || ''}</td>\`;
                 let machineName = r.machine_name || r.machine;
                 let machineHtml = \`<div style="font-weight:700;color:#1e293b;font-size:12px;">\${machineName}</div>\`;
                 if (r.site && r.site.trim() !== '') {
                     machineHtml += \`<div style="font-size:10px;color:#64748b;margin-top:2px;">Site: \${r.site}</div>\`;
                 }
                 
                 let defectDesc = r.description || '';
                 if (defectDesc.length > 80) defectDesc = defectDesc.substring(0, 77) + '...';
                 const priority = r.urgent ? "High" : "Normal";
                 let defectHtml = \`<div style="font-weight:500;color:#334155;font-size:11px;max-width:250px;white-space:normal;line-height:1.4;">\${defectDesc}</div>\`;
                 const reportedDate = new Date(r.breakdown_date.split(" ")[0]).toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'});
                 let reported = \`<div style="color:#0f172a;font-size:11px;">\${reportedDate}</div>\`;

                 let statusColor = "#f59e0b";
                 let sevText = "#f59e0b";
                 if (priority === "High") {
                     sevText = "#ef4444";
                 }
                 let status = "OPEN";
                 if (r.breakdown_end_date && r.breakdown_end_date.trim() !== '') {
                     status = "CLOSED";
                     statusColor = "#10b981";
                 }
                 let displayStatus = r.status || status;
                 if (displayStatus.length > 50) displayStatus = displayStatus.substring(0, 47) + '...';
                 const statusHtml = \`<div style="font-weight:800;color:\${statusColor};font-size:11px;text-transform:uppercase; max-width:180px; white-space:normal; word-wrap:break-word; line-height:1.4;">\${displayStatus}</div>\`;

                 const tedStr = (r.ted_status === 'TBA') ? 'TBA' : ((r.ted && r.ted.trim() !== '') ? new Date(r.ted.split(" ")[0]).toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'}) : "-");
                 const redStr = (r.red && r.red.trim() !== '') ? new Date(r.red.split(" ")[0]).toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'}) : "-";

                 let daysOnBreakdown = "";
                 if (r.breakdown_date) {
                     const start = new Date(r.breakdown_date.split(" ")[0]);
                     const end = (r.breakdown_end_date && r.breakdown_end_date.trim() !== '') ? new Date(r.breakdown_end_date.split(" ")[0]) : new Date();
                     const diff = Math.floor((end - start) / (1000 * 60 * 60 * 24));
                     daysOnBreakdown = diff >= 0 ? diff : 0;
                 }
                 tableRowsHtml += \`<tr>
                     <td style="padding:10px; font-weight:800; color:#94a3b8; font-size:11px; text-align:center; border-right: 1px solid #f1f5f9; border-bottom: 1px solid #f1f5f9;">\${idx + 1}</td>
                     \${custCell}
                     <td style="padding:10px 16px; border-bottom: 1px solid #f1f5f9;">\${machineHtml}</td>
                     <td style="padding:10px 16px; border-bottom: 1px solid #f1f5f9;">\${reported}</td>
                     <td style="padding:10px 16px; border-bottom: 1px solid #f1f5f9;">\${defectHtml}</td>
                     <td style="padding:10px 16px; border-bottom: 1px solid #f1f5f9;">\${tedStr}</td>
                     <td style="padding:10px 16px; border-bottom: 1px solid #f1f5f9;">\${redStr}</td>
                     <td style="padding:10px 16px; border-bottom: 1px solid #f1f5f9;">\${r.responsibility || ''}</td>
                     <td style="padding:10px 16px; border-bottom: 1px solid #f1f5f9;">\${statusHtml}</td>
                     <td style="padding:10px 16px; border-bottom: 1px solid #f1f5f9;">\${daysOnBreakdown}</td>
                 </tr>\`;
             });

             htmlAcc += \`
               <div class="sectionBlock" style="border:1px solid #e2e8f0; border-radius:8px; overflow:hidden;">
                  <div onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none'" style="background:#f8fafc; padding:12px 16px; display:flex; justify-content:space-between; align-items:center; cursor:pointer;">
                     <div style="font-weight:700; color:#0f172a; font-size:14px;">\${cust}</div>
                     <div style="background:#e2e8f0; color:#475569; font-size:11px; font-weight:700; padding:4px 10px; border-radius:20px;">\${custRows.length} Breakdowns</div>
                  </div>
                  <div style="display:none; background:white; padding:0;">
                     <div style="overflow-x:auto;">
                         <table style="width:100%; border-collapse:collapse; font-size:11px; table-layout:auto;">
                             <thead>
                                 <tr style="background:#f1f5f9; color:#475569;">
                                     <th style="padding:8px; text-align:center;">#</th>
                                     <th style="padding:8px 16px; text-align:left;">Customer</th>
                                     <th style="padding:8px 16px; text-align:left;">Machine</th>
                                     <th style="padding:8px 16px; text-align:left;">Reported On</th>
                                     <th style="padding:8px 16px; text-align:left;">Description</th>
                                     <th style="padding:8px 16px; text-align:left;">TED</th>
                                     <th style="padding:8px 16px; text-align:left;">RED</th>
                                     <th style="padding:8px 16px; text-align:left;">Resp.</th>
                                     <th style="padding:8px 16px; text-align:left;">Status</th>
                                     <th style="padding:8px 16px; text-align:left;">Days on BD</th>
                                 </tr>
                             </thead>
                             <tbody>
                                 \${tableRowsHtml}
                             </tbody>
                         </table>
                     </div>
                  </div>
               </div>
             \`;
          });
          if (accordionWrap) accordionWrap.innerHTML = htmlAcc;
          
          // Render pagination (if needed we can modify it, but let's just show total count for now)
          const paginationWrap = document.getElementById('dbr-pagination');
          if (paginationWrap) paginationWrap.innerHTML = \`<div style="font-size:12px; color:#64748b; font-weight:600; padding:10px;">Grouped view showing all \${dataToRender.length} breakdowns.</div>\`;
          
          return;
      }`;

html = html.replace(targetSearch, targetReplace);

fs.writeFileSync(filePath, html);
console.log("JS logic injected successfully.");
