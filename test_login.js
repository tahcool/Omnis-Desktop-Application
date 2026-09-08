const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let win;
app.whenReady().then(() => {
    win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });
    
    // Inject a script to automatically fill and submit the login form
    win.webContents.on('did-finish-load', () => {
        win.webContents.executeJavaScript(`
            setTimeout(() => {
                document.getElementById('username').value = 'administrator@omnis.local';
                document.getElementById('password').value = '6dx6B01yKw';
                document.getElementById('submitBtn').click();
            }, 2000);
        `);
    });

    win.loadFile('index.html');
    
    // Listen to console logs
    win.webContents.on('console-message', (e, level, msg) => {
        console.log('[Electron Window]', msg);
    });
});
