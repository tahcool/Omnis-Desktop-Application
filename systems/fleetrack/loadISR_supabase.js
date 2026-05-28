window.loadISR = async function() {
      const region = document.getElementById('isr-filter-region')?.value || '';
      const container = document.getElementById('isr-table-container');
      const kpi = document.getElementById('isr-kpi-badge');
      if (!container) return;
      container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted);font-size:13px;">? Loading ISR data...</div>';
      try {
        const params = { range: { from: 0, to: 9999 } };
        if (region) params.match = { region: region };
        const raw = await window.electron.invoke('supabase:query', {
            table: 'ft_machine',
            method: 'select',
            params: params
        });
        if (raw.error) throw new Error(raw.error.message || JSON.stringify(raw.error));
        const allMachines = raw.data || [];
        ISR_ROWS = allMachines.filter(m => !m.last_service_date);
        if (kpi) {
          kpi.textContent = ISR_ROWS.length + ' machine' + (ISR_ROWS.length !== 1 ? 's' : '') + ' � No Service Date';
          kpi.style.display = 'block';
        }
        renderISRTable(ISR_ROWS);
      } catch(e) {
        container.innerHTML = '<div style="text-align:center;padding:40px;color:#ef4444;font-size:13px;">? Error loading ISR: ' + e.message + '</div>';
        console.error('[ISR] load error:', e);
      }
    }