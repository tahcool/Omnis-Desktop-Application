import * as SQLite from 'expo-sqlite';

// Open or create the database
export const db = SQLite.openDatabaseSync('omnis_tablet.db');

export interface SyncTask {
  id?: number;
  type: string; // e.g., 'POST_CUSTOMER', 'CREATE_QUOTE'
  payload: string; // JSON payload
  status: 'pending' | 'failed' | 'completed';
  error_message?: string;
  created_at: string;
}

export const initDB = () => {
  try {
    // Sync Queue Table
    db.execSync(`
      CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        payload TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        error_message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Cached Data Table (e.g., Customers, Items)
    db.execSync(`
      CREATE TABLE IF NOT EXISTS cached_data (
        key TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization failed', error);
  }
};

export const getSyncQueue = (): SyncTask[] => {
  try {
    return db.getAllSync('SELECT * FROM sync_queue ORDER BY created_at ASC') as SyncTask[];
  } catch (e) {
    console.error('Error fetching sync queue', e);
    return [];
  }
};

export const addSyncTask = (type: string, payload: any) => {
  try {
    const jsonPayload = JSON.stringify(payload);
    const result = db.runSync(
      'INSERT INTO sync_queue (type, payload, status) VALUES (?, ?, ?)',
      [type, jsonPayload, 'pending']
    );
    return result.lastInsertRowId;
  } catch (e) {
    console.error('Error adding sync task', e);
  }
};

export const updateSyncTaskStatus = (id: number, status: string, errorMessage?: string) => {
  try {
    db.runSync(
      'UPDATE sync_queue SET status = ?, error_message = ? WHERE id = ?',
      [status, errorMessage || null, id]
    );
  } catch (e) {
    console.error('Error updating sync task', e);
  }
};

export const clearCompletedSyncTasks = () => {
  try {
    db.runSync('DELETE FROM sync_queue WHERE status = ?', ['completed']);
  } catch (e) {
    console.error('Error clearing completed tasks', e);
  }
};
