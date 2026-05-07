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
        this.logPath = path.join(this.userDataPath, 'whatsapp_debug.log');
        this.cachePath = path.join(this.userDataPath, '.wwebjs_cache');
        
        this.retryCount = 0;
        this.maxRetries = 5;
        this.lastError = null;
        this.healthCheckTimer = null;
        
        // Registry: phone → { quoteName, followupType, isOverdue, expectedDay, frappeBaseUrl }
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
        this.startHealthCheck();
    }

    startHealthCheck() {
        if (this.healthCheckTimer) clearInterval(this.healthCheckTimer);
        this.healthCheckTimer = setInterval(() => {
            this.checkHealth();
        }, 60000); // Check every minute
    }

    async checkHealth() {
        if (this.status !== 'CONNECTED' && this.status !== 'QR_READY') return;
        
        try {
            if (this.client && this.client.pupPage) {
                const isClosed = await this.client.pupPage.isClosed();
                if (isClosed) {
                    throw new Error("Puppeteer page is closed");
                }
                // Simple ping to browser context
                await this.client.pupPage.evaluate(() => window.location.href);
            }
        } catch (e) {
            this.logEvent('HEALTH_CHECK_FAILED', e.message);
            console.warn('[WhatsApp] Health check failed, restarting...', e.message);
            this.connect();
        }
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

    logEvent(name, details = '') {
        const timestamp = new Date().toISOString();
        const msg = `[${timestamp}] EVENT: ${name} ${details}\n`;
        try {
            fs.appendFileSync(this.logPath, msg);
        } catch(e) {}
    }

    async connect() {
        console.log(`[WhatsApp] Connecting built-in client (Attempt ${this.retryCount + 1})...`);
        this.status = 'CONNECTING';
        this.broadcast('whatsapp:status', 'CONNECTING');
        
        // Cleanup old instance
        if (this.client) {
            try {
                console.log('[WhatsApp] Destroying existing client...');
                if (this.client.pupBrowser) {
                    const proc = this.client.pupBrowser.process();
                    if (proc && proc.pid) {
                        try {
                            // On Windows, forcefully kill the process tree to avoid zombie locks
                            if (process.platform === 'win32') {
                                require('child_process').execSync(`taskkill /F /T /PID ${proc.pid}`);
                            } else {
                                proc.kill('SIGKILL');
                            }
                        } catch(e) {
                            console.warn('[WhatsApp] Process kill failed:', e.message);
                        }
                    }
                }
                // Don't wait forever if destroy hangs
                await Promise.race([
                    this.client.destroy().catch(() => {}),
                    new Promise(r => setTimeout(r, 2000))
                ]);
            } catch (e) {
                console.warn('[WhatsApp] Error during cleanup:', e.message);
            }
            this.client = null;
        }

        // Force remove SingletonLock to prevent "already running" error
        try {
            const lockFile = path.join(this.authPath, 'session-omnis-main', 'SingletonLock');
            if (fs.existsSync(lockFile)) {
                fs.unlinkSync(lockFile);
                console.log('[WhatsApp] Removed old SingletonLock');
            }
        } catch(e) {}

        const chromePath = this._findChrome();
        const puppeteerOptions = {
            headless: true, // Revert to standard headless to avoid "Navigating frame was detached"
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--no-first-run',
                '--no-zygote',
                '--disable-extensions',
                '--disable-software-rasterizer',
                '--disable-background-networking',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding'
            ]
        };

        if (chromePath) {
            puppeteerOptions.executablePath = chromePath;
        }

        // On repeated failures, try clearing the version cache (often fixes sync issues)
        if (this.retryCount >= 3 && fs.existsSync(this.cachePath)) {
            this.logEvent('CACHE_PURGE', 'Triggered after 3 failures');
            try { fs.rmSync(this.cachePath, { recursive: true, force: true }); } catch(e) {}
        }

        this.client = new Client({
            authStrategy: new LocalAuth({
                clientId: 'omnis-main',
                dataPath: this.authPath
            }),
            authTimeoutMs: 120000, 
            restartOnAuthDiff: true,
            puppeteer: puppeteerOptions,
            webVersionCache: {
                type: 'remote',
                remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.3000.1018873837-alpha.html'
            }
        });

        this.logEvent('CLIENT_INIT', `Headless: new. ChromePath: ${chromePath}`);

        this.client.on('qr', async (qr) => {
            this.retryCount = 0; // QR means initialization succeeded
            this.qrCode = await QRCode.toDataURL(qr);
            this.status = 'QR_READY';
            this.broadcast('whatsapp:qr', this.qrCode);
            this.broadcast('whatsapp:status', 'QR_READY');
            this.logEvent('qr_received');
        });

        this.client.on('ready', () => {
            this.retryCount = 0;
            this.isReady = true;
            this.status = 'CONNECTED';
            this.qrCode = null;
            this.broadcast('whatsapp:status', 'CONNECTED');
            this.logEvent('ready');
        });

        this.client.on('authenticated', () => {
            this.isReady = true;
            this.status = 'CONNECTED';
            this.broadcast('whatsapp:status', 'CONNECTED');
            this.logEvent('authenticated');
        });

        this.client.on('auth_failure', (msg) => {
            this.logEvent('auth_failure', msg);
            this.status = 'ERROR';
            this.broadcast('whatsapp:status', 'AUTH_FAILURE', msg);
            // Wipe session on hard auth failure
            if (fs.existsSync(this.authPath)) {
                try { fs.rmSync(this.authPath, { recursive: true, force: true }); } catch(e) {}
            }
        });

        this.client.on('disconnected', (reason) => {
            this.logEvent('disconnected', reason);
            this.isReady = false;
            this.status = 'DISCONNECTED';
            this.broadcast('whatsapp:status', 'DISCONNECTED', reason);
            
            // Auto-reconnect with 10s delay
            setTimeout(() => this.connect(), 10000);
        });

        // 💬 Reply-to-Log: Listen for incoming messages from sales reps
        this.client.on('message', async (msg) => {
            try {
                if (msg.fromMe) return; 
                const senderNumber = msg.from.replace('@c.us', '').replace('@g.us', '');
                const entry = this.pendingReplies.get(senderNumber);
                if (!entry) return; 

                const feedbackText = (msg.body || '').trim();
                if (!feedbackText || feedbackText.length < 3) return; 

                if (Date.now() - entry.registeredAt > 48 * 60 * 60 * 1000) {
                    this.pendingReplies.delete(senderNumber);
                    return;
                }

                // Post feedback to Frappe via background HTTP request
                this._logFeedbackToFrappe(msg, entry, feedbackText, senderNumber);
            } catch (err) {
                console.error('[WhatsApp] Message handler error:', err);
            }
        });

        this.client.initialize().catch(err => {
            this.lastError = err.message;
            this.logEvent('INIT_ERROR', err.message);
            this.status = 'ERROR';
            
            // Exponential backoff retries for soft errors
            if (this.retryCount < this.maxRetries) {
                this.retryCount++;
                const delay = Math.pow(2, this.retryCount) * 5000; // 10s, 20s, 40s...
                this.broadcast('whatsapp:status', 'ERROR', `Reconnecting in ${delay/1000}s... (${err.message})`);
                setTimeout(() => this.connect(), delay);
            } else {
                this.broadcast('whatsapp:status', 'ERROR', `Permanent Error: ${err.message}. Please click 'Hard Reset'.`);
            }
        });
    }

    _logFeedbackToFrappe(msg, entry, feedbackText, senderNumber) {
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
            res.on('data', () => {});
            res.on('end', () => {
                this.pendingReplies.delete(senderNumber);
                try {
                    msg.reply(`✅ Thank you! Your follow-up feedback for *${entry.quoteName}* has been logged automatically.`);
                } catch (e) {}
            });
        });
        req.on('error', (e) => console.error('[WhatsApp] HTTP Log error:', e.message));
        req.write(postData);
        req.end();
    }

    async waitForReady(timeout = 60000) {
        if (this.isReady) return true;
        const start = Date.now();
        while (!this.isReady && (Date.now() - start < timeout)) {
            await new Promise(r => setTimeout(r, 1000));
        }
        if (!this.isReady) throw new Error("WhatsApp is still syncing. Please wait a moment.");
        return true;
    }

    setupIPC() {
        ipcMain.handle('whatsapp:get-status', () => ({ status: this.status, qr: this.qrCode, lastError: this.lastError }));

        ipcMain.handle('whatsapp:logout', async () => {
            this.logEvent('LOGOUT_REQUESTED');
            try { if (this.client) await this.client.destroy(); } catch (e) {}
            if (fs.existsSync(this.authPath)) fs.rmSync(this.authPath, { recursive: true, force: true });
            this.retryCount = 0;
            this.isReady = false;
            this.connect();
            return { ok: true };
        });

        ipcMain.handle('whatsapp:reconnect', async () => {
            this.logEvent('RECONNECT_REQUESTED');
            this.retryCount = 0;
            this.connect();
            return { ok: true };
        });

        ipcMain.handle('whatsapp:send-msg', async (event, { to, body }) => {
            try {
                await this.waitForReady();
                let digits = to.replace(/\D/g, '');
                if (digits.startsWith('0') && digits.length === 10) digits = '263' + digits.substring(1);
                const formattedId = digits + '@c.us';
                const res = await this.client.sendMessage(formattedId, body);
                return { ok: true, messageId: res.id.id };
            } catch (err) {
                return { ok: false, error: err.message };
            }
        });

        ipcMain.handle('whatsapp:send-media', async (event, { to, url, base64, filename, caption }) => {
            try {
                await this.waitForReady();
                const { MessageMedia } = require('whatsapp-web.js');
                let media;
                if (url) media = await MessageMedia.fromUrl(url);
                else if (base64) media = new MessageMedia('image/jpeg', base64, filename || 'image.jpg');
                
                let digits = to.replace(/\D/g, '');
                if (digits.startsWith('0') && digits.length === 10) digits = '263' + digits.substring(1);
                const res = await this.client.sendMessage(digits + '@c.us', media, { caption });
                return { ok: true, messageId: res.id.id };
            } catch (err) {
                return { ok: false, error: err.message };
            }
        });

        ipcMain.handle('whatsapp:send-to-group', async (event, { groupName, body }) => {
            try {
                await this.waitForReady();
                const chats = await this.client.getChats();
                const group = chats.find(c => c.isGroup && c.name === groupName);
                if (group) {
                    const res = await this.client.sendMessage(group.id._serialized, body);
                    return { ok: true, messageId: res.id.id };
                } else {
                    return { ok: false, error: `Group '${groupName}' not found on this device` };
                }
            } catch (err) {
                return { ok: false, error: err.message };
            }
        });
    }

    broadcast(channel, status, detail = '') {
        const { BrowserWindow } = require('electron');
        const wins = BrowserWindow.getAllWindows();
        wins.forEach(win => {
            try { win.webContents.send(channel, status, detail); } catch(e) {}
        });
    }
}

module.exports = new WhatsappManager();
