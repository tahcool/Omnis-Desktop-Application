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
            document.getElementById('top-bar-title').innerText = titleMap[target] || 'Medicals';

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
});

// Utility: Modal Management
function showAddPatientModal() {
    document.getElementById('patient-form').reset();
    document.getElementById('pat-id').value = '';
    document.getElementById('patient-modal-title').innerText = 'Add Patient Record';
    document.getElementById('modal-patient').classList.add('active');
}

function showGenerateNoteModal() {
    document.getElementById('note-form').reset();
    populatePatientsDropdown();
    document.getElementById('modal-sick-note').classList.add('active');
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
        .replace(/&/g, "&")
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
        renderPatientsTable(patientsList);
    } catch (e) {
        console.error("Error loading patients:", e);
    }
}

function renderPatientsTable(patients) {
    const tbody = document.getElementById('patients-table-body');
    tbody.innerHTML = '';
    
    if (patients.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #94a3b8;">No patients found.</td></tr>';
        return;
    }

    patients.forEach(pat => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight: 700;">${escapeHtml(pat.name)}</td>
            <td style="font-weight: 700;">${escapeHtml(pat.surname)}</td>
            <td>${escapeHtml(pat.ibu || '-')}</td>
            <td>${escapeHtml(pat.division || '-')}</td>
            <td>${escapeHtml(pat.phone_number || '-')}</td>
            <td>
                <button class="btn btn-outline" style="padding: 6px 12px; font-size: 12px;" onclick="editPatient('${pat.id}')"><i class="fas fa-edit"></i> Edit</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Filter patients
document.getElementById('patient-search')?.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = patientsList.filter(p => 
        (p.name && p.name.toLowerCase().includes(term)) || 
        (p.surname && p.surname.toLowerCase().includes(term)) ||
        (p.ibu && p.ibu.toLowerCase().includes(term))
    );
    renderPatientsTable(filtered);
});

