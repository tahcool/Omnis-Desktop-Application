const fs = require('fs');
let content = fs.readFileSync('main.js', 'utf8');

const auxHandler = `
// Open Auxiliary Window without closing current window
ipcMain.handle('window:openAuxiliary', async (event, url) => {
  const auxWin = new BrowserWindow({
    width: 1400,
    height: 900,
    frame: true,
    autoHideMenuBar: true,
    center: true,
    show: false,
    backgroundColor: '#ffffff',
    webPreferences: {
      webSecurity: false,
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true,
      preload: path.join(__dirname, "assets/js/preload.js"),
    },
  });

  auxWin.loadFile(url);
  
  auxWin.once('ready-to-show', () => {
    auxWin.show();
    // Do not maximize automatically, let it just float
  });

  return { ok: true };
});
`;

if (!content.includes('window:openAuxiliary')) {
  // Inject right after window:openDashboard handler ends
  const dashEndIdx = content.indexOf('return { ok: true };\n});');
  if (dashEndIdx !== -1) {
    const end = dashEndIdx + 'return { ok: true };\n});'.length;
    content = content.slice(0, end) + '\n' + auxHandler + content.slice(end);
    fs.writeFileSync('main.js', content);
    console.log('Successfully injected window:openAuxiliary into main.js');
  } else {
    console.error('Could not find injection point in main.js');
  }
} else {
  console.log('window:openAuxiliary already exists');
}
