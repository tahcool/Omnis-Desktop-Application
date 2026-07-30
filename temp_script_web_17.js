

    // ── Dashboard inline machine search ──────────────────────────────────
    function _dashMachineSearch(q) {
      const res  = document.getElementById('dash-machine-results');
      const cnt  = document.getElementById('dash-search-count');
      if (!res) return;
      q = (q || '').trim().toLowerCase();
      if (!q) {
        res.innerHTML = '<div style="padding:10px 14px;font-size:11px;color:#94a3b8;font-weight:500;">Start typing to search machines\u2026</div>';
        if (cnt) cnt.textContent = '';
        return;
      }
      const pool = window.FT_MACHINE_ROWS || [];
      const hits = pool.filter(m => {
        const sn     = (m.sn     || m.name || '').toLowerCase();
        const model  = (m.model  || '').toLowerCase();
        const fleet  = (m.fleet_no || m.mxg_fleet_no || '').toLowerCase();
        const cust   = (m.customer || '').toLowerCase();
        return sn.includes(q) || model.includes(q) || fleet.includes(q) || cust.includes(q);
      }).slice(0, 6);

      if (cnt) cnt.textContent = hits.length ? `${hits.length} found` : 'No matches';

      if (!hits.length) {
        res.innerHTML = '<div style="padding:10px 14px;font-size:11px;color:#94a3b8;">No machines match \u201c' + q.substring(0,30) + '\u201d</div>';
        return;
      }

      res.innerHTML = hits.map(m => {
        const wty = (m.warranty_status || '').toLowerCase();
        const wtyColor = wty.includes('in') ? '#15803d' : wty.includes('expire') ? '#b45309' : '#64748b';
        const wtyBg    = wty.includes('in') ? '#dcfce7' : wty.includes('expire') ? '#fef3c7' : '#f1f5f9';
        const wtyPill  = m.warranty_status
          ? `<span style="padding:1px 7px;border-radius:99px;background:${wtyBg};color:${wtyColor};font-size:9px;font-weight:700;">${m.warranty_status}</span>`
          : '';
        const hmr = m.current_hmr != null ? `<span style="font-family:monospace;font-weight:800;color:#1e40af;font-size:10px;">${Number(m.current_hmr).toLocaleString()} hrs</span>` : '';
        const machineName = m.sn || m.name || '—';
        return `<div onclick="openMachineLookup('${(machineName).replace(/'/g,"\\'")}')"
          style="display:flex;align-items:center;gap:10px;padding:7px 14px;cursor:pointer;border-bottom:1px solid #f8fafc;transition:background .1s;"
          onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''">
          <div style="flex:1;min-width:0;">
            <div style="font-size:11px;font-weight:700;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${m.model || machineName} <span style="color:#64748b;font-weight:500;">&middot; ${m.customer || '—'}</span></div>
            <div style="font-size:10px;color:#94a3b8;font-weight:500;">${machineName} &nbsp;&bull;&nbsp; Fleet: ${m.fleet_no || m.mxg_fleet_no || '—'}</div>
          </div>
          <div style="display:flex;gap:6px;align-items:center;flex-shrink:0;">${hmr}${wtyPill}</div>
        </div>`;
      }).join('');
    }

    let _mlookupMachine=null;
    function openMachineLookup(p){
      const pan=document.getElementById('modal-machine-lookup'),bg=document.getElementById('modal-machine-lookup-backdrop');
      pan.style.display='flex';bg.style.display='block';
      requestAnimationFrame(()=>{pan.style.transform='translateX(0)';});
      if(p)mlookupShowMachine(p);else setTimeout(()=>document.getElementById('mlookup-search')?.focus(),300);
      if(!window.MACHINES_MAP||!Object.keys(window.MACHINES_MAP).length)if(typeof loadFtMachineRegister==='function')loadFtMachineRegister();
    }
    function openQuickHmrModal(){if(typeof window.openHmrLogModal==='function')window.openHmrLogModal(null);else openMachineLookup();}
    function closeMachineLookup(){
      const pan=document.getElementById('modal-machine-lookup'),bg=document.getElementById('modal-machine-lookup-backdrop');
      pan.style.transform='translateX(100%)';
      setTimeout(()=>{pan.style.display='none';bg.style.display='none';},300);
      _mlookupMachine=null;
    }
    function mlookupSearch(q){
      const dd=document.getElementById('mlookup-dropdown'),ql=(q||'').trim().toLowerCase();
      if(!ql){dd.style.display='none';return;}
      const hits=Object.values(window.MACHINES_MAP||{}).filter(m=>[m.model,m.sn,m.name,m.fleet_no,m.customer].some(v=>(v||'').toLowerCase().includes(ql))).slice(0,8);
      dd.innerHTML='';
      if(!hits.length){dd.innerHTML='<li style="padding:10px 14px;color:#94a3b8;font-size:12px;">No machines found</li>';dd.style.display='block';return;}
      hits.forEach(m=>{
        const li=document.createElement('li');
        li.style.cssText='padding:10px 14px;cursor:pointer;border-bottom:1px solid #f1f5f9;transition:background .1s;';
        li.innerHTML=`<div style="font-weight:700;font-size:13px;color:#0f172a;">${m.model||m.name}</div><div style="font-size:11px;color:#64748b;">${m.name} &middot; ${m.customer||'\u2014'}</div>`;
        li.onclick=()=>{document.getElementById('mlookup-search').value=`${m.model||m.name} \u2014 ${m.name}`;dd.style.display='none';mlookupShowMachine(m.name);};
        li.onmouseenter=()=>li.style.background='#f8fafc';li.onmouseleave=()=>li.style.background='#fff';
        dd.appendChild(li);
      });
      dd.style.display='block';
    }
    function mlookupShowMachine(name){
      const m=window.MACHINES_MAP?.[name];if(!m)return;_mlookupMachine=name;
      document.getElementById('mlookup-empty').style.display='none';
      document.getElementById('mlookup-card').style.display='block';
      const acts=document.getElementById('mlookup-actions');acts.style.display='flex';acts.style.flexDirection='column';

      // ── Hero fields ──
      document.getElementById('mlookup-model').textContent=m.model||'\u2014';
      document.getElementById('mlookup-serial').textContent=m.name||'\u2014';
      document.getElementById('mlookup-fleet').textContent=m.mxg_fleet_no||m.fleet_no?'Fleet: '+(m.mxg_fleet_no||m.fleet_no):'';
      document.getElementById('mlookup-hmr').textContent=m.current_hmr!=null?Number(m.current_hmr).toLocaleString():'\u2014';

      // Status badge
      const sb=document.getElementById('mlookup-status-badge'),st=(m.status||'').toLowerCase();
      const stStyles={active:'background:#dcfce7;color:#15803d',inactive:'background:#fee2e2;color:#b91c1c','under maintenance':'background:#fef9c3;color:#a16207',breakdown:'background:#fee2e2;color:#b91c1c'};
      sb.style.cssText='font-size:10px;font-weight:700;padding:4px 10px;border-radius:99px;flex-shrink:0;margin-top:2px;'+(stStyles[st]||'background:#e2e8f0;color:#64748b');
      sb.textContent=m.status||'Unknown';

      // Warranty pill
      const wp=document.getElementById('mlookup-warranty-pill'),ws=(m.warranty_status||'').toLowerCase();
      wp.style.cssText=ws.includes('under')||ws==='in warranty'?'font-size:11px;font-weight:700;padding:5px 14px;border-radius:99px;background:#dcfce7;color:#15803d;':ws.includes('fringe')||ws.includes('expir')?'font-size:11px;font-weight:700;padding:5px 14px;border-radius:99px;background:#fef9c3;color:#a16207;':ws.includes('out')||ws.includes('expired')?'font-size:11px;font-weight:700;padding:5px 14px;border-radius:99px;background:#fee2e2;color:#b91c1c;':'font-size:11px;font-weight:700;padding:5px 14px;border-radius:99px;background:#e2e8f0;color:#64748b;';
      wp.textContent=m.warranty_status||'N/A';

      // ── Service HMR progress bar ──
      const barWrap=document.getElementById('mlookup-service-bar-wrap');
      if(m.current_hmr!=null&&m.last_service_hmr!=null&&m.next_service_hmr!=null){
        const cur=Number(m.current_hmr),last=Number(m.last_service_hmr),next=Number(m.next_service_hmr);
        const range=Math.max(next-last,1),done=cur-last,pct=Math.min(Math.max(done/range*100,0),100);
        const remaining=next-cur,overdue=remaining<0;
        document.getElementById('mlookup-bar-last').textContent=last.toLocaleString();
        document.getElementById('mlookup-bar-next').textContent=next.toLocaleString();
        const fill=document.getElementById('mlookup-bar-fill');
        fill.style.width=pct+'%';
        fill.style.background=overdue?'#ef4444':pct>80?'#f59e0b':'#22c55e';
        const remEl=document.getElementById('mlookup-bar-remaining');
        remEl.style.color=overdue?'#b91c1c':'#15803d';
        remEl.textContent=overdue?'OVERDUE by '+(Math.abs(remaining)).toLocaleString()+' h':(remaining).toLocaleString()+' h to next service';
        const dueLabel=document.getElementById('mlookup-bar-due-label');
        dueLabel.style.color=overdue?'#b91c1c':'#64748b';
        barWrap.style.display='block';
      } else {barWrap.style.display='none';}

      // ── Info grid ──
      document.getElementById('mlookup-customer').textContent=m.customer||'\u2014';
      document.getElementById('mlookup-region').textContent=m.region||'\u2014';
      document.getElementById('mlookup-oem').textContent=m.oem||'\u2014';
      document.getElementById('mlookup-fleet-no').textContent=m.mxg_fleet_no||m.fleet_no||'\u2014';
      document.getElementById('mlookup-last-srvc').textContent=m.last_service_hmr!=null?Number(m.last_service_hmr).toLocaleString()+' h':'\u2014';
      const nxEl=document.getElementById('mlookup-next-srvc');
      if(m.next_service_hmr!=null){
        const over=m.current_hmr!=null&&Number(m.current_hmr)>Number(m.next_service_hmr);
        nxEl.style.color=over?'#b91c1c':'#0f172a';
        nxEl.textContent=Number(m.next_service_hmr).toLocaleString()+' h'+(over?' \u26a0 OVERDUE':'');
      } else {nxEl.textContent='\u2014';nxEl.style.color='#0f172a';}
      document.getElementById('mlookup-serial-no').textContent=m.serial_no||m.sn||m.name||'\u2014';

      // ── Breakdowns summary ──
      const allBd=(window.FT_BREAKDOWN_ROWS||[]).filter(b=>b.machine===name);
      const openBd=allBd.filter(b=>!['closed','resolved','completed'].includes((b.status||'').toLowerCase()));
      document.getElementById('mlookup-breakdown-count').textContent=openBd.length||'0';
      document.getElementById('mlookup-breakdown-total').textContent=allBd.length||'0';
      const bdList=document.getElementById('mlookup-breakdowns-list');
      const recentBd=allBd.sort((a,b)=>new Date(b.breakdown_date||0)-new Date(a.breakdown_date||0)).slice(0,4);
      // Store rows so onclick can retrieve by index
      window._mlookupBdRows = recentBd;
      bdList.innerHTML=recentBd.length?recentBd.map((b,i)=>`<div onclick="if(typeof openBreakdownModal==='function')openBreakdownModal(window._mlookupBdRows[${i}])" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:9px 12px;border-left:3px solid ${['open','pending'].includes((b.status||'').toLowerCase())?'#f59e0b':'#94a3b8'};margin-bottom:6px;cursor:pointer;transition:opacity .15s;" onmouseover="this.style.opacity='.82'" onmouseout="this.style.opacity='1'">
        <div style="font-size:11px;font-weight:700;color:#0f172a;">${(b.description||b.problem||'Breakdown').slice(0,80)}</div>
        <div style="font-size:10px;color:#64748b;margin-top:3px;">${b.status||'Unknown'} &middot; ${b.breakdown_date||''} &middot; Days open: ${b.days_open||'—'} <span style="float:right;font-size:9px;color:#94a3b8;">&#9998; Edit</span></div>
      </div>`).join(''):'<div style="font-size:11px;color:#94a3b8;text-align:center;padding:12px 0;font-weight:600;">✔ No breakdown history</div>';

      // ── Service Tracking ──
      const renderServiceTracking = (fspRows) => {
        const svcEl = document.getElementById('mlookup-service-list');
        if (!svcEl) return;
        // Filter to this machine — match on machine or machine_name field
        const machineSvcs = fspRows.filter(r =>
          (r.machine||'')===name || (r.machine_name||'')===name ||
          (r.machine||'').toLowerCase()===(m.model||'').toLowerCase()
        );
        if (!machineSvcs.length) {
          svcEl.innerHTML = '<div style="font-size:11px;color:#94a3b8;text-align:center;padding:12px 0;font-weight:600;">No service records in FSP for this machine</div>';
          return;
        }
        const today = new Date();
        // Last completed service
        const completed = machineSvcs
          .filter(r => (r.status||'').toLowerCase() === 'completed')
          .sort((a,b) => new Date(b.plan_for||b.raw_date||0) - new Date(a.plan_for||a.raw_date||0));
        const lastSvc = completed[0] || null;
        // Next upcoming (Planned / In Progress / Proposed) — closest future date first
        const upcoming = machineSvcs
          .filter(r => !['completed'].includes((r.status||'').toLowerCase()))
          .sort((a,b) => new Date(a.plan_for||a.raw_date||0) - new Date(b.plan_for||b.raw_date||0));
        const nextSvc = upcoming[0] || null;
        const stBg = {proposed:'#f1f5f9',planned:'#eff6ff','in progress':'#fef9c3',completed:'#dcfce7'};
        const stCol = {proposed:'#64748b',planned:'#1d4ed8','in progress':'#854d0e',completed:'#166534'};
        // Cache FSP rows for onclick retrieval
        window._mlookupFspRows = machineSvcs;
        const svcCard = (r, label, borderCol, idx) => {
          const dateStr = r.plan_for || r.raw_date || '';
          const daysAgo = dateStr ? Math.round((today - new Date(dateStr))/86400000) : null;
          const st = (r.status||'').toLowerCase();
          const bgC = stBg[st]||'#f1f5f9', txC = stCol[st]||'#64748b';
          return `<div onclick="if(typeof openFspDetailModal==='function')openFspDetailModal(window._mlookupFspRows[${idx}])" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:11px 14px;border-left:3px solid ${borderCol};margin-bottom:8px;cursor:pointer;transition:opacity .15s;" onmouseover="this.style.opacity='.82'" onmouseout="this.style.opacity='1'">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
              <span style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.4px;color:#94a3b8;">${label}</span>
              <div style="display:flex;align-items:center;gap:6px;">
                <span style="font-size:9px;font-weight:700;padding:2px 8px;border-radius:99px;background:${bgC};color:${txC};">${r.status||'—'}</span>
                <span style="font-size:9px;color:#94a3b8;">&#9998;</span>
              </div>
            </div>
            <div style="font-size:12px;font-weight:700;color:#0f172a;">${dateStr||'—'} ${daysAgo!==null?'<span style="font-size:10px;color:#94a3b8;font-weight:500;">('+Math.abs(daysAgo)+'d '+(daysAgo>=0?'ago':'away')+')</span>':''}</div>
            ${r.description?`<div style="font-size:11px;color:#475569;margin-top:4px;">${r.description.slice(0,90)}</div>`:''}
            ${r.technician?`<div style="font-size:10px;color:#94a3b8;margin-top:3px;">&#128100; ${r.technician}</div>`:''}
          </div>`;
        };
        // Find indices in machineSvcs for last/next
        const lastIdx = lastSvc ? machineSvcs.indexOf(lastSvc) : -1;
        const nextIdx = nextSvc ? machineSvcs.indexOf(nextSvc) : -1;
        svcEl.innerHTML =
          (lastSvc ? svcCard(lastSvc, 'Last Completed Service', '#22c55e', lastIdx) : '<div style="font-size:11px;color:#94a3b8;padding:4px 0 8px;">No completed services recorded</div>') +
          (nextSvc ? svcCard(nextSvc, 'Next / Upcoming Service', '#3b82f6', nextIdx) : '<div style="font-size:11px;color:#94a3b8;padding:4px 0;">No upcoming service planned</div>');
      };

      const fspSource = window._fspRows || [];
      if (fspSource.length > 0) {
        renderServiceTracking(fspSource);
      } else {
        document.getElementById('mlookup-service-list').innerHTML = '<div style="font-size:11px;color:#94a3b8;text-align:center;padding:8px 0;">Fetching service records…</div>';
        (async () => {
          try {
            const res = await callFrappe('/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.get_ft_service_plan_list', {});
            const msg = res?.message || res || {};
            const rows = Array.isArray(msg.data)?msg.data:Array.isArray(msg)?msg:[];
            window._fspRows = rows;
            if (_mlookupMachine === name) renderServiceTracking(rows);
          } catch(e) {
            if (_mlookupMachine === name)
              document.getElementById('mlookup-service-list').innerHTML = '<div style="font-size:11px;color:#ef4444;text-align:center;padding:8px 0;">Could not load service records</div>';
          }
        })();
      }

      // ── Open Defects ──
      // Merge all available defect sources
      const _allDefectSources = [
        ...(window.FT_DEFECTS_DATA || []),
        ...(window.FT_DEFECT_ROWS  || []),
      ];
      // Deduplicate by defect name/id
      const _seenDef = new Set();
      const _mergedDefs = _allDefectSources.filter(d => {
        const k = d.name || d.id || (d.machine + '|' + d.description);
        if (_seenDef.has(k)) return false;
        _seenDef.add(k); return true;
      });

      const renderDefects = (defs) => {
        const list=document.getElementById('mlookup-defects-list'),cntEl=document.getElementById('mlookup-defect-count');
        const openDefs=defs.filter(d=>d.machine===name&&!['closed','resolved'].includes((d.status||'').toLowerCase()));
        cntEl.textContent=openDefs.length;
        const pc={critical:'#b91c1c',high:'#b91c1c',medium:'#a16207',low:'#64748b'};
        list.innerHTML=openDefs.length?openDefs.slice(0,8).map(d=>`<div onclick="openDefectModal('${(d.name||'').replace(/'/g,"\\'")}')" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:9px 12px;border-left:3px solid ${pc[(d.priority||'low').toLowerCase()]||'#64748b'};margin-bottom:6px;cursor:pointer;transition:opacity .15s;" onmouseover="this.style.opacity='.82'" onmouseout="this.style.opacity='1'">
          <div style="font-size:11px;font-weight:700;color:#0f172a;">${(d.description||'').slice(0,80)}</div>
          <div style="font-size:10px;color:#64748b;margin-top:3px;">${d.priority||'Low'} &middot; ${d.status||'Open'} &middot; ${d.start_date||''} <span style="float:right;font-size:9px;color:#94a3b8;">&#9998; Edit</span></div>
        </div>`).join(''):'<div style="color:#15803d;font-size:12px;text-align:center;padding:14px 0;font-weight:600;">✔ No open defects</div>';
      };

      if (_mergedDefs.length > 0) {
        renderDefects(_mergedDefs);
      } else {
        // Neither global has data yet — fetch live for this machine
        document.getElementById('mlookup-defects-list').innerHTML = '<div style="font-size:11px;color:#94a3b8;text-align:center;padding:10px;">Loading defects…</div>';
        (async () => {
          try {
            const GDR_URL = '/api/method/mxg_fleet_track.omnis_dashboard.ft_defects_dashboard.get_ft_defect_summary';
            const res = await callFrappe(GDR_URL, {});
            const msg = res?.message || res || {};
            const fetched = Array.isArray(msg.rows)?msg.rows:Array.isArray(msg.data)?msg.data:Array.isArray(msg)?msg:[];
            window.FT_DEFECTS_DATA = fetched;
            if (_mlookupMachine === name) renderDefects(fetched); // only update if still viewing same machine
          } catch(e) {
            if (_mlookupMachine === name)
              document.getElementById('mlookup-defects-list').innerHTML = '<div style="font-size:11px;color:#ef4444;text-align:center;padding:10px;">Could not load defects</div>';
          }
        })();
      }
    }
    function mlookupLogDefect(){
      const machineName = _mlookupMachine;
      closeMachineLookup();
      setTimeout(() => openDefectModal(null, machineName), 340);
    }
    function mlookupUpdateHmr(){
      const m = window.MACHINES_MAP?.[_mlookupMachine];
      const machineCopy = m ? Object.assign({}, m) : null;
      closeMachineLookup();
      setTimeout(() => {
        if (typeof window.openHmrLogModal === 'function' && machineCopy) {
          window.openHmrLogModal(machineCopy);
        } else {
          showToast('HMR modal not available', 'err', 2500);
        }
      }, 340);
    }
    function mlookupViewBreakdowns(){
      const machineName = _mlookupMachine;
      closeMachineLookup();
      setTimeout(() => {
        if (typeof showView === 'function') showView('view-breakdowns');
        // If there is a machine filter input in the breakdowns view, prefill it
        const filters = ['bd-machine-filter','breakdown-machine','brk-machine','bd-search'];
        for (const fid of filters) {
          const el = document.getElementById(fid);
          if (el) { el.value = machineName; el.dispatchEvent(new Event('input')); break; }
        }
      }, 340);
    }
    document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMachineLookup();});
    