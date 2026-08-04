const fs = require('fs');
let html = fs.readFileSync('systems/fleetrack/index.html', 'utf8');

const oldTryCatch = `      // Update in Supabase
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
      }).or(\`id.eq.\${payload.name},frappe_name.eq.\${payload.name}\`);

      if (updateError) throw new Error(updateError.message);
      const res = { message: "Updated" };

        if (res.message && res.message.ok) {
          showToast(isApprove ? "Breakdown Signed Off!" : "Breakdown updated successfully", "ok");
          closeDbrEditModal();
          loadDailyBreakdownReport(); // Reload table
        } else {
          const errMsg = (res.message && res.message.error) ? res.message.error : "Failed to update breakdown";
          showToast(errMsg, "err");
          console.error("Update failed response:", res);
        }`;

const newTryCatch = `      // Update in Supabase
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
      };
      if (payload.supervisor_comment !== undefined) updateData.manager_comments = payload.supervisor_comment;
      if (payload.supervisor_approved) updateData.supervisor_approved = true;

      const { error: updateError } = await supabase.from('ft_breakdown_logs').update(updateData).or(\`id.eq.\${payload.name},frappe_name.eq.\${payload.name}\`);

      if (updateError) throw new Error(updateError.message);
      
      showToast(isApprove ? "Breakdown Signed Off!" : "Breakdown updated successfully", "ok");
      closeDbrEditModal();
      loadDailyBreakdownReport(); // Reload table
`;

html = html.replace(oldTryCatch, newTryCatch);
fs.writeFileSync('systems/fleetrack/index.html', html);
console.log("Fixes applied");
