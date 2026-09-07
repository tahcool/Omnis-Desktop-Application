# -*- coding: utf-8 -*-
import os
import re

file_path = r'c:\Users\Administrator\omnis\systems\medicals\index.html'

with open(file_path, 'r', encoding='utf-8') as f:
    html = f.read()

# We need to find the MEDICAL NEWS & UPDATES block and replace it.
pattern = r'<!-- MEDICAL NEWS & UPDATES -->.*?<script>.*?</script>'

replacement_html = '''<!-- APPOINTMENTS CALENDAR -->
          <div style="padding: 24px 40px 80px; width: 100%;">
            <div style="background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-radius: 24px; padding: 32px; box-shadow: 0 12px 40px -12px rgba(0,0,0,0.06), 0 0 0 1px rgba(255,255,255,0.6) inset; display: flex; flex-direction: column; gap: 20px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-shrink:0;">
                  <div style="display:flex; align-items:center; gap:8px;">
                    <span style="font-size:20px; font-weight:900; color:#0f172a; letter-spacing:-0.5px;">Appointments Timeline</span>
                    <span style="font-size:10px; background:linear-gradient(135deg, #3b82f6, #6366f1); color:#fff; padding:4px 12px; border-radius:99px; font-weight:800; box-shadow: 0 4px 12px rgba(59,130,246,0.3);">NEXT 7 DAYS</span>
                  </div>
                  <button onclick="document.querySelector('.nav-item[data-target=\\'view-appointments\\']').click()" style="background:#fff; border:1px solid #e2e8f0; border-radius:8px; padding:8px 16px; font-size:12px; font-weight:800; color:#0f172a; cursor:pointer; box-shadow:0 2px 4px rgba(0,0,0,0.02); transition:all 0.2s cubic-bezier(0.4, 0, 0.2, 1);" onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.05)'; this.style.borderColor='#cbd5e1';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(0,0,0,0.02)'; this.style.borderColor='#e2e8f0';">Open Full Planner &rarr;</button>
                </div>
                <div id="dash-appointments-grid" style="flex:1; display:grid; grid-template-columns:repeat(7, 1fr); grid-template-rows:1fr; gap:24px; padding:10px 0;">
                  <div style="grid-column:1/-1; display:flex; align-items:center; justify-content:center; color:#94a3b8; font-size:13px; font-weight:600;">Loading timeline...</div>
                </div>
            </div>
          </div>'''

new_html = re.sub(pattern, replacement_html, html, flags=re.DOTALL)
if new_html != html:
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_html)
    print("Replaced Medical News with Appointments Timeline.")
else:
    print("Could not find the MEDICAL NEWS & UPDATES block.")

