const fs = require('fs');
const path = 'C:\\Users\\Administrator\\omnis\\systems\\salestrack\\create_quotation_logic.js';

let content = fs.readFileSync(path, 'utf8');

const regex = /\/\/ Fallback: If no items found in Supabase[\s\S]*?\/\/ 2\. Generate HTML/;

const replacement = \`// Fallback: If no items found in Supabase (e.g. for old quotes migrated without items), fetch from Frappe
            if (items.length === 0) {
                try {
                    // Extract the core Frappe ID (e.g. SAL-QTN-26-3507) from a string like "Intraglobal SAL-QTN-26-3507 -"
                    const match = name.match(/(SAL-QTN-\\d{2}-\\d+)/);
                    const frappeId = match ? match[1] : name;
                    
                    const resData = await window.callFrappeSequenced(CURRENT_SYSTEM.baseUrl, "powerstar_salestrack.omnis_dashboard.get_quotation_full_details", { qtn_name: frappeId });
                    const fData = resData.message || resData;
                    if (fData && fData.items) {
                        items = fData.items;
                    }
                } catch (e) {
                    console.warn("Could not fetch fallback items from Frappe", e);
                }
            }

            // 2. Generate HTML\`;

if (regex.test(content)) {
    content = content.replace(regex, replacement);
    fs.writeFileSync(path, content, 'utf8');
    console.log("Successfully fixed the Frappe fallback logic with regex extraction!");
} else {
    console.log("Could not find the fallback block to replace.");
}
