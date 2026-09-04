// Initialize Sub-system
document.addEventListener('DOMContentLoaded', () => {
    // Navigation routing
    document.querySelectorAll('.nav-item[data-target]').forEach(item => {
        item.addEventListener('click', (e) => {
            const target = e.currentTarget.getAttribute('data-target');
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            e.currentTarget.classList.add('active');
            
            document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
            document.getElementById(target).classList.add('active');

            // Update top bar title
            const titleMap = {
                'view-dashboard': 'Dashboard',
                'view-patients': 'Patient Directory',
                'view-sick-notes': 'Sick Notes',
                'view-consultations': 'Consultations',
                'view-appointments': 'Appointments',
                'view-inventory': 'Pharmacy Inventory'
            };
            const topBarTitle = document.getElementById('top-bar-title');
            if (topBarTitle) topBarTitle.innerText = titleMap[target] || 'Medicals';

            // Refresh data based on view
            if (target === 'view-patients') loadPatients();
            if (target === 'view-sick-notes') loadSickNotes();
            if (target === 'view-consultations') loadConsultations();
            if (target === 'view-appointments') loadAppointments();
            if (target === 'view-inventory') loadInventory();
            if (target === 'view-dashboard') loadStats();
        });
    });

    // Initial Load
    loadStats();

    // Initialize custom live search dropdowns
    initPatientLiveSearch('note-patient-search', 'note-patient-list', 'note-patient');
    initPatientLiveSearch('consult-patient-search', 'consult-patient-list', 'consult-patient');
    initPatientLiveSearch('appt-patient-search', 'appt-patient-list', 'appt-patient');
});

// Utility: Modal Management
function showAddPatientModal() {
    document.getElementById('patient-form').reset();
    document.getElementById('pat-id').value = '';
    document.getElementById('patient-modal-title').innerText = 'Add Patient Record';
    if (typeof allergiesList !== 'undefined') {
        allergiesList = [];
        if (typeof renderAllergies === 'function') renderAllergies();
    }
    document.getElementById('modal-patient').classList.add('active');
}

function showGenerateNoteModal() {
    document.getElementById('note-form').reset();
    document.getElementById('note-patient').value = '';
    document.getElementById('modal-sick-note').classList.add('active');
}

function showNewConsultationModal() {
    document.getElementById('consultation-form').reset();
    document.getElementById('consult-patient').value = '';
    document.getElementById('dispensary-container').innerHTML = ''; // clear rows
    document.getElementById('modal-consultation').classList.add('active');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}

// Global state
let patientsList = [];

// Helper: Escape HTML
function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

// ----------------- PATIENTS -----------------

