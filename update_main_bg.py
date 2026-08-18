import re

file_path = r"c:\Users\Administrator\omnis\systems\salestrack\index.html"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Revert news card
old_news_style = 'style="background-color: #ffffff; background-image: radial-gradient(#e2e8f0 1.5px, transparent 1.5px); background-size: 24px 24px; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px 24px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); display: flex; flex-direction: column; gap: 16px;"'
new_news_style = 'style="background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px 24px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); display: flex; flex-direction: column; gap: 16px;"'

if old_news_style in content:
    content = content.replace(old_news_style, new_news_style)
    print("Reverted news card background.")
else:
    print("Could not find news card style.")

# 2. Add pattern to .dash-container
dash_old = """.dash-container {
      background: #f8fafc;"""
dash_new = """.dash-container {
      background-color: #f8fafc;
      background-image: radial-gradient(#cbd5e1 1px, transparent 1px);
      background-size: 24px 24px;"""

if dash_old in content:
    content = content.replace(dash_old, dash_new)
    print("Added background pattern to dash-container.")
else:
    # Try a fallback if spacing is different
    pattern = re.compile(r'\.dash-container\s*\{\s*background:\s*#f8fafc;')
    if pattern.search(content):
        content = pattern.sub('.dash-container {\n      background-color: #f8fafc;\n      background-image: radial-gradient(#cbd5e1 1.5px, transparent 1.5px);\n      background-size: 32px 32px;', content)
        print("Added background pattern to dash-container (regex).")
    else:
        print("Could not find dash-container.")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
