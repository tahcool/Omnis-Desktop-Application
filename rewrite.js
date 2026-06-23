const fs = require('fs');

const file = 'C:/Users/Administrator/omnis/systems/salestrack/dashboard_logic.js';
let content = fs.readFileSync(file, 'utf8');

const regex = /renderCommandCenter\(data, isFullView = false\) \{[\s\S]*?\n    \}\n\n    previewManualFollowup/g;

const replacement = `renderCommandCenter(data, isFullView = false) {
        const { quotes, emails } = data;
        
        let totalQuotes = quotes.length;
        let loggedFollowups = quotes.filter(q => q.custom_follow_up_status && q.custom_follow_up_status.trim() !== "").length;
        let complianceRate = totalQuotes > 0 ? Math.round((loggedFollowups / totalQuotes) * 100) : 0;

        let repStats = {};
        quotes.forEach(q => {
            const rep = q.custom_sales_person || "Unassigned";
            if (!repStats[rep]) repStats[rep] = { total: 0, logged: 0 };
            repStats[rep].total++;
            if (q.custom_follow_up_status && q.custom_follow_up_status.trim() !== "") {
                repStats[rep].logged++;
            }
        });

        let leaderboardHtml = Object.entries(repStats)
            .sort((a, b) => b[1].total - a[1].total)
            .map(([rep, stats]) => {
                let rate = stats.total > 0 ? Math.round((stats.logged / stats.total) * 100) : 0;
                let color = rate >= 80 ? '#10b981' : rate >= 50 ? '#f59e0b' : '#ef4444';
                return \`
                <tr style="border-bottom:1px solid #f1f5f9;">
                    <td style="padding:12px 16px; font-weight:600; color:#1e293b;">\${rep}</td>
                    <td style="padding:12px 16px; text-align:center; color:#64748b;">\${stats.total}</td>
                    <td style="padding:12px 16px; text-align:center; font-weight:800; color:#0f172a;">\${stats.logged}</td>
                    <td style="padding:12px 16px; text-align:right; font-weight:800; color:\${color};">\${rate}%</td>
                </tr>\`;
            }).join('');

        let emailsHtml = emails.length === 0 
            ? \`<div style="padding:30px; text-align:center; color:#94a3b8; font-style:italic;">No automated emails dispatched recently.</div>\`
            : \`<table style="width:100%; border-collapse:collapse; font-size:13px; text-align:left;">
                <thead>
                    <tr style="background:#f8fafc; border-bottom:2px solid #e2e8f0;">
                        <th style="padding:12px; font-weight:800; color:#475569;">Time</th>
                        <th style="padding:12px; font-weight:800; color:#475569;">Recipient</th>
                        <th style="padding:12px; font-weight:800; color:#475569;">Subject</th>
                        <th style="padding:12px; font-weight:800; color:#475569; text-align:right;">Status</th>
                    </tr>
                </thead>
                <tbody>
                    \${emails.map(e => {
                        let statusColor = e.status === 'sent' ? '#10b981' : e.status === 'failed' ? '#ef4444' : '#f59e0b';
                        let timeStr = new Date(e.created_at).toLocaleString();
                        return \`
                        <tr style="border-bottom:1px solid #f1f5f9;">
                            <td style="padding:12px; color:#64748b;">\${timeStr}</td>
                            <td style="padding:12px; font-weight:600; color:#0f172a;">\${e.to_email}</td>
                            <td style="padding:12px; color:#334155;">\${e.subject}</td>
                            <td style="padding:12px; text-align:right;">
                                <span style="background:\${statusColor}22; color:\${statusColor}; font-weight:800; font-size:11px; padding:4px 8px; border-radius:99px; text-transform:uppercase;">\${e.status}</span>
                            </td>
                        </tr>\`;
                    }).join('')}
                </tbody>
               </table>\`;

        const html = \`
            <div class="command-center-container" style="padding:20px; font-family:'Inter', sans-serif;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:30px;">
                    <div style="display:flex; align-items:center; gap:16px;">
                        <div style="width:48px; height:48px; border-radius:12px; background:#0f172a; display:flex; align-items:center; justify-content:center; font-size:20px; color:white;">
                            <i class="fas fa-chart-pie"></i>
                        </div>
                        <div>
                            <div style="font-size:22px; font-weight:900; color:#0f172a; letter-spacing:-0.02em;">Follow-Up Analytics</div>
                            <div style="font-size:13px; color:#64748b; font-weight:600;">Monitor sales compliance and automated dispatch logs (Last 30 Days).</div>
                        </div>
                    </div>
                    <button onclick="window.salestrack.openCommandCenter(\${isFullView})" style="background:#f1f5f9; color:#475569; border:none; padding:10px 16px; border-radius:8px; font-weight:700; cursor:pointer; font-size:13px;"><i class="fas fa-sync-alt" style="margin-right:6px;"></i> REFRESH</button>
                </div>

                <div style="display:grid; grid-template-columns: 1fr 2fr; gap:30px; margin-bottom:30px;">
                    <div style="background:white; border-radius:16px; border:1px solid #e2e8f0; padding:24px; box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">
                        <h3 style="margin:0 0 20px 0; font-size:16px; font-weight:800; color:#0f172a; border-bottom:2px solid #f1f5f9; padding-bottom:10px;">Overall Compliance</h3>
                        <div style="display:flex; align-items:center; gap:20px; margin-bottom:30px;">
                            <div style="width:80px; height:80px; border-radius:50%; background:#f8fafc; border:4px solid \${complianceRate >= 70 ? '#10b981' : complianceRate >= 40 ? '#f59e0b' : '#ef4444'}; display:flex; align-items:center; justify-content:center; font-size:22px; font-weight:900; color:#0f172a;">
                                \${complianceRate}%
                            </div>
                            <div>
                                <div style="font-size:12px; color:#64748b; font-weight:700; text-transform:uppercase;">Quotes Followed-Up</div>
                                <div style="font-size:18px; font-weight:900; color:#0f172a; margin-top:2px;">\${loggedFollowups} <span style="font-size:13px; color:#94a3b8; font-weight:600;">/ \${totalQuotes} Total</span></div>
                            </div>
                        </div>
                        
                        <h3 style="margin:0 0 15px 0; font-size:14px; font-weight:800; color:#0f172a; text-transform:uppercase; letter-spacing:0.05em;">Sales Team Leaderboard</h3>
                        <div style="border:1px solid #e2e8f0; border-radius:8px; overflow:hidden;">
                            <table style="width:100%; border-collapse:collapse; font-size:13px; text-align:left;">
                                <thead>
                                    <tr style="background:#f8fafc; border-bottom:1px solid #e2e8f0;">
                                        <th style="padding:10px 16px; font-weight:800; color:#475569;">Rep</th>
                                        <th style="padding:10px 16px; font-weight:800; color:#475569; text-align:center;">Quotes</th>
                                        <th style="padding:10px 16px; font-weight:800; color:#475569; text-align:center;">Logged</th>
                                        <th style="padding:10px 16px; font-weight:800; color:#475569; text-align:right;">Rate</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    \${leaderboardHtml}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div style="background:white; border-radius:16px; border:1px solid #e2e8f0; padding:24px; box-shadow:0 4px 6px -1px rgba(0,0,0,0.05); display:flex; flex-direction:column;">
                        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #f1f5f9; padding-bottom:10px; margin-bottom:20px;">
                            <h3 style="margin:0; font-size:16px; font-weight:800; color:#0f172a;"><i class="fas fa-envelope" style="color:#2563eb; margin-right:8px;"></i> Automated Dispatch Logs</h3>
                            <span style="font-size:11px; font-weight:700; color:#64748b; background:#f1f5f9; padding:4px 10px; border-radius:99px;">Latest 50</span>
                        </div>
                        <div style="overflow-y:auto; flex:1; max-height:500px;">
                            \${emailsHtml}
                        </div>
                    </div>
                </div>
            </div>
        \`;

        if (!isFullView) {
            this.openListModal("Follow-up Analytics", html, "1200px");
        } else {
            const fullCont = document.getElementById('command-center-full-container');
            if (fullCont) fullCont.innerHTML = html;
        }
    }

    previewManualFollowup`;

content = content.replace(regex, replacement);
fs.writeFileSync(file, content);
console.log('Replaced renderCommandCenter successfully!');