async function loadPatients() {
    if (!window.electron) return console.warn("No electron context, unable to fetch patients.");
    try {
        const res = await window.electron.invoke('supabase:query', {
            table: 'omnis_patients',
            method: 'select',
            params: { columns: '*', order: { column: 'created_at', options: { ascending: false } } }
        });
        
        if (res.error) throw new Error(res.error.message || "Failed to load patients");
        
        patientsList = res.data || [];
        
        // Populate dynamic filters
        const ibus = [...new Set(patientsList.map(p => p.ibu).filter(Boolean))].sort();
        const divs = [...new Set(patientsList.map(p => p.division).filter(Boolean))].sort();
        
        const ibuSel = document.getElementById('filter-ibu');
        if (ibuSel) {
            const current = ibuSel.value;
            ibuSel.innerHTML = `<option value="">All IBUs</option>` + ibus.map(i => `<option value="${escapeHtml(i)}">${escapeHtml(i)}</option>`).join('');
            ibuSel.value = current;
        }
        
        const divSel = document.getElementById('filter-division');
        if (divSel) {
            const current = divSel.value;
            divSel.innerHTML = `<option value="">All Divisions</option>` + divs.map(d => `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join('');
            divSel.value = current;
        }

        renderPatientsTable(patientsList);
    } catch (e) {
        console.error("Error loading patients:", e);
    }
}

function renderPatientsTable(list) {
    const tbody = document.getElementById('patients-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (!list || list.length === 0) {
        tbody.innerHTML = `<div style="text-align:center;padding:40px;color:#94a3b8;font-style:italic;background:#fff;border-radius:12px;border:1px dotted #cbd5e1;">No patients found.</div>`;
        return;
    }

    list.forEach(pat => {
        const row = document.createElement('div');
        row.className = "ai-order-row ai-patients-grid";
        
        row.innerHTML = `
            <div style="color:#1e293b; font-weight:700; font-size:14px;">${escapeHtml(pat.name)}</div>
            <div style="color:#1e293b; font-weight:700; font-size:14px;">${escapeHtml(pat.surname)}</div>
            <div style="font-size:13px; color:#334155;"><span style="background:#f1f5f9; padding:4px 8px; border-radius:4px;">${escapeHtml(pat.ibu || '-')}</span></div>
            <div style="font-size:13px; color:#334155;"><span style="background:#f1f5f9; padding:4px 8px; border-radius:4px;">${escapeHtml(pat.division || '-')}</span></div>
            <div style="font-size:13px; color:#64748b;"><i class="fas fa-briefcase" style="color:#94a3b8;margin-right:4px;"></i>${escapeHtml(pat.job_title || '-')}</div>
            <div style="font-size:13px; color:#64748b;"><i class="fas fa-venus-mars" style="color:#94a3b8;margin-right:4px;"></i>${escapeHtml(pat.gender || '-')}</div>
            <div style="font-size:13px; color:#64748b;"><i class="fas fa-phone-alt" style="color:#94a3b8;margin-right:4px;"></i>${escapeHtml(pat.phone_number || '-')}</div>
            <div style="text-align:right;">
                <button class="btn btn-outline" style="padding: 4px 10px; font-size: 11px; border-radius: 20px;" onclick="editPatient('${pat.id}')"><i class="fas fa-edit"></i> Edit</button>
            </div>
        `;
        tbody.appendChild(row);
    });
}

// Filter patients
function applyPatientFilters() {
    const term = (document.getElementById('patient-search')?.value || '').toLowerCase();
    const filterIbu = document.getElementById('filter-ibu')?.value || '';
    const filterDiv = document.getElementById('filter-division')?.value || '';
    const filterGen = document.getElementById('filter-gender')?.value || '';

    const filtered = patientsList.filter(p => {
        const matchSearch = term === '' || 
            (p.name && p.name.toLowerCase().includes(term)) || 
            (p.surname && p.surname.toLowerCase().includes(term)) ||
            (p.ibu && p.ibu.toLowerCase().includes(term));
            
        const matchIbu = filterIbu === '' || p.ibu === filterIbu;
        const matchDiv = filterDiv === '' || p.division === filterDiv;
        const matchGen = filterGen === '' || p.gender === filterGen;
        
        return matchSearch && matchIbu && matchDiv && matchGen;
    });
    
    renderPatientsTable(filtered);
}

['patient-search', 'filter-ibu', 'filter-division', 'filter-gender'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', applyPatientFilters);
});

async function savePatient() {
    if (!window.electron) return alert("Electron context not found.");
    
    const id = document.getElementById('pat-id').value;
    const name = document.getElementById('pat-name').value;
    const surname = document.getElementById('pat-surname').value;
    const dob = document.getElementById('pat-dob').value;
    const gender = document.getElementById('pat-gender').value;
    const phone = document.getElementById('pat-phone').value;
    const nationalId = document.getElementById('pat-national-id').value;
    const ibu = document.getElementById('pat-ibu').value;
    const division = document.getElementById('pat-division').value;
    const jobTitle = document.getElementById('pat-job-title').value;
    const nok = document.getElementById('pat-nok').value;
    
    if (!name || !surname || !dob || !gender || !phone || !ibu || !division || !nok) {
        alert("Please fill out all mandatory fields (marked with *).");
        return;
    }

    const payload = {
        name, surname, dob, gender, phone_number: phone, national_id: nationalId,
        ibu, division, job_title: jobTitle, next_of_kin: nok
    };

    if (typeof allergiesList !== 'undefined') {
        payload.allergies = JSON.stringify(allergiesList);
    }

    try {
        let res;
        if (id) {
            res = await window.electron.invoke('supabase:query', {
                table: 'omnis_patients', method: 'update', params: { data: payload, match: { id } }
            });
        } else {
            res = await window.electron.invoke('supabase:query', {
                table: 'omnis_patients', method: 'insert', params: { data: payload }
            });
        }
        
        if (res.error) throw new Error(res.error.message || "Failed to save patient");
        
        closeModal('modal-patient');
        loadPatients();
        loadStats();
    } catch (e) {
        console.error("Save Error:", e);
        alert("Error saving patient: " + e.message);
    }
}

function editPatient(id) {
    const pat = patientsList.find(p => p.id === id);
    if (!pat) return;

    document.getElementById('patient-modal-title').innerText = 'Edit Patient Record';
    document.getElementById('pat-id').value = pat.id;
    document.getElementById('pat-name').value = pat.name || '';
    document.getElementById('pat-surname').value = pat.surname || '';
    document.getElementById('pat-dob').value = pat.dob || '';
    document.getElementById('pat-gender').value = pat.gender || '';
    document.getElementById('pat-national-id').value = pat.national_id || '';
    document.getElementById('pat-phone').value = pat.phone_number || '';
    document.getElementById('pat-ibu').value = pat.ibu || '';
    document.getElementById('pat-division').value = pat.division || '';
    document.getElementById('pat-job-title').value = pat.job_title || '';
    document.getElementById('pat-nok').value = pat.next_of_kin || '';
    
    if (typeof allergiesList !== 'undefined') {
        try {
            allergiesList = JSON.parse(pat.allergies) || [];
        } catch {
            allergiesList = [];
        }
        if (typeof renderAllergies === 'function') renderAllergies();
    }

    document.getElementById('modal-patient').classList.add('active');
}

// // ----------------- LIVE PATIENT SEARCH HELPER -----------------

function initPatientLiveSearch(searchInputId, listContainerId, hiddenInputId) {
    const searchInput = document.getElementById(searchInputId);
    const listContainer = document.getElementById(listContainerId);
    const hiddenInput = document.getElementById(hiddenInputId);
    
    if (!searchInput || !listContainer || !hiddenInput) return;

    function renderList(filterText = '') {
        listContainer.innerHTML = '';
        listContainer.style.zIndex = '99999'; // Ensure it appears above the modal
        let count = 0;
        
        patientsList.forEach(p => {
            const fullName = `${p.name || ''} ${p.surname || ''}`.trim();
            if (fullName.toLowerCase().includes(filterText.toLowerCase())) {
                const item = document.createElement('div');
                item.className = 'custom-dropdown-item';
                item.innerText = fullName;
                item.addEventListener('mousedown', () => {
                    searchInput.value = fullName;
                    hiddenInput.value = p.id;
                    listContainer.style.display = 'none';
                });
                listContainer.appendChild(item);
                count++;
            }
        });
        
        if (count > 0) {
            listContainer.style.display = 'block';
        } else {
            listContainer.style.display = 'none';
        }
    }

    searchInput.addEventListener('focus', async () => {
        if (patientsList.length === 0) {
            await loadPatients();
        }
        renderList(searchInput.value);
    });
    
    searchInput.addEventListener('input', async (e) => {
        if (patientsList.length === 0) {
            await loadPatients();
        }
        hiddenInput.value = ''; 
        renderList(e.target.value);
    });
    
    searchInput.addEventListener('blur', () => {
        setTimeout(() => {
            listContainer.style.display = 'none';
        }, 200);
    });
}

let notesList = [];

async function loadSickNotes() {
    if (!window.electron) return;
    try {
        const res = await window.electron.invoke('supabase:query', {
            table: 'omnis_sick_notes',
            method: 'select',
            params: { columns: '*, omnis_patients(name, surname, ibu, division)', order: { column: 'created_at', options: { ascending: false } } }
        });
        
        if (res.error) throw new Error(res.error.message || "Failed to load sick notes");
        
        notesList = res.data || [];

        // Populate dynamic filters based on patients in the sick notes
        const ibus = [...new Set(notesList.map(n => n?.omnis_patients?.ibu).filter(Boolean))].sort();
        const divs = [...new Set(notesList.map(n => n?.omnis_patients?.division).filter(Boolean))].sort();
        
        const ibuSel = document.getElementById('filter-notes-ibu');
        if (ibuSel) {
            const current = ibuSel.value;
            ibuSel.innerHTML = `<option value="">All IBUs</option>` + ibus.map(i => `<option value="${escapeHtml(i)}">${escapeHtml(i)}</option>`).join('');
            ibuSel.value = current;
        }
        
        const divSel = document.getElementById('filter-notes-division');
        if (divSel) {
            const current = divSel.value;
            divSel.innerHTML = `<option value="">All Divisions</option>` + divs.map(d => `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join('');
            divSel.value = current;
        }

        renderNotesTable(notesList);
    } catch (e) {
        console.error("Error loading notes:", e);
    }
}

function renderNotesTable(notes) {
    const tbody = document.getElementById('notes-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (!notes || notes.length === 0) {
        tbody.innerHTML = `<div style="text-align:center;padding:40px;color:#94a3b8;font-style:italic;background:#fff;border-radius:12px;border:1px dotted #cbd5e1;">No sick notes found.</div>`;
        return;
    }

    notes.forEach(note => {
        const patName = note.omnis_patients ? `${note.omnis_patients.name} ${note.omnis_patients.surname}` : 'Unknown';
        const row = document.createElement('div');
        row.className = "ai-order-row ai-notes-grid";
        // Simple subtle accent border based on injury status
        row.style.borderLeft = note.is_injury ? "4px solid #ef4444" : "4px solid #f59e0b";
        row.innerHTML = `
            <div style="color:#64748b; font-size:13px; font-weight:600;">${note.date_issued}</div>
            <div style="color:#1e293b; font-weight:700; font-size:14px;">
                ${escapeHtml(patName)}
                ${note.is_injury ? '<span style="display:inline-block; margin-left:8px; padding:2px 6px; font-size:9px; background:#fef2f2; color:#ef4444; border:1px solid #fecaca; border-radius:12px; font-weight:800; text-transform:uppercase;">INJURY</span>' : ''}
            </div>
            <div style="color:#475569; font-size:13px; font-weight:600;">${escapeHtml(note.condition)}</div>
            <div style="color:#64748b; font-size:13px;"><span style="background:#f1f5f9; padding:2px 8px; border-radius:12px; border:1px solid #e2e8f0; font-weight:700; color:#334155;">${note.days_off} Days</span></div>
            <div style="text-align:right;">
                <button class="btn btn-outline" style="padding: 6px 12px; font-size: 12px; border-radius: 20px; background:#f8fafc; border:1px solid #cbd5e1; color:#0f172a; font-weight:700; cursor:pointer;" 
onclick="printExistingNote('${note.id}')"><i class="fas fa-print"></i> Print</button>
            </div>
        `;
        tbody.appendChild(row);
    });
}

function applyNotesFilters() {
    const term = (document.getElementById('notes-search')?.value || '').toLowerCase();
    const filterIbu = document.getElementById('filter-notes-ibu')?.value || '';
    const filterDiv = document.getElementById('filter-notes-division')?.value || '';
    const filterInj = document.getElementById('filter-notes-injury')?.value || '';

    const filtered = notesList.filter(n => {
        const matchSearch = term === '' || 
            (n.omnis_patients && (`${n.omnis_patients.name} ${n.omnis_patients.surname}`.toLowerCase().includes(term))) || 
            (n.condition && n.condition.toLowerCase().includes(term));
            
        const matchIbu = filterIbu === '' || (n.omnis_patients && n.omnis_patients.ibu === filterIbu);
        const matchDiv = filterDiv === '' || (n.omnis_patients && n.omnis_patients.division === filterDiv);
        const matchInj = filterInj === '' || (String(n.is_injury || false) === filterInj);
        
        return matchSearch && matchIbu && matchDiv && matchInj;
    });
    
    renderNotesTable(filtered);
}

['notes-search', 'filter-notes-ibu', 'filter-notes-division', 'filter-notes-injury'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', applyNotesFilters);
});

