const fs = require('fs');

const cssContent = `    .omnis-top-nav {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 76px !important;
      background: rgba(15, 23, 42, 0.8) !important;
      backdrop-filter: blur(16px) saturate(180%) !important;
      -webkit-backdrop-filter: blur(16px) saturate(180%) !important;
      display: flex;
      align-items: center;
      padding: 0 32px;
      gap: 24px;
      z-index: 8000 !important;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2) !important;
      flex-shrink: 0;
    }
    .top-nav-logo {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      justify-content: center;
      gap: 2px;
      padding: 8px 24px 8px 0;
      border-right: 1px solid rgba(255, 255, 255, 0.1);
      flex-shrink: 0;
    }
    .top-nav-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .top-nav-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 18px;
      color: rgba(241, 245, 249, 0.75);
      font-size: 13.5px;
      font-weight: 600;
      letter-spacing: 0.02em;
      border-radius: 10px;
      cursor: pointer;
      border: 1px solid transparent;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      white-space: nowrap;
    }
    .top-nav-item:hover {
      background: rgba(255, 255, 255, 0.06);
      color: #f8fafc;
      transform: translateY(-1px);
    }
    .top-nav-item.active,
    .top-nav-item.nav-active,
    .top-nav-item[data-view].active {
      background: linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.05) 100%) !important;
      border-color: rgba(239, 68, 68, 0.3) !important;
      color: #fca5a5 !important;
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.1);
      transform: translateY(-1px);
    }
    /* ===== DROPDOWN TRIGGER BUTTON ===== */
    .top-nav-item[id$="-trigger"],
    .top-nav-dropdown > .top-nav-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 9px 18px;
      border-radius: 10px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.06);
      color: rgba(241, 245, 249, 0.85);
      font-size: 13.5px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      letter-spacing: 0.02em;
    }
    .top-nav-item[id$="-trigger"] > .dd-icon,
    .top-nav-dropdown > .top-nav-item > .dd-icon,
    .top-nav-group > .top-nav-item > .dd-icon {
      width: 15px;
      height: 15px;
      opacity: 0.8;
      flex-shrink: 0;
    }
    .top-nav-item[id$="-trigger"]:hover,
    .top-nav-dropdown:hover > .top-nav-item {
      background: rgba(255,255,255,0.08);
      border-color: rgba(255,255,255,0.15);
      color: #ffffff;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    }
    .top-nav-item[id$="-trigger"] .dd-chevron {
      width: 12px;
      height: 12px;
      opacity: 0.6;
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      flex-shrink: 0;
    }
    .top-nav-dropdown:hover > .top-nav-item .dd-chevron,
    .top-nav-dropdown.dd-open > .top-nav-item .dd-chevron {
      transform: rotate(180deg);
      opacity: 1;
    }

    /* ===== DROPDOWN CONTAINER ===== */
    .top-nav-dropdown {
      position: relative;
    }

    /* ===== DROPDOWN PANEL ===== */
    .top-nav-dropdown-menu {
      position: absolute;
      top: calc(100% + 12px);
      left: 0;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(20px) saturate(180%);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      min-width: 260px;
      border-radius: 14px;
      box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1);
      padding: 8px;
      display: none;
      flex-direction: column;
      z-index: 9000;
      max-height: 80vh;
      overflow-y: auto;
      overflow-x: hidden;
      scrollbar-width: thin;
      scrollbar-color: rgba(255,255,255,0.15) transparent;
      transform-origin: top;
      animation: ddReveal 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    @keyframes ddReveal {
      0% { opacity: 0; transform: scaleY(0.95) translateY(-10px); }
      100% { opacity: 1; transform: scaleY(1) translateY(0); }
    }
    
    .top-nav-dropdown-menu::-webkit-scrollbar { width: 4px; }
    .top-nav-dropdown-menu::-webkit-scrollbar-track { background: transparent; }
    .top-nav-dropdown-menu::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 4px; }

    .top-nav-dropdown-menu::before {
      display: none;
    }

    /* Dropdown opens on click via JS .open class - not hover */
    .top-nav-dropdown:hover .top-nav-dropdown-menu {
      /* hover disabled - JS handles this */
    }
    .top-nav-dropdown-menu.open {
      display: flex;
    }

    /* Active nav item */
    .top-nav-item.nav-active {
      background: linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.05) 100%) !important;
      border-color: rgba(239, 68, 68, 0.3) !important;
      color: #fca5a5 !important;
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.1);
      transform: translateY(-1px);
    }
    /* Active dropdown trigger (when a child view is selected) */
    .top-nav-dropdown.nav-active > .top-nav-item {
      background: linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.05) 100%) !important;
      border-color: rgba(239, 68, 68, 0.3) !important;
      color: #fca5a5 !important;
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.1);
      transform: translateY(-1px);
    }
    /* Active dropdown item */
    .top-nav-dropdown-item.nav-active {
      color: #fca5a5 !important;
      background: rgba(239, 68, 68, 0.08);
      border-radius: 8px;
    }

    /* ===== DROPDOWN ITEM ===== */
    .top-nav-dropdown-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 14px;
      color: rgba(241, 245, 249, 0.75);
      font-size: 13.5px;
      font-weight: 500;
      cursor: pointer;
      border-radius: 8px;
      transition: all 0.2s ease;
      white-space: nowrap;
      letter-spacing: 0.01em;
    }
    .top-nav-dropdown-item:hover {
      background: rgba(255,255,255,0.08);
      color: #ffffff;
      transform: translateX(2px);
    }
    .top-nav-dropdown-item.active,
    .top-nav-dropdown-item[style*="color: var(--accent"],
    .top-nav-dropdown-item[style*="color: #e53935"],
    .top-nav-dropdown-item[style*="color:var(--accent"] {
      color: #fca5a5 !important;
      background: rgba(239, 68, 68, 0.08);
    }
    .top-nav-dropdown-item.active:hover,
    .top-nav-dropdown-item[style*="color: var(--accent"]:hover {
      background: rgba(239, 68, 68, 0.12);
    }
    /* Icon column */
    .top-nav-dropdown-item .dd-icon {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
      opacity: 0.6;
      transition: opacity 0.2s;
      color: inherit;
    }
    .top-nav-dropdown-item:hover .dd-icon {
      opacity: 1;
    }
    .top-nav-spacer {
      flex: 1;
    }`;

