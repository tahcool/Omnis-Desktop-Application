const dbPath = 'C:/Users/Administrator/AppData/Roaming/omnis-desktop/salestrack_cache.db';
const sqlite3 = require('better-sqlite3');
const db = new sqlite3(dbPath, { readonly: true });
console.log(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all());
