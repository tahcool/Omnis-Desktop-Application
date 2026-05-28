const fs=require('fs');
const c=fs.readFileSync('index.html','utf8');
const lines=c.split('\n');
const loadIsrLine=9584;

// Find the <script> tag before line 9584
let lastScriptLine=-1;
for(let i=0;i<loadIsrLine-1;i++){
  if(lines[i].trim().startsWith('<script') && !lines[i].includes('src=')){
    lastScriptLine=i+1; // 1-indexed
  }
}
console.log('Script block containing ISR starts at line',lastScriptLine);
// Find closing </script> after line 9584
let closeLine=-1;
for(let i=loadIsrLine;i<lines.length;i++){
  if(lines[i].trim()==='</script>'){
    closeLine=i+1; break;
  }
}
console.log('Script block closes at line',closeLine);
console.log('Block size:',(closeLine-lastScriptLine),'lines');

// Extract and syntax-check
const blockLines=lines.slice(lastScriptLine,closeLine-2); // exclude <script> and </script>
const js=blockLines.join('\n');
// Write temp and check with node --check
fs.writeFileSync('c:/Users/Administrator/omnis/systems/fleetrack/isr_block.js', js, 'utf8');
console.log('Written isr_block.js for syntax check');
