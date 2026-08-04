const fs = require('fs');

let html = fs.readFileSync('systems/fleetrack/index.html', 'utf8');

const targetOld = `
      <div style="padding:20px; display:flex; flex-direction:column; gap:12px;">
        <p style="margin:0 0 8px 0; font-size:13px; color:#64748b;">Select a report to export and print immediately. <br><span style="font-size:11px;color:#ef4444;">Note: Please ensure the respective report view has been opened to load the latest data before printing.</span></p>
        
        <button onclick="closeExportModal(); showView('view-reports'); setTimeout(printDBR, 1500);" style="width:100%; justify-content:flex-start; font-size:14px; padding:12px; background:#f1f5f9; color:#0f172a; border:1px solid #e2e8f0; border-radius:8px; cursor:pointer; display:flex; align-items:center; gap:10px;">
          <span style="font-size:18px;">📊</span> <strong>Daily Breakdown Report (DBR)</strong>
        </button>
        
        <button onclick="closeExportModal(); showView('view-defects'); setTimeout(printGDR, 1500);" style="width:100%; justify-content:flex-start; font-size:14px; padding:12px; background:#f1f5f9; color:#0f172a; border:1px solid #e2e8f0; border-radius:8px; cursor:pointer; display:flex; align-items:center; gap:10px;">
          <span style="font-size:18px;">⚠️</span> <strong>General Defects Report (GDR)</strong>
        </button>
        
        <button onclick="closeExportModal(); showView('view-rpt-mwr'); setTimeout(printMWR, 1500);" style="width:100%; justify-content:flex-start; font-size:14px; padding:12px; background:#f1f5f9; color:#0f172a; border:1px solid #e2e8f0; border-radius:8px; cursor:pointer; display:flex; align-items:center; gap:10px;">
          <span style="font-size:18px;">🔔</span> <strong>Maintenance Warning Report (MWR)</strong>
        </button>
        
        <button onclick="closeExportModal(); showView('view-rpt-aftersales');" style="width:100%; justify-content:flex-start; font-size:14px; padding:12px; background:#f1f5f9; color:#0f172a; border:1px solid #e2e8f0; border-radius:8px; cursor:pointer; display:flex; align-items:center; gap:10px;">
          <span style="font-size:18px;">📈</span> <strong>After-Sales Report (Open view)</strong>
        </button>
      </div>`;

const targetNew = `
      <div style="padding:20px; display:flex; flex-direction:column; gap:12px;">
        <p style="margin:0 0 8px 0; font-size:13px; color:#64748b;">Select a report to open its view. You can then apply filters before printing it.</p>
        
        <button onclick="closeExportModal(); showView('view-reports');" style="width:100%; justify-content:flex-start; font-size:14px; padding:12px; background:#f1f5f9; color:#0f172a; border:1px solid #e2e8f0; border-radius:8px; cursor:pointer; display:flex; align-items:center; gap:10px;">
          <span style="font-size:18px;">📊</span> <strong>Daily Breakdown Report (DBR)</strong>
        </button>
        
        <button onclick="closeExportModal(); showView('view-defects');" style="width:100%; justify-content:flex-start; font-size:14px; padding:12px; background:#f1f5f9; color:#0f172a; border:1px solid #e2e8f0; border-radius:8px; cursor:pointer; display:flex; align-items:center; gap:10px;">
          <span style="font-size:18px;">⚠️</span> <strong>General Defects Report (GDR)</strong>
        </button>
        
        <button onclick="closeExportModal(); showView('view-rpt-mwr');" style="width:100%; justify-content:flex-start; font-size:14px; padding:12px; background:#f1f5f9; color:#0f172a; border:1px solid #e2e8f0; border-radius:8px; cursor:pointer; display:flex; align-items:center; gap:10px;">
          <span style="font-size:18px;">🔔</span> <strong>Maintenance Warning Report (MWR)</strong>
        </button>
        
        <button onclick="closeExportModal(); showView('view-aftersales-hub');" style="width:100%; justify-content:flex-start; font-size:14px; padding:12px; background:#f1f5f9; color:#0f172a; border:1px solid #e2e8f0; border-radius:8px; cursor:pointer; display:flex; align-items:center; gap:10px;">
          <span style="font-size:18px;">📈</span> <strong>After-Sales Report (Open view)</strong>
        </button>
      </div>`;

// First trim spaces for a loose match in case formatting is slightly off
const sanitize = str => str.replace(/\\s+/g, '');

const htmlSan = sanitize(html);
const oldSan = sanitize(targetOld);

if(htmlSan.includes(oldSan)) {
    console.log('Match found! Replacing dynamically.');
    // Let's replace the block using regex to handle whitespace differences
    const regex = /<div style="padding:20px; display:flex; flex-direction:column; gap:12px;">[\\s\\S]*?After-Sales Report \(Open view\)<\/strong>[\\s\\S]*?<\/button>\\s*<\/div>/;
    
    html = html.replace(regex, targetNew.trim());
    
    fs.writeFileSync('systems/fleetrack/index.html', html);
    console.log('Successfully updated modal-export-reports');
} else {
    console.log('Could not find the target HTML block.');
}
