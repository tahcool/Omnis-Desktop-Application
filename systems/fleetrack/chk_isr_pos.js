const fs=require('fs');
const c=fs.readFileSync('index.html','utf8');
const lines=c.split('\n');
const isrIdx=c.indexOf('id="view-isr"');
const isrLine=c.substring(0,isrIdx).split('\n').length;
console.log('view-isr at line',isrLine);
// Show 5 lines before
lines.slice(isrLine-6,isrLine+5).forEach((l,i)=>console.log((isrLine-6+i+1)+': '+l.substring(0,120)));
