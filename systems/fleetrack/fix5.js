const fs = require("fs");
const path = "c:/Users/Administrator/omnis/systems/fleetrack/index.html";
let html = fs.readFileSync(path, "utf8");
const lines = html.split("\r\n");

// Show exact content of line 12410 (index 12409)
console.log("Line 12410:", JSON.stringify(lines[12409]));
console.log("Line 12411:", JSON.stringify(lines[12410]));
