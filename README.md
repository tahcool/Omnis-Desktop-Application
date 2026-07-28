# Omnis Desktop Application

Omnis is a high-performance, engineering-grade command center for the Machinery Exchange and Powerstar ecosystems. It integrates multiple operational systems into a single, unified desktop interface with built-in AI assistance and WhatsApp automation....

## 🚀 Key Features

- **Unified Dashboard**: Real-time KPI tracking for Sales, Stock, and Quotations across multiple Frappe-based systems.
- **OEM Management Reports**: Automated categorical grouping and YTD performance analytics for high-level management.
- **Order Tracking Map**: Interactive logistics pipeline visualization.
- **Built-in WhatsApp Client**: Automated customer follow-ups and operational notifications directly from the dashboard.
- **Shantui Integration**: Automated alarm monitoring and fault code tracking for Shantui machinery.
- **Offline Sync**: Robust caching and synchronization manager for unstable network environments.

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3 (Vanilla), JavaScript (ES6+).
- **Backend**: Node.js, Electron.
- **Ecosystem Bridges**: Python (for complex data aggregation), Axios (IPC bridge).
- **Automation**: WhatsApp-web.js, Puppeteer.
- **Database**: SQLite (Better-SQLite3) for local caching.

## 📦 Installation

1. **Prerequisites**:
   - Node.js (v18+)
   - Python 3.10+
   - Google Chrome or Microsoft Edge (for WhatsApp integration)

2. **Clone the repository**:
   ```bash
   git clone https://github.com/tahcool/Omnis-Desktop-Application.git
   cd Omnis-Desktop-Application
   ```

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Start the application**:
   ```bash
   npm start
   ```

## 🏗️ Building for Production

To build the Windows installer (.exe):
```bash
npm run build
```
The output will be in the `dist/` directory.

## 🔒 Security & Connectivity

Omnis includes a custom **Software-Defined DNS** layer to ensure stable connectivity to backend servers even when public DNS is unstable. It automatically maps key domains to dedicated hardware IPs.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
