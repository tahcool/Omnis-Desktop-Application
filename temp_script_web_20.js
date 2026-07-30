
    /* ---------- WHATSAPP AUTOMATION & SALES PERSONS ---------- */
    let ALL_SALES_PERSONS = [];

    async function fetchSalesPersons() {
      try {
        const { data, error } = await window.electron.invoke('supabase:query', {
          table: 'omnis_sales_persons',
          method: 'select',
          params: { columns: '*', order: { column: 'name', ascending: true } }
        });
        if (error) throw error;
        ALL_SALES_PERSONS = data || [];
        renderSalesPersonsTable();
      } catch (err) {
        console.error("Error fetching sales persons:", err);
      }
    }

    function renderSalesPersonsTable() {
      const tbody = document.getElementById('sales-persons-table-body');
      if (!tbody) return;
      tbody.innerHTML = '';
      if (ALL_SALES_PERSONS.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="padding:20px; text-align:center; color:#94a3b8;">No sales persons configured.</td></tr>';
        return;
      }

      ALL_SALES_PERSONS.forEach(sp => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid #f1f5f9';
        
        const statusBadge = sp.is_active 
          ? '<span style="padding:4px 8px; background:#dcfce7; color:#166534; border-radius:12px; font-size:11px; font-weight:600;">Active</span>'
          : '<span style="padding:4px 8px; background:#f1f5f9; color:#64748b; border-radius:12px; font-size:11px; font-weight:600;">Inactive</span>';

        tr.innerHTML = `
          <td style="padding:12px; font-weight:600; color:#1e293b;">${sp.name}</td>
          <td style="padding:12px; color:#475569;">${sp.email || '-'}</td>
          <td style="padding:12px; color:#475569; font-family:monospace;">${sp.whatsapp_number || '-'}</td>
          <td style="padding:12px;">${statusBadge}</td>
          <td style="padding:12px; text-align:right;">
            <button onclick='editSalesPerson(${JSON.stringify(sp).replace(/'/g, "&#39;")})' style="background:transparent; border:none; color:#3b82f6; cursor:pointer; padding:4px 8px;"><i class="fas fa-edit"></i> Edit</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    }

    function openAddSalesPersonModal() {
      document.getElementById('sp-modal-title').textContent = 'Add Sales Person';
      document.getElementById('sp-id').value = '';
      document.getElementById('sp-name').value = '';
      document.getElementById('sp-email').value = '';
      document.getElementById('sp-phone').value = '';
      document.getElementById('sp-active').checked = true;
      document.getElementById('sales-person-modal').style.display = 'flex';
    }

    function editSalesPerson(sp) {
      document.getElementById('sp-modal-title').textContent = 'Edit Sales Person';
      document.getElementById('sp-id').value = sp.id;
      document.getElementById('sp-name').value = sp.name;
      document.getElementById('sp-email').value = sp.email || '';
      document.getElementById('sp-phone').value = sp.whatsapp_number || '';
      document.getElementById('sp-active').checked = sp.is_active;
      document.getElementById('sales-person-modal').style.display = 'flex';
    }

    function closeSalesPersonModal() {
      document.getElementById('sales-person-modal').style.display = 'none';
    }

    async function saveSalesPerson() {
      const id = document.getElementById('sp-id').value;
      const name = document.getElementById('sp-name').value.trim();
      const email = document.getElementById('sp-email').value.trim();
      const whatsapp_number = document.getElementById('sp-phone').value.trim();
      const is_active = document.getElementById('sp-active').checked;

      if (!name) { alert('Name is required'); return; }

      const payload = { name, email, whatsapp_number, is_active };
      if (id) payload.id = parseInt(id);

      try {
        const { error } = await window.electron.invoke('supabase:query', {
          table: 'omnis_sales_persons',
          method: 'upsert',
          data: payload
        });
        if (error) throw error;
        alert('Sales Person saved successfully');
        closeSalesPersonModal();
        fetchSalesPersons();
      } catch (err) {
        console.error("Failed to save sales person", err);
        alert('Failed to save: ' + (err.message || err));
      }
    }

    function startWhatsAppAutomatedDispatcher() {
      setInterval(async () => {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const todayStr = now.toISOString().split('T')[0];

        if (hours === 8 && minutes === 30) {
          const lastSent = localStorage.getItem('last_whatsapp_dispatch_date');
          if (lastSent !== todayStr) {
             console.log("[WhatsApp Automation] Triggering daily dispatch at 08:30 AM...");
             localStorage.setItem('last_whatsapp_dispatch_date', todayStr);
             await runDailyWhatsAppDispatch(todayStr);
          }
        }
      }, 60000);
    }

    async function runDailyWhatsAppDispatch(todayStr) {
      try {
        const { data: allLifecycles, error } = await window.electron.invoke('supabase:query', {
          table: 'omnis_quote_lifecycle',
          method: 'select',
          params: { columns: '*, frappe_quotation(name, custom_sales_person, company, title)' }
        });
        if (error) throw error;
        
        const dueQuotes = allLifecycles.filter(ql => {
          if (ql.is_closed) return false;
          let due = ql.current_stage === 1 ? ql.stage_1_due : (ql.current_stage === 2 ? ql.stage_2_due : ql.stage_3_due);
          return due <= todayStr;
        });

        if (dueQuotes.length === 0) return;

        const groups = {};
        for (const ql of dueQuotes) {
          const q = ql.frappe_quotation || {};
          const sp = q.custom_sales_person || "Unassigned";
          if (!groups[sp]) groups[sp] = [];
          groups[sp].push(ql);
        }

        for (const [spName, quotes] of Object.entries(groups)) {
          const spObj = ALL_SALES_PERSONS.find(p => p.name === spName && p.is_active);
          const phone = spObj ? spObj.whatsapp_number : null;

          if (!phone || phone === "263772000000") {
            console.warn("[WhatsApp Automation] Missing or default phone number for: " + spName);
            continue;
          }

          let msg = `*Omnis Automated Reminder* \nHi ${spName}, you have *${quotes.length}* quotation(s) that require follow-up today!\n\n`;
          quotes.forEach(ql => {
            const q = ql.frappe_quotation;
            msg += `• ${q.name} - ${q.company}\n`;
          });
          msg += `\nPlease check your emails for the clickable deep links to open them instantly.\n\n_This is an automated message from the Desktop App._`;

          window.electron.invoke('whatsapp:send-msg', { number: phone, message: msg }).catch(e => {
             console.error(`[WhatsApp Automation] Failed to send to ${spName}:`, e);
          });
        }
      } catch (err) {
        console.error("[WhatsApp Automation] Error running dispatch:", err);
      }
    }

    setTimeout(() => fetchSalesPersons(), 2000);
