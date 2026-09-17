// preload.js
// Bridge between renderer (your HTML/JS) and Electron main process

const { contextBridge, ipcRenderer } = require("electron");

/**
 * NOTE:
 * - Keep contextIsolation ON (you already do).
 * - Only expose the minimal APIs you need in the renderer.
 */

contextBridge.exposeInMainWorld("shantuiAPI", {
  // Returns a Promise that resolves to the JSON we get from main.js
  // (which in turn calls the Shantui sosapi endpoint).
  getFaultCodes: () => ipcRenderer.invoke("shantui:getFaultCodes"),
});

contextBridge.exposeInMainWorld("settingsAPI", {
  // Get current saved settings (includes shantui.username, and decrypted shantui.password in memory only)
  get: () => ipcRenderer.invoke("settings:get"),

  // Save settings. Example payload:
  // {
  //   shantui: { username: "xxx", password: "yyy" },
  //   frappe:  { api_key: "xxx", api_secret: "yyy" } // optional if you add it later
  // }
  set: (settingsObj) => ipcRenderer.invoke("settings:set", settingsObj),
});

contextBridge.exposeInMainWorld("frappeAPI", {
  request: (options) => ipcRenderer.invoke("frappe:request", options),
  downloadFile: (url) => ipcRenderer.invoke("frappe:downloadFile", { url }),
  getCached: (table) => ipcRenderer.invoke("cache:getAll", table),
  setCached: (table, data) => ipcRenderer.invoke("cache:set", { table, data }),
  minimize: () => ipcRenderer.invoke("window:minimize"),
  close: () => ipcRenderer.invoke("window:close"),
  maximize: () => ipcRenderer.invoke("window:maximize"),
  openDashboard: (url) => ipcRenderer.invoke("window:openDashboard", url),
  openLogin: () => ipcRenderer.invoke("window:openLogin"),
});

// ✅ Offline Cache API - Added for local caching
contextBridge.exposeInMainWorld("cacheAPI", {
  getAll: (table) => ipcRenderer.invoke("cache:getAll", table),
  getOne: (table, name) => ipcRenderer.invoke("cache:getOne", { table, name }),
  update: (table, name, data) => ipcRenderer.invoke("cache:update", { table, name, data }),
  search: (table, query, fields) => ipcRenderer.invoke("cache:search", { table, query, fields }),
});

// ✅ Sync API - Added for offline sync management
contextBridge.exposeInMainWorld("syncAPI", {
  getStatus: () => ipcRenderer.invoke("sync:getStatus"),
  setOnline: (online) => ipcRenderer.invoke("sync:setOnline", online),
  queue: (doctype, docName, operation, payload) =>
    ipcRenderer.invoke("sync:queue", { doctype, docName, operation, payload }),
  fullSync: () => ipcRenderer.invoke("sync:fullSync"),
  catalogSync: () => ipcRenderer.invoke("sync:catalog"),

  // Listen for status updates from main process
  onStatusChange: (callback) => {
    ipcRenderer.on("sync:status", (event, status) => callback(status));
  },
});

// ✅ Legacy & Built-in Bridge for WhatsApp/Dashboard
// SECURITY: Channel allowlist — only these IPC channels can be called from renderer.
// Derived from scanning all electron.invoke() call sites in systems/*.html
const ALLOWED_INVOKE_CHANNELS = new Set([
  // App lifecycle
  'app:getVersion', 'app:checkForUpdates', 'app:getAssetBase64',
  // Window management
  'window:minimize', 'window:maximize', 'window:close',
  'window:openDashboard', 'window:openLogin', 'window:openAuxiliary',
  'window:restoreLoginSize',
  // Supabase data (proxied, not direct key access)
  'supabase:query', 'supabase:edgeFunction',
  'supabase:getSession', 'supabase:signIn', 'supabase:signOut',
  'supabase:getUsers', 'supabase:createUser', 'supabase:updateUserAccess',
  'supabase:resetPwd', 'supabase:updateUser',
  'supabase:enrollMfa', 'supabase:challengeMfa', 'supabase:verifyMfa',
  // Supabase auth admin (admin-only operations — validated server-side)
  'supabase:auth',
  // Portal
  'portal:impersonate',
  // Storage
  'storage:upload',
  // Cache & Sync
  'cache:getAll', 'cache:getOne', 'cache:update', 'cache:search', 'cache:set',
  'sync:getStatus', 'sync:queue', 'sync:setOnline',
  'sync:fullSync', 'sync:catalog', 'sync:customers:full',
  // Frappe (legacy — to be removed in Phase 3)
  'frappe:request', 'frappe:downloadFile',
  // Email
  'email:send', 'email:getHistory', 'email:getConfig', 'email:saveConfig',
  'email:cancelScheduled', 'email:retryFailed', 'email:test',
  // WhatsApp
  'whatsapp:send-msg', 'whatsapp:getStatus', 'whatsapp:getQR',
  'whatsapp:disconnect', 'whatsapp:connect',
  // Print & PDF
  'print:toPDF', 'print:openFile',
  // AI
  'generate-ai-image',
  // Shell
  'shell:openUrl',
  // Settings
  'settings:get', 'settings:set',
  // Error reporting
  'renderer:error',
  // Shantui
  'shantui:getFaultCodes',
]);
const ALLOWED_SEND_CHANNELS = new Set([
  'renderer:error',
]);
const ALLOWED_ON_CHANNELS = new Set([
  'omnis:log', 'sync:status', 'update:available', 'update:downloaded',
  'whatsapp:status', 'whatsapp:qr', 'notification:show',
]);

