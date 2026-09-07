import re

file_path = r'c:\Users\Administrator\omnis\systems\medicals\index.html'
with open(file_path, 'r', encoding='utf-8') as f:
    html = f.read()

# Find the end of the calendar block
pattern = r'(\s*</div>\s*</div>\s*</div>\s*</div>\s*)(<!-- Patient Directory View -->)'

match = re.search(pattern, html)
if match:
    # Replace with only 2 closing divs, because the calendar block only needs 2, and the Dashboard view needs 1
    # Wait, if the Dashboard view needs 1, then we need 2 for calendar + 1 for dashboard = 3 closing divs total!
    # Let's just calculate exactly how many we need for the whole Dashboard view to be balanced!
    start = html.find('<!-- Dashboard View -->')
    end = html.find('<!-- Patient Directory View -->')
    
    if start != -1 and end != -1:
        section = html[start:end]
        
        # We want to remove closing tags from the end until Opens == Closes
        # Let's do this iteratively:
        while True:
            opens = len(re.findall(r'<div\b[^>]*>', section))
            closes = len(re.findall(r'</div\s*>', section))
            
            if closes > opens:
                # Remove the last </div>
                last_div_idx = section.rfind('</div>')
                if last_div_idx != -1:
                    section = section[:last_div_idx] + section[last_div_idx+6:]
                else:
                    break
            else:
                break
                
        # Now section is balanced! Wait, what if opens > closes?
        while opens > closes:
            section += '\n</div>'
            closes += 1
            
        new_html = html[:start] + section + html[end:]
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_html)
        print("Successfully balanced the Dashboard View div tags!")
else:
    print("Pattern not found, falling back to iterative balancing.")
    # Fallback to iterative balancing
    start = html.find('<!-- Dashboard View -->')
    end = html.find('<!-- Patient Directory View -->')
    
    if start != -1 and end != -1:
        section = html[start:end]
        
        while True:
            opens = len(re.findall(r'<div\b[^>]*>', section))
            closes = len(re.findall(r'</div\s*>', section))
            
            if closes > opens:
                last_div_idx = section.rfind('</div>')
                if last_div_idx != -1:
                    section = section[:last_div_idx] + section[last_div_idx+6:]
                else:
                    break
            else:
                break
                
        while opens > closes:
            section += '\n</div>'
            closes += 1
            
        new_html = html[:start] + section + html[end:]
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_html)
        print("Successfully balanced the Dashboard View div tags!")

