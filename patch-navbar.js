const fs = require('fs');
let content = fs.readFileSync('systems/salestrack/index.html', 'utf8');

// Replace view-marketing querySelector
content = content.replace(
    /document\.querySelector\('\.top-nav-item\[data-view="view-marketing"\]'\)/g,
    'document.querySelector(\'[data-view="view-marketing"]\')'
);

// Add text to Settings and Logout buttons
const targetBtnStr = `    <div class="top-nav-group" style="gap:8px;">
      <div class="top-nav-item nav-item" data-view="view-settings"
        style="padding:8px; border-radius:50%; background:rgba(255,255,255,0.05);">
        <span class="icon" style="margin:0; font-size:13px; width:auto;"><i class="fas fa-cog"></i></span>
      </div>
      <div class="top-nav-item" onclick="logout()"
        style="color: #f87171; padding:8px; border-radius:50%; background:rgba(248,113,113,0.1);">
        <span class="icon" style="margin:0; font-size:13px; width:auto;"><i class="fas fa-sign-out-alt"></i></span>
      </div>
    </div>`;

const replaceBtnStr = `    <div class="top-nav-group" style="gap:8px;">
      <div class="top-nav-item nav-item" data-view="view-settings"
        style="padding:6px 12px; border-radius:8px; background:rgba(255,255,255,0.05);">
        <span class="icon" style="margin:0; font-size:13px; width:auto;"><i class="fas fa-cog"></i></span>
        <span>Settings</span>
      </div>
      <div class="top-nav-item" onclick="logout()"
        style="color: #f87171; padding:6px 12px; border-radius:8px; background:rgba(248,113,113,0.1);">
        <span class="icon" style="margin:0; font-size:13px; width:auto;"><i class="fas fa-sign-out-alt"></i></span>
        <span>Logout</span>
      </div>
    </div>`;

// Regex replacement for buttons ignoring whitespace
content = content.replace(
    /<div class="top-nav-group" style="gap:8px;">[\s\S]*?<div class="top-nav-item nav-item" data-view="view-settings"[\s\S]*?<\/div>[\s\S]*?<\/div>/,
    replaceBtnStr
);

// Grouping HTML using regex to avoid whitespace issues
const startRegex = /<!-- Tenders & Projects Section -->/;
const endRegex = /<div class="top-nav-spacer"><\/div>/;

const startMatch = content.match(startRegex);
const endMatch = content.match(endRegex);

if (startMatch && endMatch) {
    const startIndex = startMatch.index;
    const endIndex = endMatch.index;
    
    if (startIndex < endIndex) {
        const replacementHtml = `      <!-- Sales Dropdown -->
      <div class="top-nav-dropdown">
        <div class="top-nav-item top-nav-dropdown-trigger" id="dd-sales-trigger">
          <span class="icon"><i class="fas fa-briefcase"></i></span>
          <span>Sales</span>
          <i class="fas fa-chevron-down" style="font-size:8px; margin-left:2px; opacity:0.6;"></i>
        </div>
        <div class="top-nav-dropdown-menu" id="dd-sales-menu">
          <div class="top-nav-dropdown-item" data-view="view-quotations-list">
            <i class="fas fa-file-alt"></i> Quotations
          </div>
          <div class="top-nav-dropdown-item" data-view="view-ce-list">
            <i class="fas fa-inbox"></i> Enquiries
          </div>
          <div class="top-nav-dropdown-item" data-view="view-tenders">
            <i class="fas fa-project-diagram"></i> Tenders
          </div>
        </div>
      </div>

    </div>

    <div class="top-nav-group" style="margin-left: 6px; padding-left: 6px; border-left: 1px solid rgba(255,255,255,0.1);">

      <!-- Tools Dropdown -->
      <div class="top-nav-dropdown">
        <div class="top-nav-item top-nav-dropdown-trigger" id="dd-tools-trigger">
          <span class="icon"><i class="fas fa-toolbox"></i></span>
          <span>Tools</span>
          <i class="fas fa-chevron-down" style="font-size:8px; margin-left:2px; opacity:0.6;"></i>
        </div>
        <div class="top-nav-dropdown-menu" id="dd-tools-menu">
          <div class="top-nav-dropdown-item" data-view="view-marketing">
            <i class="fas fa-bullhorn"></i> Marketing
          </div>
          <div class="top-nav-dropdown-item" data-view="view-certificates">
            <i class="fas fa-certificate"></i> Certificates
          </div>
          <div class="top-nav-dropdown-item" data-view="view-command-center">
            <i class="fas fa-terminal"></i> Command
          </div>
        </div>
      </div>
    </div>

    `;
        
        content = content.substring(0, startIndex) + replacementHtml + content.substring(endIndex);
        console.log("Successfully replaced the HTML block.");
    }
} else {
    console.log("Could not find start or end block.");
}

// Add CSS media query for responsiveness if not already added
if (!content.includes('@media (max-width: 1200px) {\\n      .top-nav {')) {
    const cssRegex = /\.top-nav-item\.active \{/;
    const cssInsert = `@media (max-width: 1200px) {
      .top-nav {
        overflow-x: auto;
        overflow-y: hidden;
        justify-content: flex-start;
      }
      .top-nav::-webkit-scrollbar {
        height: 4px;
      }
      .top-nav::-webkit-scrollbar-thumb {
        background: rgba(255,255,255,0.2);
        border-radius: 4px;
      }
      .top-nav-spacer {
         min-width: 20px;
      }
    }

    .top-nav-item.active {`;
    content = content.replace(cssRegex, cssInsert);
}

fs.writeFileSync('systems/salestrack/index.html', content);
console.log('Done writing to file.');
