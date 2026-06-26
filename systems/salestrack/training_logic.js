let rawTrainingMachines = [];

window.loadTrainingList = async function(forceRefresh = false) {
    if (!window.electron || !window.electron.invoke) {
        setTimeout(() => window.loadTrainingList(forceRefresh), 500);
        return;
    }
    
    document.getElementById('training-list-body').innerHTML = `
        <div style="text-align:center; padding:40px; color:#94a3b8; font-style:italic;">
            <i class="fas fa-spinner fa-spin" style="margin-right:8px;"></i> Fetching training records...
        </div>
    `;

    try {
        const res = await window.electron.invoke('supabase:query', {
            table: 'frappe_fmb_report_machine',
            method: 'select',
            params: { columns: '*' }
        });

        if (!res.ok) throw new Error(res.error || "Machine fetch failed");
        
        const machines = res.data || [];

        // Auto-detect field names from first record to be schema-agnostic
        const sample = machines[0] || {};
        const ITEM_COL    = ['item_name','item','oem','model','description'].find(c => c in sample) || 'item';
        const SERIAL_COL  = ['machine_id','serial_no','serial','serial_number'].find(c => c in sample) || 'machine_id';
        const PARENT_COL  = ['parent','report_id','fmb_report','report'].find(c => c in sample) || 'parent';
        const ID_COL      = ['name','id'].find(c => c in sample) || 'name';

        console.log('[Training] Detected columns:', { ITEM_COL, SERIAL_COL, PARENT_COL, ID_COL });
        
        const trainingMachines = machines.filter(m => {
            if (m.training_date) return true;
            const pt = m.people_trained;
            if (pt && pt !== '[]' && pt !== null) return true;
            try {
                const tasks = typeof m.tasks === 'string' ? JSON.parse(m.tasks) : (m.tasks || {});
                return tasks.training === true;
            } catch(e) { return false; }
        });
        
        // Fetch parent reports
        const fmRes = await window.electron.invoke('supabase:query', {
            table: 'frappe_fmb_report',
            method: 'select',
            params: { columns: '*' }
        });
        
        let reportsMap = {};
        if (fmRes.ok && fmRes.data) {
            fmRes.data.forEach(r => {
                reportsMap[r.name] = r;
            });
        }
        
        rawTrainingMachines = trainingMachines.map(m => {
            const parentKey = m[PARENT_COL];
            return {
                ...m,
                id:         m[ID_COL],
                report_id:  parentKey,
                item_name:  m[ITEM_COL]   || '',
                machine_id: m[SERIAL_COL] || '',
                frappe_fmb_report: reportsMap[parentKey] || null
            };
        });

        window.renderTrainingGrid();
    } catch (err) {
        console.error("Error loading training list:", err);
        document.getElementById('training-list-body').innerHTML = `
            <div style="text-align:center; padding:40px; color:#ef4444; font-weight:600;">
                <i class="fas fa-exclamation-triangle"></i> Error loading records
            </div>
        `;
    }
};

