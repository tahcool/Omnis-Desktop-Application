import sys

modals = """
    <!-- New Consultation Modal -->
    <div id="modal-consultation" class="modal-overlay">
        <div class="modal">
            <div class="modal-header">
                <h3>New Consultation</h3>
                <button class="close-btn" onclick="closeModal('modal-consultation')"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-body">
                <form id="consultation-form">
                    <div class="form-group">
                        <label>Patient *</label>
                        <select id="consult-patient" required></select>
                    </div>
                    
                    <h4 class="form-section-title">Vitals</h4>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Blood Pressure</label>
                            <input type="text" id="consult-bp" placeholder="e.g. 120/80">
                        </div>
                        <div class="form-group">
                            <label>Heart Rate (bpm)</label>
                            <input type="number" id="consult-hr" placeholder="e.g. 72">
                        </div>
                        <div class="form-group">
                            <label>Temperature (°C)</label>
                            <input type="number" step="0.1" id="consult-temp" placeholder="e.g. 36.5">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Weight (kg)</label>
                            <input type="number" step="0.1" id="consult-weight">
                        </div>
                        <div class="form-group">
                            <label>Blood Sugar</label>
                            <input type="number" step="0.1" id="consult-sugar">
                        </div>
                    </div>

                    <h4 class="form-section-title">Clinical Notes</h4>
                    <div class="form-group">
                        <label>Symptoms *</label>
                        <textarea id="consult-symptoms" required></textarea>
                    </div>
                    <div class="form-group">
                        <label>Clinical Observations</label>
                        <textarea id="consult-observations"></textarea>
                    </div>
                    <div class="form-group">
                        <label>Diagnosis</label>
                        <textarea id="consult-diagnosis"></textarea>
                    </div>
                    <div class="form-group">
                        <label>Treatment Plan / Prescription</label>
                        <textarea id="consult-treatment"></textarea>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn btn-outline" onclick="closeModal('modal-consultation')">Cancel</button>
                        <button type="button" class="btn btn-primary" onclick="saveConsultation()">Save Consultation</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- New Appointment Modal -->
    <div id="modal-appointment" class="modal-overlay">
        <div class="modal">
            <div class="modal-header">
                <h3>Schedule Appointment</h3>
                <button class="close-btn" onclick="closeModal('modal-appointment')"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-body">
                <form id="appointment-form">
                    <div class="form-group">
                        <label>Patient *</label>
                        <select id="appt-patient" required></select>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Date *</label>
                            <input type="date" id="appt-date" required>
                        </div>
                        <div class="form-group">
                            <label>Time</label>
                            <input type="time" id="appt-time">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Reason *</label>
                        <textarea id="appt-reason" required></textarea>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn btn-outline" onclick="closeModal('modal-appointment')">Cancel</button>
                        <button type="button" class="btn btn-primary" onclick="saveAppointment()">Schedule</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- Add/Edit Inventory Modal -->
    <div id="modal-inventory" class="modal-overlay">
        <div class="modal">
            <div class="modal-header">
                <h3>Manage Stock Item</h3>
                <button class="close-btn" onclick="closeModal('modal-inventory')"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-body">
                <form id="inventory-form">
                    <input type="hidden" id="inv-id">
                    <div class="form-group">
                        <label>Item Name *</label>
                        <input type="text" id="inv-name" required>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Category</label>
                            <select id="inv-category">
                                <option value="Medicine">Medicine</option>
                                <option value="Consumable">Consumable</option>
                                <option value="Equipment">Equipment</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Current Quantity</label>
                            <input type="number" id="inv-quantity" value="0">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Unit Cost ($)</label>
                            <input type="number" step="0.01" id="inv-cost" value="0.00">
                        </div>
                        <div class="form-group">
                            <label>Min. Stock Level</label>
                            <input type="number" id="inv-min" value="10">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Supplier</label>
                        <input type="text" id="inv-supplier">
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn btn-outline" onclick="closeModal('modal-inventory')">Cancel</button>
                        <button type="button" class="btn btn-primary" onclick="saveInventory()">Save Stock</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
"""

with open(r'c:\Users\Administrator\omnis\systems\medicals\index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Insert before </body>
content = content.replace("</body>", modals + "\n</body>")

with open(r'c:\Users\Administrator\omnis\systems\medicals\index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Modals added")
