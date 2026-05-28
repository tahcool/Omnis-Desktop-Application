import sys

with open('index.html', 'r', encoding='utf-8') as f:
    c = f.read()

# 1. Remove item-danger from ISR nav link
c = c.replace('<div class="top-nav-dropdown-item item-danger" data-view="view-isr"', '<div class="top-nav-dropdown-item" data-view="view-isr"')

# 2. Fix CSS left: 240px to left: 0
c = c.replace('left: 240px; /* sidebar width */', 'left: 0; /* full width for top nav */')
c = c.replace('background: var(--bg-main, #f8fafc);', 'background: var(--bg-main, #f8fafc);\n      z-index: 999; /* Ensure it is above other views */')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(c)

print("Fixed UI issues!")
