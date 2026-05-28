const fs = require('fs');
let content = fs.readFileSync('index.html', 'utf8');

const getStartArch = "          const payload = {";
const getEndArch = "          } else {\n            throw new Error(res.message?.message || \"Archival failed\");\n          }";

const startArchIndex = content.indexOf(getStartArch);
const endArchIndex = content.indexOf(getEndArch, startArchIndex) + getEndArch.length;

if (startArchIndex !== -1 && endArchIndex !== -1) {
    const newArch = "          const payload = {\n" +
"            type: \"DBR\",\n" +
"            title: \\DBR \ - \\\,\n" +
"            region: region,\n" +
"            signatories: signatoriesList || \"System\",\n" +
"            content_b64: base64data\n" +
"          };\n" +
"\n" +
"          const stamp = new Date().toISOString().replace(/T/, '_').replace(/:/g, '-').split('.')[0];\n" +
"          const filename = \\DBR_\_\.pdf\\;\n" +
"          let fileUrl = null;\n" +
"          \n" +
"          // 1. Upload to Supabase Storage\n" +
"          const uploadRes = await window.electron.invoke('storage:upload', {\n" +
"              bucket: 'reports',\n" +
"              path: filename,\n" +
"              base64Data: base64data,\n" +
"              contentType: 'application/pdf'\n" +
"          });\n" +
"          if (!uploadRes.ok) throw new Error(uploadRes.error || \"Upload failed\");\n" +
"          fileUrl = uploadRes.publicUrl;\n" +
"\n" +
"          // 2. Save metadata to native ft_service_report table\n" +
"          const res = await window.electron.invoke('supabase:query', {\n" +
"              table: 'ft_service_report',\n" +
"              method: 'insert',\n" +
"              params: { data: {\n" +
"                  report_type: 'DBR',\n" +
"                  title: payload.title,\n" +
"                  region: payload.region,\n" +
"                  signatories: payload.signatories,\n" +
"                  file_url: fileUrl\n" +
"              }}\n" +
"          });\n" +
"\n" +
"          if (!res.error) {\n" +
"            showToast(\"? Report Archived Successfully\", \"success\");\n" +
"            closeSignatureModal();\n" +
"            setTimeout(() => { showView(\"view-archives\"); }, 1500);\n" +
"          } else {\n" +
"            throw new Error(res.error.message || \"Archival failed\");\n" +
"          }";
    content = content.substring(0, startArchIndex) + newArch + content.substring(endArchIndex);
    console.log("Replaced archive_signed_report logic in index.html");
}

const getStartLoad = "async function loadReportArchives() {";
const getEndLoad = "      }\n    }";

const startLoadIndex = content.indexOf(getStartLoad);
const endLoadIndex = content.indexOf(getEndLoad, startLoadIndex) + getEndLoad.length;

if (startLoadIndex !== -1 && endLoadIndex !== -1) {
    const newLoad = "async function loadReportArchives() {\n" +
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
    content = content.substring(0, startLoadIndex) + newLoad + content.substring(endLoadIndex);
    console.log("Replaced loadReportArchives in index.html");
}

fs.writeFileSync('index.html', content, 'utf8');
