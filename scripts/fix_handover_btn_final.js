const fs = require('fs');
let content = fs.readFileSync('systems/salestrack/index.html', 'utf8');

// The issue is that the replacement is going into the WRONG PLACE near product-list-search.
// Let's remove ALL instances of the button first.
const buttonString = `          <button onclick="window.openNewAftersalesForm()" style="height:42px; padding:0 16px; background:#1e293b; color:white; border:none; border-radius:10px; font-size:13px; font-weight:700; cursor:pointer; box-shadow:0 4px 6px -1px rgba(0,0,0,0.1); display:flex; align-items:center; gap:8px; transition:background 0.2s;" onmouseover="this.style.background='#334155'" onmouseout="this.style.background='#1e293b'">
            <i class="fas fa-plus"></i> New Handover
          </button>
`;

let cleaned = content.split(buttonString).join('');

// Now let's find the Exact Aftersales Search input line
// We know it has: <input id="aftersales-search" class="form-input" placeholder="Search aftersales records..."

const searchInputString = `            <input id="aftersales-search"`;

const replacementString = `            <button onclick="window.openNewAftersalesForm()" style="height:42px; padding:0 16px; background:#1e293b; color:white; border:none; border-radius:10px; font-size:13px; font-weight:700; cursor:pointer; box-shadow:0 4px 6px -1px rgba(0,0,0,0.1); display:flex; align-items:center; gap:8px; transition:background 0.2s;" onmouseover="this.style.background='#334155'" onmouseout="this.style.background='#1e293b'">
              <i class="fas fa-plus"></i> New Handover
            </button>
            <div style="position:relative; width: 250px;">
              <i class="fas fa-search" style="position:absolute; left:14px; top:50%; transform:translateY(-50%); color:#94a3b8; font-size:12px;"></i>
              <input id="aftersales-search"`;

// Wait, I need to replace the div BEFORE it. Let's do it using regex.
cleaned = cleaned.replace(/<div style="position:relative; width: 250px;">\s*<i class="fas fa-search"[^>]*><\/i>\s*<input id="aftersales-search"/, (match) => {
    return `<button onclick="window.openNewAftersalesForm()" style="height:42px; padding:0 16px; background:#1e293b; color:white; border:none; border-radius:10px; font-size:13px; font-weight:700; cursor:pointer; box-shadow:0 4px 6px -1px rgba(0,0,0,0.1); display:flex; align-items:center; gap:8px; transition:background 0.2s; margin-right:8px;" onmouseover="this.style.background='#334155'" onmouseout="this.style.background='#1e293b'">
              <i class="fas fa-plus"></i> New Handover
            </button>
            ` + match;
});

fs.writeFileSync('systems/salestrack/index.html', cleaned);
console.log('Done replacement');
