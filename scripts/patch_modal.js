const fs = require('fs');

const indexHtmlPath = 'systems/fleetrack/index.html';
let content = fs.readFileSync(indexHtmlPath, 'utf8');

const targetStart = `const machineDetails = sectionBlock("Machine Details", kvGrid([`;
const targetEnd = `</div> <!-- Close the grid -->\n    \`;\n        }`;

// Normalize CRLF to LF for easier matching
let normalizedContent = content.replace(/\r\n/g, '\n');

const startIndex = normalizedContent.indexOf(targetStart);
const endIndex = normalizedContent.indexOf(targetEnd) + targetEnd.length;

if (startIndex === -1 || endIndex === -1) {
  console.error("Could not find replacement block.");
  process.exit(1);
}

const originalBlock = normalizedContent.substring(startIndex, endIndex);

const newBlock = `
        let mcBodyHtml = "";

        if (window.currentDivision === 'sinopower') {
          const docHeader = sectionBlock("Document Header", kvGrid([
            ["On Powertrack?", doc.on_powertrack || "Yes"],
            ["PTZ Supplied", doc.ptz_supplied || "Yes"],
            ["Client", doc.customer],
            ["Handover Date", doc.handover_date],
            ["Service Branch", doc.service_branch || "Harare"],
            ["Region", doc.region],
            ["Client Name", doc.customer],
            ["Customer Fleet No.", doc.mxg_fleet_no || doc.fleet_no],
          ]), true);

          const truckDetails = sectionBlock("Truck Details", kvGrid([
            ["Service Tracking Metric", doc.service_tracking_metric || "Mileage"],
            ["Make", doc.make || "PowerSeries"],
            ["Location", doc.location],
            ["LBZ", doc.lbz],
            ["Engine Type", doc.engine_type],
            ["OEM Registered?", doc.oem_registered || "Not Specified"],
            ["Total Running", doc.total_running_hours],
            ["Type", doc.type],
            ["Fleet No", doc.fleet_no],
            ["Model", doc.model],
            ["Reg Number", doc.reg_number || doc.chassis_number],
          ]), true);

          const customerFile = sectionBlock("Customer File", kvGrid([
            ["Prepare Welcome Report", doc.prepare_welcome_report || "N/A"],
            ["Welcome Report Status", doc.welcome_report_status || "PENDING"],
          ]), true);

          const logging = sectionBlock("Logging", kvGrid([
            ["Current Reading", doc.current_hmr],
            ["Last Reading Date", doc.last_hmr_date],
            ["Last Log", doc.last_hmr_log],
            ["Initial Reading", doc.starting_hmr],
            ["Days Since", doc.days_since_last_hmr],
          ]), true);

          const initialService = sectionBlock("Initial Service", kvGrid([
            ["Track initial Service", doc.track_initial_service || "No"],
            ["Initial Service Type", doc.initial_service_type],
            ["Initial Service Status", doc.initial_service_status || "Pending"],
          ]), true);

          const serviceDetails = sectionBlock("Service Details", kvGrid([
            ["Last Service Date", doc.last_service_date],
            ["Service Interval", doc.service_interval_hours],
            ["Last Service Reading", doc.last_service_hmr],
            ["Last Service Type", doc.last_service_type],
            ["Next Service Reading", doc.next_service_hmr],
            ["Next Service Type", doc.next_service_type],
            ["Reading to Service", doc.hours_remaining_to_service],
          ]), true);

          const warrantyDetails = sectionBlock("Warranty Details", kvGrid([
            ["Warranty Status", doc.warranty_status || "Under Warranty"],
            ["OEM Ref Number", doc.oem_ref_number],
            ["Warranty Type", doc.warranty_type],
            ["Warranty Duration (Months)", doc.warranty_period || 0],
            ["Expiry Date", doc.expiry_date],
            ["Expiry Reading", doc.expiry_reading || 0],
          ]), true);

          const fileLibrary = sectionBlock("File Library", kvGrid([
            ["Compatible GET", doc.compatible_get],
            ["Wty. Certificate", doc.wty_certificate ? \`<a href="\${machineAttachmentLink(doc.wty_certificate)}" target="_blank">Attach</a>\` : ""],
            ["PDI Checklist", doc.pdi_checklist ? \`<a href="\${machineAttachmentLink(doc.pdi_checklist)}" target="_blank">Attach</a>\` : ""],
            ["Truck Data Plate", doc.machine_data_plate ? \`<a href="\${machineAttachmentLink(doc.machine_data_plate)}" target="_blank">Attach</a>\` : ""],
            ["Lube Types", doc.lube_types],
            ["Belt Dimensions", doc.belt_dimensions ? \`<a href="\${machineAttachmentLink(doc.belt_dimensions)}" target="_blank">Attach</a>\` : ""],
            ["HYD Filters Dimensions", doc.hyd_filters_dimensions ? \`<a href="\${machineAttachmentLink(doc.hyd_filters_dimensions)}" target="_blank">Attach</a>\` : ""],
            ["Engine Data Plate", doc.engine_data_plate ? \`<a href="\${machineAttachmentLink(doc.engine_data_plate)}" target="_blank">Attach</a>\` : ""],
            ["Filters List", doc.filters_list ? \`<a href="\${machineAttachmentLink(doc.filters_list)}" target="_blank">Attach</a>\` : ""],
            ["NEI Checklist", doc.nei_checklist ? \`<a href="\${machineAttachmentLink(doc.nei_checklist)}" target="_blank">Attach</a>\` : ""],
            ["Equipment Information Form", doc.equipment_information_form ? \`<a href="\${machineAttachmentLink(doc.equipment_information_form)}" target="_blank">Attach</a>\` : ""],
          ]), true);

          mcBodyHtml = \`
          <div id="mc-pane-overview" class="mc-tab-pane" style="display:flex;flex-direction:column;gap:10px;">
            \${docHeader}
            \${customerFile}
            \${truckDetails}
          </div>
          <div id="mc-pane-service" class="mc-tab-pane" style="display:none;flex-direction:column;gap:10px;">
            \${logging}
            \${initialService}
            \${serviceDetails}
          </div>
          <div id="mc-pane-warranty" class="mc-tab-pane" style="display:none;flex-direction:column;gap:10px;">
            \${warrantyDetails}
          </div>
          <div id="mc-pane-library" class="mc-tab-pane" style="display:none;flex-direction:column;gap:10px;">
            \${fileLibrary}
            \${notes}
          </div>
          \`;

        } else {
          const machineDetails = sectionBlock("Machine Details", kvGrid([
                ["Name", doc.name],
                ["Customer", doc.customer],
                ["Fleet No.", doc.mxg_fleet_no || doc.fleet_no],
                ["SN", doc.sn],
                ["ESN", doc.esn],
                ["Chassis Number", doc.chassis_number],
                ["Has Telematics?", doc.has_telematics_device],
                ["Telematics Params", doc.enabled_parameters],
                ["Engine Type", doc.engine_type],
                ["Operating Weight (t)", doc.operating_weight],
                ["Bin Capacity (m3)", doc.bin_capacity],
                ["Std Fuel Cons (L/hr)", doc.standard_fuel_consumption],
                ["Working Voltage", doc.working_voltage],
                ["Tyre Size", doc.tyre_size],
                ["Unique Attachments", doc.unique_attachments_fitted],
                ["Mobility", doc.mobility],
              ]), true);

          const warrantyDetails = sectionBlock("Warranty Details", kvGrid([
                ["Warranty Status", doc.warranty_status],
                ["Warranty Type", doc.warranty_type],
                ["Period (Months)", doc.warranty_period],
                ["Handover Date", doc.handover_date],
                ["Expiry Date", doc.expiry_date],
                ["Warranty Hours", doc.warranty_hours],
              ]), true);

          const hmr = sectionBlock("HMR", kvGrid([
                ["Starting HMR", doc.starting_hmr],
                ["Last HMR Date", doc.last_hmr_date],
                ["Last Log", doc.last_hmr_log],
                ["Current HMR", doc.current_hmr],
                ["Total Running Hours", doc.total_running_hours],
                ["Days Since", doc.days_since_last_hmr],
              ]), true);

          const initialService = sectionBlock("Initial Service Tracking", kvGrid([
            ["Track Initial Service?", doc.track_initial_service],
            ["Initial Service Type", doc.initial_service_type],
            ["Initial Service Status", doc.initial_service_status],
          ]), true);

          const service = sectionBlock("Service Configuration", kvGrid([
            ["Service Obligation", doc.service_obligation],
            ["Service Interval (hrs)", doc.service_interval_hours],
            ["Last Service Date", doc.last_service_date],
            ["Last Service HMR", doc.last_service_hmr],
            ["Last Service Type", doc.last_service_type],
            ["Next Service HMR", doc.next_service_hmr],
            ["Next Service Type", doc.next_service_type],
            ["Hours to Service", doc.hours_remaining_to_service],
          ]), true);

          const underCarriage = sectionBlock("Under Carriage & Specs", kvGrid([
            ["Chain Make", doc.chain_make],
            ["Chain Length", doc.chain_length],
            ["Chain Width", doc.chain_width],
            ["Sprocket LHS Teeth", doc.sproket_lhs_teeth],
            ["Sprocket RHS Teeth", doc.sproket_rhs_teeth],
          ]), true);

          const consumables = sectionBlock("Consumables (Filters & Lubes)", \`
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px 16px;padding:4px 0;">
          <div style="display:flex;flex-direction:column;gap:4px;">
            <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;">Filters List</div>
            <div style="font-size:14px;font-weight:500;color:var(--text-main);white-space:pre-wrap;word-break:break-word;">
              \${safeText(doc.filters_list) || "—"}
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:4px;">
            <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;">Lube Types</div>
            <div style="font-size:14px;font-weight:500;color:var(--text-main);white-space:pre-wrap;word-break:break-word;">
              \${safeText(doc.lube_types) || "—"}
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:4px;">
            <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;">Belt Dimensions</div>
            <div style="font-size:14px;font-weight:500;color:var(--text-main);white-space:pre-wrap;word-break:break-word;">
              \${safeText(doc.belt_dimensions) || "—"}
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:4px;">
            <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;">Hydraulic Filters</div>
            <div style="font-size:14px;font-weight:500;color:var(--text-main);white-space:pre-wrap;word-break:break-word;">
              \${safeText(doc.hyd_filters_dimensions) || "—"}
            </div>
          </div>
        </div>
        \`, true);
          
          mcBodyHtml = \`
          <div id="mc-pane-overview" class="mc-tab-pane" style="display:flex;flex-direction:column;gap:10px;">
            \${machineDetails}
          </div>
          <div id="mc-pane-service" class="mc-tab-pane" style="display:none;flex-direction:column;gap:10px;">
            \${hmr}
            \${initialService}
            \${service}
          </div>
          <div id="mc-pane-warranty" class="mc-tab-pane" style="display:none;flex-direction:column;gap:10px;">
            \${warrantyDetails}
            \${underCarriage}
            \${consumables}
          </div>
          <div id="mc-pane-library" class="mc-tab-pane" style="display:none;flex-direction:column;gap:10px;">
            \${notes}
            \${library}
          </div>
          \`;
        }

        if (mcBody) {
          window.mcSwitchTab = function(event, tabId) {
            document.querySelectorAll('.mc-tab-pane').forEach(el => el.style.display = 'none');
            document.querySelectorAll('.mc-tab-btn').forEach(el => {
              el.classList.remove('active');
              el.style.background = 'transparent';
              el.style.color = 'var(--text-muted)';
            });
            document.getElementById('mc-pane-' + tabId).style.display = 'flex';
            if (event && event.currentTarget) {
              event.currentTarget.classList.add('active');
              event.currentTarget.style.background = 'var(--brand-primary, #ef4444)';
              event.currentTarget.style.color = '#fff';
            }
          };

          mcBody.innerHTML = \`
    \${top}
      \${mcBodyHtml}
    </div> <!-- Close the right column -->
    </div> <!-- Close the grid -->
    \`;
        }
`;

normalizedContent = normalizedContent.replace(originalBlock, newBlock);
fs.writeFileSync(indexHtmlPath, normalizedContent, 'utf8');
console.log("Successfully patched modal.");
