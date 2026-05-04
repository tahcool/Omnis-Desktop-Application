# Release Notes: Omnis v2.2.12 NEXUS

**Release Date:** May 4, 2026  
**Version:** 2.2.12 NEXUS  
**Platform:** Windows (Electron)

---

## 🚀 What's New

### 📊 Management & Performance Reporting
*   **Categorical Grouping**: Improved the "Quotes and Sales" report logic to aggregate data by `item_group` (e.g., Dozer, Excavator). This provides a streamlined operational summary for management instead of listing individual units.
*   **Decoupled YTD Performance**: Year-to-Date (YTD) figures in report headers are now independent of month-specific filters. This ensures performance tracking remains stable and accurate even when drilling down into specific monthly data.
*   **Isolation of Details**: Updated the "Sales Breakdown" and detail tabs to strictly isolate records for the selected period, preventing data leakage between months in detailed views.

### 📱 Connectivity & Integration
*   **WhatsApp Engine v2**: Upgraded the internal WhatsApp client to use a remote web versioning system. This resolves the persistent "ERROR" status caused by outdated internal browser versions.
*   **Browser Stability**: Added advanced Puppeteer flags (no-sandbox, hardware acceleration tweaks) and switched to the high-compatibility "Headless: New" mode for more reliable background processing.
*   **Diagnostic Logging**: Integrated a background diagnostic log (`whatsapp_debug.log`) and improved UI error reporting to provide clear status updates during the handshake process.

### 🗺️ Navigation & UI Refinements
*   **Logical Reorganization**: Moved the "Sales" list from the Reports menu to the **Operations** dropdown, properly classifying it as an operational tool rather than a performance report.
*   **Clearer Terminology**:
    *   Renamed "Tracking" to **Order Tracking**.
    *   Renamed "Stock" to **Stock Pipeline**.
*   **UI Bugfixes**: Resolved "undefined" label errors in report notes and headers during dynamic period switching.

---

## 🛠️ Technical Improvements
*   **Repository Infrastructure**: Established a professional GitHub environment with README, MIT License, and automated build workflows.
*   **CI/CD Ready**: Configured GitHub Actions to handle automated production releases via version tags.
*   **Native Rebuild**: Successfully optimized the local `better-sqlite3` database engine for the latest Electron runtime.

---

## 📝 Important Instructions
To activate the new WhatsApp connectivity engine and UI refinements, please **uninstall any previous versions** and perform a clean installation using `Omnis_Setup_2.2.12.exe`. Ensure the application is completely closed before restarting to verify the background diagnostics.
