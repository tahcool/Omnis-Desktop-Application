const fs = require('fs');
let content = fs.readFileSync('index.html', 'utf8');

const loadISRStart = "window.loadISR = async function() {";
const loadISREnd = "console.error('[ISR] load error:', e);\n      }\n    }";

const startIndex = content.indexOf(loadISRStart);
const endIndex = content.indexOf(loadISREnd) + loadISREnd.length;

if (startIndex !== -1 && endIndex !== -1) {
    console.log("Found loadISR");
    console.log(content.substring(startIndex, endIndex));
} else {
    console.log("loadISR not found in index.html");
}
