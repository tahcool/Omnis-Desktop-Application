import sys

js_code = """
// ----------------- CONSULTATIONS -----------------

function showNewConsultationModal() {
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

function showNewAppointmentModal() {
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
"""

with open(r'c:\Users\Administrator\omnis\systems\medicals\medicals_logic.js', 'a', encoding='utf-8') as f:
    f.write(js_code)

print("JS appended")
