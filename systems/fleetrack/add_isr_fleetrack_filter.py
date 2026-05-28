import io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
f = open(r'C:\Users\Administrator\omnis\systems\fleetrack\index.html', encoding='utf-8')
content = f.read()
f.close()

# ── 1. Add Fleetrack filter to ISR filter bar HTML ──────────────────────
# Insert after the Min HMR group, before the Clear button div
OLD_FILTER_BAR = """        <div class="rpt-filter-group" style="flex:0 0 auto;">
          <label>Min HMR</label>
          <input type="number" id="isr-min-hmr" placeholder="0" min="0" style="width:90px;" oninput="filterIsrTable()">
        </div>
        <div style="display:flex;align-items:flex-end;">
          <button class="rpt-action-btn" onclick="document.getElementById('isr-region').value='';document.getElementById('isr-customer').value='';document.getElementById('isr-model').value='';document.getElementById('isr-min-hmr').value='';filterIsrTable()">Clear</button>
        </div>"""

NEW_FILTER_BAR = """        <div class="rpt-filter-group" style="flex:0 0 auto;">
          <label>Min HMR</label>
          <input type="number" id="isr-min-hmr" placeholder="0" min="0" style="width:90px;" oninput="filterIsrTable()">
        </div>
        <div class="rpt-filter-group" style="flex:0 0 auto;">
          <label>Fleetrack</label>
          <select id="isr-fleetrack" onchange="filterIsrTable()" title="Filter by Fleetrack-managed status">
            <option value="">All</option>
            <option value="Yes" selected>Yes</option>
            <option value="No">No</option>
          </select>
        </div>
        <div style="display:flex;align-items:flex-end;">
          <button class="rpt-action-btn" onclick="document.getElementById('isr-region').value='';document.getElementById('isr-customer').value='';document.getElementById('isr-model').value='';document.getElementById('isr-min-hmr').value='';document.getElementById('isr-fleetrack').value='Yes';filterIsrTable()">Clear</button>
        </div>"""

if OLD_FILTER_BAR in content:
    content = content.replace(OLD_FILTER_BAR, NEW_FILTER_BAR, 1)
    print('1. ISR filter bar: Fleetrack select added OK')
else:
    print('1. ERROR: ISR filter bar marker not found')

# ── 2. Update filterIsrTable() to honour the Fleetrack select ───────────
OLD_FILTER_FN = """    function filterIsrTable() {
      const region  = (document.getElementById('isr-region')?.value  || '').toLowerCase();
      const customer= (document.getElementById('isr-customer')?.value || '').toLowerCase();
      const model   = (document.getElementById('isr-model')?.value   || '').toLowerCase();
      const minHmr  = Number(document.getElementById('isr-min-hmr')?.value || 0);
      const filtered = _isrAllRows.filter(m =>
        (!region   || (m.region   || '').toLowerCase().includes(region))   &&
        (!customer || (m.customer || '').toLowerCase().includes(customer)) &&
        (!model    || (m.model    || '').toLowerCase().includes(model))    &&
        (Number(m.current_hmr || 0) >= minHmr)
      );
      renderIsrTable(filtered);
    }"""

NEW_FILTER_FN = """    function filterIsrTable() {
      const region    = (document.getElementById('isr-region')?.value    || '').toLowerCase();
      const customer  = (document.getElementById('isr-customer')?.value  || '').toLowerCase();
      const model     = (document.getElementById('isr-model')?.value     || '').toLowerCase();
      const minHmr    = Number(document.getElementById('isr-min-hmr')?.value || 0);
      const fleetrack = (document.getElementById('isr-fleetrack')?.value || '');
      const filtered = _isrAllRows.filter(m => {
        const ftVal = (m.fleetrack_managed || '').trim();
        const ftMatch = !fleetrack || ftVal.toLowerCase() === fleetrack.toLowerCase();
        return (
          ftMatch &&
          (!region   || (m.region   || '').toLowerCase().includes(region))   &&
          (!customer || (m.customer || '').toLowerCase().includes(customer)) &&
          (!model    || (m.model    || '').toLowerCase().includes(model))    &&
          (Number(m.current_hmr || 0) >= minHmr)
        );
      });
      renderIsrTable(filtered);
    }"""

if OLD_FILTER_FN in content:
    content = content.replace(OLD_FILTER_FN, NEW_FILTER_FN, 1)
    print('2. filterIsrTable(): Fleetrack filter logic added OK')
else:
    print('2. ERROR: filterIsrTable() not found — trying partial match...')
    idx = content.find('function filterIsrTable()')
    if idx != -1:
        print('  Found at char', idx, '— snippet:')
        print(repr(content[idx:idx+600]))

# ── 3. Apply Fleetrack default on initial load (filter after fetch) ──────
# After _isrAllRows = isr; call filterIsrTable() instead of renderIsrTable()
OLD_RENDER_CALL = "        renderIsrTable(isr);\n      } catch (e) {"
NEW_RENDER_CALL = "        filterIsrTable();  // respects default Fleetrack=Yes\n      } catch (e) {"

if OLD_RENDER_CALL in content:
    content = content.replace(OLD_RENDER_CALL, NEW_RENDER_CALL, 1)
    print('3. loadRptIsr() initial render: switched to filterIsrTable() OK')
else:
    print('3. ERROR: renderIsrTable(isr) call not found')

# Save
f = open(r'C:\Users\Administrator\omnis\systems\fleetrack\index.html', 'w', encoding='utf-8')
f.write(content)
f.close()
print('\nFile saved.')
