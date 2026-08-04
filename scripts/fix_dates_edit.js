const fs = require('fs');
let html = fs.readFileSync('systems/fleetrack/index.html', 'utf8');

const oldUpdateData = `      // Update in Supabase
      const updateData = {
        description: payload.description,
        urgent: !!payload.urgent,
        responsibility: payload.resp,
        ted_status: payload.ted_status,
        category: payload.category,
        parts_eta: payload.parts_eta,
        on_hold: !!payload.on_hold,
        quote_date: payload.quote_date,
        breakdown_end_date: payload.end_date,
        breakdown_date: payload.breakdown_date,
        ted: payload.ted,
        red: payload.red,
        out_eta: payload.out_eta,
        status: payload.status,
        is_the_machine_still_running: payload.is_the_machine_still_running
      };`;

const newUpdateData = `      // Update in Supabase
      const safeDate = (d) => (d && d.trim() !== '') ? d : null;
      const updateData = {
        description: payload.description,
        urgent: !!payload.urgent,
        responsibility: payload.resp,
        ted_status: payload.ted_status,
        category: payload.category,
        parts_eta: payload.parts_eta,
        on_hold: !!payload.on_hold,
        quote_date: safeDate(payload.quote_date),
        breakdown_end_date: safeDate(payload.end_date),
        breakdown_date: safeDate(payload.breakdown_date),
        ted: safeDate(payload.ted),
        red: safeDate(payload.red),
        out_eta: safeDate(payload.out_eta),
        status: payload.status,
        is_the_machine_still_running: payload.is_the_machine_still_running
      };`;

html = html.replace(oldUpdateData, newUpdateData);
fs.writeFileSync('systems/fleetrack/index.html', html);
console.log("Date fix applied");
