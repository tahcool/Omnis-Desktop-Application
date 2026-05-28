import re

with open('index.html', 'r', encoding='utf-8') as f:
    c = f.read()

# Add a diagnostic script right before </body>
diag_script = """
<script>
// LAYOUT DIAGNOSTIC - remove after debugging
window.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    const main = document.querySelector('main.main');
    const nav = document.querySelector('.omnis-top-nav');
    const sidebar = document.querySelector('.sidebar');
    const appShell = document.getElementById('app-shell');
    const vd = document.getElementById('view-dashboard');
    
    const cs = (el) => el ? window.getComputedStyle(el) : null;
    
    console.log('=== LAYOUT DIAGNOSTIC ===');
    console.log('body:', cs(document.body).display, 'w:', document.body.offsetWidth, 'h:', document.body.offsetHeight);
    console.log('appShell:', cs(appShell)?.display, 'w:', appShell?.offsetWidth, 'h:', appShell?.offsetHeight);
    console.log('nav:', cs(nav)?.position, cs(nav)?.display, 'h:', nav?.offsetHeight, 'top:', nav?.offsetTop);
    console.log('sidebar:', cs(sidebar)?.display, cs(sidebar)?.position, 'w:', sidebar?.offsetWidth, 'h:', sidebar?.offsetHeight);
    console.log('main:', cs(main)?.display, 'padTop:', cs(main)?.paddingTop, 'marginTop:', cs(main)?.marginTop, 'w:', main?.offsetWidth, 'h:', main?.offsetHeight, 'scrollH:', main?.scrollHeight);
    console.log('main.offsetTop:', main?.offsetTop);
    console.log('view-dashboard:', cs(vd)?.display, 'h:', vd?.offsetHeight, 'top:', vd?.offsetTop);
    
    // Find what's taking up space above the KPI cards
    const kpi = document.getElementById('kpi-card-urgent');
    if (kpi) {
      const rect = kpi.getBoundingClientRect();
      console.log('KPI card position:', 'top:', rect.top, 'left:', rect.left, 'width:', rect.width);
    }
    
    // Check all direct children of main and their heights
    if (main) {
      console.log('main children:');
      Array.from(main.children).forEach((child, i) => {
        const s = cs(child);
        console.log('  child ' + i + ':', child.tagName, child.id || child.className.substring(0,30), 'display:', s.display, 'h:', child.offsetHeight, 'vis:', s.visibility);
      });
    }
    
    console.log('=== END DIAGNOSTIC ===');
  }, 2000);
});
</script>
"""

# Insert before </body>
c = c.replace('</body>', diag_script + '</body>')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(c)

print("Diagnostic script injected")
