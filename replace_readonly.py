files = ['systems/salestrack/index.html', 'omnis-web-deploy/systems/salestrack/index.html']
for f in files:
    txt = open(f, encoding='utf-8').read()
    txt = txt.replace('id="sp-oem" class="gs-input" placeholder="Auto-filled from Model..." readonly', 'id="sp-oem" class="gs-input" placeholder="Select or type OEM..."')
    open(f, 'w', encoding='utf-8').write(txt)
