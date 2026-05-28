const fs = require("fs");
const html = fs.readFileSync("c:/Users/Administrator/omnis/systems/fleetrack/index.html", "utf8");
const lines = html.split("\r\n");

// Find script block 7
const scriptStarts = [];
const scriptEnds = [];
for (let i = 0; i < lines.length; i++) {
  if (/^\s*<script\b/i.test(lines[i]) && !lines[i].includes("src=")) scriptStarts.push(i);
  if (/^\s*<\/script>/i.test(lines[i])) scriptEnds.push(i);
}

const blockIdx = 6; // 0-indexed block 7
const s = scriptStarts[blockIdx];
const e = scriptEnds[blockIdx];
console.log("Block 7: lines", s+1, "to", e+1);

const body = lines.slice(s+1, e).join("\n");

// Binary search for the error
const bodyLines = body.split("\n");
let lo = 0, hi = bodyLines.length;
while (lo < hi - 1) {
  const mid = Math.floor((lo + hi) / 2);
  const partial = bodyLines.slice(0, mid).join("\n");
  try {
    new Function(partial + "\n;void 0;");
    lo = mid;
  } catch(err) {
    hi = mid;
  }
}

// Print lines around error
const errLineInBlock = hi;
const errLineInFile = s + 1 + errLineInBlock;
console.log("Error around block line", errLineInBlock, "(file line ~", errLineInFile, ")");
const start = Math.max(0, errLineInBlock - 5);
const end = Math.min(bodyLines.length, errLineInBlock + 5);
for (let i = start; i < end; i++) {
  const marker = i === errLineInBlock ? ">>> " : "    ";
  console.log(marker + (s + 2 + i) + ": " + bodyLines[i]);
}
