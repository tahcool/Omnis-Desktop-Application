/**
 * Omnis Sync Manager
 * Handles data synchronization between local cache and Frappe server
 */

const localDB = require('./database');
const { BrowserWindow } = require('electron');

class SyncManager {
    constructor() {
        this.isOnline = true;
        this.isSyncing = false;
        this.lastSync = null;
        this.syncInterval = null;
        this.statusListeners = [];
    }

    /**
     * Initialize sync manager
     */
    initialize() {
        localDB.initialize();
        this.lastSync = localDB.getMeta('last_sync');
        console.log('[SyncManager] Initialized. Last sync:', this.lastSync);

        // Start periodic sync check (every 5 minutes)
        this.syncInterval = setInterval(() => {
            if (this.isOnline && !this.isSyncing) {
                this.deltaSync().catch(err => {
                    console.error('[SyncManager] Delta sync error:', err);
                });
            }
        }, 5 * 60 * 1000);
    }

    /**
     * Set online status
     */
    setOnline(online) {
        const wasOffline = !this.isOnline;
        this.isOnline = online;

        console.log('[SyncManager] Online status:', online);
        this.notifyStatusChange();

        // If coming back online, process queue
        if (online && wasOffline) {
            this.processQueue().catch(err => {
                console.error('[SyncManager] Queue processing error:', err);
            });
        }
    }

    /**
     * Get current sync status
     */
    getStatus() {
        return {
            online: this.isOnline,
            syncing: this.isSyncing,
            pendingCount: localDB.getQueueCount(),
            lastSync: this.lastSync,
            stats: localDB.getStats()
        };
    }

    /**
     * Notify all listeners of status change
     */
    notifyStatusChange() {
        const status = this.getStatus();

        // Send to all renderer windows
        BrowserWindow.getAllWindows().forEach(win => {
            if (win.webContents) {
                win.webContents.send('sync:status', status);
            }
        });
    }

    // -------------------- Sync Operations --------------------

    /**
     * Full sync - fetch all data from Frappe
     * Called on app startup if online
     */
    async fullSync(frappeRequest) {
        if (this.isSyncing) {
            console.log('[SyncManager] Sync already in progress');
            return;
        }

        console.log('[SyncManager] Starting full sync...');
        this.isSyncing = true;
        this.notifyStatusChange();

        try {
            // Sync Hot Leads
            await this._syncHotLeads(frappeRequest);

            // Sync Machine Stock
            await this._syncMachineStock(frappeRequest);

            // Sync Quotations
            await this._syncQuotations(frappeRequest);

            // Sync Orders
            await this._syncOrders(frappeRequest);

            // Sync Customers
            await this._syncCustomers(frappeRequest);

            // Sync Group Sales
            await this._syncGroupSales(frappeRequest);

            // Sync Enquiries
            await this._syncEnquiries(frappeRequest);

            // Update last sync time
            this.lastSync = new Date().toISOString();
            localDB.setMeta('last_sync', this.lastSync);

            console.log('[SyncManager] Full sync completed');
        } catch (err) {
            console.error('[SyncManager] Full sync failed:', err);
            throw err;
        } finally {
            this.isSyncing = false;
            this.notifyStatusChange();
        }
    }

    /**
     * Delta sync - fetch only modified data
     * Called periodically when online
     */
    async deltaSync(frappeRequest) {
        if (!this.isOnline || this.isSyncing) return;

        console.log('[SyncManager] Starting delta sync...');
        this.isSyncing = true;
        this.notifyStatusChange();

        try {
            // For now, do a full sync
            // TODO: Implement modified_since filtering
            await this._syncHotLeads(frappeRequest);
            await this._syncMachineStock(frappeRequest);
            await this._syncQuotations(frappeRequest);
            await this._syncOrders(frappeRequest);
            await this._syncCustomers(frappeRequest);
            await this._syncGroupSales(frappeRequest);
            await this._syncEnquiries(frappeRequest);

            this.lastSync = new Date().toISOString();
            localDB.setMeta('last_sync', this.lastSync);

            console.log('[SyncManager] Delta sync completed');
        } catch (err) {
            console.error('[SyncManager] Delta sync failed:', err);
            // Don't throw - delta sync failures are silent
        } finally {
            this.isSyncing = false;
            this.notifyStatusChange();
        }
    }

