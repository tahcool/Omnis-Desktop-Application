import os

path = 'C:/Users/Administrator/omnis/systems/salestrack/index.html'
with open(path, 'r', encoding='utf-8') as f:
    html = f.read()

# Fix the Team tab display none issue
oldTeamTab = '<div id="settings-tab-team" class="settings-tab-content" style="display:none;">'
newTeamTab = '<div id="settings-tab-team" class="settings-tab-content hidden">'
if oldTeamTab in html:
    html = html.replace(oldTeamTab, newTeamTab)
    print("Fixed Team tab display issue.")

with open(path, 'w', encoding='utf-8') as f:
    f.write(html)
