const { app, BrowserWindow, session, ipcMain, globalShortcut } = require("electron");
const { autoUpdater } = require("electron-updater");
const path = require("path");
const axios = require("axios");
const https = require("https");
const dns = require("dns");

// Offline Caching - Sync Manager
const syncManager = require('./lib/sync-manager');

// WhatsApp Built-in Integration
const whatsappManager = require('./lib/whatsapp-client');

// --- SOFTWARE-DEFINED DNS FOR OMNIS ECOSYSTEM ---
const SPE_IP = '102.218.13.123';
const SPE_DOMAIN = 'omnis.spareparts-exchange.com';

const SALESTRACK_IP = '102.207.50.172';
const SALESTRACK_DOMAIN = 'salestrack.powerstar.co.zw';

const FLEETRACK_IP = '102.218.13.121'; // Shared with Engtrack
const FLEETRACK_DOMAIN = 'fleetrack.machinery-exchange.com';
const ENGTRACK_DOMAIN = 'engtrack.machinery-exchange.com';
const FLEETRACK_DOMAIN_V2 = 'fleetrack.powerstar.co.zw';
const ENGTRACK_DOMAIN_V2 = 'engtrack.powerstar.co.zw';
const POWERTRACK_DOMAIN = 'powertrack.powerstar.co.zw';

// 1. Force Node.js (axios/bridge) resolution
const originalLookup = dns.lookup;
dns.lookup = (hostname, options, callback) => {
  if (hostname === SPE_DOMAIN) return callback(null, SPE_IP, 4);
  if (hostname === SALESTRACK_DOMAIN) return callback(null, SALESTRACK_IP, 4);
  if (
     hostname === FLEETRACK_DOMAIN || 
     hostname === ENGTRACK_DOMAIN || 
     hostname === FLEETRACK_DOMAIN_V2 || 
     hostname === ENGTRACK_DOMAIN_V2 || 
     hostname === POWERTRACK_DOMAIN
  ) return callback(null, FLEETRACK_IP, 4);
  return originalLookup(hostname, options, callback);
};

// 2. Force Chromium (renderer/fetch) resolution
app.commandLine.appendSwitch('host-rules', `MAP ${SPE_DOMAIN} ${SPE_IP}, MAP ${SALESTRACK_DOMAIN} ${SALESTRACK_IP}, MAP ${FLEETRACK_DOMAIN} ${FLEETRACK_IP}, MAP ${ENGTRACK_DOMAIN} ${FLEETRACK_IP}, MAP ${FLEETRACK_DOMAIN_V2} ${FLEETRACK_IP}, MAP ${ENGTRACK_DOMAIN_V2} ${FLEETRACK_IP}, MAP ${POWERTRACK_DOMAIN} ${FLEETRACK_IP}`);

// 3. Force IPv4 preference for Windows stability
if (dns.setDefaultResultOrder) dns.setDefaultResultOrder('ipv4first');
// --- END SOFTWARE DNS ---

// ✅ Fix for Windows notification branding
app.setName("Omnis");
if (process.platform === 'win32') {
  app.setAppUserModelId("com.omnis.desktop");
}

app.commandLine.appendSwitch('ignore-certificate-errors');


// 🔹 Will hold the Shantui auth headers once captured
let shantuiAuthHeaders = null;

// 🔹 Shantui login page (adjust if different)
const SHANTUI_LOGIN_URL = "https://eu.shantui-osc.com/scmsoverseas/#/login";

