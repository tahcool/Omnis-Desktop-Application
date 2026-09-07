import os

file_path = r'c:\Users\Administrator\omnis\systems\medicals\index.html'

with open(file_path, 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Increase logo height
search_logo = '<img src="../../assets/images/IEG_logo.png" style="height: 65px; object-fit: contain; filter: brightness(0);" alt="IEG Logo">'
replace_logo = '<img src="../../assets/images/IEG_logo.png" style="height: 110px; object-fit: contain; filter: brightness(0);" alt="IEG Logo">'
html = html.replace(search_logo, replace_logo)

# 2. Fix table header for SHE Stats
search_th = '<th>SUMMARY</th><th>SRD</th><th>CSD</th><th>ENG</th><th>SPW</th><th>SPE</th><th>TMG</th><th>GROUP TOTAL</th>'
replace_th = '<th>SUMMARY</th><th>CSD</th><th>ENG</th><th>SRD</th><th>SPZ</th><th>SPE</th><th>TMG</th><th>SPW</th><th>GROUP TOTAL</th>'
html = html.replace(search_th, replace_th)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(html)
print('HTML update complete')
