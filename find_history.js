const fs = require('fs');
const path = require('path');

const historyDir = 'C:\\Users\\Administrator\\AppData\\Roaming\\Code\\User\\History';
if (!fs.existsSync(historyDir)) {
    console.log("No VS Code history found.");
    process.exit(0);
}

const folders = fs.readdirSync(historyDir);
let latestFile = null;
let latestTime = 0;
let fileContents = "";

for (const folder of folders) {
    const folderPath = path.join(historyDir, folder);
    if (!fs.statSync(folderPath).isDirectory()) continue;
    
    const files = fs.readdirSync(folderPath);
    for (const file of files) {
        if (file === 'entries.json') {
            const entriesPath = path.join(folderPath, file);
            try {
                const entries = JSON.parse(fs.readFileSync(entriesPath, 'utf8'));
                // Check if it's create_quotation_logic.js
                // Unfortunately entries.json might not have the file name, it just has timestamps.
            } catch(e) {}
        } else {
            const filePath = path.join(folderPath, file);
            const content = fs.readFileSync(filePath, 'utf8');
            if (content.includes('setupSuggestions') && content.includes('generateQuoteId')) {
                const stat = fs.statSync(filePath);
                if (stat.mtimeMs > latestTime) {
                    latestTime = stat.mtimeMs;
                    latestFile = filePath;
                    fileContents = content;
                }
            }
        }
    }
}

if (latestFile) {
    console.log("Found backup:", latestFile);
    fs.writeFileSync('C:\\Users\\Administrator\\omnis\\recovered_logic.js', fileContents, 'utf8');
    console.log("Recovered to omnis/recovered_logic.js");
} else {
    console.log("Not found in history.");
}
