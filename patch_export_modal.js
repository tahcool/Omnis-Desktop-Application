const fs = require('fs');

const htmlPath = 'systems/fleetrack/index.html';
let html = fs.readFileSync(htmlPath, 'utf8');

const modalHTML = `
<!-- ══ EXPORT REPORT MODAL ══ -->
<div id="modal-export-report" class="hidden" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(15,23,42,0.6);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:center;justify-content:center;">
  
  <div style="background:#ffffff; width:1100px; max-width:95vw; height:800px; max-height:90vh; border-radius:24px; box-shadow:0 25px 50px -12px rgba(0,0,0,0.25); display:flex; flex-direction:column; overflow:hidden;">
    
    <!-- Header -->
    <div style="padding:24px 32px; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center; background:#f8fafc;">
      <div style="display:flex; align-items:center; gap:16px;">
        <div style="width:48px; height:48px; border-radius:12px; background:linear-gradient(135deg, #a855f7, #7c3aed); display:flex; align-items:center; justify-content:center; color:#fff; box-shadow:0 4px 12px rgba(139,92,246,0.3);">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
        </div>
        <div>
          <h2 style="margin:0; font-size:24px; font-weight:900; color:#0f172a; letter-spacing:-0.5px;">Report Generator</h2>
          <p style="margin:4px 0 0 0; font-size:14px; color:#64748b; font-weight:500;">Select a report to preview and export as PDF.</p>
        </div>
      </div>
      <button onclick="closeReportModal()" style="background:none; border:none; cursor:pointer; color:#94a3b8; transition:color 0.2s;" onmouseover="this.style.color='#0f172a'" onmouseout="this.style.color='#94a3b8'">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    </div>

    <!-- Body Layout -->
    <div style="display:flex; flex:1; overflow:hidden;">
      
      <!-- Left: Categories -->
      <div style="width:280px; background:#f8fafc; border-right:1px solid #e2e8f0; display:flex; flex-direction:column; padding:24px 16px; overflow-y:auto;">
        <h4 style="margin:0 0 16px 12px; font-size:11px; font-weight:800; color:#94a3b8; letter-spacing:1px; text-transform:uppercase;">Categories</h4>
        
        <div id="rpt-cat-breakdown" onclick="selectReportCategory('breakdown')" style="padding:12px; margin-bottom:8px; border-radius:12px; cursor:pointer; background:#fff; border:1px solid #cbd5e1; box-shadow:0 2px 4px rgba(0,0,0,0.02); display:flex; align-items:center; gap:12px; transition:all 0.2s;">
          <div style="width:8px; height:8px; border-radius:50%; background:#7c3aed;"></div>
          <span style="font-size:14px; font-weight:700; color:#0f172a;">Breakdown & Activity</span>
        </div>
        
        <div id="rpt-cat-fleet" onclick="selectReportCategory('fleet')" style="padding:12px; margin-bottom:8px; border-radius:12px; cursor:pointer; background:transparent; border:1px solid transparent; display:flex; align-items:center; gap:12px; transition:all 0.2s;">
          <div style="width:8px; height:8px; border-radius:50%; background:transparent;"></div>
          <span style="font-size:14px; font-weight:600; color:#475569;">Fleet & Machines</span>
        </div>

        <div id="rpt-cat-defects" onclick="selectReportCategory('defects')" style="padding:12px; margin-bottom:8px; border-radius:12px; cursor:pointer; background:transparent; border:1px solid transparent; display:flex; align-items:center; gap:12px; transition:all 0.2s;">
          <div style="width:8px; height:8px; border-radius:50%; background:transparent;"></div>
          <span style="font-size:14px; font-weight:600; color:#475569;">Defects & Service</span>
        </div>

        <div id="rpt-cat-planning" onclick="selectReportCategory('planning')" style="padding:12px; margin-bottom:8px; border-radius:12px; cursor:pointer; background:transparent; border:1px solid transparent; display:flex; align-items:center; gap:12px; transition:all 0.2s;">
          <div style="width:8px; height:8px; border-radius:50%; background:transparent;"></div>
          <span style="font-size:14px; font-weight:600; color:#475569;">Planning & Compliance</span>
        </div>
      </div>

      <!-- Middle: Report Selection Grid -->
      <div style="width:360px; background:#ffffff; border-right:1px solid #e2e8f0; padding:24px; overflow-y:auto; display:flex; flex-direction:column; gap:12px;" id="rpt-selection-grid">
        <!-- Injected via JS -->
      </div>

      <!-- Right: Preview Pane -->
      <div style="flex:1; background:#f1f5f9; padding:32px; display:flex; flex-direction:column; align-items:center; position:relative; overflow-y:auto;">
        
        <!-- Empty State -->
        <div id="rpt-preview-empty" style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; text-align:center; opacity:0.5;">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:16px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
          <h3 style="margin:0 0 8px 0; font-size:20px; font-weight:800; color:#0f172a;">No Report Selected</h3>
          <p style="margin:0; font-size:14px; color:#475569;">Select a report from the list to preview.</p>
        </div>

        <!-- Document Preview Skeleton -->
        <div id="rpt-preview-document" class="hidden" style="width:100%; max-width:600px; background:#fff; min-height:800px; box-shadow:0 20px 40px -10px rgba(0,0,0,0.1); border-radius:8px; padding:40px; display:flex; flex-direction:column;">
          <div style="display:flex; justify-content:space-between; border-bottom:2px solid #e2e8f0; padding-bottom:16px; margin-bottom:24px;">
            <div>
              <div style="width:140px; height:32px; background:#e2e8f0; border-radius:6px; margin-bottom:12px;"></div>
              <div style="width:200px; height:16px; background:#f1f5f9; border-radius:4px;"></div>
            </div>
            <div style="text-align:right;">
              <h1 id="rpt-preview-title" style="margin:0 0 8px 0; font-size:24px; font-weight:900; color:#0f172a;">Report Name</h1>
              <p id="rpt-preview-date" style="margin:0; font-size:13px; color:#64748b; font-weight:600;">Date: 2026-07-29</p>
            </div>
          </div>
          
          <div style="display:flex; gap:16px; margin-bottom:24px;">
            <div style="flex:1; height:80px; background:#f8fafc; border-radius:8px; border:1px solid #e2e8f0;"></div>
            <div style="flex:1; height:80px; background:#f8fafc; border-radius:8px; border:1px solid #e2e8f0;"></div>
            <div style="flex:1; height:80px; background:#f8fafc; border-radius:8px; border:1px solid #e2e8f0;"></div>
          </div>

          <div style="width:100%; height:32px; background:#e2e8f0; border-radius:6px; margin-bottom:12px;"></div>
          <div style="width:100%; height:200px; background:#f8fafc; border-radius:8px; border:1px solid #e2e8f0; margin-bottom:24px;"></div>

          <div style="width:100%; height:32px; background:#e2e8f0; border-radius:6px; margin-bottom:12px;"></div>
          <div style="width:100%; height:16px; background:#f1f5f9; border-radius:4px; margin-bottom:8px;"></div>
          <div style="width:100%; height:16px; background:#f1f5f9; border-radius:4px; margin-bottom:8px;"></div>
          <div style="width:80%; height:16px; background:#f1f5f9; border-radius:4px;"></div>
        </div>

      </div>
    </div>

    <!-- Footer Actions -->
    <div style="padding:20px 32px; border-top:1px solid #e2e8f0; background:#f8fafc; display:flex; justify-content:flex-end; gap:16px;">
      <button onclick="closeReportModal()" style="padding:12px 24px; background:#fff; border:1px solid #cbd5e1; border-radius:10px; font-size:14px; font-weight:700; color:#475569; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='#fff'">Cancel</button>
      
      <button id="rpt-btn-print" disabled style="padding:12px 24px; background:#fff; border:1px solid #cbd5e1; border-radius:10px; font-size:14px; font-weight:700; color:#475569; cursor:not-allowed; opacity:0.5; transition:all 0.2s; display:flex; align-items:center; gap:8px;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
        Print
      </button>

      <button id="rpt-btn-export" disabled onclick="exportReportToPDF()" style="padding:12px 28px; background:linear-gradient(135deg, #a855f7, #7c3aed); color:#fff; border:none; border-radius:10px; font-size:14px; font-weight:800; cursor:not-allowed; opacity:0.5; box-shadow:0 4px 12px rgba(139,92,246,0.3); transition:all 0.2s; display:flex; align-items:center; gap:8px;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
        <span id="rpt-btn-export-text">Export to PDF</span>
      </button>
    </div>

  </div>
</div>
`;

