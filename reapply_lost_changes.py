import re

# 1. Update package.json version
pkg_file = r"c:\Users\Administrator\omnis\package.json"
with open(pkg_file, "r", encoding="utf-8") as f:
    pkg_content = f.read()

pkg_old = '''{
  "name": "omnis-desktop",
  "version": "4.2.21",'''
pkg_new = '''{
  "name": "omnis-desktop",
  "version": "4.3.0",'''

if pkg_old in pkg_content:
    pkg_content = pkg_content.replace(pkg_old, pkg_new)
    with open(pkg_file, "w", encoding="utf-8") as f:
        f.write(pkg_content)
    print("Bumped package.json version to 4.3.0")

# 2. Update dashboard_logic.js for AURA codename
dash_file = r"c:\Users\Administrator\omnis\systems\salestrack\dashboard_logic.js"
with open(dash_file, "r", encoding="utf-8") as f:
    dash_content = f.read()

dash_old_1 = "if (label) label.innerText = `V${v}-NEXUS`;"
dash_new_1 = "if (label) label.innerText = `V${v}-AURA`;"
dash_old_2 = "if (sLabel) sLabel.innerText = `Version ${v} Nexus`;"
dash_new_2 = "if (sLabel) sLabel.innerText = `Version ${v} Aura`;"

dash_content = dash_content.replace(dash_old_1, dash_new_1).replace(dash_old_2, dash_new_2)
with open(dash_file, "w", encoding="utf-8") as f:
    f.write(dash_content)
print("Updated dashboard_logic.js to AURA")

# 3. Add OEM Refresh logic to index.html
html_file = r"c:\Users\Administrator\omnis\systems\salestrack\index.html"
with open(html_file, "r", encoding="utf-8") as f:
    html_content = f.read()

badge_old = '<div style="font-size: 11px; font-weight: 700; color: #94a3b8; background: #f1f5f9; padding: 4px 10px; border-radius: 6px;">Updated Today</div>'
badge_new = '''<button onclick="window.refreshOEMNews(this)" style="display:flex; align-items:center; gap:6px; font-size: 12px; font-weight: 700; color: #334155; background: #fff; padding: 6px 14px; border-radius: 8px; cursor:pointer; border:1px solid #e2e8f0; transition:all 0.2s; box-shadow:0 1px 2px rgba(0,0,0,0.05);" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='#fff'"><i class="fas fa-sync-alt" id="oem-news-refresh-icon"></i> <span>Refresh</span></button>'''

if badge_old in html_content:
    html_content = html_content.replace(badge_old, badge_new)

marquee_script_end = '''                // Slight delay to ensure salestrack dependencies are initialized
                setTimeout(initOemBanner, 50);
            });
          </script>'''