let html = fs.readFileSync('systems/fleetrack/index.html', 'utf8');

// 1. Update CSS
const startIndex = html.indexOf('.omnis-top-nav {');
let endIndexStr = '.top-nav-spacer {\\n      flex: 1;\\n    }';
let endIndexStrAlt = '.top-nav-spacer {\\r\\n      flex: 1;\\r\\n    }';

let endIndex = html.indexOf('.top-nav-spacer');
if (endIndex !== -1) {
    endIndex = html.indexOf('}', endIndex) + 1;
}

if (startIndex !== -1 && endIndex !== -1) {
    const before = html.substring(0, startIndex);
    const after = html.substring(endIndex);
    html = before + cssContent + after;
    console.log('Successfully updated navigation CSS in index.html');
} else {
    console.log('Failed to find CSS block boundaries');
}

// 2. Update Logo DOM
const oldLogoHTML = `      <div class="top-nav-logo">
        <img src="../../assets/images/omnis-logo-white.png" alt="Omnis AI" style="height: 46px; width: auto; object-fit: contain;">
        <span style="color:#f8fafc; font-weight:800; letter-spacing:0.12em; font-size:11.5px; margin-right: 12px; margin-top: 2px; opacity: 0.9;">Fleetrack</span>
      </div>`;

const newLogoHTML = `      <div class="top-nav-logo">
        <img src="../../assets/images/omnis-logo-white.png" alt="Omnis AI" style="height: 28px; width: auto; object-fit: contain;">
        <span style="color:#f8fafc; font-weight:800; letter-spacing:0.15em; font-size:10px; margin-right: 12px; margin-top: 2px; opacity: 0.8;">Fleetrack</span>
      </div>`;

if (html.includes('style="height: 46px; width: auto;')) {
    html = html.replace(oldLogoHTML, newLogoHTML);
    console.log('Successfully updated logo DOM in index.html');
} else {
    console.log('Failed to find logo HTML block');
}

fs.writeFileSync('systems/fleetrack/index.html', html);
