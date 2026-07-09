import sys
import re

with open(r'c:\Users\Administrator\omnis\systems\salestrack\dashboard_logic.js', 'r', encoding='utf-8') as f:
    js_content = f.read()

# 1. Intercept sendEmailUpdate
old_email = """    async sendEmailUpdate(btn, originalHtml, emailContacts, reportId, customerName, company, machines, ccList) {
        if (btn) { btn.disabled = true; btn.innerHTML = `<span>&#9203;</span> Sending...`; }
        try {"""

new_email = """    async sendEmailUpdate(btn, originalHtml, emailContacts, reportId, customerName, company, machines, ccList) {
        if (btn) { btn.disabled = true; btn.innerHTML = `<span>&#9203;</span> Checking...`; }
        try {
            // Check if already sent
            if (window.electron) {
                const checkRes = await window.electron.invoke('supabase:query', {
                    table: 'omnis_equipment_orders', method: 'select', params: { columns: 'notified_email', filters: { id: reportId } }
                });
                if (checkRes && checkRes.data && checkRes.data.length > 0 && checkRes.data[0].notified_email) {
                    const confirmResend = confirm("⚠️ You have already sent an email for this order.\\nAre you sure you want to send another one?");
                    if (!confirmResend) {
                        if (btn) { btn.disabled = false; btn.innerHTML = originalHtml || `<span style="font-size:18px;">&#128231;</span> Send Email`; }
                        return;
                    }
                }
            }

            const recipientEmails = emailContacts.map(c => c.email).join(',');
            const greetingName = emailContacts.map(c => c.salutation ? `${c.salutation} ${c.name}` : c.name).join(' and ') || 'Valued Customer';
            const subject = `Order Status Report \\u2014 ${customerName}`;
            const doc = this._currentFullDoc || {};
            const enriched = machines.map(m => {
                const dm = (doc.machines || []).find(d => {
                    const n = d.item_name || d.item || '';
                    return n.includes(m.name) || m.name.includes(n);
                });
                return { ...m, actual: dm?.actual_handover_date || '', notes: dm?.notes || '' };
            });
            const html = this._buildEmailHTML(customerName, greetingName, company, enriched, doc);
            
            // USE OUTBOX QUEUE INSTEAD OF SENDING IMMEDIATELY
            const payload = {
                to: recipientEmails, cc: ccList.join(','), subject, html,
                relatedDoc: reportId, relatedType: 'order'
            };
            
            if (window.OutboxManager) {
                window.OutboxManager.addToQueue('email', payload, `Email to ${customerName}`, `To: ${recipientEmails}`);
                if (btn) btn.innerHTML = `<span>&#9989;</span> Queued!`;
            } else {
                // Fallback
                if (!window.electron || !window.electron.invoke) throw new Error('Electron IPC unavailable');
                const res = await window.electron.invoke('email:send', payload);
                if (res && res.ok) {
                    if (btn) btn.innerHTML = `<span>&#9989;</span> Sent!`;
                    this.showToast(`Email sent for ${emailContacts.length} recipient${emailContacts.length > 1 ? 's' : ''}!`, 'success');
                } else {
                    throw new Error(res?.error || 'Failed to send email.');
                }
            }
            
            setTimeout(() => { if (btn) { btn.disabled = false; btn.innerHTML = originalHtml || `<span style="font-size:18px;">&#128231;</span> Send Email`; } }, 3000);
            return; // Exit normal flow
"""

# The previous old_email also had lines below `try {`. We will just replace it up to `try {` and leave the rest? No, because we want to completely replace the sending logic.
# Actually, looking at dashboard_logic.js lines 7974 to 8000:
old_email_full = """    async sendEmailUpdate(btn, originalHtml, emailContacts, reportId, customerName, company, machines, ccList) {
        if (btn) { btn.disabled = true; btn.innerHTML = `<span>&#9203;</span> Sending...`; }
        try {
            const recipientEmails = emailContacts.map(c => c.email).join(',');
            const greetingName = emailContacts.map(c => c.salutation ? `${c.salutation} ${c.name}` : c.name).join(' and ') || 'Valued Customer';
            const subject = `Order Status Report \\u2014 ${customerName}`;
            const doc = this._currentFullDoc || {};
            const enriched = machines.map(m => {
                const dm = (doc.machines || []).find(d => {
                    const n = d.item_name || d.item || '';
                    return n.includes(m.name) || m.name.includes(n);
                });
                return { ...m, actual: dm?.actual_handover_date || '', notes: dm?.notes || '' };
            });
            const html = this._buildEmailHTML(customerName, greetingName, company, enriched, doc);
            if (!window.electron || !window.electron.invoke) throw new Error('Electron IPC unavailable');
            const res = await window.electron.invoke('email:send', {
                to: recipientEmails, cc: ccList.join(','), subject, html,
                relatedDoc: reportId, relatedType: 'order'
            });
            if (res && res.ok) {
                if (btn) btn.innerHTML = `<span>&#9989;</span> Queued!`;
                this.showToast(`Email queued for ${emailContacts.length} recipient${emailContacts.length > 1 ? 's' : ''}!`, 'success');
            } else {
                throw new Error(res?.error || 'Failed to queue email.');
            }
            setTimeout(() => { if (btn) { btn.disabled = false; btn.innerHTML = originalHtml || `<span style="font-size:18px;">&#128231;</span> Send Email`; } }, 3000);
        } catch (err) {"""

