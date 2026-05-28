import io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

f = open(r'C:\Users\Administrator\omnis\systems\fleetrack\index.html', encoding='utf-8')
content = f.read()
f.close()

# ── 1. Extract the rpt-hub block from view-reports ───────────────────────────
HUB_START_MARKER = '<!-- ══ REPORTS HUB ══ -->'
HUB_END_MARKER   = '<!-- /rpt-hub -->'

hub_start = content.find(HUB_START_MARKER)
hub_end   = content.find(HUB_END_MARKER)

if hub_start == -1 or hub_end == -1:
    print('ERROR: Could not find rpt-hub markers')
    sys.exit(1)

hub_end_full = hub_end + len(HUB_END_MARKER)
# Include trailing newline if present
if content[hub_end_full:hub_end_full+2] in ('\r\n', '\n'):
    hub_end_full += 2 if content[hub_end_full:hub_end_full+2] == '\r\n' else 1

hub_html = content[hub_start:hub_end_full]
print(f'Extracted rpt-hub block ({len(hub_html)} chars)')
print(f'First 80 chars: {hub_html[:80]!r}')
print(f'Last  80 chars: {hub_html[-80:]!r}')

# ── 2. Remove the hub from view-reports ──────────────────────────────────────
content_no_hub = content[:hub_start] + content[hub_end_full:]
print(f'\nContent after removal: {len(content)} → {len(content_no_hub)} chars')

# Verify rpt-hub is gone from view-reports context
remaining = content_no_hub.find(HUB_START_MARKER)
print(f'Hub still present: {remaining != -1}')

# ── 3. Build the dashboard injection ────────────────────────────────────────
# Insert the hub after the Weekly Reporting Queue closing div in the dashboard
# Marker: the closing of the reporting-queue div section
DASHBOARD_INSERT_AFTER = '</div>\n\n'  # after the reporting queue closing

# Find the reporting queue section
QUEUE_MARKER = '<div id="ft-report-queue"'
queue_idx = content_no_hub.find(QUEUE_MARKER)
if queue_idx == -1:
    print('ERROR: Could not find ft-report-queue')
    sys.exit(1)

# Find the two closing divs after ft-report-queue (closes queue + its parent)
# Structure:  <div id="ft-report-queue">...</div>  </div>  [blank line]
# Find first </div> after queue content
after_queue = content_no_hub.find('</div>', queue_idx)       # closes ft-report-queue
after_queue = content_no_hub.find('</div>', after_queue + 6)  # closes the panel wrapper
insert_at   = after_queue + 6  # position right after second </div>

print(f'\nInserting hub after reporting queue at char {insert_at}')

# Build the injection with a section header
DASHBOARD_SECTION = (
    '\n\n        <!-- ══ NATIVE REPORT QUICK-ACCESS ══ -->\n'
    '        <div style="margin-top:24px;">\n'
    '          <div style="font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;'
    'letter-spacing:1px;margin-bottom:14px;padding-bottom:8px;border-bottom:2px solid #f1f5f9;">'
    'Reports</div>\n'
    '          ' + hub_html.strip().replace('\n', '\n          ') + '\n'
    '        </div>\n'
)

content_final = content_no_hub[:insert_at] + DASHBOARD_SECTION + content_no_hub[insert_at:]
print(f'Final content length: {len(content_final)} chars')

# ── 4. Verify rpt-hub is now in dashboard (before view-reports) ──────────────
hub_pos     = content_final.find(HUB_START_MARKER)
reports_pos = content_final.find('id="view-reports"')
print(f'\nhub_pos={hub_pos}, view-reports pos={reports_pos}')
print(f'Hub is in dashboard (before view-reports): {hub_pos < reports_pos}')

f = open(r'C:\Users\Administrator\omnis\systems\fleetrack\index.html', 'w', encoding='utf-8')
f.write(content_final)
f.close()
print('\nFile saved OK')
