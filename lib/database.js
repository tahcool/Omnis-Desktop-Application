/**
 * Omnis Local Database (SQLite)
 * Provides offline caching for Salestrack data
 */

const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

class LocalDatabase {
  constructor() {
    this.db = null;
    this.dbPath = null;
  }

  /**
   * Initialize the database
   */
  initialize() {
    if (this.db) return;

    // Store in app data directory
    const userDataPath = app.getPath('userData');
    this.dbPath = path.join(userDataPath, 'salestrack_cache.db');

    console.log('[LocalDB] Initializing database at:', this.dbPath);

    this.db = new Database(this.dbPath);
    this.db.pragma('journal_mode = WAL'); // Better concurrency

    this._createTables();
    console.log('[LocalDB] Database initialized successfully');
  }

  /**
   * Create tables if they don't exist
   */
  _createTables() {
    // Metadata table for tracking sync state
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS _meta (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Hot Leads cache
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS hot_leads (
        name TEXT PRIMARY KEY,
        data TEXT,
        synced_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Machine Stock cache
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS machine_stock (
        name TEXT PRIMARY KEY,
        data TEXT,
        synced_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Quotations cache
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS quotations (
        name TEXT PRIMARY KEY,
        data TEXT,
        synced_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Orders (FMB Report) cache
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS orders (
        name TEXT PRIMARY KEY,
        data TEXT,
        synced_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Customers cache
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS customers (
        name TEXT PRIMARY KEY,
        data TEXT,
        synced_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Group Sales cache
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS group_sales (
        name TEXT PRIMARY KEY,
        data TEXT,
        synced_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Enquiries cache
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS enquiries (
        name TEXT PRIMARY KEY,
        data TEXT,
        synced_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Sync Queue for offline writes
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        doctype TEXT NOT NULL,
        doc_name TEXT,
        operation TEXT NOT NULL,
        payload TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        attempts INTEGER DEFAULT 0,
        last_error TEXT
      )
    `);

    console.log('[LocalDB] Tables created/verified');
  }

  // -------------------- Meta Operations --------------------

  getMeta(key) {
    const row = this.db.prepare('SELECT value FROM _meta WHERE key = ?').get(key);
    return row ? row.value : null;
  }

  setMeta(key, value) {
    this.db.prepare(`
      INSERT OR REPLACE INTO _meta (key, value, updated_at)
      VALUES (?, ?, datetime('now'))
    `).run(key, value);
  }

  // -------------------- Generic CRUD Operations --------------------

  /**
   * Get all records from a table
   */
  getAll(table) {
    const validTables = ['hot_leads', 'machine_stock', 'quotations', 'orders', 'customers', 'group_sales', 'enquiries'];
    if (!validTables.includes(table)) {
      throw new Error(`Invalid table: ${table}`);
    }

    const rows = this.db.prepare(`SELECT name, data FROM ${table}`).all();
    return rows.map(r => {
      try {
        return JSON.parse(r.data);
      } catch {
        return { name: r.name, _raw: r.data };
      }
    });
  }

  /**
   * Get a single record by name
   */
  getOne(table, name) {
    const validTables = ['hot_leads', 'machine_stock', 'quotations', 'orders', 'customers', 'group_sales', 'enquiries'];
    if (!validTables.includes(table)) {
      throw new Error(`Invalid table: ${table}`);
    }

    const row = this.db.prepare(`SELECT data FROM ${table} WHERE name = ?`).get(name);
    if (!row) return null;

    try {
      return JSON.parse(row.data);
    } catch {
      return { name, _raw: row.data };
    }
  }

  /**
   * Upsert a single record
   */
  upsert(table, name, data) {
    const validTables = ['hot_leads', 'machine_stock', 'quotations', 'orders', 'customers', 'group_sales', 'enquiries'];
    if (!validTables.includes(table)) {
      throw new Error(`Invalid table: ${table}`);
    }

    const jsonData = typeof data === 'string' ? data : JSON.stringify(data);

    this.db.prepare(`
      INSERT OR REPLACE INTO ${table} (name, data, synced_at)
      VALUES (?, ?, datetime('now'))
    `).run(name, jsonData);
  }

  /**
   * Bulk upsert multiple records (Async with chunking)
   * Prevents UI freeze/crash on large datasets
   */
  async bulkUpsert(table, records) {
    const validTables = ['hot_leads', 'machine_stock', 'quotations', 'orders', 'customers', 'group_sales', 'enquiries'];
    if (!validTables.includes(table)) {
      throw new Error(`Invalid table: ${table}`);
    }

    const CHUNK_SIZE = 50;
    const total = records.length;

    console.log(`[LocalDB] Starting bulk upsert for ${total} records into ${table}...`);

    const insert = this.db.prepare(`
            INSERT OR REPLACE INTO ${table} (name, data, synced_at)
            VALUES (?, ?, datetime('now'))
        `);

    // Process in chunks
    for (let i = 0; i < total; i += CHUNK_SIZE) {
      const chunk = records.slice(i, i + CHUNK_SIZE);

      // Run chunk in a transaction
      const transaction = this.db.transaction((items) => {
        for (const record of items) {
          const name = record.name || record.id || `auto_${Date.now()}_${Math.random()}`;
          const jsonData = JSON.stringify(record);
          insert.run(name, jsonData);
        }
      });

      transaction(chunk);

      // Yield to event loop to keep UI responsive
      await new Promise(resolve => setImmediate(resolve));
    }

    console.log(`[LocalDB] Finished bulk upsert of ${total} records to ${table}`);
  }

  /**
   * Delete a record
   */
  delete(table, name) {
    const validTables = ['hot_leads', 'machine_stock', 'quotations', 'orders', 'customers', 'group_sales', 'enquiries'];
    if (!validTables.includes(table)) {
      throw new Error(`Invalid table: ${table}`);
    }

    this.db.prepare(`DELETE FROM ${table} WHERE name = ?`).run(name);
  }

  /**
   * Clear all records in a table
   */
  clearTable(table) {
    const validTables = ['hot_leads', 'machine_stock', 'quotations', 'orders', 'customers', 'group_sales', 'enquiries'];
    if (!validTables.includes(table)) {
      throw new Error(`Invalid table: ${table}`);
    }

    this.db.prepare(`DELETE FROM ${table}`).run();
    console.log(`[LocalDB] Cleared table: ${table}`);
  }

  /**
   * Get count of records in a table
   */
  getCount(table) {
    const validTables = ['hot_leads', 'machine_stock', 'quotations', 'orders', 'customers', 'group_sales', 'enquiries', 'sync_queue'];
    if (!validTables.includes(table)) {
      throw new Error(`Invalid table: ${table}`);
    }

    const row = this.db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
    return row ? row.count : 0;
  }

  // -------------------- Sync Queue Operations --------------------

  /**
   * Add operation to sync queue
   */
  queueOperation(doctype, docName, operation, payload) {
    this.db.prepare(`
      INSERT INTO sync_queue (doctype, doc_name, operation, payload, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `).run(doctype, docName, operation, JSON.stringify(payload));

    console.log(`[LocalDB] Queued ${operation} for ${doctype}/${docName}`);
  }

  /**
   * Get all pending queue items
   */
  getQueueItems() {
    const rows = this.db.prepare(`
      SELECT id, doctype, doc_name, operation, payload, attempts, last_error
      FROM sync_queue
      ORDER BY created_at ASC
    `).all();

    return rows.map(r => ({
      ...r,
      payload: r.payload ? JSON.parse(r.payload) : null
    }));
  }

  /**
   * Get count of pending queue items
   */
  getQueueCount() {
    return this.getCount('sync_queue');
  }

  /**
   * Remove item from queue (after successful sync)
   */
  removeQueueItem(id) {
    this.db.prepare('DELETE FROM sync_queue WHERE id = ?').run(id);
  }

  /**
   * Mark queue item as failed
   */
  markQueueItemFailed(id, error) {
    this.db.prepare(`
      UPDATE sync_queue 
      SET attempts = attempts + 1, last_error = ?
      WHERE id = ?
    `).run(error, id);
  }

  /**
   * Clear entire queue
   */
  clearQueue() {
    this.db.prepare('DELETE FROM sync_queue').run();
    console.log('[LocalDB] Cleared sync queue');
  }

  // -------------------- Utility --------------------

  /**
   * Close database connection
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
      console.log('[LocalDB] Database closed');
    }
  }

  /**
   * Get database stats
   */
  getStats() {
    return {
      path: this.dbPath,
      hot_leads: this.getCount('hot_leads'),
      machine_stock: this.getCount('machine_stock'),
      quotations: this.getCount('quotations'),
      orders: this.getCount('orders'),
      customers: this.getCount('customers'),
      group_sales: this.getCount('group_sales'),
      enquiries: this.getCount('enquiries'),
      queue_pending: this.getQueueCount(),
      last_sync: this.getMeta('last_sync')
    };
  }
}

// Singleton instance
const localDB = new LocalDatabase();

module.exports = localDB;
