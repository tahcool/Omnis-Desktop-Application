import codecs

with codecs.open('index.html', 'r', 'utf-8') as f:
    content = f.read()

if 'migrate_phase2.js' not in content:
    content = content.replace(
        '<script src="js/migrate_phase1.js"></script>',
        '<script src="js/migrate_phase1.js"></script>\n    <script src="js/migrate_phase2.js"></script>'
    )
    with codecs.open('index.html', 'w', 'utf-8') as f:
        f.write(content)

print("Injected migrate_phase2.js into index.html")
