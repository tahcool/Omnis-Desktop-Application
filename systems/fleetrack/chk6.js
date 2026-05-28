const fs = require("fs");
const lines = fs.readFileSync("c:/Users/Administrator/omnis/systems/fleetrack/index.html","utf8").split("\n");
lines.forEach((l,i) => {
  if (/FT_DEFECT|DEFECT_CREATE|DEFECT_UPDATE|loadFtDefects|initDefectMachine|FT_DEFECTS_DATA/i.test(l)) {
    console.log((i+1)+":", l.trim().substring(0,130));
  }
});
