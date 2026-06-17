const fs = require('fs');

let jsPath = 'systems/salestrack/orders_logic.js';
let content = fs.readFileSync(jsPath, 'utf8');

// Replace standard style tags in the print popups
content = content.replace(
    /<html><head><title>\$\{title\}<\/title>\s*<style>/g,
    "<html><head><title>${title}</title>\n        <style>\n            @page { size: landscape; margin: 15mm; }"
);

content = content.replace(
    /<html><head><title>Orders Report<\/title>\s*<style>/g,
    "<html><head><title>Orders Report</title>\n        <style>\n            @page { size: landscape; margin: 15mm; }"
);

fs.writeFileSync(jsPath, content);
console.log('Set prints to landscape mode');
