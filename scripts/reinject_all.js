const fs = require('fs');
const path = 'C:/Users/Administrator/omnis/systems/salestrack/index.html';
// Read and normalize line endings to \n
let html = fs.readFileSync(path, 'utf8').replace(/\\r\\n/g, '\\n');

// 1. Fix Deep Linking
const oldDeepLink = \`          if (url && url.includes('omnis://quote/')) {
            const quoteId = url.split('omnis://quote/')[1].replace('/', '').trim();
            if (quoteId && window.salestrack && window.salestrack.openDoc) {
              window.salestrack.openDoc('Quotation', quoteId);
            }
          }\`;
const newDeepLink = \`          if (url && url.includes('omnis://quote/')) {
            const quoteId = url.split('omnis://quote/')[1].replace(/\\//g, '').trim();
            if (quoteId && window.showQuotationOptions) {
              window.showQuotationOptions(quoteId, false);
            }
          }\`;
if (html.includes(oldDeepLink)) {
  html = html.replace(oldDeepLink, newDeepLink);
  console.log("Deep link injected.");
} else {
  console.log("Deep link target NOT found!");
}

// 2. Inject Team Tab Button
const emailRecipientBtn = \`                          <i class="fas fa-envelope"></i> Email Recipients
                        </button>\`;
const teamTabBtn = \`                          <i class="fas fa-envelope"></i> Email Recipients
                        </button>
                        <button onclick="salestrack.setSettingsTab('team')" class="settings-tab-btn" data-tab="team"
                          style="padding:8px 20px; border:none; border-radius:8px; font-size:12px; font-weight:700; cursor:pointer; transition:all 0.3s; background:transparent; color:#64748b; display:flex; align-items:center; gap:8px;">
                          <i class="fas fa-users"></i> Team
                        </button>\`;
if (html.includes(emailRecipientBtn)) {
  html = html.replace(emailRecipientBtn, teamTabBtn);
  console.log("Team Tab Button injected.");
} else {
  console.log("Team Tab Button target NOT found!");
}

// 3. Inject Team Tab Content
const tabContentAnchor = \`<!-- TAB 1: CONNECTIVITY -->\`;
const teamTabContent = \`
                      <!-- TAB: TEAM -->
                      <div id="settings-tab-team" class="settings-tab-content" style="display:none;">
                          <div class="dash-card" style="background: #fff; padding: 30px; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px;">
                                <div>
                                  <h3 style="font-size: 18px; font-weight: 700; color: #1e293b; margin: 0 0 4px 0;">Sales Persons</h3>
                                  <p style="font-size: 13px; color: #64748b; margin: 0;">Manage your team's emails and WhatsApp numbers for automated follow-ups.</p>
                                </div>
                                <button onclick="openAddSalesPersonModal()" class="primary-btn" style="padding: 8px 16px; background: #2563eb; color: #fff; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">
                                  <i class="fas fa-plus"></i> Add Person
                                </button>
                            </div>
                            
                            <div style="overflow-x: auto;">
                              <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left;">
                                <thead>
                                  <tr style="border-bottom: 2px solid #e2e8f0; color: #64748b;">
                                    <th style="padding: 12px; font-weight: 600;">Name</th>
                                    <th style="padding: 12px; font-weight: 600;">Email</th>
                                    <th style="padding: 12px; font-weight: 600;">WhatsApp Number</th>
                                    <th style="padding: 12px; font-weight: 600;">Status</th>
                                    <th style="padding: 12px; font-weight: 600; text-align: right;">Actions</th>
                                  </tr>
                                </thead>
                                <tbody id="sales-persons-table-body">
                                </tbody>
                              </table>
                            </div>
                          </div>
                      </div>
\`;
if (html.includes(tabContentAnchor)) {
  html = html.replace(tabContentAnchor, teamTabContent + '\\n                      ' + tabContentAnchor);
  console.log("Team Tab Content injected.");
} else {
  console.log("Team Tab Content target NOT found!");
}

// 4. Inject Modal HTML
const modalAnchor = \`<!-- --- QUICK ACTION MODALS --- -->\`;
const modalHTML = \`
  <!-- ADD/EDIT SALES PERSON MODAL -->
  <div id="sales-person-modal" class="modal-overlay" style="display:none; position:fixed; inset:0; background:rgba(15,23,42,0.6); z-index:9999; align-items:center; justify-content:center; backdrop-filter:blur(4px);">
    <div style="background:#fff; width:100%; max-width:400px; border-radius:16px; box-shadow:0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04); overflow:hidden;">
      <div style="padding:20px 24px; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center; background:#f8fafc;">
        <h3 id="sp-modal-title" style="margin:0; font-size:16px; font-weight:700; color:#0f172a;">Add Sales Person</h3>
        <button onclick="closeSalesPersonModal()" style="background:transparent; border:none; color:#64748b; cursor:pointer; padding:4px;"><i class="fas fa-times"></i></button>
      </div>
      <div style="padding:24px;">
        <input type="hidden" id="sp-id">
        <div style="margin-bottom:16px;">
          <label style="display:block; font-size:12px; font-weight:600; color:#475569; margin-bottom:6px;">Full Name</label>
          <input type="text" id="sp-name" placeholder="e.g. Antony Dube" style="width:100%; box-sizing:border-box; padding:10px 12px; border:1px solid #cbd5e1; border-radius:8px; font-size:14px; outline:none;">
        </div>
        <div style="margin-bottom:16px;">
          <label style="display:block; font-size:12px; font-weight:600; color:#475569; margin-bottom:6px;">Email Address</label>
          <input type="email" id="sp-email" placeholder="antony@example.com" style="width:100%; box-sizing:border-box; padding:10px 12px; border:1px solid #cbd5e1; border-radius:8px; font-size:14px; outline:none;">
        </div>
        <div style="margin-bottom:16px;">
          <label style="display:block; font-size:12px; font-weight:600; color:#475569; margin-bottom:6px;">WhatsApp Number</label>
          <input type="text" id="sp-phone" placeholder="e.g. 263772000000" style="width:100%; box-sizing:border-box; padding:10px 12px; border:1px solid #cbd5e1; border-radius:8px; font-size:14px; outline:none;">
          <p style="font-size:11px; color:#94a3b8; margin:4px 0 0 0;">Include country code without '+', e.g. 26377...</p>
        </div>
        <div style="margin-bottom:20px;">
          <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
            <input type="checkbox" id="sp-active" checked>
            <span style="font-size:13px; font-weight:600; color:#334155;">Active Account</span>
          </label>
        </div>
        <button onclick="saveSalesPerson()" style="width:100%; padding:12px; background:#2563eb; color:#fff; border:none; border-radius:8px; font-weight:600; font-size:14px; cursor:pointer;">Save Details</button>
      </div>
    </div>
  </div>
\`;
if (html.includes(modalAnchor)) {
  html = html.replace(modalAnchor, modalHTML + '\\n' + modalAnchor);
  console.log("Modal injected.");
} else {
  console.log("Modal anchor NOT found!");
}

// 5. Inject Logic JS (Automation + UI Logic)
const logicAnchor = \`// Load data\`;
const logicJS = \`
        // --- AUTOMATED WHATSAPP DISPATCHER ---
        startWhatsAppAutomatedDispatcher();

// Load data\`;

const logicFuncs = \`
    /* ---------- WHATSAPP AUTOMATION & SALES PERSONS ---------- */
    let ALL_SALES_PERSONS = [];

    async function fetchSalesPersons() {
      try {
        const { data, error } = await window.electron.invoke('supabase:query', {
          table: 'omnis_sales_persons',
          method: 'select',
          params: { columns: '*', order: { column: 'name', ascending: true } }
        });
        if (error) throw error;
        ALL_SALES_PERSONS = data || [];
        renderSalesPersonsTable();
      } catch (err) {
        console.error("Error fetching sales persons:", err);
      }
    }

    function renderSalesPersonsTable() {
      const tbody = document.getElementById('sales-persons-table-body');
      if (!tbody) return;
      tbody.innerHTML = '';
      if (ALL_SALES_PERSONS.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="padding:20px; text-align:center; color:#94a3b8;">No sales persons configured.</td></tr>';
        return;
      }

      ALL_SALES_PERSONS.forEach(sp => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid #f1f5f9';
        
        const statusBadge = sp.is_active 
          ? '<span style="padding:4px 8px; background:#dcfce7; color:#166534; border-radius:12px; font-size:11px; font-weight:600;">Active</span>'
          : '<span style="padding:4px 8px; background:#f1f5f9; color:#64748b; border-radius:12px; font-size:11px; font-weight:600;">Inactive</span>';

        tr.innerHTML = \\\`
          <td style="padding:12px; font-weight:600; color:#1e293b;">\\\${sp.name}</td>
          <td style="padding:12px; color:#475569;">\\\${sp.email || '-'}</td>
          <td style="padding:12px; color:#475569; font-family:monospace;">\\\${sp.whatsapp_number || '-'}</td>
          <td style="padding:12px;">\\\${statusBadge}</td>
          <td style="padding:12px; text-align:right;">
            <button onclick='editSalesPerson(\\\${JSON.stringify(sp).replace(/'/g, "&#39;")})' style="background:transparent; border:none; color:#3b82f6; cursor:pointer; padding:4px 8px;"><i class="fas fa-edit"></i> Edit</button>
          </td>
        \\\`;
        tbody.appendChild(tr);
      });
    }

    function openAddSalesPersonModal() {
      document.getElementById('sp-modal-title').textContent = 'Add Sales Person';
      document.getElementById('sp-id').value = '';
      document.getElementById('sp-name').value = '';
      document.getElementById('sp-email').value = '';
      document.getElementById('sp-phone').value = '';
      document.getElementById('sp-active').checked = true;
      document.getElementById('sales-person-modal').style.display = 'flex';
    }

    function editSalesPerson(sp) {
      document.getElementById('sp-modal-title').textContent = 'Edit Sales Person';
      document.getElementById('sp-id').value = sp.id;
      document.getElementById('sp-name').value = sp.name;
      document.getElementById('sp-email').value = sp.email || '';
      document.getElementById('sp-phone').value = sp.whatsapp_number || '';
      document.getElementById('sp-active').checked = sp.is_active;
      document.getElementById('sales-person-modal').style.display = 'flex';
    }

    function closeSalesPersonModal() {
      document.getElementById('sales-person-modal').style.display = 'none';
    }

    async function saveSalesPerson() {
      const id = document.getElementById('sp-id').value;
      const name = document.getElementById('sp-name').value.trim();
      const email = document.getElementById('sp-email').value.trim();
      const whatsapp_number = document.getElementById('sp-phone').value.trim();
      const is_active = document.getElementById('sp-active').checked;

      if (!name) { omnisAlert('Name is required'); return; }

      const payload = { name, email, whatsapp_number, is_active };
      if (id) payload.id = parseInt(id);

      try {
        const { error } = await window.electron.invoke('supabase:query', {
          table: 'omnis_sales_persons',
          method: 'upsert',
          data: payload
        });
        if (error) throw error;
        omnisAlert('Sales Person saved successfully');
        closeSalesPersonModal();
        fetchSalesPersons();
      } catch (err) {
        console.error("Failed to save sales person", err);
        omnisAlert('Failed to save: ' + err.message);
      }
    }

    function startWhatsAppAutomatedDispatcher() {
      setInterval(async () => {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const todayStr = now.toISOString().split('T')[0];

        if (hours === 8 && minutes === 30) {
          const lastSent = localStorage.getItem('last_whatsapp_dispatch_date');
          if (lastSent !== todayStr) {
             console.log("[WhatsApp Automation] Triggering daily dispatch at 08:30 AM...");
             localStorage.setItem('last_whatsapp_dispatch_date', todayStr);
             await runDailyWhatsAppDispatch(todayStr);
          }
        }
      }, 60000);
    }

    async function runDailyWhatsAppDispatch(todayStr) {
      try {
        const { data: allLifecycles, error } = await window.electron.invoke('supabase:query', {
          table: 'omnis_quote_lifecycle',
          method: 'select',
          params: { columns: '*, frappe_quotation(name, custom_sales_person, company, title)' }
        });
        if (error) throw error;
        
        const dueQuotes = allLifecycles.filter(ql => {
          if (ql.is_closed) return false;
          let due = ql.current_stage === 1 ? ql.stage_1_due : (ql.current_stage === 2 ? ql.stage_2_due : ql.stage_3_due);
          return due <= todayStr;
        });

        if (dueQuotes.length === 0) return;

        const groups = {};
        for (const ql of dueQuotes) {
          const q = ql.frappe_quotation || {};
          const sp = q.custom_sales_person || "Unassigned";
          if (!groups[sp]) groups[sp] = [];
          groups[sp].push(ql);
        }

        for (const [spName, quotes] of Object.entries(groups)) {
          const spObj = ALL_SALES_PERSONS.find(p => p.name === spName && p.is_active);
          const phone = spObj ? spObj.whatsapp_number : null;

          if (!phone || phone === "263772000000") {
            console.warn("[WhatsApp Automation] Missing or default phone number for: " + spName);
            continue;
          }

          let msg = \\\`*Omnis Automated Reminder* \\nHi \\\${spName}, you have *\\\${quotes.length}* quotation(s) that require follow-up today!\\n\\n\\\`;
          quotes.forEach(ql => {
            const q = ql.frappe_quotation;
            msg += \\\`• \\\${q.name} - \\\${q.company}\\n\\\`;
          });
          msg += \\\`\\nPlease check your emails for the clickable deep links to open them instantly.\\n\\n_This is an automated message from the Desktop App._\\\`;

          window.electron.invoke('whatsapp:send-msg', { number: phone, message: msg }).catch(e => {
             console.error(\\\`[WhatsApp Automation] Failed to send to \\\${spName}:\\\`, e);
          });
        }
      } catch (err) {
        console.error("[WhatsApp Automation] Error running dispatch:", err);
      }
    }

    setTimeout(() => fetchSalesPersons(), 2000);
\`;
if (html.includes(logicAnchor)) {
  html = html.replace(logicAnchor, logicJS);
  console.log("Logic injected.");
} else {
  console.log("Logic anchor NOT found!");
}

if (html.includes('</body>')) {
  html = html.replace('</body>', logicFuncs + '\\n</body>');
  console.log("Logic funcs injected.");
}

fs.writeFileSync(path, html);
console.log('Finished operations!');
