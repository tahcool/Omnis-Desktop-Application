# Omnis Desktop Application

**Current version:** 4.10.8 AURORA · Windows

Omnis is the internal command centre for the Machinery Exchange, Sinopower and Powerstar group. It brings sales, fleet, after-sales and warranty operations into one desktop app, with live data from Supabase, AI assistance and WhatsApp automation. It is paired with the **Omnis Tablet** app for technicians and salespeople in the field.

## 🚀 Key Features

### SalesTrack
- **Quotations:** Machinery Exchange and Sinopower quote templates as PDFs, a per-item **Duty %** on Sinopower quotes, a remembered company, customer contacts, and AI spec formatting.
- **Quote lifecycle:** follow-up (QFU) stages, hot leads and customer enquiries (CEs).
- **Stock pipeline:** in production → shipped → en route → **stock on hand**, with earmarked customers and a monthly arrivals calendar.
- **Order tracking:** the equipment order pipeline with status emails.
- **Customer visits:** logged from the tablets, plus after-sales handovers and operator certificates.

### Fleetrack
- **Daily Breakdown Report (DBR):** efficiency %, breakdowns from tablets (accept/reject), and HMR / serial / fleet numbers auto-filled from the machine register.
- **Field Service Planning:** technician job cards, the Proposed → Planned → In Progress → Completed flow, and an SCU filled in from the job card.
- **Technician map:** live positions and daily trails.
- **Technician tablet logins:** create, reset and remove them from the desktop.

### Warranty Management
- Claims (To Submit / Pending OEM / Approved / Rejected), machine cover, hours used vs the warranty limit, and expiry alerts.

### Automation & Reporting
- **Daily Sales Summary (WhatsApp):** an image report for MXG and SPZ, posted to the sales group at 17:30 on weekdays via a Supabase Edge Function + Whapi.
- **Desktop notifications:** urgent breakdowns, tablet submissions and job card events, each notified once.
- **OEM management reports:** YTD performance analytics.
- **Built-in WhatsApp client** for customer follow-ups.

## 🛠️ Technology Stack

- **Desktop:** Electron, Node.js, HTML5 / CSS3 / JavaScript (ES6+)
- **Data:** Supabase (PostgreSQL, Row Level Security, Edge Functions, pg_cron), with SQLite (better-sqlite3) for local caching
- **Automation:** whatsapp-web.js, Whapi, Nodemailer
- **AI:** server-side AI proxy (Supabase Edge Function)
- **Updates:** electron-updater (GitHub Releases)

## 📦 Development Setup

1. **Prerequisites:** Node.js 18+, plus Google Chrome or Microsoft Edge (for the WhatsApp integration)
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Configure environment:** create a `.env` with the Supabase URL and keys (ask the system administrator; never commit it).
4. **Run:**
   ```bash
   npm start
   ```

## 🏗️ Building the Windows Installer

```bash
npx electron-builder --win --publish never
```

The installer (`Omnis_Setup_<version>.exe`), its `.blockmap` and `latest.yml` are written to `dist/`. Upload all three to a GitHub Release so installed copies can auto-update.

## 🔒 Security & Connectivity

- Omnis includes a software-defined DNS layer, so it stays connected to backend servers when public DNS is unstable.
- Secrets (Supabase service keys, WhatsApp/Whapi tokens, AI keys) belong in environment variables or Supabase secrets. Never put them in source code.

## 📄 License

**Proprietary and confidential.** Copyright © 2026 Powerstar Investments (Private) Limited and its group companies. All rights reserved.

This software is for internal use by authorised staff only. No part of it may be copied, modified, distributed or used without prior written permission. See [LICENSE](LICENSE).
