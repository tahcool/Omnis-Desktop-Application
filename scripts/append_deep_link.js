const fs = require('fs');
const file = 'systems/salestrack/index.html';
let content = fs.readFileSync(file, 'utf8');

const script = `
  <script>
    // --- DEEP LINK LISTENER ---
    if (window.electron && window.electron.on) {
      window.electron.on('deep-link', (event, url) => {
        try {
          // Expected URL format: omnis://quote/SAL-QTN-26-4126
          if (url && url.includes('omnis://quote/')) {
            const quoteId = url.split('omnis://quote/')[1].replace('/', '').trim();
            if (quoteId && window.salestrack && window.salestrack.openDoc) {
              window.salestrack.openDoc('Quotation', quoteId);
            }
          }
        } catch (err) {
          console.error("Failed to parse deep link:", err);
        }
      });
    }
  </script>
</body>
`;

content = content.replace('</body>', script);
fs.writeFileSync(file, content);
console.log('Successfully injected deep link listener into index.html');
