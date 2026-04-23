import os

file_path = r'C:\Users\Administrator\omnis\systems\salestrack\index.html'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update mxg-company-filter
old1 = '''          <select id="mxg-company-filter" class="qlist-select"
            style="min-width:140px; height: 40px; border-radius: 10px;">
            <option value="">All Companies</option>
            <option value="machinery">Machinery Exchange</option>
            <option value="sinopower">Sinopower</option>
          </select>'''

new1 = '''          <select id="mxg-company-filter" class="qlist-select"
            style="min-width:140px; height: 40px; border-radius: 10px;"
            onchange="syncCompanyFilters('mxg-company-filter', 'ol-company'); loadGsmReport(true);">
            <option value="">All Companies</option>
            <option value="machinery">Machinery Exchange</option>
            <option value="sinopower">Sinopower</option>
          </select>'''

# 2. Update ol-company
old2 = '''              <select id="ol-company" class="qlist-select"
                style="border:none; background:transparent; font-weight:700; color:#334155; font-size:12px; outline:none; cursor:pointer;">
                <option value="All Companies">All Companies</option>
                <option value="Machinery Exchange">Machinery Exchange</option>
                <option value="Sinopower">Sinopower</option>
              </select>'''

new2 = '''              <select id="ol-company" class="qlist-select"
                style="border:none; background:transparent; font-weight:700; color:#334155; font-size:12px; outline:none; cursor:pointer;"
                onchange="syncCompanyFilters('ol-company', 'mxg-company-filter'); loadOrdersList();">
                <option value="All Companies">All Companies</option>
                <option value="Machinery Exchange">Machinery Exchange</option>
                <option value="Sinopower">Sinopower</option>
              </select>'''

# 3. Add syncCompanyFilters function before initOrdersLogic(); call
old3 = '    initOrdersLogic();'
new3 = '''    function syncCompanyFilters(sourceId, targetId) {
      const source = document.getElementById(sourceId);
      const target = document.getElementById(targetId);
      if (!source || !target) return;
      const val = source.value.toLowerCase();
      if (!val || val.includes("all")) {
        target.selectedIndex = 0;
      } else if (val.includes("machinery") || val.includes("mxg")) {
        target.selectedIndex = 1;
      } else if (val.includes("sinopower") || val.includes("sino")) {
        target.selectedIndex = 2;
      }
    }

    initOrdersLogic();'''

if old1 in content:
    content = content.replace(old1, new1)
    print("Updated mxg-company-filter")
else:
    print("Warning: old1 not found")

if old2 in content:
    content = content.replace(old2, new2)
    print("Updated ol-company")
else:
    print("Warning: old2 not found")

if old3 in content:
    content = content.replace(old3, new3)
    print("Added syncCompanyFilters")
else:
    print("Warning: old3 not found")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
