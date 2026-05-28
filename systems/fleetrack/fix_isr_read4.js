const fs = require('fs');
let content = fs.readFileSync('isr_block.js', 'utf8');

const getStart = "async function loadArchives() {";
const startIndex = content.indexOf(getStart);
if (startIndex !== -1) {
    console.log(content.substring(startIndex, startIndex + 1500));
} else {
    console.log("Not found");
}
