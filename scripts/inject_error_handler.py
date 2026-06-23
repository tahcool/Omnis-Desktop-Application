import os

path = 'C:/Users/Administrator/omnis/systems/salestrack/index.html'
with open(path, 'r', encoding='utf-8') as f:
    html = f.read()

script = """
<script>
  const oldError = console.error;
  console.error = function(...args) {
    alert("Console Error: " + (args[0] && args[0].message ? args[0].message : String(args[0])));
    oldError.apply(console, args);
  };
  window.addEventListener("error", e => alert("Global Error: "+e.message));
  window.addEventListener("unhandledrejection", e => alert("Promise Error: "+(e.reason?e.reason.message:e.reason)));
  
  // Let's also patch openCommandCenter to alert when it starts
  setTimeout(() => {
    if (window.OmnisDashboardV6) {
      const oldOpen = window.OmnisDashboardV6.prototype.openCommandCenter;
      window.OmnisDashboardV6.prototype.openCommandCenter = async function(isFullView) {
        try {
          const fullCont = document.getElementById('command-center-full-container');
          if (!fullCont) alert("fullCont is null!");
          else alert("openCommandCenter called! Container found.");
          await oldOpen.call(this, isFullView);
        } catch(e) {
          alert("Error in openCommandCenter: " + e.message);
        }
      };
    }
  }, 1000);
</script>
</body>
"""

if "Console Error: " not in html:
    html = html.replace('</body>', script)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(html)
    print("Injected error handler")
else:
    print("Already injected")
