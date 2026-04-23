# Omnis Desktop - System Architecture

## Overview
Omnis Desktop is an Electron-based application that serves as a unified interface for multiple business systems (Salestrack, Fleetrack, Engtrack, etc.). It uses web technologies (HTML/CSS/JS) wrapped in a native container to provide system access and dashboard monitoring.

## 1. Project Structure

```
c:\Users\Administrator\omnis\
├── index.html                  # ENTRY POINT: Login Screen & System Router
├── main.js                     # ELECTRON MAIN: Window management, Security, CORS
├── assets/                     # Shared Resources
│   ├── images/                 # Logos and icons
│   └── js/                     # Shared scripts (preload.js)
└── systems/                    # System-Specific Dashboards
    ├── salestrack/
    │   └── index.html          # Salestrack Dashboard & Logic
    └── fleetrack/
        └── index.html          # Fleetrack Dashboard & Logic
```

## 2. Key Workflows

### A. Initialization & Login
1.  **App Launch**: `main.js` creates the window and loads `index.html`.
2.  **Login**: User enters credentials in `index.html`.
3.  **Authentication**: The app attempts to log in sequentially to all known backend systems (Salestrack, Fleetrack, etc.) using their respective APIs.
4.  **Session Storage**: On success, the user's name and a "System Key" (e.g., `salestrack`) are stored in `localStorage`.
5.  **Redirection**: The app redirects `window.location.href` to the appropriate dashboard file (e.g., `systems/salestrack/index.html`).

### B. Dashboard Loading
1.  **File Load**: `systems/salestrack/index.html` loads.
2.  **Context**: The script reads `localStorage` to greet the user and identify the current system.
3.  **Data Fetching**:
    *   **Method**: Uses `fetch()` to call backend APIs.
    *   **Authentication**: Cookies from the initial login are automatically sent with requests (`credentials: "include"`).
    *   **API Strategy**:
        *   **Standard API**: Used for simple lookups (e.g., `frappe.auth.get_logged_user`).
        *   **Custom API**: Used for complex dashboards (e.g., `powerstar_salestrack.omnis_dashboard.get_omnis_home`) because standard `get_list` calls are restricted by server permissions (403 Forbidden).

### C. Security & Connectivity (`main.js`)
*   **CORS Handling**: `main.js` implements a "Smart Origin" strategy. It injects a custom `Origin` header for API data requests to pass CSRF checks but *omits* it for the Login endpoint (which rejects custom origins).
*   **SSL**: Self-signed certificate errors are ignored via `ignore-certificate-errors` switch to ensure connectivity in local/dev environments.

## 3. Developing & Extending

### Adding a New System
1.  Create a folder: `systems/newsystem/`.
2.  Add `index.html` (copy from Salestrack as a template).
3.  Update `OMNIS_SYSTEMS` list in the root `index.html` to include the new system key and URL.

### Modifying Data
*   **Dashboard**: Edit `loadHomeSummary` in the respective `index.html`. Ensure you use whitelisted Custom APIs if standard APIs are blocked.
*   **UI**: The dashboards use standard HTML/CSS. Assets should be placed in `assets/`.

## 4. Troubleshooting
*   **White Screen / Crash**: Check the **Console** (Ctrl+Shift+I or F12) for JavaScript errors.
*   **Login Fails**: Check `main.js` cookie settings. Ensure the server is reachable.
*   **Data Missing**: Check `Network` tab in DevTools. A `403` means permission denied (switch api method). A `401` means session lost (re-login).

## 5. Salestrack Module Architecture (Detailed)

Specific breakdown of the Salestrack system components:

### A. Backend (`omnis_dashboard.py`)
This Python controller handles all custom data fetching for the dashboard to bypass standard permission issues and aggregate data.
*   **Location**: `.../omnis/omnis_dashboard.py`
*   **Key Methods**:
    *   `get_omnis_home`: Aggregates initial dashboard summary.
    *   `get_omnis_orders_kpi`: Returns Order metrics (Total, Open, Completed, **At Risk**).
    *   `get_omnis_quotations_kpi`: Returns Quotation metrics (Pipeline, Won, Lost).
    *   `get_omnis_enquiries_kpi`: Returns Enquiry stats.
    *   `get_omnis_products_kpi` / `get_omnis_customers_kpi`: Resource counts.
    *   `update_fmb_machine_field`: **(NEW)** Handles inline updates for FMB Order fields (Notes, Handover Date).

### B. Frontend Controller (`systems/salestrack/index.html`)
This monolithic file acts as the View and Controller for the Salestrack Dashboard.
*   **Layout**:
    *   **Sidebar**: Navigation logic, **User Profile** (bottom), FAQ.
    *   **Topbar**: **KPI Container** (dynamic injection).
    *   **Main View**: Swappable content areas (`#view-dashboard`, `#view-quotations-list`, etc.).
    *   **Modals**:
        *   `#ol-risk-modal`: "Orders At Risk" daily popup.
        *   `#ol-customer-update-modal`: **(NEW)** "Send Update" popup triggered after inline edits.
*   **Key Functions**:
    *   `load...KPI()`: Fetchers for the color-coded KPI cards.
    *   `load...List()`: Data loaders for the main list views (Orders, Products, etc.).
    *   `checkRiskPopup()`: Logic for the "Orders At Risk" daily modal.
    *   `editOrderField` / `saveOrderField`: **(NEW)** Logic for inline editing of table cells with optimistic UI updates.
    *   `renderKPICard()`: Shared utility for rendering cards with status colors (Green/Amber/Red) and flash animations.

### C. Helper Logic (`systems/salestrack/create_ce_logic.js`)
*   Contains specific form validation and submission logic for the "Create Customer Enquiry" view.
*   Separated to keep the main `index.html` slightly cleaner.

### D. Visual Architecture Diagram

```mermaid
graph TD
    subgraph "Electron Client (Desktop)"
        MainJS[main.js <br/>(Security & Window Mgmt)]
        
        subgraph "Salestrack Frontend (index.html)"
            UI_Shell[App Shell]
            Sidebar[Sidebar Navigation <br/>(Profile + FAQ)]
            KPI_Bar[KPI Topbar <br/>(Dynamic Loading)]
            
            subgraph "Views"
                DashView[Dashboard View]
                ListViews[List Views <br/>(Orders, Quotes, etc.)]
                Forms[Create Forms]
            end
            
            Logic[JS Controllers <br/>(loadOrdersKPI, loadList, etc.)]
        end
    end

    subgraph "Frappe Backend (Python)"
        API[omnis_dashboard.py <br/>(Whitelist API Endpoints)]
        
        Methods[API Methods: <br/>get_omnis_home<br/>get_omnis_orders_kpi<br/>get_omnis_quotations_kpi]
    end

    subgraph "Database"
        MariaDB[(MariaDB / DocTypes)]
    end

    %% Interactions
    MainJS -->|Loads| UI_Shell
    UI_Shell --> Sidebar
    UI_Shell --> KPI_Bar
    UI_Shell --> DashView
    
    Logic -->|Fetch Data (Smart Origin)| API
    API -->|Query| MariaDB
    MariaDB -->|Return Data| API
    API -->|JSON Response| Logic
    Logic -->|Update DOM| KPI_Bar
    Logic -->|Render Table| ListViews
```
