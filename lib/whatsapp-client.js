const { Client, LocalAuth } = require('whatsapp-web.js');
const { ipcMain, app } = require('electron');
const path = require('path');
const QRCode = require('qrcode');
const fs = require('fs');

class WhatsappManager {
    constructor() {
        this.client = null;
        this.isReady = false;
        this.qrCode = null;
        this.status = 'DISCONNECTED';
        this.userDataPath = app.getPath('userData');
        // Force a fresh session directory after persistent linking failures
        this.authPath = path.join(this.userDataPath, '.whatsapp_auth_v2');
        // Registry: phone → { quoteName, followupType, isOverdue, expectedDay, frappeBaseUrl }
        // Expires after 48 hours so stale entries don't accumulate
        this.pendingReplies = new Map();
    }

    initialize() {
        if (this.ipcSetup) return;
        this.setupIPC();
        this.ipcSetup = true;
        
        // Ensure auth path exists
        if (!fs.existsSync(this.authPath)) {
            try { fs.mkdirSync(this.authPath, { recursive: true }); } catch(e) {}
        }
        
        this.connect();
    }

    _findChrome() {
        if (process.platform !== 'win32') return null;
        try {
            const paths = [
                'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
                'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
                'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
            ];
            if (process.env.LOCALAPPDATA) {
                paths.push(path.join(process.env.LOCALAPPDATA, 'Google\\Chrome\\Application\\chrome.exe'));
            }
            for (const p of paths) {
                if (fs.existsSync(p)) return p;
            }
        } catch (e) {
            console.error('[WhatsApp] Error finding Chrome:', e);
        }
        return null;
    }

    connect() {
        console.log('[WhatsApp] Connecting built-in client...');
        this.status = 'CONNECTING';
        this.broadcast('whatsapp:status', 'CONNECTING');
        
        if (this.client) {
            try { this.client.destroy(); } catch (e) {}
        }

        const chromePath = this._findChrome();
        const puppeteerOptions = {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--no-first-run',
                '--no-zygote',
                '--disable-extensions'
            ]
        };

        if (chromePath) {
            console.log('[WhatsApp] Found system browser at:', chromePath);
            puppeteerOptions.executablePath = chromePath;
        }

