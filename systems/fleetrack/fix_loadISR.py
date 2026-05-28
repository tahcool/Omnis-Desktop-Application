import sys

with open('index.html', 'r', encoding='utf-8') as f:
    c = f.read()

import re

# find all loadISR occurrences
matches = list(re.finditer(r'window\.loadISR = async function\(\) \{', c))
print("Found", len(matches), "occurrences of window.loadISR")

if len(matches) > 0:
    first = matches[0]
    # find where it ends: count braces
    idx = first.start()
    open_braces = 0
    in_function = False
    end_idx = -1
    
    for i in range(first.end(), len(c)):
        if c[i] == '{':
            open_braces += 1
            in_function = True
        elif c[i] == '}':
            open_braces -= 1
            if in_function and open_braces == -1:
                end_idx = i + 1
                break
    
    if end_idx != -1:
        supabase_loadISR = c[idx:end_idx]
        with open('loadISR_supabase.js', 'w', encoding='utf-8') as f:
            f.write(supabase_loadISR)
        print("Saved first loadISR to loadISR_supabase.js")
        
        # Now remove ALL loadISR functions
        new_c = c
        for m in reversed(matches):
            start = m.start()
            ob = 0
            inf = False
            end = -1
            for i in range(m.end(), len(new_c)):
                if new_c[i] == '{':
                    ob += 1
                    inf = True
                elif new_c[i] == '}':
                    ob -= 1
                    if inf and ob == -1:
                        end = i + 1
                        break
            if end != -1:
                new_c = new_c[:start] + new_c[end:]
        
        # re-insert the supabase loadISR at the end, right before </body>
        last_body = new_c.rfind('</body>')
        if last_body != -1:
            new_c = new_c[:last_body] + "<script>\n" + supabase_loadISR + "\n</script>\n" + new_c[last_body:]
            with open('index.html', 'w', encoding='utf-8') as f:
                f.write(new_c)
            print("Cleaned up and re-injected loadISR at the bottom!")
