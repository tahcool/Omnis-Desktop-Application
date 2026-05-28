# -*- coding: utf-8 -*-
import codecs
import re

with codecs.open('index.html', 'r', 'utf-8') as f:
    content = f.read()

# Extract the main script block
scripts = re.findall(r'<script>(.*?)</script>', content, re.DOTALL)

if scripts:
    with codecs.open('test_script2.js', 'w', 'utf-8') as f:
        f.write(scripts[0])
    print("Script extracted.")
else:
    print("No script tags found.")
