(function() {
  window._tenderData = [];

  // Function to determine category based on text
  function categorize(text) {
      let t = text.toLowerCase();
      if (t.includes('tender') || t.includes('procurement') || t.includes('praz') || t.includes('bid')) return 'Tender';
      if (t.includes('highway') || t.includes('dam') || t.includes('solar') || t.includes('plant') || t.includes('construction') || t.includes('infrastructure')) return 'Project';
      return 'Lead';
  }

  // Suggest equipment based on context
  function getSuggestions(text) {
      let t = text.toLowerCase();
      let suggestions = [];
      if (t.includes('mining') || t.includes('excavation') || t.includes('mineral') || t.includes('lithium') || t.includes('gold')) {
          suggestions.push('Excavator 336');
          suggestions.push('777G Haul Truck');
          suggestions.push('988K Wheel Loader');
      }
      if (t.includes('agriculture') || t.includes('farming') || t.includes('agro') || t.includes('tractor') || t.includes('tobacco')) {
          suggestions.push('Tractor 75HP');
          suggestions.push('Backhoe Loader');
      }
      if (t.includes('road') || t.includes('highway') || t.includes('asphalt') || t.includes('paving')) {
          suggestions.push('Motor Grader 140M');
          suggestions.push('Vibratory Roller');
      }
      if (suggestions.length === 0) {
          suggestions.push('General Equipment Packages');
          suggestions.push('Site Support Vehicles');
      }
      return suggestions.slice(0, 3);
  }

  window.fetchLiveTenders = async function() {
      console.log("Fetching live tenders...");
      
      const prazUrl = 'https://egp.praz.org.zw/egp-SW5kZXhlcy9pbmRleA==';
      const proxyUrl = 'https://api.allorigins.win/get?url=' + encodeURIComponent(prazUrl);
      
      let allItems = [];
      
      // 1. Fetch from PRAZ using allorigins proxy
      try {
          const res = await fetch(proxyUrl);
          const data = await res.json();
          const html = data.contents;
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');
          
          const rows = doc.querySelectorAll('table tbody tr');
          rows.forEach((row, index) => {
              if(index > 8) return; // limit to top results
              const cells = row.querySelectorAll('td');
              if(cells.length >= 3) {
                  // EGP tables typically have Ref, description, category, closing date
                  let ref = cells[0]?.textContent?.trim() || `PRAZ-${Math.floor(Math.random()*1000)}`;
                  let title = cells[1]?.textContent?.trim() || 'Government Tender';
                  let entity = 'Zim Government (PRAZ)';
                  
                  // if there are more columns, try to map them
                  if (cells.length >= 5) {
                      title = cells[1]?.textContent?.trim() || title;
                      entity = cells[3]?.textContent?.trim() || entity;
                  }
                  
                  // Clean up tabs and newlines
                  title = title.replace(/\s+/g, ' ');
                  entity = entity.replace(/\s+/g, ' ');
                  
                  allItems.push({
                      id: 'praz_' + index,
                      badge: ref.substring(0, 15),
                      type: 'Active Tender',
                      typeColor: '#800000',
                      typeBg: '#fff1f2',
                      title: title,
                      entity: entity,
                      sector: 'Government',
                      region: 'National',
                      budget: 'TBD',
                      closes: 'Check Portal',
                      status: 'OPEN TENDER',
                      statusColor: '#10b981',
                      desc: `Procurement requirement: ${title}. Issued by ${entity}. Visit the PRAZ e-procurement portal for full bidding documents.`,
                      suggested: getSuggestions(title + ' ' + entity),
                      applyUrl: prazUrl,
                      icon: 'fa-hard-hat',
                      iconColor: '#800000',
                      iconBg: '#fff1f2',
                      dateObj: new Date()
                  });
              }
          });
      } catch (e) {
          console.error("PRAZ fetch error", e);
      }
      
      // 2. Fetch from RSS Feeds for Projects & Leads
      const feeds = [
          { url: 'https://miningzimbabwe.com/feed/', type: 'Business Lead', color: '#d97706', bg: '#fffbeb', icon: 'fa-gem' },
          { url: 'https://newzwire.live/feed/', type: 'Strategic Project', color: '#2563eb', bg: '#eff6ff', icon: 'fa-building' },
          { url: 'https://www.chronicle.co.zw/category/business/feed/', type: 'Market Intelligence', color: '#475569', bg: '#f1f5f9', icon: 'fa-chart-line' }
      ];
      
      try {
          const fetchPromises = feeds.map(feed => 
              fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}`)
                  .then(r => r.json())
                  .then(data => ({ data, feedMeta: feed }))
          );
          
          const rssResults = await Promise.all(fetchPromises);
          
          rssResults.forEach((result, idx) => {
              if(result.data && result.data.items) {
                  result.data.items.slice(0, 10).forEach((item, itemIdx) => {
                      const textDesc = (item.description || '').replace(/<[^>]*>?/gm, '').trim();
                      
                      let cat = categorize(item.title + ' ' + textDesc);
                      let fType = result.feedMeta.type;
                      let fCol = result.feedMeta.color;
                      let fBg = result.feedMeta.bg;
                      
                      if(cat === 'Tender') { fType = 'Active Tender'; fCol = '#800000'; fBg = '#fff1f2'; }
                      else if(cat === 'Project') { fType = 'Strategic Project'; fCol = '#2563eb'; fBg = '#eff6ff'; }
                      
                      let pubDateStr = item.pubDate ? new Date(item.pubDate).toLocaleDateString() : '';
                      
                      allItems.push({
                          id: 'rss_' + idx + '_' + itemIdx,
                          badge: (result.data.feed.title || 'NEWS').substring(0, 12).toUpperCase(),
                          type: fType,
                          typeColor: fCol,
                          typeBg: fBg,
                          title: item.title,
                          entity: item.author || 'News Source',
                          sector: 'Business/Market',
                          region: 'Zimbabwe',
                          budget: 'N/A',
                          closes: pubDateStr,
                          status: 'PUBLISHED',
                          statusColor: '#64748b',
                          desc: textDesc.length > 200 ? textDesc.substring(0, 197) + '...' : textDesc,
                          suggested: getSuggestions(item.title + ' ' + textDesc),
                          applyUrl: item.link,
                          icon: result.feedMeta.icon,
                          iconColor: fCol,
                          iconBg: fBg,
                          dateObj: new Date(item.pubDate || Date.now())
                      });
                  });
              }
          });
      } catch (e) {
          console.error("RSS fetch error", e);
      }
      
      // Update global
      window._tenderData = allItems;
      renderHub(allItems);
  };
  
  function renderHub(items) {
      const colTenders = document.getElementById('col-public-tenders');
      const colProjects = document.getElementById('col-strategic-projects');
      const colLeads = document.getElementById('col-business-leads');
      const colMarket = document.getElementById('col-market-intelligence');
      
      if(!colTenders) return; // not on page
      
      colTenders.innerHTML = '';
      colProjects.innerHTML = '';
      colLeads.innerHTML = '';
      colMarket.innerHTML = '';
      
      // Sort by newest
      items.sort((a,b) => b.dateObj - a.dateObj);
      
      let counts = { tenders:0, projects:0, leads:0, market:0 };
      
      items.forEach(item => {
          // Clean up entity text (remove weird symbols)
          let cleanEntity = item.entity.replace(/[^a-zA-Z0-9\s]/g, '').trim();
          if(!cleanEntity) cleanEntity = 'News Source';

          const cardHtml = `
            <div onclick="window.openTenderModal('${item.id}')" style="background:#fff; border:1px solid #e2e8f0; border-radius:16px; padding:20px; box-shadow:0 4px 10px rgba(0,0,0,0.03); cursor:pointer; transition:all 0.2s ease;" onmouseover="this.style.transform='translateY(-3px)'; this.style.boxShadow='0 12px 30px rgba(0,0,0,0.08)';" onmouseout="this.style.transform='none'; this.style.boxShadow='0 4px 10px rgba(0,0,0,0.03)';">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
                <span style="font-size:9px; font-weight:900; color:${item.typeColor}; background:${item.typeBg}; padding:4px 10px; border-radius:8px; text-transform:uppercase; letter-spacing:0.5px;">${item.badge}</span>
                <span style="font-size:10px; color:${item.statusColor}; font-weight:800; display:flex; align-items:center; gap:4px;"><i class="fas fa-circle" style="font-size:5px;"></i> ${item.status}</span>
              </div>
              <h4 style="font-size:14px; font-weight:800; color:#0f172a; margin:0 0 12px; line-height:1.5; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden;">${item.title}</h4>
              <div style="padding-top:12px; margin-top:auto; border-top:1px solid #f1f5f9; display:grid; grid-template-columns:1fr; gap:6px;">
                <div style="font-size:10px; color:#64748b; font-weight:700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"><i class="fas fa-feather-alt" style="margin-right:4px; opacity:0.7;"></i> ${cleanEntity}</div>
                <div style="font-size:10px; color:#94a3b8; font-weight:600;">DATE: <span style="color:#334155; font-weight:700;">${item.closes || 'N/A'}</span></div>
              </div>
            </div>
          `;
          
          if(item.type === 'Active Tender' && counts.tenders < 6) {
              colTenders.innerHTML += cardHtml; counts.tenders++;
          } else if(item.type === 'Strategic Project' && counts.projects < 6) {
              colProjects.innerHTML += cardHtml; counts.projects++;
          } else if(item.type === 'Market Intelligence' && counts.market < 6) {
              colMarket.innerHTML += cardHtml; counts.market++;
          } else if(item.type === 'Business Lead' && counts.leads < 6) {
              colLeads.innerHTML += cardHtml; counts.leads++;
          }
      });
      
      const emptyState = (msg) => `
        <div style="background:#f8fafc; border:1px dashed #cbd5e1; border-radius:16px; padding:30px 20px; text-align:center; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px;">
          <i class="fas fa-inbox" style="font-size:24px; color:#cbd5e1;"></i>
          <div style="font-size:12px; color:#64748b; font-weight:600;">${msg}</div>
        </div>
      `;

      // Fallbacks
      if(counts.tenders === 0) colTenders.innerHTML = emptyState('No active tenders found.');
      if(counts.projects === 0) colProjects.innerHTML = emptyState('No active projects found.');
      if(counts.leads === 0) colLeads.innerHTML = emptyState('No active leads found.');
      if(counts.market === 0) colMarket.innerHTML = emptyState('No market news found.');
  }

  // Setup modal functions
  window.openTenderModal = function(id) {
      var t = window._tenderData.find(function(x){return x.id===id;});
      if(!t) return;
      var suggested = t.suggested.map(function(s){
        return '<span style="display:inline-flex;align-items:center;gap:5px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:4px 10px;font-size:11px;font-weight:700;color:#0f172a;cursor:pointer;" onclick="switchToView(\'view-quotations-list\')" title="Create quotation for this item"><i class=\"fas fa-plus-circle\" style=\"color:#2563eb;font-size:10px;\"></i>'+s+'</span>';
      }).join('');
      document.getElementById('tender-modal-body').innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;">
          <div style="display:flex;align-items:center;gap:14px;">
            <div style="width:48px;height:48px;border-radius:12px;background:${t.iconBg};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              <i class="fas ${t.icon}" style="color:${t.iconColor};font-size:20px;"></i>
            </div>
            <div>
              <div style="font-size:10px;font-weight:800;color:${t.typeColor};text-transform:uppercase;letter-spacing:0.06em;background:${t.typeBg};padding:2px 8px;border-radius:6px;display:inline-block;margin-bottom:6px;">${t.type} · ${t.badge}</div>
              <div style="font-size:18px;font-weight:900;color:#0f172a;line-height:1.3;">${t.title}</div>
            </div>
          </div>
          <button onclick="closeTenderModal()" style="width:32px;height:32px;border-radius:8px;border:1px solid #e2e8f0;background:#f8fafc;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;"><i class="fas fa-times" style="color:#64748b;font-size:13px;"></i></button>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:18px;">
          <div style="background:#f8fafc;border:1px solid #f1f5f9;border-radius:10px;padding:10px 12px;">
            <div style="font-size:10px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">Entity</div>
            <div style="font-size:12px;font-weight:800;color:#0f172a;margin-top:3px;">${t.entity}</div>
          </div>
          <div style="background:#f8fafc;border:1px solid #f1f5f9;border-radius:10px;padding:10px 12px;">
            <div style="font-size:10px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">Status</div>
            <div style="font-size:12px;font-weight:800;color:#0f172a;margin-top:3px;">${t.status}</div>
          </div>
          <div style="background:#f8fafc;border:1px solid #f1f5f9;border-radius:10px;padding:10px 12px;">
            <div style="font-size:10px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">Region</div>
            <div style="font-size:12px;font-weight:800;color:#0f172a;margin-top:3px;">${t.region}</div>
          </div>
        </div>
        <div style="background:#f8fafc;border:1px solid #f1f5f9;border-radius:12px;padding:14px 16px;margin-bottom:18px;">
          <div style="font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px;">Overview</div>
          <div style="font-size:13px;color:#334155;line-height:1.6;">${t.desc}</div>
        </div>
        <div style="margin-bottom:20px;">
          <div style="font-size:11px;font-weight:800;color:#2563eb;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px;display:flex;align-items:center;gap:6px;"><i class="fas fa-lightbulb"></i> Suggested Items to Quote</div>
          <div style="display:flex;flex-wrap:wrap;gap:8px;">${suggested}</div>
        </div>
        <div style="display:flex;gap:10px;padding-top:16px;border-top:1px solid #f1f5f9;">
          <a href="${t.applyUrl}" target="_blank" style="flex:1;padding:12px;background:linear-gradient(135deg,#800000,#b22d22);border:none;border-radius:12px;color:#fff;font-size:13px;font-weight:800;cursor:pointer;text-align:center;text-decoration:none;display:flex;align-items:center;justify-content:center;gap:8px;"><i class="fas fa-external-link-alt"></i> Apply / View Source</a>
          <button onclick="switchToView('view-quotations-list');closeTenderModal();" style="flex:1;padding:12px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;color:#2563eb;font-size:13px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;"><i class="fas fa-file-invoice"></i> Create Quotation</button>
        </div>`;
      var m = document.getElementById('tender-detail-modal');
      m.style.display = 'flex';
      document.body.style.overflow = 'hidden';
  };

  window.closeTenderModal = function() {
      document.getElementById('tender-detail-modal').style.display = 'none';
      document.body.style.overflow = '';
  };
  
  // Also call it when DOM is loaded
  document.addEventListener('DOMContentLoaded', function() {
      // Delay so we don't block the main rendering
      setTimeout(window.fetchLiveTenders, 1500);
  });
})();
