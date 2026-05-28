const fs = require("fs");
const lines = fs.readFileSync("c:/Users/Administrator/omnis/systems/fleetrack/index.html","utf8").split("\n");
// Find Machine Register header / toolbar area
lines.forEach((l,i) => {
  if (l.includes("btn-new-machine") || l.includes("Machine Register") || l.includes("Bulk HMR") || l.includes("bulk-hmr") || l.includes("mr-header") || l.includes("HMR Activity")) {
    console.log((i+1)+":", l.trim().substring(0,130));
  }
});
