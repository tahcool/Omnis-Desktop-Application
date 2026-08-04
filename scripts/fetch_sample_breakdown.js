const fetch = require('node-fetch');

const FRAPPE_URL = 'https://fleetrack.machinery-exchange.com';
const API_KEY = '73624aafe4cc8cc';
const API_SECRET = '2613b1d70488058';

async function fetchSample() {
  const res = await fetch(`${FRAPPE_URL}/api/resource/FT%20Breakdown%20Log?limit_page_length=1`, {
    method: 'GET',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `token ${API_KEY}:${API_SECRET}`
    },
  });
  
  const data = await res.json();
  if (data.exc) {
    console.error("Frappe Error:", data.exc);
    return;
  }
  
  const name = data.data[0].name;
  const detailRes = await fetch(`${FRAPPE_URL}/api/resource/FT%20Breakdown%20Log/${name}`, {
    method: 'GET',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `token ${API_KEY}:${API_SECRET}`
    },
  });
  
  const detailData = await detailRes.json();
  console.log(JSON.stringify(detailData, null, 2));
}

fetchSample().catch(console.error);
