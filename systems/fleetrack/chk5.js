const fs = require("fs");
const lines = fs.readFileSync("c:/Users/Administrator/omnis/systems/fleetrack/index.html","utf8").split("\n");
lines.forEach((l,i) => {
  if (/submitDefect|loadDefects|tbl-defects|openDefectModal|closeDefectModal|submitJobCard|loadJobCards|job.card/i.test(l)) {
    console.log((i+1)+":", l.trim().substring(0,130));
  }
});
