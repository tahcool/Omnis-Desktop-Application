import codecs

with codecs.open('js/migrate_phase2.js', 'r', 'utf-8') as f:
    content = f.read()

content = content.replace('if (dbrRes.message && dbrRes.message.data && Array.isArray(dbrRes.message.data)) {', 'if (dbrRes.message && dbrRes.message.data && Array.isArray(dbrRes.message.data)) {\n            breakdowns = dbrRes.message.data;\n        } else if (dbrRes.message && dbrRes.message.breakdowns && Array.isArray(dbrRes.message.breakdowns)) {\n            breakdowns = dbrRes.message.breakdowns;\n        } else if (dbrRes.breakdowns && Array.isArray(dbrRes.breakdowns)) {\n            breakdowns = dbrRes.breakdowns;\n')

with codecs.open('js/migrate_phase2.js', 'w', 'utf-8') as f:
    f.write(content)

print("Updated migrate_phase2.js to handle 'breakdowns' array wrapper")
