import re

with open(r'c:\Users\Administrator\omnis\systems\salestrack\index.html', 'r', encoding='utf-8') as f:
    content = f.read()

start_marker = "<!-- SINOPOWER MTD -->"
end_marker = "<!-- /top header -->"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print("Could not find markers")
    exit(1)

new_html = """<!-- SINOPOWER COMBINED -->
            <div style="background:#fff;border:1px solid #e2e8f0;border-top:3px solid #8b2219;border-radius:14px;padding:16px 20px;box-shadow:0 1px 4px rgba(0,0,0,0.05);flex:1;min-width:0;">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
                <div>
                  <div style="font-size:11px;font-weight:900;letter-spacing:0.1em;text-transform:uppercase;color:#8b2219;">Sinopower</div>
                  <div style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;">MTD & YTD Performance</div>
                </div>
                <span style="width:28px;height:28px;background:rgba(139,34,25,0.08);border-radius:8px;display:inline-flex;align-items:center;justify-content:center;"><i class="fas fa-chart-line" style="color:#8b2219;font-size:11px;"></i></span>
              </div>
              
              <div style="display:flex;gap:16px;">
                <!-- MTD Block -->
                <div style="flex:1;">
                  <div style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:4px;">Month to Date</div>
                  <div style="display:flex;align-items:baseline;gap:4px;margin-bottom:4px;">
                    <div id="dash-sino-mtd" style="font-size:26px;font-weight:900;color:#0f172a;line-height:1;">&#8212;</div>
                    <div id="dash-sino-mtd-tgt" style="font-size:11px;color:#94a3b8;font-weight:600;">/ &#8212;</div>
                  </div>
                  <div style="width:100%;height:5px;background:#f1f5f9;border-radius:99px;overflow:hidden;margin-bottom:4px;">
                    <div id="dash-sino-mtd-bar" style="height:100%;width:0%;background:linear-gradient(90deg,#c0392b,#8b2219);border-radius:99px;transition:width 0.7s ease;"></div>
                  </div>
                  <div style="display:flex;justify-content:space-between;align-items:center;">
                    <span id="dash-sino-mtd-pct" style="font-size:11px;font-weight:900;color:#8b2219;">&#8212;%</span>
                    <span id="dash-sino-mtd-note" style="font-size:9px;color:#94a3b8;font-weight:600;display:none;">units</span>
                  </div>
                </div>
                
                <div style="width:1px;background:#e2e8f0;margin:0 4px;"></div>
                
                <!-- YTD Block -->
                <div style="flex:1;">
                  <div style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:4px;">Year to Date</div>
                  <div style="display:flex;align-items:baseline;gap:4px;margin-bottom:4px;">
                    <div id="dash-sino-ytd" style="font-size:26px;font-weight:900;color:#0f172a;line-height:1;">&#8212;</div>
                    <div id="dash-sino-ytd-tgt" style="font-size:11px;color:#94a3b8;font-weight:600;">/ &#8212;</div>
                  </div>
                  <div style="width:100%;height:5px;background:#f1f5f9;border-radius:99px;overflow:hidden;margin-bottom:4px;">
                    <div id="dash-sino-ytd-bar" style="height:100%;width:0%;background:linear-gradient(90deg,#c0392b,#8b2219);border-radius:99px;transition:width 0.7s ease;"></div>
                  </div>
                  <div style="display:flex;justify-content:space-between;align-items:center;">
                    <span id="dash-sino-ytd-pct" style="font-size:11px;font-weight:900;color:#8b2219;">&#8212;%</span>
                    <span id="dash-sino-ytd-note" style="font-size:9px;color:#94a3b8;font-weight:600;display:none;">units</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- MACHINERY EXCHANGE COMBINED -->
            <div style="background:#fff;border:1px solid #e2e8f0;border-top:3px solid #1e3a5f;border-radius:14px;padding:16px 20px;box-shadow:0 1px 4px rgba(0,0,0,0.05);flex:1;min-width:0;">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
                <div>
                  <div style="font-size:11px;font-weight:900;letter-spacing:0.1em;text-transform:uppercase;color:#1e3a5f;">Machinery Exchange</div>
                  <div style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;">MTD & YTD Performance</div>
                </div>
                <span style="width:28px;height:28px;background:rgba(30,58,95,0.08);border-radius:8px;display:inline-flex;align-items:center;justify-content:center;"><i class="fas fa-chart-line" style="color:#1e3a5f;font-size:11px;"></i></span>
              </div>
              
              <div style="display:flex;gap:16px;">
                <!-- MTD Block -->
                <div style="flex:1;">
                  <div style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:4px;">Month to Date</div>
                  <div style="display:flex;align-items:baseline;gap:4px;margin-bottom:4px;">
                    <div id="dash-mxg-mtd" style="font-size:26px;font-weight:900;color:#0f172a;line-height:1;">&#8212;</div>
                    <div id="dash-mxg-mtd-tgt" style="font-size:11px;color:#94a3b8;font-weight:600;">/ &#8212;</div>
                  </div>
                  <div style="width:100%;height:5px;background:#f1f5f9;border-radius:99px;overflow:hidden;margin-bottom:4px;">
                    <div id="dash-mxg-mtd-bar" style="height:100%;width:0%;background:linear-gradient(90deg,#3b82f6,#1e3a5f);border-radius:99px;transition:width 0.7s ease;"></div>
                  </div>
                  <div style="display:flex;justify-content:space-between;align-items:center;">
                    <span id="dash-mxg-mtd-pct" style="font-size:11px;font-weight:900;color:#1e3a5f;">&#8212;%</span>
                    <span id="dash-mxg-mtd-note" style="font-size:9px;color:#94a3b8;font-weight:600;display:none;">units</span>
                  </div>
                </div>
                
                <div style="width:1px;background:#e2e8f0;margin:0 4px;"></div>
                
                <!-- YTD Block -->
                <div style="flex:1;">
                  <div style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:4px;">Year to Date</div>
                  <div style="display:flex;align-items:baseline;gap:4px;margin-bottom:4px;">
                    <div id="dash-mxg-ytd" style="font-size:26px;font-weight:900;color:#0f172a;line-height:1;">&#8212;</div>
                    <div id="dash-mxg-ytd-tgt" style="font-size:11px;color:#94a3b8;font-weight:600;">/ &#8212;</div>
                  </div>
                  <div style="width:100%;height:5px;background:#f1f5f9;border-radius:99px;overflow:hidden;margin-bottom:4px;">
                    <div id="dash-mxg-ytd-bar" style="height:100%;width:0%;background:linear-gradient(90deg,#3b82f6,#1e3a5f);border-radius:99px;transition:width 0.7s ease;"></div>
                  </div>
                  <div style="display:flex;justify-content:space-between;align-items:center;">
                    <span id="dash-mxg-ytd-pct" style="font-size:11px;font-weight:900;color:#1e3a5f;">&#8212;%</span>
                    <span id="dash-mxg-ytd-note" style="font-size:9px;color:#94a3b8;font-weight:600;display:none;">units</span>
                  </div>
                </div>
              </div>
            </div>

          """

content = content[:start_idx] + new_html + content[end_idx:]

with open(r'c:\Users\Administrator\omnis\systems\salestrack\index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Cards combined successfully")