window.renderTrainingGrid = function() {
    const searchEl = document.getElementById('training-search');
    const tbody = document.getElementById('training-list-body');
    if (!searchEl || !tbody) return; // view not currently visible
    const search = (searchEl.value || '').toLowerCase();
    
    const filtered = rawTrainingMachines.filter(m => {
        const cust = m.frappe_fmb_report?.customer?.toLowerCase() || '';
        const item = m.item_name?.toLowerCase() || '';
        const mach = m.machine_id?.toLowerCase() || '';
        return cust.includes(search) || item.includes(search) || mach.includes(search);
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<div style="text-align:center; padding: 40px; color: #94a3b8; font-style: italic;">No training records found.</div>`;
        return;
    }

    filtered.sort((a, b) => {
        if (!a.training_date) return 1;
        if (!b.training_date) return -1;
        return new Date(b.training_date) - new Date(a.training_date);
    });

    tbody.innerHTML = filtered.map(m => {
        const customer = m.frappe_fmb_report?.customer || 'Unknown Customer';
        const item = m.item_name || 'Unknown Model';
        const serial = m.machine_id ? `S/N: ${m.machine_id}` : 'No Serial';
        const dateStr = m.training_date ? new Date(m.training_date).toLocaleDateString() : '<span style="color:#f59e0b; font-weight:600;">Not Scheduled</span>';
        
        let peopleStr = "";
        let peopleCount = 0;
        try {
            const arr = typeof m.people_trained === 'string' ? JSON.parse(m.people_trained) : m.people_trained;
            if (Array.isArray(arr) && arr.length > 0) {
                peopleCount = arr.length;
                peopleStr = `<div style="font-size:11px; color:#475569; display:inline-block; background:#e2e8f0; padding:2px 6px; border-radius:4px; font-weight:600;">${peopleCount} Trained</div>`;
            } else {
                peopleStr = `<div style="font-size:11px; color:#94a3b8; font-style:italic;">No operators added</div>`;
            }
        } catch(e) {}

        return `
            <div class="ai-order-row ai-sales-grid" style="grid-template-columns: 2fr 1.5fr 1fr 2fr 1fr; background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; align-items: center; margin-bottom: 8px;">
                <div style="font-weight: 700; color: #1e293b; font-size: 13px;">
                    ${customer}<br>
                    <span style="font-size: 10px; color: #64748b; font-weight: 500;">Order: ${m.report_id}</span>
                </div>
                <div>
                    <div style="font-weight: 600; font-size: 13px; color: #334155;">${item}</div>
                    <div style="font-size: 11px; color: #64748b;">${serial}</div>
                </div>
                <div style="font-size: 13px; color: #0f172a;">${dateStr}</div>
                <div>${peopleStr}</div>
                <div style="display:flex; justify-content:flex-end; gap:8px;">
                    <button onclick="editTrainingDetails('${m.report_id}', '${m.machine_id || m.name}')" style="background:#f1f5f9; border:1px solid #cbd5e1; border-radius:6px; padding:6px 12px; font-size:11px; font-weight:700; color:#334155; cursor:pointer; transition:0.2s;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    ${peopleCount > 0 ? `
                    <button onclick="printCertsFromTraining('${m.report_id}', '${m.machine_id || m.name}')" style="background:#10b981; border:none; border-radius:6px; padding:6px 12px; font-size:11px; font-weight:700; color:white; cursor:pointer; transition:0.2s; box-shadow:0 2px 4px rgba(16,185,129,0.2);" onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform='none'">
                        <i class="fas fa-print"></i> Print
                    </button>` : ''}
                </div>
            </div>
        `;
    }).join('');
};

window.editTrainingDetails = function(reportId, machineId) {
    const m = rawTrainingMachines.find(x =>
        x.report_id === reportId && (x.machine_id === machineId || x.name === machineId || x.id === machineId)
    );
    if (!m) return _certToast('Record not found.', 'error');

    // Store the record ID so Save & Print targets the right row
    _certSelectedName     = m.id || m.name || null;
    _certSelectedReportId = m.report_id || null;

    window.openCreateCertModal({
        model:  m.item_name    || '',
        serial: m.machine_id   || '',
        date:   m.training_date || '',
        people: m.people_trained || '[]'
    });
};


window.printCertsFromTraining = function(reportId, machineId) {
    const m = rawTrainingMachines.find(x =>
        x.report_id === reportId && (x.machine_id === machineId || x.name === machineId || x.id === machineId)
    );
    if (!m) return;

    if (!m.people_trained) return _certToast('No operators trained on this machine yet.', 'error');
    if (!m.training_date)  return _certToast('Please set a training date before printing.', 'error');

    let attendees = [];
    try {
        attendees = typeof m.people_trained === 'string' ? JSON.parse(m.people_trained) : m.people_trained;
    } catch(e) {}

    if (!Array.isArray(attendees) || attendees.length === 0)
        return _certToast('No operators trained on this machine yet.', 'error');

    _printCertificates(m.item_name || '', m.machine_id || '', m.training_date, attendees);
};


document.addEventListener('DOMContentLoaded', () => {
    document.body.addEventListener('click', (e) => {
        const navItem = e.target.closest('.nav-item, .top-nav-item, .top-nav-dropdown-item');
        if (navItem && navItem.getAttribute('data-view') === 'view-training') {
            // Only load if the view is actually being shown (not a phantom bubble)
            const view = document.getElementById('view-training');
            const isVisible = view && view.style.display !== 'none' && !view.classList.contains('hidden');
            if (isVisible && window.loadTrainingList) window.loadTrainingList();
        }
    });

    // Close modal on backdrop click
    const modal = document.getElementById('cert-create-modal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) window.closeCreateCertModal();
        });
    }

    // Live operator count
    const opTextarea = document.getElementById('cert-operators');
    if (opTextarea) {
        opTextarea.addEventListener('input', () => {
            const lines = opTextarea.value.split('\n').filter(l => l.trim() !== '');
            const countEl = document.getElementById('cert-operator-count');
            if (countEl) {
                countEl.textContent = lines.length > 0 ? `${lines.length} operator${lines.length > 1 ? 's' : ''} will receive a certificate` : '';
            }
        });
    }
});

