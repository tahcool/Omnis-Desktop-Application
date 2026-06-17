const fs = require('fs');
const file = 'C:\\Users\\Administrator\\omnis\\systems\\salestrack\\index.html';
const stats = fs.statSync(file);
console.log("Size:", stats.size);
