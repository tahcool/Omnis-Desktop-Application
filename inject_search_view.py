import re
import sys

file_path = r"c:\Users\Administrator\omnis\systems\salestrack\index.html"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

view_html = """
    <!-- OMNIS SEARCH RESULTS VIEW -->
    <div id="view-omnis-search" class="view-content hidden" style="padding: 40px; flex: 1; display: flex; flex-direction: column; overflow-y: auto; background: #f8fafc;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
            <div>
                <h1 style="font-size: 32px; font-weight: 900; color: #0f172a; margin: 0 0 4px 0; letter-spacing: -0.03em;"><i class="fas fa-sparkles" style="color:#3b82f6; margin-right:12px;"></i>Omnis Search Results</h1>
                <p style="color: #64748b; font-size: 14px; margin: 0;" id="omnis-search-subtitle">Showing results for your query...</p>
            </div>
            <button onclick="switchToView('view-dashboard')" style="padding:10px 20px; background:#e2e8f0; color:#475569; font-weight:bold; border-radius:8px; border:none; cursor:pointer;">
                <i class="fas fa-times" style="margin-right:8px;"></i>Close Search
            </button>
        </div>

        <div id="omnis-search-results-container" style="display:flex; flex-direction:column; gap:24px;">
            <!-- Results injected here -->
        </div>
    </div>
"""

# Insert before view-generic
insert_pos = content.find('<div id="view-generic"')
if insert_pos != -1:
    content = content[:insert_pos] + view_html + content[insert_pos:]

# Add view-omnis-search to scrollableViewIds
content = content.replace(
    "const scrollableViewIds = ['view-credit-terms', ",
    "const scrollableViewIds = ['view-omnis-search', 'view-credit-terms', "
)

# Connect the input to window.omnis.executeSearch()
# Find the input we added
input_str = 'placeholder="Ask Omnis to find deals, draft emails, or summarize reports..."'
input_repl = input_str + ' id="omnis-command-input" onkeydown="if(event.key === \'Enter\') { if(window.omnis && window.omnis.executeSearch) window.omnis.executeSearch(this.value); }"'
content = content.replace(input_str, input_repl)

# Add omnis_search.js script tag at the end
script_tag = '<script src="omnis_search.js"></script>'
if script_tag not in content:
    content = content.replace("</body>", "  " + script_tag + "\n</body>")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Injected view-omnis-search and script tag successfully.")
