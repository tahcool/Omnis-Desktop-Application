const fs=require('fs');
const c=fs.readFileSync('index.html','utf8');
const lines=c.split('\n');

// Find which script block contains line 10706
let scriptNum=0, lastScriptStart=-1;
for(let i=0;i<10706;i++){
  if(lines[i] && lines[i].trim().startsWith('<script') && !lines[i].includes('src=')){
    scriptNum++; lastScriptStart=i+1;
  }
}
console.log('Line 10706 is in script block #'+scriptNum+', which starts at line '+lastScriptStart);

// Find the script block end
let closeAt=-1;
for(let i=10706;i<lines.length;i++){
  if(lines[i].trim()==='</script>'){
    closeAt=i+1; break;
  }
}
console.log('That script block ends at line',closeAt);

// Now syntax check that block
const blockJS=lines.slice(lastScriptStart,closeAt-2).join('\n');
fs.writeFileSync('c:/Users/Administrator/omnis/systems/fleetrack/block_10706.js',blockJS,'utf8');
console.log('Written block_10706.js, lines:',(closeAt-lastScriptStart));
