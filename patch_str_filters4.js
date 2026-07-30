const fs = require('fs');
let html = fs.readFileSync('systems/fleetrack/index.html', 'utf8');

const oldClearStr = `document.getElementById('sts-region').value='';document.getElementById('sts-customer').value='';document.getElementById('sts-model').value='';document.getElementById('sts-fleetrack').value='Yes';if(document.getElementById('sts-group-customer'))document.getElementById('sts-group-customer').checked=false;filterStsTable()`;
const newClearStr = `document.getElementById('sts-region').value='';document.getElementById('sts-customer').value='';document.getElementById('sts-model').value='';document.getElementById('sts-fleetrack').value='Yes';if(document.getElementById('sts-group-customer'))document.getElementById('sts-group-customer').checked=false;if(document.getElementById('sts-machine-search'))document.getElementById('sts-machine-search').value='';if(document.getElementById('sts-status'))document.getElementById('sts-status').value='';filterStsTable()`;

if (html.includes(oldClearStr)) {
    html = html.replace(oldClearStr, newClearStr);
    fs.writeFileSync('systems/fleetrack/index.html', html);
    console.log("Patched Clear Button");
} else {
    console.log("Could not find old clear string.");
}
