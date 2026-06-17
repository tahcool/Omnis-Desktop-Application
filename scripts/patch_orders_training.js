const fs = require('fs');

let jsPath = 'systems/salestrack/orders_logic.js';
let content = fs.readFileSync(jsPath, 'utf8');

let injection = `
window.openTrainingReport = async function() {
    if (!window.salestrack || !window.salestrack.openListModal) {
        alert("Modal functionality not ready.");
        return;
    }
    
    window.salestrack.openListModal("Training Report", "<div style='padding:60px;text-align:center;color:#64748b;font-weight:600;'><i class='fas fa-spinner fa-spin' style='margin-right:10px;'></i> Generating planned trainings report...</div>", "1000px");

    let res = await window.electron.invoke('supabase:query', {
        table: 'ft_operator_training',
        method: 'select',
        params: {
            columns: '*',
            order: { column: 'training_date', ascending: true },
            limit: 1000
        }
    });

    if (!res.ok || !res.data) {
        window.salestrack.openListModal("Training Report", "<div style='padding:40px;text-align:center;color:#ef4444;'>Failed to load trainings from database.</div>", "1000px");
        return;
    }

    let trainings = res.data;
    if (trainings.length === 0) {
        window.salestrack.openListModal("Training Report", "<div style='padding:60px;text-align:center;color:#64748b;font-size:14px;font-style:italic;'>No operator trainings currently planned.</div>", "1000px");
        return;
    }

    let html = \`
    <div style="padding:20px; background:#f8fafc;">
        <h2 style="margin-top:0; color:#0f172a; font-size:20px; border-bottom:2px solid #e2e8f0; padding-bottom:10px; margin-bottom:20px;">
            <i class="fas fa-user-graduate" style="color:#0891b2; margin-right:10px;"></i> Planned Operator Trainings
        </h2>
        <div style="background:white; border-radius:12px; border:1px solid #e2e8f0; overflow:hidden;">
            <table style="width:100%; border-collapse:collapse; font-size:13px; text-align:left;">
                <thead style="background:#f1f5f9; color:#475569; font-weight:700; text-transform:uppercase; font-size:11px; letter-spacing:0.05em;">
                    <tr>
                        <th style="padding:16px; border-bottom:1px solid #e2e8f0; width:20%;">Customer / Order</th>
                        <th style="padding:16px; border-bottom:1px solid #e2e8f0; width:20%;">Machine</th>
                        <th style="padding:16px; border-bottom:1px solid #e2e8f0; width:20%;">Location</th>
                        <th style="padding:16px; border-bottom:1px solid #e2e8f0; width:15%;">Trainer</th>
                        <th style="padding:16px; border-bottom:1px solid #e2e8f0; width:10%; text-align:center;">Operators</th>
                        <th style="padding:16px; border-bottom:1px solid #e2e8f0; width:15%;">Date</th>
                    </tr>
                </thead>
                <tbody>\`;

    for (let t of trainings) {
        let customer = t.customer || t.order_id || 'Unknown';
        
        html += \`
            <tr style="border-bottom:1px solid #e2e8f0; transition:background 0.2s;" onmouseover="this.style.background='#ecfeff'" onmouseout="this.style.background='white'">
                <td style="padding:16px; font-weight:700; color:#334155; vertical-align:middle;">\${customer}</td>
                <td style="padding:16px; font-weight:600; color:#0f172a; vertical-align:middle;">\${t.machine || '-'}</td>
                <td style="padding:16px; color:#475569; vertical-align:middle;">
                    <i class="fas fa-map-marker-alt" style="color:#ef4444; margin-right:4px;"></i> \${t.location || '-'}
                </td>
                <td style="padding:16px; color:#475569; vertical-align:middle;">\${t.trainer_name || '-'}</td>
                <td style="padding:16px; color:#0f172a; font-weight:700; text-align:center; vertical-align:middle;">\${t.number_of_operators || 1}</td>
                <td style="padding:16px; vertical-align:middle;">
                    <div style="background:#ecfeff; color:#0891b2; font-weight:700; padding:6px 10px; border-radius:6px; display:inline-block; border:1px solid #a5f3fc;">
                        \${t.training_date ? t.training_date.substring(0, 10) : '-'}
                    </div>
                </td>
            </tr>
        \`;
    }

    html += \`</tbody></table></div></div>\`;
    window.salestrack.openListModal("Training Report", html, "1200px");
};
\n\n`;

if (!content.includes('openTrainingReport')) {
    fs.writeFileSync(jsPath, content + injection);
    console.log('Appended openTrainingReport');
} else {
    console.log('openTrainingReport already exists');
}