async function generateSickNote() {
    const patientId = document.getElementById('note-patient').value;
    const timeIn = document.getElementById('note-time-in').value;
    const timeOut = document.getElementById('note-time-out').value;
    const condition = document.getElementById('note-condition').value;
    const category = document.getElementById('note-category').value;
    const status = document.getElementById('note-status').value;
    const days = document.getElementById('note-days').value;
    const reviewDate = document.getElementById('note-review-date').value;
    const referredTo = document.getElementById('note-referred-to').value;
    const remarks = document.getElementById('note-remarks').value;
    const isInjuryElement = document.getElementById('note-injury');
    const isInjury = isInjuryElement ? isInjuryElement.checked : false;

    if (!patientId || !condition || !status) {
        alert("Patient, condition, and status are required.");
        return;
    }

    const patient = patientsList.find(p => p.id === patientId);
    if (!patient) {
        alert("Please select a valid patient from the dropdown list.");
        return;
    }

    const today = new Date().toISOString().split('T')[0];
    
    // Generate QR Code data payload
    const qrData = JSON.stringify({
        id: patientId.substring(0,8),
        date: today,
        name: `${patient.name} ${patient.surname}`,
        status: status
    });

    const payload = {
        patient_id: patientId,
        date_issued: today,
        time_in: timeIn || null,
        time_out: timeOut || null,
        condition: condition,
        diagnosis_category: category || null,
        work_status: status,
        days_off: parseInt(days) || 0,
        review_date: reviewDate || null,
        referred_to: referredTo || null,
        remarks: remarks,
        is_injury: isInjury,
        qr_code_data: qrData
    };

    try {
        const res = await window.electron.invoke('supabase:query', {
            table: 'omnis_sick_notes', method: 'insert',
            params: { data: payload }
        });

        if (res.error) throw new Error(res.error.message || "Failed to save sick note");
        
        closeModal('modal-sick-note');
        loadSickNotes();
        loadStats();

        // Print it immediately
        triggerPrint(patient, payload);

    } catch (e) {
        console.error("Save Error:", e);
        alert("Error generating note: " + e.message);
    }
}

let currentPrintJob = null;

async function printExistingNote(noteId) {
    const note = notesList.find(n => n.id === noteId);
    if (!note) return;
    
    // Ensure patients are loaded
    if (patientsList.length === 0) await loadPatients();

    // We need the full patient info for printing
    const patient = patientsList.find(p => p.id === note.patient_id);
    if (!patient) {
        alert("Patient data not found locally. Please refresh.");
        return;
    }

    triggerPrint(patient, note);
}

function triggerPrint(patient, note) {
    currentPrintJob = { patient, note };
    document.getElementById('modal-print-options').classList.add('active');
}