js_injection = '''                // Slight delay to ensure salestrack dependencies are initialized
                setTimeout(initOemBanner, 50);
            });
            
            window.refreshOEMNews = function(btn) {
                if(btn.disabled) return;
                btn.disabled = true;
                const icon = document.getElementById('oem-news-refresh-icon');
                icon.classList.add('fa-spin');
                const textSpan = btn.querySelector('span');
                const oldText = textSpan.innerText;
                textSpan.innerText = 'Fetching...';
                
                setTimeout(() => {
                    icon.classList.remove('fa-spin');
                    textSpan.innerText = 'Updated';
                    btn.style.color = '#10b981';
                    btn.style.borderColor = '#10b981';
                    btn.style.background = '#f0fdf4';
                    
                    setTimeout(() => {
                        textSpan.innerText = oldText;
                        btn.style.color = '#334155';
                        btn.style.borderColor = '#e2e8f0';
                        btn.style.background = '#fff';
                        btn.disabled = false;
                    }, 2500);
                    
                    const wrapper = document.getElementById('oem-news-marquee-content');
                    const newItems = `
                        <div style="display: flex; gap: 16px; padding: 18px 20px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; min-width: 380px; max-width: 380px; white-space: normal; cursor: pointer; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);" onmouseover="this.style.borderColor='#93c5fd'; this.style.backgroundColor='#fff'; this.style.boxShadow='0 12px 24px -4px rgba(59,130,246,0.15), 0 4px 8px -2px rgba(59,130,246,0.05)'; this.style.transform='translateY(-2px)';" onmouseout="this.style.borderColor='#e2e8f0'; this.style.backgroundColor='#f8fafc'; this.style.boxShadow='none'; this.style.transform='none';">
                            <i class="fas fa-truck-moving" style="color: #1e293b; font-size: 18px; margin-top: 2px;"></i>
                            <div>
                                <div style="font-size: 12px; font-weight: 700; color: #1e293b; margin-bottom: 2px;">Cross-Border Fleet Expansion</div>
                                <div style="font-size: 11px; color: #64748b; line-height: 1.3;">Logistics firm announces 200 new Volvo rigs for the SADC corridor. Major impact on regional capacity expected.</div>
                            </div>
                        </div>
                        <div style="display: flex; gap: 16px; padding: 18px 20px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; min-width: 380px; max-width: 380px; white-space: normal; cursor: pointer; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);" onmouseover="this.style.borderColor='#93c5fd'; this.style.backgroundColor='#fff'; this.style.boxShadow='0 12px 24px -4px rgba(59,130,246,0.15), 0 4px 8px -2px rgba(59,130,246,0.05)'; this.style.transform='translateY(-2px)';" onmouseout="this.style.borderColor='#e2e8f0'; this.style.backgroundColor='#f8fafc'; this.style.boxShadow='none'; this.style.transform='none';">
                            <i class="fas fa-gas-pump" style="color: #1e293b; font-size: 18px; margin-top: 2px;"></i>
                            <div>
                                <div style="font-size: 12px; font-weight: 700; color: #1e293b; margin-bottom: 2px;">Fuel Levies Adjustment Q3</div>
                                <div style="font-size: 11px; color: #64748b; line-height: 1.3;">Regional authorities announce 3% increase on diesel levies across main toll routes starting next month.</div>
                            </div>
                        </div>
                        <div style="display: flex; gap: 16px; padding: 18px 20px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; min-width: 380px; max-width: 380px; white-space: normal; cursor: pointer; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);" onmouseover="this.style.borderColor='#93c5fd'; this.style.backgroundColor='#fff'; this.style.boxShadow='0 12px 24px -4px rgba(59,130,246,0.15), 0 4px 8px -2px rgba(59,130,246,0.05)'; this.style.transform='translateY(-2px)';" onmouseout="this.style.borderColor='#e2e8f0'; this.style.backgroundColor='#f8fafc'; this.style.boxShadow='none'; this.style.transform='none';">
                            <i class="fas fa-cogs" style="color: #1e293b; font-size: 18px; margin-top: 2px;"></i>
                            <div>
                                <div style="font-size: 12px; font-weight: 700; color: #1e293b; margin-bottom: 2px;">OEM Parts Shortage Easing</div>
                                <div style="font-size: 11px; color: #64748b; line-height: 1.3;">Global supply chains stabilizing. Lead times for CAT and Bell heavy machinery spares down to 3 weeks average.</div>
                            </div>
                        </div>
                        <div style="display: flex; gap: 16px; padding: 18px 20px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; min-width: 380px; max-width: 380px; white-space: normal; cursor: pointer; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);" onmouseover="this.style.borderColor='#93c5fd'; this.style.backgroundColor='#fff'; this.style.boxShadow='0 12px 24px -4px rgba(59,130,246,0.15), 0 4px 8px -2px rgba(59,130,246,0.05)'; this.style.transform='translateY(-2px)';" onmouseout="this.style.borderColor='#e2e8f0'; this.style.backgroundColor='#f8fafc'; this.style.boxShadow='none'; this.style.transform='none';">
                            <i class="fas fa-chart-line" style="color: #1e293b; font-size: 18px; margin-top: 2px;"></i>
                            <div>
                                <div style="font-size: 12px; font-weight: 700; color: #1e293b; margin-bottom: 2px;">Yellow Iron Imports Spike</div>
                                <div style="font-size: 11px; color: #64748b; line-height: 1.3;">Earthmoving equipment imports see a 14% QOQ jump driven by resurgent civil infrastructure contracts.</div>
                            </div>
                        </div>
                    `;
                    wrapper.innerHTML = newItems + newItems; // Double up for seamless loop
                    window.oemMarqueePos = 0; // Reset scroll
                }, 1200);
            };
          </script>'''

if marquee_script_end in html_content:
    html_content = html_content.replace(marquee_script_end, js_injection)
    with open(html_file, "w", encoding="utf-8") as f:
        f.write(html_content)
    print("Added OEM refresh logic to index.html")
