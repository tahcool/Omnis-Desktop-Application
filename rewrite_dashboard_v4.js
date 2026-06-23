const fs = require('fs');
const file = 'C:/Users/Administrator/omnis/systems/salestrack/dashboard_logic.js';
let content = fs.readFileSync(file, 'utf8');

const startStr = "async forceEmailDispatch() {";
const endStr = "        previewManualFollowup(q, event) {";

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
                this.showToast(\`Successfully queued \${res.data.emails_queued || 0} emails.\`, "success");
            } else {
                this.showToast("Dispatch triggered successfully.", "success");
            }
            setTimeout(() => this.openCommandCenter(true), 2000);
        } catch (e) {
            console.error(e);
            this.showToast("Failed to trigger dispatch: " + e.message, "error");
        }
    }

    async openQuoteLifecycleModal(quoteName) {
        this.openListModal("Quote Lifecycle", \`<div style="padding:40px; text-align:center;"><i class="fas fa-spinner fa-spin" style="font-size:24px; color:#4f46e5;"></i></div>\`, "800px");
        
        try {
            const res = await window.electron.invoke('supabase:query', {
                method: 'select',
                table: 'omnis_quote_lifecycle',
                columns: '*, frappe_quotation(name, customer_name, custom_sales_person)',
                filters: { quote_name: quoteName }
            });
            
            if (!res.data || res.data.length === 0) {
                this.openListModal("Quote Lifecycle", \`<div style="padding:40px; color:#ef4444;">Quote lifecycle record not found. Please refresh the dashboard.</div>\`, "600px");
                return;
            }
            
            const q = res.data[0];
            const fq = q.frappe_quotation;
            
            const renderStage = (stageNum, due, loggedAt, notes, lateReason) => {
                const isCurrent = q.current_stage === stageNum && !q.is_closed;
                const isPast = q.current_stage > stageNum || (stageNum === q.current_stage && q.is_closed && loggedAt);
                const isFuture = q.current_stage < stageNum && !q.is_closed;
                
                let statusColor = '#94a3b8';
                let icon = '<i class="fas fa-circle"></i>';
                let contentHtml = '';
                
                if (isPast) {
                    statusColor = '#10b981'; // green
                    icon = '<i class="fas fa-check-circle"></i>';
                    contentHtml = \`
                        <div style="font-size:12px; color:#64748b; margin-top:4px;">Logged on \${new Date(loggedAt).toLocaleDateString()}</div>
                        <div style="font-size:13px; color:#334155; background:#f8fafc; padding:8px; border-radius:6px; margin-top:8px; border:1px solid #e2e8f0;">\${notes || 'No notes provided.'}</div>
                        \${lateReason ? \`<div style="font-size:12px; color:#ef4444; margin-top:4px;"><strong>Late Reason:</strong> \${lateReason}</div>\` : ''}
                    \`;
                } else if (isCurrent) {
                    statusColor = '#3b82f6'; // blue
                    icon = '<i class="fas fa-dot-circle"></i>';
                    
                    const today = new Date().toISOString().split('T')[0];
                    const isLate = today > due;
                    
                    contentHtml = \`
                        <div style="margin-top:12px; background:#f0f9ff; border:1px solid #bae6fd; padding:16px; border-radius:8px;">
                            <textarea id="lifecycle_notes_\${stageNum}" placeholder="Enter follow-up notes..." style="width:100%; min-height:80px; padding:10px; border:1px solid #cbd5e1; border-radius:6px; font-family:inherit; font-size:13px; resize:vertical; margin-bottom:10px;"></textarea>
                            
                            \${isLate ? \`
                                <div style="background:#fef2f2; border:1px solid #fecaca; padding:10px; border-radius:6px; margin-bottom:10px;">
                                    <div style="color:#ef4444; font-size:12px; font-weight:700; margin-bottom:4px;"><i class="fas fa-exclamation-triangle"></i> This follow-up is late. A reason is required.</div>
                                    <input type="text" id="lifecycle_late_reason_\${stageNum}" placeholder="Reason for late entry..." style="width:100%; padding:8px; border:1px solid #fca5a5; border-radius:4px; font-size:13px;">
                                </div>
                            \` : ''}
                            
                            <div style="display:flex; gap:10px;">
                                <button onclick="window.salestrack.submitLifecycleStage('\${quoteName}', \${stageNum}, \${isLate})" style="background:#2563eb; color:white; border:none; padding:8px 16px; border-radius:6px; font-weight:600; cursor:pointer; font-size:13px;">Complete Stage \${stageNum}</button>
                            </div>
                        </div>
                    \`;
                } else if (q.is_closed && stageNum === q.current_stage && !loggedAt) {
                    statusColor = '#ef4444'; // red
                    icon = '<i class="fas fa-times-circle"></i>';
                    contentHtml = \`<div style="font-size:12px; color:#ef4444; margin-top:4px;">Quote closed before this stage.</div>\`;
                }
                
                return \`
                <div style="display:flex; gap:16px; margin-bottom:24px;">
                    <div style="display:flex; flex-direction:column; align-items:center;">
                        <div style="color:\${statusColor}; font-size:24px;">\${icon}</div>
                        \${stageNum < 3 ? \`<div style="width:2px; height:100%; background:#e2e8f0; margin-top:4px; min-height:40px;"></div>\` : ''}
                    </div>
                    <div style="flex:1;">
                        <div style="font-size:15px; font-weight:700; color:#0f172a;">Stage \${stageNum} Follow-Up <span style="font-size:12px; font-weight:600; color:#64748b; margin-left:8px; background:#f1f5f9; padding:2px 8px; border-radius:12px;">Due: \${due}</span></div>
                        \${contentHtml}
                    </div>
                </div>
                \`;
            };
            
            let closingHtml = '';
            if (!q.is_closed) {
                closingHtml = \`
                    <div style="border-top:1px solid #e2e8f0; margin-top:30px; padding-top:20px;">
                        <h4 style="margin:0 0 10px 0; font-size:14px; color:#0f172a;">Close Quotation</h4>
                        <div style="display:flex; gap:10px; align-items:center;">
                            <select id="lifecycle_close_reason" style="padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; width:200px;">
                                <option value="">Select Closing Reason...</option>
                                <option value="Tire Kicker">Tire Kicker</option>
                                <option value="No Funding">No Funding</option>
                                <option value="Lost Sale">Lost Sale (Bought Elsewhere)</option>
                            </select>
                            <input type="text" id="lifecycle_close_notes" placeholder="Additional Notes..." style="flex:1; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px;">
                            <button onclick="window.salestrack.markQuoteClosed('\${quoteName}')" style="background:#ef4444; color:white; border:none; padding:8px 16px; border-radius:6px; font-weight:600; cursor:pointer; font-size:13px;">Mark as Closed</button>
                        </div>
                    </div>
                \`;
            } else {
                let badgeColor = q.manager_signoff_status === 'approved' ? '#10b981' : (q.manager_signoff_status === 'rejected' ? '#ef4444' : '#f59e0b');
                closingHtml = \`
                    <div style="background:#fef2f2; border:1px solid #fecaca; border-radius:8px; padding:16px; margin-top:20px;">
                        <h4 style="margin:0 0 8px 0; color:#991b1b; font-size:14px;"><i class="fas fa-lock"></i> Quotation Closed</h4>
                        <div style="font-size:13px; color:#7f1d1d; margin-bottom:4px;"><strong>Reason:</strong> \${q.closing_reason}</div>
                        <div style="font-size:13px; color:#7f1d1d; margin-bottom:12px;"><strong>Manager Status:</strong> <span style="background:\${badgeColor}20; color:\${badgeColor}; padding:2px 8px; border-radius:12px; font-size:11px; font-weight:700; text-transform:uppercase;">\${q.manager_signoff_status}</span></div>
                        \${q.manager_notes ? \`<div style="font-size:13px; color:#7f1d1d; background:#fff; padding:8px; border-radius:4px;"><strong>Manager Notes:</strong> \${q.manager_notes}</div>\` : ''}
                    </div>
                \`;
            }

            const html = \`
                <div style="padding:20px; font-family:'Inter', sans-serif;">
                    <div style="margin-bottom:24px; border-bottom:1px solid #e2e8f0; padding-bottom:16px;">
                        <div style="font-size:20px; font-weight:800; color:#0f172a;">\${quoteName}</div>
                        <div style="font-size:14px; color:#64748b; margin-top:4px;">Customer: <strong>\${fq ? fq.customer_name : 'Unknown'}</strong> | Rep: <strong>\${fq ? fq.custom_sales_person : 'Unknown'}</strong></div>
                    </div>
                    
                    <div style="padding:10px;">
                        \${renderStage(1, q.stage_1_due, q.stage_1_logged_at, q.stage_1_notes, q.stage_1_late_reason)}
                        \${renderStage(2, q.stage_2_due, q.stage_2_logged_at, q.stage_2_notes, q.stage_2_late_reason)}
                        \${renderStage(3, q.stage_3_due, q.stage_3_logged_at, q.stage_3_notes, q.stage_3_late_reason)}
                    </div>
                    
                    \${closingHtml}
                </div>
            \`;
            
            this.openListModal(\`Lifecycle: \${quoteName}\`, html, "700px");
        } catch (e) {
            console.error(e);
            this.openListModal("Error", "Failed to load lifecycle: " + e.message, "500px");
        }
    }

    async submitLifecycleStage(quoteName, stageNum, requiresLateReason) {
        const notes = document.getElementById(\`lifecycle_notes_\${stageNum}\`).value;
        if (!notes.trim()) {
            this.showToast("Follow-up notes are required.", "error");
            return;
        }
        
        let lateReason = null;
        if (requiresLateReason) {
            lateReason = document.getElementById(\`lifecycle_late_reason_\${stageNum}\`).value;
            if (!lateReason.trim()) {
                this.showToast("This entry is late. A late reason is required.", "error");
                return;
            }
        }
        
        const now = new Date().toISOString();
        const updateData = { current_stage: stageNum < 3 ? stageNum + 1 : 3 };
        updateData[\`stage_\${stageNum}_logged_at\`] = now;
        updateData[\`stage_\${stageNum}_notes\`] = notes;
        if (lateReason) updateData[\`stage_\${stageNum}_late_reason\`] = lateReason;
        
        try {
            await window.electron.invoke('supabase:query', {
                method: 'update',
                table: 'omnis_quote_lifecycle',
                data: updateData,
                match: { quote_name: quoteName }
            });
            this.showToast(\`Stage \${stageNum} completed successfully!\`, "success");
            this.openQuoteLifecycleModal(quoteName); // refresh
        } catch (e) {
            console.error(e);
            this.showToast("Failed to save: " + e.message, "error");
        }
    }

    async markQuoteClosed(quoteName) {
        const reason = document.getElementById('lifecycle_close_reason').value;
        const notes = document.getElementById('lifecycle_close_notes').value;
        
        if (!reason) {
            this.showToast("Please select a closing reason.", "error");
            return;
        }
        if (!notes.trim()) {
            this.showToast("Additional notes are required when closing a quote.", "error");
            return;
        }
        
        try {
            await window.electron.invoke('supabase:query', {
                method: 'update',
                table: 'omnis_quote_lifecycle',
                data: {
                    is_closed: true,
                    closing_reason: reason,
                    manager_notes: notes, // Temp store notes here until manager reviews
                    manager_signoff_status: 'pending'
                },
                match: { quote_name: quoteName }
            });
            this.showToast("Quote marked as closed. Pending manager approval.", "success");
            this.openQuoteLifecycleModal(quoteName);
        } catch (e) {
            console.error(e);
            this.showToast("Failed to close quote: " + e.message, "error");
        }
    }

    async approveManagerSignoff(quoteName, status) {
        try {
            await window.electron.invoke('supabase:query', {
                method: 'update',
                table: 'omnis_quote_lifecycle',
                data: {
                    manager_signoff_status: status,
                    is_closed: status === 'approved' // If rejected, it re-opens
                },
                match: { quote_name: quoteName }
            });
            this.showToast(\`Quote \${status} successfully.\`, "success");
            this.openCommandCenter(true); // refresh full dashboard
        } catch (e) {
            this.showToast("Failed to update status: " + e.message, "error");
        }
    }

    openRepProfile(repName) {
        if (!this.cachedCommandCenterData) return;
        const quotes = this.cachedCommandCenterData.quotes || [];
        const dueQuotes = this.cachedCommandCenterData.dueQuotes || [];
        
        const repQuotes = quotes.filter(q => (q.frappe_quotation && q.frappe_quotation.custom_sales_person === repName));
        const repDue = dueQuotes.filter(q => (q.frappe_quotation && q.frappe_quotation.custom_sales_person === repName));
        
        let total = repQuotes.length;
        // Count how many have passed stage 1 as 'logged'
        let logged = repQuotes.filter(q => q.current_stage > 1 || (q.current_stage === 1 && q.is_closed)).length;
        let rate = total > 0 ? Math.round((logged / total) * 100) : 0;
        
        let color = rate >= 80 ? '#10b981' : (rate >= 50 ? '#f59e0b' : '#ef4444');
        
        let dueHtml = \`<div style="color:#64748b; font-size:14px; text-align:center; padding:20px;">No quotes are currently past due for this representative.</div>\`;
        
        if (repDue.length > 0) {
            dueHtml = \`<table style="width:100%; border-collapse:collapse; margin-top:10px; font-size:13px;">
                <thead>
                    <tr style="border-bottom:2px solid #e2e8f0; color:#475569; text-transform:uppercase; font-size:11px;">
                        <th style="padding:10px; text-align:left;">Quote</th>
                        <th style="padding:10px; text-align:left;">Customer</th>
                        <th style="padding:10px; text-align:left;">Stage</th>
                        <th style="padding:10px; text-align:left;">Due Date</th>
                    </tr>
                </thead>
                <tbody>
                    \${repDue.map(q => {
                        let dueStr = q.current_stage === 1 ? q.stage_1_due : (q.current_stage === 2 ? q.stage_2_due : q.stage_3_due);
                        return \`<tr style="border-bottom:1px solid #f1f5f9; cursor:pointer;" onclick="window.salestrack.openQuoteLifecycleModal('\${q.quote_name}')" onmouseover="this.style.backgroundColor='#f8fafc'" onmouseout="this.style.backgroundColor='transparent'">
                            <td style="padding:12px 10px; color:#2563eb; font-weight:600;">\${q.quote_name}</td>
                            <td style="padding:12px 10px; color:#334155;">\${q.frappe_quotation ? q.frappe_quotation.customer_name : '-'}</td>
                            <td style="padding:12px 10px; color:#0f172a; font-weight:600;">Stage \${q.current_stage}</td>
                            <td style="padding:12px 10px; color:#ef4444; font-weight:700;">\${dueStr}</td>
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
            this.openListModal("Follow-up Analytics", \`<div style="padding:40px; text-align:center;"><i class="fas fa-spinner fa-spin" style="font-size:24px; color:#4f46e5;"></i></div>\`, "1200px");
        } else {
            const fullCont = document.getElementById('command-center-full-container');
            if (fullCont) fullCont.innerHTML = \`<div style="padding:100px; text-align:center;"><i class="fas fa-spinner fa-spin" style="font-size:32px; color:#4f46e5;"></i></div>\`;
        }

        try {
            // Fetch Lifecycle quotes
            let lifecycleRes = await window.electron.invoke('supabase:query', {
                method: 'select',
                table: 'omnis_quote_lifecycle',
                columns: '*, frappe_quotation(name, custom_sales_person, customer_name, transaction_date)',
                limit: 5000
            });
            let allQuotes = lifecycleRes.data || [];
            
            const todayStr = new Date().toISOString().split('T')[0];

            let quotes = allQuotes.filter(q => q.frappe_quotation); // Only valid joins
            
            // Due quotes: not closed, and current stage due date <= today
            let dueQuotes = quotes.filter(q => {
                if (q.is_closed) return false;
                let due = q.current_stage === 1 ? q.stage_1_due : (q.current_stage === 2 ? q.stage_2_due : q.stage_3_due);
                return due <= todayStr;
            });
            dueQuotes.sort((a,b) => {
                let aDue = a.current_stage === 1 ? a.stage_1_due : (a.current_stage === 2 ? a.stage_2_due : a.stage_3_due);
                let bDue = b.current_stage === 1 ? b.stage_1_due : (b.current_stage === 2 ? b.stage_2_due : b.stage_3_due);
                return aDue < bDue ? -1 : 1;
            });

            // Manager Approvals: closed, pending manager signoff
            let pendingApprovals = quotes.filter(q => q.is_closed && q.manager_signoff_status === 'pending');

            // 2. Fetch recent dispatch logs
            let emailsRes = await window.electron.invoke('supabase:query', {
                method: 'select',
                table: 'omnis_email_queue',
                columns: 'id, to_email, subject, status, created_at, related_type',
                limit: 50,
                order: { column: 'created_at', ascending: false }
            });
            let emails = (emailsRes.data || []).filter(e => e.related_type === 'quotation_reminder');

            this.cachedCommandCenterData = { quotes, emails, dueQuotes, pendingApprovals };
            this.renderCommandCenter(this.cachedCommandCenterData, isFullView);
        } catch (e) {
            console.error(e);
            if (!isFullView) {
                this.openListModal("Error", e.message, "500px");
            } else {
                document.getElementById('command-center-full-container').innerHTML = \`<div style="color:red; padding:40px;">\${e.message}</div>\`;
            }
        }
    }

    renderCommandCenter(data, isFullView = false) {
        const { quotes, emails, dueQuotes, pendingApprovals } = data;
        
        let totalQuotes = quotes.length;
        // Compliance: any quote that has logged at least stage 1 or is legitimately closed
        let loggedFollowups = quotes.filter(q => q.current_stage > 1 || q.is_closed).length;
        let complianceRate = totalQuotes > 0 ? Math.round((loggedFollowups / totalQuotes) * 100) : 0;

        let repStats = {};
        quotes.forEach(q => {
            const rep = q.frappe_quotation.custom_sales_person || "Unassigned";
            if (!repStats[rep]) repStats[rep] = { total: 0, logged: 0 };
            repStats[rep].total++;
            if (q.current_stage > 1 || q.is_closed) {
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
                return bRate - aRate;
            }).join('');
            
        let globalDueHtml = \`<div style="color:#94a3b8; font-size:14px; text-align:center; padding:30px;">No quotes are currently due for follow-up!</div>\`;
        if (dueQuotes && dueQuotes.length > 0) {
            globalDueHtml = \`<table style="width:100%; border-collapse:collapse; font-size:13px;">
                <thead>
                    <tr style="border-bottom:2px solid #e2e8f0; color:#475569; text-transform:uppercase; font-size:11px;">
                        <th style="padding:10px; text-align:left;">Quote</th>
                        <th style="padding:10px; text-align:left;">Rep</th>
                        <th style="padding:10px; text-align:left;">Stage</th>
                        <th style="padding:10px; text-align:left;">Due Date</th>
                    </tr>
                </thead>
                <tbody>
                    \${dueQuotes.slice(0, 15).map(q => {
                        let due = q.current_stage === 1 ? q.stage_1_due : (q.current_stage === 2 ? q.stage_2_due : q.stage_3_due);
                        return \`<tr style="border-bottom:1px solid #f1f5f9; cursor:pointer;" onclick="window.salestrack.openQuoteLifecycleModal('\${q.quote_name}')" onmouseover="this.style.backgroundColor='#f8fafc'" onmouseout="this.style.backgroundColor='transparent'">
                            <td style="padding:12px 10px; color:#2563eb; font-weight:600;">\${q.quote_name}</td>
                            <td style="padding:12px 10px; color:#334155; font-weight:500;">\${q.frappe_quotation.custom_sales_person || '-'}</td>
                            <td style="padding:12px 10px; color:#0f172a; font-weight:600;">Stage \${q.current_stage}</td>
                            <td style="padding:12px 10px; color:#ef4444; font-weight:700;">\${due}</td>
                        </tr>\`
                    }).join('')}
                </tbody>
            </table>\`;
        }

        let pendingApprovalsHtml = '';
        if (pendingApprovals && pendingApprovals.length > 0) {
            pendingApprovalsHtml = \`<div style="background:#fff7ed; border:1px solid #fdba74; border-radius:16px; padding:24px; box-shadow:0 10px 25px -5px rgba(0,0,0,0.02); margin-top:24px;">
                <h3 style="margin:0 0 15px 0; font-size:13px; font-weight:800; color:#c2410c; display:flex; align-items:center; gap:8px;">
                    <i class="fas fa-user-shield"></i> Manager Sign-offs Required (\${pendingApprovals.length})
                </h3>
                <table style="width:100%; border-collapse:collapse; font-size:13px;">
                    <tbody>
                        \${pendingApprovals.map(q => \`
                        <tr style="border-bottom:1px solid #fed7aa;">
                            <td style="padding:12px 10px;">
                                <div style="font-weight:700; color:#c2410c; cursor:pointer;" onclick="window.salestrack.openQuoteLifecycleModal('\${q.quote_name}')">\${q.quote_name}</div>
                                <div style="font-size:11px; color:#ea580c; margin-top:4px;">\${q.closing_reason}</div>
                            </td>
                            <td style="padding:12px 10px;">
                                <div style="font-size:12px; color:#c2410c;">\${q.manager_notes || '-'}</div>
                            </td>
                            <td style="padding:12px 10px; text-align:right;">
                                <button onclick="window.salestrack.approveManagerSignoff('\${q.quote_name}', 'approved')" style="background:#10b981; color:white; border:none; padding:6px 12px; border-radius:4px; font-size:11px; font-weight:700; cursor:pointer; margin-right:5px;">APPROVE</button>
                                <button onclick="window.salestrack.approveManagerSignoff('\${q.quote_name}', 'rejected')" style="background:#ef4444; color:white; border:none; padding:6px 12px; border-radius:4px; font-size:11px; font-weight:700; cursor:pointer;">REJECT</button>
                            </td>
                        </tr>
                        \`).join('')}
                    </tbody>
                </table>
            </div>\`;
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
                            <h2 style="margin:0; font-size:24px; font-weight:800; color:#0f172a; letter-spacing:-0.5px;">Quote Lifecycle Analytics</h2>
                            <div style="font-size:13px; color:#64748b; margin-top:2px;">Monitor 3-7-21 day follow-up compliance and sign-offs.</div>
                        </div>
                    </div>
                    <div style="display:flex; gap:10px;">
                        <button onclick="window.salestrack.forceEmailDispatch()" style="background:#2563eb; color:#ffffff; border:none; padding:10px 16px; border-radius:8px; font-weight:700; cursor:pointer; font-size:13px; box-shadow:0 4px 6px -1px rgba(37,99,235,0.2);"><i class="fas fa-paper-plane" style="margin-right:6px;"></i> FORCE DISPATCH</button>
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
                                    <div style="font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:0.5px;">Quotes Handled</div>
                                    <div style="font-size:14px; font-weight:600; color:#0f172a; margin-top:4px;">\${loggedFollowups} <span style="color:#94a3b8; font-weight:400;">/ \${totalQuotes} Active</span></div>
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
                        </div>
                        
                        \${pendingApprovalsHtml}
                    </div>

                    <div style="display:flex; flex-direction:column; gap:24px;">
                        <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:16px; overflow:hidden; box-shadow:0 10px 25px -5px rgba(0,0,0,0.02);">
                            <div style="padding:16px 20px; border-bottom:1px solid #e2e8f0; background:#fef2f2; display:flex; align-items:center; justify-content:space-between;">
                                <h3 style="margin:0; font-size:13px; font-weight:800; color:#991b1b; display:flex; align-items:center; gap:8px;">
                                    <i class="fas fa-clock" style="color:#ef4444;"></i> Global Due for Follow-Up
                                </h3>
                                <div style="font-size:11px; font-weight:800; color:#ef4444; background:#fee2e2; padding:4px 8px; border-radius:12px;">\${dueQuotes ? dueQuotes.length : 0} Quotes Due</div>
                            </div>
                            <div style="max-height: 350px; overflow-y: auto;">
                                \${globalDueHtml}
                            </div>
                        </div>

                        <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:16px; overflow:hidden; box-shadow:0 10px 25px -5px rgba(0,0,0,0.02);">
                            <div style="padding:16px 20px; border-bottom:1px solid #e2e8f0; background:#f8fafc; display:flex; align-items:center; justify-content:space-between;">
                                <h3 style="margin:0; font-size:13px; font-weight:800; color:#0f172a; display:flex; align-items:center; gap:8px;">
                                    <i class="fas fa-envelope" style="color:#2563eb;"></i> Automated Dispatch Logs
                                </h3>
                            </div>
                            <div style="max-height: 250px; overflow-y: auto;">
                                \${emailsHtml}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        \`;

        if (!isFullView) {
            this.openListModal("Quote Lifecycle Analytics", html, "1200px");
        } else {
            const fullCont = document.getElementById('command-center-full-container');
            if (fullCont) fullCont.innerHTML = html;
        }
    }
`;

    content = content.substring(0, startIndex) + replacement + content.substring(endIndex);
    fs.writeFileSync(file, content);
    console.log("Rewrote dashboard logic successfully!");
} else {
    console.log("Could not find start/end bounds.");
}
