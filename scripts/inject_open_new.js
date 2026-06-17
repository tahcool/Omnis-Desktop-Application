const fs = require('fs');
let content = fs.readFileSync('systems/salestrack/index.html', 'utf8');

const jsReplaceOpen = `    // ── Open form for NEW manual record ──
    window.openNewAftersalesForm = function() {
        const overlay = document.getElementById('aftersales-form-overlay');
        if (overlay) overlay.classList.remove('hidden');

        // Clear all fields
        const val = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
        const newId = 'AS-MANUAL-' + Date.now();
        val('as-record-id', newId);
        val('as-order-id', 'MANUAL');
        val('as-company', '');
        val('as-contact-person', '');
        val('as-cell', '');
        val('as-email', '');
        val('as-email2', '');
        val('as-address', '');
        val('as-sale-date', '');
        val('as-oem', '');
        val('as-model', '');
        val('as-location', '');
        val('as-chassis', '');
        val('as-engine', '');
        val('as-warranty-start', '');
        val('as-warranty-end', '');
        val('as-warranty-applicable', '');
        val('as-service-plan', '');
        
        // New fields
        val('as-transmission-type', '');
        val('as-axle-type', '');
        val('as-pop-register', 'No');
        val('as-photos-plate', 'No');
        val('as-photos-machine', 'No');
        val('as-epr-update', 'No');
        val('as-warranty-cert', 'No');
        val('as-service-checklist', 'No');
        val('as-machine-status', 'No');
        val('as-invoice-copy', 'No');
        val('as-client-satisfaction', 'No');
        val('as-delivery-note', 'No');
        
        val('as-sales-rep', '');
        val('as-pdi-mgr', '');
        val('as-workshop-mgr', '');
        val('as-ops-mgr', '');

        val('as-training-done', 'No');
        val('as-training-date', '');
        val('as-training-operator', '');
        val('as-notes', '');

        // Update title
        const title = document.getElementById('aftersales-form-title');
        if (title) title.textContent = 'Aftersales: New Manual Handover';
    };

    window.openAftersalesForm = function(recordId) {`;

content = content.replace(`    window.openAftersalesForm = function(recordId) {`, jsReplaceOpen);

fs.writeFileSync('systems/salestrack/index.html', content);
console.log('Injected openNewAftersalesForm');
