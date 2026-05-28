import codecs

with codecs.open('js/report_engine.js', 'r', 'utf-8') as f:
    content = f.read()

new_func = '''
window.openNativeReport = function(reportId, reportName) {
    window.selectedReport = reportId;
    window.selectedReportName = reportName;
    
    // Switch to the report view
    if (window.showView) {
        window.showView('view-reports');
    }
    
    // Reset the preview area
    document.getElementById('native-report-title').innerText = reportName;
    document.getElementById('native-report-preview').innerHTML = '<div style="color: #64748b; text-align: center; margin-top: 100px;">Please click "Generate" to preview the report.</div>';
    document.getElementById('btn-print-report').style.display = 'none';
};
'''

with codecs.open('js/report_engine.js', 'w', 'utf-8') as f:
    f.write(content + "\n" + new_func)

print('Added openNativeReport to report_engine.js')
