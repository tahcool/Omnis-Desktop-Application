const fetch = require('node-fetch');
fetch('https://fleetrack.machinery-exchange.com/api/resource/FT%20Breakdown%20Log?fields=["name","status","end_date"]&limit_page_length=50', {
  headers: {
    'Authorization': 'token 07660480c74686c:b43fd8b40ca211b'
  }
}).then(r=>r.json()).then(data => {
  console.log("Frappe Data:", JSON.stringify(data.data.slice(0, 10), null, 2));
}).catch(console.error);