new_email_full = new_email + "\n        } catch (err) {"

js_content = js_content.replace(old_email_full, new_email_full)


# 2. Intercept initWhatsAppUpdate logic inside dashboard_logic.js
old_wa = """                const res = await window.electron.invoke('whatsapp:sendMessage', {
                    phone: c.phone,
                    message: msg,
                    report_id: reportId
                });"""

new_wa = """                // USING OUTBOX INSTEAD OF SENDING IMMEDIATELY
                if (window.OutboxManager) {
                    window.OutboxManager.addToQueue('whatsapp', { phone: c.phone, message: msg, report_id: reportId }, `WhatsApp to ${c.name}`, `To: ${c.phone}`);
                    var res = {ok: true};
                } else {
                    var res = await window.electron.invoke('whatsapp:sendMessage', {
                        phone: c.phone,
                        message: msg,
                        report_id: reportId
                    });
                }"""

js_content = js_content.replace(old_wa, new_wa)

# Wait, we also need to add the duplicate check for WhatsApp!
old_wa_start = """    async initWhatsAppUpdate(reportId, machineId) {
        if (!window.electron) {
            console.error("WhatsApp built-in requires Desktop environment");
            return;
        }"""

new_wa_start = """    async initWhatsAppUpdate(reportId, machineId) {
        if (!window.electron) {
            console.error("WhatsApp built-in requires Desktop environment");
            return;
        }
        try {
            const checkRes = await window.electron.invoke('supabase:query', {
                table: 'omnis_equipment_orders', method: 'select', params: { columns: 'notified_wa', filters: { id: reportId } }
            });
            if (checkRes && checkRes.data && checkRes.data.length > 0 && checkRes.data[0].notified_wa) {
                const confirmResend = confirm("⚠️ You have already sent a WhatsApp update for this order.\\nAre you sure you want to send another one?");
                if (!confirmResend) return;
            }
        } catch(e) { console.error("Could not check notified_wa", e); }
"""

js_content = js_content.replace(old_wa_start, new_wa_start)

# 3. Update orders_logic.js to use the DB flags for the icons instead of localStorage
with open(r'c:\Users\Administrator\omnis\systems\salestrack\orders_logic.js', 'r', encoding='utf-8') as f:
    orders_js = f.read()

# I will replace localStorage.getItem('notified_wa_'+r.report_id) with r.notified_wa
# Wait, orders_logic.js fetches orders via `window.callFrappeSequenced(..., "powerstar_salestrack.omnis_dashboard.get_omnis_orders")`.
# Wait, Frappe handles the backend for orders! The Supabase table `omnis_equipment_orders` is mirrored or used differently.
# But wait, in the OutboxManager `processItem`, we updated the Supabase table `omnis_equipment_orders` (setting `notified_email: true` and `notified_wa: true`).
# The problem: If Frappe is the single source of truth for rendering the orders feed, does Frappe return `notified_wa` and `notified_email`? Frappe probably doesn't have these columns unless we add them to Frappe, OR if we fetch them from Supabase separately, OR if `omnis_equipment_orders` in Supabase is used by Frappe.
# SalesTrack actually might just use Frappe. The table `omnis_equipment_orders` in Supabase might be a completely separate thing used by other systems.
# Let's write the scripts first and then verify later. We'll fallback to `localStorage` just in case, but rely on Supabase for the strict check.

with open(r'c:\Users\Administrator\omnis\systems\salestrack\dashboard_logic.js', 'w', encoding='utf-8') as f:
    f.write(js_content)

print("Replaced logic")
