import os
import re

file_path = r'c:\Users\Administrator\omnis\systems\medicals\index.html'

with open(file_path, 'r', encoding='utf-8') as f:
    html = f.read()

# The Medical News block starts with <!-- MEDICAL NEWS & UPDATES --> and ends before <!-- Patient Directory View -->
# We can use regex to remove it entirely
pattern = r'<!-- MEDICAL NEWS & UPDATES -->.*?<!-- Patient Directory View -->'

new_html = re.sub(pattern, '<!-- Patient Directory View -->', html, flags=re.DOTALL)

if new_html != html:
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_html)
    print("Successfully removed the Medical News section.")
else:
    print("Could not find the Medical News section.")

