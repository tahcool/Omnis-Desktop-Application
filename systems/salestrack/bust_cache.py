import re

file_path = r"c:\Users\Administrator\omnis\systems\salestrack\index.html"
with open(file_path, "r", encoding="utf-8") as f:
    html = f.read()

# Bust cache for create_quotation_logic.js
html = re.sub(r'src="create_quotation_logic\.js(\?v=\d+)?"', 'src="create_quotation_logic.js?v=202609072012"', html)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(html)
    
print("Busted cache for create_quotation_logic.js")
