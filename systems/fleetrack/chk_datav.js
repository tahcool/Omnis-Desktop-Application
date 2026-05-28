const fs=require('fs');
const c=fs.readFileSync('index.html','utf8');
const lines=c.split('\n');
// Find how data-view click events are handled
for(let i=0;i<lines.length;i++){
  if(lines[i].includes('data-view') && (lines[i].includes('click') || lines[i].includes('addEventListener') || lines[i].includes('dataset.view'))){
    console.log((i+1)+': '+lines[i].substring(0,120));
  }
}
// Also look for the dropdown item click handler
const idx=c.indexOf('top-nav-dropdown-item');
for(let i=0;i<lines.length;i++){
  if(lines[i].includes('querySelectorAll') && lines[i].includes('data-view')||
     lines[i].includes('dataset.view') || lines[i].includes('.data-view')){
    console.log('JS handler: '+(i+1)+': '+lines[i].substring(0,120));
  }
}
