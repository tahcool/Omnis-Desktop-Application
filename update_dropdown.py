import os

files = [
    r'c:\Users\Administrator\omnis\systems\salestrack\index.html',
    r'c:\Users\Administrator\omnis\systems\fleetrack\index.html',
    r'c:\Users\Administrator\omnis\systems\powertrack\dashboard.html',
    r'c:\Users\Administrator\omnis\systems\medicals\index.html',
    r'c:\Users\Administrator\omnis\systems\group_accounts\index.html',
    r'c:\Users\Administrator\omnis\systems\spe\index.html'
]

target = """if (modules.length > 0) {
                  dropdown.innerHTML = modules.map(m => '<a href="../../' + m.url + '" style="display:flex; align-items:center; gap:8px; padding:10px 12px; color:white; text-decoration:none; font-size:13px; border-radius:4px; transition:background 0.2s;" onmouseover="this.style.background=\\'rgba(255,255,255,0.1)\\'" onmouseout="this.style.background=\\'transparent\\'"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#8b2219" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg> ' + m.name + '</a>').join('');"""

replacement = """if (modules.length > 0) {
                  let html = modules.map(m => '<a href="../../' + m.url + '" style="display:flex; align-items:center; gap:8px; padding:10px 12px; color:white; text-decoration:none; font-size:13px; border-radius:4px; transition:background 0.2s;" onmouseover="this.style.background=\\'rgba(255,255,255,0.1)\\'" onmouseout="this.style.background=\\'transparent\\'"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#8b2219" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg> ' + m.name + '</a>').join('');
                  if (localStorage.getItem('omnis_is_admin') === 'true') {
                      html += '<a href="../../admin_dashboard.html" style="display:flex; align-items:center; gap:8px; padding:10px 12px; color:#ef4444; text-decoration:none; font-size:13px; border-radius:4px; border-top:1px solid rgba(255,255,255,0.1); margin-top:4px; transition:background 0.2s;" onmouseover="this.style.background=\\'rgba(255,255,255,0.1)\\'" onmouseout="this.style.background=\\'transparent\\'"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg> Admin Console</a>';
                  }
                  dropdown.innerHTML = html;"""

for f in files:
    if os.path.exists(f):
        with open(f, 'r', encoding='utf-8') as file:
            content = file.read()
        if target in content:
            new_content = content.replace(target, replacement)
            with open(f, 'w', encoding='utf-8') as file:
                file.write(new_content)
            print(f'Updated {f}')
        else:
            print(f'Target not found in {f}')
