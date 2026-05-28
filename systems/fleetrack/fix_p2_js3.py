import codecs

with codecs.open('js/migrate_phase2.js', 'r', 'utf-8') as f:
    content = f.read()

# Replace the breakdown payload cleanup logic
old_cleanup = '''            if (payload.creation) delete payload.creation;
            if (payload.owner) delete payload.owner;
            if (payload.idx) delete payload.idx;'''

new_cleanup = '''            // Strip Frappe system fields
            const keys = Object.keys(payload);
            for (const k of keys) {
                if (k.startswith('_')) delete payload[k];
            }
            if (payload.creation) delete payload.creation;
            if (payload.owner) delete payload.owner;
            if (payload.idx) delete payload.idx;
            if (payload.docstatus !== undefined) delete payload.docstatus;
            if (payload.modified) {
                payload.updated_at = payload.modified;
                delete payload.modified;
            }
            // Strip fields that our custom python script adds but aren't in schema
            if (payload.machine_display_name) delete payload.machine_display_name;
            if (payload.days_on_bd !== undefined) delete payload.days_on_bd;
            if (payload.machine_model) delete payload.machine_model;
            if (payload.fleet_no) delete payload.fleet_no;
            if (payload.serial_number) delete payload.serial_number;
            '''

content = content.replace(old_cleanup, new_cleanup)

with codecs.open('js/migrate_phase2.js', 'w', 'utf-8') as f:
    f.write(content)

print("Updated migrate_phase2.js to strip Frappe system fields")
