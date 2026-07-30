
    document.addEventListener("DOMContentLoaded", () => {
      // 🚀 The New Robust Boot Sequence
      // We wait for the dashboard class to be defined, then initialize it.

      const MAX_BOOT_ATTEMPTS = 50;
      let bootAttempts = 0;

      const bootThread = setInterval(() => {
        bootAttempts++;
        if (window.salestrack && window.salestrack.init) {
          clearInterval(bootThread);
          if (window.omnisLog) window.omnisLog("[Boot] Dashboard Instance detected. Coordinating startup...");
          return; // dashboard_logic.js will handle its own init or we can call it here if needed
        }
        if (window.OmnisDashboardV6) {
          clearInterval(bootThread);
          if (window.omnisLog) window.omnisLog("[Boot] Class definition found. Instantiating Salestrack...");
          window.salestrack = new OmnisDashboardV6();
          window.salestrack.supabase = window.supabase || (window.electron && window.electron.supabase) || window.__supabaseClient;
          window.salestrack.init();
        } else if (bootAttempts >= MAX_BOOT_ATTEMPTS) {
          clearInterval(bootThread);
          console.error("[Boot] Critical Failure: Dashboard logic failed to load within 10s.");
        }
      }, 200);
    });
  