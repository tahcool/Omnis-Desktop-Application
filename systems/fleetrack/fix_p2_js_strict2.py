import codecs
import re

with codecs.open('js/migrate_phase2.js', 'r', 'utf-8') as f:
    js_content = f.read()

# Find the second occurrence of valid_cols (which is the breakdown one)
parts = js_content.split('const valid_cols = [')

if len(parts) >= 3:
    # First split is before machine cols
    # Second split is before breakdown cols
    
    # We want to replace the array content of the breakdown cols
    bd_part = parts[2]
    # Find where the array ends
    end_idx = bd_part.find('];')
    
    correct_bd_cols = "'name', 'machine', 'column_break_2', 'oem', 'customer', 'breakdown_date', 'location', 'breakdown_details_section', 'column_break_8', 'description', 'status', 'days_on_bd', 'end_date', 'model', 'fleetrack_managed', 'warranty_status', 'parts_eta', 'ted', 'red', 'fsb', 'resp', 'section_break_19', 'last_col_br_oeta', 'section_break_17', 'dobd_col_br', 'oeta_col_br', 'out_eta', 'section_break_27', 'on_hold', 'ted_status', 'bd_duration', 'category', 'created_at', 'updated_at'"
    
    new_bd_part = correct_bd_cols + bd_part[end_idx:]
    parts[2] = new_bd_part
    
    js_content = 'const valid_cols = ['.join(parts)
    
    with codecs.open('js/migrate_phase2.js', 'w', 'utf-8') as f:
        f.write(js_content)
    
    print("Fixed the valid_cols for breakdown logs")
else:
    print("Could not find the breakdown valid_cols array")

