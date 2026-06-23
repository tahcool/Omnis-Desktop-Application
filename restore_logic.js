const fs = require('fs');
const path = 'C:\\Users\\Administrator\\omnis\\systems\\salestrack\\create_quotation_logic.js';

let content = fs.readFileSync(path, 'utf8');

const startIdx = content.indexOf('window.showQuotationOptions = async function (name, isNew = true) {');
const endIdx = content.indexOf('function renderQuotationHTML(data) {', startIdx);

if (startIdx !== -1 && endIdx !== -1) {
    const replacementFn = `window.showQuotationOptions = async function (name, isNew = true) {
        console.log("showQuotationOptions called for:", name, "isNew:", isNew);
        const overlay = document.getElementById("qtn-opts-overlay");
        const title = document.getElementById("qtn-opts-title");
        const nameEl = document.getElementById("qtn-opts-name");
        const frame = document.getElementById("qtn-preview-frame");
        const btnDownload = document.getElementById("btn-opts-download");
        const btnPrint = document.getElementById("btn-opts-print");

        if (!overlay || !nameEl || !frame) {
            console.error("Modal elements not found for Quotation Options");
            return;
        }

        nameEl.textContent = name;
        if (title) title.textContent = isNew ? "Quotation Created!" : "Quotation Preview";
        frame.srcdoc = "<html><body style='font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; color: #64748b;'>Loading Preview...</body></html>";
        overlay.classList.remove("hidden");

        try {
            // 1. Fetch from Supabase
            const { data: qData, error: qErr } = await window.electron.invoke('supabase:query', {
                table: 'quotations',
                method: 'select',
                params: { filters: { name: name }, limit: 1 }
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

            // 3. Inject to iframe
            frame.srcdoc = htmlContent;

            // 4. Bind buttons
            if (btnDownload) {
                // Remove old event listeners by cloning
                const newBtn = btnDownload.cloneNode(true);
                btnDownload.parentNode.replaceChild(newBtn, btnDownload);
                
                newBtn.onclick = async () => {
                    const originalText = newBtn.innerHTML;
                    newBtn.innerHTML = 'Saving...';
                    try {
                        await window.electron.invoke('print:toPDF', {
                            htmlContent,
                            filename: \`\${name.replace(/[^a-zA-Z0-9-]/g, '_')}.pdf\`,
                            landscape: false
                        });
                        alert("PDF Saved Successfully!");
                    } catch (err) {
                        alert("Error saving PDF: " + err.message);
                    } finally {
                        newBtn.innerHTML = originalText;
                    }
                };
            }

            if (btnPrint) {
                const newPrint = btnPrint.cloneNode(true);
                btnPrint.parentNode.replaceChild(newPrint, btnPrint);

                newPrint.onclick = () => {
                    if (frame.contentWindow) {
                        frame.contentWindow.print();
                    }
                };
            }

        } catch (e) {
            console.error("Failed to load preview:", e);
            frame.srcdoc = \`<html><body style='color: red; padding: 20px; font-family: sans-serif;'>Error loading preview: \${e.message}</body></html>\`;
        }
    };

    `;
    const toReplace = content.substring(startIdx, endIdx);
    content = content.replace(toReplace, replacementFn);
    fs.writeFileSync(path, content, 'utf8');
    console.log("Successfully restored showQuotationOptions.");
} else {
    console.log("Indices not found.");
}
