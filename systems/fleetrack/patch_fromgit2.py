"""
Patch index.html.fromgit to wrap dashboard content in a view-page div.
"""
import re

with open('index.html.fromgit', 'r', encoding='utf-8') as f:
    c = f.read()

if 'id="view-dashboard"' in c:
    print("view-dashboard already exists in fromgit, skipping")
else:
    # Find the topbar div inside <main class="main">
    main_idx = c.find('<main class="main">')
    if main_idx < 0:
        print("ERROR: <main class='main'> not found")
    else:
        topbar_idx = c.find('<div class="topbar">', main_idx)
        if topbar_idx < 0:
            print("ERROR: topbar not found after main")
        else:
            # Insert view-dashboard wrapper before topbar
            c = c[:topbar_idx] + '<div id="view-dashboard" class="view-page">\n      ' + c[topbar_idx:]
            
            # Find <!-- REPORT ARCHIVES VIEW --> and close the wrapper before it
            archives_marker = '<!-- REPORT ARCHIVES VIEW -->'
            archives_idx = c.find(archives_marker)
            if archives_idx < 0:
                print("ERROR: REPORT ARCHIVES VIEW marker not found")
            else:
                c = c[:archives_idx] + '</div><!-- /view-dashboard -->\n\n      ' + c[archives_idx:]
                
                with open('index.html.fromgit', 'w', encoding='utf-8') as f:
                    f.write(c)
                print("Patched index.html.fromgit with view-dashboard wrapper")
