const fs = require("fs");
const html = fs.readFileSync("c:/Users/Administrator/omnis/systems/fleetrack/index.html", "utf8");
const lines = html.split("\n");

// 1. Find openMachineEditModal definition
console.log("=== openMachineEditModal ===");
lines.forEach((l, i) => {
  if (l.includes("openMachineEditModal")) console.log((i+1) + ": " + l.trim().substring(0,120));
});

// 2. Find FT_MACHINE_DETAIL_CACHE
console.log("\n=== FT_MACHINE_DETAIL_CACHE ===");
lines.forEach((l, i) => {
  if (l.includes("FT_MACHINE_DETAIL_CACHE")) console.log((i+1) + ": " + l.trim().substring(0,120));
});

// 3. Find mc-edit-overlay
console.log("\n=== mc-edit-overlay HTML ===");
lines.forEach((l, i) => {
  if (l.includes("mc-edit-overlay")) console.log((i+1) + ": " + l.trim().substring(0,120));
});
