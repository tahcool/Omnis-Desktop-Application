const fs = require('fs');

let file = 'systems/salestrack/index.html';
let content = fs.readFileSync(file, 'utf8');

// 1. Remove the bad injection
const badScript = `
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
`;

if (content.includes(badScript)) {
    content = content.replace(badScript, '');
    console.log("Removed bad script from string literal.");
} else {
    console.log("Bad script not found.");
}

// 2. Add it safely to the very end of the file, just before the LAST </body>
const scriptSafely = `
  <script>
    // --- DEEP LINK LISTENER ---
    if (window.electron && window.electron.on) {
      window.electron.on('deep-link', (event, url) => {
        try {
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
</body>`;

// find the last index of </body>
const lastBodyIdx = content.lastIndexOf('</body>');
if (lastBodyIdx !== -1) {
    content = content.substring(0, lastBodyIdx) + scriptSafely + content.substring(lastBodyIdx + 7);
    fs.writeFileSync(file, content);
    console.log("Injected deep link listener at the true end of the file.");
} else {
    console.log("Could not find </body> at the end of the file.");
}
