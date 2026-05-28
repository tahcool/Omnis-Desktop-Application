import codecs

with codecs.open('index.html', 'r', 'utf-8') as f:
    content = f.read()

content = content.replace(
    '<script src="js/report_engine.js"></script>',
    '<script src="js/report_engine.js"></script>\n    <script src="js/report_data_adapters.js"></script>'
)

with codecs.open('index.html', 'w', 'utf-8') as f:
    f.write(content)

print('Injected report_data_adapters.js')
