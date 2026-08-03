const fs = require('fs');

let html = fs.readFileSync('systems/fleetrack/index.html', 'utf8');

const targetStr = `                      <div>
                        <h2 style="font-size:20px; font-weight:800; color:var(--text-main,#0f172a); margin:0 0 4px 0;">Fleetrack Reports</h2>
                        <p style="font-size:12px; color:#64748b; margin:0;">Native reports — data loaded directly from the system, no external browser.</p>
                      </div>
                    </div>`;

const replaceStr = `                      <div>
                        <h2 style="font-size:20px; font-weight:800; color:var(--text-main,#0f172a); margin:0 0 4px 0;">Fleetrack Reports</h2>
                        <p style="font-size:12px; color:#64748b; margin:0;">Native reports — data loaded directly from the system, no external browser.</p>
                      </div>
                      <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
                        <!-- Pill 1 -->
                        <div style="display:flex; align-items:center; gap:8px; background:#ffffff; border:1px solid #e2e8f0; padding:6px 12px; border-radius:20px; box-shadow:0 1px 2px rgba(0,0,0,0.02);">
                          <div style="width:6px; height:6px; border-radius:50%; background:#eab308;"></div>
                          <span style="font-size:11px; font-weight:700; color:#64748b; letter-spacing:0.3px;">PENDING ISR: <strong id="hub-kpi-isr" style="color:#0f172a; margin-left:2px;">—</strong></span>
                        </div>
                        <!-- Pill 2 -->
                        <div style="display:flex; align-items:center; gap:8px; background:#ffffff; border:1px solid #e2e8f0; padding:6px 12px; border-radius:20px; box-shadow:0 1px 2px rgba(0,0,0,0.02);">
                          <div style="width:6px; height:6px; border-radius:50%; background:#ef4444;"></div>
                          <span style="font-size:11px; font-weight:700; color:#64748b; letter-spacing:0.3px;">URGENT MWR: <strong id="hub-kpi-mwr" style="color:#0f172a; margin-left:2px;">—</strong></span>
                        </div>
                        <!-- Pill 3 -->
                        <div style="display:flex; align-items:center; gap:8px; background:#ffffff; border:1px solid #e2e8f0; padding:6px 12px; border-radius:20px; box-shadow:0 1px 2px rgba(0,0,0,0.02);">
                          <div style="width:6px; height:6px; border-radius:50%; background:#3b82f6;"></div>
                          <span style="font-size:11px; font-weight:700; color:#64748b; letter-spacing:0.3px;">UNASSIGNED BD: <strong id="hub-kpi-bd" style="color:#0f172a; margin-left:2px;">—</strong></span>
                        </div>
                      </div>
                    </div>`;

if(html.includes(targetStr)) {
    html = html.replace(targetStr, replaceStr);
    fs.writeFileSync('systems/fleetrack/index.html', html);
    console.log('Successfully added minimalistic KPIs to Reports Hub');
} else {
    console.log('Error: Could not find target string');
}
