const https = require('https');
require('dotenv').config();

const frappeApi = (path) => new Promise((resolve, reject) => {
  const req = https.request({
    hostname: 'fleetrack.machinery-exchange.com',
    path: encodeURI(path),
    headers: { 'Authorization': 'token ' + process.env.FRAPPE_API_KEY + ':' + process.env.FRAPPE_API_SECRET }
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
