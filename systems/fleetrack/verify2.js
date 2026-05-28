const fs = require("fs");
const html = fs.readFileSync("c:/Users/Administrator/omnis/systems/fleetrack/index.html", "utf8");
const lines = html.split("\n");

// List all script blocks with their line ranges
const scriptStarts = [], scriptEnds = [];
for (let i = 0; i < lines.length; i++) {
  if (/^\s*<script\b/i.test(lines[i]) && !lines[i].includes("src=")) scriptStarts.push(i);
  if (/^\s*<\/script>/i.test(lines[i])) scriptEnds.push(i);
}

console.log("Total script blocks:", scriptStarts.length);
for (let b = 0; b < scriptStarts.length; b++) {
  const s = scriptStarts[b], e = scriptEnds[b];
  const body = lines.slice(s+1, e).join("\n");
  let status = "OK";
  try { new Function(body); } catch(err) { status = "ERROR: " + err.message; }
  
  // Check if this block contains openCreateModal
  const hasCreateModal = body.includes("async function openCreateModal") || body.includes("window.openCreateModal = openCreateModal");
  const marker = hasCreateModal ? " *** HAS openCreateModal ***" : "";
  
  console.log(`Block ${b+1}: lines ${s+1}-${e+1} [${e-s} lines] ${status}${marker}`);
}
