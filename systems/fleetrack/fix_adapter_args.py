import codecs

with codecs.open('js/report_data_adapters.js', 'r', 'utf-8') as f:
    content = f.read()

content = content.replace("args: ['*']", "params: { columns: '*' }")
content = content.replace(
    'if (bdResponse.error) { console.error("bdResponse error:", bdResponse); throw new Error(bdResponse.error.message || JSON.stringify(bdResponse.error)); }',
    'if (bdResponse.error) { const errMsg = typeof bdResponse.error === "string" ? bdResponse.error : (bdResponse.error.message || JSON.stringify(bdResponse.error)); throw new Error(errMsg); }'
)
content = content.replace(
    'if (maResponse.error) throw new Error(maResponse.error.message);',
    'if (maResponse.error) { const errMsg = typeof maResponse.error === "string" ? maResponse.error : (maResponse.error.message || JSON.stringify(maResponse.error)); throw new Error(errMsg); }'
)

with codecs.open('js/report_data_adapters.js', 'w', 'utf-8') as f:
    f.write(content)

print('Fixed IPC arguments and error handling')
