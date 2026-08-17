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
            matches = re.findall(r'"name":\s*"([^"]+)"', content)
            
            # Count occurrences of each warning type
            counts = {}
            for m in matches:
                if m not in counts:
                    counts[m] = 0
                counts[m] += 1
            print("Warning counts:")
            for k, v in counts.items():
                print(f"{k}: {v}")
            break
except Exception as e:
    print(f"Error: {e}")
