
          // Simple sync time updater
          (function () {
            const statusEl = document.getElementById("app-sync-status");
            const timeEl = document.getElementById("app-sync-time");
            const dotEl = document.getElementById("app-sync-dot");

            let lastSync = new Date();

            // Update time display every minute
            setInterval(() => {
              if (!timeEl) return;
              const now = new Date();
              const diffMin = Math.floor((now - lastSync) / 60000);

              if (diffMin < 1) {
                timeEl.textContent = "Synced just now";
              } else if (diffMin < 60) {
                timeEl.textContent = `Synced ${diffMin}m ago`;
              } else {
                timeEl.textContent = `Synced ${Math.floor(diffMin / 60)}h ago`;
              }
            }, 60000);

            // Simulate random "Syncing..." state occasionally for realism? No, keep steady "Online" for now.
            // Expose a function to reset it on actual data fetch
            window.updateSyncStatus = function () {
              lastSync = new Date();
              if (timeEl) timeEl.textContent = "Synced just now";
              if (dotEl) {
                dotEl.style.background = "#22c55e"; // Green
                dotEl.style.boxShadow = "0 0 4px rgba(34,197,94,0.4)";
              }
              if (statusEl) statusEl.textContent = "Online";
            };

            // Global Force Sync Logic
            window.forceSyncAll = async function () {
              omnisLog("Global Sync Requested...");
              window.lastLoaded = {}; // âš¡ Clear navigation cache
              if (window.salestrack) await window.salestrack.fetchData("This Year"); // Sequenced
              if (window.loadReport) await window.loadReport(); // Sequenced

              // Refresh active list view if any
              const activeNav = document.querySelector('.nav-item.active');
              if (activeNav) {
                const vid = activeNav.getAttribute('data-view');
                if (vid) {
                  console.log("Refreshing active view:", vid);
                  if (vid === "view-orders-list" && window.loadOrdersList) window.loadOrdersList(true);
                  if (vid === "view-products-list" && window.loadProductsList) window.loadProductsList(true);
                  if (vid === "view-customers-list" && window.loadCustomersList) window.loadCustomersList(true);
                  if (vid === "view-quotations-list" && window.loadQuotationList) window.loadQuotationList(true);
                  if (vid === "view-ce-list" && window.loadCeList) window.loadCeList(true);
                  if (vid === "view-salestrack-reports" && window.loadGSMReport) window.loadGSMReport(true);
                  if (vid === "view-group-sales-list" && window.loadGroupSalesList) window.loadGroupSalesList(true);
                }
              }

              if (window.updateSyncStatus) window.updateSyncStatus();
            };
          })();
        