// ─── MACHINE SEARCH CACHE & LOGIC ────────────────────────────────────────────

let _certMachineCache    = null;  // [{model, serial, name}]
let _certSelectedName    = null;  // frappe_fmb_report_machine.name of chosen record
let _certSelectedReportId = null; // parent report_id of chosen record

async function _loadMachineCache() {
    if (_certMachineCache) return _certMachineCache;
    try {
        const res = await window.electron.invoke('supabase:query', {
            table: 'frappe_fmb_report_machine',
            method: 'select',
            params: { columns: '*' }
        });
        if (!res.ok) return [];
        const sample = (res.data || [])[0] || {};
        const ITEM_COL   = ['item_name','item','oem','model','description'].find(c => c in sample) || 'item';
        const SERIAL_COL = ['machine_id','serial_no','serial','serial_number'].find(c => c in sample) || 'machine_id';

        const PARENT_COL = ['parent','report_id','fmb_report','report'].find(c => c in sample) || 'parent';
        const ID_COL     = ['name','id'].find(c => c in sample) || 'name';

        // Deduplicate to only list general machine models, not individual purchases
        const allMachines = (res.data || []).map(m => ({
            name:     m[ID_COL]     || '',
            model:    (m[ITEM_COL]  || '').trim(),
            serial:   '', // Strip serial for manual entry so it remains general
            reportId: m[PARENT_COL] || ''
        })).filter(m => m.model);

        const uniqueModels = new Map();
        for (const m of allMachines) {
            if (!uniqueModels.has(m.model)) {
                uniqueModels.set(m.model, m);
            }
        }

        _certMachineCache = Array.from(uniqueModels.values());
        _certMachineCache.sort((a, b) => a.model.localeCompare(b.model));
        return _certMachineCache;
    } catch(e) {
        console.error('[CertSearch] Failed to load machines:', e);
        return [];
    }
}

window.certMachineSearch = async function(query) {
    const dropdown = document.getElementById('cert-machine-dropdown');
    if (!dropdown) return;

    const machines = await _loadMachineCache();
    const q = (query || '').toLowerCase().trim();

    const matches = q.length === 0
        ? machines.slice(0, 50)
        : machines.filter(m => m.model.toLowerCase().includes(q)).slice(0, 50);

    if (matches.length === 0) {
        dropdown.innerHTML = `<div style="padding:12px 16px; color:#94a3b8; font-size:13px; font-style:italic;">No machines found</div>`;
        dropdown.style.display = 'block';
        return;
    }

    dropdown.innerHTML = matches.map(m => `
        <div
            onmousedown="window.certMachineSelect(${JSON.stringify(m.name).replace(/"/g,'&quot;')}, ${JSON.stringify(m.model).replace(/"/g,'&quot;')}, '', ${JSON.stringify(m.reportId).replace(/"/g,'&quot;')})"
            style="padding:10px 16px; cursor:pointer; font-size:13px; font-weight:600; color:#1e293b; display:flex; justify-content:space-between; align-items:center; transition:background 0.1s;"
            onmouseover="this.style.background='#f5f3ff'"
            onmouseout="this.style.background='transparent'">
            <span><i class="fas fa-cog" style="color:#7c3aed; margin-right:8px; font-size:11px;"></i>${m.model}</span>
        </div>
    `).join('');
    dropdown.style.display = 'block';
};

window.certMachineSelect = function(name, model, serial, reportId) {
    _certSelectedName     = name     || null;
    _certSelectedReportId = reportId || null;
    const inp = document.getElementById('cert-machine-model');
    if (inp) { inp.value = model; inp.style.borderColor = '#7c3aed'; }
    const ser = document.getElementById('cert-machine-serial');
    if (ser) ser.value = serial || '';
    const dd = document.getElementById('cert-machine-dropdown');
    if (dd) dd.style.display = 'none';
    // Focus date next
    const dateEl = document.getElementById('cert-training-date');
    if (dateEl) setTimeout(() => dateEl.focus(), 50);
};

