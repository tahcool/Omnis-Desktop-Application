const fs=require('fs');
const c=fs.readFileSync('index.html','utf8');
const lines=c.split('\n');
// Find all <main and </main tags
for(let i=0;i<lines.length;i++){
  if(lines[i].includes('<main') || lines[i].includes('</main')){ 
    console.log((i+1)+': '+lines[i].trim().substring(0,80));
  }
}
// Check depth at main close
const mainOpen=c.indexOf('<main');
const mainClose=c.indexOf('</main>');
console.log('\n<main> opens at line ~'+c.substring(0,mainOpen).split('\n').length);
console.log('</main> closes at line ~'+c.substring(0,mainClose).split('\n').length);

// What's between ISR end (line ~3799) and </main>
// Find </main>
const mcLine=c.substring(0,mainClose).split('\n').length;
console.log('\nLines around </main>:');
lines.slice(mcLine-3,mcLine+3).forEach((l,i)=>console.log((mcLine-3+i+1)+': '+l.substring(0,100)));
