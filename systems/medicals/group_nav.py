# -*- coding: utf-8 -*-
import os
import re

file_path = r'c:\Users\Administrator\omnis\systems\medicals\index.html'

with open(file_path, 'r', encoding='utf-8') as f:
    html = f.read()

pattern = r'<div class="nav-item top-nav-item" data-target="view-sick-notes">.*?</nav>'

# We only want to replace those three divs.
old_block = '''          <div class="nav-item top-nav-item" data-target="view-sick-notes">
            <span class="icon"><i class="fas fa-file-medical"></i></span> <span>Sick Notes</span>
          </div>
          <div class="nav-item top-nav-item" data-target="view-consultations">
            <span class="icon"><i class="fas fa-stethoscope"></i></span> <span>Consultations</span>
          </div>
          <div class="nav-item top-nav-item" data-target="view-appointments">
            <span class="icon"><i class="fas fa-calendar-alt"></i></span> <span>Appointments</span>
          </div>'''

new_block = '''          <div class="top-nav-item module-switcher-dropdown" style="position: relative; cursor: pointer; padding: 6px 12px;" onmouseenter="clearTimeout(this.hideTimeout); this.querySelector('.dropdown-content').style.display='block'" onmouseleave="this.hideTimeout = setTimeout(() => { this.querySelector('.dropdown-content').style.display='none' }, 250)">
              <span class="icon"><i class="fas fa-file-medical-alt"></i></span>
              <span>Clinical Records</span>
              <div class="dropdown-content" style="display:none; position:absolute; top:100%; left:0; margin-top:10px; background:#ffffff; border:1px solid #e2e8f0; border-radius:6px; box-shadow:0 10px 25px rgba(0,0,0,0.1); min-width:180px; z-index:9999; padding:8px;">
                  <div class="nav-item" data-target="view-sick-notes" style="display:flex; align-items:center; gap:8px; padding:10px 12px; color:#0f172a; text-decoration:none; font-size:13px; border-radius:4px; transition:background 0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
                      <i class="fas fa-file-medical" style="color:#e11c2a; width:16px; text-align:center;"></i> Sick Notes
                  </div>
                  <div class="nav-item" data-target="view-consultations" style="display:flex; align-items:center; gap:8px; padding:10px 12px; color:#0f172a; text-decoration:none; font-size:13px; border-radius:4px; transition:background 0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
                      <i class="fas fa-stethoscope" style="color:#e11c2a; width:16px; text-align:center;"></i> Consultations
                  </div>
                  <div class="nav-item" data-target="view-appointments" style="display:flex; align-items:center; gap:8px; padding:10px 12px; color:#0f172a; text-decoration:none; font-size:13px; border-radius:4px; transition:background 0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
                      <i class="fas fa-calendar-alt" style="color:#e11c2a; width:16px; text-align:center;"></i> Appointments
                  </div>
              </div>
          </div>'''

# Sometimes there's varying whitespace or carriage returns, let's use regex to be safe
regex_pattern = re.compile(
    r'<div class="nav-item top-nav-item" data-target="view-sick-notes">.*?'
    r'<span class="icon"><i class="fas fa-file-medical"></i></span> <span>Sick Notes</span>\s*</div>\s*'
    r'<div class="nav-item top-nav-item" data-target="view-consultations">.*?'
    r'<span class="icon"><i class="fas fa-stethoscope"></i></span> <span>Consultations</span>\s*</div>\s*'
    r'<div class="nav-item top-nav-item" data-target="view-appointments">.*?'
    r'<span class="icon"><i class="fas fa-calendar-alt"></i></span> <span>Appointments</span>\s*</div>', 
    re.DOTALL
)

if regex_pattern.search(html):
    new_html = regex_pattern.sub(new_block, html)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_html)
    print("Successfully replaced nav items with Clinical Records dropdown")
else:
    print("Could not find the target string")

