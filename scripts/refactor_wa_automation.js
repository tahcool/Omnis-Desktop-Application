const fs = require('fs');
const path = 'C:/Users/Administrator/omnis/systems/salestrack/index.html';
let html = fs.readFileSync(path, 'utf8');

// Replace the old SALES_PHONE_MAPPING
const oldMapping = `    const SALES_PHONE_MAPPING = {
      "Antony Dube": "263772000000",
      "Louis Munyama": "263772000000",
      "Humphrey Masunda": "263772000000",
      "Terence Gotora": "263772000000",
      "Robin Hunter": "263772000000",
      "Brendan Reilly": "263772000000",
      "Mathew Ferreira": "263772000000",
      "Tashinga Muchenje": "263772000000",
      "Admire Maringisanwa": "263772000000",
      "Brett Berry": "263772000000",
      "Chetan Samji": "263772000000",
      "Takunda": "263772000000"
    };`;

html = html.replace(oldMapping, `    // SALES_PHONE_MAPPING removed - dynamically queried from ALL_SALES_PERSONS`);

// Now replace the inside of runDailyWhatsAppDispatch
const oldCode = `        // Send WhatsApp
        for (const [spName, quotes] of Object.entries(groups)) {
          const phone = SALES_PHONE_MAPPING[spName];
          if (!phone || phone === "263772000000") {
            console.warn("[WhatsApp Automation] Missing or default phone number for: " + spName);
            continue;
          }`;

const newCode = `        // Send WhatsApp
        for (const [spName, quotes] of Object.entries(groups)) {
          // Look up dynamically
          const spObj = ALL_SALES_PERSONS.find(p => p.name === spName && p.is_active);
          const phone = spObj ? spObj.whatsapp_number : null;

          if (!phone || phone === "263772000000") {
            console.warn("[WhatsApp Automation] Missing or default phone number for: " + spName);
            continue;
          }`;

html = html.replace(oldCode, newCode);

fs.writeFileSync(path, html);
console.log('refactored automation successfully!');
