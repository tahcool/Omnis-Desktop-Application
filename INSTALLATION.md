# Omnis Salestrack - Installation & Setup Guide

This guide covers the technical setup for both the **Frappe Backend** and the **Electron Desktop Client**.

---

## 1. Prerequisites

### Backend (Server)
- **Frappe / ERPNext**: Version 13, 14, or 15.
- **Access**: SSH access to the server or bench console.
- **App**: You should have an existing custom app (e.g., `powerstar_salestrack`) where the Python controllers will reside.

### Frontend (Desktop Client)
- **Node.js**: Version 18.x or higher.
- **NPM**: Version 9.x or higher.
- **OS**: Windows 10/11 (Primary), macOS, or Linux.

---

## 2. Backend Setup (Frappe Server)

### Step 1: Copy the Python Controller
Copy `omnis_dashboard.py` from the root of this repository to your Frappe app's API directory:
```bash
cp omnis_dashboard.py ~/frappe-bench/apps/powerstar_salestrack/powerstar_salestrack/
```

### Step 2: Verify DocTypes
Ensure the following DocTypes exist in your Frappe site:
1.  **Group Sales**: Standard fields + `customer`, `order_date`, `committed_lead_time`, `model`, `qty`.
2.  **FMB Report**: Standard fields + `customer_name`, `order_date`, `committed_lead_time`, `status`.
    *   **Status Options**: `New Sale`, `In Progress`, `On Hold`, `Customer To Collect`, `Handed Over`, `Delivered`.
3.  **FMB Report Machine** (Child Table): Standard fields + `item`, `qty`, `target_handover_date`, `revised_handover_date`, `actual_handover_date`.

### Step 3: Restart Bench
Apply the Python changes:
```bash
bench restart
```

---

## 3. Frontend Setup (Developer Machine)

### Step 1: Clone & Install
```bash
git clone <repository-url> omnis
cd omnis
npm install
```

### Step 2: Configuration
Open `main.js` and ensure the `baseUrl` or connection strings point to your Frappe production server.

### Step 3: Run in Development Mode
```bash
npm start
```

---

## 4. Building the Desktop Installer (.exe)

To package the application for distribution:
```bash
npm run build
```
The installer will be generated in the `dist/` folder.

---

## 5. Automated Sales Automation
The system is pre-configured to automatically create **Order Tracking (FMB)** entries whenever a **Group Sale** is recorded. 
- The automation logic is located in `omnis_dashboard.py` under `_trigger_fmb_entry_from_sale`.
- It calculates the **Target Handover Date** automatically based on the **Committed Lead Time** entered during sales.

---

## 6. Troubleshooting

- **403 Forbidden**: Ensure the user has the "System Manager" role or the custom API methods are correctly whitelisted with `@frappe.whitelist()`.
- **CORS Issues**: The `main.js` script handles most CORS issues by injecting specific origins. Ensure the Frappe site's `common_site_config.json` allows the necessary origins if using a web-only build.
- **Database Column Errors**: If you see "Unknown Column", ensure you have run `bench migrate` after adding fields to DocTypes.
