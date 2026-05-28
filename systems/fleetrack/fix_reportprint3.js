const fs = require('fs');
let c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');

// Find the end of printJobCard function and inject the two report print functions after it
const afterJobCard = "omnisExportPDF({ htmlContent: html, filename: 'JobCard-'+(row.name||'export')+'-'+new Date().toISOString().slice(0,10)+'.pdf', landscape: false });\n    };\r\n\r\n    // ---------------------------";

const withReportPrint = `omnisExportPDF({ htmlContent: html, filename: 'JobCard-'+(row.name||'export')+'-'+new Date().toISOString().slice(0,10)+'.pdf', landscape: false });
    };

    // ----------------------------------------------------------
    // 📄 printCurrentReportPDF() — Generic Native Report → PDF
    // ----------------------------------------------------------
    window.printCurrentReportPDF = function() {
      const reportName = window.__activeReportName || 'Report';
      const reportData = window.__activeReportData;
      const filters   = window.__activeReportFilters || {};

      if (!reportData || !reportData.result || !reportData.result.length) {
        showToast('No report data to export. Run the report first.', 'warn');
        return;
      }

      const cols = reportData.columns || [];
      const rows = reportData.result || [];

      const filterMeta = Object.entries(filters).filter(([,v])=>v).map(([k,v])=>k+': '+v).join('  |  ') || 'No filters applied';

      // Build thead
      const ths = cols.map(col => '<th>'+(col.label||col.fieldname||col)+'</th>').join('');
      // Build tbody
      const trs = rows.map(row => {
        const tds = cols.map(col => {
          const key = typeof col === 'object' ? col.fieldname : col;
          let val = row[key];
          if (val === null || val === undefined) val = '';
          return '<td>'+String(val)+'</td>';
        }).join('');
        return '<tr>'+tds+'</tr>';
      }).join('');

      const tableHtml = '<table><thead><tr>'+ths+'</tr></thead><tbody>'+trs+'</tbody></table>';

      const html = buildReportHtml({
        title: reportName,
        subtitle: filterMeta,
        tableHtml,
        metaLines: ['Records: '+rows.length+'  |  Filters: '+filterMeta]
      });

      omnisExportPDF({
        htmlContent: html,
        filename: reportName.replace(/[^a-z0-9]/gi,'_')+'-'+new Date().toISOString().slice(0,10)+'.pdf',
        landscape: true
      });
    };

    // ----------------------------------------------------------
    // 🖶 printCurrentReportPrinter() — Print to Physical Printer
    // ----------------------------------------------------------
    window.printCurrentReportPrinter = function() {
      const reportName = window.__activeReportName || 'Report';
      const reportData = window.__activeReportData;
      const filters   = window.__activeReportFilters || {};

      if (!reportData || !reportData.result || !reportData.result.length) {
        showToast('No report data to print. Run the report first.', 'warn');
        return;
      }

      const cols = reportData.columns || [];
      const rows = reportData.result || [];
      const filterMeta = Object.entries(filters).filter(([,v])=>v).map(([k,v])=>k+': '+v).join('  |  ') || 'No filters applied';

      const ths = cols.map(col => '<th>'+(col.label||col.fieldname||col)+'</th>').join('');
      const trs = rows.map(row => {
        const tds = cols.map(col => {
          const key = typeof col === 'object' ? col.fieldname : col;
          let val = row[key]; if (val===null||val===undefined) val='';
          return '<td>'+String(val)+'</td>';
        }).join('');
        return '<tr>'+tds+'</tr>';
      }).join('');

      const tableHtml = '<table><thead><tr>'+ths+'</tr></thead><tbody>'+trs+'</tbody></table>';
      const fullHtml = buildReportHtml({ title: reportName, subtitle: filterMeta, tableHtml, metaLines: ['Records: '+rows.length] });

      // Open print-only window — browser/system print dialog appears
      const pw = window.open('', '_blank', 'width=1100,height=800');
      if (pw) {
        pw.document.write(fullHtml);
        pw.document.close();
        pw.focus();
        setTimeout(() => { pw.print(); }, 700);
      } else {
        showToast('Could not open print window. Check popup blocker.', 'warn');
      }
    };

    // ---------------------------
    //`;

console.log('jobCard end found:', c.includes(afterJobCard));
c = c.replace(afterJobCard, withReportPrint);
fs.writeFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html', c, 'utf8');
console.log('Done. Size:', c.length);
