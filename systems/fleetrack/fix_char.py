import sys, re
with open('index.html', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace(" + '  No Service Date'", " + ' - No Service Date'")

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(c)

print("Fixed strange character in ISR kpi")
