const fs = require('fs');

// --- 1. Modify index.html ---
const htmlFile = 'systems/salestrack/index.html';
let htmlCode = fs.readFileSync(htmlFile, 'utf8');

const newModal = `
  <!-- QUOTATION OPTIONS MODAL (PREVIEW/PRINT/DOWNLOAD) -->
  <div id="qtn-opts-overlay" class="qtn-opts-overlay hidden">
    <div class="qtn-opts-modal" style="width: 900px; max-width: 95vw; height: 85vh; display: flex; flex-direction: column; padding: 20px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
        <div>
            <h3 id="qtn-opts-title" style="margin: 0; color: #1e293b; font-size: 22px;">Quotation Preview</h3>
            <p style="color: #64748b; font-size: 14px; margin: 4px 0 0 0;">Previewing <strong id="qtn-opts-name">#QTN</strong></p>
        </div>
        <div>
            <button class="btn-text-action" id="btn-opts-close" style="color:#94a3b8; font-size: 28px; padding: 0 10px;">&times;</button>
        </div>
      </div>

      <div style="flex: 1; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background: #f8fafc; margin-bottom: 20px;">
        <iframe id="qtn-preview-frame" style="width: 100%; height: 100%; border: none;"></iframe>
      </div>

      <div style="display: flex; gap: 15px; justify-content: flex-end;">
        <button class="qtn-opts-btn" id="btn-opts-print" style="margin: 0; flex: 0 0 auto; width: auto; padding: 10px 24px; background: white; border: 1px solid #cbd5e1; color: #334155; font-weight: 600;">
          &#128438; Print
        </button>
        <button class="qtn-opts-btn primary" id="btn-opts-download" style="margin: 0; flex: 0 0 auto; width: auto; padding: 10px 24px;">
          &#128190; Download PDF
        </button>
      </div>
    </div>
  </div>`;

const regexHtml = /<!-- QUOTATION OPTIONS MODAL \(PRINT\/SEND\) -->[\s\S]*?<\/div>\s*<\/div>/;
htmlCode = htmlCode.replace(regexHtml, newModal);
fs.writeFileSync(htmlFile, htmlCode);
console.log('Modified index.html');


// --- 2. Modify create_quotation_logic.js ---
const jsFile = 'systems/salestrack/create_quotation_logic.js';
let jsCode = fs.readFileSync(jsFile, 'utf8');

const regexJs = /window\.showQuotationOptions = function \(name, isNew = true\) \{[\s\S]*?overlay\.classList\.remove\("hidden"\);\n    \};/m;

const newJs = `window.showQuotationOptions = async function (name, isNew = true) {
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
                params: { filters: { name: { op: 'eq', value: name } }, limit: 1 }
            });

            if (qErr || !qData || qData.length === 0) throw new Error("Could not find quotation " + name);
            const qtn = qData[0];

            const { data: iData } = await window.electron.invoke('supabase:query', {
                table: 'quotation_items',
                method: 'select',
                params: { filters: { parent: { op: 'eq', value: name } } }
            });
            const items = iData || [];

            // 2. Generate HTML
            const company = qtn.company || "Machinery Exchange";
            const htmlContent = renderQuotationTemplate(qtn, items, company);

            // 3. Inject to iframe
            frame.srcdoc = htmlContent;

            // 4. Bind buttons
            btnDownload.onclick = async () => {
                const originalText = btnDownload.innerHTML;
                btnDownload.innerHTML = 'Saving...';
                try {
                    await window.electron.invoke('print:toPDF', {
                        htmlContent,
                        filename: \`\${name.replace(/[^a-zA-Z0-9-]/g, '_')}.pdf\`,
                        landscape: false
                    });
                } catch (e) {
                    alert("Export failed: " + e.message);
                } finally {
                    btnDownload.innerHTML = originalText;
                }
            };

            btnPrint.onclick = () => {
                if (frame.contentWindow) {
                    frame.contentWindow.print();
                }
            };

        } catch (e) {
            console.error("Failed to load preview:", e);
            frame.srcdoc = \`<html><body style='color: red; padding: 20px;'>Error loading preview: \${e.message}</body></html>\`;
        }
    };`;

jsCode = jsCode.replace(regexJs, newJs);
fs.writeFileSync(jsFile, jsCode);
console.log('Modified create_quotation_logic.js');
