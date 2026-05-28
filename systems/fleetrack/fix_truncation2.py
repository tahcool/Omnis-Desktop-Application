import codecs
import re

with codecs.open('index.html.bak', 'r', 'utf-8') as f:
    content = f.read()

matches = [m.start() for m in re.finditer(r'loadFtMachineRegister\(filters\)', content)]
if matches:
    trunc_point = matches[-1]
    # Let's find the closing brace after it
    close_brace = content.find("}", trunc_point)
    if close_brace != -1:
        missing_part = content[close_brace + 1:]
        print(f"Missing part is {len(missing_part)} chars long")
        
        with codecs.open('index.html', 'a', 'utf-8') as f:
            f.write(missing_part)
        print("Appended missing part to index.html")
