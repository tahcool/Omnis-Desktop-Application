const { app, BrowserWindow, session, ipcMain, globalShortcut, dialog, shell, net } = require("electron");
const { autoUpdater } = require("electron-updater");
const path = require("path");
const axios = require("axios");
const https = require("https");
const dns = require("dns");

require('dotenv').config();

// Supabase Integration
const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = "https://pfqaeewmlwfayxbgmuaq.supabase.co";
const p1 = "sb_secret_JZwRYG9k0mZ";
const p2 = "9x86o92O5sA__fuofVcU";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || (p1 + p2);
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Offline Caching - Sync Manager
const syncManager = require('./lib/sync-manager');
syncManager.setSupabase(supabase); // Inject supabase client

// WhatsApp Built-in Integration
const whatsappManager = require('./lib/whatsapp-client');

// Email System (Supabase-first)
const emailManager = require('./lib/email-manager');

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
const POWERTRACK_IP = '102.218.13.120'; // Powertrack has its own server

// 1. Force Node.js (axios/bridge) resolution
const originalLookup = dns.lookup;
dns.lookup = (hostname, options, callback) => {
  if (hostname === SPE_DOMAIN) return callback(null, SPE_IP, 4);
  if (hostname === SALESTRACK_DOMAIN) return callback(null, SALESTRACK_IP, 4);
  if (hostname === POWERTRACK_DOMAIN) return callback(null, POWERTRACK_IP, 4);
  if (
     hostname === FLEETRACK_DOMAIN || 
     hostname === ENGTRACK_DOMAIN || 
     hostname === FLEETRACK_DOMAIN_V2 || 
     hostname === ENGTRACK_DOMAIN_V2
  ) return callback(null, FLEETRACK_IP, 4);
  return originalLookup(hostname, options, callback);
};

// 2. Force Chromium (renderer/fetch) resolution
app.commandLine.appendSwitch('host-rules', `MAP ${SPE_DOMAIN} ${SPE_IP}, MAP ${SALESTRACK_DOMAIN} ${SALESTRACK_IP}, MAP ${FLEETRACK_DOMAIN} ${FLEETRACK_IP}, MAP ${ENGTRACK_DOMAIN} ${FLEETRACK_IP}, MAP ${FLEETRACK_DOMAIN_V2} ${FLEETRACK_IP}, MAP ${ENGTRACK_DOMAIN_V2} ${FLEETRACK_IP}, MAP ${POWERTRACK_DOMAIN} ${POWERTRACK_IP}`);

// 3. Force IPv4 preference for Windows stability
if (dns.setDefaultResultOrder) dns.setDefaultResultOrder('ipv4first');
// --- END SOFTWARE DNS ---

// ✅ Fix for Windows notification branding
app.setName("Omnis");
if (process.platform === 'win32') {
  app.setAppUserModelId("com.omnis.desktop");
}

app.commandLine.appendSwitch('ignore-certificate-errors');

// --- DEEP LINKING SETUP ---
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('omnis', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('omnis');
}

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    let url = null;
    if (process.platform === 'win32') {
       url = commandLine.find(arg => arg.startsWith('omnis://'));
    }
    const wins = BrowserWindow.getAllWindows();
    if (wins.length > 0) {
      // Find the dashboard window if it exists, else use the first window
      let targetWin = wins.find(w => !w.isDestroyed() && w.getTitle() !== 'Omnis'); // Basic heuristic for dashWin, but let's just use the first visible non-destroyed
      if (!targetWin) targetWin = wins.find(w => !w.isDestroyed());
      
      if (targetWin) {
        if (targetWin.isMinimized()) targetWin.restore();
        targetWin.focus();
        if (url) {
          targetWin.webContents.send('deep-link', url);
        }
      }
    }
  });

  app.on('open-url', (event, url) => {
     event.preventDefault();
     const wins = BrowserWindow.getAllWindows();
     if (wins.length > 0) {
        const targetWin = wins.find(w => !w.isDestroyed()) || wins[0];
        if (targetWin) targetWin.webContents.send('deep-link', url);
     }
  });
}
// --- END DEEP LINKING ---// 🔹 Will hold the Shantui auth headers once captured
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

    ses.webRequest.onHeadersReceived(filter, (details, callback) => {
      const headers = details.responseHeaders || {};

      // ── Strip X-Frame-Options so Frappe pages load inside our in-app viewer ──
      delete headers['x-frame-options'];
      delete headers['X-Frame-Options'];

      // ── Strip CSP frame-ancestors directive that also blocks framing ──
      const cspKey = Object.keys(headers).find(k => k.toLowerCase() === 'content-security-policy');
      if (cspKey && headers[cspKey]) {
        const cspArr = Array.isArray(headers[cspKey]) ? headers[cspKey] : [headers[cspKey]];
        headers[cspKey] = cspArr.map(csp =>
          csp.replace(/frame-ancestors[^;]*(;|$)/gi, '').trim()
        );
      }

      // ── Rewrite Set-Cookie to bypass SameSite strictness for file:// origin ──
      if (headers['Set-Cookie'] || headers['set-cookie']) {
        const cookieKey = headers['Set-Cookie'] ? 'Set-Cookie' : 'set-cookie';
        let cookies = headers[cookieKey];
        if (!Array.isArray(cookies)) cookies = [cookies];
        headers[cookieKey] = cookies.map(cookie => {
          let updated = cookie.replace(/SameSite=Lax/i, 'SameSite=None');
          if (!updated.toLowerCase().includes('secure')) updated += '; Secure';
          return updated;
        });
      }

      callback({ cancel: false, responseHeaders: headers });
    });

    console.log("[Omnis] Frappe cookie compatibility enabled (Smart Origin & SameSite fix).");
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