// ─── MODAL OPEN / CLOSE ───────────────────────────────────────────────────────

window.openCreateCertModal = function(prefill = {}) {
    const modal = document.getElementById('cert-create-modal');
    if (!modal) return;

    // Refresh machine cache and reset selection each time modal opens
    _certMachineCache     = null;
    _certSelectedName     = null;
    _certSelectedReportId = null;

    // Pre-fill from a row if called from the "Print" button
    if (prefill.model)   document.getElementById('cert-machine-model').value  = prefill.model;
    if (prefill.serial)  document.getElementById('cert-machine-serial').value = prefill.serial;
    if (prefill.date)    document.getElementById('cert-training-date').value   = prefill.date;
    if (prefill.people) {
        let lines = [];
        try {
            const arr = typeof prefill.people === 'string' ? JSON.parse(prefill.people) : prefill.people;
            if (Array.isArray(arr)) {
                lines = arr.map(p => typeof p === 'object' ? `${p.id ? p.id + ' - ' : ''}${p.name || p}` : String(p));
            }
        } catch(e) { lines = []; }
        document.getElementById('cert-operators').value = lines.join('\n');
        const countEl = document.getElementById('cert-operator-count');
        if (countEl) countEl.textContent = lines.length > 0 ? `${lines.length} operator${lines.length > 1 ? 's' : ''} will receive a certificate` : '';
    }

    modal.style.display = 'flex';
    requestAnimationFrame(() => modal.style.opacity = '1');
};

window.closeCreateCertModal = function() {
    const modal = document.getElementById('cert-create-modal');
    if (!modal) return;
    modal.style.display = 'none';
    // Clear inputs
    ['cert-machine-model','cert-machine-serial','cert-training-date','cert-operators'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    const countEl = document.getElementById('cert-operator-count');
    if (countEl) countEl.textContent = '';
};

// ─── SAVE THEN PRINT ─────────────────────────────────────────────────────────

window.printCreateCert = async function() {
    const model   = (document.getElementById('cert-machine-model')?.value  || '').trim();
    const serial  = (document.getElementById('cert-machine-serial')?.value || '').trim();
    const date    = (document.getElementById('cert-training-date')?.value  || '').trim();
    const opText  = (document.getElementById('cert-operators')?.value      || '').trim();

    if (!model)  { _certToast('Please enter the Machine / Model name.', 'error');    return; }
    if (!date)   { _certToast('Please select a Training Date.',          'error');    return; }
    if (!opText) { _certToast('Please add at least one trained operator.','error');   return; }

    const lines = opText.split('\n').filter(l => l.trim() !== '');
    const attendees = lines.map(line => {
        line = line.trim();
        if (line.includes(' - ')) {
            const idx = line.indexOf(' - ');
            return { id: line.substring(0, idx).trim(), name: line.substring(idx + 3).trim() };
        }
        return { id: '', name: line };
    });

    // ── Button loading state ──────────────────────────────────────────────────
    const btn = document.getElementById('cert-print-btn');
    const originalHTML = btn ? btn.innerHTML : '';
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin" style="margin-right:8px;"></i>Saving...';
    }

    // ── Save to Supabase ──────────────────────────────────────────────────────
    let saveOk = false;
    try {
        const peopleSerialized = JSON.stringify(attendees);

        if (_certSelectedName) {
            // Update existing machine record by its PK (name)
            const res = await window.electron.invoke('supabase:query', {
                table:  'frappe_fmb_report_machine',
                method: 'update',
                params: {
                    name: _certSelectedName,
                    data: {
                        training_date:  date,
                        people_trained: peopleSerialized
                    }
                }
            });
            if (!res.ok) throw new Error(res.error || 'Update failed');
            saveOk = true;
            console.log('[Cert] Record updated:', _certSelectedName);
        } else {
            // Fallback: try to find a matching record by model name
            const search = await window.electron.invoke('supabase:query', {
                table:  'frappe_fmb_report_machine',
                method: 'select',
                params: { columns: '*', limit: 1, filters: { item_name: model } }
            });
            const fallbackRec = search.ok && search.data?.[0];
            if (fallbackRec) {
                const ID_COL = ['name','id'].find(c => c in fallbackRec) || 'name';
                const res2 = await window.electron.invoke('supabase:query', {
                    table:  'frappe_fmb_report_machine',
                    method: 'update',
                    params: {
                        name: fallbackRec[ID_COL],
                        data: {
                            training_date:  date,
                            people_trained: peopleSerialized
                        }
                    }
                });
                saveOk = res2.ok;
                if (res2.ok) console.log('[Cert] Record updated via fallback match:', fallbackRec[ID_COL]);
                else console.warn('[Cert] Fallback update failed:', res2.error);
            } else {
                // No existing record — warn but continue to print
                console.warn('[Cert] No matching machine record found; printing without save.');
                saveOk = true; // allow print anyway
            }
        }
    } catch(err) {
        console.error('[Cert] Save error:', err);
        if (btn) { btn.disabled = false; btn.innerHTML = originalHTML; }
        _certToast('Failed to save: ' + err.message, 'error');
        return;
    }

    if (!saveOk) {
        if (btn) { btn.disabled = false; btn.innerHTML = originalHTML; }
        _certToast('Save failed — please try again.', 'error');
        return;
    }

    _certToast(`Saved! Generating ${attendees.length} certificate${attendees.length > 1 ? 's' : ''}...`, 'success');

    // ── Close modal & refresh list ────────────────────────────────────────────
    window.closeCreateCertModal();
    if (window.loadTrainingList) window.loadTrainingList(true);

    // ── Print (slight delay so toast is visible) ──────────────────────────────
    setTimeout(() => _printCertificates(model, serial, date, attendees), 600);
};