const jsLogic = `
// ══ REPORT GENERATOR LOGIC ══
const reportCategories = {
  'breakdown': [
    { id: 'dbr', name: 'Daily Breakdown (DBR)' },
    { id: 'wsd', name: 'WSD Daily Breakdown' },
    { id: 'lsr', name: 'Lost Sales (LSR)' },
    { id: 'fsd', name: 'FSD Daily Breakdown' },
    { id: 'fal', name: 'Fleetrack Activity List' },
    { id: 'rdr', name: 'RDR' }
  ],
  'fleet': [
    { id: 'fmr', name: 'FT Machine Register' },
    { id: 'fm', name: 'Fleetrack Managed' },
    { id: 'gp', name: 'General Population' },
    { id: 'fms', name: 'FT Machine Summary' },
    { id: 'ep', name: 'Equipment Population' },
    { id: 'tar', name: 'Telematics Alert (TAR)' }
  ],
  'defects': [
    { id: 'gdr', name: 'General Defects (GDR)' },
    { id: 'mwr', name: 'Maintenance Warning (MWR)' },
    { id: 'sts', name: 'Service Tracking (STS)' },
    { id: 'mdr', name: 'Major Defects (MDR)' },
    { id: 'mds', name: 'Machines Due for Service' },
    { id: 'jtc', name: 'Jobs To Complete' }
  ],
  'planning': [
    { id: 'fsp', name: 'Field Service Planner' },
    { id: 'wwu', name: 'Weekly Warranty Update (WWU)' },
    { id: 'wp', name: 'Workshop Planner' },
    { id: 'isr', name: 'Initial Service Report (ISR)' }
  ]
};

let activeReportId = null;

function openReportModal() {
  document.getElementById('modal-export-report').classList.remove('hidden');
  selectReportCategory('breakdown'); // Default
}

function closeReportModal() {
  document.getElementById('modal-export-report').classList.add('hidden');
}

function selectReportCategory(catId) {
  // Reset styles for all categories
  ['breakdown', 'fleet', 'defects', 'planning'].forEach(id => {
    const el = document.getElementById('rpt-cat-' + id);
    if(el) {
      el.style.background = 'transparent';
      el.style.border = '1px solid transparent';
      el.style.boxShadow = 'none';
      el.querySelector('div').style.background = 'transparent';
      el.querySelector('span').style.color = '#475569';
      el.querySelector('span').style.fontWeight = '600';
    }
  });

  // Highlight active
  const activeEl = document.getElementById('rpt-cat-' + catId);
  if(activeEl) {
    activeEl.style.background = '#fff';
    activeEl.style.border = '1px solid #cbd5e1';
    activeEl.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)';
    activeEl.querySelector('div').style.background = '#7c3aed';
    activeEl.querySelector('span').style.color = '#0f172a';
    activeEl.querySelector('span').style.fontWeight = '700';
  }

  // Populate middle grid
  const grid = document.getElementById('rpt-selection-grid');
  grid.innerHTML = '';
  
  reportCategories[catId].forEach(rpt => {
    const card = document.createElement('div');
    card.id = 'rpt-card-' + rpt.id;
    card.style.cssText = 'padding:16px; border:1px solid #e2e8f0; border-radius:12px; cursor:pointer; transition:all 0.2s; display:flex; align-items:center; gap:12px; background:#fff;';
    card.innerHTML = \`
      <div style="width:32px; height:32px; border-radius:8px; background:#f1f5f9; display:flex; align-items:center; justify-content:center; color:#64748b;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
      </div>
      <span style="font-size:14px; font-weight:700; color:#334155;">\${rpt.name}</span>
    \`;
    
    card.onmouseover = () => {
      if(activeReportId !== rpt.id) card.style.borderColor = '#94a3b8';
    };
    card.onmouseout = () => {
      if(activeReportId !== rpt.id) card.style.borderColor = '#e2e8f0';
    };
    
    card.onclick = () => selectReport(rpt.id, rpt.name);
    grid.appendChild(card);
  });
}

function selectReport(reportId, reportName) {
  // Clear previous active
  if(activeReportId) {
    const prev = document.getElementById('rpt-card-' + activeReportId);
    if(prev) {
      prev.style.borderColor = '#e2e8f0';
      prev.style.boxShadow = 'none';
      prev.querySelector('div').style.background = '#f1f5f9';
      prev.querySelector('div').style.color = '#64748b';
    }
  }

  activeReportId = reportId;

  // Highlight new active
  const curr = document.getElementById('rpt-card-' + reportId);
  if(curr) {
    curr.style.borderColor = '#8b5cf6';
    curr.style.boxShadow = '0 4px 12px rgba(139,92,246,0.15)';
    curr.querySelector('div').style.background = '#8b5cf6';
    curr.querySelector('div').style.color = '#fff';
  }

  // Update Preview Pane
  document.getElementById('rpt-preview-empty').style.display = 'none';
  document.getElementById('rpt-preview-document').classList.remove('hidden');
  document.getElementById('rpt-preview-title').textContent = reportName;
  document.getElementById('rpt-preview-date').textContent = 'Date: ' + new Date().toISOString().split('T')[0];

  // Enable footer buttons
  const printBtn = document.getElementById('rpt-btn-print');
  const exportBtn = document.getElementById('rpt-btn-export');
  
  printBtn.disabled = false;
  printBtn.style.opacity = '1';
  printBtn.style.cursor = 'pointer';
  
  exportBtn.disabled = false;
  exportBtn.style.opacity = '1';
  exportBtn.style.cursor = 'pointer';
  exportBtn.onmouseover = function() { this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 16px rgba(139,92,246,0.4)'; };
  exportBtn.onmouseout = function() { this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(139,92,246,0.3)'; };
}

function exportReportToPDF() {
  if(!activeReportId) return;
  const btn = document.getElementById('rpt-btn-export');
  const text = document.getElementById('rpt-btn-export-text');
  
  text.textContent = 'Generating PDF...';
  btn.style.opacity = '0.8';
  btn.style.pointerEvents = 'none';
  
  // Simulate network request
  setTimeout(() => {
    text.textContent = 'PDF Exported ✓';
    btn.style.background = 'linear-gradient(135deg, #16a34a, #15803d)';
    
    setTimeout(() => {
      // Reset
      text.textContent = 'Export to PDF';
      btn.style.background = 'linear-gradient(135deg, #a855f7, #7c3aed)';
      btn.style.opacity = '1';
      btn.style.pointerEvents = 'auto';
    }, 2000);
  }, 1500);
}
// ════════════════════════════════
`;

