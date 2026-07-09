import re

with open(r'c:\Users\Administrator\omnis\systems\salestrack\index.html', 'r', encoding='utf-8') as f:
    content = f.read()

replacement = r'''    function renderGroupSalesTable(rows) {
      window._lastGroupSalesRows = rows; // Cache for edit pre-fill
      const tbody = document.getElementById("group-sales-list-body");
      if (!tbody) {
        console.warn("==== renderGroupSalesTable: TBODY IS NULL! ====");
        return;
      }
      console.warn("==== renderGroupSalesTable: TBODY FOUND ====");
      tbody.innerHTML = "";
      
      if (rows.length === 0) {
        tbody.innerHTML = <div style="padding:40px; text-align:center; color:#94a3b8; background:white; border-radius:12px; border:1px dashed #e2e8f0;">No matching records.</div>;
        return;
      }

      rows.forEach(item => {
        const dateStr = item.order_date ? formatDate(item.order_date) : "-";
        const row = document.createElement("div");
        row.className = "ai-sales-grid";
        row.style.cssText = "background:#fff; border-left:4px solid #8b2219; padding:10px 20px; border-bottom:1px solid #f1f5f9; cursor:pointer; transition:background 0.15s;";
        row.onmouseenter = function() { this.style.background = '#f8fafc'; };
        row.onmouseleave = function() { this.style.background = '#fff'; };
        
        row.innerHTML = 
          <div style="font-weight:700; color:#1e293b; font-size:13px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;"></div>
          <div style="font-weight:600; color:#64748b; font-size:12px;"></div>
          <div style="font-weight:800; color:#0f172a; font-size:13px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;"></div>
          <div style="font-weight:600; color:#8b2219; font-size:12px;"></div>
          <div><span style="display:inline-block; padding:2px 8px; background:#f1f5f9; border-radius:4px; font-size:10px; font-weight:800; color:#475569; text-transform:uppercase;"></span></div>
          <div style="text-align:center; font-weight:900; font-size:15px; color:#1e293b;"></div>
          <div style="text-align:center; font-weight:600; font-size:12px; color:#64748b;"></div>
          <div style="display:flex; gap:8px; justify-content:flex-end;">
            <button class="btn-text-action btn-edit-gs" data-name="" style="color:#3b82f6; background:none; border:none; cursor:pointer; font-size:14px;"><i class="fas fa-pencil-alt"></i></button>
            <button class="btn-text-action btn-delete-gs" data-name="" style="color:#ef4444; background:none; border:none; cursor:pointer; font-size:14px;"><i class="fas fa-trash-alt"></i></button>
          </div>
        ;
        tbody.appendChild(row);
      });

      console.warn("==== renderGroupSalesTable: APPENDED " + tbody.children.length + " ROWS ====");
      console.warn("==== renderGroupSalesTable: TBODY HEIGHT = " + tbody.clientHeight + ", FIRST ROW HEIGHT = " + (tbody.children[0] ? tbody.children[0].clientHeight : 0) + " ====");

      // Wire edit/delete per-row so the name is taken directly from the data
      const rowEls = tbody.querySelectorAll('.ai-order-row');
      rowEls.forEach((rowEl, i) => {
        const recordName = rows[i] ? rows[i].name : null;
        const editBtn = rowEl.querySelector('.btn-edit-gs');
        const deleteBtn = rowEl.querySelector('.btn-delete-gs');
        if (editBtn) editBtn.addEventListener('click', () => editGroupSale(recordName));
        if (deleteBtn) deleteBtn.addEventListener('click', () => deleteGroupSale(recordName));
      });
    }'''

pattern = r'    function renderGroupSalesTable\(rows\) \{.*?\}\n      \}\);\n    \}'

new_content = re.sub(pattern, replacement, content, flags=re.DOTALL)

with open(r'c:\Users\Administrator\omnis\systems\salestrack\index.html', 'w', encoding='utf-8') as f:
    f.write(new_content)

if new_content != content:
    print("Successfully replaced.")
else:
    print("Regex failed to match.")
