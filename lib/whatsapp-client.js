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
        const paths = [
            'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
            path.join(process.env.LOCALAPPDATA, 'Google\\Chrome\\Application\\chrome.exe')
        ];
        for (const p of paths) {
            if (fs.existsSync(p)) return p;
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
                '--disable-extensions',
                '--remote-debugging-port=9222'
            ]
        };

        if (chromePath) {
            console.log('[WhatsApp] Found system browser at:', chromePath);
            puppeteerOptions.executablePath = chromePath;
        }

        this.client = new Client({
            authStrategy: new LocalAuth({
                dataPath: this.authPath
            }),
            authTimeoutMs: 120000, // Very generous timeout
            puppeteer: puppeteerOptions
        });

        this.client.on('qr', async (qr) => {
            console.log('[WhatsApp] QR Code received');
            try {
                const qrDataUrl = await QRCode.toDataURL(qr);
                this.qrCode = qrDataUrl;
                this.status = 'QR_READY';
                this.broadcast('whatsapp:qr', qrDataUrl);
                this.broadcast('whatsapp:status', 'QR_READY');
            } catch (err) {
                console.error('[WhatsApp] QR Generation error:', err);
                this.status = 'ERROR';
                this.broadcast('whatsapp:status', 'ERROR');
            }
        });

        this.client.on('ready', () => {
            console.log('[WhatsApp] Client is ready!');
            this.isReady = true;
            this.status = 'CONNECTED';
            this.qrCode = null;
            this.broadcast('whatsapp:status', 'CONNECTED');
        });

        this.client.on('authenticated', () => {
            console.log('[WhatsApp] Authenticated successfully');
            // We don't set CONNECTED here yet, wait for 'ready' event
            // to ensure isReady is true before UI allows sending.
            this.status = 'AUTHENTICATING';
            this.broadcast('whatsapp:status', 'AUTHENTICATING');
        });

        this.client.on('auth_failure', (msg) => {
            console.error('[WhatsApp] Authentication failure:', msg);
            this.status = 'ERROR';
            this.broadcast('whatsapp:status', 'AUTH_FAILURE');
            // Wipe on auth failure
            if (fs.existsSync(this.authPath)) {
                try { fs.rmSync(this.authPath, { recursive: true, force: true }); } catch(e) {}
            }
        });

        this.client.on('disconnected', (reason) => {
            console.log('[WhatsApp] Client was logged out:', reason);
            this.isReady = false;
            this.status = 'DISCONNECTED';
            this.broadcast('whatsapp:status', 'DISCONNECTED');
            setTimeout(() => this.connect(), 10000);
        });

        console.log('[WhatsApp] Calling initialize()...');
        this.client.initialize().then(() => {
            console.log('[WhatsApp] initialize() promise resolved');
        }).catch(err => {
            console.error('[WhatsApp] Global client error:', err);
            this.status = 'ERROR';
            this.broadcast('whatsapp:status', 'ERROR');
            
            if (err.message.includes('Chromium') || err.message.includes('browser')) {
                this.broadcast('whatsapp:status', 'ERR_NO_BROWSER');
            }
        });

        // 💓 Status Heartbeat Pulse
        if (!this.heartbeat) {
            this.heartbeat = setInterval(() => {
                this.broadcast('whatsapp:status', this.status);
            }, 5000);
        }
    }

    setupIPC() {
        ipcMain.handle('whatsapp:get-status', () => {
            return { status: this.status, qr: this.qrCode };
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

        ipcMain.handle('whatsapp:send-msg', async (event, { to, body }) => {
            if (!this.isReady) throw new Error('WhatsApp is not connected.');
            
            try {
                // Ensure number is in correct format (digits + @c.us or @g.us)
                let chatId = to;
                if (!chatId.includes('@')) {
                    // Assume it's a phone number
                    chatId = to.replace(/\D/g, '') + '@c.us';
                }

                console.log(`[WhatsApp] Sending message to ${chatId}`);
                const res = await this.client.sendMessage(chatId, body);
                return { ok: true, messageId: res.id.id };
            } catch (err) {
                console.error('[WhatsApp] Send error:', err);
                // Handle detached frame or similar Puppeteer errors by re-connecting
                if (err.message.includes('detached') || err.message.includes('Session closed')) {
                    console.warn('[WhatsApp] Puppeteer context lost. Attempting re-connection...');
                    this.isReady = false;
                    this.status = 'DISCONNECTED';
                    this.connect();
                }
                return { ok: false, error: err.message };
            }
        });

        ipcMain.handle('whatsapp:send-to-group', async (event, { groupName, body }) => {
            if (!this.isReady) throw new Error('WhatsApp is not connected.');

            try {
                const chats = await this.client.getChats();
                const group = chats.find(c => c.isGroup && c.name === groupName);

                if (!group) {
                    throw new Error(`Group "${groupName}" not found.`);
                }

                console.log(`[WhatsApp] Sending to group: ${group.name} (${group.id._serialized})`);
                const res = await this.client.sendMessage(group.id._serialized, body);
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
