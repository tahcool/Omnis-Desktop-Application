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
  const res1 = await frappeApi('/api/resource/FT Technician?limit_page_length=5');
  console.log('FT Technician:', res1.status, res1.data.substring(0, 200));

  const res2 = await frappeApi('/api/resource/Employee?limit_page_length=5');
  console.log('Employee:', res2.status, res2.data.substring(0, 200));
}

run();
