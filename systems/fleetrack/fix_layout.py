import re

with open('index.html', 'r', encoding='utf-8') as f:
    c = f.read()

# Add CSS to hide sidebar and topbar
hide_css = """
    /* --- HIDE LEGACY NAVBAR AND TOPBAR --- */
    .sidebar { display: none !important; }
    .topbar { display: none !important; }
    .main-content { margin-left: 0 !important; width: 100vw !important; margin-top: 80px !important; }
"""

# Insert before </style>
if "/* --- HIDE LEGACY NAVBAR AND TOPBAR --- */" not in c:
    c = c.replace('</style>', hide_css + '\n</style>')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(c)

print('Sidebar hidden and margins fixed.')
