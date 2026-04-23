
/* ---------- CUSTOMER ENQUIRIES LIST LOGIC ---------- */
const viewCeList = document.getElementById("view-ce-list");
const navCeList = document.getElementById("nav-ce-list");
const ceListBody = document.getElementById("ce-list-body");
const btnAddCe = document.getElementById("btn-add-ce");
const ceListStatus = document.getElementById("ce-list-status"); // Filter if needed

// Wire up Add Button
if (btnAddCe) {
    btnAddCe.addEventListener("click", () => {
        resetCeForm();
        showOnly(viewCreateCe);
        mainTitle.textContent = "New Opportunity";
    });
}

// Sidebar Nav
if (navCeList) {
    navCeList.addEventListener("click", () => {
        showOnly(viewCeList);
        activateNavItem(navCeList);
        mainTitle.textContent = "Customer Enquiries";
        loadCeList();
    });
}

// Update Cancel Button to Return to List
if (ceCancelBtn) {
    // Remove old listener (unfortunately tricky without ref, but can overwrite/add)
    // Easier to clone and replace node to strip listeners, or just ensure logic handles it.
    // Since we are adding logic, let's just update the logic inside the existing listener block?
    // No, we should replace the node or add a new distinct handler if possible. 
    // Simplest: Just use a new handler and stopPropagation? No.
    // The previous listener sets it to Dashboard. We want List.
    // Let's rely on re-assigning the onclick via JS if we can, or just adding a new listener
    // and removing the old logical path.
    // Actually, I'll just replace the element to clear the old listener.
    const newBtn = ceCancelBtn.cloneNode(true);
    ceCancelBtn.parentNode.replaceChild(newBtn, ceCancelBtn);
    newBtn.addEventListener("click", () => {
        showOnly(viewCeList);
        activateNavItem(navCeList); // Keep highlight on sidebar
        mainTitle.textContent = "Customer Enquiries";
        loadCeList();
    });
    // Update reference variable if used elsewhere (it isn't widely used global)
}

async function loadCeList() {
    if (!ceListBody) return;
    ceListBody.innerHTML = '<tr><td colspan="7" style="padding:20px; text-align:center;">Loading...</td></tr>';

    try {
        if (!CURRENT_SYSTEM) throw new Error("Not logged in");

        // Fields to fetch
        const fields = ["name", "title", "status", "company", "opportunity_from", "party_name", "naming_series", "custom_salesperson", "modified"];

        // TRY Standard API
        let data = [];
        try {
            // 1. Try get_list
            const res = await callFrappe(CURRENT_SYSTEM.baseUrl, "frappe.client.get_list", {
                doctype: "Opportunity",
                fields: fields,
                order_by: "modified desc",
                limit_page_length: 50
            });
            data = res.message || [];
        } catch (e) {
            // 2. If 403, try custom dashboard endpoint if available or just fail
            console.warn("Standard get_list failed (403?), trying fallback...", e);
            // TODO: If we had a custom endpoint like get_omnis_opportunities, we'd use it here.
            // For now, throw to show the 403 message.
            throw e;
        }

        if (!data || data.length === 0) {
            ceListBody.innerHTML = '<tr><td colspan="7" style="padding:20px; text-align:center;">No enquiries found.</td></tr>';
            return;
        }

        ceListBody.innerHTML = "";
        data.forEach(d => {
            const tr = document.createElement("tr");
            const dateStr = new Date(d.modified).toLocaleDateString();
            // Logic to show "Time ago" could be added here

            tr.innerHTML = `
               <td style="font-weight:600; color:var(--text-main);">${d.title || "(No Title)"}<div style="font-size:11px;color:var(--text-light);">${d.name}</div></td>
               <td><span class="status-badge ${getStatusClass(d.status)}">${d.status}</span></td>
               <td>${d.company || "-"}</td>
               <td>${d.opportunity_from}<div style="font-size:11px;color:var(--text-light);">${d.party_name || "-"}</div></td>
               <td>${d.naming_series || "-"}</td>
               <td>${d.custom_salesperson || "-"}</td>
               <td>${dateStr}</td>
             `;
            ceListBody.appendChild(tr);
        });

    } catch (err) {
        console.error("Load CE Error:", err);
        let msg = "Failed to load data.";
        if (err.message && err.message.includes("403")) {
            msg = "Permission Denied (403). The standard API for 'Opportunity' is blocked.<br>We need to whitelist <code>frappe.client.get_list</code> or create a custom endpoint.";
        }
        ceListBody.innerHTML = `<tr><td colspan="7" style="padding:20px; text-align:center; color:#dc2626;">${msg}</td></tr>`;
    }
}

function getStatusClass(s) {
    if (!s) return "neutral";
    s = s.toLowerCase();
    if (s === "open") return "positive"; // Greenish
    if (s === "lost") return "negative";
    if (s === "converted") return "positive-dark";
    return "neutral";
}
