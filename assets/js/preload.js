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
  getCached: (table) => ipcRenderer.invoke("cache:getAll", table),
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
});

// ✅ Sync API - Added for offline sync management
contextBridge.exposeInMainWorld("syncAPI", {
  getStatus: () => ipcRenderer.invoke("sync:getStatus"),
  setOnline: (online) => ipcRenderer.invoke("sync:setOnline", online),
  queue: (doctype, docName, operation, payload) =>
    ipcRenderer.invoke("sync:queue", { doctype, docName, operation, payload }),
  fullSync: () => ipcRenderer.invoke("sync:fullSync"),

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
  on: (channel, func) => ipcRenderer.on(channel, (event, ...args) => func(event, ...args)),
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});
