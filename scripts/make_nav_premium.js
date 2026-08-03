const fs = require('fs');
const cheerio = require('cheerio');

let html = fs.readFileSync('systems/fleetrack/index.html', 'utf8');

// 1. Update CSS strings
// Header black
html = html.replace('background: rgba(15, 23, 42, 0.8) !important;', 'background: rgba(10, 10, 10, 0.85) !important;');
// Dropdown black
html = html.replace('background: rgba(15, 23, 42, 0.85);', 'background: rgba(10, 10, 10, 0.95);');

// Remove border from triggers and items
html = html.replace('background: rgba(255,255,255,0.04);', 'background: transparent;');
html = html.replace('border: 1px solid rgba(255,255,255,0.06);', 'border: 1px solid transparent;');

// Make the nav item standard font slightly lighter
html = html.replace('color: rgba(241, 245, 249, 0.75);', 'color: rgba(241, 245, 249, 0.65);');
html = html.replace('color: rgba(241, 245, 249, 0.85);', 'color: rgba(241, 245, 249, 0.65);');


// Load into Cheerio to replace icons
const $ = cheerio.load(html);

const icons = {
    dashboard: '<svg class="dd-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>',
    modules: '<svg class="dd-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>',
    reports: '<svg class="dd-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>',
    customer_accounts: '<svg class="dd-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>',
    after_sales: '<svg class="dd-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
    psv_cdv: '<svg class="dd-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color:#e53935;"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect><path d="M9 14h6"></path><path d="M9 18h6"></path><path d="M9 10h6"></path></svg>',
    settings: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="dd-icon"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>',
    logout: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="dd-icon"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>'
};

// 1. Dashboard
let item = $('div[data-view="view-dashboard"]');
item.find('svg.dd-icon').replaceWith(icons.dashboard);

// 2. Modules
item = $('#dd-modules-trigger');
item.find('svg.dd-icon').replaceWith(icons.modules);

// 3. Reports
item = $('#dd-reports-trigger');
item.find('svg.dd-icon').replaceWith(icons.reports);

// 4. Customer Accounts
item = $('#nav-customer-accounts');
item.find('svg.dd-icon').replaceWith(icons.customer_accounts);

// 5. After-Sales Hub
item = $('#nav-aftersales-hub');
item.find('svg.dd-icon').replaceWith(icons.after_sales);

// 6. PSV & CDV Review
item = $('#nav-psv-cdv-queue');
item.find('svg.dd-icon').replaceWith(icons.psv_cdv);

// 7. Settings
item = $('#dd-settings-trigger');
item.find('svg').first().replaceWith(icons.settings);

// 8. Logout
item = $('#nav-logout-custom');
item.find('svg').first().replaceWith(icons.logout);
item.css('background', 'transparent'); // Make logout transparent background too, but keep text red
item.css('border', '1px solid transparent');

fs.writeFileSync('systems/fleetrack/index.html', $.html());
console.log('Successfully applied premium icons and black background.');
