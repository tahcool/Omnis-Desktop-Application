# -*- coding: utf-8 -*-
import codecs
import re

with codecs.open('index.html', 'r', 'utf-8') as f:
    content = f.read()

# Extract script blocks
scripts = re.findall(r'<script>(.*?)</script>', content, re.DOTALL)

with codecs.open('test_script3.js', 'w', 'utf-8') as f:
    f.write(scripts[0] if scripts else "")

