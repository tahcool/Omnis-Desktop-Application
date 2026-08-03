const fs = require('fs');
let content = fs.readFileSync('systems/fleetrack/index.html', 'utf8');

const oldScuRegex = /\/\/ SCU Template[\s\S]*?We will let you know if there are any further updates\.\`;/;

const newScuLogic = `// SCU Template
      const formatResolution = (txt) => {
        let t = txt.trim();
        if (t.startsWith('•') || t.startsWith('*') || t.startsWith('-')) t = t.substring(1).trim();
        let lower = t.toLowerCase();
        
        if (lower.includes("needs topup") || lower.includes("needs top up") || lower.includes("needs topping up")) {
          return "- " + t.replace(/needs top\\s*up/gi, "was topped up").replace(/needs topping up/gi, "was topped up");
        }
        if (lower.includes("needs replace")) {
          return "- " + t.replace(/needs replace(ment|ing)?/gi, "was replaced");
        }
        if (lower.includes("needs repair")) {
          return "- " + t.replace(/needs repair(ing)?/gi, "was repaired");
        }
        if (lower.includes("needs servic")) {
          return "- " + t.replace(/needs servic(e|ing)?/gi, "was serviced");
        }
        if (lower.includes("needs check")) {
          return "- " + t.replace(/needs check(ing)?/gi, "was checked");
        }
        
        if (lower.startsWith("check ")) return "- " + t.replace(/^check\\s/i, "Checked ");
        if (lower.startsWith("inspect ")) return "- " + t.replace(/^inspect\\s/i, "Inspected ");
        if (lower.startsWith("replace ")) return "- " + t.replace(/^replace\\s/i, "Replaced ");
        if (lower.startsWith("fix ")) return "- " + t.replace(/^fix\\s/i, "Fixed ");
        if (lower.startsWith("repair ")) return "- " + t.replace(/^repair\\s/i, "Repaired ");
        
        return "- Attended to: " + t;
      };
      
      let scuScope = "- Completed " + (r.description || "Service/Repair") + "\\n";
      rawScope.forEach(s => {
        if (s.trim()) scuScope += formatResolution(s) + "\\n";
      });
      scuScope += "- Checked machine for any additional defects\\n- Tested machine – operating normally";

      const scu = \`Good day,
SERVICE COMPLETION UPDATE 

MACHINE: \${model} SN: \${sn}
CUSTOMER FLEET NUMBER: \${fleet}
INTERNAL FLEET NUMBER: \${internalFleet}
SCOPE OF WORK:  
\${scuScope}
DEFECTS / FINDINGS:  
- None
RECOMMENDATIONS / NEXT STEPS:  
- NA\`;`;

if (oldScuRegex.test(content)) {
  content = content.replace(oldScuRegex, newScuLogic);
  fs.writeFileSync('systems/fleetrack/index.html', content);
  console.log('Successfully updated SCU template in index.html');
} else {
  console.log('Could not find SCU Template block to replace.');
}
