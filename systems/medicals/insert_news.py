import os

file_path = r'c:\Users\Administrator\omnis\systems\medicals\index.html'

with open('temp_old.html', 'r', encoding='utf-8') as f:
    old_lines = f.readlines()

# Extract block
start_idx = -1
end_idx = -1
for i, line in enumerate(old_lines):
    if '<!-- MEDICAL NEWS & UPDATES -->' in line:
        start_idx = i
        break

if start_idx != -1:
    for i in range(start_idx, len(old_lines)):
        if 'window.fetchMedicalNews = async function()' in old_lines[i]:
            # Now find the closing script tag for it
            for j in range(i, len(old_lines)):
                if '</script>' in old_lines[j]:
                    end_idx = j
                    break
            break

if start_idx != -1 and end_idx != -1:
    news_block = "".join(old_lines[start_idx:end_idx+1])
    
    with open(file_path, 'r', encoding='utf-8') as f:
        html = f.read()
    
    # Insert before "<!-- Patient Directory View -->"
    if '<!-- Patient Directory View -->' in html:
        new_html = html.replace('<!-- Patient Directory View -->', news_block + '\n\n          <!-- Patient Directory View -->')
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_html)
        print("Successfully restored the Medical News block.")
    else:
        print("Target insertion point not found.")
else:
    print("Could not locate news block bounds.")
