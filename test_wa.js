const { app } = require('electron');
const wa = require('./lib/whatsapp-client');

app.whenReady().then(() => {
    wa.initialize();
    setTimeout(() => {
        console.log("TEST FINISHED");
        app.quit();
    }, 15000);
});
