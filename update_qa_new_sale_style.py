import re

with open(r'c:\Users\Administrator\omnis\systems\salestrack\index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the Quick Access Bar section
start_marker = "<!-- QUICK ACCESS BAR (full width) -->"
end_marker = "<!-- Tenders are now accessed via the top Quick Access Bar -->"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx != -1 and end_idx != -1:
    quick_access_block = content[start_idx:end_idx]
    
    # We are replacing the styles from the FIRST script (which had uppercase, 48px height, slate-900, slate-400 icons)
    # with the exact "New Sale" button style but slightly larger.
    
    old_style_regex = r'style="background:#0f172a; color:#ffffff; border:none; border-radius:12px; padding:0 20px; height:48px; font-size:13px; font-weight:800; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; gap:8px; transition:all 0\.2s; box-shadow: 0 4px 6px rgba\(0,0,0,0\.1\); white-space:nowrap; flex:1; text-transform:uppercase;"'
    new_style = 'style="background:#0f172a; color:white; border:none; border-radius:10px; padding:0 24px; height:46px; font-size:13px; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; gap:10px; transition:all 0.2s; box-shadow:0 4px 12px rgba(15, 23, 42, 0.15); white-space:nowrap; flex:1;"'
    
    old_over_regex = r'onmouseover="this\.style\.background=\'#1e293b\';\s*this\.style\.boxShadow=\'0 6px 16px rgba\(0,0,0,0\.15\)\';\s*this\.style\.transform=\'translateY\(-2px\)\';"'
    new_over = 'onmouseover="this.style.background=\'#1e293b\'; this.style.boxShadow=\'0 6px 16px rgba(15,23,42,0.25)\'; this.style.transform=\'translateY(-2px)\';"'
    
    old_out_regex = r'onmouseout="this\.style\.background=\'#0f172a\';\s*this\.style\.boxShadow=\'0 4px 6px rgba\(0,0,0,0\.1\)\';\s*this\.style\.transform=\'none\';"'
    new_out = 'onmouseout="this.style.background=\'#0f172a\'; this.style.boxShadow=\'0 4px 12px rgba(15, 23, 42, 0.15)\'; this.style.transform=\'none\';"'
    
    old_icon_regex = r'style="color:#94a3b8;\s*font-size:15px;"'
    new_icon = 'style="color:white; font-size:14px;"' # Pure white to match the "+" in New Sale
    
    new_block = re.sub(old_style_regex, new_style, quick_access_block)
    new_block = re.sub(old_over_regex, new_over, new_block)
    new_block = re.sub(old_out_regex, new_out, new_block)
    new_block = re.sub(old_icon_regex, new_icon, new_block)
    
    content = content[:start_idx] + new_block + content[end_idx:]
    
    with open(r'c:\Users\Administrator\omnis\systems\salestrack\index.html', 'w', encoding='utf-8') as f:
        f.write(content)
        
    print("Updated Quick Access Buttons to exactly match New Sale style.")
else:
    print("Failed to find Quick Access section.")
