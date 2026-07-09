import sys
import re

with open(r'c:\Users\Administrator\omnis\systems\salestrack\orders_logic.js', 'r', encoding='utf-8') as f:
    js_content = f.read()

# 1. Fix Modal Z-Index and Compact Padding in the Top UI
old_modal_start = """    <div style="padding:20px; background:#f8fafc; position:relative; display:flex; flex-direction:column; gap:20px; height: 100%;">"""
new_modal_start = """    <div style="padding:10px; background:#f8fafc; position:relative; display:flex; flex-direction:column; gap:10px; height: 100%;">"""
js_content = js_content.replace(old_modal_start, new_modal_start)

old_header_padding = """<div style="background:white; border-radius:12px; border:1px solid #e2e8f0; padding:20px; box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">"""
new_header_padding = """<div style="background:white; border-radius:8px; border:1px solid #e2e8f0; padding:12px; box-shadow:0 2px 4px -1px rgba(0,0,0,0.05);">"""
js_content = js_content.replace(old_header_padding, new_header_padding)

# Add z-index fix right after openListModal
old_open_call = """    window.salestrack.openListModal("Defects Report", html, "1200px");"""
new_open_call = """    window.salestrack.openListModal("Defects Report", html, "1200px");
    
    // Fix z-index so it shows over the navbar
    const backdrop = document.getElementById('ol-list-modal-backdrop');
    if (backdrop) backdrop.style.zIndex = '999999';"""
js_content = js_content.replace(old_open_call, new_open_call)


# 2. Compact the Table and make Edit button a pencil next to the date
old_table_header = """        <thead style="background:#f1f5f9; color:#475569; font-weight:700; text-transform:uppercase; font-size:11px; letter-spacing:0.05em; position:sticky; top:0; z-index:10; box-shadow:0 1px 2px rgba(0,0,0,0.05);">
            <tr>
                <th style="padding:16px; border-bottom:1px solid #e2e8f0; width:30%;">Machine</th>
                <th style="padding:16px; border-bottom:1px solid #e2e8f0; width:55%;">Defect Description</th>
                <th style="padding:16px; border-bottom:1px solid #e2e8f0; width:15%;">Date / Actions</th>
            </tr>
        </thead>"""
new_table_header = """        <thead style="background:#f1f5f9; color:#475569; font-weight:700; text-transform:uppercase; font-size:10px; letter-spacing:0.05em; position:sticky; top:0; z-index:10; box-shadow:0 1px 2px rgba(0,0,0,0.05);">
            <tr>
                <th style="padding:8px 12px; border-bottom:1px solid #e2e8f0; width:25%;">Machine</th>
                <th style="padding:8px 12px; border-bottom:1px solid #e2e8f0; width:60%;">Defect Description</th>
                <th style="padding:8px 12px; border-bottom:1px solid #e2e8f0; width:15%;">Date / Actions</th>
            </tr>
        </thead>"""
js_content = js_content.replace(old_table_header, new_table_header)

old_customer_row = """                <td colspan="3" style="padding:14px 16px; font-weight:800; font-size:14px; color:#0f172a; text-transform:uppercase;">"""
new_customer_row = """                <td colspan="3" style="padding:8px 12px; font-weight:800; font-size:13px; color:#0f172a; text-transform:uppercase;">"""
js_content = js_content.replace(old_customer_row, new_customer_row)


# I need to use regex to replace the defect row because it contains variables
old_defect_row_pattern = re.compile(
    r"""<td style="padding:14px 16px; font-weight:600; color:#334155; vertical-align:top; border-right:1px solid #f1f5f9;">\$\{escapeHtml\(machine\)\}</td>\s*"""
    r"""<td style="padding:14px 16px; color:#991b1b; vertical-align:top;">\$\{desc\}</td>\s*"""
    r"""<td style="padding:14px 16px; vertical-align:top;">\s*"""
    r"""<div style="display:flex; flex-direction:column; gap:8px; align-items:flex-start;">\s*"""
    r"""<span style="font-size:11px; color:#991b1b; font-weight:700; white-space:nowrap; background:#fee2e2; padding:4px 8px; border-radius:4px;"><i class="far fa-calendar-alt" style="margin-right:4px;"></i> \$\{date\}</span>\s*"""
    r"""<button onclick="window\.salestrack\.openDefectsModal\('([^']+)', '([^']+)', '([^']+)'\)" style="[^"]+"><i class="fas fa-edit"></i> Edit</button>\s*"""
    r"""</div>\s*"""
    r"""</td>""", re.DOTALL)

new_defect_row = """<td style="padding:8px 12px; font-weight:600; color:#334155; vertical-align:middle; border-right:1px solid #f1f5f9;">${escapeHtml(machine)}</td>
                <td style="padding:8px 12px; color:#991b1b; vertical-align:middle; font-size:12px;">${desc}</td>
                <td style="padding:8px 12px; vertical-align:middle;">
                    <div style="display:flex; flex-direction:row; gap:8px; align-items:center; justify-content:flex-start;">
                        <span style="font-size:11px; color:#991b1b; font-weight:700; white-space:nowrap; background:#fee2e2; padding:4px 8px; border-radius:4px;"><i class="far fa-calendar-alt" style="margin-right:4px;"></i> ${date}</span>
                        <button onclick="window.salestrack.openDefectsModal('\\1', '\\2', '\\3')" style="background:transparent; border:none; padding:4px; font-size:14px; color:#64748b; cursor:pointer; transition:color 0.2s;" onmouseover="this.style.color='#0f172a'" onmouseout="this.style.color='#64748b'" title="Edit Defect"><i class="fas fa-pencil-alt"></i></button>
                    </div>
                </td>"""

js_content = old_defect_row_pattern.sub(new_defect_row, js_content)

with open(r'c:\Users\Administrator\omnis\systems\salestrack\orders_logic.js', 'w', encoding='utf-8') as f:
    f.write(js_content)

print("Applied compact UI and pencil button.")
