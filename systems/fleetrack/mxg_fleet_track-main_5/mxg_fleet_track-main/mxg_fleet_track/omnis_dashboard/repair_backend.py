import os

file_path = r"c:\Users\Administrator\omnis\systems\fleetrack\ft_breakdown_dashboard.py"

with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
    content = f.read()

# Find the valid end of the file
marker = '"debug_note": "Fetched via frappe.get_all (Dashboard Logic)"'
idx = content.find(marker)

if idx != -1:
    # Keep everything up to the closing brace (idx + len(marker) + a bit for newlines/indent + '}')
    # Actually, marker is inside a dict inside return.
    # We want to find the closing brace of the return dict.
    # It's usually a few lines down.
    # Let's simple split by marker, take the first part, find the next '}', keep that.
    
    pre_marker = content[:idx]
    post_marker = content[idx:]
    
    # We expect '    }\n' or similar shortly after marker
    end_brace_idx = post_marker.find("}")
    if end_brace_idx != -1:
        valid_content = pre_marker + post_marker[:end_brace_idx+1]
        
        # Now append the new cleaned function
        new_code = '''

@frappe.whitelist(allow_guest=True)
def get_ft_machine_register(region: str | None = None) -> Dict[str, Any]:
    """
    Get all machines for the Machine Register.
    Bypasses read permissions for Guest/System users.
    """
    filters = {}
    if region:
        filters["region"] = region

    machines = frappe.get_all(
        "FT Machine",
        filters=filters,
        fields=[
            "name", "customer", "region", "model", "type", 
            "fleet_no", "sn", "mxg_fleet_no", "location", 
            "warranty_status", "current_hmr", "status"
        ],
        order_by="name asc",
        limit_page_length=5000,
        ignore_permissions=True
    )

    return {"data": machines}
'''
        full_content = valid_content + new_code
        
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(full_content)
        print("Successfully repaired file.")
    else:
        print("Could not find closing brace.")
else:
    print("Could not find marker.")
