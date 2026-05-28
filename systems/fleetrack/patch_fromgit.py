"""
Permanently patch index.html.fromgit to disable the sidebar layout.
This ensures that any future restore from this file won't revert to the left navbar.
"""
import re

with open('index.html.fromgit', 'r', encoding='utf-8') as f:
    c = f.read()

changes = 0

# 1. Change .app-shell from grid to block
if 'display: grid;' in c and 'grid-template-columns: var(--sidebar-width)' in c:
    c = re.sub(
        r'(\.app-shell\s*\{[^}]*?)display:\s*grid;\s*\n\s*grid-template-columns:[^;]+;',
        r'\1display: block !important;\n      /* grid-template-columns removed — top-nav layout */',
        c
    )
    changes += 1
    print("  [1] Changed .app-shell from grid to block")

# 2. Comment out display:flex in .sidebar rule
sidebar_match = re.search(r'(\.sidebar\s*\{[^}]*?)display:\s*flex;', c)
if sidebar_match:
    c = c[:sidebar_match.start()] + sidebar_match.group(0).replace('display: flex;', '/* display: flex; -- disabled for top-nav layout */') + c[sidebar_match.end():]
    changes += 1
    print("  [2] Commented out display:flex in .sidebar")

# 3. Add display:none to .sidebar if not already there
if 'display: none !important' not in c.split('.sidebar {')[1].split('}')[0] if '.sidebar {' in c else '':
    c = c.replace('.sidebar {', '.sidebar {\n      display: none !important;\n')
    changes += 1
    print("  [3] Added display:none to .sidebar")

with open('index.html.fromgit', 'w', encoding='utf-8') as f:
    f.write(c)

print(f"\nPatched index.html.fromgit with {changes} changes.")