function executePrint() {
    if (!currentPrintJob) return;
    const { patient, note } = currentPrintJob;
    
    const selection = document.querySelector('input[name="print-selection"]:checked').value;
    const patientCopy = document.getElementById('print-copy-patient');
    const nurseCopy = document.getElementById('print-copy-nurse');
    const divider = document.getElementById('print-copy-divider');
    
    if (selection === 'both') {
        patientCopy.style.display = 'block';
        patientCopy.style.pageBreakAfter = 'always';
        nurseCopy.style.display = 'block';
        if (divider) divider.style.display = 'none'; // Don't need divider across 2 pages
    } else if (selection === 'patient') {
        patientCopy.style.display = 'block';
        patientCopy.style.pageBreakAfter = 'auto';
        nurseCopy.style.display = 'none';
        if (divider) divider.style.display = 'none';
    } else if (selection === 'nurse') {
        patientCopy.style.display = 'none';
        nurseCopy.style.display = 'block';
        if (divider) divider.style.display = 'none';
    }
    // Determine recommendation logic
    let recommendationText = '';
    const days = parseInt(note.days_off) || 0;
    
    if (note.work_status === 'Fit for Work') {
        recommendationText = "The patient is fit to return to work and no sick leave or light duty is required at this time.";
    } else if (note.work_status === 'Fit for Light Duty') {
        recommendationText = `The patient is fit for light duty with restrictions for <strong>${days} days</strong> starting from today.`;
    } else {
        recommendationText = `The patient is unfit for work and is granted <strong>${days} days</strong> of sick leave starting from today.`;
    }

    // Populate Print Template for both copies
    document.querySelectorAll('.print-date').forEach(el => el.innerText = note.date_issued);
    
    // Time logic
    if (note.time_in || note.time_out) {
        document.querySelectorAll('.print-time-container').forEach(el => el.style.display = 'inline');
        document.querySelectorAll('.print-time-in').forEach(el => el.innerText = note.time_in || 'N/A');
        document.querySelectorAll('.print-time-out').forEach(el => el.innerText = note.time_out || 'N/A');
    } else {
        document.querySelectorAll('.print-time-container').forEach(el => el.style.display = 'none');
    }

    document.querySelectorAll('.print-name').forEach(el => el.innerText = `${patient.name} ${patient.surname}`);
    document.querySelectorAll('.print-ibu').forEach(el => el.innerText = patient.ibu || '-');
    document.querySelectorAll('.print-division').forEach(el => el.innerText = patient.division || '-');
    document.querySelectorAll('.print-condition').forEach(el => el.innerText = note.condition);
    document.querySelectorAll('.print-category').forEach(el => el.innerText = note.diagnosis_category ? `(${note.diagnosis_category})` : '');
    
    document.querySelectorAll('.print-status-badge').forEach(el => el.innerText = note.work_status || 'UNFIT FOR WORK');
    document.querySelectorAll('.print-recommendation').forEach(el => el.innerHTML = recommendationText);
    
    // Referral
    if (note.referred_to) {
        document.querySelectorAll('.print-referral-container').forEach(el => el.style.display = 'block');
        document.querySelectorAll('.print-referred-to').forEach(el => el.innerText = note.referred_to);
    } else {
        document.querySelectorAll('.print-referral-container').forEach(el => el.style.display = 'none');
    }

    // Review Date
    if (note.review_date) {
        document.querySelectorAll('.print-review-container').forEach(el => el.style.display = 'block');
        document.querySelectorAll('.print-review-date').forEach(el => el.innerText = note.review_date);
    } else {
        document.querySelectorAll('.print-review-container').forEach(el => el.style.display = 'none');
    }

    document.querySelectorAll('.print-remarks').forEach(el => el.innerText = note.remarks || 'None');

    // Generate QR Code for both copies
    document.querySelectorAll('.print-qrcode').forEach(container => {
        container.innerHTML = ''; // clear previous
        new QRCode(container, {
            text: note.qr_code_data || "No QR Data",
            width: 100,
            height: 100,
            colorDark : "#000000",
            colorLight : "#ffffff",
            correctLevel : QRCode.CorrectLevel.L
        });
    });

    closeModal('modal-print-options');

    // Short delay to ensure QR renders before printing
    setTimeout(() => {
        window.print();
    }, 300);
}

// ----------------- DASHBOARD -----------------


let chartInstance = null;

async function loadStats() {
    if (!window.electron) return;
    try {
        const todayStr = new Date().toISOString().split('T')[0];

        // Fetch counts
        const pRes = await window.electron.invoke('supabase:query', { table: 'omnis_patients', method: 'select', params: { columns: 'id' } });
        const cRes = await window.electron.invoke('supabase:query', { table: 'omnis_consultations', method: 'select', params: { columns: 'id, consultation_date, omnis_patients(name, surname), diagnosis' } });
        const aRes = await window.electron.invoke('supabase:query', { table: 'omnis_appointments', method: 'select', params: { columns: 'id, appointment_date, appointment_time, reason, status, omnis_patients(name, surname)' } });
        const iRes = await window.electron.invoke('supabase:query', { table: 'omnis_inventory', method: 'select', params: { columns: 'item_name, quantity, min_stock_level' } });

        const patients = pRes.data || [];
        const consults = cRes.data || [];
        const appts = aRes.data || [];
        const inventory = iRes.data || [];

        // Calculate Today's numbers
        const consultsToday = consults.filter(c => c.consultation_date && c.consultation_date.startsWith(todayStr));
        const apptsToday = appts.filter(a => a.appointment_date === todayStr);
        const lowStock = inventory.filter(i => i.quantity <= i.min_stock_level);

        document.getElementById('stat-patients').innerText = patients.length;
        document.getElementById('stat-consults').innerText = consultsToday.length;
        document.getElementById('stat-appts').innerText = apptsToday.length;
        document.getElementById('stat-low-stock').innerText = lowStock.length;

        // Populate Feeds
        const feedAppts = document.getElementById('feed-todays-appts');
        if (feedAppts) {
            if (apptsToday.length === 0) {
                feedAppts.innerHTML = '<span style="color:var(--text-light);font-size:12px;">No appointments today.</span>';
            } else {
                feedAppts.innerHTML = apptsToday.map(a => `
                    <div style="padding:10px; border-left:3px solid var(--accent-blue); background:#f8fafc; border-radius:4px; font-size:12px;">
                        <strong>${a.appointment_time || ''}</strong> - ${escapeHtml(a.omnis_patients?.name || '')} ${escapeHtml(a.omnis_patients?.surname || '')}<br>
                        <span style="color:var(--text-light);">${escapeHtml(a.reason)}</span>
                    </div>
                `).join('');
            }
        }

        const feedStock = document.getElementById('feed-low-stock');
        if (feedStock) {
            if (lowStock.length === 0) {
                feedStock.innerHTML = '<span style="color:var(--text-light);font-size:12px;">All stock levels are optimal.</span>';
            } else {
                feedStock.innerHTML = lowStock.slice(0, 3).map(i => `
                    <div style="padding:10px; border-left:3px solid #ef4444; background:#fef2f2; border-radius:4px; font-size:12px;">
                        <strong>${escapeHtml(i.item_name)}</strong><br>
                        <span style="color:#ef4444;">${i.quantity} left (Min: ${i.min_stock_level})</span>
                    </div>
                `).join('');
            }
        }
        
        // Low Stock Alerts Widget at the top of the dashboard
        const alertContainer = document.getElementById('low-stock-alerts-container');
        const alertList = document.getElementById('low-stock-items-list');
        if (alertContainer && alertList) {
            if (lowStock.length > 0) {
                alertContainer.style.display = 'block';
                alertList.innerHTML = lowStock.map(i => `
                    <div style="display:flex; justify-content:space-between; align-items:center; background:#fff; padding:8px 12px; border-radius:6px; border:1px solid #fde68a;">
                        <span style="font-weight:600; color:#1e293b; font-size:14px;">${escapeHtml(i.item_name)}</span>
                        <span style="color:#dc2626; font-size:13px; font-weight:700;">${i.quantity} in stock (Min: ${i.min_stock_level})</span>
                    </div>
                `).join('');
            } else {
                alertContainer.style.display = 'none';
            }
        }

        const feedRecent = document.getElementById('feed-recent-consults');
        const recentConsults = [...consults].sort((a,b) => new Date(b.consultation_date) - new Date(a.consultation_date)).slice(0, 5);
        if (feedRecent) {
            if (recentConsults.length === 0) {
                feedRecent.innerHTML = '<span style="color:var(--text-light);font-size:12px;">No recent activity.</span>';
            } else {
                feedRecent.innerHTML = recentConsults.map(c => `
                    <div style="padding:10px; border-bottom:1px solid var(--border); font-size:12px;">
                        <strong>${escapeHtml(c.omnis_patients?.name || '')} ${escapeHtml(c.omnis_patients?.surname || '')}</strong>
                        <span style="float:right;color:var(--text-light);">${new Date(c.consultation_date).toLocaleDateString()}</span><br>
                        <span style="color:var(--text-light);">${escapeHtml(c.diagnosis || 'No diagnosis logged')}</span>
                    </div>
                `).join('');
            }
        }

        // Render Chart
        renderChart(consults);

    } catch (e) {
        console.error("Stats error", e);
    }
}

