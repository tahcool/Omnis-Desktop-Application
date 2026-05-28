const fs = require('fs');
const c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');
const lines = c.split('\n');
// Find all native report panel headers - look for openReportPanel, showNativeReport, report iframe, and report names
lines.forEach((l,i) => {
  if (/openReportPanel|showNativeReport|getNativeReport|loadNative|native.*report|report.*panel|EPR|MWR|GDR|MDR|LSR|STS|TAR|WWU|FSP|DBR|WSD|FSD|RDR|Activity List|Machine Summary|Population Register|Defects Report|Defect Report|Warranty|Workshop Planner|Jobs To Complete|Lost Sales|Service Track|Telematics|Machines Due/i.test(l) && !/\/\//i.test(l.trim())) {
    console.log((i+1)+':', l.trim().substring(0,120));
  }
});
