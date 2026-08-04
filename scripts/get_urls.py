import re

with open('systems/fleetrack/index.html', 'r', encoding='utf-8') as f:
    text = f.read()

urls = set(re.findall(r"https?://[^\s\"']+", text))
print("URLs found:")
for u in urls:
    if 'unpkg' not in u and 'fonts' not in u:
        print("-", u)
