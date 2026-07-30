
    // Sidebar Toggle Functionality
    function toggleSidebar() {
      const appShell = document.getElementById('app-shell');
      const toggleBtn = document.getElementById('sidebar-toggle-btn');

      if (appShell) {
        const isCollapsed = appShell.classList.toggle('collapsed');

        if (toggleBtn) {
          if (isCollapsed) {
            toggleBtn.classList.remove('open');
            toggleBtn.title = 'Show Sidebar';
          } else {
            toggleBtn.classList.add('open');
            toggleBtn.title = 'Hide Sidebar';
          }
        }

        // Save preference
        localStorage.setItem('sidebarCollapsed', isCollapsed ? 'true' : 'false');
      }
    }

    // Restore sidebar state on load
    document.addEventListener('DOMContentLoaded', () => {
      const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
      const appShell = document.getElementById('app-shell');
      const toggleBtn = document.getElementById('sidebar-toggle-btn');

      if (isCollapsed && appShell) {
        appShell.classList.add('collapsed');
        if (toggleBtn) toggleBtn.classList.remove('open');
      }
    });
  