/**
 * marketing_logic.js - Omnis Salestrack Marketing Module
 * Real sending via existing electron IPC:
 *   email: window.electron.invoke('email:send', {to,subject,html})
 *   WA:    window.electron.invoke('whatsapp:send-msg', {to,body})
 */
(function () {
  'use strict';
  var mkt = { blocks:[], campaignId:null, draggedType:null, territories:[], customerGroups:[], audienceCount:0, cancelToken:false, htmlEditorMode:'canvas', customHTML:'' };
  window._mktState = mkt; // expose for Phase 2 code outside this IIFE

  function ipc(ch,pl){ if(!window.electron||!window.electron.invoke) throw new Error('Electron IPC N/A'); return window.electron.invoke(ch,pl); }
  function toast(m,t){ if(window.showToast) window.showToast(m,t||'info'); }
  function _el(id){ return document.getElementById(id); }
  function _val(id){ var e=_el(id); return e?e.value:''; }
  function _setVal(id,v){ var e=_el(id); if(e) e.value=v; }
  function _setText(id,v){ var e=_el(id); if(e) e.textContent=v; }
  function _setCheck(id,v){ var e=_el(id); if(e) e.checked=v; }
  function escH(s){ return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;'); }

  /* == HUB == */
  window.marketingLoadHub = async function () {
    var grid=_el('marketing-hub-grid'), statsEl=_el('mkt-stat-bar');
    if(!grid) return;
    grid.innerHTML='<tr><td colspan="6" style="padding:40px;text-align:center;"><i class="fas fa-spinner fa-spin" style="color:#7c3aed;font-size:24px;"></i></td></tr>';
    try {
      var res=await ipc('supabase:query',{table:'newsletters',method:'select',params:{order:{column:'created_at',options:{ascending:false}}}});
      if(!res.ok) throw new Error(res.error||'DB error');
      var cs=res.data||[];
      if(statsEl){
        var tot=cs.length, snt=cs.filter(function(c){return c.status==='Sent';}).length;
        var rch=cs.reduce(function(s,c){return s+(c.successful_sends||0);},0);
        var dft=cs.filter(function(c){return c.status==='Draft';}).length;
        statsEl.innerHTML=
          '<div class="mkt-stat-card" style="background:linear-gradient(135deg,#7c3aed,#6d28d9);"><i class="fas fa-bullhorn"></i><div><div class="mkt-stat-num">'+tot+'</div><div class="mkt-stat-lbl">Total Campaigns</div></div></div>'+
          '<div class="mkt-stat-card" style="background:linear-gradient(135deg,#059669,#047857);"><i class="fas fa-paper-plane"></i><div><div class="mkt-stat-num">'+snt+'</div><div class="mkt-stat-lbl">Sent</div></div></div>'+
          '<div class="mkt-stat-card" style="background:linear-gradient(135deg,#2563eb,#1d4ed8);"><i class="fas fa-users"></i><div><div class="mkt-stat-num">'+rch.toLocaleString()+'</div><div class="mkt-stat-lbl">Recipients Reached</div></div></div>'+
          '<div class="mkt-stat-card" style="background:linear-gradient(135deg,#dc2626,#b91c1c);"><i class="fas fa-file-alt"></i><div><div class="mkt-stat-num">'+dft+'</div><div class="mkt-stat-lbl">Drafts</div></div></div>';
      }
      if(!cs.length){grid.innerHTML='<tr><td colspan="6" style="padding:60px;text-align:center;color:#94a3b8;font-size:15px;"><i class="fas fa-inbox" style="font-size:40px;display:block;margin-bottom:12px;"></i>No campaigns yet. Click <strong>+ New Campaign</strong> to get started.</td></tr>';return;}
      grid.innerHTML='';
      cs.forEach(function(c){
        var badge=c.status==='Sent'?'<span class="mkt-badge mkt-badge-sent">Sent</span>':'<span class="mkt-badge mkt-badge-draft">Draft</span>';
        var chs=Array.isArray(c.channels)?c.channels:['email'];
        var icons=chs.map(function(ch){return ch==='whatsapp'?'<i class="fab fa-whatsapp" style="color:#25d366;"></i>':'<i class="fas fa-envelope" style="color:#3b82f6;"></i>';}).join(' ');
        var tr=document.createElement('tr'); tr.className='mkt-hub-row';
        tr.innerHTML='<td style="padding:16px 20px;font-weight:700;color:#0f172a;">'+(c.subject||'Untitled')+'</td><td style="padding:16px 20px;text-align:center;">'+badge+'</td><td style="padding:16px 20px;text-align:center;font-size:18px;">'+icons+'</td><td style="padding:16px 20px;text-align:center;color:#64748b;">'+(c.sent_at?new Date(c.sent_at).toLocaleDateString():'â€”')+'</td><td style="padding:16px 20px;text-align:center;font-weight:600;">'+((c.successful_sends||0).toLocaleString())+' / '+((c.total_audience||0).toLocaleString())+'</td><td style="padding:16px 20px;text-align:right;"><button onclick="window.marketingEditCampaign(\''+c.id+'\')" class="mkt-btn-sm mkt-btn-blue"><i class="fas fa-edit"></i> Edit</button></td>';
        grid.appendChild(tr);
      });
    } catch(e){ grid.innerHTML='<tr><td colspan="6" style="padding:40px;text-align:center;color:#ef4444;font-weight:600;"><i class="fas fa-exclamation-triangle" style="margin-right:8px;"></i>Error: '+e.message+'</td></tr>'; }
  };

  window.marketingEditCampaign=async function(id){
    try{ var r=await ipc('supabase:query',{table:'newsletters',method:'select',params:{match:{id}}}); if(r.ok&&r.data&&r.data[0]) window.marketingOpenBuilder(r.data[0]); else toast('Could not load campaign','error'); }catch(e){toast('Error: '+e.message,'error');}
  };

  /* == BUILDER OPEN/CLOSE == */
  window.marketingOpenBuilder=async function(campaign){
    _el('marketing-hub').style.display='none'; _el('marketing-builder').style.display='flex';
    if(campaign){
      mkt.campaignId=campaign.id;
      _setVal('mkt-campaign-subject',campaign.subject||''); _setText('mkt-builder-status',campaign.status||'Draft');
      _setVal('mkt-sender-name',campaign.sender_name||'IEG Marketing'); _setVal('mkt-sender-email',campaign.sender_email||'marketing@powerstar.co.zw');
      _setVal('mkt-header-bg',campaign.header_bg_color||'#1e293b'); _setVal('mkt-header-text',campaign.header_text_color||'#ffffff');
      _setVal('mkt-wa-text',campaign.whatsapp_message||'');
      _setVal('mkt-segment-type',campaign.segment_type||'all'); _setVal('mkt-segment-value',campaign.segment_value||'');
      var chs=Array.isArray(campaign.channels)?campaign.channels:['email'];
      _setCheck('mkt-ch-email',chs.includes('email')); _setCheck('mkt-ch-whatsapp',chs.includes('whatsapp'));
      mkt.blocks=typeof campaign.blocks==='string'?JSON.parse(campaign.blocks):(campaign.blocks||[]);
      mkt.htmlEditorMode=campaign.editor_mode||'canvas';
      mkt.customHTML=campaign.html_content||'';
    } else {
      mkt.campaignId=null;
      _setVal('mkt-campaign-subject',''); _setText('mkt-builder-status','New Draft');
      _setVal('mkt-sender-name','IEG Marketing'); _setVal('mkt-sender-email','marketing@powerstar.co.zw');
      _setVal('mkt-header-bg','#1e293b'); _setVal('mkt-header-text','#ffffff');
      _setVal('mkt-wa-text',''); _setVal('mkt-segment-type','all'); _setVal('mkt-segment-value','');
      _setCheck('mkt-ch-email',true); _setCheck('mkt-ch-whatsapp',false);
      mkt.blocks=[];
      mkt.htmlEditorMode='canvas';
      mkt.customHTML='';
    }
    mktUpdateChannelUI(); mktUpdateSegmentUI();
    await mktLoadSegmentOptions(); await mktUpdateAudienceCount();
    mktRenderBlocks(); mktUpdatePreview();
  };
  window.marketingCloseBuilder=function(){_el('marketing-builder').style.display='none';_el('marketing-hub').style.display='block';window.marketingLoadHub();};

  /* == CHANNELS & SEGMENTS == */
  function mktUpdateChannelUI(){ var on=_el('mkt-ch-whatsapp')&&_el('mkt-ch-whatsapp').checked; var s=_el('mkt-wa-section'); if(s) s.style.display=on?'block':'none'; }
  window.mktOnChannelChange=mktUpdateChannelUI;

  function mktUpdateSegmentUI(){
    var type=_val('mkt-segment-type')||'all';
    var vr=_el('mkt-segment-value-row'),vtr=_el('mkt-segment-value-text-row'),vsr=_el('mkt-segment-value-select-row');
    if(vr) vr.style.display=(type==='all')?'none':'block';
    if(vtr) vtr.style.display=(type==='manual')?'block':'none';
    if(vsr) vsr.style.display=(type!=='all'&&type!=='manual')?'block':'none';
    if(type!=='all') window.mktUpdateSegmentOptions();
    mktUpdateAudienceCount();
  }
  window.mktOnSegmentChange=mktUpdateSegmentUI;

  async function mktLoadSegmentOptions(){
    try{
      var tr=await ipc('supabase:query',{table:'customers',method:'select',params:{columns:'territory',range:{from:0,to:999}}});
      var gr=await ipc('supabase:query',{table:'customers',method:'select',params:{columns:'customer_group',range:{from:0,to:999}}});
      mkt.territories=tr.ok&&tr.data?[...new Set(tr.data.map(function(r){return r.territory;}).filter(Boolean))]:[];
      mkt.customerGroups=gr.ok&&gr.data?[...new Set(gr.data.map(function(r){return r.customer_group;}).filter(Boolean))]:[];
    }catch(e){}
  }

  window.mktUpdateSegmentOptions=function(){
    var type=_val('mkt-segment-type')||'all';
    var sel=_el('mkt-segment-value-select'); if(!sel) return;
    var opts=type==='territory'?mkt.territories:type==='customer_group'?mkt.customerGroups:type==='tier'?['1','2','3','4','5']:[];
    sel.innerHTML=opts.map(function(o){return '<option value="'+o+'">'+o+'</option>';}).join('');
  };

  async function mktUpdateAudienceCount(){
    var el=_el('mkt-audience-count'); if(!el) return;
    el.textContent='Calculating...';
    try{ var a=await mktFetchAudience(); mkt.audienceCount=a.length; el.textContent=a.length.toLocaleString()+' recipients'; }
    catch(e){ el.textContent='? recipients'; }
  }

  async function mktFetchAudience(){
    var type=_val('mkt-segment-type')||'all';
    if(type==='manual'){ var v=_val('mkt-segment-value')||''; return v.split(',').map(function(e){return e.trim();}).filter(function(e){return e.includes('@');}).map(function(e){return {email:e,phone:'',contact_name:e};}); }
    var res=await ipc('supabase:query',{table:'order_contacts',method:'select',params:{columns:'name,email,phone',range:{from:0,to:4999}}});
    if(!res.ok||!res.data) return [];
    var seen=new Set();
    return res.data.filter(function(r){ if(r.unsubscribed) return false; var k=r.email||r.phone; if(!k||seen.has(k)) return false; seen.add(k); return true; }).map(function(r){return{contact_name:r.name,email:r.email||'',phone:r.phone||''};});
  }

  /* == DRAG & DROP BLOCKS == */
  var DEFAULTS={
    header:{type:'header',text:'Your Campaign Headline',bg:'#1e293b',color:'#ffffff',size:'28px'},
    logo:{type:'logo',url:'',alt:'Logo',align:'center',width:'200px'},
    text:{type:'text',content:'Click here to edit this text...'},
    image:{type:'image',url:'https://placehold.co/600x300/e2e8f0/94a3b8?text=Click+to+Upload',alt:'',align:'center'},
    button:{type:'button',label:'Click Here',link:'https://powerstar.co.zw',bg:'#2563eb',color:'#ffffff',align:'center'},
    divider:{type:'divider',color:'#e2e8f0',margin:'20px'},
    pdf:{type:'pdf',label:'Download PDF',url:''}
  };

  function mktInitDrag(){
    document.querySelectorAll('.mkt-draggable-block').forEach(function(el){
      el.addEventListener('dragstart',function(e){mkt.draggedType=e.currentTarget.dataset.type;e.dataTransfer.effectAllowed='copy';});
    });
    var c=_el('mkt-canvas'); if(!c) return;
    c.addEventListener('dragover',function(e){e.preventDefault();e.dataTransfer.dropEffect='copy';c.classList.add('mkt-drag-over');});
    c.addEventListener('dragleave',function(){c.classList.remove('mkt-drag-over');});
    c.addEventListener('drop',function(e){
      e.preventDefault(); c.classList.remove('mkt-drag-over');
      if(mkt.draggedType){ mkt.blocks.push(Object.assign({},DEFAULTS[mkt.draggedType],{id:Date.now().toString()})); mkt.draggedType=null; mktRenderBlocks(); mktUpdatePreview(); window.marketingSaveDraftDebounced(); }
    });
  }

  function mktBlockHTML(b,i){
    switch(b.type){
      case 'header': return '<div style="background:'+(b.bg||'#1e293b')+';padding:32px 24px;text-align:center;"><div contenteditable="true" style="color:'+(b.color||'#fff')+';font-size:'+(b.size||'28px')+';font-weight:800;font-family:sans-serif;outline:none;" onblur="mktBlockUpdate('+i+',\'text\',this.innerText)">'+(b.text||'Headline')+'</div></div>';
      case 'logo':   return '<div style="text-align:'+(b.align||'center')+';padding:16px;cursor:pointer;" onclick="mktUploadLogo('+i+')">'+(b.url?'<img src="'+b.url+'" alt="'+(b.alt||'')+'" style="max-width:'+(b.width||'200px')+';max-height:100px;object-fit:contain;">':'<div style="display:inline-flex;align-items:center;gap:10px;padding:20px 32px;border:2px dashed #cbd5e1;border-radius:8px;color:#94a3b8;font-weight:700;"><i class="fas fa-image" style="font-size:24px;"></i> Click to Upload Logo</div>')+'</div>';
      case 'text':   return '<div style="padding:16px 24px; position:relative;" onmouseover="var b=this.querySelector(\'.mkt-ai-btn\'); if(b) b.style.display=\'flex\'" onmouseout="var b=this.querySelector(\'.mkt-ai-btn\'); if(b) b.style.display=\'none\'"><div contenteditable="true" style="outline:none;font-family:sans-serif;color:#334155;line-height:1.7;font-size:15px;min-height:40px;" onblur="mktBlockUpdate('+i+',\'content\',this.innerText)">'+(b.content||'')+'</div><button class="mkt-ai-btn" onclick="window.mktShowAIToolbar('+i+', this)" style="display:none; position:absolute; right:10px; top:10px; background:linear-gradient(135deg,#7c3aed,#6d28d9); color:white; border:none; padding:4px 8px; border-radius:4px; font-size:10px; font-weight:700; cursor:pointer; box-shadow:0 2px 4px rgba(0,0,0,0.15); align-items:center; gap:4px; z-index:10;"><i class="fas fa-magic"></i> AI Edit</button></div>';
      case 'image':  return '<div style="text-align:'+(b.align||'center')+';padding:16px;cursor:pointer;" onclick="mktUploadImage('+i+')"><img src="'+b.url+'" alt="'+(b.alt||'')+'" style="max-width:100%;border-radius:8px;display:block;margin:auto;"></div>';
      case 'button': return '<div style="text-align:'+(b.align||'center')+';padding:24px;"><button onclick="mktOpenBlockSettings('+i+')" style="background:'+(b.bg||'#2563eb')+';color:'+(b.color||'#fff')+';border:none;padding:14px 32px;border-radius:8px;font-size:16px;font-weight:700;cursor:pointer;">'+b.label+'</button></div>';
      case 'divider':return '<div style="padding:'+(b.margin||'20px')+' 24px;"><hr style="border:none;border-top:2px solid '+(b.color||'#e2e8f0')+';"></div>';
      case 'pdf':    return '<div style="padding:20px 24px;background:#f8fafc;border:1px solid #e2e8f0;margin:8px 24px;border-radius:8px;cursor:pointer;text-align:center;" onclick="mktUploadPdf('+i+')"><i class="fas fa-file-pdf" style="font-size:36px;color:#ef4444;display:block;margin-bottom:8px;"></i><div style="font-weight:700;color:#334155;">'+(b.label||'PDF')+'</div>'+(b.url?'<a href="'+b.url+'" target="_blank" style="font-size:12px;color:#3b82f6;margin-top:4px;display:block;">View File</a>':'<div style="font-size:12px;color:#94a3b8;margin-top:4px;">Click to attach PDF</div>')+'</div>';
      default: return '';
    }
  }

  function mktRenderBlocks(){
    var c=_el('mkt-canvas'); if(!c) return;
    if(!mkt.blocks.length){ c.innerHTML='<div style="text-align:center;padding:80px 20px;color:#cbd5e1;border:2px dashed #e2e8f0;border-radius:12px;margin:20px;"><i class="fas fa-hand-pointer" style="font-size:40px;display:block;margin-bottom:16px;"></i><div style="font-weight:700;font-size:15px;">Drag blocks here to build your email</div></div>'; return; }
    c.innerHTML='';
    mkt.blocks.forEach(function(b,i){
      var w=document.createElement('div'); w.className='mkt-block-wrapper';
      w.innerHTML=mktBlockHTML(b,i)+'<div class="mkt-block-controls"><button onclick="mktMoveBlock('+i+',-1)" title="Up"><i class="fas fa-arrow-up"></i></button><button onclick="mktMoveBlock('+i+',1)" title="Down"><i class="fas fa-arrow-down"></i></button><button onclick="mktOpenBlockSettings('+i+')" title="Settings" style="color:#7c3aed;"><i class="fas fa-sliders-h"></i></button><button onclick="mktDeleteBlock('+i+')" title="Delete" style="color:#ef4444;background:#fee2e2;"><i class="fas fa-trash"></i></button></div>';
      c.appendChild(w);
    });
  }

  window.mktBlockUpdate=function(i,k,v){if(mkt.blocks[i]){mkt.blocks[i][k]=v;mktUpdatePreview();window.marketingSaveDraftDebounced();}};
  window.mktDeleteBlock=function(i){mkt.blocks.splice(i,1);mktRenderBlocks();mktUpdatePreview();window.marketingSaveDraftDebounced();};
  window.mktMoveBlock=function(i,d){if(i+d<0||i+d>=mkt.blocks.length) return; var t=mkt.blocks[i];mkt.blocks[i]=mkt.blocks[i+d];mkt.blocks[i+d]=t;mktRenderBlocks();mktUpdatePreview();window.marketingSaveDraftDebounced();};

  /* == BLOCK SETTINGS MODAL == */
  window.mktOpenBlockSettings=function(i){
    var b=mkt.blocks[i]; if(!b) return;
    var modal=_el('mkt-settings-modal'),body=_el('mkt-settings-body'); if(!modal||!body) return;
    var f='';
    if(b.type==='header') f='<label class="mkt-field-label">Headline Text</label><input type="text" value="'+escH(b.text||'')+'" onchange="mkt_tmp('+i+',\'text\',this.value)" class="mkt-text-input"><label class="mkt-field-label">Background Color</label><input type="color" value="'+(b.bg||'#1e293b')+'" oninput="mkt_tmp('+i+',\'bg\',this.value)" class="mkt-color-input"><label class="mkt-field-label">Text Color</label><input type="color" value="'+(b.color||'#ffffff')+'" oninput="mkt_tmp('+i+',\'color\',this.value)" class="mkt-color-input"><label class="mkt-field-label">Font Size</label><input type="text" value="'+(b.size||'28px')+'" onchange="mkt_tmp('+i+',\'size\',this.value)" class="mkt-text-input">';
    else if(b.type==='logo') f='<label class="mkt-field-label">Max Width (e.g. 200px)</label><input type="text" value="'+(b.width||'200px')+'" onchange="mkt_tmp('+i+',\'width\',this.value)" class="mkt-text-input"><label class="mkt-field-label">Alignment</label><select onchange="mkt_tmp('+i+',\'align\',this.value)" class="mkt-select-input"><option value="left">Left</option><option value="center" selected>Center</option><option value="right">Right</option></select>';
    else if(b.type==='button') f='<label class="mkt-field-label">Button Text</label><input type="text" value="'+escH(b.label||'')+'" onchange="mkt_tmp('+i+',\'label\',this.value)" class="mkt-text-input"><label class="mkt-field-label">Link URL</label><input type="url" value="'+escH(b.link||'')+'" onchange="mkt_tmp('+i+',\'link\',this.value)" class="mkt-text-input"><label class="mkt-field-label">Button Color</label><input type="color" value="'+(b.bg||'#2563eb')+'" oninput="mkt_tmp('+i+',\'bg\',this.value)" class="mkt-color-input"><label class="mkt-field-label">Text Color</label><input type="color" value="'+(b.color||'#ffffff')+'" oninput="mkt_tmp('+i+',\'color\',this.value)" class="mkt-color-input"><label class="mkt-field-label">Alignment</label><select onchange="mkt_tmp('+i+',\'align\',this.value)" class="mkt-select-input"><option value="left">Left</option><option value="center" selected>Center</option><option value="right">Right</option></select>';
    else if(b.type==='divider') f='<label class="mkt-field-label">Line Color</label><input type="color" value="'+(b.color||'#e2e8f0')+'" oninput="mkt_tmp('+i+',\'color\',this.value)" class="mkt-color-input"><label class="mkt-field-label">Vertical Margin</label><input type="text" value="'+(b.margin||'20px')+'" onchange="mkt_tmp('+i+',\'margin\',this.value)" class="mkt-text-input">';
    else if(b.type==='image') f='<label class="mkt-field-label">Alt Text</label><input type="text" value="'+escH(b.alt||'')+'" onchange="mkt_tmp('+i+',\'alt\',this.value)" class="mkt-text-input"><label class="mkt-field-label">Alignment</label><select onchange="mkt_tmp('+i+',\'align\',this.value)" class="mkt-select-input"><option value="left">Left</option><option value="center" selected>Center</option><option value="right">Right</option></select>';
    else f='<p style="color:#64748b;text-align:center;padding:20px;">Edit this block directly on the canvas.</p>';
    body.innerHTML='<div style="display:flex;flex-direction:column;gap:14px;">'+f+'</div>';
    modal.style.display='flex';
  };
  window.mkt_tmp=function(i,k,v){if(mkt.blocks[i]){mkt.blocks[i][k]=v;}mktRenderBlocks();mktUpdatePreview();window.marketingSaveDraftDebounced();};
  window.mktCloseSettings=function(){var m=_el('mkt-settings-modal');if(m) m.style.display='none';};

  /* == UPLOADS == */
  function mktUploadFile(accept,i,field,lbl){
    var inp=document.createElement('input');inp.type='file';inp.accept=accept;
    inp.onchange=async function(e){
      var file=e.target.files[0]; if(!file) return;
      toast('Uploading...','info');
      var ab=await file.arrayBuffer();
      var b64=btoa(new Uint8Array(ab).reduce(function(d,b){return d+String.fromCharCode(b);},''));
      var path='newsletters/'+Date.now()+'_'+file.name.replace(/[^a-zA-Z0-9.]/g,'_');
      var res=await ipc('storage:upload',{bucket:'psv-attachments',path:path,base64Data:b64,contentType:file.type});
      if(res.ok){mkt.blocks[i][field]=res.url;if(field!=='url'&&file.name) mkt.blocks[i].label=file.name;mktRenderBlocks();mktUpdatePreview();window.marketingSaveDraftDebounced();toast(lbl,'success');}
      else toast('Upload failed: '+(res.error||'Unknown'),'error');
    };
    inp.click();
  }
  window.mktUploadImage=function(i){mktUploadFile('image/*',i,'url','Image uploaded!');};
  window.mktUploadLogo=function(i){mktUploadFile('image/*',i,'url','Logo uploaded!');};
  window.mktUploadPdf=function(i){mktUploadFile('application/pdf',i,'url','PDF uploaded!');};

  /* == HTML BUILDER & PREVIEW == */
  function mktBuildHTML(){
    var hBg=_val('mkt-header-bg')||'#1e293b', hTxt=_val('mkt-header-text')||'#ffffff';
    var sName=_val('mkt-sender-name')||'IEG Marketing', subj=_val('mkt-campaign-subject')||'';
    var body='';
    mkt.blocks.forEach(function(b){
      switch(b.type){
        case 'header': body+='<div style="background:'+(b.bg||'#1e293b')+';padding:32px 24px;text-align:center;"><p style="margin:0;color:'+(b.color||'#fff')+';font-size:'+(b.size||'28px')+';font-weight:800;font-family:Arial,sans-serif;">'+(b.text||'')+'</p></div>'; break;
        case 'logo':   body+='<div style="text-align:'+(b.align||'center')+';padding:16px;">'+(b.url?'<img src="'+b.url+'" style="max-width:'+(b.width||'200px')+';max-height:100px;object-fit:contain;" alt="'+(b.alt||'')+'">':'')+'</div>'; break;
        case 'text':   body+='<div style="padding:16px 24px;font-family:Arial,sans-serif;color:#334155;line-height:1.7;font-size:15px;">'+(b.content||'').replace(/\n/g,'<br>')+'</div>'; break;
        case 'image':  body+='<div style="text-align:'+(b.align||'center')+';padding:16px;"><img src="'+b.url+'" style="max-width:100%;border-radius:8px;" alt="'+(b.alt||'')+'"></div>'; break;
        case 'button': body+='<div style="text-align:'+(b.align||'center')+';padding:24px;"><a href="'+(b.link||'#')+'" style="display:inline-block;background:'+(b.bg||'#2563eb')+';color:'+(b.color||'#fff')+';padding:14px 32px;border-radius:8px;font-size:16px;font-weight:700;text-decoration:none;font-family:Arial,sans-serif;">'+b.label+'</a></div>'; break;
        case 'divider':body+='<div style="padding:'+(b.margin||'20px')+' 24px;"><hr style="border:none;border-top:2px solid '+(b.color||'#e2e8f0')+';"></div>'; break;
        case 'pdf':    body+=b.url?'<div style="padding:20px 24px;text-align:center;"><a href="'+b.url+'" style="display:inline-block;padding:14px 24px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;color:#334155;text-decoration:none;font-family:Arial,sans-serif;">&#128196; '+b.label+'</a></div>':''; break;
      }
    });
    return '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>'+subj+'</title></head><body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 0;"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:600px;"><tr><td style="background:'+hBg+';padding:20px 24px;text-align:center;"><p style="margin:0;color:'+hTxt+';font-size:22px;font-weight:800;">'+sName+'</p></td></tr><tr><td>'+body+'</td></tr><tr><td style="background:#f8fafc;padding:24px;text-align:center;border-top:1px solid #e2e8f0;"><p style="margin:0;font-size:12px;color:#94a3b8;">You received this from '+sName+'.</p><p style="margin:8px 0 0;font-size:12px;"><a href="#unsubscribe" style="color:#94a3b8;">Unsubscribe</a></p></td></tr></table></td></tr></table></body></html>';
  }
  window.mktBuildHTML=mktBuildHTML;

  function mktUpdatePreview(){ var f=_el('mkt-preview-frame'); if(f) f.srcdoc=mktBuildHTML(); }
  window.mktUpdatePreview=mktUpdatePreview;

  window.mktSwitchTab=function(tab){
    var ct=_el('mkt-canvas-tab'),pt=_el('mkt-preview-tab'),bc=_el('mkt-tab-canvas'),bp=_el('mkt-tab-preview');
    if(tab==='canvas'){
      if(ct) ct.style.display='flex'; if(pt) pt.style.display='none';
      if(bc) bc.classList.add('mkt-tab-active'); if(bp) bp.classList.remove('mkt-tab-active');
    } else {
      if(ct) ct.style.display='none'; if(pt) pt.style.display='flex';
      if(bc) bc.classList.remove('mkt-tab-active'); if(bp) bp.classList.add('mkt-tab-active');
      mktUpdatePreview();
    }
  };

  /* == SAVE DRAFT == */
  var mktTimer=null;
  window.marketingSaveDraftDebounced=function(){clearTimeout(mktTimer);mktTimer=setTimeout(function(){window.marketingSaveDraft(true);},1200);};
  window.marketingSaveDraft=async function(silent){
    var subj=_val('mkt-campaign-subject');
    if(!subj||!subj.trim()){if(!silent) toast('Please enter a campaign subject','warning');return false;}
    var chs=[];
    if((_el('mkt-ch-email')||{}).checked) chs.push('email');
    if((_el('mkt-ch-whatsapp')||{}).checked) chs.push('whatsapp');
    var payload={
      subject:subj.trim(),sender_name:_val('mkt-sender-name')||'IEG Marketing',sender_email:_val('mkt-sender-email')||'marketing@powerstar.co.zw',
      header_bg_color:_val('mkt-header-bg')||'#1e293b',header_text_color:_val('mkt-header-text')||'#ffffff',
      blocks:mkt.blocks,html_content:window.mktBuildHTML(),whatsapp_message:_val('mkt-wa-text')||'',channels:chs,
      segment_type:_val('mkt-segment-type')||'all',
      segment_value:(_el('mkt-segment-value-select')||_el('mkt-segment-value')||{}).value||'',
      created_by:window.globalSessionUser||'Unknown',status:'Draft',
      editor_mode:mkt.htmlEditorMode||'canvas'
    };
    try{
      if(mkt.campaignId){payload.id=mkt.campaignId;var r=await ipc('supabase:query',{table:'newsletters',method:'upsert',data:payload});if(!r.ok) throw new Error(r.error||'DB error');}
      else{var r2=await ipc('supabase:query',{table:'newsletters',method:'insert',data:payload});if(!r2.ok) throw new Error(r2.error||'DB error');if(r2.data&&r2.data[0]) mkt.campaignId=r2.data[0].id;}
      _setText('mkt-builder-status','Draft \u2022 Auto-saved');
      if(!silent) toast('Draft saved','success');
      return true;
    }catch(e){if(!silent) toast('Save failed: '+e.message,'error');return false;}
  };

  /* == DISPATCH == */
  window.marketingOpenDispatchModal=async function(){
    var saved=await window.marketingSaveDraft(true);
    if(!saved){toast('Please enter a campaign subject first','warning');return;}
    var chs=[];
    if((_el('mkt-ch-email')||{}).checked) chs.push('Email');
    if((_el('mkt-ch-whatsapp')||{}).checked) chs.push('WhatsApp');
    _el('mkt-dispatch-ready-text').textContent='Will be sent via: '+chs.join(' & ')+'. Estimated: '+mkt.audienceCount.toLocaleString()+' recipients.';
    _el('mkt-dispatch-modal').style.display='flex';
    _el('mkt-dispatch-progress-area').style.display='none';
    _el('mkt-dispatch-test-area').style.display='none';
    _el('mkt-btn-send').style.display='block';
    _el('mkt-btn-cancel').style.display='none';
    _el('mkt-btn-close-dispatch').style.display='block';
    _el('mkt-dispatch-bar').style.width='0%';
    _el('mkt-dispatch-count').textContent='0 / 0';
    _el('mkt-dispatch-status-text').textContent='Ready to dispatch.';
    mkt.cancelToken=false;
  };

  window.marketingCancelDispatch=function(){
    mkt.cancelToken=true;
    _el('mkt-btn-cancel').style.display='none';
    _el('mkt-btn-close-dispatch').style.display='block';
    _el('mkt-dispatch-status-text').textContent='Dispatch cancelled by user.';
  };

  window.marketingStartDispatch=async function(){
    mkt.cancelToken=false;
    _el('mkt-dispatch-progress-area').style.display='flex';
    _el('mkt-btn-send').style.display='none';
    _el('mkt-btn-close-dispatch').style.display='none';
    _el('mkt-btn-cancel').style.display='block';
    var sEl=_el('mkt-dispatch-status-text'),bEl=_el('mkt-dispatch-bar'),cEl=_el('mkt-dispatch-count');
    var doEmail=(_el('mkt-ch-email')||{}).checked, doWA=(_el('mkt-ch-whatsapp')||{}).checked;
    var waMsg=_val('mkt-wa-text')||'', subj=_val('mkt-campaign-subject')||'Marketing Broadcast';
    var html=mktBuildHTML();
    try{
      sEl.textContent='Fetching audience...';
      var aud=await mktFetchAudience();
      if(!aud.length){sEl.textContent='No eligible recipients found.';_el('mkt-btn-cancel').style.display='none';_el('mkt-btn-close-dispatch').style.display='block';return;}
      sEl.textContent='Sending to '+aud.length.toLocaleString()+' recipients...';
      cEl.textContent='0 / '+aud.length;
      var success=0,fail=0;
      for(var i=0;i<aud.length;i++){
        if(mkt.cancelToken) break;
        var r=aud[i],ok=false,errMsg='';
        try{
          if(doEmail&&r.email){var er=await ipc('email:send',{to:r.email,subject:subj,html:html,relatedDoc:mkt.campaignId,relatedType:'newsletter'});if(er&&er.ok) ok=true;else errMsg=(er&&er.error)||'Email failed';}
          if(doWA&&r.phone){var wr=await ipc('whatsapp:send-msg',{to:r.phone,body:waMsg});if(wr&&wr.ok) ok=true;else errMsg+=(errMsg?' | ':'')+((wr&&wr.error)||'WA failed');}
          if(!doEmail&&!doWA) ok=true;
        }catch(se){errMsg=se.message;}
        try{await ipc('supabase:query',{table:'campaign_recipients',method:'insert',data:{campaign_id:mkt.campaignId,contact_name:r.contact_name,email:r.email,phone:r.phone,channel:[doEmail?'email':null,doWA?'whatsapp':null].filter(Boolean).join(','),status:ok?'sent':'failed',error_msg:errMsg||null,sent_at:ok?new Date().toISOString():null}});}catch(de){}
        if(ok) success++;else fail++;
        var pct=Math.round(((i+1)/aud.length)*100);
        bEl.style.width=pct+'%'; cEl.textContent=(i+1)+' / '+aud.length;
        sEl.textContent='Sent: '+success+' \u2713  Failed: '+fail+' \u2717';
        if((i+1)%5===0) await new Promise(function(x){setTimeout(x,150);});
      }
      if(!mkt.cancelToken){
        await ipc('supabase:query',{table:'newsletters',method:'upsert',data:{id:mkt.campaignId,status:'Sent',total_audience:aud.length,successful_sends:success,sent_at:new Date().toISOString()}});
        _setText('mkt-builder-status','Sent');
        sEl.textContent='\u2705 Complete! '+success.toLocaleString()+' sent, '+fail+' failed.';
        toast('Broadcast dispatched!','success');
      }
      _el('mkt-btn-cancel').style.display='none'; _el('mkt-btn-close-dispatch').style.display='block';
    }catch(e){
      sEl.textContent='Error: '+e.message;
      _el('mkt-btn-cancel').style.display='none'; _el('mkt-btn-close-dispatch').style.display='block';
      toast('Dispatch failed: '+e.message,'error');
    }
  };

  /* == TEST SEND == */
  window.mktToggleTestArea=function(){var a=_el('mkt-dispatch-test-area');if(a) a.style.display=a.style.display==='none'?'block':'none';};
  window.mktSendTest=async function(){
    var te=(_el('mkt-test-email')||{}).value&&(_el('mkt-test-email')||{}).value.trim();
    var tp=(_el('mkt-test-phone')||{}).value&&(_el('mkt-test-phone')||{}).value.trim();
    if(!te&&!tp){toast('Enter a test email or phone number','warning');return;}
    var btn=_el('mkt-btn-test-send');
    if(btn){btn.disabled=true;btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Sending...';}
    try{
      if(te){var er=await ipc('email:send',{to:te,subject:'[TEST] '+(_val('mkt-campaign-subject')||'Campaign'),html:mktBuildHTML(),relatedDoc:mkt.campaignId,relatedType:'newsletter'});if(er&&er.ok) toast('Test email sent to '+te,'success');else toast('Test email failed: '+((er&&er.error)||'Unknown'),'error');}
      if(tp){var wr=await ipc('whatsapp:send-msg',{to:tp,body:'[TEST] '+(_val('mkt-wa-text')||'Test message')});if(wr&&wr.ok) toast('Test WA sent to '+tp,'success');else toast('Test WA failed: '+((wr&&wr.error)||'Unknown'),'error');}
    }catch(e){toast('Test send error: '+e.message,'error');}
    finally{if(btn){btn.disabled=false;btn.innerHTML='<i class="fas fa-paper-plane"></i> Send Test';}}
  };

  /* == INIT == */
  function mktInit(){
    mktInitDrag();
    var nav=document.querySelector('.top-nav-item[data-view="view-marketing"]');
    if(nav) nav.addEventListener('click',function(){window.marketingLoadHub();});
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',mktInit);
  else mktInit();

})();

/* ============================================================
   PHASE 2 â€” TEMPLATES, HTML EDITOR, AUDIENCE, ANALYTICS, SCHEDULING
   ============================================================ */

/* â”€â”€ PHASE 2 HELPER SHIMS (globals needed outside the IIFE) â”€â”€ */
function _el(id){ return document.getElementById(id); }
function _val(id){ var e=_el(id); return e?e.value:''; }
function _setVal(id,v){ var e=_el(id); if(e) e.value=v; }
function _setText(id,v){ var e=_el(id); if(e) e.textContent=v; }
function escH(s){ return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;'); }
function _p2ipc(ch,pl){ if(!window.electron||!window.electron.invoke) throw new Error('Electron IPC N/A'); return window.electron.invoke(ch,pl); }
function _p2toast(m,t){ 
  if (typeof window.showToast === 'function') window.showToast(m,t||'info'); 
  else if (typeof showToast === 'function') showToast(m,t||'info');
  else alert(m); 
}
/* Access the mkt state object via the exposed global (set below) */
function _mkt(){ return window._mktState || {}; }

window.mktDraftEmailUI = async function(btn) {
  var ex = _el('mkt-ai-draft-drop');
  if (ex) { ex.remove(); return; }
  
  var drop = document.createElement('div');
  drop.id = 'mkt-ai-draft-drop';
  var rect = btn.getBoundingClientRect();
  drop.style.cssText = 'position:absolute; top:'+(rect.bottom+5)+'px; left:'+(rect.right-350)+'px; background:white; border-radius:12px; box-shadow:0 10px 25px rgba(0,0,0,0.15); width:350px; z-index:99999; border:1px solid #e2e8f0; padding:16px; display:flex; flex-direction:column; font-family:"Inter",sans-serif;';
  
  var html = '<div style="font-size:14px; font-weight:700; color:#0f172a; margin-bottom:8px;">Draft Email with AI</div>';
  html += '<div style="font-size:12px; color:#64748b; margin-bottom:12px;">What should this email be about? Provide some details or topics.</div>';
  html += '<textarea id="mkt-ai-draft-prompt" rows="4" placeholder="e.g. Announce a 20% discount on solar panels this weekend..." style="width:100%; box-sizing:border-box; border:1px solid #e2e8f0; border-radius:6px; padding:8px; font-size:13px; font-family:inherit; resize:none; outline:none; margin-bottom:12px;"></textarea>';
  html += '<div style="display:flex; justify-content:flex-end; gap:8px;">';
  html += '<button onclick="this.closest(\'#mkt-ai-draft-drop\').remove()" style="background:transparent; border:none; color:#64748b; cursor:pointer; font-size:12px; font-weight:600;">Cancel</button>';
  html += '<button id="btn-mkt-ai-draft-submit" style="background:#2563eb; border:none; color:white; padding:6px 12px; border-radius:6px; font-size:12px; font-weight:700; cursor:pointer;"><i class="fas fa-magic"></i> Generate</button>';
  html += '</div>';
  drop.innerHTML = html;
  document.body.appendChild(drop);
  
  setTimeout(function(){ var p = _el('mkt-ai-draft-prompt'); if(p) p.focus(); }, 50);

  _el('btn-mkt-ai-draft-submit').onclick = async function() {
    var promptTxt = _el('mkt-ai-draft-prompt').value.trim();
    if (!promptTxt) return;
    
    this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
    this.disabled = true;
    
    try {
      var res = await mktCallAIAssistant('draft_email', promptTxt);
      if (!res || (!res.content && !res.blocks)) throw new Error("Failed to draft email.");
      
      if (res.subject) {
        var subjEl = _el('mkt-campaign-subject');
        if (subjEl) subjEl.value = res.subject;
      }
      
      var mktState = _mkt();
      if (!mktState.blocks) mktState.blocks = [];
      
      if (res.blocks && Array.isArray(res.blocks)) {
        res.blocks.forEach(function(b) {
          b.id = Date.now().toString() + Math.random().toString(36).substring(2,6);
          if (b.type === 'text' && b.content) b.content = b.content.replace(/\n/g, '<br>');
          mktState.blocks.push(b);
        });
      } else if (res.content) {
        var formattedContent = res.content.replace(/\n/g, '<br>');
        mktState.blocks.push({ id: Date.now().toString(), type: 'text', content: formattedContent });
      }
      
      // Force UI update using the exposed window.mkt_tmp function safely
      if (window.mkt_tmp) {
        window.mkt_tmp(-1, '', null);
      }
      
      _el('mkt-ai-draft-drop').remove();
      _p2toast("AI Email drafted successfully!", "success");
      
    } catch(e) {
      this.innerHTML = '<i class="fas fa-magic"></i> Generate';
      this.disabled = false;
      // error is already toasted by mktCallAIAssistant
    }
  };
}

async function mktCallAIAssistant(task, content, tone) {
  if (!window.electron || !window.electron.invoke) throw new Error("Electron IPC unavailable");
  try {
    var res = await window.electron.invoke('supabase:edgeFunction', {
      name: 'ai-marketing-assistant',
      data: { task: task, content: content, tone: tone || '' }
    });
    if (!res || res.error) throw new Error(res?.error || "Unknown edge function error");
    return res.data;
  } catch (err) {
    _p2toast("AI Assistant failed: " + err.message, "error");
    throw err;
  }
}

window.mktGenerateSubjectsUI = async function(btn) {
  var content = '';
  _mkt().blocks.forEach(function(b){
    if (b.type==='text') content += b.content + '\n';
    else if (b.type==='header') content += b.text + '\n';
  });
  if (!content.trim()) {
    var subjEl = _el('mkt-campaign-subject');
    var subjectText = subjEl ? subjEl.value.trim() : '';
    
    if (subjectText && subjectText !== 'Campaign Subject...') {
      var origHtml = btn.innerHTML;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Drafting...';
      btn.disabled = true;
      try {
        var res = await mktCallAIAssistant('draft_email', subjectText);
        if (!res || (!res.content && !res.blocks)) throw new Error("Failed to draft email.");
        if (res.subject && subjEl) subjEl.value = res.subject;
        
        var mktState = _mkt();
        if (!mktState.blocks) mktState.blocks = [];
        
        if (res.blocks && Array.isArray(res.blocks)) {
          res.blocks.forEach(function(b) {
            b.id = Date.now().toString() + Math.random().toString(36).substring(2,6);
            if (b.type === 'text' && b.content) b.content = b.content.replace(/\n/g, '<br>');
            mktState.blocks.push(b);
          });
        } else if (res.content) {
          var formattedContent = res.content.replace(/\n/g, '<br>');
          mktState.blocks.push({ id: Date.now().toString(), type: 'text', content: formattedContent });
        }
        
        if (window.mkt_tmp) window.mkt_tmp(-1, '', null);
        _p2toast("AI Email drafted successfully!", "success");
      } catch(e) {
        // error is toasted in mktCallAIAssistant
      } finally {
        btn.innerHTML = origHtml;
        btn.disabled = false;
      }
      return;
    } else {
      if (window.mktDraftEmailUI) window.mktDraftEmailUI(btn);
      else _p2toast("Add some content to your campaign first!", "error");
      return;
    }
  }
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Thinking...';
  btn.disabled = true;
  try {
    var res = await mktCallAIAssistant('generate_subjects', content);
    if (!res || !res.subjects || !res.subjects.length) throw new Error("No subjects generated.");
    
    var ex = _el('mkt-ai-sub-drop');
    if (ex) ex.remove();
    
    var drop = document.createElement('div');
    drop.id = 'mkt-ai-sub-drop';
    var rect = btn.getBoundingClientRect();
    drop.style.cssText = 'position:absolute; top:'+(rect.bottom+5)+'px; left:'+(rect.right-350)+'px; background:white; border-radius:12px; box-shadow:0 10px 25px rgba(0,0,0,0.15); width:350px; z-index:99999; border:1px solid #e2e8f0; overflow:hidden; display:flex; flex-direction:column; font-family:"Inter",sans-serif;';
    
    var html = '<div style="background:#f8fafc; padding:10px 14px; border-bottom:1px solid #e2e8f0; font-size:12px; font-weight:700; color:#475569; display:flex; justify-content:space-between; align-items:center;"><span><i class="fas fa-magic" style="color:#7c3aed;margin-right:6px;"></i> AI Suggestions</span><button onclick="this.parentElement.parentElement.remove()" style="background:none;border:none;cursor:pointer;color:#94a3b8;"><i class="fas fa-times"></i></button></div>';
    
    res.subjects.forEach(function(s) {
      html += '<div onclick="window.mktApplyAISubject(this)" data-sub="'+escH(s.subject)+'" style="padding:14px; border-bottom:1px solid #f1f5f9; cursor:pointer; transition:background 0.15s;" onmouseover="this.style.background=\'#f8fafc\'" onmouseout="this.style.background=\'white\'">';
      html += '<div style="font-size:13px; font-weight:600; color:#0f172a; margin-bottom:6px;">'+escH(s.subject)+'</div>';
      html += '<div style="font-size:10px; font-weight:700; color:'+(s.score>=80?'#059669':(s.score>=60?'#d97706':'#dc2626'))+';"><i class="fas fa-chart-line"></i> Est. Open Rate: '+s.score+'%</div>';
      html += '</div>';
    });
    
    drop.innerHTML = html;
    document.body.appendChild(drop);
    
  } catch (e) {
    console.error(e);
  } finally {
    btn.innerHTML = '<i class="fas fa-magic"></i> AI Generate';
    btn.disabled = false;
  }
};

window.mktApplyAISubject = function(el) {
  var sub = el.getAttribute('data-sub');
  if (sub) {
    var input = _el('mkt-campaign-subject');
    if (input) { input.value = sub; window.marketingSaveDraftDebounced(); }
  }
  var drop = _el('mkt-ai-sub-drop');
  if (drop) drop.remove();
};

window.mktShowAIToolbar = function(blockIdx, btn) {
  var ex = _el('mkt-ai-rw-drop');
  if (ex) ex.remove();
  
  var drop = document.createElement('div');
  drop.id = 'mkt-ai-rw-drop';
  var rect = btn.getBoundingClientRect();
  drop.style.cssText = 'position:absolute; top:'+(rect.bottom+5)+'px; right:0; background:white; border-radius:8px; box-shadow:0 10px 25px rgba(0,0,0,0.2); width:200px; z-index:99999; border:1px solid #e2e8f0; overflow:hidden; display:flex; flex-direction:column; font-family:"Inter",sans-serif;';
  
  var html = '<div style="background:#f8fafc; padding:8px 12px; border-bottom:1px solid #e2e8f0; font-size:11px; font-weight:700; color:#475569; display:flex; justify-content:space-between; align-items:center;"><span>AI Rewrite Tone</span><button onclick="this.parentElement.parentElement.remove()" style="background:none;border:none;cursor:pointer;color:#94a3b8;"><i class="fas fa-times"></i></button></div>';
  var tones = ['Make Professional', 'Make Punchy', 'Shorten', 'Fix Grammar'];
  tones.forEach(function(t) {
    html += '<button onclick="window.mktApplyAIRewrite('+blockIdx+', \''+t+'\', this)" style="padding:10px 12px; border:none; background:white; text-align:left; font-size:12px; font-weight:600; color:#0f172a; cursor:pointer; border-bottom:1px solid #f1f5f9; transition:background 0.1s;" onmouseover="this.style.background=\'#f8fafc\'" onmouseout="this.style.background=\'white\'">'+t+'</button>';
  });
  drop.innerHTML = html;
  
  // Attach drop inside the relative wrapper of the text block so position right:0 works.
  btn.parentElement.appendChild(drop);
};

window.mktApplyAIRewrite = async function(blockIdx, tone, btnEl) {
  var b = _mkt().blocks[blockIdx];
  if (!b || !b.content) return;
  var origText = btnEl.innerText;
  btnEl.innerHTML = '<i class="fas fa-spinner fa-spin" style="margin-right:6px;"></i> Wait...';
  try {
    var res = await mktCallAIAssistant('rewrite_content', b.content, tone);
    if (!res || !res.content) throw new Error("Failed to rewrite content.");
    b.content = res.content;
    var drop = _el('mkt-ai-rw-drop');
    if (drop) drop.remove();
    // Re-render blocks to show updated content
    // Note: since the user is in canvas mode, we need to call the global renderer if we can.
    // However mktRenderBlocks is inside the IIFE. But mktBlockUpdate automatically updates _mkt and preview.
    window.mktBlockUpdate(blockIdx, 'content', res.content);
    
    // We must manually re-render the canvas because mktRenderBlocks is hidden.
    // A quick hack is to select another template or trigger a full rebuild.
    // Instead we can just re-select the tab to force render if we exposed it, or we find the element and update it.
    var wrappers = document.querySelectorAll('.mkt-block-wrapper');
    if (wrappers[blockIdx]) {
      var editable = wrappers[blockIdx].querySelector('[contenteditable="true"]');
      if (editable) editable.innerText = res.content;
    }
    _p2toast("Content rewritten!", "success");
  } catch(e) {
    console.error(e);
    btnEl.innerHTML = origText;
  }
};

window.mktRunDeliverabilityCheck = async function(btn) {
  var origText = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Scanning...';
  btn.disabled = true;
  var resultsDiv = _el('mkt-spam-results');
  if (resultsDiv) { resultsDiv.style.display = 'none'; resultsDiv.innerHTML = ''; }
  try {
    var htmlContent = window.mktBuildHTML();
    if (!htmlContent || htmlContent.length < 50) throw new Error("Not enough content to analyze.");
    
    var res = await mktCallAIAssistant('check_spam', htmlContent);
    if (!res || typeof res.score === 'undefined') throw new Error("Failed to get deliverability score.");
    
    if (resultsDiv) {
      resultsDiv.style.display = 'block';
      var scoreColor = res.score >= 90 ? '#059669' : (res.score >= 70 ? '#d97706' : '#dc2626');
      var html = '<div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">';
      html += '<div style="font-size:24px; font-weight:800; color:'+scoreColor+';">'+res.score+'/100</div>';
      html += '<div style="font-size:12px; font-weight:700; color:#334155;">Score</div>';
      html += '</div>';
      
      if (res.suggestions && res.suggestions.length) {
        html += '<ul style="margin:0; padding-left:16px; list-style-type:disc; color:#475569; font-size:11px; line-height:1.6;">';
        res.suggestions.forEach(function(s) { html += '<li>'+escH(s)+'</li>'; });
        html += '</ul>';
      } else {
        html += '<div style="color:#059669; font-weight:600; font-size:11px;"><i class="fas fa-check"></i> Looks perfect!</div>';
      }
      resultsDiv.innerHTML = html;
    }
  } catch(e) {
    console.error(e);
    if (resultsDiv) {
      resultsDiv.style.display = 'block';
      resultsDiv.innerHTML = '<div style="color:#ef4444;"><i class="fas fa-exclamation-circle"></i> '+escH(e.message)+'</div>';
    }
  } finally {
    btn.innerHTML = origText;
    btn.disabled = false;
  }
};

/* ── TEMPLATES ────────────────────────────────────── */
var MKT_TEMPLATES = {
  announcement: {
    id:'announcement', name:'Modern Announcement',
    desc:'Product launches and company news',
    icon:'fas fa-bullhorn', color:'#7c3aed',
    blocks:[
      {type:'header',text:'Big News From IEG',bg:'#1e293b',color:'#ffffff',size:'32px'},
      {type:'logo',url:'',alt:'IEG',align:'center',width:'180px'},
      {type:'divider',color:'#e2e8f0',margin:'8px'},
      {type:'text',content:'Dear Valued Customer,\n\nWe are thrilled to announce something exciting. After months of development, we are proud to introduce our latest innovation that will transform the way you work.'},
      {type:'image',url:'https://placehold.co/600x280/1e293b/ffffff?text=Announcement+Image',alt:'Announcement',align:'center'},
      {type:'text',content:'This represents a major milestone for us and we could not have achieved it without your continued support and trust in our brand.'},
      {type:'button',label:'Learn More',link:'https://powerstar.co.zw',bg:'#7c3aed',color:'#ffffff',align:'center'},
      {type:'divider',color:'#e2e8f0',margin:'16px'},
      {type:'text',content:'Warm regards,\nThe IEG Team'}
    ]
  },
  promo: {
    id:'promo', name:'Promotional Offer',
    desc:'Discounts, deals and limited-time offers',
    icon:'fas fa-tag', color:'#dc2626',
    blocks:[
      {type:'header',text:'EXCLUSIVE OFFER â€” Limited Time Only',bg:'#dc2626',color:'#ffffff',size:'26px'},
      {type:'text',content:'This weekend only, we are offering incredible savings on our most popular products. Do not miss this opportunity to upgrade your operations at an unbeatable price.'},
      {type:'image',url:'https://placehold.co/600x250/fef2f2/dc2626?text=Special+Offer',alt:'Special Offer',align:'center'},
      {type:'button',label:'Claim Your Discount',link:'https://powerstar.co.zw',bg:'#dc2626',color:'#ffffff',align:'center'},
      {type:'divider',color:'#fca5a5',margin:'12px'},
      {type:'text',content:'Terms and conditions apply. Offer valid while stocks last. Contact your sales representative for more details.'}
    ]
  },
  event: {
    id:'event', name:'Event Invitation',
    desc:'Trade shows, product demos and webinars',
    icon:'fas fa-calendar-alt', color:'#2563eb',
    blocks:[
      {type:'header',text:'You Are Invited',bg:'#1d4ed8',color:'#ffffff',size:'30px'},
      {type:'text',content:'We are hosting an exclusive event and would love to have you join us. This is a unique opportunity to see our latest products in action and meet our team.'},
      {type:'divider',color:'#bfdbfe',margin:'8px'},
      {type:'text',content:'Date: [Insert Date]\nVenue: [Insert Venue]\nTime: [Insert Time]\n\nSeating is limited — register early to secure your spot.'},
      {type:'button',label:'Register Now — Free',link:'https://powerstar.co.zw',bg:'#2563eb',color:'#ffffff',align:'center'},
      {type:'divider',color:'#e2e8f0',margin:'16px'},
      {type:'text',content:'For enquiries, contact us at sales@powerstar.co.zw or call +263 77 XXX XXXX.'}
    ]
  },
  newsletter: {
    id:'newsletter', name:'Monthly Newsletter',
    desc:'Roundup emails with multiple sections',
    icon:'fas fa-newspaper', color:'#059669',
    blocks:[
      {type:'header',text:'IEG Monthly Newsletter',bg:'#064e3b',color:'#ffffff',size:'26px'},
      {type:'text',content:'Welcome to this month\'s edition. Here\'s a roundup of what\'s been happening at IEG and what\'s coming next.'},
      {type:'divider',color:'#d1fae5',margin:'8px'},
      {type:'header',text:'Company Updates',bg:'#f0fdf4',color:'#064e3b',size:'20px'},
      {type:'text',content:'[Update 1] â€” Description of first company update or achievement this month.'},
      {type:'header',text:'New Products',bg:'#f0fdf4',color:'#064e3b',size:'20px'},
      {type:'image',url:'https://placehold.co/600x200/d1fae5/059669?text=New+Products',alt:'Products',align:'center'},
      {type:'text',content:'[Product Update] â€” Describe any new products, features or services launched this month.'},
      {type:'header',text:'Industry News',bg:'#f0fdf4',color:'#064e3b',size:'20px'},
      {type:'text',content:'[Industry Update] â€” Share relevant industry news or insights that your customers would find valuable.'},
      {type:'button',label:'Visit Our Website',link:'https://powerstar.co.zw',bg:'#059669',color:'#ffffff',align:'center'}
    ]
  },
  followup: {
    id:'followup', name:'Sales Follow-Up',
    desc:'Personal follow-up on quotes or enquiries',
    icon:'fas fa-handshake', color:'#0891b2',
    blocks:[
      {type:'header',text:'Following Up On Your Enquiry',bg:'#0c4a6e',color:'#ffffff',size:'24px'},
      {type:'text',content:'Dear [Customer Name],\n\nThank you for your interest in our products. I wanted to follow up on the quotation we sent you and see if you have any questions or require any additional information.'},
      {type:'divider',color:'#bae6fd',margin:'12px'},
      {type:'text',content:'We understand that making the right purchase decision takes time, and our team is here to assist you every step of the way. Whether you need a product demonstration, technical specifications, or a revised quote â€” we are ready to help.'},
      {type:'button',label:'Contact Your Sales Rep',link:'https://powerstar.co.zw',bg:'#0284c7',color:'#ffffff',align:'center'},
      {type:'divider',color:'#e2e8f0',margin:'12px'},
      {type:'text',content:'Best regards,\n[Sales Representative Name]\nCommercial Manager\nIEG | International Equipment Group'}
    ]
  },
  blank: {
    id:'blank', name:'Blank Canvas',
    desc:'Start from scratch',
    icon:'fas fa-file', color:'#64748b',
    blocks:[]
  }
};

window.mktShowTemplatePicker = function() {
  var modal = _el('mkt-template-picker');
  if (modal) modal.style.display = 'flex';
};

window.mktCloseTemplatePicker = function() {
  var modal = _el('mkt-template-picker');
  if (modal) modal.style.display = 'none';
};

window.mktSelectTemplate = function(tplId) {
  var tpl = MKT_TEMPLATES[tplId];
  if (!tpl) return;
  _mkt().blocks = tpl.blocks.map(function(b){ return Object.assign({},b,{id:Date.now().toString()+Math.random()}); });
  window.mktCloseTemplatePicker();
  window.marketingOpenBuilder(null);
};

/* â”€â”€ HTML EDITOR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
window.mktSwitchTab = (function(){
  var _orig = window.mktSwitchTab;
  return function(tab) {
    var ct=_el('mkt-canvas-tab'),pt=_el('mkt-preview-tab'),ht=_el('mkt-html-tab');
    var bc=_el('mkt-tab-canvas'),bp=_el('mkt-tab-preview'),bh=_el('mkt-tab-html');
    [ct,pt,ht].forEach(function(e){if(e) e.style.display='none';});
    [bc,bp,bh].forEach(function(e){if(e) e.classList.remove('mkt-tab-active');});
    if(tab==='canvas'){
      if(ct) ct.style.display='flex'; if(bc) bc.classList.add('mkt-tab-active');
    } else if(tab==='preview'){
      if(pt) pt.style.display='flex'; if(bp) bp.classList.add('mkt-tab-active');
      window.mktUpdatePreview();
    } else if(tab==='html'){
      if(ht) ht.style.display='flex'; if(bh) bh.classList.add('mkt-tab-active');
      mktSyncHTMLEditor();
    }
  };
})();

function mktSyncHTMLEditor(){
  var ta = _el('mkt-html-editor-ta');
  if (!ta) return;
  var mode = _mkt().htmlEditorMode || 'canvas';
  if (mode === 'canvas') {
    ta.value = window.mktBuildHTML();
  }
}

window.mktHTMLImportFromCanvas = function(){
  var ta = _el('mkt-html-editor-ta');
  if (!ta) return;
  ta.value = window.mktBuildHTML();
  _mkt().htmlEditorMode = 'canvas';
  _p2toast('Canvas HTML imported into editor','success');
};

window.mktHTMLUseThis = function(){
  _mkt().htmlEditorMode = 'custom';
  var ta = _el('mkt-html-editor-ta');
  if (ta) _mkt().customHTML = ta.value;
  var frame = _el('mkt-preview-frame');
  if (frame) frame.srcdoc = ta ? ta.value : '';
  window.mktSwitchTab('preview');
  _p2toast('Custom HTML saved â€” Preview updated','success');
  window.marketingSaveDraftDebounced();
};

window.mktHTMLPreview = function(){
  var ta = _el('mkt-html-editor-ta');
  var frame = _el('mkt-preview-frame');
  if (frame && ta) frame.srcdoc = ta.value;
  window.mktSwitchTab('preview');
};

// Override mktBuildHTML to respect custom HTML mode
var _origBuildHTML = window.mktBuildHTML;
window.mktBuildHTML = function(){
  if (_mkt().htmlEditorMode === 'custom' && _mkt().customHTML) return _mkt().customHTML;
  return _origBuildHTML();
};

/* â”€â”€ AUDIENCE MANAGER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
window.mktLoadAudience = async function(filter) {
  var tbody = _el('mkt-audience-tbody');
  var countEl = _el('mkt-audience-total');
  var search = _el('mkt-audience-search');
  var searchVal = filter !== undefined ? filter : (search ? search.value.toLowerCase() : '');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="6" style="padding:30px;text-align:center;"><i class="fas fa-spinner fa-spin" style="color:#7c3aed;font-size:20px;"></i></td></tr>';
  try {
    var res = await _p2ipc('supabase:query',{table:'order_contacts',method:'select',params:{columns:'id,name,email,phone,unsubscribed,tags',range:{from:0,to:999}}});
    if (!res.ok) throw new Error(res.error||'DB error');
    var contacts = res.data||[];
    if (searchVal) {
      contacts = contacts.filter(function(c){
        return (c.name||'').toLowerCase().includes(searchVal) ||
               (c.email||'').toLowerCase().includes(searchVal) ||
               (c.phone||'').toLowerCase().includes(searchVal);
      });
    }
    if (countEl) countEl.textContent = contacts.length.toLocaleString() + ' contacts';
    if (!contacts.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="padding:40px;text-align:center;color:#94a3b8;">No contacts found.</td></tr>';
      return;
    }
    tbody.innerHTML = '';
    contacts.forEach(function(c){
      var tags = Array.isArray(c.tags) ? c.tags : [];
      var tagHtml = tags.map(function(t){ return '<span style="background:#ede9fe;color:#6d28d9;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700;margin-right:4px;">'+escH(t)+'</span>'; }).join('');
      var subBtn = c.unsubscribed
        ? '<button onclick="mktToggleSubscribe(\''+c.id+'\',false)" style="background:#fef2f2;color:#dc2626;border:1px solid #fca5a5;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;">Resubscribe</button>'
        : '<button onclick="mktToggleSubscribe(\''+c.id+'\',true)" style="background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;">Subscribed</button>';
      var tr = document.createElement('tr');
      tr.style.cssText = 'border-bottom:1px solid #f1f5f9;transition:background 0.1s;';
      tr.onmouseover = function(){this.style.background='#f8fafc';};
      tr.onmouseout = function(){this.style.background='';};
      tr.innerHTML =
        '<td style="padding:12px 16px;font-weight:600;color:#0f172a;">'+escH(c.name||'â€”')+'</td>'+
        '<td style="padding:12px 16px;color:#475569;">'+escH(c.email||'â€”')+'</td>'+
        '<td style="padding:12px 16px;color:#475569;">'+escH(c.phone||'â€”')+'</td>'+
        '<td style="padding:12px 16px;">'+(tagHtml||'<span style="color:#cbd5e1;font-size:11px;">No tags</span>')+'</td>'+
        '<td style="padding:12px 16px;text-align:center;">'+subBtn+'</td>'+
        '<td style="padding:12px 16px;text-align:right;"><button onclick="mktEditContact(\''+c.id+'\',\''+escH(c.name||'')+'\',\''+escH(c.tags?c.tags.join(','):'')+'\',\''+escH(c.notes||'')+'\')" style="background:#f1f5f9;color:#475569;border:1px solid #e2e8f0;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;"><i class="fas fa-edit"></i></button></td>';
      tbody.appendChild(tr);
    });
  } catch(e) {
    tbody.innerHTML = '<tr><td colspan="6" style="padding:30px;text-align:center;color:#ef4444;">Error: '+e.message+'</td></tr>';
  }
};

window.mktToggleSubscribe = async function(id, shouldUnsub) {
  try {
    await _p2ipc('supabase:query',{table:'order_contacts',method:'upsert',data:{id:id,unsubscribed:shouldUnsub,unsubscribed_at:shouldUnsub?new Date().toISOString():null}});
    _p2toast(shouldUnsub?'Contact unsubscribed':'Contact resubscribed', shouldUnsub?'info':'success');
    window.mktLoadAudience();
  } catch(e){ _p2toast('Error: '+e.message,'error'); }
};

window.mktEditContact = function(id,name,tagsStr,notes) {
  _setVal('mkt-contact-edit-id',id);
  _setVal('mkt-contact-edit-name',name);
  _setVal('mkt-contact-edit-tags',tagsStr);
  _setVal('mkt-contact-edit-notes',notes);
  var m = _el('mkt-contact-edit-modal');
  if (m) m.style.display='flex';
};

window.mktSaveContact = async function() {
  var id = _val('mkt-contact-edit-id');
  var tags = _val('mkt-contact-edit-tags').split(',').map(function(t){return t.trim();}).filter(Boolean);
  var notes = _val('mkt-contact-edit-notes');
  try {
    await _p2ipc('supabase:query',{table:'order_contacts',method:'upsert',data:{id:id,tags:tags,notes:notes}});
    var m = _el('mkt-contact-edit-modal');
    if (m) m.style.display='none';
    _p2toast('Contact updated','success');
    window.mktLoadAudience();
  } catch(e){ _p2toast('Error: '+e.message,'error'); }
};

window.mktExportAudienceCSV = async function() {
  try {
    var res = await _p2ipc('supabase:query',{table:'order_contacts',method:'select',params:{columns:'name,email,phone,unsubscribed,tags,contact_type',range:{from:0,to:4999}}});
    if (!res.ok || !res.data) { _p2toast('No data to export','warning'); return; }
    var rows = ['Name,Email,Phone,Subscribed,Tags,Type'];
    res.data.forEach(function(c){
      rows.push([
        '"'+(c.name||'').replace(/"/g,'""')+'"',
        '"'+(c.email||'')+'"',
        '"'+(c.phone||'')+'"',
        c.unsubscribed?'No':'Yes',
        '"'+((Array.isArray(c.tags)?c.tags:[]).join(';'))+'"',
        c.contact_type||'customer'
      ].join(','));
    });
    var blob = new Blob([rows.join('\n')],{type:'text/csv'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a'); a.href=url; a.download='omnis_contacts.csv'; a.click();
    URL.revokeObjectURL(url);
    _p2toast('Audience exported as CSV','success');
  } catch(e){ _p2toast('Export failed: '+e.message,'error'); }
};

/* â”€â”€ CAMPAIGN ANALYTICS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
window.mktOpenAnalytics = async function(campaignId) {
  var modal = _el('mkt-analytics-modal');
  if (!modal) return;
  modal.style.display = 'flex';
  _el('mkt-analytics-body').innerHTML = '<div style="text-align:center;padding:60px;"><i class="fas fa-spinner fa-spin" style="color:#7c3aed;font-size:28px;"></i></div>';

  try {
    var camRes = await _p2ipc('supabase:query',{table:'newsletters',method:'select',params:{match:{id:campaignId}}});
    var recRes = await _p2ipc('supabase:query',{table:'campaign_recipients',method:'select',params:{match:{campaign_id:campaignId},range:{from:0,to:4999}}});

    var c = (camRes.ok&&camRes.data)?camRes.data[0]:{};
    var recs = (recRes.ok&&recRes.data)?recRes.data:[];

    var total = recs.length;
    var sent = recs.filter(function(r){return r.status==='sent';}).length;
    var failed = recs.filter(function(r){return r.status==='failed';}).length;
    var byEmail = recs.filter(function(r){return (r.channel||'').includes('email');}).length;
    var byWA = recs.filter(function(r){return (r.channel||'').includes('whatsapp');}).length;
    var deliveryRate = total>0?Math.round((sent/total)*100):0;

    var failRows = recs.filter(function(r){return r.status==='failed';}).map(function(r){
      return '<tr><td style="padding:8px 12px;color:#334155;font-size:13px;">'+escH(r.contact_name||'?')+'</td>'+
             '<td style="padding:8px 12px;color:#64748b;font-size:13px;">'+escH(r.email||r.phone||'â€”')+'</td>'+
             '<td style="padding:8px 12px;color:#ef4444;font-size:12px;">'+escH(r.error_msg||'Unknown error')+'</td></tr>';
    }).join('');

    _el('mkt-analytics-body').innerHTML =
      '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:24px;">'+
        mktAnalCard('Total Recipients',total,'#7c3aed','fas fa-users')+
        mktAnalCard('Delivered',sent,'#059669','fas fa-check-circle')+
        mktAnalCard('Failed',failed,'#dc2626','fas fa-times-circle')+
        mktAnalCard('Delivery Rate',deliveryRate+'%','#2563eb','fas fa-chart-line')+
      '</div>'+
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:24px;">'+
        mktAnalCard('Via Email',byEmail,'#0891b2','fas fa-envelope')+
        mktAnalCard('Via WhatsApp',byWA,'#16a34a','fab fa-whatsapp')+
      '</div>'+
      '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;margin-bottom:16px;">'+
        '<div style="padding:14px 16px;font-size:12px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;">'+
          '<span>Delivery Progress</span>'+
          '<button onclick="mktExportAnalyticsCSV(\''+campaignId+'\')" style="background:white;border:1px solid #e2e8f0;color:#475569;padding:5px 12px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;"><i class="fas fa-download" style="margin-right:4px;"></i>Export CSV</button>'+
        '</div>'+
        '<div style="padding:16px;">'+
          '<div style="width:100%;height:12px;background:#e2e8f0;border-radius:6px;overflow:hidden;"><div style="height:100%;width:'+deliveryRate+'%;background:linear-gradient(90deg,#10b981,#059669);border-radius:6px;"></div></div>'+
          '<div style="display:flex;justify-content:space-between;font-size:12px;color:#94a3b8;margin-top:6px;"><span>0</span><span>'+sent+' delivered of '+total+'</span></div>'+
        '</div>'+
      '</div>'+
      (failed>0?
        '<div style="background:white;border:1px solid #fecaca;border-radius:10px;overflow:hidden;">'+
          '<div style="padding:12px 16px;font-size:12px;font-weight:800;color:#dc2626;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #fecaca;background:#fef2f2;">Failed Deliveries</div>'+
          '<table style="width:100%;border-collapse:collapse;font-size:13px;">'+
          '<thead><tr style="background:#fff5f5;border-bottom:1px solid #fecaca;">'+
            '<th style="padding:8px 12px;text-align:left;color:#64748b;font-size:11px;font-weight:800;text-transform:uppercase;">Name</th>'+
            '<th style="padding:8px 12px;text-align:left;color:#64748b;font-size:11px;font-weight:800;text-transform:uppercase;">Contact</th>'+
            '<th style="padding:8px 12px;text-align:left;color:#64748b;font-size:11px;font-weight:800;text-transform:uppercase;">Error</th>'+
          '</tr></thead><tbody>'+failRows+'</tbody></table></div>'
      :'');

    // Save campaign ID for CSV export
    _el('mkt-analytics-modal').dataset.campaignId = campaignId;
  } catch(e) {
    _el('mkt-analytics-body').innerHTML = '<p style="color:#ef4444;text-align:center;padding:40px;">Error: '+e.message+'</p>';
  }
};

function mktAnalCard(label,value,color,icon) {
  return '<div style="background:white;border:1px solid #e2e8f0;border-radius:10px;padding:16px;display:flex;align-items:center;gap:14px;">'+
    '<div style="width:44px;height:44px;border-radius:10px;background:'+color+'1a;display:flex;align-items:center;justify-content:center;flex-shrink:0;">'+
      '<i class="'+icon+'" style="color:'+color+';font-size:18px;"></i></div>'+
    '<div><div style="font-size:22px;font-weight:800;color:#0f172a;line-height:1;">'+value+'</div>'+
    '<div style="font-size:12px;color:#64748b;margin-top:3px;font-weight:600;">'+label+'</div></div></div>';
}

window.mktExportAnalyticsCSV = async function(campaignId) {
  try {
    var res = await _p2ipc('supabase:query',{table:'campaign_recipients',method:'select',params:{match:{campaign_id:campaignId},range:{from:0,to:4999}}});
    if (!res.ok||!res.data){_p2toast('No data','warning');return;}
    var rows=['Name,Email,Phone,Channel,Status,Error,Sent At'];
    res.data.forEach(function(r){
      rows.push([
        '"'+(r.contact_name||'').replace(/"/g,'""')+'"',
        '"'+(r.email||'')+'"',
        '"'+(r.phone||'')+'"',
        r.channel||'',
        r.status||'',
        '"'+(r.error_msg||'').replace(/"/g,'""')+'"',
        r.sent_at||''
      ].join(','));
    });
    var blob=new Blob([rows.join('\n')],{type:'text/csv'});
    var url=URL.createObjectURL(blob);
    var a=document.createElement('a');a.href=url;a.download='campaign_report.csv';a.click();
    URL.revokeObjectURL(url);
    _p2toast('Report exported','success');
  } catch(e){_p2toast('Export failed: '+e.message,'error');}
};

window.mktCloseAnalytics = function(){
  var m=_el('mkt-analytics-modal');if(m) m.style.display='none';
};

/* â”€â”€ SCHEDULING â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
window.marketingSaveDraft = (function(){
  var _orig = window.marketingSaveDraft;
  return async function(silent) {
    var subj = _val('mkt-campaign-subject');
    if (!subj||!subj.trim()) { if(!silent) _p2toast('Please enter a campaign subject','warning'); return false; }
    var chs=[];
    if((_el('mkt-ch-email')||{}).checked) chs.push('email');
    if((_el('mkt-ch-whatsapp')||{}).checked) chs.push('whatsapp');
    var payload={
      subject:subj.trim(),
      sender_name:_val('mkt-sender-name')||'IEG Marketing',
      sender_email:_val('mkt-sender-email')||'marketing@powerstar.co.zw',
      header_bg_color:_val('mkt-header-bg')||'#1e293b',
      header_text_color:_val('mkt-header-text')||'#ffffff',
      blocks:_mkt().blocks, html_content:window.window.mktBuildHTML(),
      whatsapp_message:_val('mkt-wa-text')||'',channels:chs,
      segment_type:_val('mkt-segment-type')||'all',
      segment_value:(_el('mkt-segment-value-select')||_el('mkt-segment-value')||{}).value||'',
      editor_mode: _mkt().htmlEditorMode==='custom' ? 'html' : 'blocks',
      created_by:window.globalSessionUser||'Unknown', status:'Draft'
    };
    try {
      if(_mkt().campaignId){ payload.id=_mkt().campaignId; var r=await _p2ipc('supabase:query',{table:'newsletters',method:'upsert',data:payload}); if(!r.ok) throw new Error(r.error||'DB error'); }
      else { var r2=await _p2ipc('supabase:query',{table:'newsletters',method:'insert',data:payload}); if(!r2.ok) throw new Error(r2.error||'DB error'); if(r2.data&&r2.data[0]) _mkt().campaignId=r2.data[0].id; }
      _setText('mkt-builder-status','Draft \u2022 Auto-saved');
      if(!silent) _p2toast('Draft saved','success');
      return true;
    } catch(e){ if(!silent) _p2toast('Save failed: '+e.message,'error'); return false; }
  };
})();

window.mktOpenScheduleModal = async function() {
  var saved = await window.marketingSaveDraft(true);
  if (!saved) { _p2toast('Please enter a campaign subject first','warning'); return; }
  var sm = _el('mkt-schedule-modal');
  if (!sm) return;
  // Set default to tomorrow 9am
  var d = new Date(); d.setDate(d.getDate()+1); d.setHours(9,0,0,0);
  _setVal('mkt-schedule-date', d.toISOString().slice(0,10));
  _setVal('mkt-schedule-time', '09:00');
  _setText('mkt-schedule-subject-preview', _val('mkt-campaign-subject')||'Untitled');
  sm.style.display = 'flex';
};

window.mktCloseScheduleModal = function(){
  var m=_el('mkt-schedule-modal');if(m) m.style.display='none';
};

window.mktConfirmSchedule = async function() {
  var date = _val('mkt-schedule-date');
  var time = _val('mkt-schedule-time');
  if (!date||!time) { _p2toast('Please pick a date and time','warning'); return; }
  var scheduledAt = new Date(date+'T'+time).toISOString();
  try {
    await _p2ipc('supabase:query',{table:'newsletters',method:'upsert',data:{id:_mkt().campaignId,status:'Scheduled',scheduled_at:scheduledAt}});
    _setText('mkt-builder-status','Scheduled');
    window.mktCloseScheduleModal();
    _p2toast('Campaign scheduled for '+new Date(scheduledAt).toLocaleString(),'success');
  } catch(e){ _p2toast('Schedule failed: '+e.message,'error'); }
};

// Background scheduler â€” runs every 60s, fires scheduled campaigns
(function mktStartScheduler(){
  setInterval(async function(){
    try {
      var now = new Date().toISOString();
      var res = await _p2ipc('supabase:query',{table:'newsletters',method:'select',params:{columns:'id,subject,channels,whatsapp_message,html_content,blocks,segment_type,segment_value,scheduled_at',range:{from:0,to:20}}});
      if (!res.ok||!res.data) return;
      var due = res.data.filter(function(c){ return c.status==='Scheduled' && c.scheduled_at && c.scheduled_at <= now; });
      for (var i=0;i<due.length;i++){
        var campaign = due[i];
        console.log('[Marketing Scheduler] Firing scheduled campaign:', campaign.subject);
        // Set as the current campaign and dispatch
        var prev = _mkt().campaignId;
        _mkt().campaignId = campaign.id;
        _mkt().blocks = typeof campaign.blocks==='string'?JSON.parse(campaign.blocks):(campaign.blocks||[]);
        // Set channel checkboxes temporarily (won't affect UI if builder is closed)
        var chs = Array.isArray(campaign.channels)?campaign.channels:['email'];
        if (_el('mkt-ch-email')) _el('mkt-ch-email').checked = chs.includes('email');
        if (_el('mkt-ch-whatsapp')) _el('mkt-ch-whatsapp').checked = chs.includes('whatsapp');
        if (_el('mkt-wa-text')) _el('mkt-wa-text').value = campaign.whatsapp_message||'';
        if (_el('mkt-segment-type')) _el('mkt-segment-type').value = campaign.segment_type||'all';
        if (_el('mkt-campaign-subject')) _el('mkt-campaign-subject').value = campaign.subject||'';
        if (campaign.html_content) { _mkt().htmlEditorMode='custom'; _mkt().customHTML=campaign.html_content; }
        await window.marketingStartDispatch();
        _mkt().campaignId = prev;
      }
    } catch(e){ console.warn('[Marketing Scheduler]',e.message); }
  }, 60000);
})();

/* â”€â”€ HUB TABS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
window.mktHubSwitchTab = function(tab){
  var tabs=['campaigns','audience'];
  tabs.forEach(function(t){
    var panel=_el('mkt-hub-tab-'+t), btn=_el('mkt-hub-btn-'+t);
    if(panel) panel.style.display=(t===tab)?'block':'none';
    if(btn){ if(t===tab){btn.style.color='#7c3aed';btn.style.borderBottom='3px solid #7c3aed';btn.style.background='white';}
      else{btn.style.color='#94a3b8';btn.style.borderBottom='3px solid transparent';btn.style.background='transparent';}}
  });
  if(tab==='audience') window.mktLoadAudience();
};

/* â”€â”€ OVERRIDE marketingOpenBuilder to handle template blocks â”€â”€ */
var _origOpenBuilder = window.marketingOpenBuilder;
window.marketingOpenBuilder = async function(campaign) {
  _mkt().htmlEditorMode = 'canvas';
  _mkt().customHTML = '';
  if (campaign && campaign.editor_mode==='html') {
    _mkt().htmlEditorMode = 'custom';
    _mkt().customHTML = campaign.html_content||'';
  }
  await _origOpenBuilder(campaign);
  // Sync HTML editor textarea
  var ta=_el('mkt-html-editor-ta');
  if(ta) ta.value = campaign&&campaign.html_content ? campaign.html_content : window.window.mktBuildHTML();
  // Reinit drag (new blocks toolbox)
  if(window.mktInitDragExposed) window.mktInitDragExposed();
};

/* â”€â”€ OVERRIDE Hub to show analytics buttons â”€â”€ */
var _origLoadHub = window.marketingLoadHub;
window.marketingLoadHub = async function(){
  await _origLoadHub();
  // Patch: add Analytics button to each row
  document.querySelectorAll('#marketing-hub-grid tr').forEach(function(tr){
    var lastTd = tr.lastElementChild;
    if (!lastTd) return;
    var existingBtn = lastTd.querySelector('button');
    if (!existingBtn) return;
    var campId = existingBtn.getAttribute('onclick');
    if (!campId) return;
    var match = campId.match(/marketingEditCampaign\('([^']+)'\)/);
    if (!match) return;
    var id = match[1];
    var analyticsBtn = document.createElement('button');
    analyticsBtn.className='mkt-btn-sm';
    analyticsBtn.style.cssText='background:#f5f3ff;color:#7c3aed;border:1px solid #ddd6fe;margin-left:6px;';
    analyticsBtn.innerHTML='<i class="fas fa-chart-bar"></i>';
    analyticsBtn.title='View Analytics';
    analyticsBtn.onclick=function(){window.mktOpenAnalytics(id);};
    lastTd.appendChild(analyticsBtn);
  });
};

// Expose initDrag so it can be called after template load
window.mktInitDragExposed = function() {
  document.querySelectorAll('.mkt-draggable-block').forEach(function(el){
    el.addEventListener('dragstart',function(e){
      _mkt().draggedType=e.currentTarget.dataset.type;
      e.dataTransfer.effectAllowed='copy';
    });
  });
};

