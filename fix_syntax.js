const fs = require('fs');
const path = 'C:\\Users\\Administrator\\omnis\\systems\\salestrack\\create_quotation_logic.js';

let content = fs.readFileSync(path, 'utf8');

const regex = /    window\.submitQuickQuote = submitQuickQuote;\s*\/\/ Initialize on load\s*document\.addEventListener\('DOMContentLoaded', \(\) => \{\s*\/\/ Wire Quick Create\s*const btnQq = document\.getElementById\("btn-qq-submit"\);\s*if \(btnQq\) btnQq\.onclick = submitQuickQuote;\s*\/\/ Wire Quick Create Salesperson Suggestions\s*setupSuggestions\(\s*document\.getElementById\("qq-salesperson"\),\s*document\.getElementById\("qq-salesperson-suggest"\),\s*'sales_persons'\s*\);\s*setupSuggestions\(document\.getElementById\("qq-customer"\), document\.getElementById\("qq-customer-suggest"\), 'customers'\);\s*setupSuggestions\(document\.getElementById\("qq-item"\), document\.getElementById\("qq-item-suggest"\), 'items'\);\s*\}/;

const replacement = `        setupSuggestions(document.getElementById("qq-item"), document.getElementById("qq-item-suggest"), 'items');

        // --- Bind Modal Buttons (After DOM is definitely ready) ---
        document.getElementById("btn-opts-close")?.addEventListener("click", () => {
            document.getElementById("qtn-opts-overlay").classList.add("hidden");
        });
    });`;

if (regex.test(content)) {
    content = content.replace(regex, ""); // Just strip the duplicate broken block
    fs.writeFileSync(path, content, 'utf8');
    console.log("Syntax fixed via Regex!");
} else {
    console.log("Regex failed. Attempting exact substring fix.");
    // Fallback: manually strip the bad lines
    const lines = content.split('\n');
    lines.splice(657, 18); // remove lines 658-675 (0-indexed)
    fs.writeFileSync(path, lines.join('\n'), 'utf8');
    console.log("Syntax fixed via line removal!");
}
