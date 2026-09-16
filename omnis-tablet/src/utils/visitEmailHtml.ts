/**
 * visitEmailHtml.ts — Shared visit email HTML generator
 * Extracted from LogActivityScreen so both LogActivity and VisitHistory can use it.
 */

// ── Shared Types ─────────────────────────────────────────────────────────────

export type DepartmentName = 'Fleetrack' | 'Engineering' | 'Parts';
export const DEPARTMENTS: DepartmentName[] = ['Fleetrack', 'Engineering', 'Parts'];

export type MachineInspectionItem = {
  id: string;
  name: string;
  model: string;
  serial_no: string;
  fleet_no: string;
  location: string;
  hmr: string | number;
  findings: string;
  departments: Record<DepartmentName, boolean>;
  selectedForEmail?: boolean;
};

// ── Email HTML Generator ─────────────────────────────────────────────────────

export const generateVisitEmailHtml = (params: {
  customerName: string;
  visitType: string;
  visitDate: string;
  salesperson: string;
  topics: string;
  opportunities: string;
  actionRequired: boolean;
  psvMachines: MachineInspectionItem[];
  visitImages?: string[];
}) => {
  const { customerName, visitType, visitDate, salesperson, topics, opportunities, actionRequired, psvMachines, visitImages } = params;

  // ── Expanded Visit Type Descriptions & Dedicated Thank-You Messages ──
  let fullVisitTypeName = 'Customer Visit';
  let headerReportTitle = 'CUSTOMER VISIT REPORT';
  let thankYouMessage = '';

  if (visitType === 'PSV') {
    fullVisitTypeName = 'Product Support Visit (PSV)';
    headerReportTitle = 'PRODUCT SUPPORT VISIT REPORT';
    thankYouMessage = `We would like to thank you for hosting our representative for this Product Support Visit (PSV). We appreciate your valued business and remain dedicated to maintaining your equipment productivity and support requirements.`;
  } else if (visitType === 'FCDV') {
    fullVisitTypeName = 'Customer Visit (Focused Customer Development Visit - FCDV)';
    headerReportTitle = 'CUSTOMER VISIT REPORT';
    thankYouMessage = `We would like to thank you for taking the time to meet with our representative for this Customer Visit. We appreciate your valuable feedback and ongoing business partnership with us.`;
  } else {
    fullVisitTypeName = 'Customer Visit (Customer Development Visit - CDV)';
    headerReportTitle = 'CUSTOMER VISIT REPORT';
    thankYouMessage = `We would like to thank you for taking the time to meet with our representative for this Customer Visit. We appreciate your valuable feedback and ongoing business partnership with us.`;
  }

  // Filter only machines explicitly selected for inclusion in the email report
  const selectedMachines = (psvMachines || []).filter(m => m.selectedForEmail !== false);

  let machinesHtml = '';
  if (visitType === 'PSV' && selectedMachines.length > 0) {
    const machineCards = selectedMachines.map(m => {
      const depts = DEPARTMENTS.filter(d => m.departments && m.departments[d]);
      const deptBadges = depts.map(d => `<span style="background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; margin-right: 4px;">${d}</span>`).join('');
      return `
        <div style="margin-bottom: 16px; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; background: #ffffff;">
          <div style="background: #f1f5f9; padding: 10px 16px; border-bottom: 1px solid #cbd5e1; font-weight: 700; color: #0f172a; font-size: 13px;">
            🚜 Machine: ${m.model} <span style="color: #64748b; font-weight: 400;">(SN: ${m.serial_no} | Fleet: ${m.fleet_no})</span>
          </div>
          <div style="padding: 12px 16px; font-size: 13px;">
            <p style="margin: 0 0 6px 0; color: #475569;"><strong>Location:</strong> ${m.location || '—'} | <strong>HMR:</strong> ${m.hmr} hrs</p>
            ${m.findings ? `<div style="margin: 8px 0; font-size: 13px; color: #0f172a; background: #f8fafc; padding: 10px 12px; border-radius: 6px; border-left: 3px solid #8b2219;"><strong>Findings / Observations:</strong><br>${m.findings}</div>` : '<p style="margin: 4px 0; font-size: 12px; color: #94a3b8; font-style: italic;">No specific machine issues logged.</p>'}
            ${depts.length > 0 ? `<div style="margin-top: 8px; font-size: 11px; color: #475569;"><strong>Target Departments Notified:</strong> ${deptBadges}</div>` : ''}
          </div>
        </div>
      `;
    }).join('');

    machinesHtml = `
      <div style="margin-top: 24px;">
        <h3 style="color: #8b2219; font-size: 15px; margin-bottom: 12px; font-weight: 800; border-bottom: 2px solid #8b2219; padding-bottom: 4px;">
          Customer Fleet Machine Inspection Report (${selectedMachines.length} Units)
        </h3>
        ${machineCards}
      </div>
    `;
  }

  let photosHtml = '';
  if (visitImages && visitImages.length > 0) {
    const photoCards = visitImages.map(url => `
      <div style="display: inline-block; margin: 6px;">
        <a href="${url}" target="_blank" style="text-decoration: none;">
          <img src="${url}" alt="Visit Attachment" style="width: 160px; height: 120px; object-fit: cover; border-radius: 8px; border: 1px solid #cbd5e1; box-shadow: 0 2px 4px rgba(0,0,0,0.08);" />
        </a>
      </div>
    `).join('');

    photosHtml = `
      <div style="margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
        <h3 style="color: #8b2219; font-size: 14px; margin-bottom: 12px; font-weight: 700;">
          📸 Attached Visit Photos (${visitImages.length})
        </h3>
        <div style="text-align: left;">
          ${photoCards}
        </div>
      </div>
    `;
  }

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      :root { color-scheme: light dark; }
      .logo-dark { display: none !important; }
      @media (prefers-color-scheme: dark) {
        .logo-light { display: none !important; }
        .logo-dark { display: inline-block !important; }
      }
    </style>
  </head>
  <body style="font-family: Arial, sans-serif; color: #1e293b; background-color: #f8fafc; margin: 0; padding: 20px;">
    <div style="max-width: 680px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 10px rgba(0,0,0,0.04);">
      
      <!-- Header Banner with IEG Logo -->
      <div style="background-color: #212121; padding: 26px 20px; text-align: center; border-bottom: 4px solid #8b2219;">
        <div style="margin-bottom: 16px;">
          <img src="https://pfqaeewmlwfayxbgmuaq.supabase.co/storage/v1/object/public/public-assets/logos/proudly-ieg-logo-white-3x.png" alt="IEG" style="max-height: 120px; width: auto; max-width: 100%;" />
        </div>
        <h2 style="color: #ffffff; font-size: 16px; margin: 6px 0 0 0; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">
          ${headerReportTitle}
        </h2>
        <p style="color: #9ca3af; font-size: 12px; margin: 4px 0 0 0; font-weight: 600;">
          ${customerName} • ${visitDate}
        </p>
      </div>

      <div style="padding: 24px;">
        <p style="font-size: 14px; color: #334155; margin-top: 0;">
          Dear <strong>${customerName}</strong>,
        </p>
        <p style="font-size: 14px; color: #475569; line-height: 1.6;">
          ${thankYouMessage}
        </p>
        <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
          Below is a summary of the <strong>${fullVisitTypeName}</strong> logged by <strong>${salesperson}</strong> on <strong>${visitDate}</strong>.
        </p>

        <!-- Summary Table -->
        <div style="margin: 20px 0; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <thead>
              <tr style="background-color: #8b2219; color: #ffffff;">
                <th colspan="2" style="padding: 10px 16px; text-align: left; font-size: 14px; font-weight: 700;">Visit Details</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 700; width: 35%; background: #f8fafc; color: #475569;">Customer Name</td>
                <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-weight: 600;">${customerName}</td>
              </tr>
              <tr>
                <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 700; background: #f8fafc; color: #475569;">Visit Type</td>
                <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; color: #0f172a;"><span style="background: #e0f2fe; color: #0369a1; padding: 3px 8px; border-radius: 4px; font-weight: 700; font-size: 11px;">${fullVisitTypeName}</span></td>
              </tr>
              <tr>
                <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 700; background: #f8fafc; color: #475569;">Logged Representative</td>
                <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; color: #0f172a;">${salesperson}</td>
              </tr>
              <tr>
                <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 700; background: #f8fafc; color: #475569;">Topics Discussed</td>
                <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; color: #0f172a; line-height: 1.5;">
                  <ul style="margin: 0; padding-left: 20px; color: #0f172a;">
                    ${topics.split('\n').map(line => line.trim()).filter(line => line.length > 0).map(line => {
                      const text = line.replace(/^[•\-\*]\s*/, '');
                      return `<li style="margin-bottom: 4px;">${text}</li>`;
                    }).join('')}
                  </ul>
                </td>
              </tr>
              ${opportunities ? `
              <tr>
                <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 700; background: #f8fafc; color: #475569;">Opportunities / Feedback</td>
                <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; color: #0f172a; line-height: 1.5;">${opportunities}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 10px 16px; font-weight: 700; background: #f8fafc; color: #475569;">Action Required</td>
                <td style="padding: 10px 16px; color: #0f172a;">${actionRequired ? '<span style="color: #d97706; font-weight: 700;">Yes (Follow-up pending)</span>' : '<span style="color: #10b981; font-weight: 600;">No</span>'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        ${machinesHtml}
        ${photosHtml}

        <p style="font-size: 13px; color: #475569; margin-top: 20px;">
          Should you have any questions or require immediate support, please contact our Customer Support Division.
        </p>

        <div style="margin-top: 28px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center;">
          <div style="display: inline-block; background: #1e293b; padding: 6px 12px; border-radius: 4px; margin-bottom: 8px;">
            <img src="https://pfqaeewmlwfayxbgmuaq.supabase.co/storage/v1/object/public/public-assets/logos/omnis-logo-white.png" alt="OMNIS" style="max-height: 12px; width: auto; opacity: 0.9; vertical-align: middle;" />
          </div>
          <p style="margin: 0 0 4px 0; font-weight: 600;">Activity & Fleet Management System</p>
          <p style="margin: 0; color: #94a3b8;">Automated visit report dispatch</p>
        </div>
      </div>
    </div>
  </body>
  </html>
  `;
};
