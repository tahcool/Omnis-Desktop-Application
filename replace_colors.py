import re

with open(r'c:\Users\Administrator\omnis\systems\salestrack\index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Quick Access Bar replacements
# Replace all the colorful icons with a sleek slate gray (#475569)
content = content.replace('color:#2563eb; font-size:14px;', 'color:#475569; font-size:14px;')
content = content.replace('color:#10b981; font-size:14px;', 'color:#475569; font-size:14px;')
content = content.replace('color:#d97706; font-size:14px;', 'color:#475569; font-size:14px;')
content = content.replace('color:#8b2219; font-size:14px;', 'color:#475569; font-size:14px;')
content = content.replace('color:#9333ea; font-size:14px;', 'color:#475569; font-size:14px;')
content = content.replace('color:#ec4899; font-size:14px;', 'color:#475569; font-size:14px;')
content = content.replace('color:#ef4444; font-size:14px;', 'color:#475569; font-size:14px;')
content = content.replace('color:#0ea5e9; font-size:14px;', 'color:#475569; font-size:14px;')
content = content.replace('color:#f59e0b; font-size:14px;', 'color:#475569; font-size:14px;')
content = content.replace('color:#8b5cf6; font-size:14px;', 'color:#475569; font-size:14px;')

# Quick access header icon block (blue gradient)
content = content.replace('background:linear-gradient(135deg,#1e3a5f,#2563eb);', 'background:#f1f5f9; border:1px solid #e2e8f0;')
content = content.replace('class="fas fa-th" style="color:#fff;font-size:11px;"', 'class="fas fa-th" style="color:#475569;font-size:11px;"')

# Kanban timeline header icon block (purple/blue gradient)
content = content.replace('background:linear-gradient(135deg,#6366f1,#4338ca);', 'background:#f1f5f9; border:1px solid #e2e8f0;')
content = content.replace('class="fas fa-stream" style="color:#fff;font-size:13px;"', 'class="fas fa-stream" style="color:#475569;font-size:13px;"')

with open(r'c:\Users\Administrator\omnis\systems\salestrack\index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Icon colors replaced successfully")
