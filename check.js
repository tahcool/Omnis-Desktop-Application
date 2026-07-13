const fs = require('fs');
const mainJs = fs.readFileSync('main.js', 'utf8');
const urlMatch = mainJs.match(/SUPABASE_URL\s*=\s*['"]([^'"]+)['"]/);
const keyMatch = mainJs.match(/SUPABASE_KEY\s*=\s*['"]([^'"]+)['"]/);
console.log(urlMatch ? 'Found URL' : 'No URL');
if (urlMatch && keyMatch) {
    const url = urlMatch[1];
    const key = keyMatch[1];
    console.log('Fetching from', url);
    fetch(url + '/rest/v1/omnis_quote_lifecycle?limit=1', {
        headers: { 'apikey': key, 'Authorization': 'Bearer ' + key }
    }).then(r => r.json()).then(data => {
        if (data.length > 0) {
            console.log('Columns:', Object.keys(data[0]));
            if ('is_hot_lead' in data[0]) console.log('is_hot_lead EXISTS');
            else console.log('is_hot_lead DOES NOT EXIST');
        } else {
            console.log('Table is empty');
        }
    }).catch(e => console.error(e));
}
