const fs=require('fs'); 
const lines=fs.readFileSync('export/quotation.ndjson','utf8').trim().split('\n').filter(Boolean); 
const records=lines.map(l=>JSON.parse(l)); 
const floatCols=new Set(); 
for(const rec of records){
  for(const [k,v] of Object.entries(rec)){
    if(typeof v==='number' && !Number.isInteger(v)) floatCols.add(k);
    if(typeof v==='string' && /^\d+\.\d+$/.test(v)) floatCols.add(k);
  }
} 
const alters = [...floatCols].map(c=>`ALTER TABLE public."frappe_quotation" ALTER COLUMN "${c}" TYPE double precision USING "${c}"::double precision;`);
fs.writeFileSync('fix_quotation_cols.sql', alters.join('\n'));
