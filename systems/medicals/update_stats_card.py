# -*- coding: utf-8 -*-
import os
import re

file_path = r'c:\Users\Administrator\omnis\systems\medicals\index.html'
js_path = r'c:\Users\Administrator\omnis\systems\medicals\medicals_logic.js'

# Update HTML
with open(file_path, 'r', encoding='utf-8') as f:
    html = f.read()

search_card = '''<h3 style="margin:0; font-size: 16px;">Monthly Division Stats (Manpower & Manhours)</h3>
                            
                        </div>
                        <div id="she-stats-list" style="display:flex; flex-direction:column; gap:8px;"></div>'''

replace_card = '''<h3 style="margin:0; font-size: 16px;">Monthly Division Stats (Manpower & Manhours)</h3>
                        </div>
                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px;">
                            <p style="margin: 0 0 10px 0; font-size: 14px; color: #1e293b; font-weight: 600;">Automated Calculation Active</p>
                            <p style="margin: 0 0 8px 0; font-size: 13px; color: #64748b;">The reporting engine dynamically calculates these statistics during report generation using the following formulas:</p>
                            
                            <div style="background: #fff; padding: 12px; border-radius: 6px; border-left: 4px solid #3b82f6; font-family: monospace; font-size: 12px; color: #334155; margin-bottom: 8px;">
                                <strong>Manpower Level</strong> = Total count of active staff registered under the division
                            </div>
                            
                            <div style="background: #fff; padding: 12px; border-radius: 6px; border-left: 4px solid #10b981; font-family: monospace; font-size: 12px; color: #334155;">
                                <strong>Manhours Worked</strong> = Manpower x (Weekdays in Month - Public Holidays) x 8 hours - (Total Sick Leave Hours)
                            </div>
                        </div>'''

html = html.replace(search_card, replace_card)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(html)

# Update JS
with open(js_path, 'r', encoding='utf-8') as f:
    js = f.read()

js = re.sub(r'const sList = document\.getElementById\(\'she-stats-list\'\);[\s\S]*?\}\);[\s\S]*?\}', '', js)

with open(js_path, 'w', encoding='utf-8') as f:
    f.write(js)

print('Updated UI and Logic for Stats card')
