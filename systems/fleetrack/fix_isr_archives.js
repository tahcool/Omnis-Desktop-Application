const fs = require('fs');
let content = fs.readFileSync('isr_block.js', 'utf8');

const getStart = "async function loadArchives() {";
const getEnd = "      }\n    }";

const startIndex = content.indexOf(getStart);
const endIndex = content.indexOf(getEnd, startIndex) + getEnd.length;

if (startIndex !== -1 && endIndex !== -1) {
    const newLoad = "async function loadArchives() {\n" +
"      const typeFilter = document.getElementById(\"archive-filter-type\")?.value || \"\";\n" +
"      const tbody = document.getElementById(\"archive-tbody\");\n" +
"      if (!tbody) return;\n" +
"\n" +
"      tbody.innerHTML = '<tr><td colspan=\"6\" style=\"padding:40px; text-align:center; color:#64748b;\">Loading archives...</td></tr>';\n" +
"\n" +
"      try {\n" +
"        const match = {};\n" +
"        if (typeFilter) match.report_type = typeFilter;\n" +
"        \n" +
"        const r = await window.electron.invoke('supabase:query', {\n" +
"            table: 'ft_service_report',\n" +
"            method: 'select',\n" +
"            params: { columns: '*', match: Object.keys(match).length ? match : undefined, range: {from: 0, to: 9999} }\n" +
"        });\n" +
"        if (r.error) throw new Error(r.error.message || JSON.stringify(r.error));\n" +
"        const list = r.data || [];\n" +
"        \n" +
"        console.log(\"[Archive] Loaded:\", list);\n" +
"\n" +
"        if (list.length === 0) {\n" +
"          tbody.innerHTML = '<tr><td colspan=\"6\" style=\"padding:60px; text-align:center; color:#94a3b8;\">No archived reports found.</td></tr>';\n" +
"          return;\n" +
"        }\n" +
"\n" +
"        tbody.innerHTML = list.map(a => \n" +
"          <tr style=\"border-bottom:1px solid #e2e8f0; font-size:13px; color:#475569; transition:background 0.2s; cursor:default;\" onmouseover=\"this.style.background='#f8fafc'\" onmouseout=\"this.style.background='white'\">\n" +
"            <td style=\"padding:14px 16px;\"><span style=\"background:#f1f5f9; padding:2px 8px; border-radius:4px; font-weight:600; font-size:10px; color:#64748b; text-transform:uppercase;\"></span></td>\n" +
"            <td style=\"padding:14px 16px; font-weight:600; color:#1e293b;\"></td>\n" +
"            <td style=\"padding:14px 16px;\"></td>\n" +
"            <td style=\"padding:14px 16px;\"></td>\n" +
"            <td style=\"padding:14px 16px; font-style:italic;\"></td>\n" +
"            <td style=\"padding:14px 16px; text-align:center;\">\n" +
"              <div style=\"display:flex; justify-content:center; gap:8px;\">\n" +
"                <button onclick=\"openPdfPreview('', '')\" style=\"background:#3b82f6; color:white; border:none; padding:6px 12px; border-radius:6px; font-size:11px; font-weight:600; cursor:pointer;\">View</button>\n" +
"              </div>\n" +
"            </td>\n" +
"          </tr>\n" +
"        ).join('');\n" +
"\n" +
"      } catch (err) {\n" +
"        console.error(\"[Archive] fetch error:\", err);\n" +
"        tbody.innerHTML = '<tr><td colspan=\"6\" style=\"padding:40px; text-align:center; color:#ef4444;\">Failed to load archives. Check console.</td></tr>';\n" +
"      }\n" +
"    }";
    content = content.substring(0, startIndex) + newLoad + content.substring(endIndex);
    console.log("Replaced loadArchives");
}

fs.writeFileSync('isr_block.js', content, 'utf8');
