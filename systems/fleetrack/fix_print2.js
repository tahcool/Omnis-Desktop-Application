const fs = require('fs');
let c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');

// ── 1. Add Print PDF button to Machine Register header ──────────────────────
// Find the "Bulk Log HMR" button - insert Print PDF after it
const mrBtnOld = `                  title="Register a new machine">
                  ➕ New Machine
                </button>`;

const mrBtnNew = `                  title="Register a new machine">
                  ➕ New Machine
                </button>
                <button
                  onclick="window.printMachineRegister()"
                  style="background:#0f172a; color:white; border:none; padding:8px 16px; border-radius:8px; font-size:13px; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:6px; white-space:nowrap;"
                  title="Export Machine Register as PDF">
                  🖨️ Print PDF
                </button>`;

console.log('MR btn found:', c.includes(mrBtnOld));
c = c.replace(mrBtnOld, mrBtnNew);

// ── 2. Wire Job Card modal Print button to printJobCard() ────────────────────
// Currently: onclick="window.print()"
const jcPrintOld = `<button id="jc-modal-print" class="tiny-btn" onclick="window.print()">Print</button>`;
const jcPrintNew = `<button id="jc-modal-print" class="tiny-btn" onclick="if(typeof window.CURRENT_JC_ROW!=='undefined'&&window.CURRENT_JC_ROW){window.printJobCard(window.CURRENT_JC_ROW);}else{window.print();}">🖨️ Print PDF</button>`;
console.log('JC print btn found:', c.includes(jcPrintOld));
c = c.replace(jcPrintOld, jcPrintNew);

// ── 3. Also add a print row action to Job Cards table (per-row print) ────────
// Find the Job Card edit button pattern and add print next to it
const jcRowBtnOld = `style="font-size:9px;padding:4px 10px;border:none;background:#3b82f6;color:white;border-radius:5px;cursor:pointer;">✏️ Edit</button>`;
const jcRowBtnNew = `style="font-size:9px;padding:4px 10px;border:none;background:#3b82f6;color:white;border-radius:5px;cursor:pointer;">✏️ Edit</button>
              <button onclick="window.printJobCard(jcRows[i])" style="font-size:9px;padding:4px 10px;border:none;background:#0f172a;color:white;border-radius:5px;cursor:pointer;margin-left:4px;">🖨️ PDF</button>`;
console.log('JC row btn found:', c.includes(jcRowBtnOld));
// Don't replace this one - too risky without seeing the full context, skip

// ── 4. Update @media print CSS to hide new views chrome ─────────────────────
const oldPrintCss = `      #btn-print-dbr,
      .filter-bar {
        display: none !important;
      }`;
const newPrintCss = `      #btn-print-dbr,
      .filter-bar,
      #view-service-due .rpt-actions,
      #view-customers .rpt-actions,
      [onclick*="printMachineRegister"],
      [onclick*="printDBR"],
      [onclick*="printJobCard"] {
        display: none !important;
      }`;
console.log('Print CSS found:', c.includes(oldPrintCss));
c = c.replace(oldPrintCss, newPrintCss);

fs.writeFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html', c, 'utf8');
console.log('Done. New size:', c.length);
