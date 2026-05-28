import codecs
import re

with codecs.open('index.html', 'r', 'utf-8') as f:
    content = f.read()

new_view_html = '''<div id="view-reports" class="view-page hidden">
        <div style="background:var(--bg-card);border-radius:16px;padding:24px;box-shadow:0 2px 8px rgba(0,0,0,0.08); display: flex; flex-direction: column; height: calc(100vh - 150px);">
          <!-- Header -->
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;padding-bottom:16px;border-bottom:2px solid #e5e7f0; flex-shrink: 0;">
            <div>
              <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
                <img src="../../assets/images/fleetrack-logo.png" alt="Fleetrack" style="height:32px;" onerror="this.style.display='none'">
                <h1 id="native-report-title" style="font-size:22px;font-weight:700;margin:0;">Select a Report</h1>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:12px;">
              <div id="btn-generate-report" onclick="generateNativeReport()" aria-label="Generate Report"
                style="background:var(--accent);color:#ffffff;padding:8px 16px;border-radius:var(--radius);font-size:13px;font-weight:700;cursor:pointer;transition:all 0.2s;display:flex;align-items:center;gap:6px;box-shadow:var(--shadow-sm);">
                <span>?</span>
                <span>Generate</span>
              </div>
              <div id="btn-print-report" onclick="printNativeReport()" aria-label="Print Report as PDF"
                style="background:var(--bg-main);border:1px solid var(--border-color);color:var(--text-main);padding:8px 16px;border-radius:var(--radius);font-size:13px;font-weight:600;cursor:pointer;transition:all 0.2s;display:flex;align-items:center;gap:6px; display: none;">
                <span>???</span>
                <span>Print PDF</span>
              </div>
            </div>
          </div>
          
          <!-- Filters -->
          <div id="native-report-filters" style="display:flex; gap: 16px; margin-bottom: 20px; flex-shrink: 0;">
            <div style="display:flex; flex-direction: column;">
                <label style="font-size: 12px; font-weight: 600; margin-bottom: 4px;">Region</label>
                <select id="report-filter-region" style="padding: 8px; border-radius: 6px; border: 1px solid #e5e7eb;">
                    <option value="South">South</option>
                    <option value="North">North</option>
                </select>
            </div>
          </div>

          <!-- Preview Area -->
          <div style="flex-grow: 1; overflow: auto; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; display: flex; justify-content: center;">
             <div id="native-report-preview" style="background: white; width: 100%; max-width: 1200px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); padding: 20px; min-height: 800px; transform-origin: top center;">
                <div style="color: #64748b; text-align: center; margin-top: 100px;">Please select a report and click "Generate".</div>
             </div>
          </div>
        </div>
      </div>'''

# Find <div id="view-reports" class="view-page hidden"> and the corresponding closing div.
# Because the DOM is complex, we will find the start of view-reports and the start of view-breakdowns (which follows it).
# We can replace everything in between.
start_str = '<div id="view-reports" class="view-page hidden">'
end_str = '<div id="view-breakdowns" class="view-page hidden">'

if start_str in content and end_str in content:
    start_idx = content.find(start_str)
    end_idx = content.find(end_str)
    
    new_content = content[:start_idx] + new_view_html + '\n\n      ' + content[end_idx:]
    
    with codecs.open('index.html', 'w', 'utf-8') as f:
        f.write(new_content)
    print("Replaced view-reports.")
else:
    print("Could not find view-reports or view-breakdowns.")

