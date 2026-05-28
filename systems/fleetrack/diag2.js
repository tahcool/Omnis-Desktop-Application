const fs = require('fs');
let c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');

// Find where view-about ends (last existing view in the layout)
// and also find where the new views currently are (after </body>)
const viewAboutEnd = c.indexOf('<!-- About View -->');
console.log('About view at:', viewAboutEnd);

// Find the view-about closing - it's a view-item/view-page div
// Actually let's find </body> position and the service-due block
const bodyClose = c.lastIndexOf('</body>');
console.log('</body> at:', bodyClose);

// Extract the two new view blocks + script block that are after </body>
const afterBody = c.substring(bodyClose);
console.log('After body length:', afterBody.length);
console.log('Contains view-service-due:', afterBody.includes('view-service-due'));
console.log('Contains view-customers:', afterBody.includes('view-customers'));
