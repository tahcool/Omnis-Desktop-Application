# -*- coding: utf-8 -*-
import os
import re

file_path = r'c:\Users\Administrator\omnis\systems\medicals\index.html'

with open(file_path, 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Add "Public Holidays" input next to month picker
search_month = '<input type="month" id="she-report-month" class="search-input" style="width:auto;">'
replace_month = '<input type="month" id="she-report-month" class="search-input" style="width:auto;" title="Report Month">\n                        <input type="number" id="she-report-holidays" class="search-input" style="width: 150px;" placeholder="Public Holidays (days)" title="Number of public holiday days in the selected month" min="0" value="0">'
html = html.replace(search_month, replace_month)

# 2. Remove "Record Stats" button
html = re.sub(r'<button[^>]*onclick="showAddSheStatsModal\(\)"[^>]*>.*?<\/button>', '', html)

# 3. Add disclaimer to the printed report output, right after the stats table
search_stats = '<table class="she-table" id="print-she-stats-table">\n                  <thead>\n                      <tr>\n                          <th>SUMMARY</th><th>CSD</th><th>ENG</th><th>SRD</th><th>SPZ</th><th>SPE</th><th>TMG</th><th>SPW</th><th>GROUP TOTAL</th>\n                      </tr>\n                  </thead>\n                  <tbody></tbody>\n              </table>'
replace_stats = search_stats + '\n              <div style="font-size: 9px; color: #64748b; margin-top: 5px; font-style: italic;">* Manhours are automatically calculated as: Manpower x (Weekdays in Month - Public Holidays) x 8 hours - (Total Sick Leave Hours).</div>'
html = html.replace(search_stats, replace_stats)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(html)
print('HTML update for UI complete')
