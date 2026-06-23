const code = `
    function renderSalesPersonsTable() {
      ALL_SALES_PERSONS.forEach(sp => {
        const tr = document.createElement('tr');
        const statusBadge = '';
        tr.innerHTML = \`
          <td style="padding:12px; font-weight:600; color:#1e293b;">\${sp.name}</td>
          <td style="padding:12px; color:#475569;">\${sp.email || '-'}</td>
          <td style="padding:12px; color:#475569; font-family:monospace;">\${sp.whatsapp_number || '-'}</td>
          <td style="padding:12px;">\${statusBadge}</td>
          <td style="padding:12px; text-align:right;">
            <button onclick='editSalesPerson(\${JSON.stringify(sp).replace(/'/g, "&#39;")})' style="background:transparent; border:none; color:#3b82f6; cursor:pointer; padding:4px 8px;"><i class="fas fa-edit"></i> Edit</button>
          </td>
        \`;
      });
    }
`;
console.log('Script loaded successfully');