// ------------------------------------------------------------
//  ✅ Frappe cookie compatibility (Salestrack etc.)
//  Allows session cookies to be sent from file:// (Omnis UI) to https://
// ------------------------------------------------------------
function setupFrappeCookieCompatibility() {
  try {
    // We use the default session (your window uses default partition).
    const ses = session.defaultSession;

    // Best effort: relax SameSite handling so cookies can be included
    // in requests originating from file://.
    //
    // Electron/Chromium changes over time, so we set what we can safely.
    // These flags help when Frappe sets SameSite=Lax/Strict by default.
    if (ses && ses.cookies && typeof ses.cookies.set === "function") {
      // No-op: we don't set specific cookies here because they are created by Frappe on login.
      // This function exists to configure cookie policy where possible.
    }

    // Some Electron builds support setUserAgent / network features only,
    // but the most reliable cross-site cookie fix is:
    // - ensure webSecurity is disabled (you have it)
    // - ensure requests use credentials: "include" in renderer (you already do)
    // - and make sure cookie SameSite isn't blocking in Chromium.
    //
    // We can also force a permissive "origin header" for file:// requests
    // for Salestrack domains to reduce CORS/cookie issues.
    const filter = {
      urls: [
        "https://salestrack.powerstar.co.zw/*",
        "https://powertrack.powerstar.co.zw/*",
        "https://omnis.spareparts-exchange.com/*",
        "https://fleetrack.machinery-exchange.com/*",
        "https://engtrack.machinery-exchange.com/*",
        "https://fleetrack.powerstar.co.zw/*",
        "https://engtrack.powerstar.co.zw/*",
      ],
    };

    ses.webRequest.onBeforeSendHeaders(filter, (details, callback) => {
      // SMART ORIGIN STRATEGY:
      // 1. The 'login' endpoint often rejects requests with custom Origin headers (Invalid Credentials).
      // 2. Data APIs often REQUIRE Origin headers for CSRF protection.
      // 3. Solution: Skip 'login', apply to everything else.

      const headers = details.requestHeaders || {};
      const isLogin = details.url.includes("/api/method/login") ||
        details.url.includes("login_and_get_keys") ||
        details.url.includes("get_ft_breakdown_overview"); // Add any other early calls if needed


      if (!headers.Origin && !isLogin) {
        try {
          const u = new URL(details.url);
          headers.Origin = `${u.protocol}//${u.host}`;
        } catch { }
      }
      callback({ requestHeaders: headers });
    });

    console.log("[Omnis] Frappe cookie compatibility enabled (Smart Origin).");
  } catch (e) {
    console.warn("[Omnis] Could not enable Frappe cookie compatibility:", e);
  }
}

// ------------------------------------------------------------
//  Shantui Sniffer: Capture cookies + Bearer token automatically
// ------------------------------------------------------------
function setupShantuiSniffer() {
  const filter = { urls: ["https://eu.shantui-osc.com/sosapi/*"] };

  session.defaultSession.webRequest.onBeforeSendHeaders(
    filter,
    (details, callback) => {
      const h = details.requestHeaders || {};

      // Capture from the FIRST /sosapi/* request we see
      if (!shantuiAuthHeaders) {
        shantuiAuthHeaders = {
          Authorization: h.Authorization || h.authorization || "",
          Cookie: h.Cookie || h.cookie || "",
          lang: h.lang || h.Lang || "en",
          zone: h.zone || h.Zone || "UTC+02:00",
        };

        console.log(
          "[Shantui] Captured auth headers:",
          shantuiAuthHeaders,
          "from",
          details.url
        );
      }

      callback({ requestHeaders: details.requestHeaders });
    }
  );
}

// ------------------------------------------------------------
//  Helper: format JS Date -> "YYYY-MM-DD HH:mm:ss"
// ------------------------------------------------------------
function formatDateTime(dt) {
  const pad = (n) => String(n).padStart(2, "0");
  return (
    dt.getFullYear() +
    "-" +
    pad(dt.getMonth() + 1) +
    "-" +
    pad(dt.getDate()) +
    " " +
    pad(dt.getHours()) +
    ":" +
    pad(dt.getMinutes()) +
    ":" +
    pad(dt.getSeconds())
  );
}

// ------------------------------------------------------------
//  Auto-login into Shantui in a HIDDEN window
//  Uses SHANTUI_USER and SHANTUI_PASS env vars
// ------------------------------------------------------------
async function ensureShantuiSession(forceRelogin = false) {
  if (shantuiAuthHeaders && !forceRelogin) {
    console.log("[Shantui] Auth headers already present, skipping login.");
    return;
  }

  const username = process.env.SHANTUI_USER;
  const password = process.env.SHANTUI_PASS;

  if (!username || !password) {
    console.warn(
      "[Shantui] SHANTUI_USER / SHANTUI_PASS env vars not set – cannot auto-login."
    );
    return;
  }

  console.log(
    "[Shantui] Starting hidden auto-login…",
    forceRelogin ? "(force relogin)" : ""
  );

  const loginWin = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: false, // we need to inject JS
    },
  });

  try {
    await loginWin.loadURL(SHANTUI_LOGIN_URL);

    const result = await loginWin.webContents.executeJavaScript(`
      (function () {
        // ⚠️ You may need to tweak these selectors once
        const userInput =
          document.querySelector('input[type="text"], input[name="username"], input[placeholder*="User"], input[placeholder*="Account"]');
        const passInput = document.querySelector('input[type="password"]');
        const loginButton =
          document.querySelector('button[type="submit"], button[type="button"], .login-btn');

        if (!userInput || !passInput || !loginButton) {
          return "NO_FORM";
        }

        userInput.value = ${JSON.stringify(username)};
        passInput.value = ${JSON.stringify(password)};
        loginButton.click();
        return "OK";
      })();
    `);

    console.log("[Shantui] Auto-login script result:", result);
  } catch (e) {
    console.error("[Shantui] Error during auto-login injection:", e);
  }

  // Wait a few seconds for login + first /sosapi/ call (sniffer will grab headers)
  await new Promise((resolve) => setTimeout(resolve, 5000));

  loginWin.close();
}