function renderChart(consults) {
    const ctx = document.getElementById('consultationsChart');
    if (!ctx) return;

    // Last 7 days data
    const labels = [];
    const counts = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dStr = d.toISOString().split('T')[0];
        labels.push(d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }));
        counts.push(consults.filter(c => c.consultation_date && c.consultation_date.startsWith(dStr)).length);
    }

    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Consultations',
                data: counts,
                borderColor: '#e11c2a',
                backgroundColor: 'rgba(225, 28, 42, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1 } },
                x: { grid: { display: false } }
            }
        }
    });
}


// ----------------- CONSULTATIONS -----------------

// Dispensary specific logic
let dispRowCount = 0;
function addDispensaryRow() {
    const container = document.getElementById('dispensary-container');
    const rowId = 'disp-row-' + (++dispRowCount);
    
    const rowHTML = `
        <div id="${rowId}" class="form-row dispensary-row" style="align-items:flex-end;">
            <div class="form-group custom-dropdown-container" style="flex:2;">
                <label>Select Medication</label>
                <input type="text" id="${rowId}-search" placeholder="Search inventory..." autocomplete="off" class="search-input">
                <div id="${rowId}-list" class="custom-dropdown-list"></div>
                <input type="hidden" id="${rowId}-inv" class="disp-inv-id" required>
            </div>
            <div class="form-group" style="flex:1;">
                <label>Qty to Dispense</label>
                <input type="number" id="${rowId}-qty" class="disp-qty" min="1" placeholder="Qty" required>
            </div>
            <div class="form-group" style="flex:0.5; padding-bottom: 5px;">
                <button type="button" class="btn btn-outline" style="color:#ef4444; border-color:#ef4444;" onclick="document.getElementById('${rowId}').remove()"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', rowHTML);
    
    // Init live search for this row
    initInventoryLiveSearch(`${rowId}-search`, `${rowId}-list`, `${rowId}-inv`, `${rowId}-qty`);
}

function initInventoryLiveSearch(searchInputId, listContainerId, hiddenInputId, qtyInputId) {
    const searchInput = document.getElementById(searchInputId);
    const listContainer = document.getElementById(listContainerId);
    const hiddenInput = document.getElementById(hiddenInputId);
    const qtyInput = document.getElementById(qtyInputId);
    
    if (!searchInput || !listContainer || !hiddenInput) return;

    function renderList(filterText = '') {
        listContainer.innerHTML = '';
        listContainer.style.zIndex = '99999';
        let count = 0;
        
        inventoryList.forEach(item => {
            // Only allow dispensing if stock is > 0
            if (item.quantity <= 0) return;
            
            const name = item.item_name || '';
            if (name.toLowerCase().includes(filterText.toLowerCase())) {
                const row = document.createElement('div');
                row.className = 'custom-dropdown-item';
                row.innerHTML = `<strong>${escapeHtml(name)}</strong> <span style="color:#64748b;font-size:12px;margin-left:8px;">(Stock: ${item.quantity})</span>`;
                row.addEventListener('mousedown', () => {
                    searchInput.value = name;
                    hiddenInput.value = item.id;
                    qtyInput.max = item.quantity;
                    listContainer.style.display = 'none';
                });
                listContainer.appendChild(row);
                count++;
            }
        });
        
        if (count > 0) {
            listContainer.style.display = 'block';
        } else {
            listContainer.style.display = 'none';
        }
    }

    searchInput.addEventListener('focus', () => {
        if (inventoryList.length === 0) loadInventory().then(() => renderList(searchInput.value));
        else renderList(searchInput.value);
    });
    searchInput.addEventListener('input', (e) => renderList(e.target.value));
    searchInput.addEventListener('blur', () => {
        setTimeout(() => { listContainer.style.display = 'none'; }, 200);
    });
}

let consultationsList = [];

async function loadConsultations() {
    if (!window.electron) return;
    try {
        const res = await window.electron.invoke('supabase:query', {
            table: 'omnis_consultations',
            method: 'select',
            params: { columns: '*, omnis_patients(name, surname, ibu, division), omnis_dispensary(quantity_dispensed, omnis_inventory(item_name))', order: { column: 'consultation_date', options: { ascending: false } } }
        });
        if (res.error) throw res.error;
        consultationsList = res.data || [];

        // Populate dynamic filters based on patients in the consultations
        const ibus = [...new Set(consultationsList.map(c => c?.omnis_patients?.ibu).filter(Boolean))].sort();
        const divs = [...new Set(consultationsList.map(c => c?.omnis_patients?.division).filter(Boolean))].sort();
        
        const ibuSel = document.getElementById('filter-consultations-ibu');
        if (ibuSel) {
            const current = ibuSel.value;
            ibuSel.innerHTML = `<option value="">All IBUs</option>` + ibus.map(i => `<option value="${escapeHtml(i)}">${escapeHtml(i)}</option>`).join('');
            ibuSel.value = current;
        }
        
        const divSel = document.getElementById('filter-consultations-division');
        if (divSel) {
            const current = divSel.value;
            divSel.innerHTML = `<option value="">All Divisions</option>` + divs.map(d => `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join('');
            divSel.value = current;
        }

        renderConsultationsTable(consultationsList);
    } catch (e) {
        console.error("Error loading consultations:", e);
    }
}

