
// ── CUSTOMER PORTAL ADMIN LOGIC ─────────────────────────────────────────
(function(){
  let _cpaAccounts = [];
  let _cpaAllMachines = [];
  let _cpaSelectedMachines = new Set();
  let _cpaEditId = null;

  // Load machine list once
  async function fetchAllMachines() {
    if (_cpaAllMachines.length) return;
    try {
      // Use already-loaded Frappe machine data if available
      let rows = (window.FT_MACHINE_ROWS || []);
      if (!rows.length) {
        // Fallback: fetch from Frappe directly
        const raw = await callFrappe(FT_MACHINE_REGISTER_METHOD, {}, 'GET', { showLoader: false });
        const payload = raw.message || raw;
        rows = payload.data || [];
      }
      // Map to consistent shape using Frappe field names
      _cpaAllMachines = rows
        .map(m => ({
          name:          m.name        || '',   // machine doctype name / fleet no
          serial_number: m.sn          || m.serial_number || '',
          customer:      m.customer    || '',
          machine_type:  m.type        || m.machine_type || '',
          model:         m.model       || '',
          fleet_no:      m.mxg_fleet_no || m.fleet_no || '',
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
    } catch(e) {
      console.warn('[CPA] fetchAllMachines error:', e);
      _cpaAllMachines = [];
    }
  }

  window.loadPortalAccounts = async function() {
    const tbody = document.getElementById('cpa-tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:#64748b;">Loading…</td></tr>';

    try {
      // Load accounts
      const accRes = await window.electron.invoke('supabase:query', {
        table: 'ft_customer_portal_accounts',
        method: 'select',
        params: { columns: '*', options: {}, order: { column: 'created_at', options: { ascending: false } } }
      });
      _cpaAccounts = accRes.data || [];

      // Load machine assignments
      const machRes = await window.electron.invoke('supabase:query', {
        table: 'ft_portal_machine_assignments',
        method: 'select',
        params: { columns: '*', options: {} }
      });
      const assignments = machRes.data || [];
      const assignMap = {};
      assignments.forEach(a => {
        if (!assignMap[a.portal_account_id]) assignMap[a.portal_account_id] = [];
        assignMap[a.portal_account_id].push(a.machine_name);
      });

      // Load portal report count
      const rptRes = await window.electron.invoke('supabase:query', {
        table: 'ft_portal_defect_reports',
        method: 'select',
        params: { columns: '*', options: {}, order: { column: 'created_at', options: { ascending: false } } }
      });
      const reports = rptRes.data || [];

      // KPIs
      document.getElementById('cpa-kpi-total').textContent = _cpaAccounts.length;
      document.getElementById('cpa-kpi-active').textContent = _cpaAccounts.filter(a=>a.is_active).length;
      document.getElementById('cpa-kpi-suspended').textContent = _cpaAccounts.filter(a=>!a.is_active).length;
      document.getElementById('cpa-kpi-reports').textContent = reports.length;
      // New KPIs
      const totalMachines = assignments.length;
      const openReports = reports.filter(r=>r.status==='New'||r.status==='In Progress').length;
      const machEl = document.getElementById('cpa-kpi-machines'); if(machEl) machEl.textContent = totalMachines;
      const openEl = document.getElementById('cpa-kpi-open-reports'); if(openEl) openEl.textContent = openReports;
      const badge = document.getElementById('cpa-open-badge');
      if(badge){ badge.textContent=openReports; badge.style.display=openReports>0?'inline':'none'; }
      // Store reports for filter
      window._cpaReports = reports;

      // Render accounts table
      renderCpaTable(_cpaAccounts, assignMap);

      // Render portal reports table
      renderCpaReportsTable(reports);
    } catch(e) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:#dc2626;">Error: ${e.message}</td></tr>`;
    }
  };

  function renderCpaTable(accounts, assignMap) {
    assignMap = assignMap || {};
    const tbody = document.getElementById('cpa-tbody');
    if (!accounts || accounts.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:#64748b;">No customer accounts yet. Click "New Account" to get started.</td></tr>';
      return;
    }
    tbody.innerHTML = accounts.map(a => {
      const machines = assignMap[a.id] || [];
      const active = a.is_active !== false;
      return `<tr style="border-bottom:1px solid #f1f5f9;">
        <td style="padding:12px 16px;">
          <div style="font-weight:700;color:#1e293b;">${safeText(a.customer_name)}</div>
          <div style="font-size:11px;color:#64748b;margin-top:1px;">${safeText(a.contact_name)}</div>
        </td>
        <td style="padding:12px 16px;color:#334155;">${safeText(a.email)}</td>
        <td style="padding:12px 16px;">
          <div style="display:flex;flex-wrap:wrap;gap:3px;">
            ${machines.slice(0,3).map(m=>`<span style="background:#f1f5f9;color:#475569;font-size:10px;padding:1px 7px;border-radius:10px;">${m}</span>`).join('')}
            ${machines.length > 3 ? `<span style="background:#f1f5f9;color:#94a3b8;font-size:10px;padding:1px 7px;border-radius:10px;">+${machines.length-3} more</span>` : ''}
            ${machines.length === 0 ? '<span style="color:#94a3b8;font-size:11px;">None assigned</span>' : ''}
          </div>
        </td>
        <td style="padding:12px 16px;font-size:11px;color:#475569;">${safeText(a.access_level||'Reporter')}</td>
        <td style="padding:12px 16px;">
          <span style="display:inline-block;padding:2px 9px;border-radius:20px;font-size:10px;font-weight:800;text-transform:uppercase;
            background:${active?'rgba(16,185,129,0.1)':'rgba(239,68,68,0.1)'};
            color:${active?'#059669':'#dc2626'};">
            ${active ? 'Active' : 'Suspended'}
          </span>
        </td>
        <td style="padding:12px 16px;color:#94a3b8;font-size:12px;">
          ${a.created_at ? new Date(a.created_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '—'}
        </td>
        <td style="padding:12px 16px;text-align:center;">
          <div style="display:flex;gap:5px;justify-content:center;">
            <button onclick="openPortalAccountModal(${JSON.stringify(a).replace(/"/g,'&quot;')})"
              title="Edit account"
              style="background:#f1f5f9;border:none;color:#475569;padding:5px 9px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;">Edit</button>
            <button onclick="togglePortalAccountActive('${a.id}', ${!active})"
              title="${active?'Suspend':'Reactivate'}"
              style="background:${active?'rgba(239,68,68,0.08)':'rgba(16,185,129,0.08)'};border:none;color:${active?'#dc2626':'#059669'};padding:5px 9px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;">
              ${active?'Suspend':'Activate'}
            </button>
            <button onclick="deletePortalAccount('${a.id}', '${safeText(a.customer_name)}')"
              title="Delete account"
              style="background:rgba(239,68,68,0.06);border:none;color:#dc2626;padding:5px 8px;border-radius:6px;font-size:14px;cursor:pointer;">🗑</button>
          </div>
        </td>
      </tr>`;
    }).join('');
  }


  function renderCpaReportsTable(reports) {
    const rTbody = document.getElementById('cpa-reports-tbody');
    if (!rTbody) return;
    if (!reports || reports.length === 0) {
      rTbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:48px;color:#64748b;font-size:13px;">No portal defect reports found.</td></tr>';
      return;
    }
    rTbody.innerHTML = reports.map(r => {
      const sevBg = r.severity==='Critical' ? '#fef2f2' : r.severity==='Major' ? '#fff7ed' : '#f8fafc';
      const sevColor = r.severity==='Critical' ? '#dc2626' : r.severity==='Major' ? '#d97706' : '#64748b';
      const stBg = r.status==='New' ? '#fef2f2' : r.status==='In Progress' ? '#fef9c3' : '#f0fdf4';
      const stColor = r.status==='New' ? '#dc2626' : r.status==='In Progress' ? '#92400e' : '#166534';
      return `<tr style="border-bottom:1px solid #f1f5f9; transition:background 0.15s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''">
        <td style="padding:11px 16px;font-weight:700;color:#1e293b;">${safeText(r.customer_name)}</td>
        <td style="padding:11px 16px;color:#334155;font-family:monospace;font-size:12px;">${safeText(r.machine_name)}</td>
        <td style="padding:11px 16px;color:#64748b;">${safeText(r.category)}</td>
        <td style="padding:11px 16px;">
          <span style="background:${sevBg};color:${sevColor};font-size:10px;font-weight:800;padding:2px 8px;border-radius:20px;text-transform:uppercase;">${safeText(r.severity)}</span>
        </td>
        <td style="padding:11px 16px;color:#475569;max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${safeText(r.description)}">${safeText(r.description)}</td>
        <td style="padding:11px 16px;color:#94a3b8;font-size:12px;">${r.created_at ? new Date(r.created_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '—'}</td>
        <td style="padding:11px 16px;">
          <select onchange="updatePortalReportStatus('${r.id}', this.value)"
            style="padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;border:none;background:${stBg};color:${stColor};cursor:pointer;outline:none;">
            <option value="New" ${r.status==='New'?'selected':''}>New</option>
            <option value="In Progress" ${r.status==='In Progress'?'selected':''}>In Progress</option>
            <option value="Resolved" ${r.status==='Resolved'?'selected':''}>Resolved</option>
          </select>
        </td>
      </tr>`;
    }).join('');
  }

  window.filterPortalAccounts = function() {
    const q = (document.getElementById('cpa-search')?.value || '').toLowerCase();
    const filtered = _cpaAccounts.filter(a =>
      (a.customer_name||'').toLowerCase().includes(q) ||
      (a.contact_name||'').toLowerCase().includes(q) ||
      (a.email||'').toLowerCase().includes(q)
    );
    renderCpaTable(filtered, {});
  };

  // ── MODAL ──────────────────────────────────────────────────────────────
  window.openPortalAccountModal = async function(account) {
    _cpaEditId = account ? account.id : null;
    document.getElementById('cpa-modal-title').textContent = account ? 'Edit Account' : 'New Customer Account';
    document.getElementById('cpa-customer-name').value = account?.customer_name || '';
    document.getElementById('cpa-contact-name').value  = account?.contact_name  || '';
    document.getElementById('cpa-email').value         = account?.email         || '';
    document.getElementById('cpa-phone').value         = account?.phone         || '';
    document.getElementById('cpa-access-level').value  = account?.access_level  || 'Reporter';
    document.getElementById('cpa-modal-error').style.display = 'none';

    _cpaSelectedMachines = new Set();
    _cpaAllMachines      = []; // reset so fresh data loads each time
    _cpaFilterCustomer   = ''; // reset customer filter

    // Load machines first (so customer list can fall back to _cpaAllMachines)
    await fetchAllMachines();

    // Load distinct customers list
    await fetchCpaCustomerList();

    // Fetch existing assignments if editing
    if (_cpaEditId) {
      const res = await window.electron.invoke('supabase:query', {
        table: 'ft_portal_machine_assignments',
        method: 'select',
        params: { columns: 'machine_name', options: {}, match: { portal_account_id: _cpaEditId } }
      });
      (res.data||[]).forEach(a => _cpaSelectedMachines.add(a.machine_name));

      // In edit mode, pre-filter the machine list to this customer's machines
      _cpaFilterCustomer = (account.customer_name || '').trim();
    }

    // Show/hide auth buttons (only in edit mode)
    const resetBtn  = document.getElementById('cpa-reset-pwd-btn');
    const setPwdBtn = document.getElementById('cpa-set-pwd-btn');
    const impBtn    = document.getElementById('cpa-impersonate-btn');
    if (resetBtn)  resetBtn.style.display  = _cpaEditId ? 'block' : 'none';
    if (setPwdBtn) setPwdBtn.style.display = _cpaEditId ? 'block' : 'none';
    if (impBtn)    impBtn.style.display    = _cpaEditId ? 'block' : 'none';

    renderCpaMachineList();
    updateCpaSelectedCount();

    document.getElementById('cpa-machine-search').value = '';
    const modal = document.getElementById('cpa-modal');
    modal.style.display = 'flex';
  };

  window.closePortalAccountModal = function() {
    document.getElementById('cpa-modal').style.display = 'none';
  };

  window.filterCpaMachineList = function() {
    renderCpaMachineList();
  };

  function renderCpaMachineList() {
    const q    = (document.getElementById('cpa-machine-search')?.value || '').toLowerCase();
    const list = document.getElementById('cpa-machine-list');

    // If a customer is selected, restrict list to their machines only
    let pool = _cpaAllMachines;
    if (_cpaFilterCustomer) {
      const lc = _cpaFilterCustomer.toLowerCase();
      pool = _cpaAllMachines.filter(m => (m.customer || '').toLowerCase().trim() === lc);
    }

    // Apply search query within the pool
    const filtered = q
      ? pool.filter(m =>
          (m.name||'').toLowerCase().includes(q) ||
          (m.serial_number||'').toLowerCase().includes(q)
        )
      : pool;

    if (!filtered.length) {
      const msg = _cpaFilterCustomer
        ? `No machines registered for <strong>${_cpaFilterCustomer}</strong>`
        : 'No machines found';
      list.innerHTML = `<div style="color:#94a3b8;font-size:12px;text-align:center;padding:12px;">${msg}</div>`;
      return;
    }

    const rows = filtered.map(m => {
      const checked  = _cpaSelectedMachines.has(m.name);
      const safeName = m.name.replace(/"/g,'&quot;');
      return `<label style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:6px;cursor:pointer;background:${checked?'#eff6ff':'transparent'};">
        <input type="checkbox" ${checked?'checked':''} value="${safeName}" onchange="toggleCpaMachine(this)"
          style="accent-color:#2563eb;width:14px;height:14px;flex-shrink:0;"/>
        <span style="min-width:0;">
          <span style="font-size:13px;font-weight:600;color:#1e293b;">${m.name}</span>
          ${m.serial_number ? `<span style="font-size:10px;color:#94a3b8;margin-left:6px;">#${m.serial_number}</span>` : ''}
          ${m.model         ? `<span style="font-size:10px;color:#64748b;margin-left:6px;">${m.model}</span>`         : ''}
        </span>
      </label>`;
    }).join('');

    list.innerHTML = rows;
  }

  window.toggleCpaMachine = function(checkbox) {
    if (checkbox.checked) _cpaSelectedMachines.add(checkbox.value);
    else                   _cpaSelectedMachines.delete(checkbox.value);
    updateCpaSelectedCount();
    renderCpaMachineList();
  };

  function updateCpaSelectedCount() {
    const el = document.getElementById('cpa-selected-count');
    if (el) el.textContent = _cpaSelectedMachines.size;
  }

  // ── SAVE ───────────────────────────────────────────────────────────────
  window.savePortalAccount = async function() {
    const customerName = document.getElementById('cpa-customer-name').value.trim();
    const contactName  = document.getElementById('cpa-contact-name').value.trim();
    const email        = document.getElementById('cpa-email').value.trim();
    const phone        = document.getElementById('cpa-phone').value.trim();
    const accessLevel  = document.getElementById('cpa-access-level').value;
    const errEl        = document.getElementById('cpa-modal-error');
    const btn          = document.getElementById('cpa-save-btn');

    errEl.style.display = 'none';
    if (!customerName || !contactName || !email) {
      errEl.textContent = 'Please fill in Customer Name, Contact Name and Email.';
      errEl.style.display = 'block';
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Saving…';

    try {
      let accountId = _cpaEditId;

      if (_cpaEditId) {
        // Update existing
        await window.electron.invoke('supabase:query', {
          table: 'ft_customer_portal_accounts',
          method: 'upsert',
          data: { id: _cpaEditId, customer_name: customerName, contact_name: contactName, email, phone: phone||null, access_level: accessLevel },
          params: { onConflict: 'id' }
        });
      } else {
        // Create new account row (auth user created separately by admin from Supabase)
        const res = await window.electron.invoke('supabase:query', {
          table: 'ft_customer_portal_accounts',
          method: 'insert',
          data: { customer_name: customerName, contact_name: contactName, email, phone: phone||null, access_level: accessLevel, is_active: true, created_at: new Date().toISOString() }
        });
        accountId = (res.data && res.data[0]) ? res.data[0].id : null;
      }

      if (accountId) {
        // Delete existing assignments then re-insert
        await window.electron.invoke('supabase:query', {
          table: 'ft_portal_machine_assignments',
          method: 'delete',
          params: { match: { portal_account_id: accountId } }
        });

        const machineRows = [..._cpaSelectedMachines].map(name => ({
          portal_account_id: accountId,
          machine_name: name,
          created_at: new Date().toISOString()
        }));
        if (machineRows.length) {
          await window.electron.invoke('supabase:query', {
            table: 'ft_portal_machine_assignments',
            method: 'insert',
            data: machineRows
          });
        }
      }

      closePortalAccountModal();
      loadPortalAccounts();
    } catch(e) {
      errEl.textContent = e.message || 'Save failed.';
      errEl.style.display = 'block';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Save Account';
    }
  };

  window.togglePortalAccountActive = async function(id, newState) {
    await window.electron.invoke('supabase:query', {
      table: 'ft_customer_portal_accounts',
      method: 'upsert',
      data: { id, is_active: newState },
      params: { onConflict: 'id' }
    });
    loadPortalAccounts();
  };

  window.resetPortalPassword = async function() {
    const email = document.getElementById('cpa-email').value.trim();
    const name  = document.getElementById('cpa-contact-name').value.trim() || email;
    if (!email) { showToast('No email address on this account.', 'warn', 3000); return; }

    const btn = document.getElementById('cpa-reset-pwd-btn');
    btn.disabled = true;
    btn.textContent = 'Generating…';

    try {
      const res = await window.electron.invoke('supabase:auth', { action: 'resetPassword', email });

      if (!res || !res.ok) {
        showToast('Failed: ' + (res?.error || 'Unknown error'), 'err', 5000);
        return;
      }

      const link = res.link;
      const isInvite = res.type === 'invite';

      // Auto-copy to clipboard
      try { await navigator.clipboard.writeText(link); } catch(_) {}

      // Show a styled overlay with the copyable link
      const overlay = document.createElement('div');
      overlay.id = 'cpa-pwd-link-overlay';
      overlay.style.cssText = `
        position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:99999;
        display:flex; align-items:center; justify-content:center;
      `;
      overlay.innerHTML = `
        <div style="background:#fff; border-radius:16px; padding:28px 32px; max-width:540px; width:90%;
                    box-shadow:0 20px 60px rgba(0,0,0,0.3); font-family:inherit;">
          <div style="font-size:22px; margin-bottom:4px;">🔑 Password ${isInvite ? 'Invite' : 'Reset'} Link</div>
          <div style="color:#64748b; font-size:13px; margin-bottom:20px;">
            For <strong>${name}</strong> (${email})<br>
            ${isInvite
              ? 'This user has no account yet — this link will let them set their password for the first time.'
              : 'Share this link with the customer so they can set a new password.'}
          </div>
          <div style="background:#f1f5f9; border:1.5px solid #e2e8f0; border-radius:10px; padding:12px 14px;
                      font-size:11px; font-family:monospace; word-break:break-all; color:#1e293b;
                      margin-bottom:16px; max-height:80px; overflow-y:auto;">
            ${link}
          </div>
          <div style="display:flex; gap:10px; flex-wrap:wrap;">
            <button id="cpa-copy-link-btn" onclick="
              navigator.clipboard.writeText('${link.replace(/'/g,"\\'")}');
              this.textContent='✅ Copied!';
              setTimeout(()=>this.textContent='📋 Copy Link',1500);
            " style="padding:9px 18px; background:#1e293b; color:#fff; border:none; border-radius:8px;
                     font-size:13px; font-weight:700; cursor:pointer; font-family:inherit;">
              📋 Copy Link
            </button>
            <button onclick="document.getElementById('cpa-pwd-link-overlay').remove()"
              style="padding:9px 18px; background:#f1f5f9; color:#475569; border:none; border-radius:8px;
                     font-size:13px; font-weight:600; cursor:pointer; font-family:inherit;">
              Close
            </button>
          </div>
          <div style="margin-top:14px; font-size:11px; color:#94a3b8;">
            ⚠️ This link expires in 24 hours. Link was auto-copied to your clipboard.
          </div>
        </div>`;
      document.body.appendChild(overlay);
      overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    } catch(e) {
      showToast('Error: ' + e.message, 'err', 4000);
    } finally {
      btn.disabled = false;
      btn.textContent = '🔑 Reset Password';
    }
  };

  window.setPortalPassword = async function() {
    const email = document.getElementById('cpa-email').value.trim();
    const name  = document.getElementById('cpa-contact-name').value.trim() || email;
    if (!email) { showToast('No email address on this account.', 'warn', 3000); return; }

    // Build set-password overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:99999;display:flex;align-items:center;justify-content:center;';
    overlay.innerHTML = `
      <div style="background:#fff;border-radius:16px;padding:28px 32px;max-width:420px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.3);font-family:inherit;">
        <div style="font-size:20px;font-weight:800;margin-bottom:4px;">🔐 Set Password</div>
        <div style="font-size:13px;color:#64748b;margin-bottom:20px;">
          Set a new password for <strong>${name}</strong> (${email})<br>
          <span style="color:#15803d;">No email sent — password is updated immediately.</span>
        </div>
        <div style="margin-bottom:14px;">
          <label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#64748b;margin-bottom:6px;">NEW PASSWORD *</label>
          <input id="cpa-new-pwd" type="password" autocomplete="new-password"
            style="width:100%;padding:10px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:14px;font-family:inherit;outline:none;"
            placeholder="Min. 8 characters"/>
        </div>
        <div style="margin-bottom:20px;">
          <label style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#64748b;margin-bottom:6px;">CONFIRM PASSWORD *</label>
          <input id="cpa-confirm-pwd" type="password" autocomplete="new-password"
            style="width:100%;padding:10px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:14px;font-family:inherit;outline:none;"
            placeholder="Re-enter password"/>
        </div>
        <div id="cpa-pwd-err" style="background:#fef2f2;border:1px solid #fecaca;color:#dc2626;border-radius:8px;padding:9px 12px;font-size:13px;margin-bottom:14px;display:none;"></div>
        <div style="display:flex;gap:10px;">
          <button id="cpa-set-pwd-confirm" style="flex:1;padding:11px;background:#15803d;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;">Set Password</button>
          <button id="cpa-set-pwd-cancel" style="padding:11px 20px;background:#f1f5f9;color:#475569;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;">Cancel</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    const newPwd     = overlay.querySelector('#cpa-new-pwd');
    const confirmPwd = overlay.querySelector('#cpa-confirm-pwd');
    const errEl      = overlay.querySelector('#cpa-pwd-err');
    const confirmBtn = overlay.querySelector('#cpa-set-pwd-confirm');
    const cancelBtn  = overlay.querySelector('#cpa-set-pwd-cancel');

    setTimeout(() => newPwd.focus(), 50);

    cancelBtn.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    confirmBtn.addEventListener('click', async () => {
      errEl.style.display = 'none';
      const pwd  = newPwd.value;
      const pwd2 = confirmPwd.value;

      if (pwd.length < 8) {
        errEl.textContent = 'Password must be at least 8 characters.';
        errEl.style.display = 'block'; return;
      }
      if (pwd !== pwd2) {
        errEl.textContent = 'Passwords do not match.';
        errEl.style.display = 'block'; return;
      }

      confirmBtn.disabled = true;
      confirmBtn.textContent = '⏳ Setting…';

      try {
        const res = await window.electron.invoke('supabase:auth', {
          action: 'setPasswordByEmail', email, password: pwd
        });

        if (!res || !res.ok) {
          errEl.textContent = res?.error || 'Failed to set password.';
          errEl.style.display = 'block';
          confirmBtn.disabled = false;
          confirmBtn.textContent = 'Set Password';
          return;
        }

        overlay.remove();
        showToast('✅ Password set for ' + email, 'ok', 4000);
      } catch(e) {
        errEl.textContent = 'Error: ' + e.message;
        errEl.style.display = 'block';
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Set Password';
      }
    });
  };

  window.impersonatePortalAccount = async function() {
    const email    = document.getElementById('cpa-email').value.trim();
    const custName = document.getElementById('cpa-customer-name').value.trim();
    const contact  = document.getElementById('cpa-contact-name').value.trim();
    if (!email) { showToast('No email address on this account.', 'warn', 3000); return; }

    // Remove any stale overlay
    document.getElementById('cpa-imp-overlay')?.remove();

    // Build overlay entirely via DOM — no inline onclick inside innerHTML
    const overlay = document.createElement('div');
    overlay.id = 'cpa-imp-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.65);z-index:99999;display:flex;align-items:center;justify-content:center;';

    const box = document.createElement('div');
    box.style.cssText = 'background:#fff;border-radius:16px;padding:28px 32px;max-width:480px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.3);font-family:inherit;';
    box.innerHTML = `
      <div style="font-size:19px;font-weight:700;color:#1e293b;margin-bottom:4px;">👤 Impersonate Customer Account</div>
      <div style="font-size:13px;color:#64748b;margin-bottom:18px;">
        Logging in as <strong>${contact}</strong> (${email}).<br>
        This action will be recorded in the audit log.
      </div>
      <label style="display:block;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;margin-bottom:6px;">Reason *</label>
      <textarea id="cpa-imp-reason" rows="3" placeholder="e.g. Customer reported login issue…"
        style="width:100%;padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:9px;font-size:13px;font-family:inherit;outline:none;resize:vertical;box-sizing:border-box;margin-bottom:16px;"></textarea>
      <div style="display:flex;gap:10px;justify-content:flex-end;">
        <button id="cpa-imp-cancel" style="padding:9px 18px;background:#f1f5f9;color:#475569;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;">Cancel</button>
        <button id="cpa-imp-go" disabled style="padding:9px 20px;background:#4338ca;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;opacity:0.4;transition:opacity 0.15s;">👤 Open Customer Portal</button>
      </div>
      <div style="margin-top:12px;font-size:11px;color:#f59e0b;">⚠️ Impersonation is logged. The magic link expires in 1 hour.</div>`;

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    const reasonEl  = document.getElementById('cpa-imp-reason');
    const goBtn     = document.getElementById('cpa-imp-go');
    const cancelBtn = document.getElementById('cpa-imp-cancel');

    // Close on cancel or backdrop click
    cancelBtn.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    // Enable Go button only when reason is typed
    reasonEl.addEventListener('input', () => {
      const ok = reasonEl.value.trim().length > 0;
      goBtn.disabled    = !ok;
      goBtn.style.opacity = ok ? '1' : '0.4';
    });

    // Main action — all logic here, no global _doImpersonate needed
    goBtn.addEventListener('click', async () => {
      const reason = reasonEl.value.trim();
      if (!reason) return;

      goBtn.disabled = true;
      goBtn.textContent = '⏳ Generating session…';
      goBtn.style.opacity = '0.7';

      try {
        console.log('[Impersonate] Requesting session for:', email);
        const res = await window.electron.invoke('supabase:auth', {
          action: 'impersonate', email, reason
        });
        console.log('[Impersonate] IPC result:', res?.ok, res?.error || '');

        if (!res || !res.ok) {
          const errMsg = res?.error || 'Could not create session';
          console.error('[Impersonate] Failed:', errMsg);
          showToast('Impersonate failed: ' + errMsg, 'err', 6000);
          goBtn.disabled = false;
          goBtn.textContent = '👤 Open Customer Portal';
          goBtn.style.opacity = '1';
          return;
        }

        // Audit log — best-effort
        try {
          await window.electron.invoke('supabase:query', {
            table: 'ft_portal_impersonation_log',
            method: 'insert',
            data: { admin_name: 'Omnis Admin', customer_name: custName, customer_email: email, reason, created_at: new Date().toISOString() }
          });
        } catch(_) {}

        overlay.remove();

        // Open portal in a new Electron window — session pre-injected into localStorage
        const openRes = await window.electron.invoke('portal:impersonate', {
          access_token:  res.access_token,
          refresh_token: res.refresh_token,
          expires_in:    res.expires_in,
          user:          res.user,
          email
        });

        if (openRes && openRes.ok) {
          showToast('👤 Portal opened as ' + email, 'ok', 4000);
        } else {
          showToast('Could not open portal: ' + (openRes?.error || 'unknown error'), 'err', 5000);
        }

      } catch(e) {
        console.error('[Impersonate] Exception:', e.message);
        showToast('Error: ' + e.message, 'err', 5000);
        goBtn.disabled = false;
        goBtn.textContent = '👤 Open Customer Portal';
        goBtn.style.opacity = '1';
      }
    });

    setTimeout(() => reasonEl.focus(), 50);
  };

  function _showImpersonateLink(link, email) {
    // Fallback: show the magic link in a copyable dialog
    try { navigator.clipboard.writeText(link); } catch(_) {}
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:99999;display:flex;align-items:center;justify-content:center;';
    d.innerHTML = `
      <div style="background:#fff;border-radius:16px;padding:28px 32px;max-width:540px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.3);font-family:inherit;">
        <div style="font-size:20px;margin-bottom:4px;">👤 Impersonation Link</div>
        <div style="font-size:13px;color:#64748b;margin-bottom:16px;">
          Copy this link and open it in any browser to log in as <strong>${email}</strong>.
        </div>
        <div id="imp-link-box" style="background:#f1f5f9;border:1.5px solid #e2e8f0;border-radius:10px;padding:12px 14px;font-size:11px;font-family:monospace;word-break:break-all;color:#1e293b;max-height:80px;overflow-y:auto;margin-bottom:16px;">${link}</div>
        <div style="display:flex;gap:10px;">
          <button id="imp-copy-btn" style="padding:9px 18px;background:#1e293b;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;">📋 Copy Link</button>
          <button id="imp-close-btn" style="padding:9px 18px;background:#f1f5f9;color:#475569;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;">Close</button>
        </div>
        <div style="margin-top:12px;font-size:11px;color:#94a3b8;">⚠️ Expires in 1 hour. Link was auto-copied to clipboard.</div>
      </div>`;
    document.body.appendChild(d);
    d.querySelector('#imp-copy-btn').addEventListener('click', () => {
      navigator.clipboard.writeText(link);
      d.querySelector('#imp-copy-btn').textContent = '✅ Copied!';
      setTimeout(() => { d.querySelector('#imp-copy-btn').textContent = '📋 Copy Link'; }, 1500);
    });
    d.querySelector('#imp-close-btn').addEventListener('click', () => d.remove());
    d.addEventListener('click', e => { if (e.target === d) d.remove(); });
  }

  window.deletePortalAccount = async function(id, name) {
    if (!confirm(`Delete the portal account for "${name}"? This cannot be undone.`)) return;
    await window.electron.invoke('supabase:query', {
      table: 'ft_portal_machine_assignments',
      method: 'delete',
      params: { match: { portal_account_id: id } }
    });
    await window.electron.invoke('supabase:query', {
      table: 'ft_customer_portal_accounts',
      method: 'delete',
      params: { match: { id } }
    });
    loadPortalAccounts();
  };

  window.updatePortalReportStatus = async function(reportId, status) {
    await window.electron.invoke('supabase:query', {
      table: 'ft_portal_defect_reports',
      method: 'upsert',
      data: { id: reportId, status },
      params: { onConflict: 'id' }
    });
  };

  // ── CUSTOMER NAME AUTOCOMPLETE (safe: data-attr + delegated listener) ──────
  let _cpaCustomerNames  = [];
  let _cpaFilterCustomer = ''; // currently selected customer — limits machine list

  async function fetchCpaCustomerList() {
    try {
      // Use Frappe machine data already in memory
      let rows = (window.FT_MACHINE_ROWS || []);
      if (!rows.length && _cpaAllMachines.length) rows = _cpaAllMachines;
      _cpaCustomerNames = [...new Set(
        rows.map(r => (r.customer || '').trim()).filter(Boolean)
      )].sort((a, b) => a.localeCompare(b));
    } catch(e) {
      _cpaCustomerNames = [];
    }

    // Wire up the delegated listener once (idempotent guard)
    const dd = document.getElementById('cpa-cust-dropdown');
    if (dd && !dd._listenerAttached) {
      dd._listenerAttached = true;
      dd.addEventListener('mousedown', function(e) {
        e.preventDefault(); // stop input blur
        const item = e.target.closest('[data-cpa-name]');
        if (!item) return;
        const name = item.dataset.cpaName;
        _applyCpaCustomer(name);
      });
    }

    // Close dropdown on input blur (with delay so mousedown fires first)
    const inp = document.getElementById('cpa-customer-name');
    if (inp && !inp._blurAttached) {
      inp._blurAttached = true;
      inp.addEventListener('blur', function() {
        setTimeout(() => {
          const dd2 = document.getElementById('cpa-cust-dropdown');
          if (dd2) dd2.style.display = 'none';
        }, 150);
      });
    }
  }

  function _applyCpaCustomer(name) {
    const input = document.getElementById('cpa-customer-name');
    const dd    = document.getElementById('cpa-cust-dropdown');
    if (input) input.value = name;
    if (dd)    dd.style.display = 'none';

    // Set the active customer filter
    _cpaFilterCustomer = (name || '').trim();

    // Auto-select all machines belonging to this customer
    if (_cpaFilterCustomer) {
      const lc = _cpaFilterCustomer.toLowerCase();
      _cpaAllMachines
        .filter(m => (m.customer || '').toLowerCase().trim() === lc)
        .forEach(m => _cpaSelectedMachines.add(m.name));
    }

    // Clear search box — filtered list will show only this customer's machines
    const machSearch = document.getElementById('cpa-machine-search');
    if (machSearch) machSearch.value = '';

    updateCpaSelectedCount();
    renderCpaMachineList();
  }

  window.cpaCustomerSearch = function(query) {
    const dd = document.getElementById('cpa-cust-dropdown');
    if (!dd) return;
    const q = (query || '').toLowerCase().trim();

    const matches = q
      ? _cpaCustomerNames.filter(n => n.toLowerCase().includes(q))
      : _cpaCustomerNames;

    let html = '';

    if (matches.length > 0) {
      html += matches.map(name => {
        const safe = name.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
        return `<div data-cpa-name="${safe}"
          style="padding:9px 14px;font-size:13px;cursor:pointer;color:#1e293b;
                 border-bottom:1px solid #f1f5f9;transition:background 0.1s;"
          onmouseover="this.style.background='#f8fafc'"
          onmouseout="this.style.background=''">${name}</div>`;
      }).join('');
    } else if (q) {
      html += `<div style="padding:9px 14px;font-size:12px;color:#94a3b8;font-style:italic;">No match for "${q}"</div>`;
    }

    // "Create new" row — always present
    const isNew = q && !_cpaCustomerNames.map(n => n.toLowerCase()).includes(q);
    const safeQ = (query || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
    const createLabel = isNew
      ? `<strong>+ Create "${safeQ}"</strong>&nbsp;as new customer`
      : `<strong>+ Create new customer</strong>&nbsp;(type a name above)`;
    html += `<div data-cpa-name="${safeQ}"
      style="padding:10px 14px;font-size:12px;cursor:pointer;color:#2563eb;
             border-top:2px solid #e2e8f0;background:#f8faff;"
      onmouseover="this.style.background='#eff6ff'"
      onmouseout="this.style.background='#f8faff'">${createLabel}</div>`;

    dd.innerHTML = html;
    dd.style.display = 'block';
  };

  // Expose for external call (e.g. edit mode pre-fill) — no-op kept for compat
  window.cpaSelectCustomer = function(name) { _applyCpaCustomer(name); };

  // Close modal on backdrop click
  document.getElementById('cpa-modal').addEventListener('click', function(e) {
    if (e.target === this) closePortalAccountModal();
  });
})();
