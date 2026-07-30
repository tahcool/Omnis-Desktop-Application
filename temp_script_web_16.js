
// ══════════════════════════════════════════════════════════
//  ADD / EDIT MACHINE MODAL
// ══════════════════════════════════════════════════════════
(function AddMachineMod() {

  var AM_EDIT_MODE = false;
  var AM_EDIT_NAME = '';
  var AM_CURRENT_STEP = 1;

  // Library file slots: [label, supabase_key, accept_mime, accept_attr]
  var AM_LIB_FIELDS = [
    ['Filters List',          'filters_list',              'application/pdf,image/*', '.pdf,.jpg,.jpeg,.png,.webp'],
    ['PDI Checklist',        'pdi_checklist',             'application/pdf,image/*', '.pdf,.jpg,.jpeg,.png,.webp'],
    ['Equipment Info Form',  'equipment_information_form','application/pdf,image/*', '.pdf,.jpg,.jpeg,.png,.webp'],
    ['Belt Dimensions',      'belt_dimensions',           'application/pdf,image/*', '.pdf,.jpg,.jpeg,.png,.webp'],
    ['Hyd. Filters Dim.',    'hyd_filters_dimensions',    'application/pdf,image/*', '.pdf,.jpg,.jpeg,.png,.webp'],
    ['Wty. Certificate',     'wty_certificate',           'application/pdf,image/*', '.pdf,.jpg,.jpeg,.png,.webp'],
    ['NEI Checklist',        'nei_checklist',             'application/pdf,image/*', '.pdf,.jpg,.jpeg,.png,.webp'],
    ['Machine Data Plate',   'machine_data_plate',        'application/pdf,image/*', '.pdf,.jpg,.jpeg,.png,.webp'],
    ['Engine Data Plate',    'engine_data_plate',         'application/pdf,image/*', '.pdf,.jpg,.jpeg,.png,.webp'],
    ['RPC List',             'rpc_list',                  'application/pdf,image/*', '.pdf,.jpg,.jpeg,.png,.webp'],
    ['Parts Manuals',        'parts_manuals',             'application/pdf,image/*', '.pdf,.jpg,.jpeg,.png,.webp'],
    ['Parts Manuals 2',      'parts_manuals_2',           'application/pdf,image/*', '.pdf,.jpg,.jpeg,.png,.webp'],
    ['Parts Manuals 3',      'parts_manuals_3',           'application/pdf,image/*', '.pdf,.jpg,.jpeg,.png,.webp'],
    ['Misc Files',           'misc_files',                'application/zip,application/x-zip-compressed', '.zip'],
  ];

  // ── Build library grid ──────────────────────────────────
  // existingUrls = LIB_SUPABASE_MAP entry, fullDoc = raw machine doc (has Frappe file paths too)
  function buildLibGrid(existingUrls, fullDoc) {
    var grid = document.getElementById('am-lib-grid');
    if (!grid) return;
    grid.innerHTML = AM_LIB_FIELDS.map(function(f) {
      var label = f[0], key = f[1], accept = f[3];
      var isMisc = key === 'misc_files';
      var icon = isMisc ? '🗜️' : '📄';
      var hint = isMisc ? 'ZIP archive' : 'PDF or Image';

      // Resolve best URL: Supabase first, then Frappe path via getLibraryUrl helper
      var existUrl = '';
      if (existingUrls && existingUrls[key]) {
        existUrl = existingUrls[key];
      } else if (fullDoc && fullDoc[key] && typeof window.getLibraryUrl === 'function') {
        existUrl = window.getLibraryUrl(fullDoc.name || '', key, fullDoc[key]) || '';
      } else if (fullDoc && fullDoc[key]) {
        // Raw Frappe path fallback
        var raw = String(fullDoc[key]).trim();
        if (raw) existUrl = raw.startsWith('http') ? raw : ((typeof FLEET_BASE_URL !== 'undefined' ? FLEET_BASE_URL : '') + raw);
      }

      var existHtml = existUrl
        ? '<div class="am-lib-existing"><span style="color:#16a34a;">✓</span> Existing — <a href="' + existUrl + '" target="_blank" style="color:#6366f1;text-decoration:underline;">View</a> &nbsp;<span style="color:#94a3b8;">(upload to replace)</span></div>'
        : '<div class="am-lib-existing" style="color:#94a3b8;">— No file uploaded yet</div>';

      return '<div class="am-lib-item">'
        + '<div class="am-lib-item-label">' + icon + ' ' + label + '</div>'
        + '<div class="am-lib-dropzone">'
        + '<input type="file" data-libkey="' + key + '" accept="' + accept + '" onchange="amLibFileChosen(this)" />'
        + '<div style="font-size:11px;color:#94a3b8;">' + hint + ' — click to upload</div>'
        + '</div>'
        + '<div id="am-lib-preview-' + key + '" style="font-size:11px;color:#16a34a;margin-top:5px;display:none;"></div>'
        + existHtml
        + '</div>';
    }).join('');
  }

  // ── Populate Model Datalist ─────────────────────────────
  function buildModelList() {
    var dl = document.getElementById('am-model-list');
    if (!dl) return;
    window.AM_MODELS_MAP = {};
    for (var key in window.MACHINES_MAP) {
      var m = window.MACHINES_MAP[key];
      if (m.model && m.model.trim()) {
        window.AM_MODELS_MAP[m.model.trim()] = m.oem || '';
      }
    }
    var html = '';
    for (var mod in window.AM_MODELS_MAP) {
      html += '<option value="' + mod + '">';
    }
    dl.innerHTML = html;
  }

  // ── Open helpers ────────────────────────────────────────
  window.openAddMachineModal = function() {
    AM_EDIT_MODE = false;
    AM_EDIT_NAME = '';
    resetForm();
    document.getElementById('am-header-label').textContent = 'Add Machine';
    document.getElementById('am-save-label').textContent = 'Create Machine';
    document.getElementById('am-f-name').readOnly = false;
    document.getElementById('am-warning').style.display = 'none';
    buildModelList();
    buildLibGrid(null);
    document.getElementById('am-overlay').style.display = 'flex';
    setTimeout(function(){ document.getElementById('am-f-name').focus(); }, 100);
  };

  window.openEditMachineModal = function(machineName) {
    AM_EDIT_MODE = true;
    AM_EDIT_NAME = machineName;

    // ── Close the machine detail popup so it doesn't sit behind ──
    var mcOverlay = document.getElementById('mc-modal-overlay') || window.mcModalOverlay;
    if (mcOverlay) {
      mcOverlay.classList.add('hidden');
      mcOverlay.style.removeProperty('display');
    }

    resetForm();
    document.getElementById('am-header-label').textContent = 'Edit Machine: ' + machineName;
    document.getElementById('am-save-label').textContent = 'Save Changes';
    document.getElementById('am-f-name').readOnly = true;
    document.getElementById('am-warning').style.display = 'flex';
    document.getElementById('am-error').textContent = '';
    document.getElementById('am-overlay').style.display = 'flex';
    buildModelList();

    // Use MC_CURRENT_MACHINE (full Frappe doc) for richest data, fall back to MACHINES_MAP
    var fullDoc = window.MC_CURRENT_MACHINE || {};
    var m = (fullDoc.name === machineName ? fullDoc : null)
          || (window.MACHINES_MAP && window.MACHINES_MAP[machineName])
          || {};

    if (m.name) fillForm(m);

    // Lib URLs: merge Supabase map with full doc for Frappe-hosted files
    var libUrls = (window.LIB_SUPABASE_MAP && window.LIB_SUPABASE_MAP[machineName]) || {};
    buildLibGrid(libUrls, m);

    // Cover image — use best available URL
    var picField = m.machine_picture || '';
    var picUrl = typeof machineAttachmentLink === 'function'
      ? machineAttachmentLink(picField)
      : (picField.startsWith('http') ? picField : ((typeof FLEET_BASE_URL !== 'undefined' ? FLEET_BASE_URL : '') + picField));
    var imgPrev = document.getElementById('am-img-preview');
    var cur = document.getElementById('am-img-current');
    if (picUrl && picUrl.length > 4) {
      imgPrev.src = picUrl;
      imgPrev.style.display = 'block';
      if (cur) { cur.textContent = '✓ Existing cover image'; cur.style.display = 'block'; }
    } else {
      imgPrev.style.display = 'none';
      if (cur) cur.style.display = 'none';
    }
  };

  window.closeAddMachineModal = function() {
    document.getElementById('am-overlay').style.display = 'none';
    resetForm();
  };

  // ── Reset form ──────────────────────────────────────────
  function resetForm() {
    var ids = ['am-f-name','am-f-model','am-f-oem','am-f-esn','am-f-chassis','am-f-customer',
               'am-f-fleet-no','am-f-mxg-fleet-no','am-f-location','am-f-engine-type','am-f-hmr',
               'am-f-supplier','am-f-gearbox','am-f-bin','am-f-fuel','am-f-weight','am-f-voltage',
               'am-f-tyre','am-f-attachments','am-f-tsn','am-f-wty-period','am-f-wty-hrs',
               'am-f-handover','am-f-expiry','am-f-notes','am-f-is-type','am-f-start-hmr',
               'am-f-total-run-hrs','am-f-last-hmr-date','am-f-svc-interval','am-f-last-svc-hmr',
               'am-f-next-svc-hmr','am-f-last-svc-type','am-f-next-svc-type','am-f-hrs-rem',
               'am-f-last-svc-date','am-f-chain-make','am-f-chain-len','am-f-chain-wid',
               'am-f-sprok-lhs-t','am-f-sprok-rhs-t','am-f-tele-params','am-f-filters',
               'am-f-lubes','am-f-belts','am-f-hyd-filters'];
    ids.forEach(function(id){ var el=document.getElementById(id); if(el) el.value=''; });
    var selects = ['am-f-type','am-f-region','am-f-warranty','am-f-telematics','am-f-fleetrack',
                   'am-f-supplied','am-f-oem-reg','am-f-canbus','am-f-mobility','am-f-wty-type',
                   'am-f-track-is','am-f-is-status','am-f-svc-ob'];
    selects.forEach(function(id){ var el=document.getElementById(id); if(el) el.value=''; });
    var imgPrev = document.getElementById('am-img-preview');
    if (imgPrev) { imgPrev.src=''; imgPrev.style.display='none'; }
    var imgCur = document.getElementById('am-img-current');
    if (imgCur) { imgCur.textContent=''; imgCur.style.display='none'; }
    var imgInput = document.getElementById('am-img-input');
    if (imgInput) imgInput.value = '';
    var errEl = document.getElementById('am-error');
    if (errEl) errEl.textContent = '';
    setProgress('', 0, false);
    var btn = document.getElementById('am-save-btn');
    if (btn) btn.disabled = false;
    amGoToStep(1);
  }

  // ── Wizard Logic ─────────────────────────────────────────
  window.amGoToStep = function(step) {
    if (step < 1) step = 1;
    if (step > 4) step = 4;

    // Validate Step 1 before allowing transition to 2, 3 or 4
    if (step > 1) {
      var nameVal = (document.getElementById('am-f-name').value || '').trim();
      if (!nameVal) {
        var errEl = document.getElementById('am-error');
        if (errEl) errEl.textContent = '⚠ Machine ID / SN is required to proceed.';
        return;
      }
      var errEl2 = document.getElementById('am-error');
      if (errEl2 && errEl2.textContent.includes('Machine ID')) errEl2.textContent = '';
    }

    AM_CURRENT_STEP = step;
    
    for (var i = 1; i <= 4; i++) {
      var cont = document.getElementById('am-step-' + i);
      var ind = document.getElementById('am-ind-' + i);
      if (cont) {
        if (i === step) cont.classList.add('active');
        else cont.classList.remove('active');
      }
      if (ind) {
        ind.className = 'am-step-indicator';
        if (i < step) ind.classList.add('done');
        if (i === step) ind.classList.add('active');
      }
    }

    var prev = document.getElementById('am-btn-prev');
    var next = document.getElementById('am-btn-next');
    var save = document.getElementById('am-save-btn');
    
    if (prev) prev.style.display = step === 1 ? 'none' : 'block';
    if (next) next.style.display = step === 4 ? 'none' : 'block';
    if (save) save.style.display = step === 4 ? 'flex' : 'none';
  };

  window.amNextStep = function() { amGoToStep(AM_CURRENT_STEP + 1); };
  window.amPrevStep = function() { amGoToStep(AM_CURRENT_STEP - 1); };

  // ── Fill form from machine object ───────────────────────
  function fillForm(m) {
    function set(id, val) { var el=document.getElementById(id); if(el) el.value=val||''; }
    set('am-f-name',       m.name);
    set('am-f-fleetrack',  m.fleetrack_managed || 'Yes');
    set('am-f-supplied',   m.supplied || 'Not Specified');
    set('am-f-model',      m.model);
    set('am-f-oem',        m.oem);
    set('am-f-esn',        m.esn);
    set('am-f-chassis',    m.chassis_number);
    set('am-f-customer',   m.customer);
    set('am-f-fleet-no',   m.fleet_no);
    set('am-f-mxg-fleet-no', m.mxg_fleet_no);
    set('am-f-location',   m.location);
    set('am-f-region',     m.region);
    set('am-f-warranty',   m.warranty_status);
    set('am-f-oem-reg',    m.oem_registered);
    set('am-f-supplier',   m.supplier);
    set('am-f-engine-type',m.engine_type);
    set('am-f-gearbox',    m.gearbox);
    set('am-f-telematics', m.has_telematics_device || m.has_telematics);
    set('am-f-bin',        m.bin_capacity);
    set('am-f-fuel',       m.standard_fuel_consumption);
    set('am-f-canbus',     m.canbus_enabled);
    set('am-f-weight',     m.operating_weight);
    set('am-f-voltage',    m.working_voltage);
    set('am-f-tyre',       m.tyre_size);
    set('am-f-attachments',m.unique_attachments_fitted);
    set('am-f-tsn',        m.tsn);
    set('am-f-mobility',   m.mobility);
    set('am-f-hmr',        m.current_hmr);
    set('am-f-wty-type',   m.warranty_type);
    set('am-f-wty-period', m.warranty_period);
    set('am-f-wty-hrs',    m.warranty_hours);
    set('am-f-handover',   m.handover_date ? m.handover_date.split('T')[0] : '');
    set('am-f-expiry',     m.expiry_date ? m.expiry_date.split('T')[0] : '');
    set('am-f-notes',      m.notes);
    // Extended Specs
    set('am-f-track-is',      m.track_initial_service);
    set('am-f-is-type',       m.initial_service_type);
    set('am-f-is-status',     m.initial_service_status);
    set('am-f-start-hmr',     m.starting_hmr);
    set('am-f-total-run-hrs', m.total_running_hours);
    set('am-f-last-hmr-date', m.last_hmr_date ? m.last_hmr_date.split('T')[0] : '');
    set('am-f-svc-interval',  m.service_interval_hours);
    set('am-f-last-svc-hmr',  m.last_service_hmr);
    set('am-f-next-svc-hmr',  m.next_service_hmr);
    set('am-f-last-svc-type', m.last_service_type);
    set('am-f-next-svc-type', m.next_service_type);
    set('am-f-hrs-rem',       m.hours_remaining_to_service);
    set('am-f-last-svc-date', m.last_service_date ? m.last_service_date.split('T')[0] : '');
    set('am-f-svc-ob',        m.service_obligation);
    set('am-f-chain-make',    m.chain_make);
    set('am-f-chain-len',     m.chain_length);
    set('am-f-chain-wid',     m.chain_width);
    set('am-f-sprok-lhs-t',   m.sproket_lhs_teeth);
    set('am-f-sprok-rhs-t',   m.sproket_rhs_teeth);
    set('am-f-tele-params',   m.enabled_parameters);
    set('am-f-filters',       m.filters_list);
    set('am-f-lubes',         m.lube_types);
    set('am-f-belts',         m.belt_dimensions);
    set('am-f-hyd-filters',   m.hyd_filters_dimensions);
    // type select
    var typeEl = document.getElementById('am-f-type');
    if (typeEl && m.type) typeEl.value = m.type;
  }

  // ── Image preview ────────────────────────────────────────
  window.amPreviewImage = function(input) {
    var file = input.files && input.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(e) {
      var img = document.getElementById('am-img-preview');
      if (img) { img.src = e.target.result; img.style.display = 'block'; }
    };
    reader.readAsDataURL(file);
  };

  window.amHandleImgDrop = function(e) {
    e.preventDefault();
    document.getElementById('am-img-zone').classList.remove('am-drag-over');
    var file = e.dataTransfer && e.dataTransfer.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    var input = document.getElementById('am-img-input');
    var dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    window.amPreviewImage(input);
  };

  // ── Library file chosen ──────────────────────────────────
  window.amLibFileChosen = function(input) {
    var key = input.dataset.libkey;
    var file = input.files && input.files[0];
    var prev = document.getElementById('am-lib-preview-' + key);
    if (prev) {
      if (file) {
        prev.textContent = '📎 ' + file.name + ' (' + (file.size/1024).toFixed(0) + ' KB)';
        prev.style.display = 'block';
      } else {
        prev.style.display = 'none';
      }
    }
  };

  // ── Progress helper ──────────────────────────────────────
  function setProgress(msg, pct, show) {
    var t = document.getElementById('am-progress-text');
    var w = document.getElementById('am-progress-bar-wrap');
    var b = document.getElementById('am-progress-bar');
    if (t) t.textContent = msg;
    if (w) w.style.display = show ? 'block' : 'none';
    if (b) b.style.width = pct + '%';
  }

  // ── File → base64 ────────────────────────────────────────
  function fileToBase64(file) {
    return new Promise(function(resolve, reject) {
      var reader = new FileReader();
      reader.onload = function(e) { resolve(e.target.result.split(',')[1]); };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // ── Upload one file via IPC ──────────────────────────────
  async function uploadFile(bucket, path, file) {
    var base64 = await fileToBase64(file);
    var res = await window.electron.invoke('storage:upload', {
      bucket: bucket,
      path: path,
      base64Data: base64,
      contentType: file.type || 'application/octet-stream'
    });
    if (!res || !res.ok) throw new Error(res && res.error ? res.error : 'Upload failed: ' + path);
    return res.url;
  }

  // ── Main save handler ────────────────────────────────────
  window.submitMachineSave = async function() {
    var errEl = document.getElementById('am-error');
    errEl.textContent = '';

    var nameVal = (document.getElementById('am-f-name').value || '').trim();
    if (!nameVal) { errEl.textContent = '⚠ Machine ID / SN is required.'; return; }

    if (AM_EDIT_MODE) {
      if (!confirm('Save changes to "' + AM_EDIT_NAME + '"?\n\nThis will overwrite the current record in Supabase.')) return;
    }

    var btn = document.getElementById('am-save-btn');
    btn.disabled = true;
    setProgress('Preparing…', 5, true);

    try {
      // 1. Build machine row
      var row = {
        name:            nameVal,
        fleetrack_managed: document.getElementById('am-f-fleetrack').value || null,
        supplied:        document.getElementById('am-f-supplied').value || null,
        model:           document.getElementById('am-f-model').value.trim() || null,
        oem:             document.getElementById('am-f-oem').value.trim() || null,
        type:            document.getElementById('am-f-type').value || null,
        esn:             document.getElementById('am-f-esn').value.trim() || null,
        chassis_number:  document.getElementById('am-f-chassis').value.trim() || null,
        customer:        document.getElementById('am-f-customer').value.trim() || null,
        fleet_no:        document.getElementById('am-f-fleet-no').value.trim() || null,
        mxg_fleet_no:    document.getElementById('am-f-mxg-fleet-no').value.trim() || null,
        region:          document.getElementById('am-f-region').value || null,
        location:        document.getElementById('am-f-location').value.trim() || null,
        warranty_status: document.getElementById('am-f-warranty').value || null,
        oem_registered:  document.getElementById('am-f-oem-reg').value || null,
        supplier:        document.getElementById('am-f-supplier').value.trim() || null,
        engine_type:     document.getElementById('am-f-engine-type').value.trim() || null,
        gearbox:         document.getElementById('am-f-gearbox').value.trim() || null,
        has_telematics_device: document.getElementById('am-f-telematics').value || null,
        bin_capacity:    parseFloat(document.getElementById('am-f-bin').value) || null,
        standard_fuel_consumption: parseFloat(document.getElementById('am-f-fuel').value) || null,
        canbus_enabled:  document.getElementById('am-f-canbus').value || null,
        operating_weight:parseFloat(document.getElementById('am-f-weight').value) || null,
        working_voltage: parseFloat(document.getElementById('am-f-voltage').value) || null,
        tyre_size:       document.getElementById('am-f-tyre').value.trim() || null,
        unique_attachments_fitted: parseFloat(document.getElementById('am-f-attachments').value) || null,
        tsn:             document.getElementById('am-f-tsn').value.trim() || null,
        mobility:        document.getElementById('am-f-mobility').value || null,
        current_hmr:     parseFloat(document.getElementById('am-f-hmr').value) || null,
        warranty_type:   document.getElementById('am-f-wty-type').value || null,
        warranty_period: parseFloat(document.getElementById('am-f-wty-period').value) || null,
        warranty_hours:  parseFloat(document.getElementById('am-f-wty-hrs').value) || null,
        handover_date:   document.getElementById('am-f-handover').value || null,
        expiry_date:     document.getElementById('am-f-expiry').value || null,
        notes:           document.getElementById('am-f-notes').value.trim() || null,
        track_initial_service:      document.getElementById('am-f-track-is').value || null,
        initial_service_type:       parseFloat(document.getElementById('am-f-is-type').value) || null,
        initial_service_status:     document.getElementById('am-f-is-status').value || null,
        starting_hmr:               parseFloat(document.getElementById('am-f-start-hmr').value) || null,
        total_running_hours:        parseFloat(document.getElementById('am-f-total-run-hrs').value) || null,
        last_hmr_date:              document.getElementById('am-f-last-hmr-date').value || null,
        service_interval_hours:     parseFloat(document.getElementById('am-f-svc-interval').value) || null,
        last_service_hmr:           parseFloat(document.getElementById('am-f-last-svc-hmr').value) || null,
        next_service_hmr:           parseFloat(document.getElementById('am-f-next-svc-hmr').value) || null,
        last_service_type:          document.getElementById('am-f-last-svc-type').value.trim() || null,
        next_service_type:          document.getElementById('am-f-next-svc-type').value.trim() || null,
        hours_remaining_to_service: parseFloat(document.getElementById('am-f-hrs-rem').value) || null,
        last_service_date:          document.getElementById('am-f-last-svc-date').value || null,
        service_obligation:         document.getElementById('am-f-svc-ob').value || null,
        chain_make:                 document.getElementById('am-f-chain-make').value.trim() || null,
        chain_length:               parseFloat(document.getElementById('am-f-chain-len').value) || null,
        chain_width:                parseFloat(document.getElementById('am-f-chain-wid').value) || null,
        sproket_lhs_teeth:          parseFloat(document.getElementById('am-f-sprok-lhs-t').value) || null,
        sproket_rhs_teeth:          parseFloat(document.getElementById('am-f-sprok-rhs-t').value) || null,
        enabled_parameters:         document.getElementById('am-f-tele-params').value.trim() || null,
        filters_list:               document.getElementById('am-f-filters').value.trim() || null,
        lube_types:                 document.getElementById('am-f-lubes').value.trim() || null,
        belt_dimensions:            document.getElementById('am-f-belts').value.trim() || null,
        hyd_filters_dimensions:     document.getElementById('am-f-hyd-filters').value.trim() || null,
      };

      // 2. Upload cover image (if selected)
      var imgInput = document.getElementById('am-img-input');
      if (imgInput && imgInput.files && imgInput.files[0]) {
        setProgress('Uploading cover image…', 15, true);
        var imgFile = imgInput.files[0];
        var imgExt = imgFile.name.split('.').pop() || 'jpg';
        var imgUrl = await uploadFile('machine-images', nameVal + '/cover.' + imgExt, imgFile);
        row.machine_picture = imgUrl;
      }

      // 3. Upload library files
      var libUrls = (window.LIB_SUPABASE_MAP && window.LIB_SUPABASE_MAP[nameVal])
        ? Object.assign({}, window.LIB_SUPABASE_MAP[nameVal])
        : {};
      var libInputs = document.querySelectorAll('#am-lib-grid input[type=file][data-libkey]');
      var libCount = 0;
      var libTotal = 0;
      libInputs.forEach(function(inp) { if (inp.files && inp.files[0]) libTotal++; });

      for (var i = 0; i < libInputs.length; i++) {
        var inp = libInputs[i];
        if (!inp.files || !inp.files[0]) continue;
        var lFile = inp.files[0];
        var lKey  = inp.dataset.libkey;
        var lExt  = lFile.name.split('.').pop() || 'bin';
        libCount++;
        setProgress('Uploading library file ' + libCount + ' of ' + libTotal + '…',
          15 + Math.round(libCount / Math.max(libTotal,1) * 70), true);
        var lUrl = await uploadFile('machine-library', nameVal + '/' + lKey + '.' + lExt, lFile);
        libUrls[lKey] = lUrl;
      }

      if (Object.keys(libUrls).length) {
        row.library_supabase_urls = libUrls;
      }

      // 4. Upsert to ft_machine
      setProgress('Saving to database…', 90, true);
      var res = await window.electron.invoke('supabase:query', {
        table: 'ft_machine',
        method: 'upsert',
        params: { data: row, options: { onConflict: 'name' } }
      });
      if (!res || !res.ok) throw new Error(res && res.error ? res.error : 'Database save failed');

      // 5. Update in-memory maps
      if (!window.FT_MACHINE_ROWS) window.FT_MACHINE_ROWS = [];
      var idx = window.FT_MACHINE_ROWS.findIndex(function(m){ return m.name === nameVal; });
      if (idx >= 0) {
        Object.assign(window.FT_MACHINE_ROWS[idx], row);
      } else {
        window.FT_MACHINE_ROWS.push(row);
      }
      if (!window.MACHINES_MAP) window.MACHINES_MAP = {};
      window.MACHINES_MAP[nameVal] = Object.assign(window.MACHINES_MAP[nameVal] || {}, row);
      if (Object.keys(libUrls).length) {
        if (!window.LIB_SUPABASE_MAP) window.LIB_SUPABASE_MAP = {};
        window.LIB_SUPABASE_MAP[nameVal] = libUrls;
      }

      setProgress(AM_EDIT_MODE ? '✓ Machine updated!' : '✓ Machine created!', 100, true);

      // 6. Refresh registry
      if (typeof refreshMachineRegisterReport === 'function') refreshMachineRegisterReport();

      var label = AM_EDIT_MODE ? 'updated' : 'created';
      showToast((AM_EDIT_MODE ? '✎ ' : '✓ ') + nameVal + ' ' + label + ' successfully.', 'ok', 4000);

      setTimeout(function() { closeAddMachineModal(); }, 1200);

    } catch(e) {
      errEl.textContent = '⚠ ' + e.message;
      btn.disabled = false;
      setProgress('', 0, false);
    }
  };

  // Close on overlay click (not panel click)
  document.getElementById('am-overlay').addEventListener('click', function(e) {
    if (e.target === this) closeAddMachineModal();
  });

  // ── Setup Autofill Event Listener ────────────────────────
  var modelInput = document.getElementById('am-f-model');
  if (modelInput) {
    modelInput.addEventListener('input', function(e) {
      var val = (e.target.value || '').trim();
      if (window.AM_MODELS_MAP && window.AM_MODELS_MAP[val]) {
        var oemInput = document.getElementById('am-f-oem');
        if (oemInput && !oemInput.value.trim()) {
           oemInput.value = window.AM_MODELS_MAP[val];
        }
      }
    });
  }

})();
