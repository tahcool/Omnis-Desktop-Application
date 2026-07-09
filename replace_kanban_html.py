import re

with open(r'c:\Users\Administrator\omnis\systems\salestrack\index.html', 'r', encoding='utf-8') as f:
    content = f.read()

start_marker = "<!-- UNIFIED CALENDAR WIDGET (Replaces Orders/Delivery/Tenders) -->"
end_marker = "<!-- SETTINGS VIEW (Optimized Grid Layout) -->"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print("Could not find markers")
    exit(1)

new_html = """<!-- LOGISTICS & PIPELINE KANBAN WIDGET -->
              <div style="background:#fff;border:1px solid #e2e8f0;border-radius:18px;box-shadow:0 2px 12px rgba(0,0,0,0.05);display:flex;flex-direction:column;overflow:hidden;margin-bottom:22px;height:600px;">
                <!-- Header -->
                <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px 14px;border-bottom:1px solid #f1f5f9;">
                  <div style="display:flex;align-items:center;gap:10px;">
                    <div style="width:32px;height:32px;border-radius:9px;background:linear-gradient(135deg,#6366f1,#4338ca);display:flex;align-items:center;justify-content:center;"><i class="fas fa-stream" style="color:#fff;font-size:13px;"></i></div>
                    <div>
                      <div style="font-size:13px;font-weight:900;color:#0f172a;letter-spacing:-0.01em;">Logistics & Pipeline Timeline</div>
                      <div style="font-size:10px;color:#94a3b8;font-weight:500;">Orders, Quotes, Trainings & Stock organized by ETA</div>
                    </div>
                  </div>
                  <div style="display:flex;gap:16px;align-items:center;">
                    <div style="display:flex;gap:4px;align-items:center;"><div style="width:8px;height:8px;border-radius:50%;background:#0284c7;"></div><span style="font-size:10px;font-weight:700;color:#64748b;">Orders</span></div>
                    <div style="display:flex;gap:4px;align-items:center;"><div style="width:8px;height:8px;border-radius:50%;background:#d97706;"></div><span style="font-size:10px;font-weight:700;color:#64748b;">Quotes</span></div>
                    <div style="display:flex;gap:4px;align-items:center;"><div style="width:8px;height:8px;border-radius:50%;background:#16a34a;"></div><span style="font-size:10px;font-weight:700;color:#64748b;">Trainings</span></div>
                    <div style="display:flex;gap:4px;align-items:center;"><div style="width:8px;height:8px;border-radius:50%;background:#9333ea;"></div><span style="font-size:10px;font-weight:700;color:#64748b;">Stock</span></div>
                  </div>
                </div>

                <!-- Kanban Board Area -->
                <div style="display:grid;grid-template-columns:repeat(4, 1fr);flex:1;min-height:0;background:#fafbfc;">
                  
                  <!-- Column 1: Overdue -->
                  <div style="border-right:1px solid #f1f5f9;display:flex;flex-direction:column;min-height:0;">
                    <div style="padding:14px 16px;border-bottom:1px solid #e2e8f0;background:#fff;display:flex;align-items:center;justify-content:space-between;">
                      <div style="display:flex;align-items:center;gap:8px;">
                        <i class="fas fa-exclamation-triangle" style="color:#ef4444;font-size:12px;"></i>
                        <span style="font-size:11px;font-weight:900;color:#0f172a;text-transform:uppercase;">Urgent / Overdue</span>
                      </div>
                      <span id="dash-kb-overdue-count" style="font-size:10px;font-weight:800;color:#ef4444;background:#fef2f2;padding:2px 8px;border-radius:10px;">0</span>
                    </div>
                    <div id="dash-kb-overdue" style="padding:16px;overflow-y:auto;flex:1;">
                        <!-- JS injected -->
                    </div>
                  </div>

                  <!-- Column 2: This Week -->
                  <div style="border-right:1px solid #f1f5f9;display:flex;flex-direction:column;min-height:0;">
                    <div style="padding:14px 16px;border-bottom:1px solid #e2e8f0;background:#fff;display:flex;align-items:center;justify-content:space-between;">
                      <div style="display:flex;align-items:center;gap:8px;">
                        <i class="fas fa-calendar-day" style="color:#3b82f6;font-size:12px;"></i>
                        <span style="font-size:11px;font-weight:900;color:#0f172a;text-transform:uppercase;">This Week</span>
                      </div>
                      <span id="dash-kb-this-week-count" style="font-size:10px;font-weight:800;color:#3b82f6;background:#eff6ff;padding:2px 8px;border-radius:10px;">0</span>
                    </div>
                    <div id="dash-kb-this-week" style="padding:16px;overflow-y:auto;flex:1;">
                        <!-- JS injected -->
                    </div>
                  </div>

                  <!-- Column 3: Next Week -->
                  <div style="border-right:1px solid #f1f5f9;display:flex;flex-direction:column;min-height:0;">
                    <div style="padding:14px 16px;border-bottom:1px solid #e2e8f0;background:#fff;display:flex;align-items:center;justify-content:space-between;">
                      <div style="display:flex;align-items:center;gap:8px;">
                        <i class="fas fa-calendar-week" style="color:#8b5cf6;font-size:12px;"></i>
                        <span style="font-size:11px;font-weight:900;color:#0f172a;text-transform:uppercase;">Next Week</span>
                      </div>
                      <span id="dash-kb-next-week-count" style="font-size:10px;font-weight:800;color:#8b5cf6;background:#f5f3ff;padding:2px 8px;border-radius:10px;">0</span>
                    </div>
                    <div id="dash-kb-next-week" style="padding:16px;overflow-y:auto;flex:1;">
                        <!-- JS injected -->
                    </div>
                  </div>

                  <!-- Column 4: Later -->
                  <div style="display:flex;flex-direction:column;min-height:0;">
                    <div style="padding:14px 16px;border-bottom:1px solid #e2e8f0;background:#fff;display:flex;align-items:center;justify-content:space-between;">
                      <div style="display:flex;align-items:center;gap:8px;">
                        <i class="fas fa-calendar-alt" style="color:#64748b;font-size:12px;"></i>
                        <span style="font-size:11px;font-weight:900;color:#0f172a;text-transform:uppercase;">Later Pipeline</span>
                      </div>
                      <span id="dash-kb-later-count" style="font-size:10px;font-weight:800;color:#64748b;background:#f1f5f9;padding:2px 8px;border-radius:10px;">0</span>
                    </div>
                    <div id="dash-kb-later" style="padding:16px;overflow-y:auto;flex:1;">
                        <!-- JS injected -->
                    </div>
                  </div>
                  
                </div>
              </div>
              
              <!-- Tenders are now accessed via the top Quick Access Bar -->
              
              """

# Swap out script source
content = content.replace('<script src="calendar_logic.js"></script>', '<script src="timeline_logic.js"></script>')

content = content[:start_idx] + new_html + content[end_idx:]

with open(r'c:\Users\Administrator\omnis\systems\salestrack\index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Kanban replaced successfully")