function renderConsultationsTable(data) {
    const tbody = document.getElementById('consultations-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (!data || data.length === 0) {
        tbody.innerHTML = `<div style="text-align:center;padding:40px;color:#94a3b8;font-style:italic;background:#fff;border-radius:12px;border:1px dotted #cbd5e1;">No consultations found.</div>`;
        return;
    }

    data.forEach(c => {
        const patName = c.omnis_patients ? `${c.omnis_patients.name} ${c.omnis_patients.surname}` : 'Unknown';
        const dateStr = c.consultation_date ? c.consultation_date.substring(0, 16).replace('T', ' ') : '-';
        
        let dispensedHtml = '-';
        if (c.omnis_dispensary && c.omnis_dispensary.length > 0) {
            dispensedHtml = c.omnis_dispensary.map(d => `<span style="background:#f1f5f9;border:1px solid #e2e8f0;border-radius:4px;padding:2px 4px;font-size:11px;display:inline-block;margin:2px 2px 0 0;">${escapeHtml(d.omnis_inventory?.item_name)} (${d.quantity_dispensed})</span>`).join('');
        }
        
        const row = document.createElement('div');
        row.className = "ai-order-row ai-consultations-grid";
        row.style.borderLeft = "4px solid #8b5cf6"; // Purple accent for consultations
        
        row.innerHTML = `
            <div style="color:#64748b; font-size:12px; font-weight:600;">${dateStr}</div>
            <div style="color:#1e293b; font-weight:700; font-size:14px;">${escapeHtml(patName)}</div>
            <div style="color:#475569; font-size:13px; font-style:italic; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${escapeHtml(c.symptoms || '-')}</div>
            <div style="color:#1e293b; font-size:12px;">
                <span style="font-weight:600;">${escapeHtml(c.diagnosis || '-')}</span><br>
                <span style="color:#64748b;">
                ${c.vitals_bp ? `BP: <b>${escapeHtml(c.vitals_bp)}</b> ` : ''}
                ${c.vitals_temp ? `Temp: <b>${escapeHtml(c.vitals_temp)}°C</b>` : ''}
                </span>
            </div>
            <div>${dispensedHtml}</div>
            <div style="text-align:right;">
                <button class="btn btn-outline" style="padding: 6px 12px; font-size: 12px; border-radius: 20px; background:#f8fafc; border:1px solid #cbd5e1; color:#0f172a; font-weight:700; cursor:pointer;"><i class="fas fa-eye"></i> View</button>
            </div>
        `;
        tbody.appendChild(row);
    });
}

function applyConsultationsFilters() {
    const term = (document.getElementById('consultations-search')?.value || '').toLowerCase();
    const filterIbu = document.getElementById('filter-consultations-ibu')?.value || '';
    const filterDiv = document.getElementById('filter-consultations-division')?.value || '';

    const filtered = consultationsList.filter(c => {
        const matchSearch = term === '' || 
            (c.omnis_patients && (`${c.omnis_patients.name} ${c.omnis_patients.surname}`.toLowerCase().includes(term))) || 
            (c.symptoms && c.symptoms.toLowerCase().includes(term)) ||
            (c.diagnosis && c.diagnosis.toLowerCase().includes(term));
            
        const matchIbu = filterIbu === '' || (c.omnis_patients && c.omnis_patients.ibu === filterIbu);
        const matchDiv = filterDiv === '' || (c.omnis_patients && c.omnis_patients.division === filterDiv);
        
        return matchSearch && matchIbu && matchDiv;
    });
    
    renderConsultationsTable(filtered);
}

['consultations-search', 'filter-consultations-ibu', 'filter-consultations-division'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', applyConsultationsFilters);
});

async function saveConsultation() {
    const payload = {
        patient_id: document.getElementById('consult-patient').value,
        blood_pressure: document.getElementById('consult-bp').value,
        heart_rate: parseInt(document.getElementById('consult-hr').value) || null,
        temperature: parseFloat(document.getElementById('consult-temp').value) || null,
        weight: parseFloat(document.getElementById('consult-weight').value) || null,
        blood_sugar: parseFloat(document.getElementById('consult-sugar').value) || null,
        symptoms: document.getElementById('consult-symptoms').value,
        clinical_observations: document.getElementById('consult-observations').value,
        diagnosis: document.getElementById('consult-diagnosis').value,
        treatment_plan: document.getElementById('consult-treatment').value
    };
    if (!payload.patient_id || !payload.symptoms) {
        alert("Patient and Symptoms are required.");
        return;
    }
    try {
        const res = await window.electron.invoke('supabase:query', {
            table: 'omnis_consultations', method: 'insert', params: { data: payload }
        });
        
        if (res.error) throw res.error;
        
        const newConsultationId = res.data && res.data[0] ? res.data[0].id : null;
        
        // Handle dispensary saving if any
        if (newConsultationId) {
            const dispRows = document.querySelectorAll('.dispensary-row');
            const dispPayloads = [];
            for (let i = 0; i < dispRows.length; i++) {
                const invId = dispRows[i].querySelector('.disp-inv-id').value;
                const qty = parseInt(dispRows[i].querySelector('.disp-qty').value);
                
                if (invId && qty > 0) {
                    dispPayloads.push({
                        consultation_id: newConsultationId,
                        inventory_id: invId,
                        quantity_dispensed: qty
                    });
                }
            }
            
            if (dispPayloads.length > 0) {
                const dispRes = await window.electron.invoke('supabase:query', {
                    table: 'omnis_dispensary', method: 'insert', params: { data: dispPayloads }
                });
                if (dispRes.error) {
                    console.error("Dispensary Save Error", dispRes.error);
                    alert("Consultation saved, but failed to save dispensed medicines: " + dispRes.error.message);
                } else {
                    // Update the local inventory cache since triggers deducted the stock on the server
                    if (typeof loadInventory === 'function') loadInventory();
                }
            }
        }
        
        closeModal('modal-consultation');
        loadConsultations();
    } catch(e) {
        console.error("Save Consultation Error", e);
        alert("Failed to save: " + e.message);
    }
}

// ----------------- APPOINTMENTS -----------------

function showNewAppointmentModal() {
    document.getElementById('appointment-form').reset();
    document.getElementById('appt-patient').value = '';
    document.getElementById('modal-appointment').classList.add('active');
}

let appointmentsList = [];

