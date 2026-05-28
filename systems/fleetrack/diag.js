const fs = require("fs");
const html = fs.readFileSync("c:/Users/Administrator/omnis/systems/fleetrack/index.html", "utf8");
const lines = html.split("\n");

// 1. Find closeCreateModal calls
console.log("=== closeCreateModal references ===");
lines.forEach((l, i) => {
  if (l.includes("closeCreateModal") && !l.includes("function closeCreateModal")) {
    console.log((i+1) + ": " + l.trim().substring(0, 120));
  }
});

// 2. Find where db-create-modal-overlay is
console.log("\n=== db-create-modal-overlay occurrences ===");
lines.forEach((l, i) => {
  if (l.includes("db-create-modal-overlay")) {
    console.log((i+1) + ": " + l.trim().substring(0, 120));
  }
});

// 3. What's the parent structure around the overlay?
console.log("\n=== Lines around modal overlay definition ===");
const defLine = lines.findIndex(l => l.includes('id="db-create-modal-overlay"'));
for (let i = defLine - 3; i <= defLine + 3; i++) {
  console.log((i+1) + ": " + lines[i]?.substring(0, 120));
}

// 4. Find the db-create-close-x button onclick
console.log("\n=== Close X button ===");
lines.forEach((l, i) => {
  if (l.includes("db-create-close-x")) {
    console.log((i+1) + ": " + l.trim().substring(0, 120));
  }
});
