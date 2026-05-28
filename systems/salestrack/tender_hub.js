                (function(){
                  var tenders = [
                    { id:'t1', badge:'PRAZ/ZPC/HW/2026', type:'Active Tender', typeColor:'#800000', typeBg:'#fff1f2',
                      title:'Supply of Heavy Earth Moving Equipment (Hwange Expansion)',
                      entity:'ZPC Zimbabwe', sector:'Mining & Energy', region:'Matabeleland North',
                      budget:'$3.2M+', closes:'May 28, 2026', status:'CLOSING SOON', statusColor:'#ef4444',
                      desc:'Zimbabwe Power Company (ZPC) invites sealed bids for supply and delivery of heavy earth moving equipment for the Hwange Thermal Power Station expansion project. Equipment includes bulldozers, excavators, graders and compactors.',
                      suggested:['D9T Bulldozer', 'Cat 336 Excavator', '16M3 Motor Grader', 'CS74B Compactor'],
                      applyUrl:'https://www.zpc.co.zw/tenders', icon:'fa-hard-hat', iconColor:'#800000', iconBg:'#fff1f2' },
                    { id:'t2', badge:'DDF/ROAD/BUL/2026', type:'Active Tender', typeColor:'#800000', typeBg:'#fff1f2',
                      title:'Grading & Compaction Machinery for Bulawayo Arterial Roads',
                      entity:'DDF Zimbabwe', sector:'Roads & Infrastructure', region:'Bulawayo Metro',
                      budget:'$1.8M+', closes:'Jun 04, 2026', status:'OPEN', statusColor:'#10b981',
                      desc:'The District Development Fund (DDF) requires grading and compaction machinery for arterial road rehabilitation in Bulawayo. Suppliers must demonstrate prior government contract experience.',
                      suggested:['140M3 Motor Grader', 'CS533E Compactor', 'Caterpillar 12M Grader'],
                      applyUrl:'https://www.ddf.gov.zw/procurement', icon:'fa-road', iconColor:'#1e3a5f', iconBg:'#eff6ff' },
                    { id:'t3', badge:'ZINARA/INF/2026', type:'Strategic Project', typeColor:'#2563eb', typeBg:'#eff6ff',
                      title:'Harare-Chirundu Segment 4 Road Reconstruction',
                      entity:'Ministry of Transport', sector:'Infrastructure', region:'Mashonaland West',
                      budget:'$12M+', closes:'Ongoing', status:'ACTIVE', statusColor:'#10b981',
                      desc:'ZINARA has mobilised resources for full reconstruction of the Harare-Chirundu highway Segment 4. This multi-year project requires heavy machinery, graders, rollers and logistics support. Pre-qualification open.',
                      suggested:['966L Wheel Loader', '16M Motor Grader', 'CB8 Vibratory Roller', 'Water Tanker 20000L'],
                      applyUrl:'https://www.zinara.co.zw/projects', icon:'fa-road', iconColor:'#2563eb', iconBg:'#eff6ff' },
                    { id:'t4', badge:'MINING LEAD', type:'Business Lead', typeColor:'#d97706', typeBg:'#fffbeb',
                      title:'Manicaland Lithium: Phase 1 Fleet Procurement',
                      entity:'Lithium Zim Holdings', sector:'Mining', region:'Manicaland',
                      budget:'$5M+', closes:'High Priority', status:'HIGH POTENTIAL', statusColor:'#d97706',
                      desc:'Lithium Zim Holdings is procuring a full mining fleet for their Phase 1 lithium extraction operations in Manicaland. Fleet includes excavators, haul trucks, service vehicles and support equipment. Direct supplier engagement preferred.',
                      suggested:['390F Excavator', '777G Haul Truck x4', 'D8T Dozer', '988K Wheel Loader'],
                      applyUrl:'mailto:procurement@lithiumzim.co.zw', icon:'fa-gem', iconColor:'#d97706', iconBg:'#fffbeb' },
                    { id:'t5', badge:'AGRI LEAD', type:'Business Lead', typeColor:'#d97706', typeBg:'#fffbeb',
                      title:'Middle Sabi Estate: Irrigation & Land Clearing Fleet',
                      entity:'ARDA Zimbabwe', sector:'Agriculture', region:'Manicaland',
                      budget:'$900K+', closes:'Open Lead', status:'OPEN LEAD', statusColor:'#64748b',
                      desc:'ARDA Middle Sabi Estate requires land clearing, irrigation installation and general agriculture machinery for a 4,000-hectare expansion. Equipment on short-term hire or sale basis considered.',
                      suggested:['D6T Dozer', 'Backhoe Loader 430F', 'Water Pump Sets', 'Tractor & Implement Package'],
                      applyUrl:'mailto:estates@arda.co.zw', icon:'fa-tractor', iconColor:'#10b981', iconBg:'#f0fdf4' }
                  ];

                  window._tenderData = tenders;

                  window.openTenderModal = function(id) {
                    var t = tenders.find(function(x){return x.id===id;});
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
                          <div style="font-size:10px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">Budget</div>
                          <div style="font-size:12px;font-weight:800;color:#0f172a;margin-top:3px;">${t.budget}</div>
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
                        <a href="${t.applyUrl}" target="_blank" style="flex:1;padding:12px;background:linear-gradient(135deg,#800000,#b22d22);border:none;border-radius:12px;color:#fff;font-size:13px;font-weight:800;cursor:pointer;text-align:center;text-decoration:none;display:flex;align-items:center;justify-content:center;gap:8px;"><i class="fas fa-external-link-alt"></i> Apply / Register Interest</a>
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
                })();