contextBridge.exposeInMainWorld("electron", {
  invoke: (channel, data) => {
    if (!ALLOWED_INVOKE_CHANNELS.has(channel)) {
      console.error(`[IPC] Blocked invoke on disallowed channel: ${channel}`);
      return Promise.reject(new Error(`IPC channel '${channel}' is not allowed`));
    }
    return ipcRenderer.invoke(channel, data);
  },
  send: (channel, data) => {
    if (!ALLOWED_SEND_CHANNELS.has(channel)) {
      console.error(`[IPC] Blocked send on disallowed channel: ${channel}`);
      return;
    }
    ipcRenderer.send(channel, data);
  },
  getVersion: () => ipcRenderer.invoke("app:getVersion"),
  checkForUpdates: () => ipcRenderer.invoke("app:checkForUpdates"),
  on: (channel, func) => {
    if (!ALLOWED_ON_CHANNELS.has(channel)) {
      console.error(`[IPC] Blocked listener on disallowed channel: ${channel}`);
      return;
    }
    ipcRenderer.on(channel, (event, ...args) => func(event, ...args));
  },
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});

contextBridge.exposeInMainWorld("storageAPI", {
  upload: (bucket, path, base64Data, contentType) => 
    ipcRenderer.invoke("storage:upload", { bucket, path, base64Data, contentType }),
});
contextBridge.exposeInMainWorld("supabase", {
  from: (table) => {
    return {
      select: (columns = '*', options = {}) => {
        const params = { columns, options };
        const chain = {
          // Equality filter — passed as { col: val } map; main process does .eq() for each
          eq:      (col, val) => { if (!params.filters) params.filters = {}; params.filters[col] = val; return chain; },
          // Free-text filters — stored for main process to apply
          ilike:   (col, pat) => { if (!params.ilike) params.ilike = []; params.ilike.push({ col, pat }); return chain; },
          gte:     (col, val) => { if (!params.gte)   params.gte   = []; params.gte.push({ col, val });   return chain; },
          lte:     (col, val) => { if (!params.lte)   params.lte   = []; params.lte.push({ col, val });   return chain; },
          order:   (column, opts) => { params.order = { column, ...(opts || {}) }; return chain; },
          range:   (from, to) => { params.range = { from, to }; return chain; },
          limit:   (n) => { params.limit = n; return chain; },
          or:      (val) => { params.or = val; return chain; },
          then:    (onSuccess, onError) => {
            return ipcRenderer.invoke('supabase:query', { table, method: 'select', params })
              .then(onSuccess, onError);
          }
        };
        return chain;
      },
      // Single-record fetch by name or id
      getOne:  (params) => ipcRenderer.invoke('supabase:query', { table, method: 'getOne', params }),
      upsert:  (data, options) => {
        const p = { data, options, returning: false };
        const chain = {
          select: () => { p.returning = true; return chain; },
          then: (onOk, onErr) => ipcRenderer.invoke('supabase:query', { table, method: 'upsert', params: p }).then(onOk, onErr)
        };
        return chain;
      },
      insert:  (data) => {
        const p = { data, returning: false };
        const chain = {
          select: () => { p.returning = true; return chain; },
          then: (onOk, onErr) => ipcRenderer.invoke('supabase:query', { table, method: 'insert', params: p }).then(onOk, onErr)
        };
        return chain;
      },
      update:  (data, params) => {
        const p = { data, ...(params || {}), returning: false };
        const chain = {
          eq:     (col, val) => { if (!p.filters) p.filters = {}; p.filters[col] = val; return chain; },
          match:  (m) => { p.match = m; return chain; },
          select: () => { p.returning = true; return chain; },
          then: (onOk, onErr) => ipcRenderer.invoke('supabase:query', { table, method: 'update', params: p }).then(onOk, onErr)
        };
        return chain;
      },
      delete:  () => {
        const p = { returning: false };
        const chain = {
          eq:     (col, val) => { if (!p.filters) p.filters = {}; p.filters[col] = val; return chain; },
          match:  (m) => { p.match = m; return chain; },
          then: (onOk, onErr) => ipcRenderer.invoke('supabase:query', { table, method: 'delete', params: p }).then(onOk, onErr)
        };
        return chain;
      }
    };
  },
  // Convenience: rpc call via edge function path
  rpc: (fn, args) => ipcRenderer.invoke('supabase:query', { table: fn, method: 'rpc', params: args })
});
