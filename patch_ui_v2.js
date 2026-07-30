const fs = require('fs');

let html = fs.readFileSync('systems/fleetrack/index.html', 'utf8');

// 1. Add "Technicians" dropdown item
const dropdownTarget = `            <div class="top-nav-dropdown-item" data-view="view-fsi" onclick="showView('view-fsi');closeAllDropdowns();"`;
const dropdownInsert = `            <div class="top-nav-dropdown-item" data-view="view-technicians" onclick="showView('view-technicians');closeAllDropdowns();"
              title="Manage FT Technicians and view their activity.">
              <svg class="dd-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
              FT Technicians
            </div>
            <div class="top-nav-dropdown-item" data-view="view-fsi" onclick="showView('view-fsi');closeAllDropdowns();"`;
if (!html.includes('data-view="view-technicians"')) {
    html = html.replace(dropdownTarget, dropdownInsert);
}

// 2. Add view-technicians container near view-machines
const viewMachinesTarget = `<div id="view-machines" class="view-page hidden">`;
const viewTechniciansInsert = `<div id="view-technicians" class="view-page hidden">
        <div style="background:var(--bg-card);border-radius:16px;padding:24px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
            <h2 class="view-title" style="margin:0;">FT Technicians</h2>
            <button class="btn btn-primary" onclick="openAddTechnicianModal('')">+ Add Technician</button>
          </div>
          <div style="margin-bottom:16px;">
            <input type="text" id="tech-search-input" placeholder="Search technicians..." class="form-input" style="max-width:300px;" oninput="renderTechniciansView()">
          </div>
          <div style="overflow-x:auto;">
            <table class="report-table" style="width:100%; border-collapse:collapse;">
              <thead>
                <tr style="background:#f8fafc; border-bottom:1px solid #e2e8f0; text-align:left;">
                  <th style="padding:12px; font-weight:600; color:#475569; font-size:12px;">NAME</th>
                  <th style="padding:12px; font-weight:600; color:#475569; font-size:12px;">PHONE</th>
                  <th style="padding:12px; font-weight:600; color:#475569; font-size:12px;">DESIGNATION</th>
                  <th style="padding:12px; font-weight:600; color:#475569; font-size:12px;">SITE</th>
                  <th style="padding:12px; font-weight:600; color:#475569; font-size:12px;">STATUS</th>
                </tr>
              </thead>
              <tbody id="technicians-table-body">
                <tr><td colspan="5" style="text-align:center; padding:20px; color:#94a3b8;">Loading...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div id="view-machines" class="view-page hidden">`;
if (!html.includes('<div id="view-technicians"')) {
    html = html.replace(viewMachinesTarget, viewTechniciansInsert);
}

// 3. Add modal-add-technician HTML near modal-fsp-new
const modalTarget = `<!-- FSP NEW MODAL -->`;
const modalInsert = `<!-- ADD TECHNICIAN MODAL -->
      <div id="modal-add-technician" class="modal-overlay hidden" style="backdrop-filter: blur(12px); background: rgba(15,23,42,0.85); z-index: 3100;">
        <div class="modal-card" style="width: 95%; max-width:400px; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);">
          <div class="modal-header">
            <div class="modal-title">Add Technician</div>
            <button class="modal-close" onclick="closeAddTechnicianModal()">x</button>
          </div>
          <div class="modal-body">
            <div class="form-group" style="margin-bottom:16px;">
              <label class="form-label" style="display:block;margin-bottom:8px;font-size:12px;font-weight:700;">Full Name</label>
              <input type="text" id="new-tech-name" class="form-input" placeholder="e.g. John Doe">
            </div>
            <div class="form-group" style="margin-bottom:16px;">
              <label class="form-label" style="display:block;margin-bottom:8px;font-size:12px;font-weight:700;">Mobile Phone</label>
              <input type="text" id="new-tech-phone" class="form-input" placeholder="+263...">
            </div>
            <div class="form-group" style="margin-bottom:16px;">
              <label class="form-label" style="display:block;margin-bottom:8px;font-size:12px;font-weight:700;">Designation</label>
              <input type="text" id="new-tech-designation" class="form-input" placeholder="e.g. Diesel Plant Fitter">
            </div>
            <div class="form-group" style="margin-bottom:16px;">
              <label class="form-label" style="display:block;margin-bottom:8px;font-size:12px;font-weight:700;">Site</label>
              <input type="text" id="new-tech-site" class="form-input" placeholder="e.g. Hwange">
            </div>
          </div>
          <div class="modal-footer" style="padding:16px 24px; border-top:1px solid #e2e8f0; display:flex; justify-content:flex-end; gap:12px; background:#f8fafc; border-radius:0 0 16px 16px;">
            <button class="btn btn-secondary" onclick="closeAddTechnicianModal()">Cancel</button>
            <button class="btn btn-primary" onclick="saveNewTechnician()" id="btn-save-tech">Save Technician</button>
          </div>
        </div>
      </div>
      <!-- FSP NEW MODAL -->`;
if (!html.includes('<div id="modal-add-technician"')) {
    html = html.replace(modalTarget, modalInsert);
}