// ------------------------------------------------------------
//  API helper function to call Shantui JSON endpoints
//  (terminal_fault_code_log/page -> alarms)
// ------------------------------------------------------------
async function fetchShantuiFaultCodeList() {
  // If we don't have headers yet, try to log in first
  if (!shantuiAuthHeaders) {
    await ensureShantuiSession(false);
  }

  // Build last 30 days time window
  const now = new Date();
  const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const base =
    "https://eu.shantui-osc.com/sosapi/web/terminal_fault_code_log/page";
  const innerUrl = "%2Fsosapi%2Fweb%2Fterminal_fault_code_log%2Fpage";

  const startStr = encodeURIComponent(formatDateTime(start));
  const endStr = encodeURIComponent(formatDateTime(now));

  const url =
    `${base}?url=${innerUrl}` +
    `&current=1&size=50` +
    `&startTime=${startStr}&endTime=${endStr}`;

  console.log("[Shantui] Calling alarm page URL:", url);

  const makeRequest = async () =>
    axios.get(url, {
      headers: shantuiAuthHeaders || {},
    });

  try {
    const res = await makeRequest();
    return res.data;
  } catch (err) {
    const status = err && err.response && err.response.status;
    console.warn("[Shantui] Request error status:", status);

    // If auth error, force a relogin and retry once
    if (status === 401 || status === 403) {
      console.warn("[Shantui] Auth error, forcing relogin…");
      shantuiAuthHeaders = null;
      await ensureShantuiSession(true);

      const res2 = await makeRequest();
      return res2.data;
    }

    throw err;
  }
}

// Expose to renderer
ipcMain.handle("shantui:getFaultCodes", async () => {
  return await fetchShantuiFaultCodeList();
});

// Window Controls for Frameless UI
ipcMain.handle("window:minimize", () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) win.minimize();
});

ipcMain.handle("window:close", () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) win.close();
});

ipcMain.handle("window:maximize", () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) win.maximize();
});

ipcMain.handle("app:getVersion", () => {
  return app.getVersion();
});

ipcMain.handle("app:checkForUpdates", () => {
  autoUpdater.checkForUpdates();
  return { ok: true };
});

