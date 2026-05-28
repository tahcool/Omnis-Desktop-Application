const fs = require("fs");
const path = "c:/Users/Administrator/omnis/systems/fleetrack/index.html";
let html = fs.readFileSync(path, "utf8");
const lines = html.split("\r\n");

// Find openCreateModal and closeCreateModal boundaries
let startLine = -1, closeModalLine = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("async function openCreateModal(prefillMachineName)")) startLine = i;
  if (startLine > -1 && lines[i].includes("function closeCreateModal()")) { closeModalLine = i; break; }
}
console.log("Replacing lines", startLine+1, "to", closeModalLine, "(exclusive)");

const replacement = [
  "    async function openCreateModal(prefillMachineName) {",
  "      try {",
  "        const overlay = document.getElementById(\"db-create-modal-overlay\");",
  "        if (!overlay) {",
  "          alert(\"Error: Create Modal Overlay not found in document.\");",
  "          return;",
  "        }",
  "        overlay.classList.remove(\"hidden\");",
  "        overlay.style.display = \"flex\";",
  "",
  "        // Set default date to today",
  "        const dateInput = document.getElementById(\"db-create-date\");",
  "        if (dateInput) dateInput.valueAsDate = new Date();",
  "",
  "        // Ensure machines are loaded (background, non-blocking)",
  "        if (!window.MACHINES_MAP || Object.keys(window.MACHINES_MAP).length === 0) {",
  "          showToast(\"Loading machine list in background...\", \"info\", 3000);",
  "          loadFtMachineRegister({ quiet: true }).catch(err => console.warn(\"Background machine load failed:\", err));",
  "        }",
  "",
  "        // Fetch dynamic categories with fallback",
  "        try {",
  "          const catRes = await callFrappe(\"/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.get_breakdown_categories\", {});",
  "          if (catRes && Array.isArray(catRes) && catRes.length > 0) {",
  "            const catSelect = document.getElementById(\"db-create-category\");",
  "            if (catSelect) {",
  "              catSelect.innerHTML = \"\";",
  "              catRes.forEach(cat => {",
  "                const opt = document.createElement(\"option\");",
  "                opt.value = cat; opt.textContent = cat;",
  "                if (cat === \"Unscheduled\") opt.selected = true;",
  "                catSelect.appendChild(opt);",
  "              });",
  "              if (!catRes.includes(\"Unscheduled\") && catSelect.options.length > 0) catSelect.selectedIndex = 0;",
  "            }",
  "          }",
  "        } catch (e) {",
  "          console.warn(\"Categories API failed, using fallback:\", e.message);",
  "          const catSelect = document.getElementById(\"db-create-category\");",
  "          if (catSelect && catSelect.options.length === 0) {",
  "            [\"Unscheduled\",\"Scheduled\",\"Operator Error\",\"Wear & Tear\",\"Accident\"].forEach((cat, i) => {",
  "              const opt = document.createElement(\"option\");",
  "              opt.value = cat; opt.textContent = cat;",
  "              if (i === 0) opt.selected = true;",
  "              catSelect.appendChild(opt);",
  "            });",
  "          }",
  "        }",
  "",
  "        // Handle pre-fill if machine name is passed",
  "        if (prefillMachineName && window.MACHINES_MAP && window.MACHINES_MAP[prefillMachineName]) {",
  "          const input = document.getElementById(\"db-create-machine-search\");",
  "          if (input) {",
  "            const m = window.MACHINES_MAP[prefillMachineName];",
  "            input.value = (m.model || \"\") + \" - \" + (m.sn || prefillMachineName);",
  "            input.dataset.selectedName = prefillMachineName;",
  "            const custEl = document.getElementById(\"db-create-customer\");",
  "            const regEl  = document.getElementById(\"db-create-region\");",
  "            if (custEl) custEl.value = m.customer || \"\";",
  "            if (regEl)  regEl.value  = m.region || \"\";",
  "            if (window.ftDebugLog) window.ftDebugLog(\"Pre-filled Breakdown for: \" + prefillMachineName);",
  "          }",
  "        }",
  "",
  "      } catch (err) {",
  "        console.error(\"openCreateModal error:\", err);",
  "        alert(\"Failed to open Create Modal: \" + err.message);",
  "      }",
  "    }",
  ""
];

const newLines = [
  ...lines.slice(0, startLine),
  ...replacement,
  ...lines.slice(closeModalLine)
];

fs.writeFileSync(path, newLines.join("\r\n"), "utf8");
console.log("Done! Lines:", newLines.length, "(was", lines.length + ")");
