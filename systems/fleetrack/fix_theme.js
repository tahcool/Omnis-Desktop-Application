const fs = require('fs');
let c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');

// Fix 1: Customers table header from dark slate to fleetrack red
c = c.replace(
  '<tr style="background:#0f172a;color:white;">',
  '<tr style="background:#f02510;color:#ffffff !important;">'
);

// Fix 2: Service Due table header from purple to fleetrack red
c = c.replace(
  '<tr style="background:#7c3aed;color:white;">',
  '<tr style="background:#f02510;color:#ffffff !important;">'
);

// Fix 3: Service Due Refresh button from purple to fleetrack red
c = c.replace(
  'onclick="loadServiceDueView()" style="padding:7px 14px;background:#7c3aed;color:white;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;">⟳ Refresh</button>',
  'onclick="loadServiceDueView()" style="padding:7px 14px;background:#f02510;color:white;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;">⟳ Refresh</button>'
);

// Fix 4: Service Due KPI "Refresh" button in action mapping
c = c.replace(
  "action: () => window.loadServiceDueView && window.loadServiceDueView(),",
  "action: () => window.loadServiceDueView && window.loadServiceDueView(),"
); // no change needed there

// Fix 5: Service Due row action "Service" button from purple to red
c = c.replace(
  'style="font-size:9px;font-weight:700;padding:3px 9px;border:none;background:#7c3aed;color:white;border-radius:5px;cursor:pointer;margin-right:4px;">🔧 Service</button>',
  'style="font-size:9px;font-weight:700;padding:3px 9px;border:none;background:#f02510;color:white;border-radius:5px;cursor:pointer;margin-right:4px;">🔧 Service</button>'
);

// Fix 6: Customers "New Customer" button from green to a consistent accent (keep green as add-action)
// Already green, leave it

// Fix 7: Fix view-customers & view-service-due to use class view-page properly (full width)
// The issue is the sidebar is still showing next to it — the view-page needs to take full scroll area
// Add width:100% and box-sizing to the outer div of both views
c = c.replace(
  '<div id="view-service-due" class="view-page hidden">',
  '<div id="view-service-due" class="view-page hidden" style="width:100%;box-sizing:border-box;">'
);
c = c.replace(
  '<div id="view-customers" class="view-page hidden">',
  '<div id="view-customers" class="view-page hidden" style="width:100%;box-sizing:border-box;">'
);

fs.writeFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html', c, 'utf8');
console.log('Patched OK');
