import os

path = 'C:/Users/Administrator/omnis/systems/salestrack/index.html'
with open(path, 'r', encoding='utf-8') as f:
    html = f.read()

start_marker = "/* ---------- WHATSAPP AUTOMATION & SALES PERSONS ---------- */"
end_marker = "setTimeout(() => fetchSalesPersons(), 2000);"

if start_marker in html and end_marker in html:
    start_idx = html.find(start_marker)
    end_idx = html.find(end_marker) + len(end_marker)
    
    js_text = html[start_idx:end_idx]
    
    # Check if already wrapped
    before_js = html[start_idx-20:start_idx]
    if "<script>" not in before_js:
        html = html[:start_idx] + "\n<script>\n" + js_text + "\n</script>\n" + html[end_idx:]
        
        with open(path, 'w', encoding='utf-8') as f:
            f.write(html)
        print("Successfully wrapped Javascript in <script> tags!")
    else:
        print("Javascript already wrapped in <script> tags!")
else:
    print("Markers not found!")