// 1. Insert HTML right before <div id="modal-defect"
const targetHtmlIdx = html.indexOf('<div id="modal-defect"');
if (targetHtmlIdx !== -1) {
  html = html.substring(0, targetHtmlIdx) + modalHTML + '\n' + html.substring(targetHtmlIdx);
} else {
  console.log("Could not find <div id=\"modal-defect\"");
}

// 2. Insert JS right before function openDefectModal
const targetJsIdx = html.indexOf('function openDefectModal');
if (targetJsIdx !== -1) {
  html = html.substring(0, targetJsIdx) + jsLogic + '\n' + html.substring(targetJsIdx);
} else {
  console.log("Could not find function openDefectModal");
}

// 3. Fix the openReportModal target in the shortcuts strip we added earlier
// Since we reverted the commit, we need to make sure the shortcuts strip actually points to openReportModal
// Oh wait, the previous commit was NOT reverted by git checkout unless I did git reset.
// Let's check if the button already exists. If not, this is a clean file. Wait, I ran git commit before! 
// Let's replace 'showView('view-rpt-aftersales')' with 'openReportModal()'
html = html.replace(/showView\('view-rpt-aftersales'\)/g, 'openReportModal()');

fs.writeFileSync(htmlPath, html);
console.log('Export Report modal injected safely.');