// Helper: Append entry to persistent IPC trace log
function appendIpcTrace(entry) {
  const fs = require('fs');
  const tracePath = path.join(app.getPath('userData'), 'ipc_trace.log');
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${typeof entry === 'object' ? JSON.stringify(entry) : entry}\n`;
  try {
    fs.appendFileSync(tracePath, line);
  } catch (err) {
    console.error('[Diagnostic] Failed to write IPC trace:', err);
  }
}

// Diagnostic Bridge: Capture renderer-side errors to a local file
ipcMain.handle("renderer:error", (event, { error, stack, url }) => {
  const fs = require('fs');
  const logPath = path.join(process.cwd(), 'renderer_error.log');
  const logEntry = `[${new Date().toISOString()}] ERROR: ${error}\nURL: ${url}\nSTACK: ${stack}\n-----------------------------------\n`;
  try {
    fs.appendFileSync(logPath, logEntry);
    console.log(`[Diagnostic] Renderer error logged to ${logPath}`);
  } catch (err) {
    console.error('[Diagnostic] Failed to write renderer error log:', err);
  }
});

ipcMain.handle("frappe:request", async (event, { url, method, data, headers, syncCookies, timeout }) => {
  try {
    // Identification and forced IP mapping for known systems
    const isSpe = url.includes(SPE_DOMAIN) || url.includes(SPE_IP);
    const isSalestrack = url.includes(SALESTRACK_DOMAIN) || url.includes(SALESTRACK_IP);
    const isFleetrack = url.includes(FLEETRACK_DOMAIN) || url.includes(FLEETRACK_IP) || 
                       url.includes(ENGTRACK_DOMAIN) || url.includes(FLEETRACK_DOMAIN_V2) || 
                       url.includes(ENGTRACK_DOMAIN_V2) || url.includes(POWERTRACK_DOMAIN);

    let finalUrl = url;

    // Forced IP mapping due to unstable DNS resolution on user network
    if (isSpe && url.includes(SPE_DOMAIN)) {
      finalUrl = url.replace(SPE_DOMAIN, SPE_IP);
      console.log(`[Frappe IPC] SPE HARDWARE REWRITE: ${url} -> ${finalUrl}`);
    } else if (isSalestrack && url.includes(SALESTRACK_DOMAIN)) {
      finalUrl = url.replace(SALESTRACK_DOMAIN, SALESTRACK_IP);
      console.log(`[Frappe IPC] SALESTRACK HARDWARE REWRITE: ${url} -> ${finalUrl}`);
    } else if (isFleetrack) {
      // Handle both .machinery-exchange.com and .powerstar.co.zw variants
      finalUrl = url.replace(FLEETRACK_DOMAIN, FLEETRACK_IP)
                    .replace(ENGTRACK_DOMAIN, FLEETRACK_IP)
                    .replace(FLEETRACK_DOMAIN_V2, FLEETRACK_IP)
                    .replace(ENGTRACK_DOMAIN_V2, FLEETRACK_IP)
                    .replace(POWERTRACK_DOMAIN, FLEETRACK_IP);
      
      if (finalUrl !== url) {
        console.log(`[Frappe IPC] FLEET/ENG/POWER HARDWARE REWRITE: ${url} -> ${finalUrl}`);
      }
    }

    console.log(`[Frappe IPC] Request Trace: ${method || 'POST'} ${finalUrl}`);

    // Get cookies from Electron session for this URL
    const ses = session.defaultSession;
    const cookies = await ses.cookies.get({ url });
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    console.log(`[Frappe IPC] Data Bridge: Sending ${cookies.length} cookies for ${url}`);

    let requestData = data;
    let requestHeaders = headers || {};

    if (cookieHeader) {
      requestHeaders['Cookie'] = cookieHeader;
    }

    // START FIX: Add Standard Headers to mimic browser + avoid 417/403
    try {
      const u = new URL(url);
      
      // Ensure Origin and Referer are set to support backend CSRF/Security checks
      requestHeaders['Origin'] = u.origin;
      requestHeaders['Referer'] = u.origin + "/app"; 

      // Force correct Host header if using our hardware-defined IPs
      if (isSpe) requestHeaders['Host'] = SPE_DOMAIN;
      else if (isSalestrack) requestHeaders['Host'] = SALESTRACK_DOMAIN;
      else if (isFleetrack) {
         if (url.includes(ENGTRACK_DOMAIN)) requestHeaders['Host'] = ENGTRACK_DOMAIN;
         else if (url.includes(ENGTRACK_DOMAIN_V2)) requestHeaders['Host'] = ENGTRACK_DOMAIN_V2;
         else if (url.includes(POWERTRACK_DOMAIN)) requestHeaders['Host'] = POWERTRACK_DOMAIN;
         else if (url.includes(FLEETRACK_DOMAIN_V2)) requestHeaders['Host'] = FLEETRACK_DOMAIN_V2;
         else requestHeaders['Host'] = FLEETRACK_DOMAIN;
      }
      else requestHeaders['Host'] = u.host;
      
      // Ensure User Agent is set 
      if (!requestHeaders['User-Agent']) {
        requestHeaders['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
      }
    } catch (e) { 
      console.error("[Frappe IPC] Header Error:", e); 
    }
    // END FIX

    const axiosMethod = (method || 'POST').toUpperCase();
    const isPost = axiosMethod === 'POST' || axiosMethod === 'PUT';

    if (data && typeof data === 'object' && isPost) {
      // Standardize on x-www-form-urlencoded for Frappe compatibility
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(data)) {
        params.append(key, typeof value === 'object' ? JSON.stringify(value) : value);
      }
      requestData = params.toString();
      requestHeaders['Content-Type'] = 'application/x-www-form-urlencoded';
    }

    // FIX: prevent 417 Expectation Failed and SNARES
    const cleanHost = (requestHeaders['Host'] || '').split(':')[0]; // Strip port
    if (cleanHost) requestHeaders['Host'] = cleanHost;
    
    // Explicitly disable Expect header which causes 417 on some servers
    delete requestHeaders['Expect'];
    delete requestHeaders['expect'];

    console.log(`[IPC Request] ${axiosMethod} ${finalUrl}`);
    console.log(`[IPC Request] Headers:`, JSON.stringify(requestHeaders));

    appendIpcTrace(`START: ${axiosMethod} ${finalUrl} (Host: ${requestHeaders['Host']})`);

    // FORCED OVERRIDE TIMEOUT: Ensure we never hang the main loop beyond 12s
    const FORCED_TIMEOUT_MS = 12000;
    
    const axiosPromise = axios({
      url: finalUrl,
      method: axiosMethod,
      data: isPost ? requestData : undefined,
      params: !isPost ? data : undefined,
      headers: requestHeaders,
      timeout: timeout || 15000,
      maxRedirects: 0,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      validateStatus: (status) => status < 500,
      httpsAgent: new https.Agent({
        rejectUnauthorized: false,
        // CRITICAL: Set servername for SNI when connecting via IP
        servername: cleanHost || undefined
      }),
    });

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`BRIDGE_TIMEOUT: Protocol hang after ${FORCED_TIMEOUT_MS}ms`)), FORCED_TIMEOUT_MS);
    });

    const response = await Promise.race([axiosPromise, timeoutPromise]);
    
    appendIpcTrace(`FINISH: ${response.status} from ${finalUrl}`);

    // Optionally sync cookies to Electron session (for standard logins)
    if (syncCookies && response.headers['set-cookie']) {
      const ses = session.defaultSession;
      const domain = new URL(url).hostname;
      for (const cookieStr of response.headers['set-cookie']) {
        try {
          // Simple parsing of set-cookie header
          const parts = cookieStr.split(';')[0].split('=');
          if (parts.length >= 2) {
            const name = parts[0].trim();
            const value = parts.slice(1).join('=').trim();
            await ses.cookies.set({
              url,
              name,
              value,
              domain,
              path: '/',
              secure: true,
              sameSite: 'lax'
            });
          }
        } catch (ce) {
          console.error("[Frappe IPC] Cookie sync error:", ce.message);
        }
      }
    }

    const responseData = response.data;
    console.log(`[IPC Response] ${finalUrl} Status: ${response.status}`);
    if (response.status !== 200) {
      console.log(`[IPC Response Body]`, JSON.stringify(responseData));
    }

    return {
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      data: responseData,
      headers: response.headers,
    };
  } catch (error) {
      const errorMsg = error.response ? `${error.response.status} ${error.response.statusText}` : error.message;
      console.error(`[IPC Error] ${axiosMethod} ${finalUrl}: ${errorMsg}`);
      if (error.response) {
        console.error(`[IPC Error] Headers:`, JSON.stringify(error.response.headers));
        console.error(`[IPC Error] Data:`, JSON.stringify(error.response.data));
      }
      appendIpcTrace(`ERROR: ${axiosMethod} ${finalUrl}: ${errorMsg}`);
      return {
        ok: false,
        error: errorMsg,
        status: error.response ? error.response.status : 0
      };
  }
});

// ------------------------------------------------------------
//  Offline Cache IPC Handlers ✅ ADDED
// ------------------------------------------------------------

// Get all cached records from a table
ipcMain.handle('cache:getAll', async (event, table) => {
  try {
    const data = syncManager.getCached(table);
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

// Get single cached record
ipcMain.handle('cache:getOne', async (event, { table, name }) => {
  try {
    const data = syncManager.getCachedOne(table, name);
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

// Update local cache (optimistic update)
ipcMain.handle('cache:update', async (event, { table, name, data }) => {
  try {
    syncManager.updateCache(table, name, data);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

// Get sync status
ipcMain.handle('sync:getStatus', async () => {
  return syncManager.getStatus();
});

// Queue an operation for sync
ipcMain.handle('sync:queue', async (event, { doctype, docName, operation, payload }) => {
  try {
    syncManager.queueOperation(doctype, docName, operation, payload);
    return { ok: true, queued: true };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

// Set online/offline status
ipcMain.handle('sync:setOnline', async (event, online) => {
  syncManager.setOnline(online);
  return { ok: true, online };
});

// Trigger manual full sync
ipcMain.handle('sync:fullSync', async () => {
  try {
    // Create a frappe request function wrapper
    const frappeRequest = async (opts) => {
      const result = await axios({
        url: opts.url,
        method: opts.method || 'GET',
        data: opts.data,
        headers: {
          ...opts.headers,
          'Content-Type': opts.data ? 'application/json' : undefined
        },
        timeout: 15000,
        httpsAgent: new https.Agent({ rejectUnauthorized: false })
      });
      return {
        ok: result.status >= 200 && result.status < 300,
        data: result.data
      };
    };

    await syncManager.fullSync(frappeRequest);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

// Open Dashboard in a new window with a frame
ipcMain.handle('window:openDashboard', async (event, url) => {
  const dashWin = new BrowserWindow({
    width: 1400,
    height: 900,
    frame: true, // DASHBOARD HAS FRAME
    autoHideMenuBar: true,
    center: true,
    show: false,
    backgroundColor: '#ffffff',
    webPreferences: {
      webSecurity: false,
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true,
      preload: path.join(__dirname, "assets/js/preload.js"),
    },
  });

  dashWin.loadFile(url);
  
  dashWin.once('ready-to-show', () => {
    dashWin.show();
    dashWin.maximize();
    
    // Close the login window
    const loginWin = BrowserWindow.fromWebContents(event.sender);
    if (loginWin) loginWin.close();
  });

  return { ok: true };
});

// Close dashboard and return to login
ipcMain.handle('window:openLogin', async (event) => {
  createWindow(); // Opens frameless login
  
  const currentWin = BrowserWindow.fromWebContents(event.sender);
  if (currentWin) currentWin.close();
  
  return { ok: true };
});

// ------------------------------------------------------------
//  Electron window setup
// ------------------------------------------------------------
function createWindow() {
  const win = new BrowserWindow({
    width: 650,
    height: 950,
    frame: false,
    transparent: true,
    center: true,
    autoHideMenuBar: true,
    show: false,
    icon: path.join(__dirname, "assets/images/omnis-notification-icon.png"),

    // ✅ prevents white flash while loading
    backgroundColor: "#00000000",

    webPreferences: {
      webSecurity: false,
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true,
      preload: path.join(__dirname, "assets/js/preload.js"),
    },
  });

  win.loadFile("index.html");

  // ✅ ensure login size is maintained (or maximized in dashboard context)
  win.once("ready-to-show", () => {
    // We stay at 1100x620 for login
    win.show();
  });

  return win;
}

// ------------------------------------------------------------
//  App lifecycle
// ------------------------------------------------------------
app.whenReady().then(async () => {
  // ✅ Enable cookie compatibility for Frappe domains (Smart Mode)
  setupFrappeCookieCompatibility();

  // Ignore cert errors (self-signed, etc)
  setupShantuiSniffer(); // Start listening for Shantui API calls

  // Optional: try to pre-login once at startup
  await ensureShantuiSession(false);

  // ✅ Initialize offline cache / sync manager
  try {
    syncManager.initialize();
    console.log('[Omnis] SyncManager initialized');
  } catch (err) {
    console.error('[Omnis] SyncManager init failed:', err);
  }

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  // ✅ Initialize WhatsApp Built-in client
  try {
    whatsappManager.initialize();
    console.log('[Omnis] WhatsApp client initialized');
  } catch (err) {
    console.error('[Omnis] WhatsApp init failed:', err);
  }

  // ✅ Initialize Auto-Updater
  autoUpdater.logger = require("electron-log");
  autoUpdater.logger.transports.file.level = "info";
  console.log('[Omnis] Checking for updates...');
  autoUpdater.checkForUpdatesAndNotify();

  autoUpdater.on('update-available', () => {
    console.log('[Omnis] Update available.');
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('update-message', { type: 'available', text: 'Update available. Downloading...' });
    });
  });

  autoUpdater.on('download-progress', (progress) => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('update-message', { type: 'progress', percent: progress.percent });
    });
  });

  autoUpdater.on('update-downloaded', () => {
    console.log('[Omnis] Update downloaded; will install now.');
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('update-message', { type: 'downloaded', text: 'Update downloaded. Restarting...' });
    });
    // Give user 3 seconds to see the message
    setTimeout(() => {
      autoUpdater.quitAndInstall();
    }, 3000);
  });

  autoUpdater.on('update-not-available', () => {
    console.log('[Omnis] No updates found.');
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('update-message', { type: 'uptodate', text: 'You are on the latest version.' });
    });
  });

  autoUpdater.on('error', (err) => {
    console.error('[Omnis] Update error:', err);
    appendIpcTrace({ event: 'update-error', error: err.message, stack: err.stack });
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('update-message', { type: 'error', text: 'Update check failed: ' + err.message });
    });
  });

  // Debug: allow F12 to open devtools
  const { globalShortcut } = require("electron");
  globalShortcut.register("F12", () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) win.webContents.openDevTools({ mode: 'detach' });
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
