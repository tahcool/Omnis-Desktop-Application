const fs = require("fs");
const lines = fs.readFileSync("c:/Users/Administrator/omnis/systems/fleetrack/index.html","utf8").split("\n");
// Defects and Job Cards view markers
lines.forEach((l,i) => {
  if (/defect|defects|job.card|jobcard|job_card|FT.Defect|ft-defect|ft_defect/i.test(l)) {
    console.log((i+1)+":", l.trim().substring(0,130));
  }
});
