const fs = require("fs");
const path = "c:/Users/Administrator/omnis/systems/fleetrack/index.html";
let html = fs.readFileSync(path, "utf8");
const lines = html.split("\r\n");

// Find openCreateModal function start
let startLine = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("async function openCreateModal(prefillMachineName)")) {
    startLine = i;
    break;
  }
}

// Find closeCreateModal to know where our function ends
let closeModalLine = -1;
for (let i = startLine + 1; i < lines.length; i++) {
  if (lines[i].includes("function closeCreateModal()")) {
    closeModalLine = i;
    break;
  }
}

console.log("Start:", startLine + 1, "CloseModal:", closeModalLine + 1);
// Print the lines between them so we can see
for (let i = startLine; i < closeModalLine; i++) {
  console.log((i+1) + ":", lines[i]);
}
