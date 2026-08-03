const fs = require('fs');
let content = fs.readFileSync('systems/fleetrack/index.html', 'utf8');

const jsCode = `  <script>
    // === TECHNICIAN HOUR ANALYTICS ===
    async function loadTechHourAnalytics() {
      try {
        const tbody = document.getElementById('tha-table-body');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:40px; color:#64748b;">Loading analytics...</td></tr>';
        
        const res = await window.electron.invoke('supabase:query', {
          table: 'ft_technician_hour_log',
          action: 'select',
          query: '*'
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
              count: 0
            };
          }
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
    }

    function printTechHourAnalytics() {
      const printContents = document.getElementById("tha-print-section").innerHTML;
      const originalContents = document.body.innerHTML;
      
      const kpiTotal = document.getElementById('tha-kpi-total').textContent;
      const kpiProd = document.getElementById('tha-kpi-productive').textContent;
      const kpiNonProd = document.getElementById('tha-kpi-non-productive').textContent;
      const kpiUtil = document.getElementById('tha-kpi-utilization').textContent;

      document.body.innerHTML = \`
        <div style="font-family:sans-serif; padding:20px;">
          <h2 style="text-align:center; color:#0f172a; margin-bottom:5px;">Technician Hour Analytics</h2>
          <p style="text-align:center; color:#64748b; font-size:12px; margin-top:0; margin-bottom:20px;">Generated on: \${new Date().toLocaleDateString()}</p>
          
          <div style="display:flex; justify-content:space-around; margin-bottom:30px; border-bottom:2px solid #e2e8f0; padding-bottom:20px;">
            <div style="text-align:center;">
              <div style="font-size:11px; color:#64748b; text-transform:uppercase;">Total Hours</div>
              <div style="font-size:24px; font-weight:bold;">\${kpiTotal}</div>
            </div>
            <div style="text-align:center;">
              <div style="font-size:11px; color:#64748b; text-transform:uppercase;">Productive</div>
              <div style="font-size:24px; font-weight:bold; color:#10b981;">\${kpiProd}</div>
            </div>
            <div style="text-align:center;">
              <div style="font-size:11px; color:#64748b; text-transform:uppercase;">Non-Productive</div>
              <div style="font-size:24px; font-weight:bold; color:#ef4444;">\${kpiNonProd}</div>
            </div>
            <div style="text-align:center;">
              <div style="font-size:11px; color:#64748b; text-transform:uppercase;">Utilization</div>
              <div style="font-size:24px; font-weight:bold; color:#3b82f6;">\${kpiUtil}</div>
            </div>
          </div>
          
          \${printContents}
        </div>
      \`;
      window.print();
      document.body.innerHTML = originalContents;
      window.location.reload();
    }
  </script>
</body>
</html>
`;

const lastIndex = content.lastIndexOf('</body>');
if (lastIndex !== -1) {
    // Cut off everything from the last </body> onwards, and append our code which contains the new </body></html>
    content = content.slice(0, lastIndex) + jsCode;
    fs.writeFileSync('systems/fleetrack/index.html', content);
    console.log('Successfully injected JS at the true end of the document!');
} else {
    console.log('Could not find </body>');
}
