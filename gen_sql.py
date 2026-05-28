import json
import glob
import os

doctypes = [
    'ft_customer', 'ft_region', 'ft_location', 
    'ft_machine_model', 'ft_machine_oem', 'ft_machine_type',
    'ft_technician', 'ft_bd_category', 'ft_defect_category'
]

base_path = r'C:\Users\Administrator\omnis\systems\fleetrack\mxg_fleet_track-main_5\mxg_fleet_track-main\mxg_fleet_track\mxg_fleet_track\doctype'

sql_statements = []

for dt in doctypes:
    json_path = os.path.join(base_path, dt, f"{dt}.json")
    if not os.path.exists(json_path):
        continue
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    table_name = data.get('name', '').lower().replace(' ', '_')
    if not table_name:
        continue
        
    fields = data.get('fields', [])
    
    columns = ["    name text PRIMARY KEY"]
    
    for fld in fields:
        fieldname = fld.get('fieldname')
        if not fieldname: continue
        fieldtype = fld.get('fieldtype')
        
        # Mapping Frappe types to PG types
        pg_type = "text"
        if fieldtype in ['Int', 'Check']:
            pg_type = "integer"
        elif fieldtype in ['Float', 'Currency', 'Percent']:
            pg_type = "numeric"
        elif fieldtype in ['Date', 'Datetime']:
            pg_type = "timestamp with time zone"
            
        columns.append(f"    {fieldname} {pg_type}")
        
    columns.append("    created_at timestamp with time zone DEFAULT now()")
    columns.append("    updated_at timestamp with time zone DEFAULT now()")
    
    sql = f"-- Table: {table_name}\nCREATE TABLE public.{table_name} (\n" + ",\n".join(columns) + "\n);"
    sql += f"\nALTER TABLE public.{table_name} ENABLE ROW LEVEL SECURITY;"
    sql += f"\nCREATE POLICY \"Allow all access to {table_name}\" ON public.{table_name} FOR ALL USING (true) WITH CHECK (true);\n"
    
    sql_statements.append(sql)

with open('phase1_schema.sql', 'w') as f:
    f.write("\n".join(sql_statements))

print("Generated phase1_schema.sql")
