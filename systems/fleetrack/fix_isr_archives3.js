const fs = require('fs');
let content = fs.readFileSync('isr_block.js', 'utf8');

const getStart = "          const payload = {";
const getEnd = "          } else {\n            throw new Error(res.message?.message || \"Archival failed\");\n          }";

const startIndex = content.indexOf(getStart);
const endIndex = content.indexOf(getEnd, startIndex) + getEnd.length;

if (startIndex !== -1 && endIndex !== -1) {
    const newLoad = "          const payload = {\n" +
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
    content = content.substring(0, startIndex) + newLoad + content.substring(endIndex);
    console.log("Replaced archive_signed_report logic");
} else {
    console.log("Not found");
}

fs.writeFileSync('isr_block.js', content, 'utf8');