    // -------------------- Individual Sync Methods --------------------

    async _syncHotLeads(frappeRequest) {
        if (!frappeRequest) return;

        try {
            const response = await frappeRequest({
                url: 'https://salestrack.powerstar.co.zw/api/method/powerstar_salestrack.omnis_dashboard.get_hot_leads',
                method: 'GET'
            });

            if (response.ok && response.data && response.data.message) {
                const leads = response.data.message.data || response.data.message;
                if (Array.isArray(leads)) {
                    localDB.clearTable('hot_leads');
                    await localDB.bulkUpsert('hot_leads', leads);
                    console.log(`[SyncManager] Synced ${leads.length} hot leads`);
                }
            }
        } catch (err) {
            console.error('[SyncManager] Hot leads sync error:', err);
        }
    }

    async _syncMachineStock(frappeRequest) {
        if (!frappeRequest) return;

        try {
            const response = await frappeRequest({
                url: 'https://salestrack.powerstar.co.zw/api/method/powerstar_salestrack.omnis_dashboard.get_machine_stock',
                method: 'GET'
            });

            if (response.ok && response.data && response.data.message) {
                const stock = response.data.message.raw || response.data.message.data || [];
                if (Array.isArray(stock)) {
                    localDB.clearTable('machine_stock');
                    await localDB.bulkUpsert('machine_stock', stock);
                    console.log(`[SyncManager] Synced ${stock.length} stock records`);
                }
            }
        } catch (err) {
            console.error('[SyncManager] Machine stock sync error:', err);
        }
    }

    async _syncQuotations(frappeRequest) {
        if (!frappeRequest) return;

        try {
            const response = await frappeRequest({
                url: 'https://salestrack.powerstar.co.zw/api/method/powerstar_salestrack.omnis_dashboard.get_omnis_quotations',
                method: 'GET'
            });

            if (response.ok && response.data && response.data.message) {
                const quotes = response.data.message.data || [];
                if (Array.isArray(quotes)) {
                    localDB.clearTable('quotations');
                    await localDB.bulkUpsert('quotations', quotes);
                    console.log(`[SyncManager] Synced ${quotes.length} quotations`);
                }
            }
        } catch (err) {
            console.error('[SyncManager] Quotations sync error:', err);
        }
    }

    async _syncOrders(frappeRequest) {
        if (!frappeRequest) return;

        try {
            const response = await frappeRequest({
                url: 'https://salestrack.powerstar.co.zw/api/method/powerstar_salestrack.omnis_dashboard.get_omnis_orders',
                method: 'GET'
            });

            if (response.ok && response.data && response.data.message) {
                const orders = response.data.message.data || [];
                if (Array.isArray(orders)) {
                    localDB.clearTable('orders');
                    await localDB.bulkUpsert('orders', orders);
                    console.log(`[SyncManager] Synced ${orders.length} orders`);
                }
            }
        } catch (err) {
            console.error('[SyncManager] Orders sync error:', err);
        }
    }

    async _syncCustomers(frappeRequest) {
        if (!frappeRequest) return;

        try {
            const response = await frappeRequest({
                url: 'https://salestrack.powerstar.co.zw/api/method/powerstar_salestrack.omnis_dashboard.get_customers_list',
                method: 'POST',
                data: { start: 0, page_length: 200 }
            });

            if (response.ok && response.data && response.data.message) {
                const customers = response.data.message.data || [];
                if (Array.isArray(customers)) {
                    localDB.clearTable('customers');
                    await localDB.bulkUpsert('customers', customers);
                    console.log(`[SyncManager] Synced ${customers.length} customers`);
                }
            }
        } catch (err) {
            console.error('[SyncManager] Customers sync error:', err);
        }
    }

