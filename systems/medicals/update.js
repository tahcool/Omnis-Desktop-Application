const fs = require('fs');
const path = require('path');

const filePath = path.join('c:', 'Users', 'Administrator', 'omnis', 'systems', 'medicals', 'index.html');
let html = fs.readFileSync(filePath, 'utf8');

// 1. Add hidden inputs for consult and appt
html = html.replace('<input type="hidden" id="consult-patient" required>', '<input type="hidden" id="consult-patient" required>\n                          <input type="hidden" id="consult-id">');
html = html.replace('<input type="hidden" id="appt-patient" required>', '<input type="hidden" id="appt-patient" required>\n                          <input type="hidden" id="appt-id">');

// 2. Add delete button in consultation modal
const search2 = <div class="form-actions">\n                        <button type="button" class="btn btn-outline" onclick="closeModal('modal-consultation')">Cancel</button>;
const replace2 = <div class="form-actions">\n                        <button type="button" id="btn-delete-consultation" class="btn btn-outline" style="color: #ef4444; border-color: #fca5a5; display: none;" onclick="deleteConsultation()">Delete</button>\n                        <button type="button" class="btn btn-outline" onclick="closeModal('modal-consultation')">Cancel</button>;
html = html.replace(search2, replace2);

// 3. Add IEG logo to she-print-template
const search3 =                     <h1 style="font-size: 32px; font-weight: 800; margin: 0; color: #1e293b; letter-spacing: 2px;">IEG</h1>\n                    <span style="font-size: 10px; color: #64748b; text-transform: uppercase;">Industrial<br>Exchange<br>Group</span>;
const replace3 =                     <img src="../../assets/images/IEG_logo.png" style="height: 65px; object-fit: contain; filter: brightness(0);" alt="IEG Logo">;
html = html.replace(search3, replace3);

// 4. Remove original modal-confirm-delete (for patient) if it exists inside the page
html = html.replace(/    <!-- Confirm Delete Modal -->[\s\S]*?<div id="modal-confirm-delete"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*/g, '');

// 5. Append all confirmation modals to the end of the body
const modalsHTML =     <!-- Confirm Delete Consultation Modal -->
    <div id="modal-confirm-delete-consultation" class="modal-overlay" style="z-index: 999999 !important;">
        <div class="modal" style="max-width: 450px;">
            <div class="modal-header">
                <h3>Delete Consultation</h3>
                <button class="close-btn" onclick="closeModal('modal-confirm-delete-consultation'); document.getElementById('modal-consultation').classList.add('active');"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-body">
                <p style="color: #64748b; font-size: 14px; margin-bottom: 20px;">
                    <i class="fas fa-exclamation-triangle" style="color: #ef4444; margin-right: 8px;"></i>
                    <strong>WARNING:</strong> Are you sure you want to completely delete this consultation record? This action is permanent and cannot be undone.
                </p>
                <div class="modal-footer" style="padding-top: 15px; display: flex; justify-content: flex-end; gap: 12px;">
                    <button class="btn btn-outline" onclick="closeModal('modal-confirm-delete-consultation'); document.getElementById('modal-consultation').classList.add('active');">Cancel</button>
                    <button class="btn btn-primary" style="background: #ef4444; border-color: #ef4444;" onclick="executeDeleteConsultation()">Yes, Delete</button>
                </div>
            </div>
        </div>
    </div>

    <!-- Confirm Delete Appointment Modal -->
    <div id="modal-confirm-delete-appointment" class="modal-overlay" style="z-index: 999999 !important;">
        <div class="modal" style="max-width: 450px;">
            <div class="modal-header">
                <h3>Delete Appointment</h3>
                <button class="close-btn" onclick="closeModal('modal-confirm-delete-appointment')"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-body">
                <p style="color: #64748b; font-size: 14px; margin-bottom: 20px;">
                    <i class="fas fa-exclamation-triangle" style="color: #ef4444; margin-right: 8px;"></i>
                    <strong>WARNING:</strong> Are you sure you want to completely delete this appointment? This action is permanent and cannot be undone.
                </p>
                <div class="modal-footer" style="padding-top: 15px; display: flex; justify-content: flex-end; gap: 12px;">
                    <button class="btn btn-outline" onclick="closeModal('modal-confirm-delete-appointment')">Cancel</button>
                    <button class="btn btn-primary" style="background: #ef4444; border-color: #ef4444;" onclick="executeDeleteAppointment()">Yes, Delete</button>
                </div>
            </div>
        </div>
    </div>

    <!-- Confirm Delete Modal (Patient) -->
    <div id="modal-confirm-delete" class="modal-overlay" style="z-index: 999999 !important;">
        <div class="modal" style="max-width: 450px;">
            <div class="modal-header">
                <h3>Delete Patient</h3>
                <button class="close-btn" onclick="closeModal('modal-confirm-delete')"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-body">
                <p style="color: #64748b; font-size: 14px; margin-bottom: 20px;">
                    <i class="fas fa-exclamation-triangle" style="color: #ef4444; margin-right: 8px;"></i>
                    <strong>WARNING:</strong> Are you sure you want to completely delete this patient record? This action is permanent and cannot be undone.
                </p>
                <div class="modal-footer" style="padding-top: 15px; display: flex; justify-content: flex-end; gap: 12px;">
                    <button class="btn btn-outline" onclick="closeModal('modal-confirm-delete')">Cancel</button>
                    <button class="btn btn-primary" style="background: #ef4444; border-color: #ef4444;" onclick="executeDeletePatient()">Yes, Delete</button>
                </div>
            </div>
        </div>
    </div>
</body>;

html = html.replace('</body>', modalsHTML);

fs.writeFileSync(filePath, html, 'utf8');
console.log('Update successful');
