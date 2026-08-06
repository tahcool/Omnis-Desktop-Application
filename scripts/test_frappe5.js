const fetch = require('node-fetch');
fetch('https://fleetrack.machinery-exchange.com/api/resource/FT%20Breakdown%20Log/Machine%20needs%20painting-fb9', {
  headers: {
    'Authorization': 'token 07660480c74686c:82899cba0bfdc36'
  }
}).then(r=>r.json()).then(data => {
  console.log("Frappe Data:", JSON.stringify(data, null, 2));
});
