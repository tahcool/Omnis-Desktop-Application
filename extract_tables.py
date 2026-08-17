import json
import re

transcript_path = r'C:\Users\Administrator\.gemini\antigravity-ide\brain\df939953-46fb-4499-b1b9-d76cfe32a123\.system_generated\logs\transcript_full.jsonl'
try:
    with open(transcript_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    for line in reversed(lines):
        data = json.loads(line)
        if data.get('type') == 'USER_INPUT' and 'Now we want to look at all the warnings we have 421' in data.get('content', ''):
            content = data['content']
            # Using simple regex to extract table names from the metadata blocks or detail strings
            # Look for: "name": "tablename" directly inside the metadata dictionary for the warning
            matches = re.findall(r'"metadata":\s*\{\s*"name":\s*"([^"]+)"', content)
            tables = set(matches)
            with open('tables_to_fix.json', 'w') as out:
                json.dump(list(tables), out, indent=2)
            print(f'Extracted {len(tables)} unique tables from metadata.')
            break
except Exception as e:
    print(f"Error: {e}")
