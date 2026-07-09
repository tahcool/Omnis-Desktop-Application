import re

with open(r'c:\Users\Administrator\omnis\systems\salestrack\index.html', 'r', encoding='utf-8') as f:
    content = f.read()

replacement = r'''    async function loadGroupSalesList(force = false) {
      console.warn("==== loadGroupSalesList CALLED ====");
      const container = document.getElementById('group-sales-list-body');
      if (!container) { console.error('[Sales] group-sales-list-body not found'); return; }

      container.innerHTML = '<div style="padding:40px;text-align:center;color:#64748b;font-size:14px;font-weight:600;"><i class="fas fa-spinner fa-spin" style="margin-right:8px;"></i>Loading sales...</div>';
      console.warn("==== loadGroupSalesList innerHTML SET ====");

      try {
        const baseUrl = (window.CURRENT_SYSTEM && window.CURRENT_SYSTEM.baseUrl)
            ? window.CURRENT_SYSTEM.baseUrl.replace(/\/$/, '')
            : 'https://salestrack.powerstar.co.zw';

        // get_omnis_group_sales is allow_guest=True - temporarily clear circuit breaker
        // so this public endpoint isn't blocked by auth failures from other calls
        const savedCircuit = window.frappeCircuitOpenedUntil || 0;
        window.frappeCircuitOpenedUntil = 0;

        const search   = (document.getElementById('group-sales-search')?.value   || '').trim();
        const company  = (document.getElementById('group-sales-company')?.value  || '').trim();
        const fromDate = (document.getElementById('gs-from-date')?.value         || '').trim();
        const toDate   = (document.getElementById('gs-to-date')?.value           || '').trim();

        console.warn("==== loadGroupSalesList calling callFrappe ====");
        let payload;
        try {
          const result = await window.callFrappe(
            baseUrl,
            'powerstar_salestrack.omnis_dashboard.get_omnis_group_sales',
            { search, company, from_date: fromDate, to_date: toDate, start: 0, page_length: 100 },
            'POST'
          );
          console.warn("==== loadGroupSalesList callFrappe RETURNED ====", typeof result);
          payload = result && result.message !== undefined ? result.message : result;
        } catch (callErr) {
          console.warn("==== loadGroupSalesList callFrappe FAILED ====", callErr);
          // callFrappe failed - restore circuit and re-throw
          window.frappeCircuitOpenedUntil = savedCircuit;
          throw callErr;
        }
        window.frappeCircuitOpenedUntil = savedCircuit;

        if (!payload || !payload.ok) {
          console.warn("==== loadGroupSalesList payload NOT OK ====", payload);
          container.innerHTML =
            '<div style="padding:40px;text-align:center;color:#ef4444;font-weight:700;">Error: ' +
            ((payload && payload.error) || 'No data returned') +
            '<br><button onclick="window.loadGroupSalesList(true)" style="margin-top:12px;padding:8px 18px;background:#8b2219;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:700;">Retry</button></div>';
          return;
        }

        const rows = payload.data || [];
        console.warn("==== loadGroupSalesList success! rows: ====", rows.length);
        window._lastGroupSalesRows = rows;
        window.lastLoaded = window.lastLoaded || {};
        window.lastLoaded['group_sales'] = Date.now();

        // 2. Render List
        console.warn("==== loadGroupSalesList calling renderGroupSalesTable ====");
        renderGroupSalesTable(rows);
        try { loadGroupSalesKPI(); } catch (_) {}

      } catch (err) {
        console.warn("==== loadGroupSalesList CATCH BLOCK ====", err);
        console.error('[Sales] loadGroupSalesList error:', err);
        container.innerHTML =
          '<div style="padding:40px;text-align:center;">' +
          '<div style="color:#ef4444;font-size:32px;margin-bottom:12px;"><i class="fas fa-exclamation-triangle"></i></div>' +
          '<div style="color:#1e293b;font-weight:700;font-size:16px;">Failed to load group sales</div>' +
          '<div style="color:#64748b;font-size:13px;margin-top:8px;">' + (err.message || 'Network error') + '</div>' +
          '<br><button onclick="window.loadGroupSalesList(true)" style="margin-top:12px;padding:8px 18px;background:#8b2219;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:700;">Retry</button></div>';
      }
    }'''

pattern = r'    async function loadGroupSalesList\(force = false\) \{.*?<br><button onclick="window\.loadGroupSalesList\(true\)".*?<\/div>\';\n      \}\n    \}'

new_content = re.sub(pattern, replacement, content, flags=re.DOTALL)

with open(r'c:\Users\Administrator\omnis\systems\salestrack\index.html', 'w', encoding='utf-8') as f:
    f.write(new_content)

if new_content != content:
    print("Successfully replaced.")
else:
    print("Regex failed to match.")
