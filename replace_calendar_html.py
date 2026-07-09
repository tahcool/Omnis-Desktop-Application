import re

with open(r'c:\Users\Administrator\omnis\systems\salestrack\index.html', 'r', encoding='utf-8') as f:
    content = f.read()

start_marker = "<!-- ORDERS ALMOST DUE + DELIVERY CALENDAR WIDGETS -->"
end_marker = "<!-- SETTINGS VIEW (Optimized Grid Layout) -->"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print("Could not find markers")
    exit(1)

new_html = """<!-- UNIFIED CALENDAR WIDGET (Replaces Orders/Delivery/Tenders) -->
              <div style="background:#fff;border:1px solid #e2e8f0;border-radius:18px;box-shadow:0 2px 12px rgba(0,0,0,0.05);display:flex;flex-direction:column;overflow:hidden;margin-bottom:22px;height:550px;">
                <!-- Header -->
                <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px 14px;border-bottom:1px solid #f1f5f9;">
                  <div style="display:flex;align-items:center;gap:10px;">
                    <div style="width:32px;height:32px;border-radius:9px;background:linear-gradient(135deg,#6366f1,#4338ca);display:flex;align-items:center;justify-content:center;"><i class="fas fa-calendar-alt" style="color:#fff;font-size:13px;"></i></div>
                    <div>
                      <div style="font-size:13px;font-weight:900;color:#0f172a;letter-spacing:-0.01em;">Global Agenda & Pipeline</div>
                      <div style="font-size:10px;color:#94a3b8;font-weight:500;">Orders, Quotes, Trainings & Stock Pipeline</div>
                    </div>
                  </div>
                  <div style="display:flex;gap:16px;align-items:center;">
                    <div style="display:flex;gap:4px;align-items:center;"><div style="width:8px;height:8px;border-radius:50%;background:#0284c7;"></div><span style="font-size:10px;font-weight:700;color:#64748b;">Orders</span></div>
                    <div style="display:flex;gap:4px;align-items:center;"><div style="width:8px;height:8px;border-radius:50%;background:#d97706;"></div><span style="font-size:10px;font-weight:700;color:#64748b;">Quotes</span></div>
                    <div style="display:flex;gap:4px;align-items:center;"><div style="width:8px;height:8px;border-radius:50%;background:#16a34a;"></div><span style="font-size:10px;font-weight:700;color:#64748b;">Trainings</span></div>
                    <div style="display:flex;gap:4px;align-items:center;"><div style="width:8px;height:8px;border-radius:50%;background:#9333ea;"></div><span style="font-size:10px;font-weight:700;color:#64748b;">Stock</span></div>
                  </div>
                </div>

                <!-- Calendar Content (Grid Layout) -->
                <div style="display:grid;grid-template-columns:320px 1fr;flex:1;min-height:0;">
                  <!-- Left: Monthly Grid -->
                  <div style="border-right:1px solid #f1f5f9;padding:20px;display:flex;flex-direction:column;background:#fafbfc;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
                        <button onclick="window.DashboardCalendar.prevMonth()" style="background:transparent;border:none;cursor:pointer;color:#64748b;"><i class="fas fa-chevron-left"></i></button>
                        <div id="dash-cal-month" style="font-size:14px;font-weight:800;color:#0f172a;">Month Year</div>
                        <button onclick="window.DashboardCalendar.nextMonth()" style="background:transparent;border:none;cursor:pointer;color:#64748b;"><i class="fas fa-chevron-right"></i></button>
                    </div>
                    <div id="dash-cal-grid" style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;flex:1;">
                        <!-- Grid injected by JS -->
                    </div>
                  </div>

                  <!-- Right: Daily Agenda -->
                  <div style="padding:20px;overflow-y:auto;background:#fff;display:flex;flex-direction:column;">
                    <div id="dash-cal-agenda-date" style="font-size:13px;font-weight:900;color:#0f172a;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid #f1f5f9;">Today's Agenda</div>
                    <div id="dash-cal-agenda" style="display:flex;flex-direction:column;gap:8px;">
                        <!-- Agenda injected by JS -->
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Tenders are now accessed via the top Quick Access Bar -->
              
              """

# Inject new script before the closing body or at the end of the file
if '<script src="calendar_logic.js"></script>' not in content:
    content = content.replace('</body>', '  <script src="calendar_logic.js"></script>\n</body>')
    # If there is no body, let's just append it
    if '<script src="calendar_logic.js"></script>' not in content:
         content += '\n<script src="calendar_logic.js"></script>'

content = content[:start_idx] + new_html + content[end_idx:]

with open(r'c:\Users\Administrator\omnis\systems\salestrack\index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Calendar replaced successfully")
