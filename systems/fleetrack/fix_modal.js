const fs = require("fs");
const path = "c:/Users/Administrator/omnis/systems/fleetrack/index.html";
let html = fs.readFileSync(path, "utf8");

// The broken section: lines 10956-11035 (0-indexed: 10955-11034)
// We need to replace the broken openCreateModal with a fixed version
const broken = `    async function openCreateModal(prefillMachineName) {
      try {
        const overlay = document.getElementById("db-create-modal-overlay");
        if (!overlay) {
          alert("Error: Create Modal Overlay not found in document.");
          return;
        }
        overlay.classList.remove("hidden");
        overlay.style.display = 'flex'; // Force visibility just in case

        // Set default date to today
        const dateInput = document.getElementById("db-create-date");
        if (dateInput) dateInput.valueAsDate = new Date();

      // Ensure machines are loaded
      if (!window.MACHINES_MAP || Object.keys(window.MACHINES_MAP).length === 0) {
        showToast("Loading machine list in background...", "info", 3000);
        // Do not block UI with global loader, allow user to fill other fields while waiting
        loadFtMachineRegister({ quiet: true }).catch(err => console.warn("Background machine load failed:", err));
      }

      // Fetch dynamic categories
      try {
        const catRes = await callFrappe("/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.get_breakdown_categories", {});
        if (catRes && Array.isArray(catRes)) {
          const catSelect = document.getElementById("db-create-category");
          catSelect.innerHTML = ""; // Clear existing names

          // Add default 'Unscheduled' if not in list or as fallback
          // But usually we just take what DB gives + maybe specific defaults if needed.
          // Let's add Unscheduled as top option if not present, or just use DB list.
          // Based on user request, DB is source of truth.

          catRes.forEach(cat => {
            const opt = document.createElement("option");
            opt.value = cat;
            opt.textContent = cat;
            if (cat === "Unscheduled") opt.selected = true;
            catSelect.appendChild(opt);
          });

          // If no Unscheduled in DB, maybe add it manually or select first
          if (!catRes.includes("Unscheduled")) {
            // Optional: Force add it if hard requirement?
            // For now, let's strictly trust DB as requested.
            if (catSelect.options.length > 0) catSelect.selectedIndex = 0;
          }
        }
      } catch (e) {
        console.error("Failed to load categories", e);
        // Fallback or keep hardcoded if fetch fails?
        // Existing HTML has hardcoded, so clearing innerHTML removes them.
        // If fail, maybe we should't clear? 
        // For now, assuming success.
      }

      // Populate machines if not done
      if (!MACHINES_DATALIST_POPULATED && window.MACHINES_MAP) {
        MACHINES_DATALIST_POPULATED = true;
      }

      // Handle pre-fill if machine name is passed
      if (prefillMachineName && window.MACHINES_MAP && window.MACHINES_MAP[prefillMachineName]) {
        const input = document.getElementById("db-create-machine-search");
        if (input) {
          input.value = prefillMachineName;
          input.dataset.selectedName = prefillMachineName;
          
          // Trigger the 'select' effect to fill customer/region etc.
          const m = window.MACHINES_MAP[prefillMachineName];
          document.getElementById("db-create-customer").value = m.customer || "";
          document.getElementById("db-create-region").value = m.region || "";
          
          if (window.ftDebugLog) window.ftDebugLog(\`Pre-filled Breakdown for: \${prefillMachineName}\`);
        }
      } catch (err) {
        console.error("openCreateModal error:", err);
        alert("Failed to open Create Modal: " + err.message);
      }
    }`;

const fixed = `    async function openCreateModal(prefillMachineName) {
      try {
        const overlay = document.getElementById("db-create-modal-overlay");
        if (!overlay) {
          alert("Error: Create Modal Overlay not found in document.");
          return;
        }
        overlay.classList.remove("hidden");
        overlay.style.display = "flex";

        // Set default date to today
        const dateInput = document.getElementById("db-create-date");
        if (dateInput) dateInput.valueAsDate = new Date();

        // Ensure machines are loaded (background, non-blocking)
        if (!window.MACHINES_MAP || Object.keys(window.MACHINES_MAP).length === 0) {
          showToast("Loading machine list in background...", "info", 3000);
          loadFtMachineRegister({ quiet: true }).catch(err => console.warn("Background machine load failed:", err));
        }

        // Fetch dynamic categories with fallback
        try {
          const catRes = await callFrappe("/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.get_breakdown_categories", {});
          if (catRes && Array.isArray(catRes) && catRes.length > 0) {
            const catSelect = document.getElementById("db-create-category");
            catSelect.innerHTML = "";
            catRes.forEach(cat => {
              const opt = document.createElement("option");
              opt.value = cat;
              opt.textContent = cat;
              if (cat === "Unscheduled") opt.selected = true;
              catSelect.appendChild(opt);
            });
            if (!catRes.includes("Unscheduled") && catSelect.options.length > 0) {
              catSelect.selectedIndex = 0;
            }
          }
        } catch (e) {
          console.warn("Categories API failed, using fallback:", e.message);
          const catSelect = document.getElementById("db-create-category");
          if (catSelect && catSelect.options.length === 0) {
            ["Unscheduled", "Scheduled", "Operator Error", "Wear & Tear", "Accident"].forEach((cat, i) => {
              const opt = document.createElement("option");
              opt.value = cat;
              opt.textContent = cat;
              if (i === 0) opt.selected = true;
              catSelect.appendChild(opt);
            });
          }
        }

        // Handle pre-fill if machine name is passed
        if (prefillMachineName && window.MACHINES_MAP && window.MACHINES_MAP[prefillMachineName]) {
          const input = document.getElementById("db-create-machine-search");
          if (input) {
            const m = window.MACHINES_MAP[prefillMachineName];
            input.value = \`\${m.model || ""} - \${m.sn || prefillMachineName}\`;
            input.dataset.selectedName = prefillMachineName;
            const custEl = document.getElementById("db-create-customer");
            const regEl  = document.getElementById("db-create-region");
            if (custEl) custEl.value = m.customer || "";
            if (regEl)  regEl.value  = m.region || "";
            if (window.ftDebugLog) window.ftDebugLog("Pre-filled Breakdown for: " + prefillMachineName);
          }
        }

      } catch (err) {
        console.error("openCreateModal error:", err);
        alert("Failed to open Create Modal: " + err.message);
      }
    }`;

if (!html.includes(broken.substring(0, 100))) {
  console.error("Could not find the broken pattern. First 100 chars:", broken.substring(0, 100));
  process.exit(1);
}

const newHtml = html.replace(broken, fixed);
if (newHtml === html) {
  console.error("No replacement was made!");
  process.exit(1);
}

fs.writeFileSync(path, newHtml, "utf8");
console.log("Fixed successfully!");
