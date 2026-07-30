import os

files = ['systems/salestrack/index.html', 'omnis-web-deploy/systems/salestrack/index.html']

for fpath in files:
    if not os.path.exists(fpath):
        continue
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Fix saveStockPipelineRecord cache bust
    target1 = """          // Bust the local cache so the next render fetches fresh data
          if (CURRENT_SYSTEM) {
            localStorage.removeItem("mxg_stock_data_" + CURRENT_SYSTEM.id);
          }"""
    replacement1 = """          // Bust the local cache so the next render fetches fresh data
          localStorage.removeItem('mxg_stock_pipeline_cache');
          if (CURRENT_SYSTEM) {
            localStorage.removeItem("mxg_stock_data_" + CURRENT_SYSTEM.id);
          }"""
    content = content.replace(target1, replacement1)

    # 2. Fix deleteStockPipelineRecord supabase and cache bust
    target2 = """          // --- Supabase Delete Sync ---
          try {
             if (window.salestrack && window.salestrack.supabase) {
                await window.salestrack.supabase.from('stock_inventory').delete().eq('frappe_id', id);
                console.log("[Supabase] Stock Delete Successful:", id);
             }
          } catch(e) { console.error("[Supabase] Delete Sync Error:", e); }

          window.showToast?.('Record Deleted Successfully', 'success');
          window.closeStockPipelineForm();
          // Bust the local cache so the next render fetches fresh data
          if (CURRENT_SYSTEM) {
            localStorage.removeItem("mxg_stock_data_" + CURRENT_SYSTEM.id);
          }"""
    replacement2 = """          // --- Supabase Delete Sync ---
          try {
             if (window.salestrack && window.salestrack.supabase) {
                const sp = window.salestrack.supabase;
                const { data: fetchDel } = await sp.from('stock_inventory').select('id').eq('frappe_id', id);
                if (fetchDel && fetchDel.length > 0) {
                    await sp.from('stock_potential_customers').delete().eq('stock_id', fetchDel[0].id);
                }
                await sp.from('stock_inventory').delete().eq('frappe_id', id);
                console.log("[Supabase] Stock Delete Successful:", id);
             }
          } catch(e) { console.error("[Supabase] Delete Sync Error:", e); }

          window.showToast?.('Record Deleted Successfully', 'success');
          window.closeStockPipelineForm();
          // Bust the local cache so the next render fetches fresh data
          localStorage.removeItem('mxg_stock_pipeline_cache');
          if (CURRENT_SYSTEM) {
            localStorage.removeItem("mxg_stock_data_" + CURRENT_SYSTEM.id);
          }"""
    content = content.replace(target2, replacement2)

    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Updated {fpath}")
