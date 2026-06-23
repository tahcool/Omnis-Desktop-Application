const fs = require('fs');
const file = 'C:/Users/Administrator/omnis/systems/salestrack/dashboard_logic.js';
let content = fs.readFileSync(file, 'utf8');

const startStr = "async openCommandCenter(isFullView = false) {";
const endStr = "    // --- OFFLINE SYNC ---"; // Or whatever is right after renderCommandCenter

const startIndex = content.indexOf(startStr);
const endIndex = content.indexOf(endStr, startIndex);

if (startIndex !== -1 && endIndex !== -1) {
    const replacement = `
    async forceEmailDispatch() {
        if (!confirm("Are you sure you want to manually trigger the daily dispatch? This will immediately email all salespeople with their pending follow-ups.")) return;
        
        try {
            this.showToast("Triggering email dispatch...", "info");
            const res = await window.electron.invoke('supabase:edgeFunction', { name: 'daily-quote-reminders', data: {} });
            
            if (res && res.data) {
                this.showToast(\`Successfully queued \${res.data.emails_queued || 0} emails for \${res.data.quotes_found || 0} quotes.\`, "success");
            } else {
                this.showToast("Dispatch triggered successfully.", "success");
            }
            // Refresh
            setTimeout(() => this.openCommandCenter(true), 2000);
        } catch (e) {
            console.error(e);
            this.showToast("Failed to trigger dispatch: " + e.message, "error");
        }
    }

    openRepProfile(repName) {
        if (!this.cachedCommandCenterData) return;
        const quotes = this.cachedCommandCenterData.quotes || [];
        const dueQuotes = this.cachedCommandCenterData.dueQuotes || [];
        
        // Find rep's specific quotes
        const repQuotes = quotes.filter(q => (q.custom_sales_person || "Unassigned") === repName);
        const repDue = dueQuotes.filter(q => (q.custom_sales_person || "Unassigned") === repName);
        
        let total = repQuotes.length;
        let logged = repQuotes.filter(q => q.custom_follow_up_status && q.custom_follow_up_status.trim() !== "").length;
        let rate = total > 0 ? Math.round((logged / total) * 100) : 0;
        
        let color = rate >= 80 ? '#10b981' : (rate >= 50 ? '#f59e0b' : '#ef4444');
        
        let dueHtml = \`<div style="color:#64748b; font-size:14px; text-align:center; padding:20px;">No quotes are currently past due for this representative.</div>\`;
        
        if (repDue.length > 0) {
            dueHtml = \`<table style="width:100%; border-collapse:collapse; margin-top:10px; font-size:13px;">
                <thead>
                    <tr style="border-bottom:2px solid #e2e8f0; color:#475569; text-transform:uppercase; font-size:11px;">
                        <th style="padding:10px; text-align:left;">Quote</th>
                        <th style="padding:10px; text-align:left;">Customer</th>
                        <th style="padding:10px; text-align:left;">Next Follow-Up</th>
                    </tr>
                </thead>
                <tbody>
                    \${repDue.map(q => {
                        const isMissing = !q.custom_follow_up_status || q.custom_follow_up_status.trim() === "";
                        return \`<tr style="border-bottom:1px solid #f1f5f9; cursor:pointer;" onclick="window.salestrack.openDoc('Quotation', '\${q.name}')" onmouseover="this.style.backgroundColor='#f8fafc'" onmouseout="this.style.backgroundColor='transparent'">
                            <td style="padding:12px 10px; color:#2563eb; font-weight:600;">\${q.name} \${isMissing ? '<span style="color:#ef4444; margin-left:5px;" title="Missing Follow-up Note"><i class="fas fa-exclamation-circle"></i></span>' : ''}</td>
                            <td style="padding:12px 10px; color:#334155;">\${q.customer_name || '-'}</td>
                            <td style="padding:12px 10px; color:#ef4444; font-weight:700;">\${q.custom_next_follow_up_date || '-'}</td>
                        </tr>\`;
                    }).join('')}
                </tbody>
            </table>\`;
        }

        const html = \`
            <div style="padding:20px 30px; font-family:'Inter', sans-serif;">
                <div style="display:flex; align-items:center; gap:20px; margin-bottom:30px; padding-bottom:20px; border-bottom:1px solid #e2e8f0;">
                    <div style="width:80px; height:80px; border-radius:50%; background:\${color}15; color:\${color}; display:flex; align-items:center; justify-content:center; font-size:32px; font-weight:800;">
                        \${repName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <div style="font-size:24px; font-weight:800; color:#0f172a;">\${repName}</div>
                        <div style="font-size:14px; color:#64748b; margin-top:4px;">Sales Representative Profile</div>
                    </div>
                    <div style="margin-left:auto; text-align:right;">
                        <div style="font-size:32px; font-weight:900; color:\${color};">\${rate}%</div>
                        <div style="font-size:12px; font-weight:700; color:#64748b; text-transform:uppercase;">Compliance Rate</div>
                    </div>
                </div>
                
                <h3 style="font-size:16px; font-weight:800; color:#0f172a; margin-bottom:15px; display:flex; align-items:center; gap:8px;">
                    <i class="fas fa-clock" style="color:#f59e0b;"></i> Due for Follow-Up (\${repDue.length})
                </h3>
                <div style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; overflow:hidden;">
                    \${dueHtml}
                </div>
            </div>
        \`;
        
        this.openListModal(\`Rep Profile: \${repName}\`, html, "800px");
    }

    async openCommandCenter(isFullView = false) {
        if (!isFullView) {
            this.openListModal("Follow-up Analytics", \`<div style="padding:40px; text-align:center;"><i class="fas fa-spinner fa-spin" style="font-size:24px; color:#4f46e5;"></i><div style="margin-top:15px; font-weight:600; color:#64748b;">Loading analytics...</div></div>\`, "1200px");
        } else {
            const fullCont = document.getElementById('command-center-full-container');
            if (fullCont) {
                fullCont.innerHTML = \`<div style="padding:100px; text-align:center;"><i class="fas fa-spinner fa-spin" style="font-size:32px; color:#4f46e5;"></i><div style="margin-top:20px; font-weight:600; color:#64748b; font-size:18px;">Loading analytics...</div></div>\`;
            }
        }

        try {
            // 1. Fetch Quotations from the last 30 days
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const dateStr = thirtyDaysAgo.toISOString().split('T')[0];
            const todayStr = new Date().toISOString().split('T')[0];

            let quotesRes = await window.electron.invoke('supabase:query', {
                method: 'select',
                table: 'frappe_quotation',
                columns: 'name, custom_sales_person, custom_follow_up_status, transaction_date, customer_name, custom_next_follow_up_date, status',
                limit: 2000
            });
            let allQuotes = quotesRes.data || [];
            
            // Filter locally for last 30 days for general compliance stats
            let quotes = allQuotes.filter(q => q.transaction_date && q.transaction_date >= dateStr);
            
            // Quotes due for follow up today or earlier
            let dueQuotes = allQuotes.filter(q => {
                if (!q.custom_next_follow_up_date) return false;
                if (q.status === 'Lost' || q.status === 'Cancelled') return false;
                return q.custom_next_follow_up_date <= todayStr;
            });
            dueQuotes.sort((a,b) => (a.custom_next_follow_up_date < b.custom_next_follow_up_date ? -1 : 1));

            // 2. Fetch recent dispatch logs
            let emailsRes = await window.electron.invoke('supabase:query', {
                method: 'select',
                table: 'omnis_email_queue',
                columns: 'id, to_email, subject, status, created_at, related_type',
                limit: 50,
                order: { column: 'created_at', ascending: false }
            });
            let emails = emailsRes.data || [];
            emails = emails.filter(e => e.related_type === 'quotation_reminder');

            this.cachedCommandCenterData = { quotes, emails, dueQuotes };
            this.renderCommandCenter(this.cachedCommandCenterData, isFullView);
        } catch (e) {
            console.error("Command Center Error:", e);
            if (!isFullView) {
                this.openListModal("Command Center Error", \`<div style="padding:20px; color:#ef4444;">\${e.message || "Failed to load command center"}</div>\`);
            } else {
                const fullCont = document.getElementById('command-center-full-container');
                if (fullCont) fullCont.innerHTML = \`<div style="padding:60px; text-align:center; color:#ef4444;"><i class="fas fa-exclamation-triangle" style="font-size:48px; margin-bottom:20px;"></i><div style="font-size:18px; font-weight:800;">Command Center Error</div><div style="margin-top:10px;">\${e.message || "Failed to load follow-up data"}</div></div>\`;
            }
        }
    }

    renderCommandCenter(data, isFullView = false) {
        const { quotes, emails, dueQuotes } = data;
        
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
            .map(([rep, stat]) => {
                let rate = stat.total > 0 ? Math.round((stat.logged / stat.total) * 100) : 0;
                let color = rate >= 80 ? '#10b981' : (rate >= 50 ? '#f59e0b' : '#ef4444');
                return \`
                <tr style="border-bottom:1px solid #f1f5f9; cursor:pointer; transition:all 0.2s;" onclick="window.salestrack.openRepProfile('\${rep.replace(/'/g, "\\\\'")}')" onmouseover="this.style.backgroundColor='#f8fafc'" onmouseout="this.style.backgroundColor='transparent'">
                    <td style="padding:12px 10px; font-size:13px; font-weight:600; color:#0f172a; display:flex; align-items:center; gap:10px;">
                        <div style="width:24px; height:24px; border-radius:50%; background:\${color}15; color:\${color}; display:flex; align-items:center; justify-content:center; font-size:10px;">\${rep.charAt(0)}</div>
                        \${rep}
                    </td>
                    <td style="padding:12px 10px; font-size:13px; color:#475569;">\${stat.total}</td>
                    <td style="padding:12px 10px; font-size:13px; color:#475569;">\${stat.logged}</td>
                    <td style="padding:12px 10px; font-size:13px; font-weight:700; color:\${color};">\${rate}%</td>
                </tr>
                \`;
            })
            .sort((a,b) => {
                const aMatch = a.match(/>(\\d+)%<\\/td>/);
                const bMatch = b.match(/>(\\d+)%<\\/td>/);
                const aRate = aMatch ? parseInt(aMatch[1]) : 0;
                const bRate = bMatch ? parseInt(bMatch[1]) : 0;
                return bRate - aRate; // descending
            })
            .join('');
            
        let globalDueHtml = \`<div style="color:#94a3b8; font-size:14px; text-align:center; padding:30px;">No quotes are currently due for follow-up!</div>\`;
        if (dueQuotes && dueQuotes.length > 0) {
            globalDueHtml = \`<table style="width:100%; border-collapse:collapse; font-size:13px;">
                <thead>
                    <tr style="border-bottom:2px solid #e2e8f0; color:#475569; text-transform:uppercase; font-size:11px;">
                        <th style="padding:10px; text-align:left;">Quote</th>
                        <th style="padding:10px; text-align:left;">Rep</th>
                        <th style="padding:10px; text-align:left;">Customer</th>
                        <th style="padding:10px; text-align:left;">Due Date</th>
                    </tr>
                </thead>
                <tbody>
                    \${dueQuotes.slice(0, 15).map(q => \`
                        <tr style="border-bottom:1px solid #f1f5f9; cursor:pointer;" onclick="window.salestrack.openDoc('Quotation', '\${q.name}')" onmouseover="this.style.backgroundColor='#f8fafc'" onmouseout="this.style.backgroundColor='transparent'">
                            <td style="padding:12px 10px; color:#2563eb; font-weight:600;">\${q.name}</td>
                            <td style="padding:12px 10px; color:#334155; font-weight:500;">\${q.custom_sales_person || '-'}</td>
                            <td style="padding:12px 10px; color:#334155;">\${q.customer_name || '-'}</td>
                            <td style="padding:12px 10px; color:#ef4444; font-weight:700;">\${q.custom_next_follow_up_date || '-'}</td>
                        </tr>
                    \`).join('')}
                </tbody>
            </table>
            \${dueQuotes.length > 15 ? \`<div style="padding:10px; text-align:center; font-size:12px; color:#64748b; background:#f8fafc; border-top:1px solid #e2e8f0;">Showing first 15 of \${dueQuotes.length} due quotes. See rep profiles for more.</div>\` : ''}\`;
        }

        let emailsHtml = emails.length === 0 
            ? \`<div style="padding:40px; text-align:center; color:#94a3b8; font-style:italic;">No automated emails dispatched recently.</div>\`
            : \`<table style="width:100%; border-collapse:collapse; font-size:13px;">
                <tbody>
                    \${emails.map(e => {
                        let dt = new Date(e.created_at).toLocaleString();
                        let statusColor = e.status === 'sent' ? '#10b981' : (e.status === 'failed' ? '#ef4444' : '#f59e0b');
                        return \`
                        <tr style="border-bottom:1px solid #f1f5f9;">
                            <td style="padding:12px; font-weight:600; color:#334155;">\${e.to_email}</td>
                            <td style="padding:12px; color:#64748b;">\${e.subject}</td>
                            <td style="padding:12px; color:#94a3b8;">\${dt}</td>
                            <td style="padding:12px;">
                                <span style="background:\${statusColor}15; color:\${statusColor}; padding:4px 8px; border-radius:12px; font-size:11px; font-weight:700; text-transform:uppercase;">\${e.status}</span>
                            </td>
                        </tr>
                        \`;
                    }).join('')}
                </tbody>
            </table>\`;

        const html = \`
            <div class="command-center-container" style="padding:20px; font-family:'Inter', sans-serif;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:30px;">
                    <div style="display:flex; align-items:center; gap:16px;">
                        <div style="width:48px; height:48px; border-radius:12px; background:#0f172a; color:#fff; display:flex; align-items:center; justify-content:center; font-size:20px;">
                            <i class="fas fa-chart-pie"></i>
                        </div>
                        <div>
                            <h2 style="margin:0; font-size:24px; font-weight:800; color:#0f172a; letter-spacing:-0.5px;">Follow-Up Analytics</h2>
                            <div style="font-size:13px; color:#64748b; margin-top:2px;">Monitor sales compliance and automated dispatch logs (Last 30 Days).</div>
                        </div>
                    </div>
                    <div style="display:flex; gap:10px;">
                        <button onclick="window.salestrack.forceEmailDispatch()" style="background:#2563eb; color:#ffffff; border:none; padding:10px 16px; border-radius:8px; font-weight:700; cursor:pointer; font-size:13px; box-shadow:0 4px 6px -1px rgba(37,99,235,0.2);"><i class="fas fa-paper-plane" style="margin-right:6px;"></i> FORCE DISPATCH NOW</button>
                        <button onclick="window.salestrack.openCommandCenter(\${isFullView})" style="background:#f1f5f9; color:#475569; border:none; padding:10px 16px; border-radius:8px; font-weight:700; cursor:pointer; font-size:13px;"><i class="fas fa-sync-alt" style="margin-right:6px;"></i> REFRESH</button>
                    </div>
                </div>

                <div style="display:grid; grid-template-columns: 1.2fr 2fr; gap:24px;">
                    <div style="display:flex; flex-direction:column; gap:24px;">
                        <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:16px; padding:24px; box-shadow:0 10px 25px -5px rgba(0,0,0,0.02);">
                            <h3 style="margin:0 0 20px 0; font-size:14px; font-weight:800; color:#0f172a; text-transform:uppercase; letter-spacing:0.5px;">Overall Compliance</h3>
                            <div style="display:flex; align-items:center; gap:20px;">
                                <div style="width:80px; height:80px; border-radius:50%; border:4px solid \${complianceRate >= 80 ? '#10b981' : (complianceRate >= 50 ? '#f59e0b' : '#ef4444')}; display:flex; align-items:center; justify-content:center; font-size:24px; font-weight:800; color:#0f172a;">
                                    \${complianceRate}%
                                </div>
                                <div>
                                    <div style="font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:0.5px;">Quotes Followed-Up</div>
                                    <div style="font-size:14px; font-weight:600; color:#0f172a; margin-top:4px;">\${loggedFollowups} <span style="color:#94a3b8; font-weight:400;">/ \${totalQuotes} Total</span></div>
                                </div>
                            </div>
                        </div>

                        <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:16px; padding:24px; box-shadow:0 10px 25px -5px rgba(0,0,0,0.02);">
                            <h3 style="margin:0 0 15px 0; font-size:12px; font-weight:800; color:#0f172a; text-transform:uppercase; letter-spacing:0.5px;">Sales Team Leaderboard</h3>
                            <table style="width:100%; border-collapse:collapse;">
                                <thead>
                                    <tr style="border-bottom:1px solid #e2e8f0; color:#94a3b8; font-size:11px; text-transform:uppercase;">
                                        <th style="padding:8px 10px; text-align:left; font-weight:700;">Rep</th>
                                        <th style="padding:8px 10px; text-align:left; font-weight:700;">Quotes</th>
                                        <th style="padding:8px 10px; text-align:left; font-weight:700;">Logged</th>
                                        <th style="padding:8px 10px; text-align:left; font-weight:700;">Rate</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    \${leaderboardHtml}
                                </tbody>
                            </table>
                            <div style="font-size:11px; color:#94a3b8; margin-top:12px; font-style:italic;">Click on a rep to view their profile and specific due quotes.</div>
                        </div>
                    </div>

                    <div style="display:flex; flex-direction:column; gap:24px;">
                        <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:16px; overflow:hidden; box-shadow:0 10px 25px -5px rgba(0,0,0,0.02);">
                            <div style="padding:16px 20px; border-bottom:1px solid #e2e8f0; background:#f8fafc; display:flex; align-items:center; justify-content:space-between;">
                                <h3 style="margin:0; font-size:13px; font-weight:800; color:#0f172a; display:flex; align-items:center; gap:8px;">
                                    <i class="fas fa-clock" style="color:#ef4444;"></i> Global Due for Follow-Up
                                </h3>
                                <div style="font-size:11px; font-weight:700; color:#64748b; background:#e2e8f0; padding:4px 8px; border-radius:12px;">\${dueQuotes ? dueQuotes.length : 0} Quotes</div>
                            </div>
                            <div style="max-height: 250px; overflow-y: auto;">
                                \${globalDueHtml}
                            </div>
                        </div>

                        <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:16px; overflow:hidden; box-shadow:0 10px 25px -5px rgba(0,0,0,0.02);">
                            <div style="padding:16px 20px; border-bottom:1px solid #e2e8f0; background:#f8fafc; display:flex; align-items:center; justify-content:space-between;">
                                <h3 style="margin:0; font-size:13px; font-weight:800; color:#0f172a; display:flex; align-items:center; gap:8px;">
                                    <i class="fas fa-envelope" style="color:#2563eb;"></i> Automated Dispatch Logs
                                </h3>
                                <div style="font-size:11px; font-weight:700; color:#64748b; background:#e2e8f0; padding:4px 8px; border-radius:12px;">Latest 50</div>
                            </div>
                            <div style="max-height: 350px; overflow-y: auto;">
                                \${emailsHtml}
                            </div>
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
    
`;
    content = content.substring(0, startIndex) + replacement + content.substring(endIndex);
    fs.writeFileSync(file, content);
    console.log("Replaced cmd center block successfully!");
} else {
    console.log("Could not find bounds.");
}
