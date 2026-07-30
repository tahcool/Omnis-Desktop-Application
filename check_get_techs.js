const https = require('https');
const API_KEY = '73624aafe4cc8cc';
const API_SECRET = '2613b1d70488058';

const frappeApi = (path) => new Promise((resolve, reject) => {
  const req = https.request({
    hostname: 'fleetrack.machinery-exchange.com',
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
  const res = await frappeApi('/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.get_ft_technicians');
  console.log('get_ft_technicians:', res.status, res.data.substring(0, 500));
}

run();
