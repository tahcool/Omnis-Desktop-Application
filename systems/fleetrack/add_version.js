const fs=require('fs');
let c=fs.readFileSync('index.html','utf8');
const marker='console.log("Fleetrack dashboard script loaded")';
const i=c.indexOf(marker);
if(i<0){console.log('NOT FOUND');}
else{
  c=c.substring(0,i+marker.length)+'\n    console.log("[VERSION] ISR-build-v3");'+c.substring(i+marker.length);
  fs.writeFileSync('index.html',c,'utf8');
  console.log('Version marker added at idx',i,'size:',c.length);
}
