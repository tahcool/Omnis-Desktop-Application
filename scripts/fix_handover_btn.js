const fs = require('fs');
let htmlPath = 'systems/salestrack/index.html';
let content = fs.readFileSync(htmlPath, 'utf8');

// 1. Remove incorrect insertion
const wrongTarget = `        <div style="display:flex; align-items:center; gap:12px;">
          <button onclick="window.openNewAftersalesForm()" style="height:42px; padding:0 16px; background:#1e293b; color:white; border:none; border-radius:10px; font-size:13px; font-weight:700; cursor:pointer; box-shadow:0 4px 6px -1px rgba(0,0,0,0.1); display:flex; align-items:center; gap:8px; transition:background 0.2s;" onmouseover="this.style.background='#334155'" onmouseout="this.style.background='#1e293b'">
            <i class="fas fa-plus"></i> New Handover
          </button>
          <div style="position:relative;">
            <i class="fas fa-search" style="position:absolute; left:14px; top:50%; transform:translateY(-50%); color:#94a3b8; font-size:12px;"></i>
            <input id="product-list-search" type="text" placeholder="Search catalog..."`;

const wrongReplace = `        <div style="display:flex; align-items:center; gap:12px;">
          <div style="position:relative;">
            <i class="fas fa-search" style="position:absolute; left:14px; top:50%; transform:translateY(-50%); color:#94a3b8; font-size:12px;"></i>
            <input id="product-list-search" type="text" placeholder="Search catalog..."`;

content = content.replace(wrongTarget, wrongReplace);

// 2. Add correct insertion
const correctTarget = `          </div>
          <div style="position:relative; width: 250px;">
            <i class="fas fa-search" style="position:absolute; left:14px; top:50%; transform:translateY(-50%); color:#94a3b8; font-size:12px;"></i>
            <input id="aftersales-search" class="form-input" placeholder="Search aftersales records..."`;

const correctReplace = `          </div>
          <button onclick="window.openNewAftersalesForm()" style="height:42px; padding:0 16px; background:#1e293b; color:white; border:none; border-radius:10px; font-size:13px; font-weight:700; cursor:pointer; box-shadow:0 4px 6px -1px rgba(0,0,0,0.1); display:flex; align-items:center; gap:8px; transition:background 0.2s;" onmouseover="this.style.background='#334155'" onmouseout="this.style.background='#1e293b'">
            <i class="fas fa-plus"></i> New Handover
          </button>
          <div style="position:relative; width: 250px;">
            <i class="fas fa-search" style="position:absolute; left:14px; top:50%; transform:translateY(-50%); color:#94a3b8; font-size:12px;"></i>
            <input id="aftersales-search" class="form-input" placeholder="Search aftersales records..."`;

content = content.replace(correctTarget, correctReplace);

fs.writeFileSync(htmlPath, content);
console.log('Fixed New Handover Button placement');
