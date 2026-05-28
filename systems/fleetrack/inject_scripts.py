import codecs

with codecs.open('index.html', 'r', 'utf-8') as f:
    content = f.read()

replacement = '''
    <!-- Native Report Engine -->
    <script src="../../assets/js/lodash.min.js"></script>
    <script src="js/report_engine.js"></script>
</body>
'''
# rsplit replaces only the last occurrence
content = content.rsplit('</body>', 1)
content = replacement.join(content)

with codecs.open('index.html', 'w', 'utf-8') as f:
    f.write(content)

print('Injected lodash and report_engine')
