const fs = require('fs');

let html = fs.readFileSync('systems/fleetrack/index.html', 'utf8');

// 1. Refactor loadDailyBreakdownReport
const loadDailyTargetOld = `const raw = await callFrappe(FT_BREAKDOWN_DBR_METHOD, filters, 'GET', { 
            showLoader: true, 
            loaderMsg: "Syncing Breakdowns" 
        });
        const data = raw.message || {};`;

const loadDailyTargetNew = `// Supabase fetch
        let query = supabase.from('ft_breakdown_logs').select('*');
        if (filters.region) query = query.ilike('region', \`%\${filters.region}%\`);
        if (filters.customer) query = query.ilike('customer', \`%\${filters.customer}%\`);
        if (filters.machine) {
          query = query.or(\`machine.ilike.%\${filters.machine}%,model.ilike.%\${filters.machine}%,serial_number.ilike.%\${filters.machine}%,fleet_no.ilike.%\${filters.machine}%\`);
        }
        if (filters.responsibility) query = query.eq('responsibility', filters.responsibility);
        if (filters.urgent) query = query.eq('urgent', true);

        const { data: dbData, error: dbError } = await query.order('created_at', { ascending: false });

        let data = { breakdowns: dbData || [], efficiency: "0.0%", can_edit_comments: true, current_user: "Admin" };
        if (dbError) {
          data.error = true;
          data.traceback = dbError.message;
        }`;

html = html.replace(loadDailyTargetOld, loadDailyTargetNew);

// 2. Refactor Create Breakdown Log
// Look for create_ft_breakdown_log
const createRegex = /const\s+res\s*=\s*await\s+callFrappe\('\/api\/method\/mxg_fleet_track\.omnis_dashboard\.ft_breakdown_dashboard\.create_ft_breakdown_log'[\s\S]*?'POST'\);/;

const createNew = `
          // Save to Supabase instead of Frappe
          const { data: insertedData, error: insertError } = await supabase.from('ft_breakdown_logs').insert([{
            machine: machine,
            description: description,
            breakdown_date: date,
            urgent: !!urgent,
            responsibility: resp,
            ted_status: ted_status,
            category: bd_category,
            parts_eta: parts_eta,
            on_hold: !!on_hold,
            quote_date: quote_date,
            breakdown_end_date: breakdown_end_date,
            ted: ted,
            red: red,
            out_eta: out_eta,
            is_the_machine_still_running: is_running,
            status: entry_status
          }]).select();
          
          if (insertError) throw new Error(insertError.message);
          const res = { message: insertedData };
`;

html = html.replace(createRegex, createNew);

// 3. Refactor Update Full
const updateRegex = /const\s+res\s*=\s*await\s+callFrappe\("\/api\/method\/mxg_fleet_track\.omnis_dashboard\.ft_breakdown_dashboard\.update_ft_breakdown_full"[\s\S]*?payload\);/;

const updateNew = `
      // Update in Supabase
      const { error: updateError } = await supabase.from('ft_breakdown_logs').update({
        description: payload.description,
        urgent: !!payload.urgent,
        responsibility: payload.resp,
        ted_status: payload.ted_status,
        category: payload.category,
        parts_eta: payload.parts_eta,
        on_hold: !!payload.on_hold,
        quote_date: payload.quote_date,
        breakdown_end_date: payload.breakdown_end_date,
        ted: payload.ted,
        red: payload.red,
        out_eta: payload.out_eta,
        status: payload.status,
        is_the_machine_still_running: payload.is_the_machine_still_running
      }).eq('id', payload.name);

      if (updateError) throw new Error(updateError.message);
      const res = { message: "Updated" };
`;

html = html.replace(updateRegex, updateNew);


// 4. Update Status (manager_comments)
// Look for update_ft_breakdown_status
const updateStatusRegex = /const\s+r\s*=\s*await\s+callFrappe\(FT_BREAKDOWN_UPDATE_METHOD,\s*\{\s*name:\s*name\s*\}\);/;

const updateStatusNew = `
    const { error: updateError } = await supabase.from('ft_breakdown_logs').update({ manager_comments: val }).eq('id', rowName);
    if (updateError) throw new Error(updateError.message);
    const r = { message: "ok" };
`;

html = html.replace(/async\s+function\s+saveComment\([^)]+\)\s*{[\s\S]*?const\s+r\s*=\s*await\s+callFrappe\(FT_BREAKDOWN_UPDATE_METHOD[^;]+;/g, function(match) {
    // Actually wait, let's just replace the callFrappe part inside saveComment
    return match.replace(/const\s+r\s*=\s*await\s+callFrappe\(FT_BREAKDOWN_UPDATE_METHOD[^;]+;/, updateStatusNew);
});


// 5. Send for approval
const approvalRegex = /const\s+result\s*=\s*await\s+callFrappe\(FT_BREAKDOWN_SEND_APPROVAL_METHOD,\s*\{\s*filters_json:\s*JSON\.stringify\(filters\)\s*\}\);/;

const approvalNew = `
        const names = pendingApprovalRows.map(r => r.name);
        const { error: appError } = await supabase.from('ft_breakdown_logs').update({ supervisor_approved: true }).in('id', names);
        if (appError) throw new Error(appError.message);
        const result = { message: "ok" };
`;

html = html.replace(approvalRegex, approvalNew);

fs.writeFileSync('systems/fleetrack/index.html', html);
console.log("Refactoring complete");
