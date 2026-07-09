import os
import glob

old_key = process.env.SUPABASE_SERVICE_KEY
new_key = process.env.SUPABASE_SERVICE_KEY

base_dir = r"c:\Users\Administrator\omnis"

def process_file(filepath):
    try:
        with open(filepath, 'rb') as f:
            content = f.read().decode('utf-8')
            
        if old_key in content:
            new_content = content.replace(old_key, new_key)
            with open(filepath, 'wb') as f:
                f.write(new_content.encode('utf-8'))
            print(f"Updated: {filepath}")
    except Exception as e:
        pass

for root, _, files in os.walk(base_dir):
    if '.git' in root or 'node_modules' in root:
        continue
    for file in files:
        if file.endswith('.js') or file.endswith('.py') or file.endswith('.html') or file.endswith('.json') or file.endswith('.ts') or file.endswith('.env'):
            process_file(os.path.join(root, file))

print("Bulk replacement complete.")
