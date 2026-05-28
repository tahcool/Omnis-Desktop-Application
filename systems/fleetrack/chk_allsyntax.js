const fs=require('fs');
const c=fs.readFileSync('index.html','utf8');
const lines=c.split('\n');
const {execSync}=require('child_process');

let scriptNum=0,start=-1;
for(let i=0;i<lines.length;i++){
  if(lines[i].trim().startsWith('<script') && !lines[i].includes('src=')){
    scriptNum++; start=i;
  }
  if(lines[i].trim()==='</script>' && start>=0){
    const blockJS=lines.slice(start+1,i).join('\n');
    const fname='c:/Users/Administrator/omnis/systems/fleetrack/tmp_block'+scriptNum+'.js';
    fs.writeFileSync(fname,blockJS,'utf8');
    try{
      execSync('node --check '+fname,{stdio:'pipe'});
      console.log('Block '+scriptNum+' (lines '+(start+1)+'-'+(i)+') OK');
    }catch(e){
      console.log('Block '+scriptNum+' (lines '+(start+1)+'-'+(i)+') SYNTAX ERROR:');
      console.log(e.stderr.toString().substring(0,200));
    }
    start=-1;
  }
}
