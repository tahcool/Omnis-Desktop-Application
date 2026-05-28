import codecs

with codecs.open('js/report_engine.js', 'r', 'utf-8') as f:
    content = f.read()

replacement = '''
        if (window.selectedReport === "daily_breakdown_report_(dbr)") {
            if (window.getDBRData) {
                previewContainer.innerHTML = '<div style="text-align:center; margin-top:100px;">Fetching data from Supabase...</div>';
                data = await window.getDBRData(filters);
            } else {
                previewContainer.innerHTML = '<div style="text-align:center; margin-top:100px;">Data adapter for DBR not yet implemented.</div>';
                return;
            }
        } else {
            previewContainer.innerHTML = '<div style="text-align:center; margin-top:100px; color: #64748b;">The native data adapter for <b>' + window.selectedReportName + '</b> has not been migrated yet. Please implement it in <code>report_data_adapters.js</code>.</div>';
            return;
        }
'''

import re
pattern = r'if \(window\.selectedReport === "daily_breakdown_report_\(dbr\)"\) \{.*?(?=\s*const html = template\.render)'
content = re.sub(pattern, replacement.strip() + '\n        ', content, flags=re.DOTALL)

with codecs.open('js/report_engine.js', 'w', 'utf-8') as f:
    f.write(content)

print('Updated report_engine to gracefully handle missing adapters.')
