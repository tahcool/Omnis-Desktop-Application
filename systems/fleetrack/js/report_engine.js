window.ReportEngine = {
    async loadTemplate(reportName) {
        try {
            const reportPath = `${reportName}/${reportName}.html`;
            let response = await fetch(`report/${reportPath}`);
            if (!response.ok) {
                // Some reports might not have custom HTML templates, we will need a fallback generic table
                throw new Error("No custom HTML template found for this report.");
            }
            let html = await response.text();
            
            // Pre-process includes: {% include "mxg_fleet_track/report/_regional_signatures/southern.html" %}
            const includeRegex = /\{%\s*include\s*"([^"]+)"\s*%\}/g;
            let match;
            while ((match = includeRegex.exec(html)) !== null) {
                const fullMatch = match[0];
                const includePath = match[1];
                
                // Map "mxg_fleet_track/report/..." to "report/..."
                let localPath = includePath.replace('mxg_fleet_track/report/', 'report/');
                
                try {
                    let incRes = await fetch(localPath);
                    let incHtml = await incRes.text();
                    html = html.replace(fullMatch, incHtml);
                } catch(e) {
                    console.warn("Failed to load include:", localPath);
                    html = html.replace(fullMatch, "");
                }
            }
            
            // Configure Lodash to match Frappe micro-templating
            _.templateSettings.interpolate = /\{%=([\s\S]+?)%\}/g;
            _.templateSettings.evaluate = /\{%([\s\S]+?)%\}/g;
            _.templateSettings.escape = /\{%-([\s\S]+?)%\}/g;
            
            // Mock Frappe Global Object used in templates
            const mockFrappe = {
                user_info: () => ({ fullname: localStorage.getItem("userFullName") || "Admin" }),
                datetime: {
                    now_date: () => new Date()
                }
            };
            
            return {
               render: (data, filters) => {
                   try {
                       const compiled = _.template(html);
                       return compiled({ data, filters, frappe: mockFrappe, String });
                   } catch(e) {
                       console.error("Template rendering error:", e);
                       return `<div style="color:red">Error rendering report: ${e.message}</div>`;
                   }
               }
            };
        } catch(e) {
            console.error("Failed to load report template:", e);
            throw e;
        }
    },
    
    printReport(htmlContent) {
        const iframe = document.createElement('iframe');
        iframe.style.position = 'absolute';
        iframe.style.width = '0px';
        iframe.style.height = '0px';
        iframe.style.border = 'none';
        document.body.appendChild(iframe);
        
        const doc = iframe.contentWindow.document;
        doc.open();
        doc.write(htmlContent);
        doc.close();
        
        iframe.onload = function() {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
            setTimeout(() => {
                document.body.removeChild(iframe);
            }, 1000);
        };
    }
};


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
        } else {
            previewContainer.innerHTML = '<div style="text-align:center; margin-top:100px; color: #64748b;">The native data adapter for <b>' + window.selectedReportName + '</b> has not been migrated yet. Please implement it in <code>report_data_adapters.js</code>.</div>';
            return;
        }
        
        
        const html = template.render(data, filters);
        previewContainer.innerHTML = html;
        document.getElementById('btn-print-report').style.display = 'flex';
    } catch(e) {
        console.error(e);
        previewContainer.innerHTML = `<div style="color:red; text-align:center; margin-top:100px;">Error generating report: ${e.message}</div>`;
    }
};

window.printNativeReport = function() {
    const html = document.getElementById('native-report-preview').innerHTML;
    window.ReportEngine.printReport(html);
};


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