// ─── CORE CERTIFICATE RENDERER ────────────────────────────────────────────────

function _certToast(msg, type) {
    if (window.salestrack && window.salestrack.showToast) {
        window.salestrack.showToast(msg, type);
    } else {
        alert(msg);
    }
}

function _printCertificates(model, serial, date, attendees) {
    const certDate      = new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const formattedDate = new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const machineLabel  = model + (serial ? ` (S/N: ${serial})` : '');

    let html = `<html><head><title>Training Certificates</title>
    <style>
        @page { size: portrait; margin: 0; }
        body { font-family: 'Times New Roman', serif; padding: 0; margin: 0; background: #fff; }
        .page { width: 21cm; height: 29.7cm; position: relative; padding: 2cm; box-sizing: border-box; page-break-after: always; display:flex; flex-direction:column; align-items:center; }
        .border { position: absolute; top: 1cm; bottom: 1cm; left: 1cm; right: 1cm; border: 4px solid #000; padding: 5px; }
        .inner-border { width: 100%; height: 100%; border: 1px solid #000; box-sizing: border-box; }
        .logo { width: 250px; max-height: 120px; margin-top: 30px; object-fit: contain; }
        .title { font-size: 42px; font-style: italic; margin-top: 30px; text-transform: uppercase; letter-spacing: 2px; }
        .subtitle { font-size: 32px; font-weight: normal; margin-top: 5px; }
        .role { font-size: 46px; color: #fbbf24; -webkit-text-stroke: 1px #000; margin-top: 20px; font-weight: bold; letter-spacing: 4px; }
        .certify { font-size: 20px; margin-top: 40px; }
        .mention { font-size: 20px; font-style: italic; margin-top: 5px; }
        .name-block { margin-top: 40px; min-height: 40px; border-bottom: 2px solid #000; padding-bottom: 5px; display:inline-block; min-width: 60%; text-align:center; }
        .name-val { font-size: 28px; font-weight: bold; }
        .id-val { font-size: 20px; font-weight: bold; margin-top: 5px; }
        .desc { font-size: 18px; margin-top: 40px; max-width: 80%; text-align: center; line-height: 1.5; font-weight: bold; }
        .machine { font-size: 24px; font-weight: bold; margin-top: 20px; text-transform: uppercase; }
        
        .qr-section { margin-top: 20px; text-align: center; display: flex; flex-direction: column; align-items: center; }
        .qr-text { font-size: 11px; font-weight: bold; margin-bottom: 8px; color: #334155; text-transform: uppercase; letter-spacing: 0.5px; }
        .qr-ref { font-size: 11px; font-weight: bold; margin-top: 8px; }
        
        .bottom-section { width: 100%; margin-top: auto; display: flex; justify-content: space-between; align-items: flex-end; padding-bottom: 20px; }
        .sig-block, .date-block { width: 30%; text-align: center; }
        .sig-line { border-bottom: 1px solid #000; height: 30px; margin-bottom: 5px; width: 100%; display: block; }
        .date-center { border-bottom: 1px solid #000; padding-bottom: 2px; font-size: 16px; font-weight: bold; display: block; width: 100%; height: 28px; line-height: 38px; margin-bottom: 5px; }
        .sig-name, .date-label { font-size: 14px; font-style: italic; font-weight: bold; }
        
        .qr-container { 
            width: 120px; 
            height: 120px; 
            margin: 0 auto; 
            position: relative; 
            padding: 5px;
            background: #fff;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .qr-image {
            width: 100%;
            height: 100%;
            pointer-events: none;
            user-select: none;
            -webkit-user-drag: none;
            -moz-user-select: none;
            -ms-user-select: none;
        }
        .corner-tl { position: absolute; top: -4px; left: -4px; width: 50px; height: 50px; background: #000; clip-path: polygon(0 0, 100% 0, 0 100%); }
        .corner-tr { position: absolute; top: -4px; right: -4px; width: 50px; height: 50px; background: #000; clip-path: polygon(0 0, 100% 0, 100% 100%); }
        .corner-bl { position: absolute; bottom: -4px; left: -4px; width: 50px; height: 50px; background: #000; clip-path: polygon(0 0, 0 100%, 100% 100%); }
        .corner-br { position: absolute; bottom: -4px; right: -4px; width: 50px; height: 50px; background: #000; clip-path: polygon(100% 0, 0 100%, 100% 100%); }
    </style></head><body>`;

    attendees.forEach((person, idx) => {
        const ref       = `Certificate Ref: ${formattedDate}/${idx + 1}`;
        const verifyData = JSON.stringify({ r: ref, m: serial || model, n: person.name, id: person.id, d: date });
        const verifyUrl  = `https://machinery-exchange.com/verify.html?data=${btoa(unescape(encodeURIComponent(verifyData)))}`;
        const qrUrl      = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(verifyUrl)}`;

        html += `
        <div class="page">
            <div class="border">
                <div class="inner-border"></div>
                <div class="corner-tl"></div><div class="corner-tr"></div>
                <div class="corner-bl"></div><div class="corner-br"></div>
            </div>
            <img src="file:///C:/Projects/Company%20Logos/MXG/PNGs/Machinery-Exchange-Logo%20Vector.png" class="logo">
            <div class="title">CERTIFICATE OF</div>
            <div class="subtitle">COMPETENCE</div>
            <div class="role">OPERATOR</div>
            <div class="certify">THIS IS TO CERTIFY THAT</div>
            <div class="mention">Special Mention</div>
            <div class="name-block">
                <div class="name-val">${person.name}</div>
                ${person.id ? `<div class="id-val">${person.id}</div>` : ''}
            </div>
            <div class="desc">Has successfully completed a 12 day training course complete on the ${certDate} and has been certified to operate</div>
            <div class="machine">${machineLabel}</div>

            <div class="qr-section">
                <div class="qr-text">Scan to verify authenticity</div>
                <div class="qr-container">
                    <img src="${qrUrl}" class="qr-image" draggable="false" alt="Verification QR">
                </div>
                <div class="qr-ref">${ref}</div>
            </div>

            <div class="bottom-section">
                <div class="sig-block">
                    <div class="sig-line"></div>
                    <div class="sig-name">Antony Dube (SRD) Signature</div>
                </div>

                <div class="date-block">
                    <div class="date-center">${formattedDate}</div>
                    <div class="date-label">Issue Date</div>
                </div>

                <div class="sig-block">
                    <div class="sig-line"></div>
                    <div class="sig-name">Chetan Samji (SRD) Signature</div>
                </div>
            </div>
        </div>`;
    });

    html += `</body></html>`;

    // Show the preview modal instead of printing immediately
    const modal = document.getElementById('cert-preview-modal');
    const iframe = document.getElementById('cert-preview-iframe');
    
    if (modal && iframe) {
        modal.style.display = 'flex';
        const doc = iframe.contentWindow.document;
        doc.open();
        doc.write(html);
        doc.close();
    } else {
        console.error('[Cert] Preview modal or iframe not found.');
    }
}

window.confirmPrintCertificates = function() {
    const iframe = document.getElementById('cert-preview-iframe');
    if (iframe && iframe.contentWindow) {
        iframe.contentWindow.print();
        // Hide modal after a short delay so the print dialog can grab focus safely
        setTimeout(() => {
            document.getElementById('cert-preview-modal').style.display = 'none';
        }, 500);
    }
};