async function savePatient() {
    if (!window.electron) return alert("Electron context not found.");
    
    const id = document.getElementById('pat-id').value;
    const name = document.getElementById('pat-name').value;
    const surname = document.getElementById('pat-surname').value;
    
    if (!name || !surname) {
        alert("Name and Surname are required.");
        return;
    }

    const payload = {
        name,
        surname,
        age: parseInt(document.getElementById('pat-age').value) || null,
        phone_number: document.getElementById('pat-phone').value,
        ibu: document.getElementById('pat-ibu').value,
        division: document.getElementById('pat-division').value,
        address_location: document.getElementById('pat-address').value,
        nok_contact: document.getElementById('pat-nok-contact').value,
        nok_address: document.getElementById('pat-nok-address').value,
        blood_type: document.getElementById('pat-blood').value,
        allergies: document.getElementById('pat-allergies').value,
        background: document.getElementById('pat-background').value,
        chronic_illnesses: document.getElementById('pat-chronic').value,
        family_history: document.getElementById('pat-family').value,
        current_medications: document.getElementById('pat-meds').value,
        updated_at: new Date().toISOString()
    };

    try {
        let res;
        if (id) {
            res = await window.electron.invoke('supabase:query', {
                table: 'omnis_patients', method: 'update',
                params: { data: payload, filters: { id } }
            });
        } else {
            res = await window.electron.invoke('supabase:query', {
                table: 'omnis_patients', method: 'insert',
                params: { data: payload }
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
    document.getElementById('pat-age').value = pat.age || '';
    document.getElementById('pat-phone').value = pat.phone_number || '';
    document.getElementById('pat-ibu').value = pat.ibu || '';
    document.getElementById('pat-division').value = pat.division || '';
    document.getElementById('pat-address').value = pat.address_location || '';
    document.getElementById('pat-nok-contact').value = pat.nok_contact || '';
    document.getElementById('pat-nok-address').value = pat.nok_address || '';
    document.getElementById('pat-blood').value = pat.blood_type || '';
    document.getElementById('pat-allergies').value = pat.allergies || '';
    document.getElementById('pat-background').value = pat.background || '';
    document.getElementById('pat-chronic').value = pat.chronic_illnesses || '';
    document.getElementById('pat-family').value = pat.family_history || '';
    document.getElementById('pat-meds').value = pat.current_medications || '';

    document.getElementById('modal-patient').classList.add('active');
}

// ----------------- SICK NOTES -----------------

async function populatePatientsDropdown() {
    // Ensure we have patients loaded
    if (patientsList.length === 0) {
        await loadPatients();
    }
    
    const select = document.getElementById('note-patient');
    select.innerHTML = '<option value="">-- Select Patient --</option>';
    
    patientsList.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.innerText = `${p.name} ${p.surname} (${p.ibu || 'No IBU'})`;
        select.appendChild(opt);
    });
}

let notesList = [];

async function loadSickNotes() {
    if (!window.electron) return;
    try {
        const res = await window.electron.invoke('supabase:query', {
            table: 'omnis_sick_notes',
            method: 'select',
            params: { columns: '*, omnis_patients(name, surname, ibu)', order: { column: 'created_at', options: { ascending: false } } }
        });
        
        if (res.error) throw new Error(res.error.message || "Failed to load sick notes");
        
        notesList = res.data || [];
        renderNotesTable(notesList);
    } catch (e) {
        console.error("Error loading notes:", e);
    }
}

function renderNotesTable(notes) {
    const tbody = document.getElementById('notes-table-body');
    tbody.innerHTML = '';
    
    if (notes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #94a3b8;">No sick notes found.</td></tr>';
        return;
    }

    notes.forEach(note => {
        const patName = note.omnis_patients ? `${note.omnis_patients.name} ${note.omnis_patients.surname}` : 'Unknown';
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${note.date_issued}</td>
            <td style="font-weight: 700;">${escapeHtml(patName)}</td>
            <td>${escapeHtml(note.condition)}</td>
            <td>${note.days_off} Days</td>
            <td>
                <button class="btn btn-outline" style="padding: 6px 12px; font-size: 12px;" onclick="printExistingNote('${note.id}')"><i class="fas fa-print"></i> Print</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

document.getElementById('notes-search')?.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = notesList.filter(n => 
        (n.omnis_patients && (`${n.omnis_patients.name} ${n.omnis_patients.surname}`.toLowerCase().includes(term))) || 
        (n.condition && n.condition.toLowerCase().includes(term))
    );
    renderNotesTable(filtered);
});

async function generateSickNote() {
    const patientId = document.getElementById('note-patient').value;
    const condition = document.getElementById('note-condition').value;
    const days = document.getElementById('note-days').value;
    const remarks = document.getElementById('note-remarks').value;

    if (!patientId || !condition || !days) {
        alert("Patient, condition, and days are required.");
        return;
    }

    const patient = patientsList.find(p => p.id === patientId);
    if (!patient) return;

    const today = new Date().toISOString().split('T')[0];
    
    // Generate QR Code data payload
    const qrData = JSON.stringify({
        id: patientId.substring(0,8),
        date: today,
        name: `${patient.name} ${patient.surname}`,
        days: days
    });

    const payload = {
        patient_id: patientId,
        date_issued: today,
        condition: condition,
        days_off: parseInt(days),
        remarks: remarks,
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

function printExistingNote(noteId) {
    const note = notesList.find(n => n.id === noteId);
    if (!note) return;
    
    // We need the full patient info for printing
    const patient = patientsList.find(p => p.id === note.patient_id);
    if (!patient) {
        alert("Patient data not found locally. Please refresh.");
        return;
    }

    triggerPrint(patient, note);
}

function triggerPrint(patient, note) {
    // Populate Print Template
    document.getElementById('print-date').innerText = note.date_issued;
    document.getElementById('print-name').innerText = `${patient.name} ${patient.surname}`;
    document.getElementById('print-ibu').innerText = patient.ibu || '-';
    document.getElementById('print-division').innerText = patient.division || '-';
    document.getElementById('print-condition').innerText = note.condition;
    document.getElementById('print-days').innerText = note.days_off;
    document.getElementById('print-remarks').innerText = note.remarks || 'None';

    // Generate QR Code
    const qrContainer = document.getElementById('print-qrcode');
    qrContainer.innerHTML = ''; // clear previous
    new QRCode(qrContainer, {
        text: note.qr_code_data || "No QR Data",
        width: 100,
        height: 100,
        colorDark : "#000000",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.L
    });

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

        const feedStock = document.getElementById('feed-low-stock');
        if (lowStock.length === 0) {
            feedStock.innerHTML = '<span style="color:var(--text-light);font-size:12px;">All stock levels are optimal.</span>';
        } else {
            feedStock.innerHTML = lowStock.map(i => `
                <div style="padding:10px; border-left:3px solid var(--accent-red); background:#fef2f2; border-radius:4px; font-size:12px;">
                    <strong>${escapeHtml(i.item_name)}</strong><br>
                    <span style="color:var(--accent-red);">Qty: ${i.quantity} (Min: ${i.min_stock_level})</span>
                </div>
            `).join('');
        }

        const feedRecent = document.getElementById('feed-recent-consults');
        const recentConsults = [...consults].sort((a,b) => new Date(b.consultation_date) - new Date(a.consultation_date)).slice(0, 5);
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

async function showNewConsultationModal() {
    if (patientsList.length === 0) await loadPatients();
    document.getElementById('consultation-form').reset();
    populateSelect('consult-patient', patientsList);
    document.getElementById('modal-consultation').classList.add('active');
}

let consultationsList = [];

async function loadConsultations() {
    if (!window.electron) return;
    try {
        const res = await window.electron.invoke('supabase:query', {
            table: 'omnis_consultations',
            method: 'select',
            params: { columns: '*, omnis_patients(name, surname)', order: { column: 'consultation_date', options: { ascending: false } } }
        });
        if (res.error) throw res.error;
        consultationsList = res.data || [];
        renderConsultationsTable(consultationsList);
    } catch (e) {
        console.error("Error loading consultations:", e);
    }
}

function renderConsultationsTable(data) {
    const tbody = document.getElementById('consultations-table-body');
    tbody.innerHTML = '';
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No consultations found.</td></tr>';
        return;
    }
    data.forEach(c => {
        const patName = c.omnis_patients ? `${c.omnis_patients.name} ${c.omnis_patients.surname}` : 'Unknown';
        const date = new Date(c.consultation_date).toLocaleDateString();
        const vitals = `BP: ${c.blood_pressure || '-'} | HR: ${c.heart_rate || '-'} | T: ${c.temperature || '-'}`;
        tbody.innerHTML += `
            <tr>
                <td>${date}</td>
                <td style="font-weight:700;">${escapeHtml(patName)}</td>
                <td>${escapeHtml(c.symptoms || '-')}</td>
                <td>${escapeHtml(c.diagnosis || '-')}</td>
                <td><small style="color:var(--text-light);">${vitals}</small></td>
                <td>
                    <button class="btn btn-outline" style="padding:4px 8px;font-size:12px;">View</button>
                </td>
            </tr>
        `;
    });
}

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
        closeModal('modal-consultation');
        loadConsultations();
    } catch(e) {
        console.error("Save Consultation Error", e);
        alert("Failed to save: " + e.message);
    }
}

// ----------------- APPOINTMENTS -----------------

async function showNewAppointmentModal() {
    if (patientsList.length === 0) await loadPatients();
    document.getElementById('appointment-form').reset();
    populateSelect('appt-patient', patientsList);
    document.getElementById('modal-appointment').classList.add('active');
}

let appointmentsList = [];

async function loadAppointments() {
    if (!window.electron) return;
    try {
        const res = await window.electron.invoke('supabase:query', {
            table: 'omnis_appointments',
            method: 'select',
            params: { columns: '*, omnis_patients(name, surname)', order: { column: 'appointment_date', options: { ascending: true } } }
        });
        if (res.error) throw res.error;
        appointmentsList = res.data || [];
        renderAppointmentsTable(appointmentsList);
    } catch (e) {
        console.error("Error loading appointments:", e);
    }
}

function renderAppointmentsTable(data) {
    const tbody = document.getElementById('appointments-table-body');
    tbody.innerHTML = '';
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No appointments found.</td></tr>';
        return;
    }
    data.forEach(a => {
        const patName = a.omnis_patients ? `${a.omnis_patients.name} ${a.omnis_patients.surname}` : 'Unknown';
        const dateTime = `${a.appointment_date} ${a.appointment_time || ''}`;
        
        let statusBadge = '';
        if (a.status === 'Scheduled') statusBadge = '<span style="background:var(--accent-blue);color:#fff;padding:2px 8px;border-radius:12px;font-size:11px;">Scheduled</span>';
        else if (a.status === 'Completed') statusBadge = '<span style="background:#10b981;color:#fff;padding:2px 8px;border-radius:12px;font-size:11px;">Completed</span>';
        else statusBadge = `<span style="background:var(--border);color:var(--text);padding:2px 8px;border-radius:12px;font-size:11px;">${escapeHtml(a.status)}</span>`;

        tbody.innerHTML += `
            <tr>
                <td>${dateTime}</td>
                <td style="font-weight:700;">${escapeHtml(patName)}</td>
                <td>${escapeHtml(a.reason)}</td>
                <td>${statusBadge}</td>
                <td>
                    <button class="btn btn-outline" style="padding:4px 8px;font-size:12px;" onclick="updateAppointmentStatus('${a.id}', 'Completed')">Mark Done</button>
                </td>
            </tr>
        `;
    });
}

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
            table: 'omnis_appointments', method: 'update', params: { data: { status }, filters: { id } }
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
        renderInventoryTable(inventoryList);
    } catch (e) {
        console.error("Error loading inventory:", e);
    }
}

