const fs = require("fs");
let c = fs.readFileSync("c:/Users/Administrator/omnis/systems/fleetrack/index.html","utf8");

// Find and replace the entire printDBR function (DOM capture) with a self-contained template
const startMarker = "    function printDBR() {\n      const rows = (typeof CURRENT_DBR_ROWS !== 'undefined' ? CURRENT_DBR_ROWS : []);\n      if (!rows.length) { showToast('No DBR data loaded. Run the report first.', 'warn'); return; }\n      // DOM capture";
const endMarker = "\n    }\n\n    function printDBR_UNUSED() {";

const si = c.indexOf(startMarker);
const ei = c.indexOf(endMarker, si);
console.log("startMarker found:", si > 0);
console.log("endMarker found:", ei > 0);
if (si < 0 || ei < 0) { console.log("MARKERS NOT FOUND"); process.exit(1); }

// Also find end of printDBR_UNUSED (ends at "    };\n\n    window.printJobCard")
const unusedEnd = c.indexOf("\n\n    window.printJobCard", ei);
console.log("unusedEnd found:", unusedEnd > 0);

const newDBR = `    function printDBR() {
      const rows = (typeof CURRENT_DBR_ROWS !== 'undefined' ? CURRENT_DBR_ROWS : []);
      if (!rows.length) { showToast('No DBR data loaded. Run the report first.', 'warn'); return; }
      const region  = (document.getElementById('dbr-filter-region')?.value || 'All');
      const prepBy  = (document.getElementById('dbr-prepared-by')?.textContent || 'Omnis User').trim();
      const dbrDate = (document.getElementById('dbr-date')?.textContent || new Date().toLocaleDateString('en-ZW')).trim();
      const effPct  = (document.getElementById('dbr-efficiency')?.textContent || '0.0%').trim();
      const now = new Date();
      const genTime = now.toLocaleTimeString('en-ZW',{hour:'2-digit',minute:'2-digit'});

      const badge = s => {
        if (!s) return '<span style="background:#f1f5f9;color:#475569;padding:2px 5px;border-radius:3px;font-weight:700;font-size:9px;">\u2014</span>';
        const sl = s.toLowerCase();
        if (sl.includes('hold'))      return '<span style="background:#e0e7ff;color:#4338ca;padding:2px 5px;border-radius:3px;font-weight:700;font-size:9px;">'+s+'</span>';
        if (sl.includes('open')||sl.includes('active')) return '<span style="background:#fee2e2;color:#dc2626;padding:2px 5px;border-radius:3px;font-weight:700;font-size:9px;">'+s+'</span>';
        if (sl.includes('progress')||sl.includes('pending')) return '<span style="background:#fef3c7;color:#d97706;padding:2px 5px;border-radius:3px;font-weight:700;font-size:9px;">'+s+'</span>';
        if (sl.includes('close')||sl.includes('complet')) return '<span style="background:#dcfce7;color:#16a34a;padding:2px 5px;border-radius:3px;font-weight:700;font-size:9px;">'+s+'</span>';
        return '<span style="background:#f1f5f9;color:#475569;padding:2px 5px;border-radius:3px;font-weight:700;font-size:9px;">'+s+'</span>';
      };

      const tbody = rows.map(r => {
        const machine =
          '<strong style="font-size:10px;display:block;">'+(r.machine||r.machine_name||r.equipment||'—')+'</strong>'+
          (r.sn ? '<span style="font-size:8px;color:#94a3b8;">SN: '+r.sn+'</span><br>' : '')+
          (r.current_hmr != null ? '<span style="font-size:8px;color:#94a3b8;">HMR = '+r.current_hmr+'</span><br>' : '')+
          '<span style="font-size:8px;color:#94a3b8;">Machine Running? '+(r.machine_running||'—')+'</span><br>'+
          '<span style="font-size:8px;color:'+(r.warranty_status&&r.warranty_status.toLowerCase().includes('under')?'#16a34a':'#94a3b8')+';">'+(r.warranty_status||'—')+'</span>';
        return '<tr style="border-bottom:1px solid #f1f5f9;">'+
          '<td style="padding:6px;font-weight:700;font-size:10px;vertical-align:top;white-space:nowrap;">'+(r.customer||'—')+'</td>'+
          '<td style="padding:6px;vertical-align:top;min-width:120px;">'+machine+'</td>'+
          '<td style="padding:6px;font-size:10px;vertical-align:top;white-space:nowrap;">'+(r.reported_on||r.start_date||'—')+'</td>'+
          '<td style="padding:6px;font-size:10px;vertical-align:top;max-width:180px;">'+(r.description||'—').substring(0,100)+'</td>'+
          '<td style="padding:6px;font-size:10px;vertical-align:top;text-align:center;">'+(r.ted||'TBA')+'</td>'+
          '<td style="padding:6px;font-size:10px;vertical-align:top;text-align:center;">'+(r.red||r.bed||'—')+'</td>'+
          '<td style="padding:6px;font-size:10px;vertical-align:top;">'+badge(r.status)+'</td>'+
          '<td style="padding:6px;font-size:10px;vertical-align:top;text-align:right;font-weight:700;">'+(r.days_on_bd??'—')+'</td>'+
          '<td style="padding:6px;font-size:10px;vertical-align:top;text-align:center;">'+(r.parts_eta||'—')+'</td>'+
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
        '<div class="hdr"><div><div class="brand">OMNIS<span>.</span></div><div class="subbrand">Fleetrack \u2014 Machinery Exchange</div></div>'+
        '<div><div class="title"><em>Daily</em> Breakdown Report (DBR) \u2014 '+region+'</div>'+
        '<div class="meta">Records: '+rows.length+' &nbsp;|&nbsp; Generated: '+genTime+'</div></div></div>'+
        '<div class="eff"><span>% EFFICIENCY</span><span class="eff-val">'+effPct+'</span></div>'+
        '<div class="prep"><span><strong>PREPARED BY:</strong> '+prepBy+'</span><span><strong>DATE:</strong> '+dbrDate+'</span><span><strong>REGION:</strong> '+region+'</span></div>'+
        '<table><thead><tr>'+
        '<th>CUSTOMER</th><th>MACHINE</th><th>REPORTED ON</th><th>DESCRIPTION</th>'+
        '<th>TED</th><th>RED</th><th>STATUS</th><th style="text-align:right">DAYS ON BD</th>'+
        '<th>PARTS ETA</th><th>MANAGER\'S COMMENTS</th>'+
        '</tr></thead><tbody>'+tbody+'</tbody></table>'+
        '<div class="ftr"><span>Omnis v2 \u2014 Fleetrack</span><span>Machinery Exchange &copy; '+now.getFullYear()+'</span><span>'+dbrDate+' '+genTime+'</span></div>'+
        '</body></html>';

      if (typeof window.openReportPrintModal === 'function') {
        window.openReportPrintModal(html, 'Daily Breakdown Report (DBR) \u2014 '+region);
      }
    }`;

// Replace from startMarker through end of printDBR_UNUSED
const before = c.substring(0, si);
const after = c.substring(unusedEnd);
c = before + newDBR + after;

fs.writeFileSync("c:/Users/Administrator/omnis/systems/fleetrack/index.html", c, "utf8");
console.log("Done. Size:", c.length);
