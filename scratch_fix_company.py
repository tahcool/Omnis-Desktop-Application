import sys

with open(r'c:\Users\Administrator\omnis\systems\salestrack\dashboard_logic.js', 'r', encoding='utf-8') as f:
    js_content = f.read()

old_params = """            const params = {
                report_id: reportId || "",
                machine_id: machineId || "",
                status: status || "",
                is_payment_terms: is_payment_terms,
                contacts: this._tempContacts || [],
                machines: machinesUpdates,
                new_machines: newMachines,
                deleted_machines: this._tempDeletedMachines || []
            };"""

new_params = """            const params = {
                report_id: reportId || "",
                machine_id: machineId || "",
                status: status || "",
                is_payment_terms: is_payment_terms,
                company: this._currentFullDoc?.company || this._currentFullDoc?.frappe_quotation?.company || "",
                owner: this._currentFullDoc?.owner || "",
                contacts: this._tempContacts || [],
                machines: machinesUpdates,
                new_machines: newMachines,
                deleted_machines: this._tempDeletedMachines || []
            };"""

js_content = js_content.replace(old_params, new_params)

with open(r'c:\Users\Administrator\omnis\systems\salestrack\dashboard_logic.js', 'w', encoding='utf-8') as f:
    f.write(js_content)

print("Fixed company overwrite bug")
