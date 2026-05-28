import codecs

with codecs.open('js/migrate_phase2.js', 'r', 'utf-8') as f:
    content = f.read()

content = content.replace('if (payload.creation) delete payload.creation;', 'if (payload.creation) delete payload.creation;\n            if (payload.modified) {\n                payload.updated_at = payload.modified;\n                delete payload.modified;\n            }')

with codecs.open('js/migrate_phase2.js', 'w', 'utf-8') as f:
    f.write(content)

print("Updated migrate_phase2.js to handle 'modified' field")