    async _syncGroupSales(frappeRequest) {
        if (!frappeRequest) return;

        try {
            const response = await frappeRequest({
                url: 'https://salestrack.powerstar.co.zw/api/method/powerstar_salestrack.omnis_dashboard.get_group_sales_list',
                method: 'POST',
                data: { start: 0, page_length: 200 }
            });

            if (response.ok && response.data && response.data.message) {
                const sales = response.data.message.data || [];
                if (Array.isArray(sales)) {
                    localDB.clearTable('group_sales');
                    await localDB.bulkUpsert('group_sales', sales);
                    console.log(`[SyncManager] Synced ${sales.length} group sales records`);
                }
            }
        } catch (err) {
            console.error('[SyncManager] Group Sales sync error:', err);
        }
    }

    async _syncEnquiries(frappeRequest) {
        if (!frappeRequest) return;

        try {
            const response = await frappeRequest({
                url: 'https://salestrack.powerstar.co.zw/api/method/powerstar_salestrack.omnis_dashboard.get_omnis_ces',
                method: 'POST',
                data: { start: 0, page_length: 200 }
            });

            if (response.ok && response.data && response.data.message) {
                const enquiries = response.data.message.data || [];
                if (Array.isArray(enquiries)) {
                    localDB.clearTable('enquiries');
                    await localDB.bulkUpsert('enquiries', enquiries);
                    console.log(`[SyncManager] Synced ${enquiries.length} enquiries`);
                }
            }
        } catch (err) {
            console.error('[SyncManager] Enquiries sync error:', err);
        }
    }

    // -------------------- Queue Processing --------------------

    /**
     * Queue an operation for later sync
     */
    queueOperation(doctype, docName, operation, payload) {
        localDB.queueOperation(doctype, docName, operation, payload);
        this.notifyStatusChange();

        // If online, try to process immediately
        if (this.isOnline) {
            this.processQueue().catch(err => {
                console.error('[SyncManager] Immediate queue processing failed:', err);
            });
        }
    }

    /**
     * Process all pending queue items
     */
    async processQueue(frappeRequest) {
        if (!this.isOnline || !frappeRequest) return;

        const items = localDB.getQueueItems();
        if (items.length === 0) return;

        console.log(`[SyncManager] Processing ${items.length} queued items...`);

        for (const item of items) {
            try {
                // Build API endpoint based on operation
                let url, method, data;

                switch (item.operation) {
                    case 'create':
                        url = `https://salestrack.powerstar.co.zw/api/resource/${item.doctype}`;
                        method = 'POST';
                        data = item.payload;
                        break;

                    case 'update':
                        url = `https://salestrack.powerstar.co.zw/api/resource/${item.doctype}/${item.doc_name}`;
                        method = 'PUT';
                        data = item.payload;
                        break;

                    case 'delete':
                        url = `https://salestrack.powerstar.co.zw/api/resource/${item.doctype}/${item.doc_name}`;
                        method = 'DELETE';
                        data = null;
                        break;

                    default:
                        console.warn('[SyncManager] Unknown operation:', item.operation);
                        continue;
                }

                const response = await frappeRequest({ url, method, data });

                if (response.ok) {
                    localDB.removeQueueItem(item.id);
                    console.log(`[SyncManager] Processed: ${item.operation} ${item.doctype}/${item.doc_name}`);
                } else {
                    localDB.markQueueItemFailed(item.id, JSON.stringify(response.data || response.error));
                    console.warn(`[SyncManager] Failed: ${item.operation} ${item.doctype}/${item.doc_name}`);
                }
            } catch (err) {
                localDB.markQueueItemFailed(item.id, err.message);
                console.error(`[SyncManager] Error processing ${item.doctype}/${item.doc_name}:`, err);
            }
        }

        this.notifyStatusChange();
        console.log('[SyncManager] Queue processing complete');
    }

    // -------------------- Data Access --------------------

    /**
     * Get cached data (used when offline or for instant access)
     */
    getCached(table) {
        return localDB.getAll(table);
    }

    /**
     * Get cached record by name
     */
    getCachedOne(table, name) {
        return localDB.getOne(table, name);
    }

    /**
     * Update local cache (for optimistic updates)
     */
    updateCache(table, name, data) {
        localDB.upsert(table, name, data);
    }

    // -------------------- Cleanup --------------------

    /**
     * Cleanup on app exit
     */
    cleanup() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
        localDB.close();
        console.log('[SyncManager] Cleanup complete');
    }
}

// Singleton instance
const syncManager = new SyncManager();

module.exports = syncManager;
