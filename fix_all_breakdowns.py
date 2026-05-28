import codecs

with codecs.open('systems/fleetrack/ft_breakdown_dashboard.py', 'r', 'utf-8') as f:
    content = f.read()

new_endpoint = '''
@frappe.whitelist(allow_guest=True)
def get_ft_breakdown_all_for_migration():
    """
    Temporary endpoint to fetch ALL breakdowns (open and closed) 
    for the Phase 2 data migration to Supabase. Bypasses permissions.
    """
    try:
        rows = frappe.get_all(
            "FT Breakdown Log",
            filters={},
            fields=["*"],
            limit_page_length=99999,
            ignore_permissions=True
        )
        return {"data": rows}
    except Exception as e:
        return {"error": str(e)}
'''

if 'get_ft_breakdown_all_for_migration' not in content:
    with codecs.open('systems/fleetrack/ft_breakdown_dashboard.py', 'a', 'utf-8') as f:
        f.write(new_endpoint)
    print("Added get_ft_breakdown_all_for_migration endpoint.")
else:
    print("Endpoint already exists.")

with codecs.open('systems/fleetrack/js/migrate_phase2.js', 'r', 'utf-8') as f:
    js_content = f.read()

# Replace the DBR endpoint with the new ALL endpoint
js_content = js_content.replace('get_ft_breakdown_dbr_v2', 'get_ft_breakdown_all_for_migration')
# Also disable machine fetching so it only does breakdowns to save time
js_content = js_content.replace('const machinesRes = await callFrappe', '// const machinesRes = await callFrappe')
js_content = js_content.replace('let machines = [];', 'let machines = []; // disabled')

with codecs.open('systems/fleetrack/js/migrate_phase2.js', 'w', 'utf-8') as f:
    f.write(js_content)

print("Updated migrate_phase2.js to use new endpoint and skip machines.")
