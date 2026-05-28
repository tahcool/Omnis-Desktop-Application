const fs = require('fs');
const html = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html', 'utf8');
const lines = html.split('\n');
let path = [];
for(let i=0; i<lines.length; i++){
  const line = lines[i];
  if(line.includes('<div') && line.includes('id=')) {
    const match = line.match(/id=\"([^\"]+)\"/);
    if(match) path.push(match[1]);
  }
  if(line.includes('</div')) {
    path.pop();
  }
  if(line.includes('db-create-modal-overlay')){
    console.log('Path to modal:', path.join(' > '));
    break;
  }
}
