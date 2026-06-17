const fs = require('fs');
let code = fs.readFileSync('scripts/refactor_aftersales.js', 'utf8');

// replace \\\${ with \${
code = code.replace(/\\\\\$\\{/g, '\\\${');

// Also the logoHtml src error handler:
// onerror="this.src=\'assets/Omnis-logo.png\'" 
// Since it's inside an HTML string which is inside a template string, it should be:
// onerror="this.src='assets/Omnis-logo.png'"
code = code.replace(/onerror="this\.src=\\\\'assets\/Omnis-logo\.png\\\\'"/g, `onerror="this.src='assets/Omnis-logo.png'"`);

fs.writeFileSync('scripts/refactor_aftersales.js', code);
console.log('Fixed syntax and interpolation');
