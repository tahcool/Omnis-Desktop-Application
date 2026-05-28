const fs=require('fs');
const c=fs.readFileSync('index.html','utf8');
const lines=c.split('\n');

// Find the script block that contains loadISR (line 9584)
// Need to find the <script> tag BEFORE line 9584
let scriptStart=-1, scriptBlockNum=0;
for(let i=0;i<9584;i++){
  if(c.substring(lines.slice(0,i).join('\n').length).startsWith('<script') && !lines[i].includes('src=')){
    scriptStart=i; scriptBlockNum++;
  }
}
console.log('ISR JS is in script block #'+scriptBlockNum+', starting at line ~'+scriptStart);

// Now extract that script block and validate it with node
const scriptIdx=lines.slice(0,scriptStart).join('\n').length;
const scriptEnd=c.indexOf('</script>',scriptIdx);
const scriptContent=c.substring(scriptIdx,scriptEnd);
const startLine=scriptStart;
const endLine=c.substring(0,scriptEnd).split('\n').length;
console.log('Script block lines:',startLine,'to',endLine,'('+scriptContent.split('\n').length+' lines)');

// Write it to a temp file and try to parse it
const tmpJs=scriptContent.replace(/^<script[^>]*>/,'').trim();
fs.writeFileSync('/tmp/isr_block_test.js', tmpJs, 'utf8');
console.log('Written to /tmp/isr_block_test.js');
