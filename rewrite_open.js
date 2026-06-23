const fs = require('fs');

const file = 'C:/Users/Administrator/omnis/systems/salestrack/dashboard_logic.js';
let content = fs.readFileSync(file, 'utf8');

const startStr = "async openCommandCenter(isFullView = false) {";
const endStr = "    renderCommandCenter(data, isFullView = false) {";

const startIndex = content.indexOf(startStr);
const endIndex = content.indexOf(endStr, startIndex);

if (startIndex !== -1 && endIndex !== -1) {
    const replacement = `async openCommandCenter(isFullView = false) {
        if (!isFullView) {
            this.openListModal("Follow-up Analytics", \`<div style="padding:40px; text-align:center;"><i class="fas fa-spinner fa-spin" style="font-size:24px; color:#4f46e5;"></i><div style="margin-top:15px; font-weight:600; color:#64748b;">Loading analytics...</div></div>\`, "1200px");
        } else {
            const fullCont = document.getElementById('command-center-full-container');
            if (fullCont) {
                fullCont.innerHTML = \`<div style="padding:100px; text-align:center;"><i class="fas fa-spinner fa-spin" style="font-size:32px; color:#4f46e5;"></i><div style="margin-top:20px; font-weight:600; color:#64748b; font-size:18px;">Loading analytics...</div></div>\`;
            }
        }

        try {
            // 1. Fetch Quotations from the last 30 days
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const dateStr = thirtyDaysAgo.toISOString().split('T')[0];

            let quotesRes = await window.electron.invoke('supabase:query', {
                method: 'select',
                table: 'frappe_quotation',
                columns: 'name, custom_sales_person, custom_follow_up_status, transaction_date',
                limit: 2000
            });
            let quotes = quotesRes.data || [];
            
            // Filter locally for last 30 days
            quotes = quotes.filter(q => q.transaction_date && q.transaction_date >= dateStr);

            // 2. Fetch recent dispatch logs
            let emailsRes = await window.electron.invoke('supabase:query', {
                method: 'select',
                table: 'omnis_email_queue',
                columns: 'id, to_email, subject, status, created_at, related_type',
                limit: 50,
                order: { column: 'created_at', ascending: false }
            });
            let emails = emailsRes.data || [];
            
            // Filter for quotation_reminder only
            emails = emails.filter(e => e.related_type === 'quotation_reminder');

            this.renderCommandCenter({ quotes, emails }, isFullView);
        } catch (e) {
            console.error("Command Center Error:", e);
            if (!isFullView) {
                this.openListModal("Command Center Error", \`<div style="padding:20px; color:#ef4444;">\${e.message || "Failed to load command center"}</div>\`);
            } else {
                const fullCont = document.getElementById('command-center-full-container');
                if (fullCont) fullCont.innerHTML = \`<div style="padding:60px; text-align:center; color:#ef4444;"><i class="fas fa-exclamation-triangle" style="font-size:48px; margin-bottom:20px;"></i><div style="font-size:18px; font-weight:800;">Command Center Error</div><div style="margin-top:10px;">\${e.message || "Failed to load follow-up data"}</div></div>\`;
            }
        }
    }

`;
    
    content = content.substring(0, startIndex) + replacement + content.substring(endIndex);
    fs.writeFileSync(file, content);
    console.log('Replaced openCommandCenter successfully using substring!');
} else {
    console.log('Could not find start or end index.', startIndex, endIndex);
}
