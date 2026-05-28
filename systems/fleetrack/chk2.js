const fs = require("fs");
const lines = fs.readFileSync("c:/Users/Administrator/omnis/systems/fleetrack/index.html","utf8").split("\n");
// Find FT_MACHINE_DETAIL_METHOD definition
lines.forEach((l,i) => {
  if (l.includes("FT_MACHINE_DETAIL_METHOD")) console.log((i+1)+":", l.trim().substring(0,130));
});
