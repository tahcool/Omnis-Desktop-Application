const fs = require('fs');
const path = 'systems/fleetrack/index.html';
let content = fs.readFileSync(path, 'utf8');

// Replace the string
const searchStr = '<option value="fleetrack" style="color: #0f172a;">Fleetrack</option>';
const replaceStr = '<option value="fleetrack" style="color: #0f172a;">Machinery Exchange</option>';

if (content.includes(searchStr)) {
  content = content.replace(searchStr, replaceStr);
  fs.writeFileSync(path, content, 'utf8');
  console.log("Replaced successfully!");
} else {
  console.log("Could not find the target string.");
}
