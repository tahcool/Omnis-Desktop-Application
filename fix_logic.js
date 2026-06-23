const fs = require('fs');
const path = 'C:\\Users\\Administrator\\omnis\\systems\\salestrack\\create_quotation_logic.js';

let content = fs.readFileSync(path, 'utf8');

const regex = /params: \{ filters: \{ name: name \}, limit: 1 \}\s*\n            \}\);\s*\/\/ 3\. Inject to iframe/;

const replacement = \`params: { filters: { name: name }, limit: 1 }
            });

            if (qErr || !qData || qData.length === 0) throw new Error("Could not find quotation " + name);
            const qtn = qData[0];

            const { data: iData } = await window.electron.invoke('supabase:query', {
                table: 'quotation_items',
                method: 'select',
                params: { filters: { parent: name } }
            });
            let items = iData || [];

            // Fallback: If no items found in Supabase (e.g. for old quotes migrated without items), fetch from Frappe
            if (items.length === 0) {
                try {
                    const resData = await window.callFrappeSequenced(CURRENT_SYSTEM.baseUrl, "powerstar_salestrack.omnis_dashboard.get_quotation_full_details", { qtn_name: name });
                    const fData = resData.message || resData;
                    if (fData && fData.items) {
                        items = fData.items;
                    }
                } catch (e) {
                    console.warn("Could not fetch fallback items from Frappe", e);
                }
            }

            // 2. Generate HTML
            const company = qtn.company || "Machinery Exchange";
            const htmlContent = renderQuotationHTML({ quotation: qtn, items: items });

            // 3. Inject to iframe\`;

if (regex.test(content)) {
    content = content.replace(regex, replacement);
    fs.writeFileSync(path, content, 'utf8');
    console.log("Fixed code block successfully.");
} else {
    console.log("Could not find the broken block to fix.");
}
