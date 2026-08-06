const fetch = require('node-fetch');
fetch('https://fleetrack.machinery-exchange.com/api/resource/FT%20Breakdown%20Log?fields=["name","breakdown_end_date","status","docstatus","end_date"]&limit_page_length=50', {
  headers: {
    'Authorization': 'token 07660480c74686c:82899cba0bfdc36'
  }
}).then(r=>r.json()).then(data => {
  console.log("Frappe Data:", JSON.stringify(data.data.slice(0, 10), null, 2));
});
