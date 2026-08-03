const fs = require('fs');
let content = fs.readFileSync('systems/fleetrack/index.html', 'utf8');

const newLoadTechHour = `async function loadTechHourAnalytics() {
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
          
          tr.innerHTML = \`
            <td style="padding:16px 20px; font-size:14px; color:#0f172a; font-weight:600;">\${tech} <span style="font-size:11px; color:#94a3b8; font-weight:400; margin-left:6px;">(\${stats.count} logs)</span></td>
            <td style="padding:16px 20px; text-align:right; font-size:14px; color:#10b981; font-weight:600;">\${stats.productive.toFixed(1)}</td>
            <td style="padding:16px 20px; text-align:right; font-size:14px; color:#64748b;">\${stats.travel.toFixed(1)}</td>
            <td style="padding:16px 20px; text-align:right; font-size:14px; color:#64748b;">\${stats.admin.toFixed(1)}</td>
            <td style="padding:16px 20px; text-align:right; font-size:14px; color:#64748b;">\${stats.house_keeping.toFixed(1)}</td>
            <td style="padding:16px 20px; text-align:right; font-size:14px; color:#ef4444; font-weight:600;">\${stats.non_productive.toFixed(1)}</td>
            <td style="padding:16px 20px; text-align:right; font-size:14px; color:#0f172a; font-weight:700; background:#f8fafc;">\${techTotal.toFixed(1)}</td>
          \`;
          tbody.appendChild(tr);
        });
        
      } catch (e) {
        console.error("loadTechHourAnalytics error:", e);
        const tbody = document.getElementById('tha-table-body');
        if (tbody) {
          tbody.innerHTML = \`<tr><td colspan="7" style="text-align:center; padding:40px; color:#ef4444;">Failed to load analytics: \${e.message}</td></tr>\`;
        }
      }
    }`;

const showDetailsFunc = `
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
                      
        tr.innerHTML = \`
          <td style="padding:12px 20px; font-size:13px; color:#475569;">\${log.date}</td>
          <td style="padding:12px 20px; text-align:right; font-size:13px; color:#10b981; font-weight:600;">\${(parseFloat(log.productive) || 0).toFixed(1)}</td>
          <td style="padding:12px 20px; text-align:right; font-size:13px; color:#64748b;">\${(parseFloat(log.travel) || 0).toFixed(1)}</td>
          <td style="padding:12px 20px; text-align:right; font-size:13px; color:#64748b;">\${(parseFloat(log.admin) || 0).toFixed(1)}</td>
          <td style="padding:12px 20px; text-align:right; font-size:13px; color:#64748b;">\${(parseFloat(log.house_keeping) || 0).toFixed(1)}</td>
          <td style="padding:12px 20px; text-align:right; font-size:13px; color:#ef4444; font-weight:600;">\${(parseFloat(log.non_productive) || 0).toFixed(1)}</td>
          <td style="padding:12px 20px; text-align:right; font-size:13px; color:#0f172a; font-weight:700; background:#f8fafc;">\${total.toFixed(1)}</td>
        \`;
        tbody.appendChild(tr);
      });
      
      const modal = document.getElementById('modal-tha-details');
      modal.style.display = 'flex';
      setTimeout(() => modal.classList.remove('hidden'), 10);
    }
`;

const modalHTML = `
  <!-- Technician Hour Details Modal -->
  <div id="modal-tha-details" class="modal-overlay hidden" style="position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(15,23,42,0.6); backdrop-filter:blur(4px); z-index:99999; display:none; align-items:center; justify-content:center; padding:20px;">
    <div style="background:#fff; border-radius:12px; width:900px; max-width:100%; max-height:90vh; display:flex; flex-direction:column; box-shadow:0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1); overflow:hidden;">
      <div style="padding:20px 24px; background:#f8fafc; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center;">
        <div id="tha-details-title" style="color:#0f172a; font-size:18px; font-weight:700;">Technician Hour Logs</div>
        <button onclick="document.getElementById('modal-tha-details').style.display='none'; document.getElementById('modal-tha-details').classList.add('hidden');" style="background:transparent; border:none; color:#94a3b8; cursor:pointer; font-size:24px; line-height:1;">&times;</button>
      </div>
      <div style="padding:0; overflow-y:auto; flex:1;">
        <table class="data-table" style="width:100%; border-collapse:collapse;">
          <thead style="background:#fff; position:sticky; top:0; z-index:1; box-shadow:0 1px 2px rgba(0,0,0,0.05);">
            <tr>
              <th style="padding:12px 20px; text-align:left; font-size:11px; font-weight:700; color:#475569; text-transform:uppercase; border-bottom:2px solid #e2e8f0;">Date</th>
              <th style="padding:12px 20px; text-align:right; font-size:11px; font-weight:700; color:#475569; text-transform:uppercase; border-bottom:2px solid #e2e8f0;">Productive</th>
              <th style="padding:12px 20px; text-align:right; font-size:11px; font-weight:700; color:#475569; text-transform:uppercase; border-bottom:2px solid #e2e8f0;">Travel</th>
              <th style="padding:12px 20px; text-align:right; font-size:11px; font-weight:700; color:#475569; text-transform:uppercase; border-bottom:2px solid #e2e8f0;">Admin</th>
              <th style="padding:12px 20px; text-align:right; font-size:11px; font-weight:700; color:#475569; text-transform:uppercase; border-bottom:2px solid #e2e8f0;">Hse Keep</th>
              <th style="padding:12px 20px; text-align:right; font-size:11px; font-weight:700; color:#475569; text-transform:uppercase; border-bottom:2px solid #e2e8f0;">Non-Prod</th>
              <th style="padding:12px 20px; text-align:right; font-size:11px; font-weight:700; color:#475569; text-transform:uppercase; border-bottom:2px solid #e2e8f0;">Total</th>
            </tr>
          </thead>
          <tbody id="tha-details-table-body">
          </tbody>
        </table>
      </div>
    </div>
  </div>
`;

// Replace loadTechHourAnalytics
const regex = /async function loadTechHourAnalytics\(\) \{[\s\S]*?\}\s*function printTechHourAnalytics\(\)/;
content = content.replace(regex, newLoadTechHour + '\n\n' + showDetailsFunc + '\n\n    function printTechHourAnalytics()');

// Inject modal HTML before the final <script> tag that has printTechHourAnalytics (which is at the bottom)
// Actually better, inject it right before the </body> tag.
const lastBody = content.lastIndexOf('</body>');
content = content.slice(0, lastBody) + modalHTML + '\n' + content.slice(lastBody);

fs.writeFileSync('systems/fleetrack/index.html', content);
console.log('Successfully injected drilldown modal and updated script.');
