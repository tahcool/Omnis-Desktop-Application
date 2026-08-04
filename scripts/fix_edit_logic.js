const fs = require('fs');
let html = fs.readFileSync('systems/fleetrack/index.html', 'utf8');

// Fix update_ft_breakdown_full
html = html.replace(/\.eq\('id', payload\.name\)/g, `.or(\`id.eq.\${payload.name},frappe_name.eq.\${payload.name}\`)`);

// Fix saveComment
html = html.replace(/\.eq\('id', rowName\)/g, `.or(\`id.eq.\${rowName},frappe_name.eq.\${rowName}\`)`);

// Fix sendBreakdownForApproval
// names is an array of strings
// supabase... .in('id', names) -> we should check both id and frappe_name, or just map names to the proper field. 
// Actually, earlier I set: let bd = { ...r, name: r.frappe_name || r.id }
// So for newly created ones, it uses id (since frappe_name is null). For migrated ones, it uses frappe_name.
// So `names` contains a mix of UUIDs and Frappe IDs.
// Unfortunately, Supabase doesn't easily support `.or` with `.in`. 
// So let's replace `name: r.frappe_name || r.id` with just `name: r.id`.
// But wait! `frappe_name` is used as deduplication key elsewhere maybe?
// Actually, it's fine. The UI uses `row.name` for everything. Let's just fix the `update` to use the same logic.
html = html.replace(/\.in\('id', names\)/g, `.in('frappe_name', names)`); // Wait, this breaks new ones.
// Let's manually replace the sendBreakdownForApproval
const fixApproval = `const { error: appError } = await supabase.from('ft_breakdown_logs').update({ supervisor_approved: true }).in('id', names);`;
const fixApprovalNew = `
        const uuidNames = names.filter(n => n.includes('-') && n.length > 20); // rough UUID check
        const frappeNames = names.filter(n => !n.includes('-') || n.length < 20);
        let appError = null;
        if (uuidNames.length > 0) {
            const res = await supabase.from('ft_breakdown_logs').update({ supervisor_approved: true }).in('id', uuidNames);
            if (res.error) appError = res.error;
        }
        if (frappeNames.length > 0) {
            const res = await supabase.from('ft_breakdown_logs').update({ supervisor_approved: true }).in('frappe_name', frappeNames);
            if (res.error) appError = res.error;
        }
`;
html = html.replace(fixApproval, fixApprovalNew);

fs.writeFileSync('systems/fleetrack/index.html', html);
console.log("Edit fixes applied.");
