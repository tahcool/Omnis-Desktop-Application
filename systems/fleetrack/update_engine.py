import codecs

with codecs.open('js/report_engine.js', 'r', 'utf-8') as f:
    content = f.read()

new_functions = '''
window.generateNativeReport = async function() {
    if (!window.selectedReport) {
        alert("Please select a report from the Reports dropdown first.");
        return;
    }
    
    document.getElementById('native-report-title').innerText = window.selectedReportName || window.selectedReport;
    const previewContainer = document.getElementById('native-report-preview');
    previewContainer.innerHTML = '<div style="text-align:center; margin-top:100px;">Loading report template...</div>';
    
    try {
        const template = await window.ReportEngine.loadTemplate(window.selectedReport);
        
        // Fetch data based on report type (Phase 3 handles DBR Data Adapter)
        // For now, if DBR, we will fetch Supabase data.
        let data = [];
        const filters = {
            region: document.getElementById('report-filter-region').value
        };
        
        if (window.selectedReport === "daily_breakdown_report_(dbr)") {
            if (window.getDBRData) {
                previewContainer.innerHTML = '<div style="text-align:center; margin-top:100px;">Fetching data from Supabase...</div>';
                data = await window.getDBRData(filters);
            } else {
                previewContainer.innerHTML = '<div style="text-align:center; margin-top:100px;">Data adapter for DBR not yet implemented.</div>';
                return;
            }
        }
        
        const html = template.render(data, filters);
        previewContainer.innerHTML = html;
        document.getElementById('btn-print-report').style.display = 'flex';
    } catch(e) {
        console.error(e);
        previewContainer.innerHTML = <div style="color:red; text-align:center; margin-top:100px;">Error generating report: </div>;
    }
};

window.printNativeReport = function() {
    const html = document.getElementById('native-report-preview').innerHTML;
    window.ReportEngine.printReport(html);
};
'''

content += "\n" + new_functions

with codecs.open('js/report_engine.js', 'w', 'utf-8') as f:
    f.write(content)

print('Added generateNativeReport and printNativeReport.')