async function loadAppointments() {
    if (!window.electron) return;
    try {
        const res = await window.electron.invoke('supabase:query', {
            table: 'omnis_appointments',
            method: 'select',
            params: { columns: '*, omnis_patients(name, surname, ibu, division)', order: { column: 'appointment_date', options: { ascending: true } } }
        });
        if (res.error) throw res.error;
        appointmentsList = res.data || [];
        
        // Populate dropdowns
        const uniqueIBUs = [...new Set(appointmentsList.map(a => a.omnis_patients?.ibu).filter(Boolean))].sort();
        const uniqueDivs = [...new Set(appointmentsList.map(a => a.omnis_patients?.division).filter(Boolean))].sort();
        
        const ibuSel = document.getElementById('filter-appt-ibu');
        if (ibuSel) {
            const current = ibuSel.value;
            ibuSel.innerHTML = '<option value="">All IBUs</option>' + uniqueIBUs.map(ibu => `<option value="${ibu}">${escapeHtml(ibu)}</option>`).join('');
            ibuSel.value = current;
        }
        const divSel = document.getElementById('filter-appt-division');
        if (divSel) {
            const current = divSel.value;
            divSel.innerHTML = '<option value="">All Divisions</option>' + uniqueDivs.map(d => `<option value="${d}">${escapeHtml(d)}</option>`).join('');
            divSel.value = current;
        }
        
        renderAppointmentsTable(appointmentsList);
    } catch (e) {
        console.error("Error loading appointments:", e);
    }
}

function renderAppointmentsTable(data) {
    const tbody = document.getElementById('appointments-table-body');
    tbody.innerHTML = '';
    if (data.length === 0) {
        tbody.innerHTML = `<div style="text-align:center;padding:40px;color:#94a3b8;font-style:italic;background:#fff;border-radius:12px;border:1px dotted #cbd5e1;">No appointments found.</div>`;
        return;
    }
    data.forEach(a => {
        const patName = a.omnis_patients ? `${a.omnis_patients.name} ${a.omnis_patients.surname}` : 'Unknown';
        const dateTime = `${a.appointment_date} ${a.appointment_time || ''}`;
        
        let statusBadge = '';
        if (a.status === 'Scheduled') statusBadge = '<span style="background:var(--accent-blue);color:#fff;padding:2px 8px;border-radius:12px;font-size:11px;">Scheduled</span>';
        else if (a.status === 'Completed') statusBadge = '<span style="background:#10b981;color:#fff;padding:2px 8px;border-radius:12px;font-size:11px;">Completed</span>';
        else statusBadge = `<span style="background:var(--border);color:var(--text);padding:2px 8px;border-radius:12px;font-size:11px;">${escapeHtml(a.status)}</span>`;

        const row = document.createElement('div');
        row.className = "ai-order-row ai-appointments-grid";
        row.style.borderLeft = "4px solid #3b82f6"; // Blue accent for appointments
        
        row.innerHTML = `
            <div style="color:#64748b; font-size:13px; font-weight:600;">${dateTime}</div>
            <div style="color:#1e293b; font-weight:700; font-size:14px;">${escapeHtml(patName)}</div>
            <div style="font-size:13px; color:#334155;">${escapeHtml(a.reason)}</div>
            <div>${statusBadge}</div>
            <div style="text-align:right;">
                <button class="btn btn-outline" style="padding: 4px 10px; font-size: 11px; border-radius: 20px;" onclick="updateAppointmentStatus('${a.id}', 'Completed')"><i class="fas fa-check"></i> Done</button>
            </div>
        `;
        tbody.appendChild(row);
    });
}

function applyAppointmentsFilters() {
    const q = (document.getElementById('appointments-search').value || '').toLowerCase();
    const ibuF = document.getElementById('filter-appt-ibu').value;
    const divF = document.getElementById('filter-appt-division').value;
    const statF = document.getElementById('filter-appt-status').value;
    
    const filtered = appointmentsList.filter(a => {
        const patName = a.omnis_patients ? `${a.omnis_patients.name} ${a.omnis_patients.surname}`.toLowerCase() : '';
        const matchSearch = patName.includes(q) || (a.reason || '').toLowerCase().includes(q);
        const matchIbu = ibuF === "" || (a.omnis_patients && a.omnis_patients.ibu === ibuF);
        const matchDiv = divF === "" || (a.omnis_patients && a.omnis_patients.division === divF);
        const matchStat = statF === "" || a.status === statF;
        return matchSearch && matchIbu && matchDiv && matchStat;
    });
    renderAppointmentsTable(filtered);
}

['appointments-search', 'filter-appt-ibu', 'filter-appt-division', 'filter-appt-status'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', applyAppointmentsFilters);
});

async function saveAppointment() {
    const payload = {
        patient_id: document.getElementById('appt-patient').value,
        appointment_date: document.getElementById('appt-date').value,
        appointment_time: document.getElementById('appt-time').value || null,
        reason: document.getElementById('appt-reason').value
    };
    if (!payload.patient_id || !payload.appointment_date || !payload.reason) return alert("Missing required fields.");
    try {
        const res = await window.electron.invoke('supabase:query', {
            table: 'omnis_appointments', method: 'insert', params: { data: payload }
        });
        if (res.error) throw res.error;
        closeModal('modal-appointment');
        loadAppointments();
    } catch(e) {
        console.error("Save Appointment Error", e);
    }
}

async function updateAppointmentStatus(id, status) {
    try {
        await window.electron.invoke('supabase:query', {
            table: 'omnis_appointments', method: 'update', params: { data: { status }, id }
        });
        loadAppointments();
    } catch (e) {
        console.error(e);
    }
}

// ----------------- INVENTORY -----------------

function showNewInventoryModal() {
    document.getElementById('inventory-form').reset();
    document.getElementById('inv-id').value = '';
    document.getElementById('modal-inventory').classList.add('active');
}

let inventoryList = [];

async function loadInventory() {
    if (!window.electron) return;
    try {
        const res = await window.electron.invoke('supabase:query', {
            table: 'omnis_inventory',
            method: 'select',
            params: { columns: '*', order: { column: 'item_name', options: { ascending: true } } }
        });
        if (res.error) throw res.error;
        inventoryList = res.data || [];
        
        // Populate dropdowns
        const uniqueCats = [...new Set(inventoryList.map(i => i.category).filter(Boolean))].sort();
        const uniqueSuppliers = [...new Set(inventoryList.map(i => i.supplier).filter(Boolean))].sort();
        
        const catSel = document.getElementById('filter-inv-category');
        if (catSel) {
            const current = catSel.value;
            catSel.innerHTML = '<option value="">All Categories</option>' + uniqueCats.map(c => `<option value="${c}">${escapeHtml(c)}</option>`).join('');
            catSel.value = current;
        }
        
        const supSel = document.getElementById('filter-inv-supplier');
        if (supSel) {
            const current = supSel.value;
            supSel.innerHTML = '<option value="">All Suppliers</option>' + uniqueSuppliers.map(s => `<option value="${s}">${escapeHtml(s)}</option>`).join('');
            supSel.value = current;
        }
        
        renderInventoryTable(inventoryList);
    } catch (e) {
        console.error("Error loading inventory:", e);
    }
}

