import re

file_path = r"c:\Users\Administrator\omnis\systems\salestrack\index.html"
with open(file_path, "r", encoding="utf-8") as f:
    html = f.read()

# Bust cache for all local JS files
html = re.sub(r'src="([a-zA-Z0-9_-]+\.js)(\?v=\d+)?"', r'src="\1?v=202609072015"', html)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(html)
    
print("Busted cache for all local JS files in index.html")
