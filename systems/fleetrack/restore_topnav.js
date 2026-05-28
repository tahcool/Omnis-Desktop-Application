const fs = require('fs');
let c = fs.readFileSync('index.html', 'utf8');

// 1. Add TOP NAV CSS before </style>
const topNavCss = `
    /* --- TOP NAV STYLES --- */
    .omnis-top-nav {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 80px !important;
      background: #000000 !important;
      display: flex;
      align-items: center;
      padding: 0 20px;
      gap: 24px;
      z-index: 8000 !important;
      border-bottom: 2px solid var(--accent, #e53935) !important;
      box-shadow: none !important;
      flex-shrink: 0;
    }
    .top-nav-logo {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      justify-content: center;
      gap: 2px;
      padding-right: 24px;
      border-right: 1px solid rgba(255, 255, 255, 0.1);
      flex-shrink: 0;
    }
    .top-nav-group {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .top-nav-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      color: rgba(255, 255, 255, 0.7);
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.05em;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
      white-space: nowrap;
    }
    .top-nav-item:hover {
      background: rgba(255, 255, 255, 0.05);
      color: #ffffff;
    }
    .top-nav-item.active {
      background: rgba(229, 57, 53, 0.1);
      color: var(--accent, #e53935);
    }
    .top-nav-dropdown {
      position: relative;
    }
    .top-nav-dropdown-menu {
      position: absolute;
      top: 100%;
      left: 0;
      background: #ffffff;
      min-width: 220px;
      border-radius: 8px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2);
      border: 1px solid #e2e8f0;
      padding: 8px;
      padding-top: 16px;
      display: none;
      z-index: 8001;
      margin-top: 0;
    }
    .top-nav-dropdown:hover .top-nav-dropdown-menu {
      display: flex;
      flex-direction: column;
    }
    .top-nav-dropdown-item {
      padding: 10px 14px;
      color: #334155;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      border-radius: 6px;
      display: flex;
      align-items: center;
      gap: 10px;
      transition: background 0.1s;
    }
    .top-nav-dropdown-item:hover {
      background: #f1f5f9;
      color: var(--accent, #e53935);
    }
    .top-nav-spacer {
      flex: 1;
    }

    /* === FULL-WIDTH TOP-NAV LAYOUT FIX === */
    body { display: block !important; width: 100vw !important; overflow-x: hidden !important; }
    #app-shell, .app-shell { display: block !important; width: 100% !important; max-width: 100vw !important; }
    .sidebar, aside.sidebar { display: none !important; width: 0 !important; position: absolute !important; visibility: hidden !important; }
    .topbar { display: none !important; }
    main.main, .main { display: flex !important; flex-direction: column !important; width: 100% !important; max-width: 100% !important; margin-left: 0 !important; padding-top: 80px !important; height: auto !important; min-height: calc(100vh - 80px) !important; box-sizing: border-box !important; }
    .view-page { width: 100% !important; max-width: 100% !important; box-sizing: border-box !important; }
`;

if (!c.includes('.omnis-top-nav')) {
  c = c.replace('</style>', topNavCss + '\n  </style>');
}

// 2. CRITICAL: Remove "display: flex" from the ORIGINAL .sidebar rule
//    so it doesn't override our "display: none !important" in the same block.
c = c.replace(
  /\.sidebar\s*\{([^}]*?)display:\s*flex;/,
  '.sidebar {$1/* display: flex; -- REMOVED: top-nav layout */'
);

// 3. CRITICAL: Change .app-shell from two-column grid to single-column block
//    The grid-template-columns reserves 260px for the sidebar even when hidden.
c = c.replace(
  /\.app-shell\s*\{([^}]*?)display:\s*grid;\s*\n\s*grid-template-columns:[^;]+;/,
  '.app-shell {$1display: block !important;\n      /* grid-template-columns removed — top-nav layout */'
);

