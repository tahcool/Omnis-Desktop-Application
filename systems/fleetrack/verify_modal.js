const fs = require("fs");
const lines = fs.readFileSync("c:/Users/Administrator/omnis/systems/fleetrack/index.html", "utf8").split("\r\n");
let startLine = -1, closeModalLine = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("async function openCreateModal(prefillMachineName)")) startLine = i;
  if (startLine > -1 && lines[i].includes("function closeCreateModal()")) { closeModalLine = i; break; }
}
console.log("openCreateModal: lines", startLine+1, "to", closeModalLine);
const fnBody = lines.slice(startLine, closeModalLine).join("\n");
try {
  new Function(fnBody);
  console.log("SYNTAX OK");
} catch(e) {
  console.error("SYNTAX ERROR:", e.message);
  // Print the failing area
  const errLines = fnBody.split("\n");
  errLines.forEach((l, i) => console.log((startLine+i+1) + ": " + l));
}
