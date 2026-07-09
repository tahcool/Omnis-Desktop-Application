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
    
    # We need to replace the style of all buttons inside this block.
    # Current button style: style="background:#fff; color:#0f172a; border:1.5px solid #e2e8f0; border-radius:10px; padding:0 14px; height:42px; font-size:12px; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; gap:8px; transition:all 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.06); white-space:nowrap; flex:1;"
    # New button style: style="background:#0f172a; color:#ffffff; border:none; border-radius:12px; padding:0 18px; height:46px; font-size:13px; font-weight:800; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; gap:8px; transition:all 0.2s; box-shadow: 0 4px 6px rgba(0,0,0,0.1); white-space:nowrap; flex:1;"
    
    # Current mouseover: onmouseover="this.style.borderColor='#cbd5e1'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.05)'; this.style.transform='translateY(-1px)';"
    # New mouseover: onmouseover="this.style.background='#1e293b'; this.style.boxShadow='0 6px 16px rgba(0,0,0,0.15)'; this.style.transform='translateY(-2px)';"
    
    # Current mouseout: onmouseout="this.style.borderColor='#e2e8f0'; this.style.boxShadow='0 1px 3px rgba(0,0,0,0.06)'; this.style.transform='none';"
    # New mouseout: onmouseout="this.style.background='#0f172a'; this.style.boxShadow='0 4px 6px rgba(0,0,0,0.1)'; this.style.transform='none';"

    # Also need to change the icons color inside the block to #ffffff
    # <i class="fas fa-file-alt" style="color:#475569; font-size:14px;"></i>
    # to <i class="fas fa-file-alt" style="color:#ffffff; font-size:15px;"></i>
    
    # Define replacements
    old_style_regex = r'style="background:#fff;\s*color:#0f172a;\s*border:1\.5px solid #e2e8f0;\s*border-radius:10px;\s*padding:0 14px;\s*height:42px;\s*font-size:12px;\s*font-weight:700;\s*cursor:pointer;\s*display:inline-flex;\s*align-items:center;\s*justify-content:center;\s*gap:8px;\s*transition:all 0\.2s;\s*box-shadow:\s*0 1px 3px rgba\(0,0,0,0\.06\);\s*white-space:nowrap;\s*flex:1;"'
    new_style = 'style="background:#0f172a; color:#ffffff; border:none; border-radius:12px; padding:0 20px; height:48px; font-size:13px; font-weight:800; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; gap:8px; transition:all 0.2s; box-shadow: 0 4px 6px rgba(0,0,0,0.1); white-space:nowrap; flex:1; text-transform:uppercase;"'
    
    old_over_regex = r'onmouseover="this\.style\.borderColor=\'#cbd5e1\';\s*this\.style\.boxShadow=\'0 4px 12px rgba\(0,0,0,0\.05\)\';\s*this\.style\.transform=\'translateY\(-1px\)\';"'
    new_over = 'onmouseover="this.style.background=\'#1e293b\'; this.style.boxShadow=\'0 6px 16px rgba(0,0,0,0.15)\'; this.style.transform=\'translateY(-2px)\';"'
    
    old_out_regex = r'onmouseout="this\.style\.borderColor=\'#e2e8f0\';\s*this\.style\.boxShadow=\'0 1px 3px rgba\(0,0,0,0\.06\)\';\s*this\.style\.transform=\'none\';"'
    new_out = 'onmouseout="this.style.background=\'#0f172a\'; this.style.boxShadow=\'0 4px 6px rgba(0,0,0,0.1)\'; this.style.transform=\'none\';"'
    
    old_icon_regex = r'style="color:#475569;\s*font-size:14px;"'
    new_icon = 'style="color:#94a3b8; font-size:15px;"' # using slate-400 for icons so it doesn't overpower the white text
    
    new_block = re.sub(old_style_regex, new_style, quick_access_block)
    new_block = re.sub(old_over_regex, new_over, new_block)
    new_block = re.sub(old_out_regex, new_out, new_block)
    new_block = re.sub(old_icon_regex, new_icon, new_block)
    
    content = content[:start_idx] + new_block + content[end_idx:]
    
    with open(r'c:\Users\Administrator\omnis\systems\salestrack\index.html', 'w', encoding='utf-8') as f:
        f.write(content)
        
    print("Updated Quick Access Buttons!")
else:
    print("Failed to find Quick Access section.")
