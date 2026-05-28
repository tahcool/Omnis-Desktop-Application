import codecs

with codecs.open('js/report_data_adapters.js', 'r', 'utf-8') as f:
    content = f.read()

content = content.replace(
    'if (bdResponse.error) throw new Error(bdResponse.error.message);',
    'if (bdResponse.error) { console.error("bdResponse error:", bdResponse); throw new Error(bdResponse.error.message || JSON.stringify(bdResponse.error)); }'
)

with codecs.open('js/report_data_adapters.js', 'w', 'utf-8') as f:
    f.write(content)

print('Added better error logging')
