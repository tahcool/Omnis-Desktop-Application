import codecs
import re

with codecs.open('index.html', 'r', 'utf-8') as f:
    content = f.read()

content = re.sub(r'<script src="js/migrate_phase1.js"></script>\n?', '', content)
content = re.sub(r'<script src="js/migrate_phase2.js"></script>\n?', '', content)

with codecs.open('index.html', 'w', 'utf-8') as f:
    f.write(content)

print("Removed migration scripts from index.html")
