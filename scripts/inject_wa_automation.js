const fs = require('fs');
const path = 'C:/Users/Administrator/omnis/systems/salestrack/index.html';
let html = fs.readFileSync(path, 'utf8');

const injectCode = `

        // --- AUTOMATED WHATSAPP DISPATCHER ---
        startWhatsAppAutomatedDispatcher();

`;

const dispatcherCode = `
    /* ---------- WHATSAPP AUTOMATION ---------- */
    const SALES_PHONE_MAPPING = {
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
    };

    function startWhatsAppAutomatedDispatcher() {
      // Run every 60 seconds
      setInterval(async () => {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const todayStr = now.toISOString().split('T')[0];

        // Check if time is 08:30 AM
        if (hours === 8 && minutes === 30) {
          const lastSent = localStorage.getItem('last_whatsapp_dispatch_date');
          if (lastSent !== todayStr) {
             console.log("[WhatsApp Automation] Triggering daily dispatch at 08:30 AM...");
             localStorage.setItem('last_whatsapp_dispatch_date', todayStr);
             await runDailyWhatsAppDispatch(todayStr);
          }
        }
      }, 60000);
    }

    async function runDailyWhatsAppDispatch(todayStr) {
      try {
        const { data: allLifecycles, error } = await window.electron.invoke('supabase:query', {
          table: 'omnis_quote_lifecycle',
          method: 'select',
          params: { columns: '*, frappe_quotation(name, custom_sales_person, company, title)' }
        });

        if (error) throw error;
        
        const dueQuotes = allLifecycles.filter(ql => {
          if (ql.is_closed) return false;
          let due = ql.current_stage === 1 ? ql.stage_1_due : (ql.current_stage === 2 ? ql.stage_2_due : ql.stage_3_due);
          return due <= todayStr;
        });

        if (dueQuotes.length === 0) return;

        // Group by sales person
        const groups = {};
        for (const ql of dueQuotes) {
          const q = ql.frappe_quotation || {};
          const sp = q.custom_sales_person || "Unassigned";
          if (!groups[sp]) groups[sp] = [];
          groups[sp].push(ql);
        }

        // Send WhatsApp
        for (const [spName, quotes] of Object.entries(groups)) {
          const phone = SALES_PHONE_MAPPING[spName];
          if (!phone || phone === "263772000000") {
            console.warn("[WhatsApp Automation] Missing or default phone number for: " + spName);
            continue;
          }

          let msg = \`*Omnis Automated Reminder* \\nHi \${spName}, you have *\${quotes.length}* quotation(s) that require follow-up today!\\n\\n\`;
          
          quotes.forEach(ql => {
            const q = ql.frappe_quotation;
            msg += \`• \${q.name} - \${q.company}\\n\`;
          });
          
          msg += \`\\nPlease check your emails for the clickable deep links to open them instantly.\\n\\n_This is an automated message from the Desktop App._\`;

          console.log(\`[WhatsApp Automation] Sending to \${spName} (\${phone}):\`, msg);
          
          // Send silently
          window.electron.invoke('whatsapp:send-msg', { number: phone, message: msg }).catch(e => {
             console.error(\`[WhatsApp Automation] Failed to send to \${spName}:\`, e);
          });
        }
      } catch (err) {
        console.error("[WhatsApp Automation] Error running dispatch:", err);
      }
    }
`;

html = html.replace('// Load data', injectCode + '// Load data');
html = html.replace('// --- QUICK ACTION MODALS ---', dispatcherCode + '\n// --- QUICK ACTION MODALS ---');

fs.writeFileSync(path, html);
console.log('injected!');