function renderInventoryTable(data) {
    const tbody = document.getElementById('inventory-table-body');
    tbody.innerHTML = '';
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No stock items found.</td></tr>';
        return;
    }
    data.forEach(item => {
        const isLow = item.quantity <= item.min_stock_level;
        const qtyDisplay = isLow ? `<span style="color:var(--accent-red);font-weight:700;">${item.quantity} ⚠️ Low</span>` : `<span>${item.quantity}</span>`;
        tbody.innerHTML += `
            <tr style="${isLow ? 'background:#fef2f2;' : ''}">
                <td style="font-weight:700;">${escapeHtml(item.item_name)}</td>
                <td><span style="background:#e2e8f0;padding:2px 8px;border-radius:12px;font-size:11px;">${escapeHtml(item.category)}</span></td>
                <td>${qtyDisplay}</td>
                <td>$${Number(item.unit_cost).toFixed(2)}</td>
                <td>${escapeHtml(item.supplier || '-')}</td>
                <td>
                    <button class="btn btn-outline" style="padding:4px 8px;font-size:12px;" onclick="editInventory('${item.id}')"><i class="fas fa-edit"></i> Edit</button>
                </td>
            </tr>
        `;
    });
}

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
                table: 'omnis_inventory', method: 'update', params: { data: payload, filters: { id } }
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
