  (function() {
    var API = "/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.get_hmr_activity_report";
    var data = [];
    var modal = null;

    function buildModal() {
      if (modal) return; // already built
      modal = document.createElement("div");
      modal.id = "hmr-act-modal-root";
      modal.style.cssText = "display:none;position:fixed;inset:0;background:rgba(10,17,35,0.93);z-index:99999;align-items:center;justify-content:center;backdrop-filter:blur(10px);font-family:inherit;";

      modal.innerHTML = [
        '<div style="width:96vw;max-width:1120px;max-height:92vh;background:#0f172a;border-radius:16px;border:1px solid #334155;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 30px 60px rgba(0,0,0,0.7);">',
          // Header
          '<div style="padding:18px 24px;background:linear-gradient(135deg,#0f172a,#1e293b);border-bottom:1px solid #334155;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">',
            '<div>',
              '<div style="font-size:19px;font-weight:800;color:#f8fafc;">&#x1F4CA; HMR Activity Report</div>',
              '<div style="font-size:12px;color:#94a3b8;margin-top:3px;">Track machines whose HMR was updated within a selected period</div>',
            '</div>',
            '<button id="hmrActClose" style="background:none;border:none;color:#94a3b8;font-size:24px;cursor:pointer;padding:4px 10px;line-height:1;">&times;</button>',
          '</div>',
          // Filters
          '<div style="padding:14px 24px;background:#0f172a;border-bottom:1px solid #334155;flex-shrink:0;">',
            '<div style="display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end;">',
              '<div><div style="font-size:10px;font-weight:700;color:#64748b;margin-bottom:4px;text-transform:uppercase;">From</div><input type="date" id="hmrActFrom" style="padding:8px 10px;border:1px solid #334155;border-radius:8px;font-size:12px;background:#1e293b;color:#e2e8f0;outline:none;width:145px;"></div>',
              '<div><div style="font-size:10px;font-weight:700;color:#64748b;margin-bottom:4px;text-transform:uppercase;">To</div><input type="date" id="hmrActTo" style="padding:8px 10px;border:1px solid #334155;border-radius:8px;font-size:12px;background:#1e293b;color:#e2e8f0;outline:none;width:145px;"></div>',
              '<div style="flex:1;min-width:140px;"><div style="font-size:10px;font-weight:700;color:#64748b;margin-bottom:4px;text-transform:uppercase;">Region</div><select id="hmrActRegion" style="width:100%;padding:8px 10px;border:1px solid #334155;border-radius:8px;font-size:12px;background:#1e293b;color:#e2e8f0;outline:none;"><option value="">All Regions</option><option>North</option><option>South</option><option>East</option><option>West</option></select></div>',
              '<div style="flex:2;min-width:180px;"><div style="font-size:10px;font-weight:700;color:#64748b;margin-bottom:4px;text-transform:uppercase;">Customer</div><input type="text" id="hmrActCustomer" placeholder="Filter by customer..." style="width:100%;padding:8px 10px;border:1px solid #334155;border-radius:8px;font-size:12px;background:#1e293b;color:#e2e8f0;outline:none;box-sizing:border-box;"></div>',
              '<div style="display:flex;gap:8px;flex-shrink:0;">',
                '<button id="hmrActRun" style="background:linear-gradient(135deg,#0ea5e9,#6366f1);color:white;border:none;padding:9px 18px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;">&#x1F50D; Generate</button>',
                '<button id="hmrActCsv" style="background:#1e293b;color:#94a3b8;border:1px solid #334155;padding:9px 12px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;">&#x2B07; CSV</button>',
                '<button id="hmrActPrint" style="background:#1e293b;color:#94a3b8;border:1px solid #334155;padding:9px 12px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;">&#x1F5A8;</button>',
              '</div>',
            '</div>',
          '</div>',
          // Summary
          '<div id="hmrActSummary" style="display:none;padding:10px 24px;background:#1e293b;border-bottom:1px solid #334155;flex-shrink:0;">',
            '<div style="display:flex;gap:20px;flex-wrap:wrap;font-size:11px;color:#94a3b8;">',
              'Period: <strong id="hmrActSumPeriod" style="color:#e2e8f0;"></strong>',
              '&nbsp;|&nbsp; Machines Updated: <strong id="hmrActSumTotal" style="color:#38bdf8;font-size:16px;"></strong>',
              '&nbsp;|&nbsp; Total Logs: <strong id="hmrActSumLogs" style="color:#a78bfa;"></strong>',
              '&nbsp;|&nbsp; Avg/Machine: <strong id="hmrActSumAvg" style="color:#34d399;"></strong>',
            '</div>',
          '</div>',
          // State message
          '<div id="hmrActState" style="padding:48px;text-align:center;color:#475569;font-size:13px;">Select a date range and click <strong style=\'color:#94a3b8;\'>Generate</strong></div>',
          // Table area — LIGHT theme
          '<div style="overflow-y:auto;flex:1;background:#f8fafc;">',
            '<table id="hmrActTable" style="display:none;width:100%;border-collapse:collapse;font-size:11.5px;">',
              '<thead><tr style="background:#1e293b;border-bottom:2px solid #0f172a;position:sticky;top:0;z-index:1;">',
                '<th style="padding:10px 12px;color:#94a3b8;text-align:left;white-space:nowrap;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;">#</th>',
                '<th style="padding:10px 12px;color:#94a3b8;text-align:left;white-space:nowrap;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;">Customer</th>',
                '<th style="padding:10px 12px;color:#94a3b8;text-align:left;white-space:nowrap;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;">Machine</th>',
                '<th style="padding:10px 12px;color:#94a3b8;text-align:left;white-space:nowrap;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;">Model</th>',
                '<th style="padding:10px 12px;color:#94a3b8;text-align:left;white-space:nowrap;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;">Region</th>',
                '<th style="padding:10px 12px;color:#94a3b8;text-align:center;white-space:nowrap;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;">Updates</th>',
                '<th style="padding:10px 12px;color:#94a3b8;text-align:right;white-space:nowrap;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;">HMR Start</th>',
                '<th style="padding:10px 12px;color:#94a3b8;text-align:right;white-space:nowrap;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;">HMR End</th>',
                '<th style="padding:10px 12px;color:#94a3b8;text-align:right;white-space:nowrap;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;">&Delta; HMR</th>',
                '<th style="padding:10px 12px;color:#94a3b8;text-align:left;white-space:nowrap;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;">First</th>',
                '<th style="padding:10px 12px;color:#94a3b8;text-align:left;white-space:nowrap;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;">Last</th>',
                '<th style="padding:10px 12px;color:#94a3b8;text-align:left;white-space:nowrap;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;">Logger(s)</th>',
              '</tr></thead>',
              '<tbody id="hmrActTbody"></tbody>',
            '</table>',
          '</div>',
        '</div>'
      ].join("");

      document.body.appendChild(modal);

      document.getElementById("hmrActClose").onclick = function() { modal.style.display = "none"; };
      document.getElementById("hmrActRun").onclick   = runReport;
      document.getElementById("hmrActCsv").onclick   = exportCsv;
      document.getElementById("hmrActPrint").onclick = printReport;
    }

    function openModal() {
      buildModal();
      var now = new Date(), y = now.getFullYear(), m = String(now.getMonth()+1).padStart(2,"0");
      var f = document.getElementById("hmrActFrom"), t = document.getElementById("hmrActTo");
      if (f && !f.value) f.value = y+"-"+m+"-01";
      if (t && !t.value) { var ld = new Date(y, now.getMonth()+1, 0); t.value = ld.toISOString().split("T")[0]; }
      modal.style.display = "flex";
    }

    async function runReport() {
      var tbEl = document.getElementById("hmrActTable");
      var smEl = document.getElementById("hmrActSummary");
      var stEl = document.getElementById("hmrActState");

      var df = document.getElementById("hmrActFrom").value;
      var dt = document.getElementById("hmrActTo").value;
      var rg = document.getElementById("hmrActRegion").value;
      var cu = document.getElementById("hmrActCustomer").value;
      if (!df || !dt) { alert("Select both From and To dates."); return; }
      
      stEl.textContent = "Loading...";
      tbEl.style.display = "none"; smEl.style.display = "none";
      try {
        var res = await window.callFrappe(API, {date_from:df, date_to:dt, region:rg, customer:cu}, 'GET', { 
          showLoader: true, 
          loaderMsg: "Generating Report" 
        });
        var d = (res && res.message) ? res.message : res;
        if (d && d.error) throw new Error(d.error);
        var rows = (d && d.rows) ? d.rows : [];
        rows.sort(function(a,b){ return (a.customer||"").localeCompare(b.customer||""); });
        data = rows;
        if (!rows.length) { stEl.textContent = "No HMR updates found for selected period."; return; }
        var tl = rows.reduce(function(s,r){return s+r.update_count;},0);
        document.getElementById("hmrActSumPeriod").textContent = df+" → "+dt;
        document.getElementById("hmrActSumTotal").textContent  = rows.length;
        document.getElementById("hmrActSumLogs").textContent   = tl;
        document.getElementById("hmrActSumAvg").textContent    = (tl/rows.length).toFixed(1);
        smEl.style.display = "block";
        var tbody = document.getElementById("hmrActTbody"); tbody.innerHTML = "";
        var customerSpans = {};
        rows.forEach(function(r){ customerSpans[r.customer] = (customerSpans[r.customer]||0) + 1; });
        var seen = {};

        rows.forEach(function(r,i) {
          var tr = document.createElement("tr");
          var isEven = i % 2 === 0;
          tr.style.background = isEven ? "#ffffff" : "#f1f5f9";
          tr.style.borderBottom = "1px solid #e2e8f0";
          tr.onmouseover = function(){tr.style.background="#dbeafe";};
          tr.onmouseout  = function(){tr.style.background = isEven ? "#ffffff" : "#f1f5f9";};
          
          var isFirst = !seen[r.customer];
          if(isFirst) { seen[r.customer] = true; tr.style.borderTop = "2px solid #cbd5e1"; }

          // Update count badge colors — keep vivid on light bg
          var cc = r.update_count>=5?"#16a34a":r.update_count>=2?"#d97706":"#64748b";
          var cbg= r.update_count>=5?"#dcfce7":r.update_count>=2?"#fef3c7":"#f1f5f9";
          var dc = (r.hmr_change||0)>100?"#16a34a":(r.hmr_change||0)>0?"#0369a1":"#dc2626";
          
          var html = '<td style="padding:9px 12px;color:#94a3b8;font-size:11px;">'+(i+1)+'</td>';
          if(isFirst){
            html += '<td rowspan="'+customerSpans[r.customer]+'" style="padding:9px 12px;color:#0f172a;font-weight:700;font-size:12px;vertical-align:middle;background:#f8fafc;border-right:1px solid #e2e8f0;">'+(r.customer||'—')+'</td>';
          }
          html +=
            '<td style="padding:9px 12px;"><div style="font-weight:700;color:#0f172a;font-size:12px;">'+(r.machine||'')+'</div>'+
            (r.fleet_no&&r.fleet_no!=="—"?'<div style="font-size:9px;color:#94a3b8;">Fleet: '+r.fleet_no+'</div>':'')+'</td>'+
            '<td style="padding:9px 12px;color:#475569;font-size:11px;">'+(r.model||'—')+'</td>'+
            '<td style="padding:9px 12px;color:#64748b;font-size:11px;">'+(r.region||'—')+'</td>'+
            '<td style="padding:9px 12px;text-align:center;"><span style="background:'+cbg+';color:'+cc+';font-weight:800;font-size:13px;padding:2px 10px;border-radius:20px;border:1px solid '+cc+'20;">'+r.update_count+'</span></td>'+
            '<td style="padding:9px 12px;text-align:right;color:#64748b;font-family:monospace;font-size:11px;">'+(r.hmr_start!=null?r.hmr_start:'—')+'</td>'+
            '<td style="padding:9px 12px;text-align:right;color:#0f172a;font-weight:700;font-family:monospace;font-size:12px;">'+(r.hmr_end!=null?r.hmr_end:'—')+'</td>'+
            '<td style="padding:9px 12px;text-align:right;color:'+dc+';font-weight:700;font-family:monospace;font-size:12px;">'+(r.hmr_change!=null?"+"+r.hmr_change:'—')+'</td>'+
            '<td style="padding:9px 12px;color:#94a3b8;font-size:10px;">'+(r.first_update_date||'—')+'</td>'+
            '<td style="padding:9px 12px;color:#0369a1;font-size:10px;font-weight:600;">'+(r.last_update_date||'—')+'</td>'+
            '<td style="padding:9px 12px;color:#94a3b8;font-size:10px;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+(r.loggers||'—')+'</td>';
          tr.innerHTML = html;
          tbody.appendChild(tr);
        });
        stEl.style.display = "none"; tbEl.style.display = "table";
      } catch(e) { stEl.textContent = "Error: "+(e.message||String(e)); }
    }

    function exportCsv() {
      if (!data.length) { alert("Generate the report first."); return; }
      var h = ["#","Customer","Machine","Model","Region","Fleet No","Updates","HMR Start","HMR End","HMR Change","First Update","Last Update","Loggers"];
      var rows = data.map(function(r,i){
        return [i+1,r.customer,r.machine,r.model,r.region,r.fleet_no,r.update_count,
          r.hmr_start!=null?r.hmr_start:"",r.hmr_end!=null?r.hmr_end:"",r.hmr_change!=null?r.hmr_change:"",
          r.first_update_date,r.last_update_date,r.loggers]
          .map(function(v){return '"'+String(v).replace(/"/g,'""')+'"';}).join(",");
      });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([[h.join(",")].concat(rows).join("\n")],{type:"text/csv"}));
      a.download = "HMR_Activity_"+(document.getElementById("hmrActFrom").value||"")+"_to_"+(document.getElementById("hmrActTo").value||"")+".csv";
      a.click();
    }

    function printReport() {
      if (!data.length) { alert("Generate the report first."); return; }
      var df = document.getElementById("hmrActFrom").value;
      var dt = document.getElementById("hmrActTo").value;
      
      var customerSpans = {};
      data.forEach(function(r){ customerSpans[r.customer] = (customerSpans[r.customer]||0) + 1; });
      
      var seenPrint = {};
      var tr = data.map(function(r,i){
        var isFirstPrint = !seenPrint[r.customer];
        if(isFirstPrint) seenPrint[r.customer] = true;
        var custCell = isFirstPrint ? "<td rowspan='"+customerSpans[r.customer]+"'><b>"+(r.customer||"—")+"</b></td>" : "";
        return "<tr style='"+(isFirstPrint?"border-top:2px solid #334155;":"")+"'><td>"+(i+1)+"</td>"+custCell+"<td><b>"+r.machine+"</b></td><td>"+r.model+"</td><td>"+r.region+"</td>"+
          "<td style='text-align:center;color:"+(r.update_count>=5?"green":r.update_count>=2?"darkorange":"gray")+"'><b>"+r.update_count+"</b></td>"+
          "<td style='text-align:right;'>"+(r.hmr_start!=null?r.hmr_start:"—")+"</td><td style='text-align:right;'><b>"+(r.hmr_end!=null?r.hmr_end:"—")+"</b></td>"+
          "<td style='text-align:right;color:"+((r.hmr_change||0)>0?"green":"red")+";'><b>+"+(r.hmr_change!=null?r.hmr_change:"—")+"</b></td>"+
          "<td>"+r.first_update_date+"</td><td>"+r.last_update_date+"</td><td style='font-size:9px;'>"+r.loggers+"</td></tr>";
      }).join("");
      var w = window.open("","_blank");
      w.document.write("<!DOCTYPE html><html><head><title>HMR Activity Report</title>"+
        "<style>body{font-family:Arial,sans-serif;font-size:11px;padding:16px;}table{width:100%;border-collapse:collapse;}"+
        "th{background:#1e293b;color:white;padding:6px 8px;text-align:left;font-size:10px;}td{padding:6px 8px;border-bottom:1px solid #e5e7eb;vertical-align:middle;}"+
        "tr:nth-child(even) td{background:#f8fafc;}</style></head><body>"+
        "<h2>HMR Activity Report &mdash; "+df+" to "+dt+"</h2><p>Generated: "+new Date().toLocaleString()+" | Machines: "+data.length+"</p>"+
        "<table><thead><tr><th>#</th><th>Customer</th><th>Machine</th><th>Model</th><th>Region</th><th>Updates</th>"+
        "<th>HMR Start</th><th>HMR End</th><th>&Delta; HMR</th><th>First</th><th>Last</th><th>Loggers</th></tr></thead>"+
        "<tbody>"+tr+"</tbody></table><scr"+"ipt>window.onload=function(){window.print();};<"+"/script></body></html>");
      w.document.close();
    }

    window.openHmrActivityReport = openModal;
  })();