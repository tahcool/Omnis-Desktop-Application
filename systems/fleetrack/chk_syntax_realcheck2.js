const fs = require('fs');
const c = fs.readFileSync('c:/Users/Administrator/omnis/systems/fleetrack/index.html','utf8');
const lines = c.split('\n');
// Find actual script block boundaries properly
let inScript = false, scriptStart = -1, blk = 0;
const scripts = [];
for(let i=0;i<lines.length;i++) {
  if(!inScript && /<script[^>]*>/.test(lines[i]) && !/src=/.test(lines[i])) {
    inScript = true;
    scriptStart = i;
  } else if(inScript && /<\/script>/.test(lines[i])) {
    scripts.push({start: scriptStart+1, end: i+1, code: lines.slice(scriptStart+1, i).join('\n')});
    inScript = false;
  }
}
console.log('Found', scripts.length, 'script blocks');
scripts.forEach((s,i) => {
  try { new Function(s.code); }
  catch(e) {
    console.log('BLOCK '+(i+1)+' (lines '+s.start+'-'+s.end+') ERROR:', e.message);
    const bl = s.code.split('\n');
    bl.slice(0,10).forEach((l,j) => l.trim() && console.log('  '+(j+1)+': '+l.substring(0,100)));
  }
});
