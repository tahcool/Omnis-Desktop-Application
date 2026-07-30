
    // Auto-load data on startup — view-aware version
    // Only loads data for the CURRENTLY ACTIVE view to avoid race conditions
    document.addEventListener("DOMContentLoaded", () => {
      setTimeout(() => {
        try {
          const activeNav = document.querySelector('.nav-item.active');
          const activeViewId = activeNav ? activeNav.getAttribute('data-view') : 'view-dashboard';
          console.log("Auto-loading data for active view:", activeViewId);

          if (activeViewId === 'view-orders-list') {
            if (window.loadOrdersList) window.loadOrdersList(true);
          } else if (activeViewId === 'view-salestrack-reports') {
            const btn = document.getElementById('mxg-refresh-btn');
            if (btn) btn.click();
          } else {
            // Default: load dashboard data
            if (window.salestrack && window.salestrack.fetchData) {
              window.salestrack.fetchData();
            }
          }
        } catch (e) {
          console.warn("Auto-load startup error:", e);
        }
      }, 600);
    });
  