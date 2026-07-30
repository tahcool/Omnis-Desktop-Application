
    /* Debug Logger Helper */
    function omnisLog(msg, type = "info") {
      console.log(`[Omnis ${type.toUpperCase()}] ${msg}`);
      const logContainer = document.getElementById("omnis-debug-logs");
      if (logContainer) {
        const div = document.createElement("div");
        div.style.borderBottom = "1px solid #eee";
        div.style.padding = "2px 0";
        div.style.color = type === "error" ? "#ef4444" : (type === "warn" ? "#f59e0b" : "#6b7280");
        div.innerHTML = `<strong>[${new Date().toLocaleTimeString()}]</strong> ${msg}`;
        logContainer.prepend(div);
      }
    }
    window.omnisLog = omnisLog;

    window.onerror = function (msg, url, line, col, error) {
      omnisLog(`FATAL: ${msg} (Line ${line}:${col})`, "error");
      const errBox = document.getElementById("omnis-fatal-error");
      if (errBox) {
        errBox.classList.remove("hidden");
        errBox.innerHTML = `<strong>Script Error:</strong> ${msg} (Line ${line})`;
      }
      return false;
    };

    const OMNIS_SYSTEMS = [
      { key: "salestrack", name: "Salestrack", baseUrl: "https://salestrack.powerstar.co.zw" },
      // { key: "salestrack", name: "Salestrack", baseUrl: "http://localhost:8000" },
      { key: "fleetrack", name: "Fleetrack", baseUrl: "https://fleetrack.machinery-exchange.com" },
      { key: "engtrack", name: "Engtrack", baseUrl: "https://engtrack.machinery-exchange.com" },
      { key: "powertrack", name: "Powertrack", baseUrl: "https://powertrack.powerstar.co.zw" },
      { key: "omnis_parts", name: "Omnis Parts", baseUrl: "https://omnis.spareparts-exchange.com" },
    ];

    const SUMMARY_METHOD_PATH =
      "powerstar_salestrack.omnis_dashboard.get_omnis_home";
    const AI_INSIGHTS_PATH =
      "powerstar_salestrack.omnis_dashboard.get_omnis_ai_dashboard_insights";
    const SAVE_QUOTATION_METHOD_PATH =
      "powerstar_salestrack.omnis_dashboard.save_omnis_quotation";
    const QUOTATIONS_METHOD_PATH =
      "powerstar_salestrack.omnis_dashboard.get_omnis_quotations";
    const ORDERS_METHOD_PATH =
      "powerstar_salestrack.omnis_dashboard.get_omnis_orders";

    // Pagination State for Orders
    window.currentOrdersStart = 0;

    const PRODUCTS_METHOD_PATH =
      "/api/method/powerstar_salestrack.omnis_dashboard.get_omnis_products";
    // Pagination State for Products
    window.currentProductsStart = 0;

    const CUSTOMERS_METHOD_PATH =
      "/api/method/powerstar_salestrack.omnis_dashboard.get_omnis_customers";
    // Pagination State for Customers
    window.currentCustomersStart = 0;

    const GSM_REPORT_PATH =
      "powerstar_salestrack.omnis_dashboard.get_weekly_gsm_report";

    const GSM_DRILLDOWN_PATH =
      "powerstar_salestrack.omnis_dashboard.get_weekly_gsm_drilldown";

    const LS_REMEMBER = "omnisRemember";
    const LS_USER = "omnisUser";
    const LS_PWD = "omnisPwd";
    const LS_SIDEBAR = "omnisSidebarCollapsed";

    // Global System State (Window scoped for external scripts)
    window.CURRENT_SYSTEM = null;

    // Getter for shorthand usage in this script
    Object.defineProperty(window, "CURRENT_SYSTEM", {
      get: () => window._CURRENT_SYSTEM,
      set: (val) => { window._CURRENT_SYSTEM = val; }
    });
    window._CURRENT_SYSTEM = null;

    const appShell = document.getElementById("app-shell");
    const splashOverlay = document.getElementById("splash-overlay");
    const splashText = document.getElementById("splash-text");
    const splashBar = document.getElementById("splash-bar-inner");
    const sidebarToggle = document.getElementById("sidebar-toggle");
    const avatarInitials = document.getElementById("avatar-initials");
    const mainTitle = document.getElementById("main-title");
    const btnCreateQuotation = document.getElementById("btn-create-quotation");
    const itemsAdd = document.getElementById("items-add");
    const itemsBody = document.getElementById("items-body");

    // Pagination Offsets
    let qOffset = 0;
    let ceOffset = 0;
    let orderOffset = 0;
    let productsOffset = 0;
    let customersOffset = 0;


    const kpiActiveCustomers = document.getElementById("kpi-active-customers");
    const kpiQuotations = document.getElementById("kpi-quotations");
    const kpiProducts = document.getElementById("kpi-products");
    const kpiGroupSales = document.getElementById("kpi-group-sales");
    const kpiOrdersOpen = document.getElementById("kpi-orders-open");
    const kpiOrdersOverdue = document.getElementById("kpi-orders-overdue");
    const kpiOrdersAvg = document.getElementById("kpi-orders-avg-machines");
    const cardOrdersOpen = document.getElementById("card-orders-open");
    const cardOrdersOverdue = document.getElementById("card-orders-overdue");
    const cardOrdersAvg = document.getElementById("card-orders-avg");
    const ordersLeadtimeSummary = document.getElementById("orders-leadtime-summary");
    const recentQuotesBody = document.getElementById("recent-quotes-body");
    const ordersPreviewDiv = document.getElementById("orders-preview");
    const chartError = document.getElementById("chart-error");

    const viewDashboard = document.getElementById("view-dashboard");
    const viewQuotationsList = document.getElementById("view-quotations-list");
    const viewCreateQuotation = document.getElementById("view-create-quotation");
    const viewGeneric = document.getElementById("view-generic");
    const viewSalestrackReports = document.getElementById("view-salestrack-reports");
    const viewCeList = document.getElementById("view-ce-list");
    const viewCreateCe = document.getElementById("view-create-ce");
    const viewOrdersList = document.getElementById("view-orders-list");
    const viewProductsList = document.getElementById("view-products-list");
    const viewCustomersList = document.getElementById("view-customers-list");
    const viewGroupSalesList = document.getElementById("view-group-sales-list");
    const viewChat = document.getElementById("view-chat");
    const viewStock = document.getElementById("view-stock");
    const ceListFrame = document.getElementById("ce-list-frame");

    const aiInsightsCard = document.getElementById("ai-insights-card");

    const mainSubtitle = document.getElementById("main-subtitle");
    const viewSettings = document.getElementById("view-settings");
    const viewLicensing = document.getElementById("view-licensing");
    const viewDebug = document.getElementById("view-debug");

    const genericTitle = document.getElementById("generic-title");
    const genericSub = document.getElementById("generic-sub");

    /* Create Quotation Logic moved to create_quotation_logic.js */
    const cqMessage = document.getElementById("cq-message");

    const qSearchInput = document.getElementById("qlist-search");
    const qStatusSelect = document.getElementById("qlist-status");
    const qPageLenSelect = document.getElementById("qlist-page-length");
    const qListBody = document.getElementById("qlist-body");
    const qListInfo = document.getElementById("qlist-info");
    const qPrevBtn = document.getElementById("qlist-prev");
    const qNextBtn = document.getElementById("qlist-next");

    const notifBell = document.getElementById("notif-bell");
    const notifDropdown = document.getElementById("notif-dropdown");
    const avatarMenu = document.getElementById("avatar-menu");
    const avatarDropdown = document.getElementById("avatar-dropdown");
    const menuSettings = document.getElementById("menu-settings");
    const menuAbout = document.getElementById("menu-about");
    const menuLogout = document.getElementById("menu-logout");
    const syncIndicator = document.getElementById("sync-indicator");
    const searchFab = document.getElementById("search-fab");
    const statusEl = document.getElementById("login-status");

    const navSalestrackReports = document.getElementById("nav-salestrack-reports");
    const gsmCompany = document.getElementById("gsm-company");
    const gsmFrom = document.getElementById("gsm-from");
    const gsmTo = document.getElementById("gsm-to");
    const gsmRefresh = document.getElementById("gsm-refresh");
    const gsmMeta = document.getElementById("gsm-meta");
    const gsmBody = document.getElementById("gsm-body");
    const gsmYtd = document.getElementById("gsm-ytd");
    const gsmYtdSub = document.getElementById("gsm-ytd-sub");
    const gsmMtd = document.getElementById("gsm-mtd");
    const gsmMtdSub = document.getElementById("gsm-mtd-sub");
    const gsmVar = document.getElementById("gsm-var");
    const gsmWeekly = document.getElementById("gsm-weekly");
    const gsmWeeksRem = document.getElementById("gsm-weeks-rem");

    const gsmModal = document.getElementById("gsm-modal");
    const gsmModalTitle = document.getElementById("gsm-modal-title");
    const gsmModalSub = document.getElementById("gsm-modal-sub");
    const gsmModalBody = document.getElementById("gsm-modal-body");
    const gsmModalClose = document.getElementById("gsm-modal-close");
    const gsmModalOpen = document.getElementById("gsm-modal-open");
    let lastDrilldownUrl = "";

    // ✅ Order modal elements
    const orderModal = document.getElementById("order-update-modal");
    const orderModalTitle = document.getElementById("order-modal-title");
    const orderModalSub = document.getElementById("order-modal-sub");
    const orderModalClose = document.getElementById("order-modal-close");
    const orderChannel = document.getElementById("order-channel");
    const orderStatus = document.getElementById("order-status");
    const orderEta = document.getElementById("order-eta");
    const orderNotes = document.getElementById("order-notes");
    const orderMessage = document.getElementById("order-message");
    const orderContact = document.getElementById("order-contact");
    const orderCopy = document.getElementById("order-copy");
    const orderSend = document.getElementById("order-send");
    const orderSendStatus = document.getElementById("order-send-status");
    let currentOrderCtx = null;

    // Chat
    const chatWidget = document.getElementById("chat-widget");
    const chatMessages = document.getElementById("chat-messages");
    const chatInput = document.getElementById("chat-input");
    const chatSend = document.getElementById("chat-send");
    const chatStatus = document.getElementById("chat-status");
    const chatClose = document.getElementById("chat-close");

    const OMNIS_AI_METHOD_PATH =
      "powerstar_salestrack.omnis_dashboard.omnis_ai_chat";

    let chatConversationId = Date.now().toString();
    let chatIsSending = false;

    let qPageLength = 20;
    let qHasMore = false;
    let qSearchText = "";
    let qStatusValue = "";

    function setStatus(text, cls) {
      if (!statusEl) return;
      statusEl.textContent = text || "";
      statusEl.className = "login-status" + (cls ? " " + cls : "");
    }

    function escapeHtml(str) {
      return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }

    function formatDate(d) {
      if (!d) return "";
      try {
        const date = d.length === 10 ? new Date(d + "T00:00:00") : new Date(d);
        if (isNaN(date.getTime())) return d;
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, "0");
        const dd = String(date.getDate()).padStart(2, "0");
        return `${dd}-${mm}-${yyyy}`;
      } catch { return d; }
    }

    function formatNumber(val) {
      if (val == null || val === "") return "-";
      const num = Number(val);
      if (isNaN(num)) return String(val);
      return num.toLocaleString();
    }

    function setTrend(el, pct) {
      if (!el) return;
      el.classList.remove("trend-positive", "trend-negative");
      if (pct === null || pct === undefined || isNaN(pct)) {
        el.textContent = "No baseline for last month";
        return;
      }
      const val = Number(pct);
      const absPct = Math.abs(val).toFixed(1);
      if (val > 0) { el.textContent = `↑ ${absPct}% since last month`; el.classList.add("trend-positive"); }
      else if (val < 0) { el.textContent = `↓ ${absPct}% since last month`; el.classList.add("trend-negative"); }
      else { el.textContent = "0% since last month"; }
    }

    function setOrdersCardState(card, state) {
      if (!card) return;
      card.classList.remove("positive", "negative", "neutral");
      card.classList.add(state);
    }

    window.closeAllOmnisModals = function() {
        // 1. GSM & Sales Forms
        if (typeof closeGsmModal === 'function') closeGsmModal();
        if (typeof closeOrderModal === 'function') closeOrderModal();
        if (typeof closeInsightModal === 'function') closeInsightModal();
        if (typeof closeRiskModal === 'function') closeRiskModal();
        if (typeof window.closeGroupSalesForm === 'function') window.closeGroupSalesForm();
        if (typeof window.closeStockPipelineForm === 'function') window.closeStockPipelineForm();
        
        // 2. Task Manager Modals
        const taskView = document.getElementById('taskViewModal');
        if (taskView) taskView.classList.remove('active');
        const perfModal = document.getElementById('individualPerfModal');
        if (perfModal) perfModal.classList.remove('active');
        
        // 3. Others (WhatsApp, etc.)
        const wp = document.getElementById("whatsapp-preview-overlay");
        if (wp) wp.classList.add("hidden");
        const qtnOpts = document.getElementById("qtn-opts-overlay");
        if (qtnOpts) qtnOpts.classList.add("hidden");
        const construction = document.getElementById("construction-modal");
        if (construction) construction.classList.add("hidden");
        const handover = document.getElementById("handover-modal");
        if (handover) handover.classList.add("hidden");
    };

    function showOnly(view) {
      if (!view) return;
      console.log("showOnly called for:", view.id);

      // Close any open modals before switching views to prevent "frozen" overlays
      window.closeAllOmnisModals();

      try {
        // 1. Clear any specific KPI containers
        const kpiContainer = document.getElementById("kpi-container");
        if (kpiContainer) kpiContainer.innerHTML = "";
      } catch (e) { console.error("Error clearing KPI:", e); }

      try {
        // 2. Hide ALL potential view containers in the main area
        const allViews = document.querySelectorAll('.view-page, .view-content');
        allViews.forEach(v => {
          v.classList.add("hidden");
          v.style.setProperty("display", "none", "important");
        });
      } catch (e) { console.error("Error hiding views:", e); }

      try {
        // 3. Show the target view - ALWAYS do this even if previous steps failed

        // ===== REPARENT FIX: Escape broken nesting =====
        // Some views (view-group-sales-list, etc.) are accidentally nested inside
        // view-marketing or other hidden views. Move them to document.body so
        // they are never hidden by an ancestor's display:none.
        const VIEWS_TO_ESCAPE = [
          'view-group-sales-list', 'view-customers-list', 'view-products-list',
          'view-create-ce', 'view-ce-list'
        ];
        if (VIEWS_TO_ESCAPE.includes(view.id) && !view.dataset.reparented) {
          let ancestor = view.parentElement;
          let needsReparent = false;
          while (ancestor) {
            if (ancestor.id === 'view-marketing' || ancestor.classList.contains('view-page')) {
              needsReparent = true;
              console.warn(`[Reparent] ${view.id} was nested inside #${ancestor.id} — moving to document.body`);
              break;
            }
            ancestor = ancestor.parentElement;
          }
          if (needsReparent) {
            document.body.appendChild(view);
            view.dataset.reparented = 'true';
          }
        }
        // ===== END REPARENT FIX =====

        view.classList.remove("hidden");
        view.style.removeProperty("display"); // Clear any inline display:none first
        // Force block layout for reliable full-viewport rendering
        view.style.setProperty("display", (view.id === "view-dashboard" || view.id === "view-salestrack-reports" || view.id === "view-certificates") ? "flex" : "block", "important");
        console.log(`[ShowOnly] ${view.id} → display set to:`, window.getComputedStyle(view).display, '| inline style:', view.style.display);

        if (view.id === 'view-settings') {
          // Settings is inside main-view-container (already below navbar) - use inset:0
          view.style.setProperty("position", "absolute", "important");
          view.style.setProperty("inset", "0", "important");
          view.style.setProperty("width", "100%", "important");
          view.style.setProperty("height", "100%", "important");
          view.style.setProperty("overflow-y", "auto", "important");
          view.style.setProperty("z-index", "10", "important");
        } else if (view.id === 'view-training-library') {
          // OUTSIDE main-view-container — use fixed positioning with high z-index
          var _navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-height')) || 42;
          var _taskbarH = Math.max(0, window.screen.height - window.screen.availHeight);
          view.style.setProperty("position", "fixed", "important");
          view.style.setProperty("top", _navH + "px", "important");
          view.style.setProperty("left", "0", "important");
          view.style.setProperty("right", "0", "important");
          view.style.setProperty("bottom", _taskbarH + "px", "important");
          view.style.setProperty("width", "100%", "important");
          view.style.setProperty("height", "calc(100vh - " + _navH + "px - " + _taskbarH + "px)", "important");
          view.style.setProperty("overflow-y", "auto", "important");
          view.style.setProperty("overflow-x", "hidden", "important");
          view.style.setProperty("z-index", "1000", "important");
          view.style.setProperty("background", "#f8fafc", "important");
        } else if (view.id === "view-training") {
          // OUTSIDE main-view-container — same treatment
          var _navH2 = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-height')) || 42;
          var _taskbarH2 = Math.max(0, window.screen.height - window.screen.availHeight);
          view.style.setProperty("position", "fixed", "important");
          view.style.setProperty("top", _navH2 + "px", "important");
          view.style.setProperty("left", "0", "important");
          view.style.setProperty("right", "0", "important");
          view.style.setProperty("bottom", _taskbarH2 + "px", "important");
          view.style.setProperty("width", "100%", "important");
          view.style.setProperty("height", "calc(100vh - " + _navH2 + "px - " + _taskbarH2 + "px)", "important");
          view.style.setProperty("overflow-y", "auto", "important");
          view.style.setProperty("z-index", "1000", "important");
        } else {
          var _navH3 = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-height')) || 80;
          // Force at least 52px bottom clearance so view ends above the Windows taskbar.
          // The view itself is overflow-y:auto; the .qlist-footer inside uses
          // position:sticky; bottom:0 which pins it to the bottom of this view.
          var _taskbarH3 = Math.max(52, window.screen.height - window.screen.availHeight);
          view.style.setProperty("position", "fixed", "important");
          view.style.setProperty("top", _navH3 + "px", "important");
          view.style.setProperty("left", "0", "important");
          view.style.setProperty("right", "0", "important");
          view.style.setProperty("bottom", _taskbarH3 + "px", "important");
          view.style.setProperty("width", "100%", "important");
          view.style.setProperty("height", "calc(100vh - " + _navH3 + "px - " + _taskbarH3 + "px)", "important");
          view.style.setProperty("overflow-y", "auto", "important");
          // z-index 100: above all sibling views (which get z-index:1 or 2),
          // but well below modals (12000+) and the nav (100000).
          view.style.setProperty("z-index", "100", "important");
          view.style.setProperty("pointer-events", "all", "important");
          // Remove any stale overlay footer from previous attempts
          var staleFooter = document.getElementById('__gs-fixed-footer');
          if (staleFooter) staleFooter.remove();
        }


        // view-rental-defects, view-rental-fleet, view-fleet-manager, view-customer-profiles are siblings of main-view-container
        if (["view-rental-defects","view-rental-fleet","view-fleet-manager","view-customer-profiles","view-psv","view-cdv","view-marketing","view-ft-defect-queue","view-certificates","view-command-center"].includes(view.id)) {
          view.style.setProperty("z-index", "2", "important");
        }

        const scrollableViews = ['view-orders-list', 'view-stock', 'view-group-sales-list', 'view-quotations-list', 'view-ce-list', 'view-customers-list', 'view-products-list', 'view-settings', 'view-aftersales', 'view-rental-defects', 'view-rental-fleet', 'view-fleet-manager', 'view-customer-profiles', 'view-psv', 'view-cdv', 'view-marketing', 'view-ft-defect-queue', 'view-training', 'view-training-library'];
        if (scrollableViews.includes(view.id)) {
          view.style.setProperty("overflow-y", "auto", "important");
        }

        // ====== DOM DIMENSION DEBUGGER ======
        if (view.id === 'view-group-sales-list') {
          setTimeout(() => {
            const vRect = view.getBoundingClientRect();
            const cs = window.getComputedStyle(view);
            const tbody = document.getElementById('group-sales-list-body');
            const rows = tbody ? tbody.querySelectorAll('.ai-order-row') : [];
            const firstRowRect = rows[0] ? rows[0].getBoundingClientRect() : null;

            console.group('%c[DOM DEBUG v2] view-group-sales-list', 'color:#6366f1; font-weight:bold;');
            console.log('View Rect:', JSON.stringify({top: Math.round(vRect.top), left: Math.round(vRect.left), width: Math.round(vRect.width), height: Math.round(vRect.height)}));
            console.log('View Computed:', {display: cs.display, position: cs.position, top: cs.top, left: cs.left, right: cs.right, bottom: cs.bottom, width: cs.width, height: cs.height, transform: cs.transform, visibility: cs.visibility});
            console.log('Row count in DOM:', rows.length);
            if (firstRowRect) console.log('First Row Rect:', JSON.stringify({top: Math.round(firstRowRect.top), width: Math.round(firstRowRect.width), height: Math.round(firstRowRect.height)}));

            // ---- ANCESTOR CHAIN SCAN ----
            console.log('%cScanning ancestor chain for display:none or transform...', 'color:orange; font-weight:bold;');
            let el = view.parentElement;
            let depth = 0;
            while (el && depth < 15) {
              const elCs = window.getComputedStyle(el);
              const elRect = el.getBoundingClientRect();
              const hasTransform = elCs.transform && elCs.transform !== 'none';
              const hasFilter = elCs.filter && elCs.filter !== 'none';
              const isHidden = elCs.display === 'none';
              if (isHidden || hasTransform || hasFilter || elRect.width === 0) {
                console.warn(`[ANCESTOR ${depth}] id="${el.id}" class="${el.className.toString().substring(0,40)}"`, {
                  display: elCs.display, transform: elCs.transform,
                  filter: elCs.filter, width: Math.round(elRect.width), height: Math.round(elRect.height)
                });
              }
              el = el.parentElement;
              depth++;
            }
            console.groupEnd();
          }, 2500);
        }
        // ====== END DOM DIMENSION DEBUGGER ======

      } catch (e) { console.error("Error showing target view:", e); }

      try {
        // 4. Handle specific Dashboard items (Defensive)
        if (typeof aiInsightsCard !== 'undefined' && aiInsightsCard) {
          aiInsightsCard.classList.toggle("hidden", view.id !== "view-dashboard");
        }
        const dashNavPill = document.getElementById('dashboard-nav-pill');
        if (dashNavPill) {
          dashNavPill.classList.toggle('hidden', view.id !== "view-dashboard");
          dashNavPill.style.display = (view.id === "view-dashboard") ? 'flex' : 'none';
        }
      } catch (e) { console.error("Error updating dash extras:", e); }

      try {
        // 5. Ensure gsm-mode-active is removed if we are NOT showing the reports
        const mvc = document.getElementById('main-view-container');
        if (mvc && view.id !== 'view-salestrack-reports') {
          mvc.classList.remove('gsm-mode-active');
        }
      } catch (e) {
        console.error("Error resetting gsm-mode:", e);
      }
    }

    function activateNavItem(navEl) {
      // Clear all active states (top-level and dropdown)
      document.querySelectorAll(".nav-item, .top-nav-item, .top-nav-dropdown-item").forEach(el => el.classList.remove("active"));
      if (!navEl) return;

      if (navEl.classList.contains('top-nav-dropdown-item')) {
        // For dropdown items: mark the item active + mark parent trigger active
        navEl.classList.add('active');
        const parentTrigger = navEl.closest('.top-nav-dropdown') && navEl.closest('.top-nav-dropdown').querySelector('.top-nav-dropdown-trigger');
        if (parentTrigger) parentTrigger.classList.add('active');
      } else {
        navEl.classList.add('active');
      }
    }

    /* Splash */
    function showSplash(message, progress) {
      if (splashOverlay) splashOverlay.classList.remove("hidden");
      if (splashText) splashText.textContent = message || "Connecting to Omnis…";
      if (splashBar && typeof progress === "number") {
        const clamped = Math.max(10, Math.min(100, progress));
        splashBar.style.width = clamped + "%";
      }
    }

    function updateSplash(message, progress) {
      if (splashText && message) splashText.textContent = message;
      if (splashBar && typeof progress === "number") {
        const clamped = Math.max(10, Math.min(100, progress));
        splashBar.style.width = clamped + "%";
      }
    }

    function hideSplash() {
      if (splashOverlay) {
        splashOverlay.classList.add("hidden");
        splashOverlay.style.setProperty("display", "none", "important"); // Absolute fail-safe
      }
    }

    function runInitialSplash() {
      // If bereits run in this session, skip the drama
      if (sessionStorage.getItem("omnis_splash_ready")) {
        hideSplash();
        return;
      }

      const messages = [
        "Booting Omnis engine…",
        "Initialising secure session…",
        "Syncing dashboards and KPIs…",
        "Checking database connections…",
        "Linking Salestrack, Fleetrack, Engtrack…",
        "Preparing Omnis AI assistant…"
      ];
      let i = 0, progress = 5;
      showSplash(messages[0], progress);
      const interval = setInterval(() => {
        i = (i + 1) % messages.length;
        progress = Math.min(progress + 25, 95);
        updateSplash(messages[i], progress);
      }, 120);
      setTimeout(() => {
        clearInterval(interval);
        updateSplash("Ready. Loading interface…", 100);
        setTimeout(() => {
          hideSplash();
          sessionStorage.setItem("omnis_splash_ready", "true");
        }, 150);
      }, 800);
    }

    /* Sync indicator */
    function setSyncState(state) {
      if (!syncIndicator) return;
      syncIndicator.classList.remove("sync-online", "sync-offline", "sync-syncing");
      if (state === "online") syncIndicator.classList.add("sync-online");
      else if (state === "offline") syncIndicator.classList.add("sync-offline");
      else if (state === "syncing") syncIndicator.classList.add("sync-syncing");
    }

    function refreshOnlineState() {
      if (navigator.onLine) setSyncState("online");
      else setSyncState("offline");
    }
    window.addEventListener("online", refreshOnlineState);
    window.addEventListener("offline", refreshOnlineState);
    refreshOnlineState();

    /* Sidebar toggle consolidated below at line 11910 */



    /* Weekly GSM helpers */
    function syncCompanyFilters(fromId, toId) {
      const fromEl = document.getElementById(fromId);
      const toEl = document.getElementById(toId);
      if (fromEl && toEl) toEl.value = fromEl.value;
    }

    async function populateCompanyFilters() {
      try {
        if (!window.electron || !window.electron.invoke) return;
        const res = await window.electron.invoke('supabase:query', {
          table: 'fmb_reports', method: 'select', params: { columns: 'company' }
        });
        if (res.ok && res.data) {
          const companies = [...new Set(res.data.map(d => d.company).filter(Boolean))].sort();
          const filterIds = ['mxg-company-filter', 'ol-company', 'aftersales-company-filter', 'group-sales-company', 'qtn-company', 'gs-company'];
          
          filterIds.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            const currVal = el.value;
            let html = '<option value="">All Companies</option>';
            companies.forEach(c => {
               html += `<option value="${c}">${c}</option>`;
            });
            html += '<option value="Unassigned">Unassigned</option>';
            el.innerHTML = html;
            
            // Try to restore previous selection
            if (currVal) {
               const exists = Array.from(el.options).some(o => o.value === currVal);
               if (exists) el.value = currVal;
               else el.value = "";
            }
          });
        }
      } catch (e) {
        console.error('[Omnis] Failed to populate dynamic companies:', e);
      }
    }

    window.appendMissingCompanyFilters = function(newCompanies) {
      if (!newCompanies || !Array.isArray(newCompanies) || newCompanies.length === 0) return;
      const filterIds = ['mxg-company-filter', 'ol-company', 'aftersales-company-filter', 'group-sales-company', 'qtn-company', 'gs-company'];
      filterIds.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        
        let changed = false;
        newCompanies.forEach(c => {
           if (!c || c.toLowerCase() === 'unassigned') return;
           const exists = Array.from(el.options).some(o => o.value === c);
           if (!exists) {
               const unassignedOpt = Array.from(el.options).find(o => o.value === 'Unassigned');
               const newOpt = document.createElement('option');
               newOpt.value = c;
               newOpt.textContent = c;
               if (unassignedOpt) el.insertBefore(newOpt, unassignedOpt);
               else el.appendChild(newOpt);
               changed = true;
           }
        });
        
        if (changed && window.updateBulkActionBar) {
           window.updateBulkActionBar(); // refresh the bulk assign dropdown too
        }
      });
    };

    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(populateCompanyFilters, 500);
    });

    function syncPeriodFilters(fromSuffix, toSuffix) {
      // Suffixes: 'mxg' (Insights) and 'ol' (Tracking)
      const fFrom = document.getElementById(`${fromSuffix}-from-date`);
      const fTo = document.getElementById(`${fromSuffix}-to-date`);
      const tFrom = document.getElementById(`${toSuffix}-from-date`);
      const tTo = document.getElementById(`${toSuffix}-to-date`);
      if (fFrom && tFrom) tFrom.value = fFrom.value;
      if (fTo && tTo) tTo.value = fTo.value;
    }

    function setReportsNavVisibility() {
      if (!navSalestrackReports) return;
      const show = CURRENT_SYSTEM && CURRENT_SYSTEM.key === "salestrack";
      navSalestrackReports.classList.toggle("hidden", !show);
    }

    function toISODate(d) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    }

    function prevWeekRange() {
      const today = new Date();
      const day = today.getDay();
      const daysSinceMonday = (day + 6) % 7;
      const thisMonday = new Date(today);
      thisMonday.setDate(today.getDate() - daysSinceMonday);
      const prevMonday = new Date(thisMonday);
      prevMonday.setDate(thisMonday.getDate() - 7);
      const prevSunday = new Date(prevMonday);
      prevSunday.setDate(prevMonday.getDate() + 6);
      return { from: toISODate(prevMonday), to: toISODate(prevSunday) };
    }

    function openGsmModal(title, sub, html, openUrl = "") {
      gsmModalTitle.textContent = title || "Details";
      gsmModalSub.textContent = sub || "";
      gsmModalBody.innerHTML = html || "";
      lastDrilldownUrl = openUrl || "";
      gsmModal.classList.remove("hidden");
    }
    window.openGsmModal = openGsmModal;
    function closeGsmModal() { gsmModal.classList.add("hidden"); }
    gsmModalClose?.addEventListener("click", closeGsmModal);
    gsmModal?.addEventListener("click", (e) => { if (e.target === gsmModal) closeGsmModal(); });
    gsmModalOpen?.addEventListener("click", () => { if (lastDrilldownUrl) window.open(lastDrilldownUrl, "_blank"); });

    async function fetchGsmDrilldown(metric, salesperson) {
      const base = CURRENT_SYSTEM.baseUrl.replace(/\/$/, "");
      const params = new URLSearchParams({
        metric: metric || "",
        salesperson: salesperson || "",
        from_date: gsmFrom.value,
        to_date: gsmTo.value,
        company: gsmCompany.value || "all",
      });
      const res = await window.callFrappeSequenced(base, GSM_DRILLDOWN_PATH, Object.fromEntries(params));
      return res.message || res;
    }




    /* ==========================
       ✅ Orders Update (ADDED)
       ========================== */

    function normalizePhoneToWaDigits(raw) {
      const s = String(raw || "").trim();
      if (!s) return "";
      let digits = s.replace(/[^\d]/g, "");
      if (!digits) return "";
      if (digits.length === 10 && digits.startsWith("0")) digits = "263" + digits.slice(1);
      else if (digits.length === 9) digits = "263" + digits;
      else if (digits.startsWith("00")) digits = digits.slice(2);
      return digits;
    }

    async function resolveCustomerDocname(customerLabel) {
      if (!CURRENT_SYSTEM) return customerLabel;
      const base = CURRENT_SYSTEM.baseUrl.replace(/\/$/, "");

      try {
        const res = await window.callFrappeSequenced(base, "frappe.client.get", { doctype: "Customer", name: customerLabel });
        if (res) return customerLabel;
      } catch { }

      try {
        const res2 = await window.callFrappeSequenced(base, "frappe.client.get_list", {
          doctype: "Customer",
          filters: { customer_name: customerLabel },
          fields: ["name"],
          limit_page_length: 1
        });
        if (res2 && res2[0] && res2[0].name) return res2[0].name;
      } catch { }

      return customerLabel;
    }

    async function fetchCustomerComm(customerLabel) {
      if (!CURRENT_SYSTEM) return { email: "", phoneRaw: "", waDigits: "" };
      const base = CURRENT_SYSTEM.baseUrl.replace(/\/$/, "");
      const customerName = await resolveCustomerDocname(customerLabel);

      let email = "", phoneRaw = "", primaryContact = "";

      try {
        const res = await window.callFrappeSequenced(base, "frappe.client.get", { doctype: "Customer", name: customerName });
        if (res) {
          const d = res || {};
          email = d.email_id || d.email || d.customer_email || "";
          phoneRaw = d.mobile_no || d.mobile || d.phone || d.phone_no || d.whatsapp_no || d.custom_whatsapp_number || "";
          primaryContact = d.customer_primary_contact || d.primary_contact || "";
        }
      } catch { }

      if ((!email || !phoneRaw) && primaryContact) {
        try {
          const resC = await window.callFrappeSequenced(base, "frappe.client.get", { doctype: "Contact", name: primaryContact });
          if (resC) {
            const cd = resC || {};
            if (!email) email = cd.email_id || cd.email || "";
            if (!phoneRaw) phoneRaw = cd.mobile_no || cd.phone || cd.phone_no || cd.mobile || "";
          }
        } catch { }
      }

      const waDigits = normalizePhoneToWaDigits(phoneRaw);
      return { email: String(email || "").trim(), phoneRaw: String(phoneRaw || "").trim(), waDigits };
    }

    function buildOrderUpdateMessage(ctx) {
      const status = (orderStatus.value || "").trim();
      const notes = (orderNotes.value || "").trim();
      const eta = (orderEta.value || "").trim();

      const customer = ctx?.customer || "Customer";
      const fmb = ctx?.fmb || "Order";

      const lines = [];
      lines.push(`Hello ${customer},`);
      lines.push("");
      lines.push(`Update on your order (${fmb}):`);
      if (status) lines.push(`Status: ${status}`);
      if (notes) lines.push(`Notes: ${notes}`);
      if (eta) lines.push(`ETA/Target: ${eta}`);
      lines.push("");
      lines.push("Thank you.");
      lines.push("Industrial Exchange Group");

      return lines.join("\n");
    }

    function openOrderModal(ctx) {
      currentOrderCtx = ctx;

      orderModalTitle.textContent = `Send Order Update`;
      orderModalSub.textContent =
        `${ctx.customer || ""} · Order: ${ctx.fmb || ""}` +
        (ctx.target ? ` · Target: ${ctx.target}` : "");

      orderStatus.value = "In transit";
      orderNotes.value = "";
      orderEta.value = "";

      if (ctx.target && /^\d{4}-\d{2}-\d{2}$/.test(ctx.target)) {
        orderEta.value = ctx.target;
      }

      orderContact.textContent = "Looking up…";
      orderSendStatus.textContent = "";
      orderMessage.value = buildOrderUpdateMessage(ctx);

      orderModal.classList.remove("hidden");
    }

    function closeOrderModal() {
      orderModal.classList.add("hidden");
      currentOrderCtx = null;
    }

    orderModalClose?.addEventListener("click", closeOrderModal);
    orderModal?.addEventListener("click", (e) => { if (e.target === orderModal) closeOrderModal(); });

    function refreshOrderPreview() {
      if (!currentOrderCtx) return;
      orderMessage.value = buildOrderUpdateMessage(currentOrderCtx);
    }

    orderStatus?.addEventListener("change", refreshOrderPreview);
    orderEta?.addEventListener("change", refreshOrderPreview);
    orderNotes?.addEventListener("input", refreshOrderPreview);

    orderCopy?.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(orderMessage.value || "");
        orderSendStatus.textContent = "Copied message to clipboard.";
      } catch {
        orderSendStatus.textContent = "Could not copy automatically. Please select and copy manually.";
      }
    });

    orderSend?.addEventListener("click", () => {
      if (!currentOrderCtx) return;

      const msg = orderMessage.value || "";
      const channelPref = orderChannel.value || "auto";

      let chosen = channelPref;
      if (chosen === "auto") {
        chosen = currentOrderCtx.waDigits ? "whatsapp" : (currentOrderCtx.email ? "email" : "none");
      }

      if (chosen === "none") {
        orderSendStatus.textContent =
          "No WhatsApp number or email found for this customer. Please update the customer's primary contact in Salestrack.";
        return;
      }

      if (chosen === "whatsapp") {
        if (!currentOrderCtx.waDigits) {
          orderSendStatus.textContent = "No WhatsApp number found for this customer.";
          return;
        }
        const url = "https://wa.me/" + encodeURIComponent(currentOrderCtx.waDigits) +
          "?text=" + encodeURIComponent(msg);
        window.open(url, "_blank");
        orderSendStatus.textContent = "Opened WhatsApp with the message pre-filled.";
        return;
      }

      if (chosen === "email") {
        if (!currentOrderCtx.email) {
          orderSendStatus.textContent = "No email address found for this customer.";
          return;
        }
        const subject = "Order Update: " + (currentOrderCtx.fmb || "Order");
        const url =
          "mailto:" + encodeURIComponent(currentOrderCtx.email) +
          "?subject=" + encodeURIComponent(subject) +
          "&body=" + encodeURIComponent(msg);
        window.open(url, "_blank");
        orderSendStatus.textContent = "Opened your email client with the message pre-filled.";
        return;
      }
    });

    function decorateOrdersPreviewTable() {
      const table = ordersPreviewDiv?.querySelector("table");
      if (!table) return;

      const theadTr = table.querySelector("thead tr");
      if (theadTr && !theadTr.querySelector(".col-update")) {
        const th = document.createElement("th");
        th.className = "col-update";
        th.textContent = "Update";
        theadTr.appendChild(th);
      }

      table.querySelectorAll("tbody tr").forEach(tr => {
        if (tr.querySelector(".order-update-btn")) return;
        const tds = tr.querySelectorAll("td");
        if (tds.length < 4) return;

        const fmb = (tds[0].innerText || "").trim();
        const customer = (tds[1].innerText || "").trim();
        const qty = (tds[2].innerText || "").trim();
        const target = (tds[3].innerText || "").trim();

        const td = document.createElement("td");
        td.className = "text-right";

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn-secondary btn-mini order-update-btn";
        btn.textContent = "Update";
        btn.dataset.fmb = fmb;
        btn.dataset.customer = customer;
        btn.dataset.qty = qty;
        btn.dataset.target = target;

        td.appendChild(btn);
        tr.appendChild(td);
      });
    }

    if (ordersPreviewDiv) {
      const obs = new MutationObserver(() => decorateOrdersPreviewTable());
      obs.observe(ordersPreviewDiv, { childList: true, subtree: true });
    }

    ordersPreviewDiv?.addEventListener("click", async (e) => {
      const btn = e.target.closest(".order-update-btn");
      if (!btn) return;
      if (!CURRENT_SYSTEM) return;

      const ctx = {
        fmb: btn.dataset.fmb || "",
        customer: btn.dataset.customer || "",
        qty: btn.dataset.qty || "",
        target: btn.dataset.target || "",
        email: "",
        waDigits: "",
      };

      openOrderModal(ctx);

      try {
        const comm = await fetchCustomerComm(ctx.customer);
        ctx.email = comm.email || "";
        ctx.waDigits = comm.waDigits || "";

        const parts = [];
        if (comm.waDigits) parts.push(`WhatsApp: +${comm.waDigits}`);
        if (comm.email) parts.push(`Email: ${comm.email}`);
        if (!parts.length) parts.push("No WhatsApp / Email found for this customer.");
        orderContact.textContent = parts.join(" · ");

        if (comm.waDigits) orderChannel.value = "whatsapp";
        else if (comm.email) orderChannel.value = "email";
        else orderChannel.value = "auto";

        currentOrderCtx = ctx;
        refreshOrderPreview();
      } catch (err) {
        orderContact.textContent = "Could not fetch contact details.";
        orderSendStatus.textContent = "Tip: set Customer Primary Contact in Salestrack (with email / mobile).";
      }
    });

    /* ---------- Omnis AI Chat Assistant ---------- */
    async function sendChatMessage() {
      const question = (chatInput.value || "").trim();
      if (!question || chatIsSending) return;

      if (!CURRENT_SYSTEM) {
        appendChatMessage("assistant", "Please log into Omnis first so I can access your customers, quotations and machines.");
        return;
      }

      if (!navigator.onLine) {
        appendChatMessage("assistant", "You are currently offline. I need an internet connection to fetch live data from your systems.");
        return;
      }

      appendChatMessage("user", question);
      chatInput.value = "";
      chatInput.focus();

      chatIsSending = true;
      chatSend.disabled = true;
      setChatStatus("Thinking… asking Omnis AI and your systems.");

      try {
        const base = CURRENT_SYSTEM.baseUrl.replace(/\/$/, "");
        const api_key = localStorage.getItem('omnis_openai_key') || "";
        const payload = { message: question, conversation_id: chatConversationId, context: { system_key: CURRENT_SYSTEM.key, base_url: CURRENT_SYSTEM.baseUrl }, api_key: api_key };


        const res = await window.callFrappeSequenced(base, OMNIS_AI_METHOD_PATH, payload);
        const msg = res.message || res || {};
        const reply = msg.reply || msg.answer || msg.text || msg.message || (typeof msg === "string" ? msg : JSON.stringify(msg, null, 2));
        appendChatMessage("assistant", reply || "I received a response but couldn't understand the format.", msg.structured);
      } catch (e) {
        console.error("Omnis AI chat error:", e);
        appendChatMessage("assistant", "Sorry, I couldn't reach the Omnis AI service.\nIf this keeps happening, please contact support.");
      } finally {
        chatIsSending = false;
        chatSend.disabled = false;
        setChatStatus("");
        refreshOnlineState();
      }
    }

    function appendChatMessage(role, text, structured = null) {
      if (!text) return;
      const wrapper = document.createElement("div");
      wrapper.className = "chat-message " + (role === "user" ? "user" : "assistant");
      const bubble = document.createElement("div");
      bubble.className = "chat-bubble";
      bubble.textContent = text;
      wrapper.appendChild(bubble);

      // Handle Structured Actions
      if (role === "assistant" && structured && structured.action) {
        const actionBtn = document.createElement("button");
        actionBtn.className = "chat-action-btn";
        if (structured.action === "create_quote") {
          actionBtn.innerHTML = '<i class="fa-solid fa-file-invoice-dollar"></i> Create Quote Draft';
        } else {
          actionBtn.innerHTML = `<i class="fa-solid fa-bolt"></i> Run Action: ${structured.action}`;
        }

        actionBtn.onclick = () => {
          if (window.handleChatAction) window.handleChatAction(structured);
        };
        bubble.appendChild(actionBtn);
      }

      chatMessages.appendChild(wrapper);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function openChatWidget() {
      const isHidden = chatWidget.classList.contains("hidden");
      if (isHidden) {
        chatWidget.classList.remove("hidden");
        if (!chatMessages.children.length) {
          appendChatMessage("assistant",
            "Hi, I'm Omnis Assist.\n\n" +
            "You can ask me things like:\n" +
            "• \"Show my open quotations this week\"\n" +
            "• \"Which customers have machines on order?\"\n" +
            "• \"Summarise my FMB orders by customer\""
          );
        }
        chatInput.focus();
      } else chatWidget.classList.add("hidden");
    }

    if (searchFab) searchFab.addEventListener("click", (e) => { e.stopPropagation(); if (typeof openChatWidget === "function") openChatWidget(); });
    if (chatClose) chatClose.addEventListener("click", () => { if (chatWidget) chatWidget.classList.add("hidden"); });
    if (chatInput) {
      chatInput.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (typeof sendChatMessage === "function") sendChatMessage(); } });
    }

    /* ---------- AUTHENTICATION ---------- */
    function logout() {
      // Clear session data
      localStorage.removeItem("omnisRemember");
      localStorage.removeItem("omnisUser");
      localStorage.removeItem("omnisPwd");
      localStorage.removeItem("omnisSystemKey");

      // Redirect to root login
      if (window.frappeAPI && window.frappeAPI.openLogin) {
        window.frappeAPI.openLogin();
      } else {
        window.location.href = "../../index.html";
      }
    }

    function login() {
      const app = document.getElementById("app-shell");
      const login = document.getElementById("login-view");
      const splash = document.getElementById("splash-overlay");

      if (login) login.style.display = "none";
      // Mimic splash loading
      if (splash) {
        splash.classList.remove("hidden");
        if (initSalestrack) initSalestrack();
        else if (app) app.style.display = "flex";
      } else {
        if (app) app.style.display = "flex";
      }
    }

    /* ---------- Sidebar nav ---------- */
    function switchToView(viewId, label) {
      console.log("Switching to view:", viewId);

      const navItem = document.querySelector(
        [`.nav-item[data-view="${viewId}"]`,
         `.top-nav-item[data-view="${viewId}"]`,
         `.top-nav-dropdown-item[data-view="${viewId}"]`].join(', ')
      );
      if (navItem) activateNavItem(navItem);

      // Hide mobile sidebar if open
      const shell = document.getElementById('app-shell');
      if (window.innerWidth < 768 && shell) {
        shell.classList.add('collapsed');
      }

      // Get the header containers and hide them by default
      const gsmTabContainer = document.getElementById('gsm-tab-container');
      const mainViewContainer = document.getElementById('main-view-container');

      if (gsmTabContainer) gsmTabContainer.style.display = "none";
      const mvc = document.getElementById('main-view-container');
      if (mvc) {
        mvc.classList.remove('gsm-mode-active');
        mvc.style.setProperty("display", "flex", "important");
        mvc.style.setProperty("flex-direction", "column", "important");
        mvc.style.setProperty("margin-top", "0", "important");
        mvc.style.setProperty("flex", "1", "important");
        mvc.style.setProperty("height", "100%", "important");
        mvc.style.setProperty("width", "100vw", "important");
        mvc.style.setProperty("position", "relative", "important");
        mvc.style.setProperty("left", "0", "important");
        mvc.style.setProperty("overflow", "hidden", "important");
        mvc.style.transform = "none";
        mvc.style.zoom = "";
      }
      /* group-sales-header-container removed in favor of integrated view header */

      // Set paddingTop based on view type
      const zeroPaddingViews = [
        "view-salestrack-reports",
        "view-debug"
      ];
      if (mainViewContainer) {
        mainViewContainer.style.paddingTop = "0";
      }

      // Show the view
      const targetView = document.getElementById(viewId);
      if (targetView) {
        showOnly(targetView);
        // Robust enforcement of visibility - scrollable views need block not flex
        targetView.classList.remove("hidden");
        const scrollableViewIds = ['view-credit-terms', 'view-dashboard', 'view-tenders', 'view-orders-list', 'view-stock', 'view-group-sales-list', 'view-quotations-list', 'view-ce-list', 'view-command-center', 'view-customers-list', 'view-products-list', 'view-salestrack-reports', 'view-debug', 'view-settings', 'view-psv', 'view-cdv', 'view-marketing', 'view-training', 'view-training-library'];
        if (scrollableViewIds.includes(viewId)) {
          targetView.style.setProperty("display", "block", "important");
          targetView.style.setProperty("overflow-y", "auto", "important");
          targetView.style.setProperty("height", "100%", "important");
        } else {
          targetView.style.setProperty("display", "flex", "important");
        }
      }

      // Default Title
      if (mainTitle) {
        if (label) {
          mainTitle.textContent = label;
        } else if (navItem) {
          const text = navItem.querySelector('span:not(.icon)')?.textContent;
          if (text) mainTitle.textContent = text;
        }
      }
      if (mainSubtitle) mainSubtitle.textContent = "Real-time insights and statistical analysis"; // Default reset

      // Specific Logic
      const dashDots = document.querySelector('.dashboard-slider-dots');
      if (dashDots) {
        if (viewId === "view-dashboard") dashDots.classList.remove('hidden');
        else dashDots.classList.add('hidden');
      }

      if (viewId === "view-dashboard") {
        if (mainTitle) mainTitle.textContent = "Performance Overview";
        if (mainSubtitle) mainSubtitle.textContent = "Overview and quick actions";
        if (window.dashboardLogic) window.dashboardLogic.render();
      } else if (viewId === "view-salestrack-reports") {
        if (gsmTabContainer) gsmTabContainer.style.display = "block";
        if (mainTitle) mainTitle.textContent = "GSM Operational Report";
        if (window.loadGSMReport) window.loadGSMReport(false);
      } else if (viewId === "view-group-sales-list") {
        if (mainTitle) mainTitle.textContent = "Group Sales Activity";
        if (window.loadGroupSalesList) window.loadGroupSalesList(false);
      } else if (viewId === "view-quotations-list") {
        if (mainTitle) mainTitle.textContent = "Quotations Management";
        qOffset = 0;
        loadQuotationList(false);
      } else if (viewId === "view-ce-list") {
        if (mainTitle) mainTitle.textContent = "Enquiries";
        ceOffset = 0;
        loadCeList(false);
      } else if (viewId === "view-command-center") {
        if (mainTitle) mainTitle.textContent = "QLA (Quotations Lifecycle Analytics)";
        if (mainSubtitle) mainSubtitle.textContent = "Proactive follow-up and engagement engine.";
        if (typeof salestrack !== 'undefined' && salestrack.openCommandCenter) salestrack.openCommandCenter(true);
      } else if (viewId === "view-chat") {
        if (mainTitle) mainTitle.textContent = "Omnis AI";
        document.querySelectorAll(".nav-item, .top-nav-item, .top-nav-dropdown-item").forEach(n => n.classList.remove("active"));
      } else if (viewId === "view-products-list") {
        if (mainTitle) mainTitle.textContent = "Product Catalog";
        if (mainSubtitle) mainSubtitle.textContent = "Machinery and Component Inventory";
        if (window.loadProductsFromSupabase) window.loadProductsFromSupabase();
      } else if (viewId === "view-settings") {
        if (typeof salestrack !== 'undefined' && salestrack.loadSettings) salestrack.loadSettings();
        if (mainTitle) mainTitle.textContent = "System Settings";
        if (mainSubtitle) mainSubtitle.textContent = "Configure your application preferences and integrations.";

        // ─── ELECTRON REPAINT FIX ─────────────────────────────────────────
        const _settingsEl = document.getElementById('view-settings');
        if (_settingsEl) {
          // Force layout recalculation by toggling display
          const origDisplay = _settingsEl.style.display;
          _settingsEl.style.display = 'none';
          void _settingsEl.offsetHeight; // Flush
          _settingsEl.style.display = origDisplay || 'block';
          
          const _mvc = document.getElementById('main-view-container');
          if (_mvc) {
            _mvc.style.transform = 'translateZ(0)';
            void _mvc.offsetHeight;
            setTimeout(() => {
              if (_mvc) _mvc.style.transform = 'none';
            }, 50);
          }
        }
      } else if (viewId === "view-orders-list") {
        if (mainTitle) mainTitle.textContent = "Order Tracking";
        if (mainSubtitle) mainSubtitle.textContent = "Real-time production and logistical status monitoring.";
        if (mainViewContainer) {
          mainViewContainer.style.display = "flex";
          mainViewContainer.classList.remove("hidden");
        }

        if (typeof initOrdersLogic === 'function') initOrdersLogic();
        if (typeof loadOrdersList === 'function') loadOrdersList(false);

        // ─── ELECTRON REPAINT FIX ─────────────────────────────────────────
        // Electron's Chromium renderer does not repaint after JS display changes.
        // We force a repaint by: (1) reading a layout property to flush pending
        // styles, (2) scheduling the actual display update in the next two
        // animation frames so the compositor picks it up.
        const _ordersEl = document.getElementById('view-orders-list');
        if (_ordersEl) {
          // Force reflow and ensure top position
          _ordersEl.scrollTop = 0;
          void _ordersEl.offsetHeight;

          // Double-rAF for compositor sync
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              const _mvc = document.getElementById('main-view-container');
              if (_mvc) {
                _mvc.scrollTop = 0;
                _mvc.style.transform = 'translateZ(0)';
                void _mvc.offsetHeight;
                _mvc.style.transform = 'none';
              }
            });
          });
        }
        // ─────────────────────────────────────────────────────────────────
      } else if (viewId === "view-products-list") {
        if (typeof loadProductsList === 'function') loadProductsList(false);
      } else if (viewId === "view-customers-list") {
        if (typeof loadCustomersList === 'function') loadCustomersList(false);
      } else if (viewId === "view-debug") {
        if (window.loadDebugInfo) window.loadDebugInfo();
      } else if (viewId === "view-create-quotation") {
        if (window.initCreateQuotation) window.initCreateQuotation();
      } else if (viewId === "view-stock") {
        if (mainTitle) mainTitle.textContent = "Machine Stock Management";
        if (mainSubtitle) mainSubtitle.textContent = "Real-time inventory telemetry across brands.";

        // ─── ELECTRON REPAINT FIX ─────────────────────────────────────────
        const _stockEl = document.getElementById('view-stock');
        if (_stockEl) {
          _stockEl.scrollTop = 0;
          void _stockEl.offsetHeight;
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              if (window.renderStockTab) window.renderStockTab();
              const _mvc = document.getElementById('main-view-container');
              if (_mvc) {
                _mvc.scrollTop = 0;
                _mvc.style.transform = 'translateZ(0)';
                void _mvc.offsetHeight;
                _mvc.style.transform = 'none';
              }
            });
          });
        }
        // ─────────────────────────────────────────────────────────────────
      } else if (viewId === "view-licensing") {
        if (mainTitle) mainTitle.textContent = "System Licensing";
        if (mainSubtitle) mainSubtitle.textContent = "Enterprise authentication and core engine identity.";
      } else if (viewId === "view-training") {
        if (mainTitle) mainTitle.textContent = "Operator Training";
        if (mainSubtitle) mainSubtitle.textContent = "Track operator certifications and generate training completion documents.";
        if (window.loadTrainingList) window.loadTrainingList();
      } else if (viewId === "view-training-library") {
        if (mainTitle) mainTitle.textContent = "Course Library";
        if (mainSubtitle) mainSubtitle.textContent = "Interactive step-by-step OEM training courses.";
        if (window.renderTrainingLibrary) window.renderTrainingLibrary();
      } else if (viewId === "view-marketing") {
        if (mainTitle) mainTitle.textContent = "Marketing Broadcasts";
        if (mainSubtitle) mainSubtitle.textContent = "Design and broadcast email and WhatsApp campaigns to your customer base.";
        if (window.marketingLoadHub) window.marketingLoadHub();
      }

      // Safety guard for missing KPIs
      if (typeof loadEnquiriesKPI === 'undefined') {
        window.loadEnquiriesKPI = () => console.warn("loadEnquiriesKPI is missing - using stub");
      }
      if (typeof openStockPipelineForm === 'undefined') {
        window.openStockPipelineForm = () => console.warn("openStockPipelineForm is missing - using stub");
      }
    }
    window.switchToView = switchToView;

    document.querySelectorAll(".nav-item, .top-nav-item").forEach(item => {
      if (item.classList.contains('top-nav-dropdown-trigger')) return; // Handled by hover CSS
      item.addEventListener("click", () => {
        const viewId = item.getAttribute("data-view");
        const label = item.getAttribute("data-label") || item.innerText.trim();
        if (viewId) switchToView(viewId, label);
      });
    });

    // Dropdown sub-items
    document.querySelectorAll(".top-nav-dropdown-item").forEach(item => {
      item.addEventListener("click", (e) => {
        e.stopPropagation(); // Prevent body-level handlers from re-firing view-switching
        const viewId = item.getAttribute("data-view");
        const label = item.innerText.trim();
        if (viewId) switchToView(viewId, label);
      });
    });


    /* ---------- Notifications & avatar dropdowns ---------- */
    function closeAllDropdowns() {
      if (notifDropdown) notifDropdown.classList.add("hidden");
      if (avatarDropdown) avatarDropdown.classList.add("hidden");
    }
    if (notifBell) notifBell.addEventListener("click", (e) => { e.stopPropagation(); const isHidden = notifDropdown?.classList.contains("hidden"); closeAllDropdowns(); if (isHidden) notifDropdown?.classList.remove("hidden"); });
    if (avatarMenu) avatarMenu.addEventListener("click", (e) => { e.stopPropagation(); const isHidden = avatarDropdown?.classList.contains("hidden"); closeAllDropdowns(); if (isHidden) avatarDropdown?.classList.remove("hidden"); });
    window.addEventListener("click", () => { closeAllDropdowns(); });

    if (menuSettings) menuSettings.addEventListener("click", () => { alert("Settings panel coming soon 😊"); });
    if (menuAbout) menuAbout.addEventListener("click", () => { alert("Omnis Desktop\nVersion 1.0.0\nBuilt for MXG / SPZ"); });

    if (menuLogout) {
      menuLogout.addEventListener("click", async () => {
        try {
          if (CURRENT_SYSTEM) {
            const base = CURRENT_SYSTEM.baseUrl.replace(/\/$/, "");
            await window.callFrappeSequenced(base, "logout", {});
          }
        } catch (e) {
          console.warn("Logout call failed", e);
        } finally {
          localStorage.removeItem(LS_REMEMBER);
          localStorage.removeItem(LS_USER);
          localStorage.removeItem(LS_PWD);
          location.reload();
        }
      });
    }

    /* Item row logic for generic tables (legacy or other views) */
    function addItemRow() {
      // ... itemsAdd logic for generic or other views if needed ...
    }
    if (itemsAdd) itemsAdd.addEventListener("click", addItemRow);
    if (itemsBody) addItemRow();

    /* ---------- CREATE CE / OPPORTUNITY LOGIC (Form) ---------- */
    // Logic moved to create_ce_logic.js to allow for better maintenance and autocomplete support.


    // Register View in showOnly
    const originalShowOnly = showOnly;
    // We can't easily override internal functions, but we can check showOnly usage.
    // Actually, showOnly loops through a predefined array: [viewDashboard, viewQuotationsList, viewCreateQuotation, viewGeneric, viewSalestrackReports]
    // We need to add viewCreateCe to that array or modify showOnly.
    // Easier to just patch usage spots or modify showOnly definition. 
    // Since we are inserting at end, we are outside scope of showOnly definition unless it was global?
    // showOnly is defined inside initSalestrack. We are inside initSalestrack.
    // We need to make sure `viewCreateCe` is included in the hiding loop.

    /* ---------- QUOTATIONS LIST (kept) ---------- */
    /* ---------- QUOTATIONS DASHBOARD LOGIC (Standard Frappe API) ---------- */
    async function loadQuotationList(force = false) {
      // 1. OFFLINE-FIRST: Try to load from local SQLite cache first
      try {
        if (window.frappeAPI) {
          const cached = await window.frappeAPI.getCached('quotations');
          if (cached && cached.ok && cached.data && cached.data.length > 0) {
            console.log(`[OfflineFix] Loaded ${cached.data.length} quotations from SQLite cache.`);
            renderQuotationsTable(cached.data);
            if (qListInfo) qListInfo.textContent = "Showing offline results...";
          }
        }
      } catch (ce) { console.warn("Offline cache load failed:", ce); }

      // 5-minute TTL check (bypass if user has active search/filter)
      const now = Date.now();
      const hasActiveFilter = qSearchText || qStatusValue;
      if (!force && !hasActiveFilter && window.lastLoaded['quotations'] && (now - window.lastLoaded['quotations'] < 300000)) {
        console.log("Quotations fresh (under 5m), skipping fresh fetch.");
        return;
      }

      loadQuotationsKPI();
      if (!CURRENT_SYSTEM) return;
      const base = CURRENT_SYSTEM.baseUrl.replace(/\/$/, "");

      if (qListInfo) qListInfo.textContent = "Refreshing...";
      setSyncState("syncing");

      try {
        const res = await window.callFrappeSequenced(base, "powerstar_salestrack.omnis_dashboard.get_omnis_quotations", {
          start: qOffset,
          page_length: qPageLength,
          search: qSearchText || "",
          status: qStatusValue || ""
        });

        window.lastLoaded['quotations'] = Date.now();
        const msg = res.message || res;
        const data = msg.data || [];
        qHasMore = msg.has_more || false;

        renderQuotationsTable(data);

        const totalShowing = qOffset + data.length;
        if (qListInfo) qListInfo.textContent = data.length > 0 ? `Showing ${qOffset + 1} - ${totalShowing}` : "No records";

        if (qPrevBtn) qPrevBtn.disabled = qOffset === 0;
        if (qNextBtn) qNextBtn.disabled = !qHasMore;
      } catch (e) {
        console.error("Quotation list error:", e);
        if (qListInfo) qListInfo.textContent = "Error refreshing list";
      } finally {
        setSyncState("synced");
      }
    }

    function renderQuotationsTable(data) {
      if (!qListBody) return;
      qListBody.innerHTML = "";
      if (!data || !data.length) {
        qListBody.innerHTML = `<div style="padding:40px; text-align:center; color:#94a3b8; background:white; border-radius:12px; border:1px dashed #e2e8f0;">No quotations found.</div>`;
        return;
      }
      const base = CURRENT_SYSTEM ? CURRENT_SYSTEM.baseUrl.replace(/\/$/, "") : "";
      data.forEach(row => {
        const item = document.createElement("div");
        item.className = "ai-order-row ai-quotations-grid";
        item.style.borderRadius = "12px";
        item.style.borderLeft = "4px solid var(--accent-maroon)";
        item.onclick = () => window.open(`${base}/app/quotation/${row.name}`, "_blank");
        item.style.cursor = "pointer";

        item.innerHTML = `
          <div class="ai-order-cell">
            <span class="cell-label">ID</span>
            <div style="font-weight:700; color:#1e293b; font-size:13px; word-break:break-all;"><span class="q-id-pill" style="display:inline-block; max-width:100%; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(row.name)}</span></div>
          </div>
          <div class="ai-order-cell">
            <span class="cell-label">Title</span>
            <div style="font-weight:600; color:#0f172a; font-size:13px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${escapeHtml(row.title || '-')}</div>
          </div>
          <div class="ai-order-cell">
            <span class="cell-label">Customer</span>
            <div style="font-weight:600; color:#475569; font-size:13px;">${escapeHtml(window._cleanCust(row.customer_name) || '-')}</div>
          </div>
          <div class="ai-order-cell" style="text-align:center;">
            <span class="cell-label">Date</span>
            <div style="font-weight:600; font-size:12px; color:#64748b;">${formatDate(row.transaction_date)}</div>
          </div>
          <div class="ai-order-cell">
            <span class="cell-label">Sales Person</span>
            <div style="font-weight:600; color:#334155; font-size:12px;">${escapeHtml(row.custom_sales_person || '-')}</div>
          </div>
          <div class="ai-order-cell">
            <span class="cell-label">Status</span>
            <div><span class="status-pill ${getStatusColor(row.status)}">${escapeHtml(row.status || 'Draft')}</span></div>
          </div>
          <div class="ai-order-cell" style="text-align:center;">
            <span class="cell-label">Next Follow Up</span>
            <div style="font-weight:700; font-size:12px; color:#10b981;">${formatDate(row.custom_next_follow_up_date)}</div>
          </div>
          <div class="ai-order-row-actions" style="text-align:right; display:flex; gap:6px; justify-content:flex-end;">
            <button class="btn-icon-only" onclick="event.stopPropagation(); window.showQuotationOptions('${row.name}', false)" title="Print/Share" style="border:1px solid #e2e8f0; background:white; color:#334155; height:28px; width:28px; border-radius:6px; font-size:12px;">
              <i class="fas fa-print"></i>
            </button>
            <button class="btn-icon-only" onclick="event.stopPropagation(); window.previewWhatsAppReminder('${row.name}')" title="Test WhatsApp Reminder" style="border:1px solid #bbf7d0; background:#f0fdf4; color:#16a34a; height:28px; width:28px; border-radius:6px; font-size:12px;">
              <i class="fab fa-whatsapp"></i>
            </button>
          </div>
        `;
        qListBody.appendChild(item);
      });
    }

    function getStatusColor(status) {
      const s = String(status).toLowerCase();
      if (s === 'ordered') return 'green';
      if (s === 'lost' || s === 'expired') return 'red';
      if (s === 'open') return 'blue';
      return 'gray';
    }

    async function loadQuotationsKPI() {
      if (!CURRENT_SYSTEM) return;
      const base = CURRENT_SYSTEM.baseUrl.replace(/\/$/, "");

      try {
        // Use Whitelisted API to bypass permission restrictions
        const res = await window.callFrappeSequenced(base, "powerstar_salestrack.omnis_dashboard.get_omnis_quotations_kpi");
        const msg = res.message || res;
        const data = msg.data || {};

        document.getElementById('q-kpi-total').textContent = data.total || 0;
        document.getElementById('q-kpi-pending').textContent = data.open || 0;

        const machineCount = data.machine_count || 0;
        document.getElementById('q-kpi-mtd').textContent = machineCount.toLocaleString();
        document.getElementById('q-kpi-mtd-label').textContent = 'Units in pipeline';
      } catch (e) {
        console.warn("KPI Load fail", e);
      }
    }

    // Quick Create Handler
    const btnQqSubmit = document.getElementById('btn-qq-submit');
    if (btnQqSubmit) {
      btnQqSubmit.onclick = async () => {
        const custInput = document.getElementById('qq-customer');
        const titleInput = document.getElementById('qq-title');
        const itemInput = document.getElementById('qq-item');
        const cust = custInput?.value.trim();
        const title = titleInput?.value.trim() || (cust ? `${cust} - Quotation` : '');
        const item = itemInput?.value.trim();

        if (!cust) { alert("Please enter a Customer name"); return; }

        btnQqSubmit.disabled = true;
        btnQqSubmit.textContent = "Creating...";

        try {
          const base = CURRENT_SYSTEM.baseUrl.replace(/\/$/, "");
          const items = item ? [{ item_code: item, qty: 1 }] : [];

          // Route through IPC (callFrappeSequenced) - same as all other API calls
          const res = await window.callFrappeSequenced(
            base,
            "powerstar_salestrack.omnis_dashboard.save_omnis_quotation",
            {
              customer: cust,
              company: CURRENT_SYSTEM.company || "",
              title: title,
              transaction_date: nowdate(),
              items: items.length ? JSON.stringify(items) : "[]"
            }
          );
          const newDoc = (res && res.message) ? res.message : res;
          if (newDoc.name) {
            omnisLog("Quick Quote Created: " + newDoc.name);
            custInput.value = "";
            titleInput.value = "";
            if (itemInput) itemInput.value = "";
            loadQuotationList(true);
            // Show success toast
            if (window.salestrack && window.salestrack.showToast) {
              window.salestrack.showToast(`Quotation ${newDoc.name} created!`, 'success');
            }
          }
        } catch (e) {
          alert("Failed to create quotation: " + e.message);
        } finally {
          btnQqSubmit.disabled = false;
          btnQqSubmit.textContent = "Create Quote";
        }
      };
    }

    // ---- Quick Create Autocomplete Wiring ----
    function setupQuickAutocomplete(inputId, suggestId, searchMethod, searchParam, onSelect) {
      const input = document.getElementById(inputId);
      const list = document.getElementById(suggestId);
      if (!input || !list) return;

      let debTimer;
      input.addEventListener('input', () => {
        clearTimeout(debTimer);
        const q = input.value.trim();
        if (q.length < 2) { list.innerHTML = ''; list.classList.add('hidden'); return; }
        debTimer = setTimeout(async () => {
          if (!CURRENT_SYSTEM) return;
          try {
            const base = CURRENT_SYSTEM.baseUrl.replace(/\/$/, '');
            const res = await window.callFrappeSequenced(base, 'frappe.client.get_list', {
              doctype: searchMethod,
              filters: [[searchMethod, searchParam, 'like', `%${q}%`]],
              fields: [searchParam, 'name'],
              limit_page_length: 10
            });
            const rows = (res.message || res) || [];
            list.innerHTML = '';
            if (!rows.length) { list.classList.add('hidden'); return; }
            rows.forEach(r => {
              const val = r[searchParam] || r.name;
              const li = document.createElement('div');
              li.className = 'suggest-item';
              li.textContent = val;
              li.onclick = () => { onSelect(val, r); list.innerHTML = ''; list.classList.add('hidden'); };
              list.appendChild(li);
            });
            list.classList.remove('hidden');
          } catch(e) { list.classList.add('hidden'); }
        }, 300);
      });

      document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !list.contains(e.target)) {
          list.classList.add('hidden');
        }
      });
    }

    // Customer autocomplete - auto-fill title on selection
    setupQuickAutocomplete('qq-customer', 'qq-customer-suggest', 'Customer', 'customer_name', (val) => {
      document.getElementById('qq-customer').value = val;
      const titleEl = document.getElementById('qq-title');
      if (titleEl && !titleEl.value.trim()) {
        titleEl.value = `${val} - Quotation`;
      }
    });

    // Salesperson autocomplete
    setupQuickAutocomplete('qq-salesperson', 'qq-salesperson-suggest', 'Sales Person', 'sales_person_name', (val) => {
      document.getElementById('qq-salesperson').value = val;
    });

    // Item autocomplete
    setupQuickAutocomplete('qq-item', 'qq-item-suggest', 'Item', 'item_code', (val) => {
      document.getElementById('qq-item').value = val;
    });

    // Debounce Utility
    function debounce(func, wait) {
      let timeout;
      return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
      };
    }

    // ---- Quotation Filter Listeners (lazy element lookup for robustness) ----
    function forceReloadQuotations() {
      if (window.lastLoaded) window.lastLoaded["quotations"] = 0;
      loadQuotationList(true);
    }

    document.addEventListener("input", function(e) {
      if (e.target && e.target.id === "qlist-search") {
        clearTimeout(window._qSearchTimer);
        window._qSearchTimer = setTimeout(() => {
          qSearchText = e.target.value.trim();
          qOffset = 0;
          forceReloadQuotations();
        }, 400);
      }
    });

    document.addEventListener("change", function(e) {
      if (e.target && e.target.id === "qlist-status") {
        qStatusValue = e.target.value || ""; qOffset = 0; forceReloadQuotations();
      }
      if (e.target && e.target.id === "qlist-page-length") {
        qPageLength = Number(e.target.value || "20"); qOffset = 0; forceReloadQuotations();
      }
    });

    document.addEventListener("click", function(e) {
      if (e.target && e.target.id === "qlist-prev") {
        if (qOffset === 0) return; qOffset = Math.max(0, qOffset - qPageLength); forceReloadQuotations();
      }
      if (e.target && e.target.id === "qlist-next") {
        if (!qHasMore) return; qOffset += qPageLength; forceReloadQuotations();
      }
    });

    /* ---------- ENQUIRIES LIST (Native) ---------- */
    let cePageLength = 20;
    let ceHasMore = false;
    let ceSearchText = "";
    let ceStatusValue = "";

    const CE_LIST_PATH = "powerstar_salestrack.omnis_dashboard.get_omnis_ces"; // Method name

    // Helper: Age Badge (Global)
    function getGlobalAgeBadge(dateStr) {
      if (!dateStr) return '<span style="color:#888;">-</span>';
      const d = dateStr.length === 10 ? new Date(dateStr + "T00:00:00") : new Date(dateStr);
      const now = new Date();
      const days = Math.floor((now - d) / (1000 * 60 * 60 * 24));
      let cls = "background:rgba(22,163,74,.1);color:#16a34a;"; // green
      if (days >= 30) cls = "background:rgba(220,38,38,.1);color:#dc2626;"; // red
      else if (days >= 14) cls = "background:rgba(234,88,12,.1);color:#ea580c;"; // orange
      else if (days >= 7) cls = "background:rgba(202,138,4,.1);color:#ca8a04;"; // yellow
      return `<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;${cls}">${days}d</span>`;
    }

    function getStatusPillClass(s) {
      const val = String(s || "").toLowerCase();
      if (val === "open") return "background:rgba(34,197,94,.12);border:1px solid rgba(34,197,94,.35);color:#15803d;";
      if (val === "lost") return "background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.35);color:#dc2626;";
      if (val === "quotation") return "background:rgba(99,102,241,.12);border:1px solid rgba(99,102,241,.35);color:#4f46e5;";
      if (val === "converted") return "background:rgba(16,185,129,.12);border:1px solid rgba(16,185,129,.35);color:#059669;";
      return "border:1px solid #e5e7eb;color:#374151;";
    }

    /* ---------- WHATSAPP TEST REMINDER LOGIC ---------- */
    window.omnisSafeEncode = (obj) => {
      try { return btoa(unescape(encodeURIComponent(JSON.stringify(obj)))); } catch (e) { return ""; }
    };

    window.previewWhatsAppReminder = async function (qtnName) {
      if (!CURRENT_SYSTEM) return;
      const base = CURRENT_SYSTEM.baseUrl.replace(/\/$/, "");

      // Hide options modal if open
      document.getElementById("qtn-opts-overlay")?.classList.add("hidden");

      try {
        omnisLog("Fetching WhatsApp preview for " + qtnName + "...");

        const payload = window.omnisSafeEncode({ quotation_name: qtnName, preview: true });

        const res = await window.callFrappeSequenced(base, "powerstar_salestrack.omnis_dashboard.test_whatsapp_reminder", {
          payload: payload
        });

        const data = res.message || res;
        if (!data.ok) {
          alert("Error: " + (data.error || "Could not generate preview"));
          return;
        }

        // Populate Preview Modal
        document.getElementById("wp-recipient").textContent = "Recipient: " + data.recipient + " (" + data.mobile_no + ")";
        document.getElementById("wp-body-preview").textContent = data.body.replace(/\*/g, ""); // strip markdown * for simple preview

        const btnContainer = document.getElementById("wp-buttons-preview");
        btnContainer.innerHTML = "";
        if (data.buttons) {
          data.buttons.forEach(b => {
            const span = document.createElement("span");
            span.className = "wp-btn-preview";
            span.textContent = b.text;
            btnContainer.appendChild(span);
          });
        }

        // Show Modal
        const overlay = document.getElementById("whatsapp-preview-overlay");
        overlay.classList.remove("hidden");

        // Store name for the Send button
        document.getElementById("btn-wp-send").onclick = () => window.sendWhatsAppReminder(qtnName);
      } catch (e) {
        alert("Failed to fetch preview: " + e.message);
      }
    };

    window.sendWhatsAppReminder = async function (qtnName) {
      if (!confirm("Send this test notification now?")) return;

      const base = CURRENT_SYSTEM.baseUrl.replace(/\/$/, "");
      const btnSend = document.getElementById("btn-wp-send");
      btnSend.disabled = true;
      btnSend.textContent = "Sending...";

      try {
        // Small delay to ensure any previous requests are settled
        await new Promise(r => setTimeout(r, 400));

        // Base64 encode to bypass picky WAFs
        const payload = window.omnisSafeEncode({ quotation_name: qtnName, preview: false, _t: Date.now() });

        const res = await window.callFrappeSequenced(base, "powerstar_salestrack.omnis_dashboard.test_whatsapp_reminder", {
          payload: payload
        });

        const data = res.message || res;
        if (data.ok) {
          alert("Success! " + data.message);
          document.getElementById("whatsapp-preview-overlay").classList.add("hidden");
        } else {
          alert("Failed: " + data.error);
        }
      } catch (e) {
        alert("Error: " + e.message);
      } finally {
        btnSend.disabled = false;
        btnSend.textContent = "Send Test Message";
      }
    };

    // Close handlers
    document.getElementById("btn-wp-close")?.addEventListener("click", () => {
      document.getElementById("whatsapp-preview-overlay").classList.add("hidden");
    });

    // Wire up the button in the main Quotation Options modal
    document.getElementById("btn-opts-test-zap")?.addEventListener("click", () => {
      const qtnName = document.getElementById("qtn-opts-name").textContent;
      window.previewWhatsAppReminder(qtnName);
    });

    async function loadCeList(force = false) {
      const celistBody = document.getElementById("celist-body");
      const celistInfo = document.getElementById("celist-info");
      const celistError = document.getElementById("celist-error");
      if (!celistBody) return;

      // 1. OFFLINE-FIRST: Try to load from local SQLite cache first
      try {
        if (window.frappeAPI && typeof window.frappeAPI.getCached === 'function') {
          const cached = await window.frappeAPI.getCached('enquiries');
          if (cached && cached.ok && cached.data && cached.data.length > 0) {
            console.log(`[OfflineFix] Loaded ${cached.data.length} enquiries from SQLite cache.`);
            renderCeTable(cached.data);
            if (celistInfo) celistInfo.textContent = "Showing offline results...";
          }
        }
      } catch (ce) { console.warn("Offline cache load failed:", ce); }

      // 5-minute TTL check
      const now = Date.now();
      if (!force && window.lastLoaded['enquiries'] && (now - window.lastLoaded['enquiries'] < 300000)) {
        console.log("Enquiries fresh (under 5m), skipping fresh fetch.");
        return;
      }

      loadEnquiriesKPI();
      if (!CURRENT_SYSTEM) return;
      const base = CURRENT_SYSTEM.baseUrl.replace(/\/$/, "");

      if (celistInfo) celistInfo.textContent = "Refreshing…";
      if (celistError) celistError.style.display = "none";
      setSyncState("syncing");

      try {
        const params = new URLSearchParams({
          start: String(ceOffset),
          page_length: String(cePageLength)
        });
        if (ceSearchText) params.set("search", ceSearchText);
        if (ceStatusValue) params.set("status", ceStatusValue);

        const res = await window.callFrappeSequenced(base, CE_LIST_PATH, Object.fromEntries(params));

        window.lastLoaded['enquiries'] = Date.now();
        const msg = res.message || res;
        if (!msg || msg.ok !== true) throw new Error(msg?.error || "Server returned ok=false");

        const rows = msg.data || [];
        ceHasMore = !!msg.has_more;

        renderCeTable(rows);
        if (celistInfo) celistInfo.textContent = rows.length > 0 ? `Showing ${ceOffset + 1} - ${ceOffset + rows.length}` : "No records";

        if (document.getElementById("celist-prev")) document.getElementById("celist-prev").disabled = ceOffset === 0;
        if (document.getElementById("celist-next")) document.getElementById("celist-next").disabled = !ceHasMore;
      } catch (e) {
        console.error("Enquiry list error:", e);
        if (celistInfo) celistInfo.textContent = "Error refreshing list";
      } finally {
        setSyncState("synced");
      }
    }

    function renderCeTable(rows) {
      const celistBody = document.getElementById("celist-body");
      if (!celistBody) return;
      celistBody.innerHTML = "";
      if (!rows || !rows.length) {
        celistBody.innerHTML = `<tr><td colspan="8" style="color:#6b7280;padding:10px;">No enquiries found.</td></tr>`;
        return;
      }
      rows.forEach(r => {
        const ce = r.name || "";
        const customer = window._cleanCust(r.party_name || r.customer_name || "");
        const title = r.title || "";
        const status = r.status || "";
        const sp = r.custom_salesperson || r.sales_person || r.opportunity_owner || r.owner || "";
        const company = r.company || "";
        const amt = (r.opportunity_amount != null ? "$" + Number(r.opportunity_amount).toLocaleString() : "-");

        const tr = document.createElement("tr");
        tr.innerHTML = `
                 <td><span class="ce-id" style="font-weight:700;">${ce}</span></td>
                 <td style="font-weight:500;">${customer}</td>
                 <td style="color:#6b7280;">${title}</td>
                 <td>${getGlobalAgeBadge(r.transaction_date)}</td>
                 <td><span style="display:inline-flex;align-items:center;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:700;${getStatusPillClass(status)}">${status}</span></td>
                 <td style="color:#6b7280;">${sp}</td>
                 <td style="color:#6b7280;">${company}</td>
                 <td class="text-right" style="font-weight:600;">${amt}</td>
                `;
        celistBody.appendChild(tr);
      });
    }

    // CE Listeners
    const celistSearch = document.getElementById("celist-search");
    if (celistSearch) celistSearch.addEventListener("input", debounce(() => {
      ceSearchText = celistSearch.value.trim();
      ceOffset = 0;
      loadCeList();
    }, 500));

    const celistStatus = document.getElementById("celist-status");
    if (celistStatus) celistStatus.addEventListener("change", () => { ceStatusValue = celistStatus.value || ""; ceOffset = 0; loadCeList(); });

    const celistPageLen = document.getElementById("celist-page-length");
    if (celistPageLen) celistPageLen.addEventListener("change", () => { cePageLength = Number(celistPageLen.value || "20"); ceOffset = 0; loadCeList(); });

    const celistRefresh = document.getElementById("celist-refresh");
    if (celistRefresh) celistRefresh.addEventListener("click", () => { ceOffset = 0; loadCeList(); });

    const celistPrevBtn = document.getElementById("celist-prev");
    if (celistPrevBtn) celistPrevBtn.addEventListener("click", () => { if (ceOffset === 0) return; ceOffset = Math.max(0, ceOffset - cePageLength); loadCeList(); });

    const celistNextBtn = document.getElementById("celist-next");
    if (celistNextBtn) celistNextBtn.addEventListener("click", () => { if (!ceHasMore) return; ceOffset += cePageLength; loadCeList(); });

    /* ---------- DASHBOARD KPIs ---------- */

    // Expose for external scripts (like orders_logic.js)
    window.callFrappe = callFrappe;

    /**
     * Sequencer: Enforces serial execution of async tasks.
     * Prevents "request storms" by processing network calls one-by-one.
     */
    class Sequencer {
      constructor() {
        this.queue = Promise.resolve();
      }
      async add(task) {
        const result = this.queue.then(task);
        this.queue = result.catch(() => { }); // Continue queue even if task fails
        return result;
      }
    }
    window.frappeSequencer = new Sequencer();

    // ------------------------------------------------------------
    //  Diagnostic Bridge: Pipe Renderer Errors to Main Process
    // ------------------------------------------------------------
    window.onerror = function (msg, url, lineNo, columnNo, error) {
      if (window.frappeAPI && window.frappeAPI.send) {
        window.frappeAPI.send('renderer:error', {
          error: msg,
          stack: error ? error.stack : 'No stack',
          url: url + ':' + lineNo + ':' + columnNo
        });
      }
      return false;
    };

    window.onunhandledrejection = function (event) {
      if (window.frappeAPI && window.frappeAPI.send) {
        window.frappeAPI.send('renderer:error', {
          error: 'Unhandled Rejection: ' + (event.reason ? event.reason.message : 'Unknown'),
          stack: event.reason ? event.reason.stack : 'No stack',
          url: 'Promise Rejection'
        });
      }
    };

    // Bridge console.error and console.warn for deep diagnostics
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    console.error = function () {
      if (window.frappeAPI && window.frappeAPI.send) {
        window.frappeAPI.send('renderer:error', {
          error: '[Console Error] ' + Array.from(arguments).join(' '),
          stack: new Error().stack,
          url: 'Console'
        });
      }
      originalConsoleError.apply(console, arguments);
    };
    console.warn = function () {
      if (window.frappeAPI && window.frappeAPI.send) {
        window.frappeAPI.send('renderer:error', {
          error: '[Console Warn] ' + Array.from(arguments).join(' '),
          stack: 'N/A',
          url: 'Console'
        });
      }
      originalConsoleWarn.apply(console, arguments);
    };

    /**
     * Sequenced CallFrappe: A wrapper that forces the request into the global queue.
     */
    window.callFrappeSequenced = async (baseUrl, method, params, httpMethod = "POST") => {
      return window.frappeSequencer.add(() => window.callFrappe(baseUrl, method, params, httpMethod));
    };

    // Transport Safety State
    window.appStartedAt = Date.now();
    window.frappeCircuitOpenedUntil = 0;
    window.lastLoaded = {}; // Navigation Caching State

    // API Performance Metrics
    window.apiMetrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalLatency: 0,
      lastLatency: 0,
      avgLatency: 0,
      lastRequestAt: null,
      lastError: null,
      status: "Healthy",
      endpoints: {}
    };

    async function callFrappe(baseUrl, method, params, httpMethod = "POST") {
      const startTime = Date.now();
      window.apiMetrics.totalRequests++;
      window.apiMetrics.lastRequestAt = new Date().toLocaleTimeString();

      // 0. Circuit Breaker Check
      if (Date.now() < window.frappeCircuitOpenedUntil) {
        const remaining = Math.ceil((window.frappeCircuitOpenedUntil - Date.now()) / 1000);
        window.apiMetrics.failedRequests++;
        window.apiMetrics.lastError = `Circuit breaker active (${remaining}s)`;
        throw new Error(`Circuit breaker active.Network paused for ${remaining}s to prevent IP block.`);
      }

      omnisLog(`Calling ${method} (${httpMethod})...`);
      // Stealth Mode: Add randomized query param to avoid static URL pattern matching
      const url = baseUrl + "/api/method/" + method + "?_s=" + Math.random().toString(36).substring(7);

      // 1. Prepare Base64 Payload for WAF Bypass (Global 417 Fix)
      const encodedData = window.omnisSafeEncode(params || {});
      const bypassPayload = { d: encodedData };
      
      // Safety: Only use header for small payloads to avoid 400 Header Too Large
      const customHeaders = {};
      if (encodedData.length < 4000) {
        customHeaders["X-Omnis-Data"] = encodedData;
      }

      let responseData = null;

      // 1. Try IPC (Robust, handles CORS/Headers/SSL via Main Process)
      if (window.frappeAPI && window.frappeAPI.request) {
        try {
          const ipcUrl = (httpMethod.toUpperCase() === "GET") ? (url + (url.includes("?") ? "&" : "?") + new URLSearchParams(bypassPayload).toString()) : url;
          const res = await window.frappeAPI.request({
            url: ipcUrl,
            method: httpMethod,
            data: (httpMethod.toUpperCase() === "GET") ? {} : bypassPayload,
            headers: customHeaders,
            syncCookies: true
          });

          if (res.ok) {
            omnisLog(`Success calling ${method} (via IPC)`);
            responseData = res.data;
          } else {
            // Stop immediately if it's an auth error to prevent retry storms
            if (res.status === 401 || res.status === 403 || res.status === 429) {
              omnisLog(`Security Alert ${res.status} for ${method}. Opening circuit.`, "error");
              window.frappeCircuitOpenedUntil = Date.now() + 5000; // Pause for 5s
              throw new Error(`Authentication failed (${res.status}). Circuit breaker opened.`);
            }
            // If IPC returns { ok: false, error: ... }
            throw new Error(res.error || `IPC Call Failed: ${res.status}`);
          }
        } catch (err) {
          // If we already threw an auth error, don't fallback to fetch
          if (err.message.includes("Authentication failed") || err.message.includes("Circuit breaker")) throw err;

          omnisLog(`IPC failed for ${method}: ${err.message}. Trying Fetch fallback...`, "warning");
        }
      }

      // 2. Fallback to Fetch (Standard Browser) if no response yet
      if (responseData === null) {
        try {
          // Startup Delay: If in first 5 seconds, add 1s padding for Fetch fallbacks
          if (Date.now() - window.appStartedAt < 5000) {
            omnisLog(`Startup Safety: Delaying fetch fallback for ${method}...`);
            await new Promise(r => setTimeout(r, 1000));
          }

          const isPost = (httpMethod || "POST").toUpperCase() === "POST";
          const formData = new URLSearchParams();
          if (bypassPayload) {
            for (const key in bypassPayload) {
              formData.append(key, bypassPayload[key]);
            }
          }

          const fetchOptions = {
            method: httpMethod,
            headers: { 
              "Content-Type": "application/x-www-form-urlencoded",
              ...customHeaders
            },
            credentials: "include"
          };
          let fetchUrl = isPost ? url : (url + (url.includes("?") ? "&" : "?") + formData.toString());
          if (isPost) fetchOptions.body = formData.toString();
          if (!window.frappeAPI && window.location.protocol.startsWith('http')) {
              fetchUrl = '../../omnis-proxy.php?url=' + encodeURIComponent(fetchUrl);
          }

          const res = await fetch(fetchUrl, fetchOptions);

          if (!res.ok) {
            // Same guard for fetch fallback
            if (res.status === 401 || res.status === 403 || res.status === 429) {
              omnisLog(`Security Alert ${res.status} for ${method}(Fetch).Opening circuit.`, "error");
              window.frappeCircuitOpenedUntil = Date.now() + 5000;
              throw new Error(`Authentication failed(${res.status}).Circuit breaker opened.`);
            }
            throw new Error(`Fetch Failed: ${res.status} ${res.statusText} `);
          }

          const data = await res.json();
          responseData = data.data || data;
        } catch (err) {
          window.apiMetrics.failedRequests++;
          window.apiMetrics.lastError = err.message;
          window.apiMetrics.status = window.apiMetrics.failedRequests > 10 ? "Degraded" : "Healthy";
          if (typeof window.updateApiMetricsUI === 'function') window.updateApiMetricsUI();
          
          omnisLog(`Fetch failed for ${method}: ${err.message} `, "error");
          throw err;
        }
      }

      // 3. Log Success Metrics
      const latency = Date.now() - startTime;
      window.apiMetrics.successfulRequests++;
      window.apiMetrics.lastLatency = latency;
      window.apiMetrics.totalLatency += latency;
      window.apiMetrics.avgLatency = Math.round(window.apiMetrics.totalLatency / window.apiMetrics.successfulRequests);
      window.apiMetrics.status = "Healthy";
      
      if (!window.apiMetrics.endpoints[method]) window.apiMetrics.endpoints[method] = { count: 0, totalLatency: 0 };
      window.apiMetrics.endpoints[method].count++;
      window.apiMetrics.endpoints[method].totalLatency += latency;

      if (typeof window.updateApiMetricsUI === 'function') window.updateApiMetricsUI();
      
      return responseData;
    }
    // Expose for external scripts
    window.callFrappe = callFrappe;
    window.getCurrentSystem = () => (typeof CURRENT_SYSTEM !== 'undefined' ? CURRENT_SYSTEM : null);





    // Shared KPI Helper - UPDATED for Colors/Flash/Inverse
    function renderKPICard(container, c) {
      const card = document.createElement("div");
      let className = "kpi-card";
      if (c.flash) className += " flash";
      if (c.inverse) className += " inverse"; // Black card
      card.className = className;

      let valClass = "kpi-value";
      if (c.status) valClass += " " + c.status;

      card.innerHTML = `
        <div class="kpi-label" > ${c.label}</div>
        <div class="${valClass}" style="${c.color ? 'color:' + c.color : ''}">${c.value}</div>
        <div class="kpi-sub">${c.sub}</div>
      `;
      container.appendChild(card);
    }


    // loadOrdersList now managed in orders_logic.js

    /* ---------- PRODUCTS LIST ---------- */
    async function loadProductsList(force = false) {
      const tbody = document.getElementById("products-list-body");
      const statusEl = document.getElementById("products-list-status");
      if (!tbody) return;

      try {
        if (window.frappeAPI) {
          const cached = await window.frappeAPI.getCached('machine_stock');
          if (cached && cached.ok && cached.data && cached.data.length > 0) {
            renderProductsTable(cached.data);
            if (statusEl) statusEl.textContent = "Showing offline results...";
          }
        }
      } catch (ce) { console.warn("Cache load failed:", ce); }

      const now = Date.now();
      if (!force && window.lastLoaded['products'] && (now - window.lastLoaded['products'] < 300000)) return;

      if (statusEl) { statusEl.style.display = "block"; statusEl.textContent = "Refreshing products..."; }

      try {
        if (!CURRENT_SYSTEM) throw new Error("System not connected.");
        const base = CURRENT_SYSTEM.baseUrl.replace(/\/$/, "");
        const searchVal = document.getElementById("products-search")?.value || "";
        const limitVal = document.getElementById("products-page-length")?.value || "50";
        const startVal = window.currentProductsStart || 0;
        const startInt = parseInt(startVal);
        const limitInt = parseInt(limitVal);

        const res = await window.callFrappeSequenced(base, "powerstar_salestrack.omnis_dashboard.get_products_list", {
          start: startInt, page_length: limitInt, search: searchVal
        });

        window.lastLoaded['products'] = Date.now();
        const response = res.message || res;
        if (response && response.ok === false) throw new Error(response.error || "Unknown error");
        const rows = response.data || [];
        if (statusEl) statusEl.textContent = "";

        renderProductsTable(rows);
        updateProductsInfo(rows, startInt, limitInt);
      } catch (e) {
        console.error("Error loading products:", e);
        if (statusEl && tbody.innerHTML === "") statusEl.innerHTML = `<div style="color:red" > Error: ${e.message}</div> `;
      }
    }

    function renderProductsTable(rows) {
      const tbody = document.getElementById("products-list-body");
      if (!tbody) return;
      tbody.innerHTML = "";
      rows.forEach(item => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
        < td style="font-weight:700; color:var(--text-dark);" > ${item.item_code || ""}</td>
                <td>${item.item_name || ""}</td>
                <td>${item.item_group || ""}</td>
                <td style="text-align:center; font-weight:800; color:var(--accent);">${item.actual_qty || 0}</td>
                <td style="text-align:right;">$ ${item.valuation_rate ? Number(item.valuation_rate).toLocaleString(undefined, { minimumFractionDigits: 2 }) : "0.00"}</td>
      `;
        tbody.appendChild(tr);
      });
    }

    function updateProductsInfo(rows, startInt, limitInt) {
      const infoEl = document.getElementById("products-list-info");
      const btnPrev = document.getElementById("products-list-prev");
      const btnNext = document.getElementById("products-list-next");
      if (infoEl) {
        const end = startInt + rows.length;
        infoEl.textContent = rows.length > 0 ? `Showing ${startInt + 1} - ${end} ` : "No products found";
      }
      if (btnPrev) {
        btnPrev.disabled = (startInt <= 0);
        btnPrev.onclick = () => { window.currentProductsStart = Math.max(0, startInt - limitInt); loadProductsList(); };
      }
      if (btnNext) {
        btnNext.disabled = (rows.length < limitInt);
        btnNext.onclick = () => { window.currentProductsStart = startInt + limitInt; loadProductsList(); };
      }
    }

    /* ---------- CUSTOMERS LIST ---------- */
    // --- CUSTOMER MANAGEMENT ---
    window.openCustomerModal = (customer = null) => {
      const modal = document.getElementById('customerModal');
      const form = document.getElementById('customerForm');
      if (!modal) return;
      modal.style.display = 'flex';
      if (customer) {
        document.getElementById('customerModalTitle').innerText = 'Edit Customer';
        document.getElementById('customerFrappeId').value = customer.frappe_id || '';
        document.getElementById('customerName').value = customer.customer_name || '';
        document.getElementById('customerGroup').value = customer.customer_group || '';
        document.getElementById('customerName').value = customer.customer_name || '';
        document.getElementById('customerGroup').value = customer.customer_group || '';
        document.getElementById('customerTerritory').value = customer.territory || '';
        document.getElementById('customerType').value = customer.customer_type || 'Company';
        document.getElementById('customerPriceList').value = customer.default_price_list || '';
        const tier = parseInt(customer.tier) || 0;
        document.getElementById('customerTier').value = tier;
        if (window.updateStarUI) window.updateStarUI(tier);
      } else {
        document.getElementById('customerModalTitle').innerText = 'Add New Customer';
        form.reset();
        document.getElementById('customerFrappeId').value = '';
        document.getElementById('customerTier').value = 0;
        if (window.updateStarUI) window.updateStarUI(0);
      }
    };

    window.closeCustomerModal = () => {
      const modal = document.getElementById('customerModal');
      if (modal) modal.style.display = 'none';
    };

    const customerForm = document.getElementById('customerForm');
    if (customerForm) {
      customerForm.onsubmit = async (e) => {
        e.preventDefault();
        const data = {
          customer_name: document.getElementById('customerName').value,
          customer_group: document.getElementById('customerGroup').value,
          territory: document.getElementById('customerTerritory').value,
          customer_type: document.getElementById('customerType').value,
          default_price_list: document.getElementById('customerPriceList').value,
          tier: parseInt(document.getElementById('customerTier').value) || 0,
          frappe_id: document.getElementById('customerFrappeId').value || 'MANUAL-' + Date.now(),
          updated_at: new Date().toISOString()
        };

        try {
          // Use window.supabase which should be initialized globally
          const { error } = await window.supabase.from('customers').upsert(data);
          if (error) throw error;
          
          if (window.showToast) window.showToast('Customer saved successfully!', 'success');
          else alert('Customer saved successfully!');
          
          closeCustomerModal();
          if (typeof loadCustomersList === 'function') loadCustomersList(true);
        } catch (err) {
          console.error('Error saving customer:', err);
          if (window.showToast) window.showToast('Failed to save customer: ' + err.message, 'error');
          else alert('Failed to save customer: ' + err.message);
        }
      };
    }

    function updateCustomersInfo(rows, start, limit, total) {
      const info = document.getElementById("customers-list-info");
      if (!info) return;
      const end = start + rows.length;
      info.textContent = `Showing ${rows.length > 0 ? start + 1 : 0} - ${end} of ${total || rows.length} customers`;
      
      const btnPrev = document.getElementById("customers-list-prev");
      const btnNext = document.getElementById("customers-list-next");
      if (btnPrev) {
        btnPrev.disabled = (start === 0);
        btnPrev.onclick = () => { window.currentCustomersStart = Math.max(0, start - limit); loadCustomersList(true); };
      }
      if (btnNext) {
        btnNext.disabled = (rows.length < limit);
        btnNext.onclick = () => { window.currentCustomersStart = start + limit; loadCustomersList(true); };
      }
    }

    async function loadCustomersList(force = false) {
      const tbody = document.getElementById("customers-list-body");
      const statusEl = document.getElementById("customers-list-status");
      if (!tbody) return;

      const now = Date.now();
      if (!force && window.lastLoaded['customers'] && (now - window.lastLoaded['customers'] < 30000)) return;
      if (statusEl) { statusEl.style.display = "block"; statusEl.textContent = "Fetching from Supabase..."; }

      try {
        const searchVal = document.getElementById("customers-search")?.value || "";
        const limitVal = document.getElementById("customers-page-length")?.value || "50";
        const startVal = window.currentCustomersStart || 0;
        const startInt = parseInt(startVal);
        const limitInt = parseInt(limitVal);

        let query = window.supabase
          .from('customers')
          .select('*', { count: 'exact' })
          .order('customer_name', { ascending: true })
          .range(startInt, startInt + limitInt - 1);

        if (searchVal) {
          query = query.or(`customer_name.ilike.%${searchVal}%,frappe_id.ilike.%${searchVal}%`);
        }

        const { data, count, error } = await query;
        if (error) throw error;

        window.lastLoaded['customers'] = Date.now();
        if (statusEl) statusEl.textContent = "";

        updateCustomersInfo(data || [], startInt, limitInt, count);
        renderCustomersTable(data || []);
        
        if (window.frappeAPI && data) {
          await window.frappeAPI.setCached('customers', { ok: true, data });
        }
      } catch (e) {
        console.error("Error loading customers from Supabase:", e);
        if (statusEl) statusEl.textContent = "Error: " + e.message;
      }
    }

    function renderStars(count) {
      let html = '';
      const c = parseInt(count) || 0;
      for (let i = 1; i <= 5; i++) {
        html += `<i class="fas fa-star" style="color: ${i <= c ? '#fbbf24' : '#e2e8f0'}; font-size: 11px; margin-right: 2px;"></i>`;
      }
      return html;
    }

    function renderCustomersTable(rows, baseUrl) {
      const tbody = document.getElementById("customers-list-body");
      if (!tbody) return;
      tbody.innerHTML = "";

      if (!rows || rows.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:40px; color:#64748b;">No customers found matching your criteria.</td></tr>';
        return;
      }

      rows.forEach(customer => {
        const row = document.createElement("tr");
        row.style.cursor = "pointer";
        row.onclick = () => window.openCustomerModal(customer);

        const imgHtml = `<div style="width:36px; height:36px; border-radius:10px; background:var(--accent-gradient); color:white; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:14px;">${customer.customer_name?.[0] || 'C'}</div>`;

        row.innerHTML = `
          <td>${imgHtml}</td>
          <td style="font-weight: 700; color: #1e293b;">${window._cleanCust(customer.customer_name) || '-'}</td>
          <td style="color: #64748b; font-weight: 500;">${customer.customer_group || '-'}</td>
          <td style="color: #64748b;">${customer.territory || '-'}</td>
          <td style="color: #64748b;">${customer.frappe_id || '-'}</td>
          <td>${renderStars(customer.tier)}</td>
        `;
        tbody.appendChild(row);
      });
    }

    async function loadGroupSalesKPI() {
      const ctr = document.getElementById("sales-kpi-row") || document.getElementById("kpi-container") || document.getElementById("kpi-group-sales");
      if (!ctr) return;
      try {
        if (!CURRENT_SYSTEM) return;
        const base = CURRENT_SYSTEM.baseUrl.replace(/\/$/, "");
        
        // Extract filters from UI
        const searchVal = document.getElementById("group-sales-search")?.value || "";
        const companyVal = document.getElementById("group-sales-company")?.value || "";
        const fromDate = document.getElementById("gs-from-date")?.value || "";
        const toDate = document.getElementById("gs-to-date")?.value || "";

        const res = await window.callFrappeSequenced(base, "powerstar_salestrack.omnis_dashboard.get_omnis_group_sales_kpi", {
          search: searchVal,
          company: companyVal,
          from_date: fromDate,
          to_date: toDate
        });
        const data = (res.message || res).data;
        ctr.innerHTML = "";
        if (!data) return;
        const cards = [
          { label: "THIS MONTH", value: data.sales_this_month, sub: "Units Closed", status: "positive", icon: "fa-calendar-check" },
          { label: "YTD SALES", value: data.sales_ytd, sub: "Cumulative units", status: "neutral", icon: "fa-chart-line" },
          { label: "TOP SECTOR", value: data.top_sector || "-", sub: "Highest Volume", status: "neutral", icon: "fa-industry" },
          { label: "TOP SALESPERSON", value: data.top_salesperson || "-", sub: "Best Performer", status: "positive", icon: "fa-trophy" },
          { label: "ACTIVE CUSTOMERS", value: data.active_dealers, sub: "Unique Entities", status: "neutral", icon: "fa-users" },
          { label: "TOP MODEL", value: data.top_model, sub: "Best Selling Model", status: "warning", icon: "fa-truck" }
        ];
        ctr.innerHTML = "";
        cards.forEach(c => {
          const card = document.createElement("div");
          card.className = "mxg-kpi-card";
          card.innerHTML = `
            <div style="position: absolute; right: -5px; bottom: -15px; opacity: 0.12; font-size: 85px; color: rgba(139, 34, 25, 1); transform: rotate(-10deg); pointer-events: none;">
              <i class="fas ${c.icon}"></i>
            </div>
            <div class="mxg-kpi-label" style="position: relative; z-index: 1;">${c.label}</div>
            <div class="mxg-kpi-value ${c.status}" style="position: relative; z-index: 1;">${c.value}</div>
            <div class="mxg-kpi-sub" style="position: relative; z-index: 1;">${c.sub}</div>
          `;
          ctr.appendChild(card);
        });
        if (ctr.id === "kpi-group-sales" && cards.length > 0) {
          // If it's the hidden one, optionally you could move it or show it, 
          // but for now we'll rely on the header button we just added.
        }
      } catch (e) { console.error(e); }
    }

    async function loadGroupSalesList(force = false) {
      const tbody = document.getElementById("group-sales-list-body");
      const statusEl = document.getElementById("group-sales-list-status");
      if (!tbody) { console.error('[SalesEntries] tbody#group-sales-list-body not found in DOM'); return; }

      console.log('[SalesEntries] loadGroupSalesList called, force=', force, 'CURRENT_SYSTEM=', CURRENT_SYSTEM?.key);

      // 1. OFFLINE-FIRST: Try to load from local SQLite cache first
      try {
        if (window.frappeAPI) {
          const cached = await window.frappeAPI.getCached('group_sales');
          if (cached && cached.ok && cached.data && cached.data.length > 0) {
            console.log(`[SalesEntries] Loaded ${cached.data.length} group sales from SQLite cache.`);
            renderGroupSalesTable(cached.data);
            if (statusEl) { statusEl.style.display = 'block'; statusEl.textContent = "Showing cached results..."; }
          }
        }
      } catch (ce) { console.warn("[SalesEntries] Offline cache load failed:", ce); }

      // 5-minute TTL check
      const now = Date.now();
      if (!force && window.lastLoaded['group_sales'] && (now - window.lastLoaded['group_sales'] < 300000)) {
        console.log("[SalesEntries] Group Sales fresh (under 5m), skipping fresh fetch.");
        return;
      }

      loadGroupSalesKPI();
      if (!CURRENT_SYSTEM) {
        console.error('[SalesEntries] CURRENT_SYSTEM is null — cannot fetch sales data');
        tbody.innerHTML = `<div style="padding:40px; text-align:center; color:#ef4444; background:white; border-radius:12px; border:1px solid #fecaca;">System not initialised. Please refresh the app.</div>`;
        return;
      }
      const base = CURRENT_SYSTEM.baseUrl.replace(/\/$/, "");
      console.log('[SalesEntries] Fetching from base:', base);

      if (statusEl) {
        statusEl.style.display = "block";
        statusEl.textContent = "Loading sales entries...";
      }

      try {
        const searchVal = document.getElementById("group-sales-search")?.value || "";
        const companyVal = document.getElementById("group-sales-company")?.value || "";
        const fromDate = document.getElementById("gs-from-date")?.value || "";
        const toDate = document.getElementById("gs-to-date")?.value || "";
        const limitVal = document.getElementById("group-sales-list-limit")?.value || "50";
        const startVal = window.currentGroupSalesStart || 0;
        const startInt = parseInt(startVal);
        const limitInt = parseInt(limitVal);

        const savedCircuit = window.frappeCircuitOpenedUntil || 0;
        window.frappeCircuitOpenedUntil = 0; // Bypass circuit breaker for guest endpoint
        let res;
        try {
          res = await window.callFrappeSequenced(base, "powerstar_salestrack.omnis_dashboard.get_group_sales_list", {
            start: startInt,
            page_length: limitInt,
            search: searchVal,
            company: companyVal,
            from_date: fromDate,
            to_date: toDate
          });
        } finally {
          window.frappeCircuitOpenedUntil = savedCircuit;
        }

        console.log('[SalesEntries] Raw API response:', res);
        window.lastLoaded['group_sales'] = Date.now();
        const response = res.message || res;
        if (response && response.ok === false) throw new Error(response.error || "Unknown error");

        const rows = response.data || [];
        const totalCount = response.total_count || rows.length;
        console.log(`[SalesEntries] Received ${rows.length} rows, total_count=${totalCount}`);
        if (statusEl) { statusEl.style.display = 'none'; statusEl.textContent = ""; }

        renderGroupSalesTable(rows);
        updateGroupSalesInfo(rows, startInt, limitInt, totalCount);
      } catch (e) {
        console.error("[SalesEntries] Error loading group sales:", e);
        if (statusEl) {
          statusEl.style.display = 'block';
          statusEl.innerHTML = `<div style="padding:20px; color:#ef4444; font-weight:700; background:#fef2f2; border-radius:8px; border:1px solid #fecaca; margin:16px 0;"><i class="fas fa-exclamation-circle"></i> Failed to load: ${e.message}</div>`;
        }
        // Show error in the table body too so it's clearly visible
        if (tbody) {
          tbody.innerHTML = `<div style="padding:40px; text-align:center; color:#ef4444; background:white; border-radius:12px; border:1px solid #fecaca;">Could not load sales entries.<br><small style="color:#64748b; font-weight:500;">${e.message}</small></div>`;
        }
      }
    }

    function renderGroupSalesTable(rows) {
      window._lastGroupSalesRows = rows; // Cache for edit pre-fill
      const tbody = document.getElementById("group-sales-list-body");
      if (!tbody) return;
      tbody.innerHTML = "";
      
      if (rows.length === 0) {
        tbody.innerHTML = `<div style="padding:40px; text-align:center; color:#94a3b8; background:white; border-radius:12px; border:1px dashed #e2e8f0;">No matching records.</div>`;
        return;
      }

      rows.forEach(item => {
        const dateStr = item.order_date ? formatDate(item.order_date) : "-";
        const row = document.createElement("div");
        row.className = "ai-order-row ai-sales-grid";
        row.style.borderRadius = "12px";
        row.style.borderLeft = "4px solid var(--accent-maroon)";
        
        row.innerHTML = `
          <div class="ai-order-cell">
            <span class="cell-label">Customer</span>
            <div style="font-weight:700; color:#1e293b; font-size:14px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${escapeHtml((item.customer || '').replace(/^"|"$/g, ''))}">${escapeHtml((item.customer || '').replace(/^"|"$/g, ''))}</div>
          </div>
          <div class="ai-order-cell">
            <span class="cell-label">Brand</span>
            <div style="font-weight:600; color:#64748b; font-size:12px;">${escapeHtml(item.oem || "")}</div>
          </div>
          <div class="ai-order-cell">
            <span class="cell-label">Model</span>
            <div style="font-weight:800; color:#0f172a; font-size:13px; line-height:1.2;">${escapeHtml(item.model || "")}</div>
          </div>
          <div class="ai-order-cell">
            <span class="cell-label">Lead Time</span>
            <div style="font-weight:600; color:#8b2219; font-size:12px;">${escapeHtml(item.committed_lead_time || "-")}</div>
          </div>
          <div class="ai-order-cell">
            <span class="cell-label">Condition</span>
            <div style="display:inline-block; padding:2px 8px; background:#f1f5f9; border-radius:4px; font-size:10px; font-weight:800; color:#475569; text-transform:uppercase;">${escapeHtml(item.machine_condition || "NEW")}</div>
          </div>
          <div class="ai-order-cell" style="text-align:center;">
            <span class="cell-label">Qty</span>
            <div style="font-weight:900; font-size:15px; color:#1e293b;">${item.qty || "1"}</div>
          </div>
          <div class="ai-order-cell" style="text-align:center;">
            <span class="cell-label">Date</span>
            <div style="font-weight:600; font-size:12px; color:#64748b;">${dateStr}</div>
          </div>
          <div class="ai-order-row-actions" style="text-align:right; display:flex; gap:8px; justify-content:flex-end;">
            <button class="btn-text-action btn-delete-gs" data-name="${escapeHtml(item.name)}" onclick="window.triggerDeleteSale(this.dataset.name)" style="color:#ef4444; position:relative; z-index:10;"><i class="fas fa-trash-alt" style="pointer-events:none;"></i></button>
            <button class="btn-text-action btn-edit-gs" data-name="${escapeHtml(item.name)}" onclick="editGroupSale(this.dataset.name)" style="color:#3b82f6; position:relative; z-index:10;"><i class="fas fa-pencil-alt" style="pointer-events:none;"></i></button>
          </div>
        `;
        tbody.appendChild(row);
      });

      }

    window.triggerDeleteSale = async function(name) {
      if (window.showToast) window.showToast("Trash can clicked", "info");
      try {
        if (!name) {
          if (window.showOmnisConfirm) {
            await window.showOmnisConfirm({ title: 'Error', message: 'Cannot delete: record name is missing.', confirmText: 'OK' });
          } else alert("Cannot delete: record name missing.");
          return;
        }
        
        let confirmed = false;
        if (window.showOmnisConfirm) {
          try {
            confirmed = await window.showOmnisConfirm({
              title: 'Delete Sale Entry',
              message: 'Are you sure you want to delete this sale entry? This action cannot be undone.',
              confirmText: 'Yes, Delete',
              danger: true
            });
          } catch (ce) {
            console.error("Dialog Error:", ce);
            return;
          }
        } else {
          confirmed = confirm("Are you sure you want to delete this sale entry? This action cannot be undone.");
        }
        
        if (!confirmed) {
           return;
        }
        
        const sys = typeof CURRENT_SYSTEM !== "undefined" ? CURRENT_SYSTEM : (window.CURRENT_SYSTEM || window._CURRENT_SYSTEM);
        if (!sys || !sys.baseUrl) {
            alert("System configuration error: CURRENT_SYSTEM is not defined.");
            return;
        }
        const base = sys.baseUrl.replace(/\/$/, "");
        const formData = new FormData();
        formData.append("name", name);
        const url = base + "/api/method/powerstar_salestrack.omnis_dashboard.delete_group_sale";
        const res = await fetch(url, { method: "POST", credentials: "include", body: formData });
        const json = await res.json();
        const result = json.message || json;
        if (result && result.ok) {
          if (window.showToast) window.showToast("Sale deleted successfully", "success");
          else alert("Sale deleted successfully.");
          if (typeof loadGroupSalesList === 'function') loadGroupSalesList(true);
        } else {
          const errMsg = result?.error || "Delete failed";
          if (window.showToast) window.showToast(errMsg, "error");
          else alert(errMsg);
        }
      } catch (fatalError) {
        alert("FATAL ERROR IN DELETE: " + fatalError.message + "\n" + fatalError.stack);
      }
    };

    function editGroupSale(name) {
      if (!name) {
        window.showOmnisConfirm({ title: 'Error', message: 'Cannot edit: record name is missing.', confirmText: 'OK' });
        return;
      }
      openGroupSalesModal(name);
    }

    // Open the New Sale modal in edit mode — pre-fills all fields from the rendered row data
    async function openGroupSalesModal(name) {
      // Find the record from the last-loaded rows (stored on window for reuse)
      const row = (window._lastGroupSalesRows || []).find(r => r.name === name);

      // Open the form (resets fields first)
      window.showGroupSalesForm();

      // Track which record we're editing
      window._editingGroupSaleName = name;

      // Update modal title to indicate edit mode
      const titleEl = document.querySelector('#gs-form-overlay h2');
      if (titleEl) titleEl.textContent = 'Edit Sale';

      // Show the Push to Tracking button
      const pushBtn = document.getElementById('btn-push-tracking');
      if (pushBtn) pushBtn.style.display = 'inline-block';

      if (row) {
        // Pre-fill all fields from cached data
        document.getElementById('gs-customer').value = row.customer || '';
        if (row.order_date) document.getElementById('gs-order_date').value = row.order_date;
        document.getElementById('gs-lead-time').value = row.committed_lead_time || '';
        document.getElementById('gs-oem').value = row.oem || '';
        document.getElementById('gs-condition').value = row.machine_condition || 'New';
        document.getElementById('gs-model').value = row.model || '';
        document.getElementById('gs-qty').value = row.qty || '1';
        document.getElementById('gs-cust-status').value = row.customer_status || 'Existing';
        document.getElementById('gs-sector').value = row.sector || '';
        document.getElementById('gs-salesperson').value = row.salesperson || '';
        document.getElementById('gs-company').value = row.company || 'Machinery Exchange';
        document.getElementById('gs-comments').value = row.comments || '';
      } else {
        // Fall back to fetching from the server
        try {
          const base = CURRENT_SYSTEM.baseUrl.replace(/\/$/, '');
          const res = await window.callFrappeSequenced(base, 'frappe.client.get', { doctype: 'Group Sales', name });
          const doc = res.message || res;
          if (doc) {
            document.getElementById('gs-customer').value = doc.customer || '';
            if (doc.order_date) document.getElementById('gs-order_date').value = doc.order_date;
            document.getElementById('gs-lead-time').value = doc.committed_lead_time || '';
            document.getElementById('gs-oem').value = doc.oem || '';
            document.getElementById('gs-condition').value = doc.machine_condition || 'New';
            document.getElementById('gs-model').value = doc.model || '';
            document.getElementById('gs-qty').value = doc.qty || '1';
            document.getElementById('gs-cust-status').value = doc.customer_status || 'Existing';
            document.getElementById('gs-sector').value = doc.sector || '';
            document.getElementById('gs-salesperson').value = doc.salesperson || '';
            document.getElementById('gs-company').value = doc.company || 'Machinery Exchange';
            document.getElementById('gs-comments').value = doc.comments || '';
          }
        } catch(e) { console.error('Failed to fetch Group Sale for edit:', e); }
      }
    }

    function updateGroupSalesInfo(rows, startInt, limitInt, totalCount = 0) {
      const infoEl = document.getElementById("group-sales-list-info");
      const btnPrev = document.getElementById("group-sales-list-prev");
      const btnNext = document.getElementById("group-sales-list-next");
      const pageEl = document.getElementById("group-sales-list-page");
      const limitEl = document.getElementById("group-sales-list-limit");

      if (infoEl) {
        if (totalCount === 0 && rows.length === 0) {
          infoEl.textContent = "No sales found";
        } else {
          const end = Math.min(startInt + rows.length, totalCount);
          infoEl.textContent = `Showing ${startInt + 1}-${end} of ${totalCount}`;
        }
      }

      const totalPages = Math.max(1, Math.ceil(totalCount / limitInt));
      const currentPage = Math.floor(startInt / limitInt) + 1;

      if (pageEl) {
        pageEl.textContent = `Page ${currentPage} of ${totalPages}`;
      }

      if (btnPrev) {
        btnPrev.disabled = (currentPage <= 1);
        btnPrev.onclick = () => {
          window.currentGroupSalesStart = Math.max(0, startInt - limitInt);
          loadGroupSalesList(true); // force=true: bypass 5s cache guard
        };
      }
      if (btnNext) {
        btnNext.disabled = (currentPage >= totalPages);
        btnNext.onclick = () => {
          window.currentGroupSalesStart = startInt + limitInt;
          loadGroupSalesList(true); // force=true: bypass 5s cache guard
        };
      }

      if (limitEl) {
        limitEl.onchange = () => {
          window.currentGroupSalesStart = 0;
          loadGroupSalesList(true); // force=true: bypass 5s cache guard
        };
      }
    }


    /* ---------- DYNAMIC PILLS & MAIN CHAT LOGIC ---------- */
    function updateSmartPills(data) {
      const grid = document.getElementById("suggestions-grid");
      if (!grid) return;
      grid.innerHTML = "";

      const k = data.kpis || {};
      const orders = data.orders_preview || [];
      const ordersDue = orders.length; // Simplified for now
      const quotesTotal = k.quotations_total || 0;
      const ordersOpen = k.orders_open || 0;

      // Define pills logic
      const pills = [];
      const colors = {
        purple: "background:#f3e8ff; color:#9333ea;",
        blue: "background:#dbeafe; color:#2563eb;",
        emerald: "background:#d1fae5; color:#059669;",
        orange: "background:#ffedd5; color:#ea580c;",
        pink: "background:#fce7f3; color:#db2777;",
        gray: "background:#f3f4f6; color:#4b5563;"
      };

      /* if (quotesTotal > 0) {
        pills.push({ icon: "📄", label: "Quotations to follow up", count: quotesTotal, prompt: "Show me my open quotations", color: colors.purple });
      } */
      if (ordersOpen > 0) {
        pills.push({ icon: "📦", label: "Open Orders", count: ordersOpen, prompt: "What are my open orders?", color: colors.emerald });
      }
      // Default pills with colors
      pills.push({ icon: "âš¡", label: "Sales Performance", prompt: "How is my sales performance this month?", color: colors.orange });
      pills.push({ icon: "📝", label: "Write a follow-up email", prompt: "Draft a follow-up email for...", color: colors.blue });
      pills.push({ icon: "✨", label: "Generate Leads", prompt: "Help me find new leads", color: colors.pink });

      pills.forEach(p => {
        const btn = document.createElement("button");
        btn.className = "pill-btn";
        const style = p.color || colors.gray;
        const countHtml = p.count ? `<span class="pill-count" style="margin-left:auto; background:#f1f5f9; color:#475569; padding:2px 8px; border-radius:12px; font-size:11px;">${formatNumber(p.count)}</span>` : "";

        btn.innerHTML = `<span class="pill-icon" style="${style}">${p.icon}</span> <span>${p.label}</span> ${countHtml}`;
        btn.onclick = () => {
          const input = document.getElementById("ai-main-input");
          if (input) {
            input.value = p.prompt;
            sendMainChatMessage();
          }
        };
        grid.appendChild(btn);
      });

      // "Others" button
      const otherBtn = document.createElement("button");
      otherBtn.className = "pill-btn";
      otherBtn.style.minWidth = "auto";
      otherBtn.innerHTML = `<span>Others</span>`;
      otherBtn.onclick = () => alert("More options coming soon");
      grid.appendChild(otherBtn);

    }


    async function sendMainChatMessage() {
      // Ensure we are in chat view
      switchToView("view-chat");

      const input = document.getElementById("ai-main-input");
      const list = document.getElementById("main-chat-list");
      const scrollArea = document.getElementById("chat-content-area");
      const hero = document.getElementById("dashboard-hero");

      if (!input || !list) return;

      const text = input.value.trim();
      if (!text) return;

      // Hide hero and show list
      if (hero) hero.style.display = "none";
      if (scrollArea) scrollArea.style.display = "block";

      // User Message
      const userDiv = document.createElement("div");
      userDiv.className = "main-chat-msg user";
      userDiv.innerHTML = `
        <div class="main-chat-bubble" > ${escapeHtml(text)}</div>
          <div class="main-chat-avatar">U</div>
      `;
      list.appendChild(userDiv);

      input.value = "";
      // Auto scroll
      if (scrollArea) scrollArea.scrollTop = scrollArea.scrollHeight;

      // AI Response placeholder
      const aiDiv = document.createElement("div");
      aiDiv.className = "main-chat-msg assistant";
      aiDiv.innerHTML = `
        <div class="main-chat-avatar" style="background:linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%);" >✨</div>
          <div class="main-chat-bubble">Thinking...</div>
      `;
      list.appendChild(aiDiv);
      console.log("Omnis AI Placeholder Rendering...");
      if (scrollArea) scrollArea.scrollTop = scrollArea.scrollHeight;

      try {
        if (!CURRENT_SYSTEM) throw new Error("Please log in first.");
        const base = CURRENT_SYSTEM.baseUrl.replace(/\/$/, "");
        console.log("Sending AI request to:", base + OMNIS_AI_METHOD_PATH);

        const api_key = localStorage.getItem('omnis_openai_key') || "";
        const payload = {
          message: text,
          conversation_id: chatConversationId,
          context: { system_key: CURRENT_SYSTEM.key, base_url: CURRENT_SYSTEM.baseUrl },
          api_key: api_key
        };


        const res = await window.callFrappeSequenced(base, OMNIS_AI_METHOD_PATH, payload);
        const msg = res.message || res || {};
        const reply = msg.reply || msg.answer || msg.text || msg.message || "I didn't understand that.";

        aiDiv.querySelector(".main-chat-bubble").textContent = reply;

      } catch (e) {
        console.error("AI Chat Error:", e);
        aiDiv.querySelector(".main-chat-bubble").textContent = "Error: " + e.message;
      } finally {
        if (scrollArea) scrollArea.scrollTop = scrollArea.scrollHeight;
      }
    }

    const aiMainInput = document.getElementById("ai-main-input");
    const aiSendBtn = document.getElementById("ai-send-btn");

    if (aiMainInput) {
      aiMainInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          sendMainChatMessage();
        }
      });
    }
    if (aiSendBtn) {
      aiSendBtn.addEventListener("click", () => {
        sendMainChatMessage();
      });
    }

    function showInsightDetailsModal(dataId, title) {
      const overlay = document.getElementById("insight-modal-overlay");
      const titleEl = document.getElementById("modal-title");
      const bodyEl = document.getElementById("modal-body");

      const data = (window._insightData && window._insightData[dataId]) ? window._insightData[dataId] : [];

      titleEl.textContent = title;
      bodyEl.innerHTML = "";

      data.forEach(item => {
        const div = document.createElement("div");
        div.className = "modal-item";

        let valText = item.value ? ("$" + parseFloat(item.value).toLocaleString()) : (item.unit_count ? item.unit_count + " units" : "");
        let dateText = item.date ? item.date : "No date";

        let nestedHtml = "";
        if (item.machines && item.machines.length > 0) {
          nestedHtml = '<div class="modal-nested-list">';
          item.machines.forEach(m => {
            nestedHtml += `<div class="nested-item" > <span>📦</span> ${m}</div> `;
          });
          nestedHtml += '</div>';
        }

        div.innerHTML = `
        <div class="modal-item-top" >
            <div class="modal-item-info">
              <div class="modal-item-id">${item.id}</div>
              <div class="modal-item-sub">${window._cleanCust(item.customer)}</div>
              <div class="modal-item-date">${dateText}</div>
            </div>
            <div class="modal-item-val">${valText}</div>
          </div>
        ${nestedHtml}
      `;
        bodyEl.appendChild(div);
      });

      overlay.style.display = "flex";
    }


    function closeInsightModal() {
      document.getElementById("insight-modal-overlay").style.display = "none";
    }


    async function checkConnection(sys) {
      if (!sys) return;
      try {
        console.log("Checking connection to " + sys.name + " (" + sys.baseUrl + ")");
        // Try to fetch logged user to verify cookie
        const res = await window.callFrappeSequenced(sys.baseUrl, "frappe.auth.get_logged_user", {});
        if (res) {
          console.log("Connection OK. User verified.");
          const j = res.message || res;
          console.log("Logged user:", j.message);
        } else {
          console.warn("Connection verification failed:", res.status, res.statusText);
          const errDiv = document.getElementById("chart-error") || document.getElementById("main-subtitle");
          if (errDiv) {
            const old = errDiv.textContent;
            errDiv.innerHTML = "<span style='color:red;'>⚠️ Session lost. Please log out and in again. (" + res.status + ")</span> " + old;
          }
        }
      } catch (e) {
        console.error("Connection check network error:", e);
        const errDiv = document.getElementById("chart-error") || document.getElementById("main-subtitle");
        if (errDiv) {
          errDiv.innerHTML = "<span style='color:red;'>⚠️ Connection error: " + e.message + "</span>";
        }
      }
    }

    /* ---------- APP INIT ---------- */
    /* ---------- LOGIN FLOW ---------- */


    // Load CE Logic - REMOVED: already loaded in script tags

    function initSalestrack() {
      omnisLog("Starting initSalestrack...");
      try {
        runInitialSplash();

        const user = localStorage.getItem(LS_USER) || "Administrator";
        omnisLog("Logged user context: " + user);
        if (avatarInitials) {
          const init = (user[0] || "A").toUpperCase();
          avatarInitials.textContent = init;
          omnisLog("Set initials to: " + init);
        }

        const startKey = localStorage.getItem("omnisSystemKey");
        if (startKey) {
          CURRENT_SYSTEM = OMNIS_SYSTEMS.find(s => s.key === startKey);
        }
        if (!CURRENT_SYSTEM) CURRENT_SYSTEM = OMNIS_SYSTEMS.find(s => s.key === "salestrack") || OMNIS_SYSTEMS[0];

        omnisLog("System: " + CURRENT_SYSTEM.name + " (" + CURRENT_SYSTEM.baseUrl + ")");

        // Update topbar branding
        const topLabel = document.querySelector(".topbar-label");
        if (topLabel && CURRENT_SYSTEM) topLabel.textContent = "Omnis · " + CURRENT_SYSTEM.name;

        if (typeof setReportsNavVisibility === "function") setReportsNavVisibility();

        switchToView('view-dashboard');

        // Update Greeting with real name
        const dashUsername = document.getElementById("dash-username");
        if (dashUsername) {
          // Try to get full name, fallback to user ID
          let fullName = user;
          // check for common frappe locations for full name
          if (typeof frappe !== "undefined" && frappe.boot && frappe.boot.user && frappe.boot.user.fullname) {
            fullName = frappe.boot.user.fullname;
          } else if (typeof frappe !== "undefined" && frappe.session && frappe.session.user_fullname) {
            fullName = frappe.session.user_fullname;
          }

          // If it is an email, try to take only the name part
          if (fullName.includes("@")) {
            fullName = fullName.split("@")[0];
          }

          dashUsername.textContent = fullName;
        }

        // Personalise welcome guide
        (function() {
          let displayName = user;
          if (typeof frappe !== 'undefined' && frappe.boot && frappe.boot.user && frappe.boot.user.fullname) {
            displayName = frappe.boot.user.fullname;
          } else if (typeof frappe !== 'undefined' && frappe.session && frappe.session.user_fullname) {
            displayName = frappe.session.user_fullname;
          }
          if (displayName.includes('@')) displayName = displayName.split('@')[0];
          // Capitalise first letter of each word
          displayName = displayName.replace(/\b\w/g, c => c.toUpperCase());

          const hour = new Date().getHours();
          const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

          const greetEl = document.getElementById('welcome-greeting');
          if (greetEl) greetEl.textContent = `${timeGreeting}, ${displayName}! 👋`;

          const dateSubtitle = document.getElementById('welcome-date-subtitle');
          if (dateSubtitle) {
            const now = new Date();
            const options = { weekday: 'long', month: 'long', day: 'numeric' };
            dateSubtitle.textContent = `Today is ${now.toLocaleDateString('en-US', options)}. Overview for your fleet:`;
          }

          const avatarCircle = document.getElementById('welcome-avatar-circle');
          if (avatarCircle) avatarCircle.textContent = (displayName[0] || 'A').toUpperCase();
        })();

        // Wire up Dashboard "Ask me anything" Search Box
        const mainInput = document.getElementById("ai-main-input");
        const mainSendBtn = document.getElementById("ai-send-btn");

        function handleMainSearch() {
          const query = (mainInput.value || "").trim();
          if (!query) return;

          // Open Chat Widget
          if (typeof openChatWidget === "function") openChatWidget();

          // Transfer query to chat input and send
          if (chatInput) {
            chatInput.value = query;
            mainInput.value = ""; // clear main input
            if (typeof sendChatMessage === "function") sendChatMessage();
          }
        }

        if (mainInput) {
          mainInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") handleMainSearch();
          });
        }
        if (mainSendBtn) {
          mainSendBtn.addEventListener("click", handleMainSearch);
        }


        
        // --- AUTOMATED WHATSAPP DISPATCHER ---
        if (typeof startWhatsAppAutomatedDispatcher === 'function') {
            startWhatsAppAutomatedDispatcher();
        }

// Load data


        if (typeof refreshOnlineState === "function") refreshOnlineState();



        setTimeout(() => {
          if (appShell) appShell.classList.remove("hidden");
          if (splashOverlay) splashOverlay.classList.add("hidden");
          omnisLog("Boot sequence complete. Dashboard initialized.");
        }, 1500);

      } catch (err) {
        omnisLog("Critical Init Error: " + err.message, "error");
        const errBox = document.getElementById("omnis-fatal-error");
        if (errBox) {
          errBox.classList.remove("hidden");
          errBox.innerHTML = `< strong > Initialization Failure:</strong > ${err.message}`;
        }
        if (appShell) appShell.classList.remove("hidden");
        if (splashOverlay) splashOverlay.classList.add("hidden");
      }
    }

    window.addEventListener('DOMContentLoaded', initSalestrack);

    // ── Restore saved profile photo from localStorage ──
    window.addEventListener('DOMContentLoaded', () => {
        const saved = localStorage.getItem('omnis_profile_photo');
        if (saved) {
            const img    = document.getElementById('profile-avatar-img');
            const letter = document.getElementById('profile-avatar-letter');
            if (img && letter) {
                img.src            = saved;
                img.style.display  = 'block';
                letter.style.display = 'none';
            }
        }
    });


    function setupProductsFilters() {
      const searchInput = document.getElementById("products-search");
      const limitSelect = document.getElementById("products-page-length");

      function resetAndLoad() {
        window.currentProductsStart = 0;
        loadProductsList();
      }

      if (searchInput) {
        searchInput.addEventListener("input", debounce(resetAndLoad, 500));
      }
      if (limitSelect) {
        limitSelect.addEventListener("change", resetAndLoad);
      }

      // Auto-load on sidebar click
      const navItem = document.querySelector('.nav-item[data-view="view-products-list"]');
      if (navItem) {
        navItem.addEventListener('click', loadProductsList);
      }
    }

    window.addEventListener('DOMContentLoaded', setupProductsFilters);

    function setupCustomersFilters() {
      const searchInput = document.getElementById("customers-search");
      const limitSelect = document.getElementById("customers-page-length");

      function resetAndLoad() {
        window.currentCustomersStart = 0;
        loadCustomersList();
      }

      if (searchInput) {
        searchInput.addEventListener("input", debounce(resetAndLoad, 500));
      }
      if (limitSelect) {
        limitSelect.addEventListener("change", resetAndLoad);
      }

      const navItem = document.querySelector('.nav-item[data-view="view-customers-list"]');
      if (navItem) {
        navItem.addEventListener('click', loadCustomersList);
      }

      // Star Rating Interaction
      const stars = document.querySelectorAll("#customer-star-rating i");
      stars.forEach(star => {
        star.onclick = () => {
          const val = parseInt(star.getAttribute("data-value"));
          document.getElementById("customerTier").value = val;
          window.updateStarUI(val);
        };
      });

      window.updateStarUI = (val) => {
        document.querySelectorAll("#customer-star-rating i").forEach(s => {
          const sVal = parseInt(s.getAttribute("data-value"));
          s.style.color = sVal <= val ? "#fbbf24" : "#e2e8f0";
        });
      };
    }

    window.addEventListener('DOMContentLoaded', setupCustomersFilters);

    function setupGroupSalesFilters() {
      const searchInput = document.getElementById("group-sales-search");
      const limitSelect = document.getElementById("group-sales-page-length");

      function resetAndLoad() {
        window.currentGroupSalesStart = 0;
        loadGroupSalesList();
      }

      if (searchInput) {
        searchInput.addEventListener("input", debounce(resetAndLoad, 500));
      }
      if (limitSelect) {
        limitSelect.addEventListener("change", resetAndLoad);
      }

      // Auto-load on sidebar click
      const navItem = document.querySelector('.nav-item[data-view="view-group-sales-list"]');
      if (navItem) {
        navItem.addEventListener('click', loadGroupSalesList);
      }
    }

    window.addEventListener('DOMContentLoaded', setupGroupSalesFilters);
    function closeRiskModal() {
      const el = document.getElementById("risk-modal-overlay");
      if (el) el.style.display = "none";
    }

    function goToRiskOrders() {
      closeRiskModal();
      const navItem = document.querySelector('.nav-item[data-view="view-orders-list"]');
      if (navItem) navItem.click();
    }

    async function checkRiskPopup() {
      try {
        const today = new Date().toISOString().split("T")[0];
        const lastPopup = localStorage.getItem("lastRiskPopupDate");

        if (lastPopup === today) return; // Already shown today

        if (!CURRENT_SYSTEM) return;
        const base = CURRENT_SYSTEM.baseUrl.replace(/\/$/, "");
        const res = await window.callFrappeSequenced(base, "powerstar_salestrack.omnis_dashboard.get_dashboard_charts", { period: "This Year" });
        if (!res) return;
        const data = (res.message || res).data;

        const riskCount = (data && data.orders_at_risk) ? data.orders_at_risk.length : 0;

        if (riskCount > 0) {
          const modal = document.getElementById("risk-modal-overlay");
          const countEl = document.getElementById("risk-count");
          if (modal && countEl) {
            countEl.textContent = riskCount;
            modal.style.display = "flex";
            localStorage.setItem("lastRiskPopupDate", today);
          }
        }

      } catch (e) {
        console.error("Risk Popup Error", e);
      }
    }

    // Disabled to reduce network load/IP blocking
    // window.addEventListener('DOMContentLoaded', () => {
    //   // slight delay to let auth settle
    //   setTimeout(checkRiskPopup, 2000);
    // });
  