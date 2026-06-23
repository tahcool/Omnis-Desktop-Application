import os

file_path = "C:/Users/Administrator/omnis/systems/salestrack/dashboard_logic.js"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace('<th style="padding:12px 16px;', '<th style="padding:12px 16px; color:white;')

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Headings made white!")