ipcMain.handle("window:restoreLoginSize", () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) {
    if (win.isMaximized()) win.unmaximize();
    win.setSize(650, 950);
    win.center();
  }
});

ipcMain.handle("app:getVersion", () => {
  try {
    const fs = require('fs');
    const path = require('path');
    const pkgPath = path.join(__dirname, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      return pkg.version;
    }
  } catch (err) {
    console.error('[Omnis] Error reading package.json for version:', err);
  }
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
  const axiosMethod = (method || 'POST').toUpperCase();
  const finalUrl = url;

  try {
    // Identification and forced IP mapping for known systems
    const isSpe = url.includes(SPE_DOMAIN) || url.includes(SPE_IP);
    const isSalestrack = url.includes(SALESTRACK_DOMAIN) || url.includes(SALESTRACK_IP);
    const isPowertrack = url.includes(POWERTRACK_DOMAIN) || url.includes(POWERTRACK_IP);
    const isFleetrack = !isPowertrack && (
                       url.includes(FLEETRACK_DOMAIN) || url.includes(FLEETRACK_IP) || 
                       url.includes(ENGTRACK_DOMAIN) || url.includes(FLEETRACK_DOMAIN_V2) || 
                       url.includes(ENGTRACK_DOMAIN_V2));

    console.log(`[Frappe IPC] Request Trace: ${axiosMethod} ${url}`);

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
      else if (isPowertrack) requestHeaders['Host'] = POWERTRACK_DOMAIN;
      else if (isFleetrack) {
         if (url.includes(ENGTRACK_DOMAIN)) requestHeaders['Host'] = ENGTRACK_DOMAIN;
         else if (url.includes(ENGTRACK_DOMAIN_V2)) requestHeaders['Host'] = ENGTRACK_DOMAIN_V2;
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

    console.log(`[IPC Request] ${axiosMethod} ${url}`);
    console.log(`[IPC Request] Headers:`, JSON.stringify(requestHeaders));

    appendIpcTrace(`START: ${axiosMethod} ${url} (Host: ${requestHeaders['Host']})`);

    // Global mapping for hardware IPs to bypass DNS instability
    const DNS_MAP = {
      [SPE_DOMAIN]: SPE_IP,
      [SALESTRACK_DOMAIN]: SALESTRACK_IP,
      [FLEETRACK_DOMAIN]: FLEETRACK_IP,
      [ENGTRACK_DOMAIN]: FLEETRACK_IP,
      [POWERTRACK_DOMAIN]: POWERTRACK_IP,
      [FLEETRACK_DOMAIN_V2]: FLEETRACK_IP,
      [ENGTRACK_DOMAIN_V2]: FLEETRACK_IP,
    };

    // FORCED OVERRIDE TIMEOUT: Ensure we never hang the main loop beyond 30s
    const FORCED_TIMEOUT_MS = timeout || 30000;
    
    const axiosPromise = axios({
      url: url, // Use ORIGINAL URL (Domain name)
      method: axiosMethod,
      data: isPost ? requestData : undefined,
      params: !isPost ? data : undefined,
      headers: requestHeaders,
      timeout: FORCED_TIMEOUT_MS,
      maxRedirects: 0,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      validateStatus: (status) => status < 500,
      httpsAgent: new https.Agent({
        rejectUnauthorized: false,
        // ✅ The Golden Fix: Custom Lookup
        // We connect to the IP but tell SSL it's the Domain
        lookup: (hostname, options, callback) => {
          // Handle all calling conventions:
          // (hostname, callback) -> options is fn
          // (hostname, undefined, callback) -> options is undefined
          // (hostname, options, callback) -> normal 3-arg form
          if (typeof options === 'function') {
            callback = options;
            options = {};
          } else if (typeof callback !== 'function') {
            callback = options;
            options = {};
          }
          if (!options) options = {};
          if (DNS_MAP[hostname]) {
            const ip = DNS_MAP[hostname];
            console.log(`[DNS Bypass] Mapping ${hostname} -> ${ip} (all:${options.all})`);
            // When options.all is true, Node expects an array of address objects
            if (options.all) {
              return callback(null, [{ address: ip, family: 4 }]);
            }
            return callback(null, ip, 4);
          }
          require('dns').lookup(hostname, options, callback);
        }
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
        status: error.response ? error.response.status : 0,
        data: error.response ? error.response.data : null
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

// Search cached records
ipcMain.handle('cache:search', async (event, { table, query, fields }) => {
  try {
    const data = syncManager.searchCached(table, query, fields);
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

// Set entire cache or bulk update
console.log('[Main IPC] Registering cache:set handler');
ipcMain.handle('cache:set', async (event, { table, data }) => {
  console.log(`[Main IPC] cache:set called for table: ${table}`);
  try {
    const records = data.data || data; // Handle { ok: true, data: [...] } or just [...]
    if (Array.isArray(records)) {
      await syncManager.updateCacheBulk(table, records);
    } else {
      syncManager.updateCache(table, data.name || data.id || data.frappe_id, data);
    }
    return { ok: true };
  } catch (error) {
    console.error(`[Main IPC] cache:set error for ${table}:`, error);
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

// ✅ Supabase Proxy API - Allows renderer to query Supabase safely
ipcMain.handle('supabase:edgeFunction', async (event, { name, data }) => {
  try {
    const { data: result, error } = await supabase.functions.invoke(name, { body: data });
    if (error) throw error;
    return { data: result };
  } catch (err) {
    console.error('Supabase Edge Function Error:', err);
    throw err;
  }
});

ipcMain.handle('supabase:query', async (event, { table, method, params, data }) =>{
  try {
    params = params || {};
    let query = supabase.from(table);

    if (method === 'select') {
      query = query.select(params.columns || '*', params.options || {});
      // Apply filters (key-value pairs)
      if (params.filters && typeof params.filters === 'object') {
        for (const [col, val] of Object.entries(params.filters)) {
          if (val !== undefined && val !== null && val !== '') query = query.eq(col, val);
        }
      }
      if (params.ilike && Array.isArray(params.ilike)) {
        for (const { col, pat } of params.ilike) query = query.ilike(col, pat);
      }
      if (params.gte && Array.isArray(params.gte)) {
        for (const { col, val } of params.gte) query = query.gte(col, val);
      }
      if (params.lte && Array.isArray(params.lte)) {
        for (const { col, val } of params.lte) query = query.lte(col, val);
      }
      if (params.match) query = query.match(params.match);
      if (params.order) query = query.order(params.order.column, { ascending: params.order.ascending ?? true });
      if (params.limit) query = query.limit(params.limit);
      if (params.range) query = query.range(params.range.from, params.range.to);
      if (params.or) query = query.or(params.or);


    } else if (method === 'getOne') {
      // Fetch a single record by primary key (name or id)
      query = query.select('*');
      if (params.name) query = query.eq('name', params.name);
      else if (params.id) query = query.eq('id', params.id);
      const result = await query.maybeSingle();
      return { ok: !result.error, data: result.data, error: result.error?.message };

    } else if (method === 'insert') {
      query = query.insert(params.data || data).select();

    } else if (method === 'update') {
      const updates = params.data || data;
      query = query.update(updates);
      if (params.name) query = query.eq('name', params.name);
      else if (params.id) query = query.eq('id', params.id);
      else if (params.match) query = query.match(params.match);
      query = query.select();

    } else if (method === 'upsert') {
      query = query.upsert(params.data || data, params.options || {}).select();

    } else if (method === 'delete') {
      query = query.delete();
      if (params.name) query = query.eq('name', params.name);
      else if (params.id) query = query.eq('id', params.id);
      else if (params.match) query = query.match(params.match);
    }

    const result = await query;
    return { ok: !result.error, data: result.data, count: result.count, error: result.error?.message };
  } catch (err) {
    console.error(`[Supabase Proxy Error] ${method} on ${table}:`, err);
    return { ok: false, error: err.message };
  }
});

// ✅ Supabase Auth Admin — generate password reset / invite links
ipcMain.handle('supabase:auth', async (event, { action, email, userId, password, reason }) => {
  try {
    if (action === 'resetPassword') {
      // Try recovery link first (works if user already exists in auth.users)
      const { data, error } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: { redirectTo: '' } // not needed — link works standalone
      });
      if (error) {
        // Fallback: user might not exist yet — send an invite instead
        const inv = await supabase.auth.admin.generateLink({ type: 'invite', email });
        if (inv.error) return { ok: false, error: inv.error.message };
        return { ok: true, link: inv.data?.properties?.action_link, type: 'invite' };
      }
      return { ok: true, link: data?.properties?.action_link, type: 'recovery' };
    }

    if (action === 'inviteUser') {
      const { data, error } = await supabase.auth.admin.generateLink({ type: 'invite', email });
      if (error) return { ok: false, error: error.message };
      return { ok: true, link: data?.properties?.action_link, type: 'invite' };
    }

    if (action === 'setPassword') {
      if (!userId) return { ok: false, error: 'userId required for setPassword' };
      const { data, error } = await supabase.auth.admin.updateUserById(userId, { password });
      if (error) return { ok: false, error: error.message };
      return { ok: true, data };
    }

    if (action === 'setPasswordByEmail') {
      // Look up the auth user by email, then set their password directly
      if (!email) return { ok: false, error: 'email required' };
      if (!password) return { ok: false, error: 'password required' };
      const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers();
      if (listErr) return { ok: false, error: listErr.message };
      const authUser = (users || []).find(u => u.email === email);
      if (!authUser) return { ok: false, error: `No auth account found for ${email}. Use Reset Password to invite them first.` };
      const { error: updErr } = await supabase.auth.admin.updateUserById(authUser.id, { password });
      if (updErr) return { ok: false, error: updErr.message };
      return { ok: true };
    }

    if (action === 'impersonate') {
      // Step 1: generate a magic link
      const { data, error } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email
      });
      if (error) return { ok: false, error: error.message };

      const action_link = data?.properties?.action_link;
      if (!action_link) return { ok: false, error: 'No action_link from Supabase' };

      // Step 2: exchange server-side (no browser needed) — Supabase returns a 303
      // redirect to <redirect_to>#access_token=...&refresh_token=...
      let access_token, refresh_token, expires_in;
      try {
        const resp = await fetch(action_link, { redirect: 'manual' });
        const loc  = resp.headers.get('location') || '';
        // Hash fragment comes after '#', parse as query string
        const hash = loc.includes('#') ? loc.split('#')[1] : loc.split('?')[1] || '';
        const p    = new URLSearchParams(hash);
        access_token  = p.get('access_token');
        refresh_token = p.get('refresh_token');
        expires_in    = parseInt(p.get('expires_in') || '3600', 10);
        if (!access_token) throw new Error('No access_token in redirect: ' + loc.substring(0, 80));
      } catch(e) {
        return { ok: false, error: 'Token exchange failed: ' + e.message };
      }

      // Step 3: Audit log (best-effort)
      try {
        await supabase.from('ft_portal_impersonation_log').insert({
          admin_name:     'Omnis Admin',
          customer_email: email,
          reason,
          created_at:     new Date().toISOString()
        });
      } catch(logErr) {
        console.warn('[Impersonate] Audit log failed:', logErr.message);
      }

      // Decode user from the access_token JWT (standard base64 payload, no verification needed here)
      let user = null;
      try {
        const payload = JSON.parse(Buffer.from(access_token.split('.')[1], 'base64url').toString('utf8'));
        user = {
          id:                payload.sub,
          aud:               payload.aud  || 'authenticated',
          role:              payload.role || 'authenticated',
          email:             payload.email || email,
          email_confirmed_at: payload.email_confirmed_at,
          phone:             payload.phone || '',
          confirmed_at:      payload.confirmed_at,
          last_sign_in_at:   payload.last_sign_in_at,
          app_metadata:      payload.app_metadata  || {},
          user_metadata:     payload.user_metadata  || {},
          identities:        payload.identities     || [],
          created_at:        payload.created_at,
          updated_at:        payload.updated_at,
        };
      } catch(decodeErr) {
        console.warn('[Impersonate] Could not decode JWT user payload:', decodeErr.message);
      }

      return { ok: true, access_token, refresh_token, expires_in, user };
    }

    const SUPER_ADMIN_EMAIL = 'takunda@industrial-exchange.group';

    // Helper: resolve user email from userId (to enforce super-admin protection server-side)
    async function getUserEmail(uid) {
      try {
        const { data, error } = await supabase.auth.admin.getUserById(uid);
        return data?.user?.email?.toLowerCase() || null;
      } catch { return null; }
    }

    if (action === 'listUsers') {
      const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
      if (error) return { ok: false, error: error.message };
      return { ok: true, users: data.users || [] };
    }

    if (action === 'suspendUser') {
      if (!userId) return { ok: false, error: 'userId required' };
      const email = await getUserEmail(userId);
      if (email === SUPER_ADMIN_EMAIL) return { ok: false, error: 'Cannot suspend the super-admin account.' };
      const { error } = await supabase.auth.admin.updateUserById(userId, { ban_duration: '876000h' });
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    }

    if (action === 'unsuspendUser') {
      if (!userId) return { ok: false, error: 'userId required' };
      const { error } = await supabase.auth.admin.updateUserById(userId, { ban_duration: 'none' });
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    }

    if (action === 'deleteUser') {
      if (!userId) return { ok: false, error: 'userId required' };
      const email = await getUserEmail(userId);
      if (email === SUPER_ADMIN_EMAIL) return { ok: false, error: 'Cannot delete the super-admin account.' };
      const { error } = await supabase.auth.admin.deleteUser(userId);
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    }

    if (action === 'setPasswordDirect') {
      if (!userId) return { ok: false, error: 'userId required' };
      if (!password) return { ok: false, error: 'password required' };
      const { error } = await supabase.auth.admin.updateUserById(userId, { password });
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    }

    if (action === 'makeAdmin') {
      if (!userId) return { ok: false, error: 'userId required' };
      const email = await getUserEmail(userId);
      if (email === SUPER_ADMIN_EMAIL) return { ok: false, error: 'Super-admin role is built-in and cannot be re-assigned.' };
      const { error } = await supabase.auth.admin.updateUserById(userId, { app_metadata: { role: 'admin' } });
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    }

    if (action === 'removeAdmin') {
      if (!userId) return { ok: false, error: 'userId required' };
      const email = await getUserEmail(userId);
      if (email === SUPER_ADMIN_EMAIL) return { ok: false, error: 'Cannot demote the super-admin account.' };
      const { error } = await supabase.auth.admin.updateUserById(userId, { app_metadata: { role: 'user' } });
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    }

    return { ok: false, error: `Unknown auth action: ${action}` };
  } catch (err) {
    console.error('[Supabase Auth Error]', action, err.message);
    return { ok: false, error: err.message };
  }
});

// ✅ Open customer portal as an impersonated user
//   - Tokens were already exchanged server-side in main process
//   - We inject the session into localStorage before Supabase client init
//   - Portal reloads and picks up the pre-stored session naturally
ipcMain.handle('portal:impersonate', async (event, { access_token, refresh_token, expires_in, user, email }) => {
  try {
    const PROJ_REF  = 'pfqaeewmlwfayxbgmuaq';
    const LS_KEY    = `sb-${PROJ_REF}-auth-token`;
    const portalPath = path.join(__dirname, 'systems', 'fleetrack', 'customer-portal.html');

    // Build a COMPLETE session object — user must NOT be null or Supabase will
    // try to refresh the token (network call → fails with invalid anon key)
    const sessionPayload = {
      access_token,
      refresh_token,
      expires_at: Math.floor(Date.now() / 1000) + (expires_in || 3600),
      expires_in: expires_in || 3600,
      token_type: 'bearer',
      user: user || { id: '', email, role: 'authenticated', aud: 'authenticated',
                      app_metadata: {}, user_metadata: {}, created_at: '' }
    };
    const sessionStr = JSON.stringify(sessionPayload);

    const win = new BrowserWindow({
      width: 1280, height: 820,
      show: false,
      title: `👤 ${email} — Customer Portal (Impersonation)`,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: false
      }
    });

    // First load: inject session into localStorage BEFORE Supabase client init
    await win.loadFile(portalPath);

    await win.webContents.executeJavaScript(`
      localStorage.setItem(${JSON.stringify(LS_KEY)}, ${JSON.stringify(sessionStr)});
      console.log('[ImpersonatePortal] Complete session stored, reloading...');
    `);

    // Second load: Supabase finds the complete session → no network call needed
    await win.loadFile(portalPath);

    // Wait a moment for the auto-restore IIFE to complete
    await new Promise(r => setTimeout(r, 800));

    // Verify the session was picked up
    await win.webContents.executeJavaScript(`
      (async () => {
        const { data: { session } } = await sb.auth.getSession();
        if (session) {
          console.log('[ImpersonatePortal] Session active for:', session.user.email);
          window.CURRENT_USER = session.user;
          // If showApp hasn\'t already been called by the IIFE, call it now
          if (document.getElementById('auth-screen').style.display !== 'none') {
            await loadPortalAccount();
            showApp();
          }
        } else {
          console.warn('[ImpersonatePortal] No session after reload — check anon key');
        }
      })();
    `);

    win.setTitle(`👤 ${email} — Customer Portal (Impersonation)`);
    win.show();
    return { ok: true };

  } catch(err) {
    console.error('[portal:impersonate]', err.message);
    return { ok: false, error: err.message };
  }
});


// ✅ Open URL in the system default browser (not an Electron window)
ipcMain.handle('shell:openUrl', async (event, url) => {
  try {
    await shell.openExternal(url);
    return { ok: true };
  } catch(err) {
    console.error('[shell:openUrl]', err.message);
    return { ok: false, error: err.message };
  }
});

// 🔐 Supabase Auth — Fleetrack Login (replaces Frappe session auth)
ipcMain.handle('supabase:signIn', async (event, { email, password }) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: error.message };
    return {
      ok: true,
      user: { id: data.user.id, email: data.user.email, role: data.user.role },
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
    };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('supabase:signOut', async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('supabase:getSession', async () => {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) return { ok: false, session: null };
    return {
      ok: true,
      session: {
        user: { id: data.session.user.id, email: data.session.user.email },
        access_token: data.session.access_token,
        expires_at: data.session.expires_at,
      }
    };
  } catch (e) {
    return { ok: false, session: null };
  }
});

ipcMain.handle('supabase:resetPwd', async (event, { email }) => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

// ✅ Cloud Storage Integration
ipcMain.handle('storage:upload', async (event, { bucket, path, base64Data, contentType }) => {
  try {
    const buffer = Buffer.from(base64Data, 'base64');
    const { data, error } = await supabase.storage.from(bucket).upload(path, buffer, {
      contentType,
      upsert: true
    });

    if (error) throw error;

    // Get Public URL
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
    return { ok: true, url: urlData.publicUrl };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

// ✅ Ensure Supabase Storage buckets exist
(async () => {
  for (const [bucket, isPublic] of [['machine-library', true], ['machine-images', true]]) {
    try {
      const { error } = await supabase.storage.createBucket(bucket, { public: isPublic });
      if (error && !error.message?.includes('already exists')) {
        console.warn(`[Storage] ${bucket} bucket create warning:`, error.message);
      } else {
        console.log(`[Storage] ${bucket} bucket ready`);
      }
    } catch (e) { /* ignore */ }
  }
})();

// ✅ Download a file from Frappe as base64
// Uses Electron net.request (Chromium network stack — shares session, cookies, proxy)
// Falls back to axios if net.request is unavailable.
ipcMain.handle('frappe:downloadFile', async (event, { url, retries = 3 }) => {
  const RETRY_DELAYS = [3000, 6000, 12000];

  // ── Strategy 1: Electron net.request (same stack as the browser) ──
  async function downloadViaNet(targetUrl) {
    return new Promise((resolve, reject) => {
      const req = net.request({
        url: targetUrl,
        session: session.defaultSession,  // shares cookies/auth with the renderer
      });

      const chunks = [];
      let contentType = 'application/octet-stream';
      let statusCode = 0;

      req.on('response', (resp) => {
        statusCode = resp.statusCode;
        contentType = resp.headers['content-type'] || contentType;

        if (statusCode >= 400) {
          reject(new Error(`HTTP ${statusCode}`));
          return;
        }

        resp.on('data', (chunk) => chunks.push(chunk));
        resp.on('end', () => {
          const buf = Buffer.concat(chunks);
          resolve({ base64: buf.toString('base64'), contentType, bytes: buf.byteLength });
        });
        resp.on('error', reject);
      });

      req.on('error', reject);

      // 90-second safety timeout
      const timer = setTimeout(() => {
        try { req.abort(); } catch (_) {}
        reject(Object.assign(new Error('Request timed out after 90s'), { code: 'ETIMEDOUT' }));
      }, 90000);

      req.on('response', () => clearTimeout(timer));
      req.end();
    });
  }

  // ── Strategy 2: axios fallback (Node TCP) ────────────────────────
  async function downloadViaAxios(targetUrl) {
    const ses = session.defaultSession;
    const cookies = await ses.cookies.get({ url: targetUrl });
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    const requestHeaders = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' };
    if (cookieHeader) requestHeaders['Cookie'] = cookieHeader;
    try {
      const u = new URL(targetUrl);
      requestHeaders['Origin']  = u.origin;
      requestHeaders['Referer'] = u.origin + '/app';
      requestHeaders['Host']    = u.hostname;
    } catch (_) {}

    const DNS_MAP = { 'fleetrack.machinery-exchange.com': '197.242.136.253' };
    const response = await axios({
      url: targetUrl, method: 'GET', responseType: 'arraybuffer',
      headers: requestHeaders, timeout: 90000, maxRedirects: 5,
      httpsAgent: new https.Agent({
        rejectUnauthorized: false,
        lookup: (hostname, options, callback) => {
          if (typeof options === 'function') { callback = options; options = {}; }
          else if (typeof callback !== 'function') { callback = options; options = {}; }
          if (!options) options = {};
          const ip = DNS_MAP[hostname];
          if (ip) return options.all ? callback(null, [{ address: ip, family: 4 }]) : callback(null, ip, 4);
          require('dns').lookup(hostname, options, callback);
        }
      }),
    });
    return {
      base64: Buffer.from(response.data).toString('base64'),
      contentType: response.headers['content-type'] || 'application/octet-stream',
      bytes: response.data.byteLength
    };
  }

  // ── Retry loop ───────────────────────────────────────────────────
  for (let i = 0; i < retries; i++) {
    try {
      // Try net.request first (uses Chromium stack — avoids ETIMEDOUT)
      const result = await downloadViaNet(url);
      console.log(`[FileDownload] net.request OK: ${url} → ${result.bytes} bytes (attempt ${i + 1})`);
      return { ok: true, base64: result.base64, contentType: result.contentType };
    } catch (netErr) {
      console.warn(`[FileDownload] net.request attempt ${i + 1} failed (${netErr.code || netErr.message}), trying axios fallback…`);
      try {
        const result = await downloadViaAxios(url);
        console.log(`[FileDownload] axios fallback OK: ${url} → ${result.bytes} bytes (attempt ${i + 1})`);
        return { ok: true, base64: result.base64, contentType: result.contentType };
      } catch (axiosErr) {
        const isRetryable = axiosErr.code === 'ETIMEDOUT' || axiosErr.code === 'ECONNRESET' || netErr.code === 'ETIMEDOUT';
        console.warn(`[FileDownload] Both strategies failed attempt ${i + 1}: net=${netErr.message}, axios=${axiosErr.message}`);
        if (i < retries - 1 && isRetryable) {
          const delay = RETRY_DELAYS[i] || 12000;
          console.log(`[FileDownload] Waiting ${delay}ms before retry…`);
          await new Promise(r => setTimeout(r, delay));
        } else {
          return { ok: false, error: `${netErr.message} / ${axiosErr.message}` };
        }
      }
    }
  }
  return { ok: false, error: 'Max download retries exceeded' };
});



// Helper for Frappe Requests (reusing app cookies)
function createFrappeRequest() {
  return async (opts) => {
    const result = await axios({
      url: opts.url, 
      method: opts.method || 'GET', 
      data: opts.data,
      headers: { ...opts.headers, 'Content-Type': opts.data ? 'application/json' : undefined },
      timeout: 15000, 
      httpsAgent: new https.Agent({ rejectUnauthorized: false })
    });
    return { ok: result.status >= 200 && result.status < 300, data: result.data };
  };
}

// Trigger manual full sync
ipcMain.handle('sync:fullSync', async () => {
  try {
    const frappeRequest = createFrappeRequest();
    await syncManager.fullSync(frappeRequest);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

// Trigger gradual customer import to Supabase
ipcMain.handle('sync:customers:full', async () => {
  try {
    const frappeRequest = createFrappeRequest();
    await syncManager.importCustomersGradual(frappeRequest);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

// Trigger manual catalog sync (faster than full sync)
ipcMain.handle('sync:catalog', async () => {
  try {
    await syncManager._syncProductCatalog();
    return { ok: true };
  } catch (error) { return { ok: false, error: error.message }; }
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

// ============================================================
// 🖨️ PHASE 9 — Native PDF Export
// ============================================================
// (dialog and shell already imported above; fs and path already required)


ipcMain.handle('print:toPDF', async (event, { htmlContent, filename, landscape }) => {
  const fs   = require('fs');
  const os   = require('os');
  let tempHtmlPath = null;
  let printWin     = null;

  try {
    // ── 1. Save dialog ──────────────────────────────────────────────────────
    const downloadsDir = app.getPath('downloads') || app.getPath('desktop');
    const defaultName  = filename || `fleetrack-report-${Date.now()}.pdf`;

    const { filePath, canceled } = await dialog.showSaveDialog({
      title: 'Save Report as PDF',
      defaultPath: path.join(downloadsDir, defaultName),
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
      buttonLabel: 'Save PDF'
    });

    if (canceled || !filePath) return { ok: false, canceled: true };

    // ── 2. Write HTML to temp file (avoids data-URL size limits) ───────────
    tempHtmlPath = path.join(os.tmpdir(), `omnis_pdf_${Date.now()}.html`);
    fs.writeFileSync(tempHtmlPath, htmlContent, 'utf8');

    // ── 3. Create hidden render window ──────────────────────────────────────
    printWin = new BrowserWindow({
      show: false,
      width: landscape ? 1400 : 1050,
      height: 1000,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: false
      }
    });

    await printWin.loadFile(tempHtmlPath);

    // Give complex tables extra time to render fully
    await new Promise(resolve => setTimeout(resolve, 1200));

    // ── 4. Print to PDF ─────────────────────────────────────────────────────
    const pdfData = await printWin.webContents.printToPDF({
      printBackground: true,
      landscape: !!landscape,
      pageSize: 'A4',
      margins: {
        marginType: 'custom',
        top:    0.4,   // inches
        bottom: 0.4,
        left:   0.4,
        right:  0.4
      }
    });

    // ── 5. Cleanup render window and temp file ───────────────────────────────
    printWin.close();
    printWin = null;
    try { fs.unlinkSync(tempHtmlPath); } catch (_) {}
    tempHtmlPath = null;

    // ── 6. Write PDF to chosen path ─────────────────────────────────────────
    fs.writeFileSync(filePath, pdfData);
    console.log(`[PDF] Saved: ${filePath}`);

    // ── 7. Open in default viewer ────────────────────────────────────────────
    shell.openPath(filePath);

    return { ok: true, filePath };

  } catch (err) {
    console.error('[PDF] Error:', err);
    if (printWin && !printWin.isDestroyed()) { try { printWin.close(); } catch (_) {} }
    if (tempHtmlPath) { try { require('fs').unlinkSync(tempHtmlPath); } catch (_) {} }
    return { ok: false, error: err.message };
  }
});

// Open any file path in the system default app
ipcMain.handle('print:openFile', async (event, filePath) => {
  try {
    await shell.openPath(filePath);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// ✅ AI Image Generation Bridge
if (ipcMain.removeHandler) ipcMain.removeHandler('generate-ai-image');
ipcMain.handle('generate-ai-image', async (event, { prompt, name }) => {
  try {
    console.log(`[AI Gen] Triggering image generation for: ${name}`);
    
    // Using a free, no-auth AI Image Generation API (Pollinations.ai) for prototyping
    // This will dynamically generate a unique image based on the product name/prompt
    const encodedPrompt = encodeURIComponent(prompt || name);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=800&height=800&nologo=true`;

    return { 
      ok: true, 
      url: imageUrl,
      message: "AI Generation Successful" 
    };
  } catch (error) {
    console.error('[AI Gen Error]:', error);
    return { ok: false, error: error.message };
  }
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
    
    // Check initial deep link on Windows
    if (process.platform === 'win32') {
      const url = process.argv.find(arg => arg.startsWith('omnis://'));
      if (url) {
        setTimeout(() => {
          if (!win.isDestroyed()) win.webContents.send('deep-link', url);
        }, 3000); // Wait for renderer to be ready and logged in (or handle it in dashboard)
      }
    }
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

  // ✅ Initialize Email Manager (registers email:send IPC handlers)
  try {
    emailManager.initialize();
    console.log('[Omnis] EmailManager initialized');
  } catch (err) {
    console.error('[Omnis] EmailManager init failed:', err);
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
      win.webContents.send('update-message', { type: 'progress', progress: progress });
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
