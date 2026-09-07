import re

file_path = r'c:\Users\Administrator\omnis\systems\medicals\index.html'

with open(file_path, 'r', encoding='utf-8') as f:
    html = f.read()

pattern = r'<div style="margin-top:2px;font-size:9px;font-weight:700;color:.*?;text-transform:uppercase;letter-spacing:0.5px;">.*?</div>\s*'

new_html = re.sub(pattern, '', html)

if html != new_html:
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_html)
    print("Successfully removed the shortcut labels.")
else:
    print("Labels not found.")

