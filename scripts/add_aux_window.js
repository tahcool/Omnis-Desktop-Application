const fs = require('fs');
let mainContent = fs.readFileSync('main.js', 'utf8');

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
  });

  return { ok: true };
});
`;

if (!mainContent.includes('window:openAuxiliary')) {
  mainContent = mainContent.replace("ipcMain.handle('window:openLogin',", auxHandler + "\nipcMain.handle('window:openLogin',");
  fs.writeFileSync('main.js', mainContent);
  console.log('Successfully injected window:openAuxiliary in main.js');
}

let indexContent = fs.readFileSync('systems/fleetrack/index.html', 'utf8');

// Replace the ? icon with new icon and tooltip
indexContent = indexContent.replace(
  '<button id="search-fab">?</button>',
  '<button id="search-fab" title="Open Auxiliary Screen" style="font-size:24px;">&#10697;</button>'
);

// Replace the event listener for searchFab
const oldListener = `    if (searchFab) {
      searchFab.addEventListener("click", (e) => {
        e.stopPropagation();
        const hidden = chatWidget.classList.contains("hidden");
        if (hidden) {
          chatWidget.classList.remove("hidden");
          if (!chatMessages.children.length) {
            appendChatMessage(
              "assistant",
              \`Hi, I'm Omnis Assist for Fleetrack.\\n\\nLater I'll be able to answer:\\n• Open breakdowns today\\n• Machines with defects\\n• FSIs due tomorrow\\n\`
            );
          }
          chatInput.focus();
        } else {
          chatWidget.classList.add("hidden");
        }
      });
    }`;

const newListener = `    if (searchFab) {
      searchFab.addEventListener("click", (e) => {
        e.stopPropagation();
        window.electron.invoke('window:openAuxiliary', 'systems/fleetrack/index.html');
      });
    }`;

if (indexContent.includes('chatWidget.classList.contains("hidden")')) {
  indexContent = indexContent.replace(oldListener, newListener);
  fs.writeFileSync('systems/fleetrack/index.html', indexContent);
  console.log('Successfully updated index.html for auxiliary window feature.');
} else {
  console.log('Could not find old event listener in index.html, it might have been replaced already.');
}

