import codecs

with codecs.open('index.html', 'r', 'utf-8') as f:
    content = f.read()

if 'migrate_data.js' not in content:
    content = content.replace(
        '<script src="js/report_data_adapters.js"></script>',
        '<script src="js/report_data_adapters.js"></script>\n    <script src="js/migrate_data.js"></script>'
    )
    with codecs.open('index.html', 'w', 'utf-8') as f:
        f.write(content)
    print("Injected migrate_data.js into index.html")
else:
    print("Already injected")
