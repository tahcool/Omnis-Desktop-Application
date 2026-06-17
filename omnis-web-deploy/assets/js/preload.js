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
contextBridge.exposeInMainWorld("electron", {
  invoke: (channel, data) => ipcRenderer.invoke(channel, data),
  send: (channel, data) => ipcRenderer.send(channel, data),
  getVersion: () => ipcRenderer.invoke("app:getVersion"),
  checkForUpdates: () => ipcRenderer.invoke("app:checkForUpdates"),
  on: (channel, func) => ipcRenderer.on(channel, (event, ...args) => func(event, ...args)),
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
          order: (column, opts) => { params.order = { column, options: opts }; return chain; },
          range: (from, to) => { params.range = { from, to }; return chain; },
          or: (val) => { params.or = val; return chain; },
          // Make it thenable to work with await
          then: (onSuccess, onError) => {
            return ipcRenderer.invoke('supabase:query', { table, method: 'select', params })
              .then(onSuccess, onError);
          }
        };
        return chain;
      },
      upsert: (data) => ipcRenderer.invoke('supabase:query', { table, method: 'upsert', data }),
      insert: (data) => ipcRenderer.invoke('supabase:query', { table, method: 'insert', data }),
      delete: (match) => ipcRenderer.invoke('supabase:query', { table, method: 'delete', params: { match } })
    };
  }
});

// ✅ Email System API
contextBridge.exposeInMainWorld('emailAPI', {
  /** Send immediately or schedule (if scheduledFor is set to a future time) */
  send: (opts) => ipcRenderer.invoke('email:send', opts),
  /** Test SMTP connection with provided config object */
  test: (cfg) => ipcRenderer.invoke('email:test', cfg),
  /** Get email history: { limit, status } */
  getHistory: (opts) => ipcRenderer.invoke('email:getHistory', opts || {}),
  /** Get current SMTP config (password masked) */
  getConfig: () => ipcRenderer.invoke('email:getConfig'),
  /** Save SMTP config: { host, port, user, pass, fromName, useTls } */
  saveConfig: (cfg) => ipcRenderer.invoke('email:saveConfig', cfg),
  /** Cancel a pending scheduled email by id */
  cancelScheduled: (id) => ipcRenderer.invoke('email:cancelScheduled', id),
  /** Retry a failed email by id */
  retryFailed: (id) => ipcRenderer.invoke('email:retryFailed', id),
  /** Manually trigger a queue flush */
  flushQueue: () => ipcRenderer.invoke('email:flushQueue'),
});