// 4. Add JS logic
const jsTarget = `    // --- FSP MODAL LOGIC ---`;
const jsInsert = `    // --- TECHNICIANS LOGIC ---
    async function loadTechniciansView() {
      const tbody = document.getElementById('technicians-table-body');
      if(tbody) tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px; color:#94a3b8;">Loading...</td></tr>';
      await fetchTechnicians();
      renderTechniciansView();
    }
    
    function renderTechniciansView() {
      const tbody = document.getElementById('technicians-table-body');
      if(!tbody) return;
      const q = (document.getElementById('tech-search-input')?.value || '').toLowerCase().trim();
      let techs = FT_TECH_CACHE.data || [];
      if(q) techs = techs.filter(t => (t.full_name||t.frappe_name||t.name||'').toLowerCase().includes(q));
      
      if(techs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px; color:#94a3b8;">No technicians found</td></tr>';
        return;
      }
      
      tbody.innerHTML = techs.map(t => \`
        <tr style="border-bottom:1px solid #f1f5f9;">
          <td style="padding:12px; font-weight:600; color:#1e293b; font-size:13px;">\${t.full_name||t.frappe_name||t.name||''}</td>
          <td style="padding:12px; color:#64748b; font-size:13px;">\${t.mobile_phone||t.mobile_no||''}</td>
          <td style="padding:12px; color:#64748b; font-size:13px;">\${t.designation||''}</td>
          <td style="padding:12px; color:#64748b; font-size:13px;">\${t.site||''}</td>
          <td style="padding:12px;"><span style="display:inline-block; padding:4px 8px; background:\${t.status==='Active'?'#dcfce7':'#f1f5f9'}; color:\${t.status==='Active'?'#166534':'#64748b'}; border-radius:12px; font-size:11px; font-weight:700;">\${t.status||'Active'}</span></td>
        </tr>
      \`).join('');
    }

    function openAddTechnicianModal(initialName = '') {
      document.getElementById('new-tech-name').value = initialName;
      document.getElementById('new-tech-phone').value = '';
      document.getElementById('new-tech-designation').value = '';
      document.getElementById('new-tech-site').value = '';
      document.getElementById('modal-add-technician').classList.remove('hidden');
    }

    function closeAddTechnicianModal() {
      document.getElementById('modal-add-technician').classList.add('hidden');
    }

    async function saveNewTechnician() {
      const name = document.getElementById('new-tech-name').value.trim();
      if(!name) return alert('Name is required');
      
      const btn = document.getElementById('btn-save-tech');
      btn.innerText = 'Saving...';
      btn.disabled = true;
      
      try {
        const payload = {
          full_name: name,
          mobile_phone: document.getElementById('new-tech-phone').value.trim(),
          designation: document.getElementById('new-tech-designation').value.trim(),
          site: document.getElementById('new-tech-site').value.trim(),
          status: 'Active'
        };
        
        await supaQuery('ft_technicians', 'insert', [payload]);
        
        // Bust cache
        FT_TECH_CACHE.ts = 0;
        await fetchTechnicians();
        
        closeAddTechnicianModal();
        if(document.getElementById('view-technicians') && !document.getElementById('view-technicians').classList.contains('hidden')) {
          renderTechniciansView();
        } else {
          // If called from FSP modal, auto-select it
          const searchInput = document.getElementById('fsp-new-technician-search');
          if(searchInput) {
            searchInput.value = name;
            document.getElementById('fsp-new-technician').value = name;
            const drop = document.getElementById('fsp-tech-drop-new');
            if(drop) drop.style.display = 'none';
          }
        }
      } catch (e) {
        console.error(e);
        alert('Failed to save technician');
      } finally {
        btn.innerText = 'Save Technician';
        btn.disabled = false;
      }
    }

    // --- FSP MODAL LOGIC ---`;
if (!html.includes('loadTechniciansView()')) {
    html = html.replace(jsTarget, jsInsert);
}

// 5. Add to showView routing
const routingTarget = `if (viewId === 'view-machines')        loadFtMachineRegister();`;
const routingInsert = `if (viewId === 'view-machines')        loadFtMachineRegister();
        if (viewId === 'view-technicians')     loadTechniciansView();`;
if (!html.includes(`loadTechniciansView();`)) {
    html = html.replace(routingTarget, routingInsert);
}

// 6. Register view elements
const viewRegTarget = `const viewMachines = document.getElementById("view-machines");`;
const viewRegInsert = `const viewMachines = document.getElementById("view-machines");
    const viewTechnicians = document.getElementById("view-technicians");`;
if (!html.includes(`document.getElementById("view-technicians");`)) {
    html = html.replace(viewRegTarget, viewRegInsert);
}

const viewArrTarget = `"view-machines": {`;
const viewArrInsert = `"view-technicians": { el: viewTechnicians, title: "FT Technicians" },
        "view-machines": {`;
if (!html.includes(`"view-technicians": {`)) {
    html = html.replace(viewArrTarget, viewArrInsert);
}

fs.writeFileSync('systems/fleetrack/index.html', html);
console.log("All missing patches applied successfully!");
