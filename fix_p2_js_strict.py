import codecs

with codecs.open('Supabase_Phase2.sql', 'r', 'utf-8') as f:
    sql = f.read()

import re
machine_cols = re.findall(r'^\s+([a-z0-9_]+)\s+[a-z]', sql.split('-- Table: ft_machine')[1].split(');')[0], re.MULTILINE)
bd_cols = re.findall(r'^\s+([a-z0-9_]+)\s+[a-z]', sql.split('-- Table: ft_breakdown_log')[1].split(');')[0], re.MULTILINE)

with codecs.open('systems/fleetrack/js/migrate_phase2.js', 'r', 'utf-8') as f:
    js_content = f.read()

# Replace machine cleanup
old_m_clean = '''            // Clean payload
            const keys = Object.keys(payload);
            for (const k of keys) {
                if (k.startsWith('_')) delete payload[k]; // Strip _assign, _comments, etc
            }
            if (payload.creation) delete payload.creation;
            if (payload.owner) delete payload.owner;
            if (payload.idx) delete payload.idx;
            if (payload.docstatus !== undefined) delete payload.docstatus;
            if (payload.modified) {
                payload.updated_at = payload.modified;
                delete payload.modified;
            }'''

new_m_clean = f'''            // Clean payload using strict schema
            const valid_cols = {machine_cols};
            if (payload.modified) payload.updated_at = payload.modified;
            const keys = Object.keys(payload);
            for (const k of keys) {{
                if (!valid_cols.includes(k)) delete payload[k];
            }}'''

js_content = js_content.replace(old_m_clean, new_m_clean)

# Replace bd cleanup
old_bd_clean = '''            // Clean payload
            const keys = Object.keys(payload);
            for (const k of keys) {
                if (k.startsWith('_')) delete payload[k]; // Strip _assign, _comments, etc
            }
            if (payload.creation) delete payload.creation;
            if (payload.owner) delete payload.owner;
            if (payload.idx) delete payload.idx;
            if (payload.docstatus !== undefined) delete payload.docstatus;
            if (payload.modified) {
                payload.updated_at = payload.modified;
                delete payload.modified;
            }
            
            // Strip calculated UI fields that aren't in the database schema
            if (payload.machine_display_name) delete payload.machine_display_name;
            if (payload.days_on_bd !== undefined) delete payload.days_on_bd;
            if (payload.machine_model) delete payload.machine_model;
            if (payload.fleet_no) delete payload.fleet_no;
            if (payload.serial_number) delete payload.serial_number;'''

new_bd_clean = f'''            // Clean payload using strict schema
            const valid_cols = {bd_cols};
            if (payload.modified) payload.updated_at = payload.modified;
            const keys = Object.keys(payload);
            for (const k of keys) {{
                if (!valid_cols.includes(k)) delete payload[k];
            }}'''

js_content = js_content.replace(old_bd_clean, new_bd_clean)

with codecs.open('systems/fleetrack/js/migrate_phase2.js', 'w', 'utf-8') as f:
    f.write(js_content)

print("Updated migrate_phase2.js to use strict schema validation")