        this.client = new Client({
            authStrategy: new LocalAuth({
                clientId: 'omnis-main',
                dataPath: this.authPath
            }),
            authTimeoutMs: 120000, 
            puppeteer: {
                ...puppeteerOptions,
                headless: 'new',
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu',
                    '--disable-extensions',
                    '--disable-software-rasterizer',
                    '--mute-audio'
                ]
            },
            webVersionCache: {
                type: 'remote',
                remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.3000.1018873837-alpha.html'
            }
        });

        fs.appendFileSync('whatsapp_debug.log', `[${new Date().toISOString()}] Client configured. Headless: new. ChromePath: ${chromePath}\n`);

        const logEvent = (name, details = '') => {
            const timestamp = new Date().toISOString();
            fs.appendFileSync('whatsapp_debug.log', `[${timestamp}] EVENT: ${name} ${details}\n`);
        };

        this.client.on('qr', async (qr) => {
            console.log('[WhatsApp] QR Code received');
            logEvent('qr', 'QR code received from WWebJS');
            try {
                const qrDataUrl = await QRCode.toDataURL(qr);
                logEvent('qr_generated', `DataURL length: ${qrDataUrl.length}`);
                this.qrCode = qrDataUrl;
                this.status = 'QR_READY';
                this.broadcast('whatsapp:qr', qrDataUrl);
                this.broadcast('whatsapp:status', 'QR_READY');
            } catch (err) {
                console.error('[WhatsApp] QR Generation error:', err);
                logEvent('qr_error', err.message);
                this.status = 'ERROR';
                this.broadcast('whatsapp:status', 'ERROR');
            }
        });

        this.client.on('ready', () => {
            console.log('[WhatsApp] Client is ready!');
            logEvent('ready');
            this.isReady = true;
            this.status = 'CONNECTED';
            this.qrCode = null;
            this.broadcast('whatsapp:status', 'CONNECTED');
        });

        // 💬 Reply-to-Log: Listen for incoming messages from sales reps
        this.client.on('message', async (msg) => {
            try {
                if (msg.fromMe) return; // Ignore messages we sent
                const senderNumber = msg.from.replace('@c.us', '').replace('@g.us', '');
                const entry = this.pendingReplies.get(senderNumber);
                if (!entry) return; // Not a tracked rep, ignore

                const feedbackText = (msg.body || '').trim();
                if (!feedbackText || feedbackText.length < 3) return; // Ignore very short/empty replies

                // Check expiry (48 hours)
                if (Date.now() - entry.registeredAt > 48 * 60 * 60 * 1000) {
                    this.pendingReplies.delete(senderNumber);
                    return;
                }

                console.log(`[WhatsApp] Auto-logging reply from ${senderNumber} for quote ${entry.quoteName}`);

                // Post feedback to Frappe
                const https = require('https');
                const http = require('http');
                const url = require('url');

                const frappe_method = entry.followupType === 'first'
                    ? 'powerstar_salestrack.quotation_follow_up.handle_first_follow_up'
                    : 'powerstar_salestrack.quotation_follow_up.handle_second_follow_up';

                const postData = new URLSearchParams({
                    quotation_name: entry.quoteName,
                    feedback: feedbackText,
                    delay_reason: entry.isOverdue ? '(Submitted via WhatsApp reply)' : '',
                    overdue: entry.isOverdue ? '1' : '0',
                    overdue_days: String(entry.overdueDays || 0)
                }).toString();

                const parsed = url.parse(`${entry.frappeBaseUrl}/api/method/${frappe_method}`);
                const reqModule = parsed.protocol === 'https:' ? https : http;

                const req = reqModule.request({
                    hostname: parsed.hostname,
                    port: parsed.port,
                    path: parsed.path,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Content-Length': Buffer.byteLength(postData)
                    }
                }, (res) => {
                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => {
                        console.log(`[WhatsApp] Feedback logged for ${entry.quoteName}: HTTP ${res.statusCode}`);
                        // Remove the pending entry so a second reply doesn't double-log
                        this.pendingReplies.delete(senderNumber);
                        // Acknowledge to the rep on WhatsApp
                        try {
                            msg.reply(`✅ Thank you! Your follow-up feedback for *${entry.quoteName}* has been logged automatically.`);
                        } catch (replyErr) {
                            console.warn('[WhatsApp] Could not send acknowledgment reply:', replyErr.message);
                        }
                    });
                });
                req.on('error', (err) => console.error('[WhatsApp] Auto-log HTTP error:', err.message));
                req.write(postData);
                req.end();

            } catch (err) {
                console.error('[WhatsApp] Reply-to-log handler error:', err);
            }
        });

        this.client.on('authenticated', () => {
            console.log('[WhatsApp] Authenticated successfully');
            logEvent('authenticated');
            // We set CONNECTED here immediately to unblock the UI. 
            // whatsapp-web.js can take a long time to fire 'ready' while syncing chats.
            this.isReady = true;
            this.status = 'CONNECTED';
            this.broadcast('whatsapp:status', 'CONNECTED');
        });

        this.client.on('auth_failure', (msg) => {
            console.error('[WhatsApp] Authentication failure:', msg);
            logEvent('auth_failure', msg);
            this.status = 'ERROR';
            this.broadcast('whatsapp:status', 'AUTH_FAILURE');
            // Wipe on auth failure
            if (fs.existsSync(this.authPath)) {
                try { fs.rmSync(this.authPath, { recursive: true, force: true }); } catch(e) {}
            }
        });

        this.client.on('disconnected', (reason) => {
            console.log('[WhatsApp] Client was logged out:', reason);
            logEvent('disconnected', reason);
            this.isReady = false;
            this.status = 'DISCONNECTED';
            this.broadcast('whatsapp:status', 'DISCONNECTED');
            setTimeout(() => this.connect(), 10000);
        });

        console.log('[WhatsApp] Calling initialize()...');
        this.client.initialize().then(() => {
            console.log('[WhatsApp] initialize() promise resolved');
            fs.appendFileSync('whatsapp_debug.log', `[${new Date().toISOString()}] initialize() resolved\n`);
        }).catch(err => {
            console.error('[WhatsApp] Global client error:', err);
            this.status = 'ERROR';
            const errorMsg = err.message || 'Initialization failed';
            const stack = err.stack || 'No stack trace';
            
            fs.appendFileSync('whatsapp_debug.log', `[${new Date().toISOString()}] ERROR: ${errorMsg}\nSTACK: ${stack}\n`);
            
            if (errorMsg.includes('Chromium') || errorMsg.includes('browser')) {
                this.broadcast('whatsapp:status', 'ERR_NO_BROWSER', 'Chrome/Edge not found');
            } else if (errorMsg.includes('Session closed') || errorMsg.includes('detached')) {
                this.broadcast('whatsapp:status', 'ERROR', 'Browser context lost. Retrying...');
                setTimeout(() => this.connect(), 5000);
            } else {
                this.broadcast('whatsapp:status', 'ERROR', errorMsg);
            }
        });

        // 💓 Status Heartbeat Pulse
        if (!this.heartbeat) {
            this.heartbeat = setInterval(() => {
                this.broadcast('whatsapp:status', this.status);
            }, 5000);
        }
    }

    async waitForReady(timeout = 60000) {
        if (this.isReady) return true;
        const start = Date.now();
        while (!this.isReady && (Date.now() - start < timeout)) {
            await new Promise(r => setTimeout(r, 1000));
        }
        if (!this.isReady) throw new Error("WhatsApp is still syncing chats in the background. Please wait a moment and try again.");
        return true;
    }

    setupIPC() {
        ipcMain.handle('whatsapp:get-status', () => {
            return { status: this.status, qr: this.qrCode };
        });

        // Register a reply-to-log entry so we can capture the rep's WhatsApp reply as feedback
        ipcMain.handle('whatsapp:register-pending-reply', (event, { phone, quoteName, followupType, isOverdue, overdueDays, frappeBaseUrl }) => {
            // Normalise phone: strip non-digits, convert local Zim numbers
            let digits = (phone || '').replace(/\D/g, '');
            if (digits.startsWith('0') && digits.length === 10) digits = '263' + digits.substring(1);
            this.pendingReplies.set(digits, {
                quoteName,
                followupType: followupType || 'first',
                isOverdue: !!isOverdue,
                overdueDays: overdueDays || 0,
                frappeBaseUrl,
                registeredAt: Date.now()
            });
            console.log(`[WhatsApp] Pending reply registered for ${digits} → ${quoteName}`);
            return { ok: true };
        });

        ipcMain.handle('whatsapp:logout', async () => {
            console.log('[WhatsApp] Explicit logout requested. Wiping session...');
            try {
                if (this.client) {
                    await this.client.destroy();
                }
            } catch (err) {
                console.warn('[WhatsApp] Error destroying client during logout:', err.message);
            }

            // Wipe auth cache
            if (fs.existsSync(this.authPath)) {
                fs.rmSync(this.authPath, { recursive: true, force: true });
            }

            this.isReady = false;
            this.status = 'DISCONNECTED';
            this.qrCode = null;
            
            // Re-initialize to generate a fresh QR
            this.initialize();
            
            this.broadcast('whatsapp:status', 'DISCONNECTED');
            return { ok: true };
        });

        ipcMain.handle('whatsapp:reconnect', async () => {
            console.log('[WhatsApp] Reconnect requested. Restarting client...');
            try {
                if (this.client) {
                    await this.client.destroy();
                }
            } catch (err) {
                console.warn('[WhatsApp] Error destroying client during reconnect:', err.message);
            }

            this.isReady = false;
            this.status = 'DISCONNECTED';
            this.qrCode = null;
            
            // Reconnect using existing session
            this.connect();
            
            this.broadcast('whatsapp:status', 'DISCONNECTED');
            return { ok: true };
        });

        ipcMain.handle('whatsapp:send-msg', async (event, { to, body }) => {
            try {
                await this.waitForReady();
                // Ensure number is in correct format (digits + @c.us or @g.us)
                let chatId = to;
                let digits = to.replace(/\D/g, '');
                // Automatically convert local Zimbabwe numbers to international
                if (digits.startsWith('0') && digits.length === 10) {
                    digits = '263' + digits.substring(1);
                }
                const formattedId = digits + '@c.us';

                console.log(`[WhatsApp] Validating number: ${formattedId}`);
                
                // Force WhatsApp to resolve and cache the chat object to prevent "getChat" undefined errors
                const registeredId = await this.client.getNumberId(formattedId);
                if (!registeredId) {
                    throw new Error("This number is not registered on WhatsApp.");
                }

                console.log(`[WhatsApp] Sending message to ${registeredId._serialized}`);
                const res = await this.client.sendMessage(registeredId._serialized, body);
                return { ok: true, messageId: res.id.id };
            } catch (err) {
                console.error('[WhatsApp] Send error:', err);
                // Handle detached frame or similar Puppeteer errors by re-connecting
                if (err.message && (err.message.includes('detached') || err.message.includes('Session closed'))) {
                    console.warn('[WhatsApp] Puppeteer context lost. Attempting re-connection...');
                    this.isReady = false;
                    this.status = 'DISCONNECTED';
                    this.connect();
                }
                return { ok: false, error: err.message };
            }
        });

        ipcMain.handle('whatsapp:send-to-group', async (event, { groupName, body }) => {
            try {
                await this.waitForReady();
                // Bypass the problematic getChats() function that crashes on some WWebJS versions
                // We evaluate directly in the browser to find the group ID by name
                let groupId = await this.client.pupPage.evaluate((gName) => {
                    if (window.Store && window.Store.Chat) {
                        try {
                            const chats = window.Store.Chat.getModelsArray();
                            const group = chats.find(c => c.isGroup && c.name === gName);
                            if (group) return group.id._serialized;
                        } catch(e) {}
                    }
                    if (window.WWebJS && window.WWebJS.getChats) {
                        try {
                            const chats = window.WWebJS.getChats();
                            const group = chats.find(c => c.isGroup && c.name === gName);
                            if (group) return group.id._serialized;
                        } catch(e) {}
                    }
                    return null;
                }, groupName);

                if (!groupId) {
                    console.warn(`[WhatsApp] Raw DOM lookup failed for group "${groupName}". Falling back to native getChats()...`);
                    try {
                        const chats = await this.client.getChats();
                        const group = chats.find(c => c.isGroup && c.name === groupName);
                        if (group) groupId = group.id._serialized;
                    } catch (nativeErr) {
                        console.error('[WhatsApp] Native getChats() fallback failed:', nativeErr.message);
                    }
                }

                if (!groupId) {
                    throw new Error(`Group "${groupName}" not found or WhatsApp sync incomplete.`);
                }

                console.log(`[WhatsApp] Sending to group: ${groupName} (${groupId})`);
                const res = await this.client.sendMessage(groupId, body);
                return { ok: true, messageId: res.id.id };
            } catch (err) {
                console.error('[WhatsApp] Group send error:', err);
                return { ok: false, error: err.message };
            }
        });
    }

    broadcast(channel, data) {
        const { BrowserWindow } = require('electron');
        const wins = BrowserWindow.getAllWindows();
        wins.forEach(win => win.webContents.send(channel, data));
    }
}

module.exports = new WhatsappManager();
