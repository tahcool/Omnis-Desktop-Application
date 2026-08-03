const fs = require('fs');
let content = fs.readFileSync('systems/fleetrack/index.html', 'utf8');

const mappingSnippet = `        "view-tech-hour-analytics": {
          el: document.getElementById('view-tech-hour-analytics'),
          title: "Technician Hour Analytics",
          subtitle: "Historical hour logs and KPIs grouped by technician.",
          actionLabel: "Refresh",
          action: () => loadTechHourAnalytics(),
        },
`;

content = content.replace(
  /"view-telematics-hitachi": {/,
  mappingSnippet + '        "view-telematics-hitachi": {'
);

fs.writeFileSync('systems/fleetrack/index.html', content);
console.log('Successfully injected mapping!');
