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
        this.supabase = null;
    }

    /**
     * Set Supabase client
     */
    setSupabase(client) {
        this.supabase = client;
    }

    /**
     * Initialize sync manager
     */
    initialize() {
        localDB.initialize();
        this.lastSync = localDB.getMeta('last_sync');
        
        const notify = (msg, type = "info") => {
            BrowserWindow.getAllWindows().forEach(win => {
                if (win.webContents) win.webContents.send('omnis:log', { message: msg, type });
            });
        };

        const stats = localDB.getStats();
        console.log('[SyncManager] Initialized. Last sync:', this.lastSync);
        console.log('[SyncManager] DB Path:', stats.path);

        // Immediate sync check for critical data (Product Catalog) if empty
        setTimeout(async () => {
            try {
                notify(`📁 Local Cache: ${stats.products} products found.`, "info");
                notify(`📍 DB Path: ${stats.path}`, "info");

                if (stats.products === 0 && this.isOnline) {
                    notify("📢 Local Catalog is empty. Auto-syncing from Supabase...", "sync");
                    await this._syncProductCatalog();
                }
            } catch (err) {
                console.error('[SyncManager] Initial catalog sync failed:', err);
                notify(`❌ Initial Sync Error: ${err.message}`, "error");
            }
        }, 3000); // Wait 3s after startup

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

            // Sync Supabase Product Catalog
            await this._syncProductCatalog();

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
                url: 'https://salestrack.powerstar.co.zw/api/method/powerstar_salestrack.omnis_dashboard.get_omnis_quotations_with_items',
                method: 'GET',
                data: { page_length: 50 }
            });

            if (response.ok && response.data && response.data.message) {
                const { headers, items } = response.data.message.data || {};
                
                if (Array.isArray(headers)) {
                    // 1. Sync Headers locally
                    localDB.clearTable('quotations');
                    await localDB.bulkUpsert('quotations', headers);
                    console.log(`[SyncManager] Synced ${headers.length} quotations locally`);

                    // 2. Sync to Supabase
                    if (this.supabase && headers.length > 0) {
                        const mappedHeaders = headers.map(q => ({
                            name: (q.name.match(/(SAL-QTN-\d+-\d+)/) || [q.name])[0],
                            customer_name: q.customer_name,
                            transaction_date: q.transaction_date,
                            grand_total: parseFloat(q.grand_total || 0),
                            status: q.status,
                            company: q.company,
                            custom_sales_person: q.custom_sales_person,
                            territory: q.territory,
                            customer_group: q.customer_group,
                            docstatus: q.docstatus,
                            owner: q.owner,
                            creation: q.creation,
                            modified: q.modified,
                            currency: q.currency,
                            total_qty: parseFloat(q.total_qty || 0),
                            valid_till: q.valid_till
                        }));

                        const { error: hErr } = await this.supabase.from('quotations').upsert(mappedHeaders);
                        if (hErr) console.error('[SyncManager] Supabase Header Sync Error:', hErr);
                        
                        if (Array.isArray(items) && items.length > 0) {
                            const mappedItems = items.map(i => ({
                                parent: (i.parent.match(/(SAL-QTN-\d+-\d+)/) || [i.parent])[0],
                                item_code: i.item_code,
                                item_name: i.item_name,
                                qty: parseFloat(i.qty || 0),
                                rate: parseFloat(i.rate || 0),
                                amount: parseFloat(i.amount || 0),
                                brand: i.brand,
                                item_group: i.item_group
                            }));
                            
                            // Note: For items we use insert or a robust upsert if possible.
                            // Since we don't have a unique ID for items yet, we might get duplicates if we are not careful.
                            // But for delta sync, it's usually fine if we clear/replace.
                            // However, in Supabase we don't want to clear the whole table.
                            // Ideal: Delete items for the 'parent' names in this batch first.
                            const parentNames = [...new Set(mappedItems.map(i => i.parent))];
                            await this.supabase.from('quotation_items').delete().in('parent', parentNames);
                            
                            const { error: iErr } = await this.supabase.from('quotation_items').insert(mappedItems);
                            if (iErr) console.error('[SyncManager] Supabase Items Sync Error:', iErr);
                        }
                        
                        console.log(`[SyncManager] Synced ${headers.length} quotations to Supabase`);
                    }
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

    /**
     * Gradual import of customers from Frappe to Supabase
     */
    async importCustomersGradual(frappeRequest) {
        if (!frappeRequest || this.isSyncing) return;
        
        this.isSyncing = true;
        const notify = (msg, type = "info") => {
            BrowserWindow.getAllWindows().forEach(win => {
                if (win.webContents) win.webContents.send('omnis:log', { message: msg, type });
            });
        };

        notify("🚀 Starting Gradual Customer Import...", "sync");

        try {
            let start = 0;
            const page_length = 100;
            let finished = false;
            let totalImported = 0;

            while (!finished) {
                notify(`📡 Fetching customers ${start} to ${start + page_length}...`, "sync");
                
                const response = await frappeRequest({
                    url: 'https://salestrack.powerstar.co.zw/api/method/powerstar_salestrack.omnis_dashboard.get_customers_list',
                    method: 'POST',
                    data: { start, page_length }
                });

                if (response.ok && response.data && response.data.message) {
                    const customers = response.data.message.data || [];
                    
                    if (!Array.isArray(customers) || customers.length === 0) {
                        finished = true;
                        break;
                    }

                    // Map to Supabase format
                    const mapped = customers.map(c => ({
                        frappe_id: c.name || c.id,
                        customer_name: c.customer_name || c.name,
                        customer_group: c.customer_group,
                        territory: c.territory,
                        customer_type: c.customer_type,
                        default_price_list: c.default_price_list
                    }));

                    // Push to Supabase
                    if (this.supabase) {
                        const { error } = await this.supabase.from('customers').upsert(mapped);
                        if (error) {
                            console.error("[SyncManager] Supabase Error:", error);
                            notify(`⚠️ Batch error: ${error.message}`, "warning");
                        }
                    }

                    // Push to Local Cache
                    await localDB.bulkUpsert('customers', customers);

                    totalImported += customers.length;
                    notify(`✅ Imported ${totalImported} customers so far...`, "success");

                    if (customers.length < page_length) {
                        finished = true;
                    } else {
                        start += page_length;
                        // Sleep to be gentle on server
                        await new Promise(r => setTimeout(r, 2000));
                    }
                } else {
                    finished = true;
                    notify("⚠️ Batch fetch returned no data or error.", "warning");
                }
            }

            notify(`✨ Import Complete! ${totalImported} customers successfully migrated.`, "success");
        } catch (err) {
            console.error('[SyncManager] Customer import error:', err);
            notify(`❌ Import Error: ${err.message}`, "error");
        } finally {
            this.isSyncing = false;
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

    async _syncProductCatalog() {
        if (!this.supabase) {
            console.error('[SyncManager] Supabase client not set');
            return;
        }

        const notify = (msg, type = "info") => {
            BrowserWindow.getAllWindows().forEach(win => {
                if (win.webContents) win.webContents.send('omnis:log', { message: msg, type });
            });
        };

        notify("🔄 Starting Catalog Sync...", "sync");

        try {
            // 1. Sync Brands
            const { data: brands, error: bErr } = await this.supabase.from('brands').select('*');
            if (bErr) {
                notify(`❌ Brands Sync Error: ${bErr.message}`, "error");
            } else if (brands) {
                localDB.clearTable('brands');
                await localDB.bulkUpsert('brands', brands);
                notify(`✅ Synced ${brands.length} brands`, "success");
            }

            // 2. Sync Item Groups
            const { data: groups, error: gErr } = await this.supabase.from('item_groups').select('*');
            if (gErr) {
                notify(`❌ Item Groups Sync Error: ${gErr.message}`, "error");
            } else if (groups) {
                localDB.clearTable('item_groups');
                await localDB.bulkUpsert('item_groups', groups);
                notify(`✅ Synced ${groups.length} item groups`, "success");
            }

            // 3. Sync Products
            notify("📡 Fetching products from Supabase...", "sync");
            const { data: products, error: pErr } = await this.supabase.from('products').select('*');
            if (pErr) {
                notify(`❌ Products Sync Error: ${pErr.message}`, "error");
            } else if (products) {
                notify(`📦 Processing ${products.length} products...`, "sync");
                localDB.clearTable('products');
                await localDB.bulkUpsert('products', products);
                notify(`✨ Catalog Sync Complete! ${products.length} products ready.`, "success");
            }
        } catch (err) {
            console.error('[SyncManager] Product catalog sync error:', err);
            notify(`❌ Fatal Sync Error: ${err.message}`, "error");
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
                const isSupabaseTable = ['products', 'brands', 'item_groups'].includes(item.doctype);
                let response;

                if (isSupabaseTable && this.supabase) {
                    // Handle Supabase operations
                    let supaRes;
                    switch (item.operation) {
                        case 'create':
                        case 'upsert':
                            supaRes = await this.supabase.from(item.doctype).upsert(item.payload);
                            break;
                        case 'update':
                            supaRes = await this.supabase.from(item.doctype).update(item.payload).match({ id: item.doc_name });
                            break;
                        case 'delete':
                            supaRes = await this.supabase.from(item.doctype).delete().match({ id: item.doc_name });
                            break;
                    }
                    response = { ok: !supaRes.error, data: supaRes.data, error: supaRes.error };
                } else if (frappeRequest) {
                    // Handle Frappe operations
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
                    response = await frappeRequest({ url, method, data });
                } else {
                    continue; // Skip if no way to process
                }

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
     * Search cached data
     */
    searchCached(table, query, fields) {
        return localDB.search(table, query, fields);
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

    /**
     * Update local cache in bulk
     */
    async updateCacheBulk(table, records) {
        await localDB.bulkUpsert(table, records);
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
