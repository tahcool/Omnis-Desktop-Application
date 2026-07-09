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
      upsert:  (data, options) => ipcRenderer.invoke('supabase:query', { table, method: 'upsert', params: { data, options } }),
      insert:  (data) => ipcRenderer.invoke('supabase:query', { table, method: 'insert', params: { data } }),
      update:  (data, params) => ipcRenderer.invoke('supabase:query', { table, method: 'update', params: { data, ...params } }),
      delete:  (params) => ipcRenderer.invoke('supabase:query', { table, method: 'delete', params })
    };
  },
  // Convenience: rpc call via edge function path
  rpc: (fn, args) => ipcRenderer.invoke('supabase:query', { table: fn, method: 'rpc', params: args })
});