// 4. Inject TOP NAV HTML at the start of app-shell
const topNavHtml = `
    <nav class="omnis-top-nav">
      <div class="top-nav-logo">
        <img src="../../assets/images/omnis-logo-white.png" alt="Omnis AI" style="height: 38px; width: auto; object-fit: contain;">
        <span style="color:#f8fafc; font-weight:800; letter-spacing:0.12em; font-size:11.5px; margin-right: 12px; margin-top: 2px; opacity: 0.9;">Fleetrack</span>
      </div>

      <div class="top-nav-group">
        <div class="top-nav-item active" data-view="view-dashboard" onclick="showView('view-dashboard')">
          <span class="icon">📊</span> <span>Dashboard</span>
        </div>

        <div class="top-nav-dropdown">
          <div class="top-nav-item" id="dd-modules-trigger">
            <span class="icon">📦</span>
            <span>Modules</span>
            <span style="font-size:8px; opacity:0.6;">▼</span>
          </div>
          <div class="top-nav-dropdown-menu" id="dd-modules-menu">
            <div class="top-nav-dropdown-item" data-view="view-reports" onclick="showView('view-reports')">
              <span class="icon" style="margin-right:8px; opacity:0.7;">⚠️</span> Breakdowns
            </div>
            <div class="top-nav-dropdown-item" data-view="view-machines" onclick="showView('view-machines')">
              <span class="icon" style="margin-right:8px; opacity:0.7;">🚜</span> Machines
            </div>
            <div class="top-nav-dropdown-item" data-view="view-defects" onclick="showView('view-defects')">
              <span class="icon" style="margin-right:8px; opacity:0.7;">🔧</span> Defects
            </div>
            <div class="top-nav-dropdown-item" data-view="view-fsi" onclick="showView('view-fsi')">
              <span class="icon" style="margin-right:8px; opacity:0.7;">📅</span> Field Service Planning
            </div>
            <div class="top-nav-dropdown-item" data-view="view-job-cards" onclick="showView('view-job-cards')">
              <span class="icon" style="margin-right:8px; opacity:0.7;">📋</span> Job Cards
            </div>
            <div class="top-nav-dropdown-item" data-view="view-service-due" onclick="showView('view-service-due')">
              <span class="icon" style="margin-right:8px; opacity:0.7;">⏱️</span> Service Due
            </div>
            <div class="top-nav-dropdown-item" data-view="view-isr" onclick="if(window.openISRReport) window.openISRReport()" style="color: var(--accent, #e53935);">
              <span class="icon" style="margin-right:8px; opacity:0.7;">📄</span> Initial Service Report (ISR)
            </div>
            <div class="top-nav-dropdown-item" data-view="view-customers" onclick="showView('view-customers')">
              <span class="icon" style="margin-right:8px; opacity:0.7;">👥</span> Customers
            </div>
            <div class="top-nav-dropdown-item" data-view="view-archives" onclick="showView('view-archives')">
              <span class="icon" style="margin-right:8px; opacity:0.7;">📁</span> Report Archives
            </div>
          </div>
        </div>

        <div class="top-nav-dropdown">
          <div class="top-nav-item" id="dd-reports-trigger">
            <span class="icon">📄</span>
            <span>Reports</span>
            <span style="font-size:8px; opacity:0.6;">▼</span>
          </div>
          <div class="top-nav-dropdown-menu" id="dd-reports-menu">
            <div class="top-nav-dropdown-item" onclick="if(window.showView) showView('view-reports')">
              <span class="icon" style="margin-right:8px; opacity:0.7;">📊</span> Daily Breakdown Report
            </div>
          </div>
        </div>
      </div>

      <div class="top-nav-spacer"></div>

      <div style="display:flex; align-items:center; gap:12px; margin-right: 15px;">
        <div style="display:flex; align-items:center; gap:6px;">
          <span style="width:6px; height:6px; background:#10b981; border-radius:50%; display:inline-block; animation: neonPulse 2s infinite;"></span>
          <div style="font-size:10px; color:#10b981; font-weight:800; letter-spacing:0.05em;">LIVE</div>
        </div>
        <div style="height:16px; width:1px; background:rgba(255,255,255,0.15);"></div>
        <div id="wa-navbar-status" style="display:flex; align-items:center; gap:6px;">
          <span id="wa-navbar-dot" style="width:6px; height:6px; background:#10b981; border-radius:50%; display:inline-block;"></span>
          <div id="wa-navbar-text" style="font-size:10px; color:rgba(255,255,255,0.7); font-weight:800; letter-spacing:0.05em;">SYNCED</div>
        </div>
      </div>

      <div class="top-nav-group" style="gap:8px;">
        <div class="top-nav-item" onclick="openSettingsModal()" style="padding:8px; border-radius:50%; background:rgba(255,255,255,0.05);" title="System Settings">
          <span class="icon" style="margin:0; font-size:13px; width:auto;">⚙️</span>
        </div>
        <div class="top-nav-item" onclick="openWaLinkModal()" style="padding:8px; border-radius:50%; background:rgba(255,255,255,0.05);" title="WhatsApp Center">
          <span class="icon" style="margin:0; font-size:13px; width:auto;">🔗</span>
        </div>
        <div class="top-nav-item" id="nav-logout-custom" onclick="doLogout()" style="color: #f87171; padding:8px; border-radius:50%; background:rgba(248,113,113,0.1);" title="Logout">
          <span class="icon" style="margin:0; font-size:13px; width:auto;">🚪</span>
        </div>
      </div>
    </nav>
`;

if (!c.includes('<nav class="omnis-top-nav">')) {
  c = c.replace(
    '<div id="app-shell" class="app-shell">',
    '<div id="app-shell" class="app-shell">\n' + topNavHtml
  );
  // Alternative replacement if class list differs
  c = c.replace(
    '<div id="app-shell" class="app-shell" style="position:relative; z-index:1; width:100vw; height:100vh; overflow:hidden; display:block;">',
    '<div id="app-shell" class="app-shell" style="position:relative; z-index:1; width:100vw; height:100vh; overflow:hidden; display:block;">\n' + topNavHtml
  );
}

// 5. Fix navigation logic: nav-item to top-nav-item
c = c.replace(
  'document.querySelectorAll(".nav-item").forEach(item => {',
  'document.querySelectorAll(".nav-item, .top-nav-item").forEach(item => {'
);
c = c.replace(
  'document.querySelectorAll(".nav-item").forEach(el => el.classList.remove("active"));',
  'document.querySelectorAll(".nav-item, .top-nav-item").forEach(el => el.classList.remove("active"));'
);

// 6. CRITICAL: Wrap dashboard content in a view-page div so showView() can hide it
if (!c.includes('id="view-dashboard"')) {
  const mainTag = '<main class="main">';
  const mainIdx = c.indexOf(mainTag);
  if (mainIdx > 0) {
    const topbarIdx = c.indexOf('<div class="topbar">', mainIdx);
    if (topbarIdx > 0) {
      c = c.substring(0, topbarIdx) + '<div id="view-dashboard" class="view-page">\n      ' + c.substring(topbarIdx);
      const archivesMarker = '<!-- REPORT ARCHIVES VIEW -->';
      const archivesIdx = c.indexOf(archivesMarker);
      if (archivesIdx > 0) {
        c = c.substring(0, archivesIdx) + '</div><!-- /view-dashboard -->\n\n      ' + c.substring(archivesIdx);
      }
    }
  }
}

fs.writeFileSync('index.html', c, 'utf8');
console.log('Top Nav structure restored (with sidebar/grid/view fixes).');
