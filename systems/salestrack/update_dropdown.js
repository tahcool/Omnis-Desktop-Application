const fs = require('fs');
const path = require('path');

const file = path.join('C:', 'Users', 'Administrator', 'omnis', 'systems', 'salestrack', 'index.html');
let content = fs.readFileSync(file, 'utf8');

const target1 = `<option value="">All Companies</option>
            <option value="machinery">Machinery Exchange</option>
            <option value="sinopower">Sinopower</option>`;

const replacement1 = `<option value="">All Companies</option>
            <option value="machinery">Machinery Exchange</option>
            <option value="sinopower">Sinopower</option>
            <option value="unassigned">Unassigned</option>`;

if (content.includes(target1)) {
    content = content.replace(new RegExp(target1.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replacement1);
    fs.writeFileSync(file, content, 'utf8');
    console.log("Successfully replaced in index.html");
} else {
    console.log("Target string not found in index.html. Trying with regex.");
    
    // Sometimes newline chars are different (\r\n vs \n)
    const targetRegex = /<option value="">All Companies<\/option>\s*<option value="machinery">Machinery Exchange<\/option>\s*<option value="sinopower">Sinopower<\/option>/g;
    
    if (targetRegex.test(content)) {
        content = content.replace(targetRegex, replacement1);
        fs.writeFileSync(file, content, 'utf8');
        console.log("Successfully replaced in index.html using regex");
    } else {
        console.log("Still not found. Looking for ol-company specifically...");
    }
}