function renderInventoryTable(data) {
    const tbody = document.getElementById('inventory-table-body');
    tbody.innerHTML = '';
    if (data.length === 0) {
        tbody.innerHTML = `<div style="text-align:center;padding:40px;color:#94a3b8;font-style:italic;background:#fff;border-radius:12px;border:1px dotted #cbd5e1;">No inventory items found.</div>`;
        return;
    }
    data.forEach(item => {
        let levelBadge = '';
        if (item.quantity > 50) levelBadge = `<span style="background:#dcfce7;color:#166534;padding:2px 8px;border-radius:12px;font-size:11px;">${item.quantity}</span>`;
        else if (item.quantity > 10) levelBadge = `<span style="background:#fef9c3;color:#854d0e;padding:2px 8px;border-radius:12px;font-size:11px;">${item.quantity}</span>`;
        else levelBadge = `<span style="background:#fee2e2;color:#991b1b;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700;">${item.quantity} (Low)</span>`;

        const row = document.createElement('div');
        row.className = "ai-order-row ai-inventory-grid";
        row.style.borderLeft = "4px solid #10b981"; // Emerald green for inventory
        
        row.innerHTML = `
            <div style="color:#1e293b; font-weight:700; font-size:14px;">${escapeHtml(item.item_name)}</div>
            <div style="font-size:13px; color:#64748b;">${escapeHtml(item.category || '-')}</div>
            <div>${levelBadge}</div>
            <div style="font-size:13px; color:#334155;">$${Number(item.unit_cost).toFixed(2)}</div>
            <div style="font-size:13px; color:#64748b;">${escapeHtml(item.supplier || '-')}</div>
            <div style="text-align:right;">
                <button class="btn btn-outline" style="padding: 4px 10px; font-size: 11px; border-radius: 20px;" onclick="editInventory('${item.id}')"><i class="fas fa-edit"></i> Edit</button>
            </div>
        `;
        tbody.appendChild(row);
    });
}

function applyInventoryFilters() {
    const q = (document.getElementById('inventory-search').value || '').toLowerCase();
    const catF = document.getElementById('filter-inv-category').value;
    const supF = document.getElementById('filter-inv-supplier').value;
    const statF = document.getElementById('filter-inv-status').value;
    
    const filtered = inventoryList.filter(item => {
        const matchSearch = item.item_name.toLowerCase().includes(q);
        const matchCat = catF === "" || item.category === catF;
        const matchSup = supF === "" || item.supplier === supF;
        
        let matchStat = true;
        if (statF === 'in_stock') matchStat = item.quantity > 10;
        else if (statF === 'low_stock') matchStat = item.quantity > 0 && item.quantity <= 10;
        else if (statF === 'out_of_stock') matchStat = item.quantity === 0;
        
        return matchSearch && matchCat && matchSup && matchStat;
    });
    
    renderInventoryTable(filtered);
}

['inventory-search', 'filter-inv-category', 'filter-inv-supplier', 'filter-inv-status'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', applyInventoryFilters);
});

function editInventory(id) {
    const item = inventoryList.find(i => i.id === id);
    if (!item) return;
    document.getElementById('inv-id').value = item.id;
    document.getElementById('inv-name').value = item.item_name;
    document.getElementById('inv-category').value = item.category;
    document.getElementById('inv-quantity').value = item.quantity;
    document.getElementById('inv-cost').value = item.unit_cost;
    document.getElementById('inv-min').value = item.min_stock_level;
    document.getElementById('inv-supplier').value = item.supplier || '';
    document.getElementById('modal-inventory').classList.add('active');
}

async function saveInventory() {
    const id = document.getElementById('inv-id').value;
    const payload = {
        item_name: document.getElementById('inv-name').value,
        category: document.getElementById('inv-category').value,
        quantity: parseInt(document.getElementById('inv-quantity').value) || 0,
        unit_cost: parseFloat(document.getElementById('inv-cost').value) || 0.00,
        min_stock_level: parseInt(document.getElementById('inv-min').value) || 10,
        supplier: document.getElementById('inv-supplier').value,
        updated_at: new Date().toISOString()
    };
    if (!payload.item_name) return alert("Item name is required.");
    try {
        let res;
        if (id) {
            res = await window.electron.invoke('supabase:query', {
                table: 'omnis_inventory', method: 'update', params: { data: payload, id }
            });
        } else {
            res = await window.electron.invoke('supabase:query', {
                table: 'omnis_inventory', method: 'insert', params: { data: payload }
            });
        }
        if (res.error) throw res.error;
        closeModal('modal-inventory');
        loadInventory();
    } catch(e) {
        console.error("Save Inventory Error", e);
    }
}

// Utility: Populate Select
function populateSelect(elementId, items) {
    const select = document.getElementById(elementId);
    if (!select) return;
    select.innerHTML = '<option value="">-- Select Patient --</option>';
    items.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.innerText = `${p.name} ${p.surname} (${p.ibu || '-'})`;
        select.appendChild(opt);
    });
}

// Allergies Tag Input Logic
const allergiesContainer = document.getElementById('allergies-container');
const allergiesInput = document.getElementById('pat-allergies-input');
const allergiesHidden = document.getElementById('pat-allergies');
let allergiesList = [];

function renderAllergies() {
    if (!allergiesContainer) return;
    allergiesContainer.querySelectorAll('.tag-badge').forEach(e => e.remove());
    allergiesList.forEach((allergy, index) => {
        const badge = document.createElement('div');
        badge.className = 'tag-badge';
        badge.innerHTML = `${escapeHtml(allergy)} <span class="remove-tag" data-index="${index}">&times;</span>`;
        allergiesContainer.insertBefore(badge, allergiesInput);
    });
    allergiesHidden.value = allergiesList.join(', ');
    allergiesContainer.querySelectorAll('.remove-tag').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = e.target.getAttribute('data-index');
            allergiesList.splice(idx, 1);
            renderAllergies();
        });
    });
}

if (allergiesContainer) {
    allergiesContainer.addEventListener('click', () => allergiesInput.focus());
    allergiesInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const val = allergiesInput.value.trim().replace(',', '');
            if (val && !allergiesList.includes(val)) {
                allergiesList.push(val);
                allergiesInput.value = '';
                renderAllergies();
            }
        } else if (e.key === 'Backspace' && allergiesInput.value === '' && allergiesList.length > 0) {
            allergiesList.pop();
            renderAllergies();
        }
    });
}
