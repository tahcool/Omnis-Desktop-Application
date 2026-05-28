const fs = require("fs");
const html = fs.readFileSync("c:/Users/Administrator/omnis/systems/fleetrack/index.html", "utf8");
const lines = html.split("\r\n");

// 1. Find where openCreateModal is defined
let defLine = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("async function openCreateModal") || lines[i].includes("window.openCreateModal")) {
    defLine = i;
    console.log("DEFINITION at line", i+1, ":", lines[i].trim());
  }
}

// 2. Find the <script> block that CONTAINS the definition
const scriptStarts = [];
const scriptEnds = [];
for (let i = 0; i < lines.length; i++) {
  if (/^\s*<script\b/i.test(lines[i]) && !lines[i].includes("src=")) scriptStarts.push(i);
  if (/^\s*<\/script>/i.test(lines[i])) scriptEnds.push(i);
}
console.log("Script block boundaries:", scriptStarts.length, "blocks");

let containingBlock = -1;
for (let b = 0; b < scriptStarts.length; b++) {
  if (defLine >= scriptStarts[b] && defLine <= scriptEnds[b]) {
    containingBlock = b + 1;
    console.log("openCreateModal is in script block", b+1, "(lines", scriptStarts[b]+1, "-", scriptEnds[b]+1, ")");
    
    // Now check if that block has a syntax error
    const body = lines.slice(scriptStarts[b]+1, scriptEnds[b]).join("\n");
    try {
      new Function(body);
      console.log("Block", b+1, ": SYNTAX OK");
    } catch(e) {
      console.error("Block", b+1, ": SYNTAX ERROR:", e.message);
    }
    break;
  }
}

// 3. Also check: is the button onclick calling the right thing?
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("openCreateModal") && !lines[i].includes("function openCreateModal") && !lines[i].includes("//")) {
    console.log("Reference at line", i+1, ":", lines[i].trim().substring(0, 120));
  }
}
