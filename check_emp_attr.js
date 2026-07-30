const https = require('https');
const API_KEY = '73624aafe4cc8cc';
const API_SECRET = '2613b1d70488058';

const frappeApi = (path) => new Promise((resolve, reject) => {
  const req = https.request({
    hostname: 'salestrack.powerstar.co.zw',
    path: encodeURI(path),
    headers: { 'Authorization': 'token ' + API_KEY + ':' + API_SECRET }
  }, res => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => resolve({ status: res.statusCode, data }));
  });
  req.on('error', reject);
  req.end();
});

async function run() {
  const fields = '["name","employee_name","designation","department"]';
  const res = await frappeApi('/api/resource/Employee?fields=' + fields + '&limit_page_length=5000');
  const d = JSON.parse(res.data).data;
  const deps = [...new Set(d.map(x=>x.department))];
  const desigs = [...new Set(d.map(x=>x.designation))];
  console.log('Deps:', deps);
  console.log('Desigs:', desigs.filter(x => x && x.toLowerCase().includes('tech')));
}

run();
