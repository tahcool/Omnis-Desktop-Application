import os

path = 'C:/Users/Administrator/omnis/systems/salestrack/index.html'
with open(path, 'r', encoding='utf-8') as f:
    html = f.read()

old_block = """    <div class="top-nav-group" style="gap:8px;">
      <div class="top-nav-item nav-item" data-view="view-settings"
        style="padding:8px 14px; border-radius:8px; background:rgba(255,255,255,0.05); display:flex; align-items:center; gap:6px; transition: background 0.2s; cursor:pointer;"
        onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='rgba(255,255,255,0.05)'">
        <span class="icon" style="margin:0; font-size:12px; width:auto; color:rgba(255,255,255,0.7);"><i class="fas fa-cog"></i></span>
        <span style="font-size:12px; font-weight:700; color:rgba(255,255,255,0.9);">Settings</span>
      </div>
      <div class="top-nav-item" onclick="logout()"
        style="padding:8px 14px; border-radius:8px; background:rgba(248,113,113,0.1); display:flex; align-items:center; gap:6px; transition: background 0.2s; cursor:pointer;"
        onmouseover="this.style.background='rgba(248,113,113,0.2)'" onmouseout="this.style.background='rgba(248,113,113,0.1)'">
        <span class="icon" style="margin:0; font-size:12px; width:auto; color:#f87171;"><i class="fas fa-sign-out-alt"></i></span>
        <span style="font-size:12px; font-weight:700; color:#f87171;">Logout</span>
      </div>
    </div>"""

new_block = """    <div class="top-nav-group" style="gap:8px;">
      <div class="top-nav-action-btn" onclick="switchToView('view-settings', 'System Settings')"
        style="padding:8px 14px; border-radius:8px; background:rgba(255,255,255,0.05); display:flex; align-items:center; gap:6px; transition: background 0.2s; cursor:pointer;"
        onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='rgba(255,255,255,0.05)'">
        <span class="icon" style="margin:0; font-size:12px; width:auto; color:rgba(255,255,255,0.7);"><i class="fas fa-cog"></i></span>
        <span style="font-size:12px; font-weight:700; color:rgba(255,255,255,0.9);">Settings</span>
      </div>
      <div class="top-nav-action-btn" onclick="logout()"
        style="padding:8px 14px; border-radius:8px; background:rgba(248,113,113,0.1); display:flex; align-items:center; gap:6px; transition: background 0.2s; cursor:pointer;"
        onmouseover="this.style.background='rgba(248,113,113,0.2)'" onmouseout="this.style.background='rgba(248,113,113,0.1)'">
        <span class="icon" style="margin:0; font-size:12px; width:auto; color:#f87171;"><i class="fas fa-sign-out-alt"></i></span>
        <span style="font-size:12px; font-weight:700; color:#f87171;">Logout</span>
      </div>
    </div>"""

if old_block in html:
    html = html.replace(old_block, new_block)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(html)
    print("Fixed the active class issue on Settings and Logout buttons!")
else:
    print("Could not find the target block to replace.")
