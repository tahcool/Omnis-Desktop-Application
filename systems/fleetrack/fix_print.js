const fs = require('fs');
let c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');

const oldPrint = "function printDBR() {\r\n      const dbrVisible = !document.getElementById('view-reports').classList.contains('hidden');\r\n      if (!dbrVisible) {\r\n        showToast(\"Please open the DBR report first.\", \"warn\");\r\n        return;\r\n      }\r\n      window.print();\r\n    }";

const newPrint = `// ============================================================
    // 🖨️ PHASE 9 — NATIVE PDF EXPORT ENGINE
    // ============================================================

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
      if (!rows.length) { showToast('No DBR data to export. Load the report first.', 'warn'); return; }
      const regionF = document.getElementById('dbr-filter-region')?.value || 'All';
      const custF   = document.getElementById('dbr-filter-customer')?.value || '';
      const respF   = document.getElementById('dbr-filter-responsibility')?.value || 'All';
      const badge = s => {
        if (!s) return '<span class="bz">—</span>';
        const sl = s.toLowerCase();
        if (sl.includes('open')||sl.includes('active')) return '<span class="br">'+s+'</span>';
        if (sl.includes('progress')||sl.includes('pending')) return '<span class="ba">'+s+'</span>';
        if (sl.includes('close')||sl.includes('complet')) return '<span class="bg">'+s+'</span>';
        return '<span class="bz">'+s+'</span>';
      };
      const rowsHtml = rows.map(r =>
        '<tr><td><strong>'+(r.customer||'—')+'</strong></td>'+
        '<td>'+(r.machine||r.machine_name||'—')+'</td>'+
        '<td>'+(r.reported_on||r.start_date||'—')+'</td>'+
        '<td style="max-width:190px;">'+(r.description||'—').substring(0,80)+'</td>'+
        '<td>'+(r.ted||'—')+'</td><td>'+(r.red||'—')+'</td>'+
        '<td>'+badge(r.status)+'</td>'+
        '<td style="text-align:right;">'+(r.days_on_bd??'—')+'</td>'+
        '<td>'+(r.parts_eta||'—')+'</td>'+
        '<td style="font-size:9px;">'+(r.manager_comments||r.comments||'').substring(0,60)+'</td></tr>'
      ).join('');
      const tableHtml = '<table><thead><tr><th>Customer</th><th>Machine</th><th>Reported On</th>'+
        '<th>Description</th><th>TED</th><th>RED</th><th>Status</th>'+
        '<th>Days BD</th><th>Parts ETA</th><th>Comments</th></tr></thead><tbody>'+rowsHtml+'</tbody></table>';
      const html = buildReportHtml({
        title: 'Daily Breakdown Report (DBR)',
        subtitle: 'Prepared by System | '+new Date().toLocaleDateString('en-ZW'),
        tableHtml,
        metaLines: ['Region: '+regionF+(custF?' | Customer: '+custF:''), 'Responsibility: '+respF+' | Records: '+rows.length]
      });
      omnisExportPDF({ htmlContent: html, filename: 'DBR-'+new Date().toISOString().slice(0,10)+'.pdf', landscape: true });
    }

    window.printMachineRegister = function() {
      const rows = window.FT_MACHINE_ROWS || [];
      if (!rows.length) { showToast('Machine register not loaded. Navigate to Machines first.', 'warn'); return; }
      const byRegion = {};
      rows.forEach(m => { const r = m.region||'Unassigned'; if (!byRegion[r]) byRegion[r]=[]; byRegion[r].push(m); });
      const wb = ws => {
        if (!ws) return '<span class="bz">—</span>';
        const l = ws.toLowerCase();
        if (l.includes('active')||l.includes('working')) return '<span class="bg">'+ws+'</span>';
        if (l.includes('idle')) return '<span class="ba">'+ws+'</span>';
        if (l.includes('broken')||l.includes('down')) return '<span class="br">'+ws+'</span>';
        return '<span class="bz">'+ws+'</span>';
      };
      let tbody = ''; let n = 1;
      Object.entries(byRegion).sort().forEach(([region, ms]) => {
        tbody += '<tr class="section-header"><td colspan="8">📍 '+region+' — '+ms.length+' machines</td></tr>';
        ms.sort((a,b)=>(a.customer||'').localeCompare(b.customer||'')).forEach(m => {
          tbody += '<tr><td style="color:#94a3b8;">'+(n++)+'</td><td><strong>'+(m.name||'—')+'</strong></td>'+
            '<td>'+(m.model||'—')+'</td><td>'+(m.customer||'—')+'</td>'+
            '<td>'+(m.location||m.current_location||'—')+'</td>'+
            '<td style="text-align:right;font-weight:700;">'+(m.current_hmr??'—')+'</td>'+
            '<td style="text-align:right;">'+(m.next_service_hmr??'—')+'</td>'+
            '<td>'+wb(m.working_status)+'</td></tr>';
        });
      });
      const tableHtml = '<table><thead><tr><th>#</th><th>Machine (SN)</th><th>Model</th>'+
        '<th>Customer</th><th>Location</th><th>HMR</th><th>Next Service</th><th>Status</th>'+
        '</tr></thead><tbody>'+tbody+'</tbody></table>';
      const html = buildReportHtml({
        title: 'Machine Register', subtitle: 'Full fleet grouped by region', tableHtml,
        metaLines: ['Total: '+rows.length+' machines | Regions: '+Object.keys(byRegion).length]
      });
      omnisExportPDF({ htmlContent: html, filename: 'Machine-Register-'+new Date().toISOString().slice(0,10)+'.pdf', landscape: true });
    };

    window.printJobCard = function(row) {
      if (!row) { showToast('No job card data.', 'warn'); return; }
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
      omnisExportPDF({ htmlContent: html, filename: 'JobCard-'+(row.name||'export')+'-'+new Date().toISOString().slice(0,10)+'.pdf', landscape: false });
    };`;

console.log('oldPrint found:', c.includes(oldPrint));
c = c.replace(oldPrint, newPrint);
fs.writeFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html', c, 'utf8');
console.log('Done. New size:', c.length);
