import codecs

with codecs.open('index.html.bak', 'r', 'utf-8') as f:
    content = f.read()

# Find the point where index.html was truncated
trunc_point = content.find("loadFtMachineRegister(filters);\n    }")

if trunc_point != -1:
    missing_part = content[trunc_point + len("loadFtMachineRegister(filters);\n    }"):]
    print(f"Missing part is {len(missing_part)} chars long")
    
    with codecs.open('index.html', 'a', 'utf-8') as f:
        f.write(missing_part)
    print("Appended missing part to index.html")
else:
    print("Could not find truncation point in index.html.bak")
