const fs = require('fs');

const file = 'C:/Users/Administrator/omnis/systems/salestrack/dashboard_logic.js';
const content = fs.readFileSync(file, 'utf8');
const targetText = fs.readFileSync('C:/Users/Administrator/omnis/temp_extract.txt', 'utf8');

// Notice that targetText might have a trailing newline or similar differences, let's just search for it directly.
// First trim to be safe if there's minor whitespace differences at the ends
let targetStr = targetText.replace(/^\\n+|\\n+$/g, '');

const newHtmlTemplate = \`        // Pre-calculate data for charts & KPIs
        const totalActive = quotes.length;
        const totalDue = dueQuotes.length;
        const pendingCount = pendingApprovals ? pendingApprovals.length : 0;
        
        let stage1Count = quotes.filter(q => q.current_stage === 1 && !q.is_closed).length;
        let stage2Count = quotes.filter(q => q.current_stage === 2 && !q.is_closed).length;
        let stage3Count = quotes.filter(q => q.current_stage === 3 && !q.is_closed).length;
        
        let complianceColor = complianceRate >= 80 ? '#10b981' : (complianceRate >= 50 ? '#f59e0b' : '#ef4444');

        const html = \\\`
            <div class="command-center-container" style="padding:20px; font-family:'Inter', sans-serif;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
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
                        <button onclick="window.salestrack.openCommandCenter(\\\${isFullView})" style="background:#f1f5f9; color:#475569; border:none; padding:10px 16px; border-radius:8px; font-weight:700; cursor:pointer; font-size:13px;"><i class="fas fa-sync-alt" style="margin-right:6px;"></i> REFRESH</button>
                    </div>
                </div>

                <!-- KPI Cards Row -->
                <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:20px; margin-bottom:24px;">
                    <!-- Total Active -->
                    <div style="background:rgba(255,255,255,0.8); backdrop-filter:blur(10px); border:1px solid #e2e8f0; border-radius:16px; padding:20px; box-shadow:0 4px 6px -1px rgba(0,0,0,0.02); display:flex; align-items:center; gap:16px;">
                        <div style="width:56px; height:56px; border-radius:12px; background:#eff6ff; color:#3b82f6; display:flex; align-items:center; justify-content:center; font-size:24px;">
                            <i class="fas fa-file-invoice-dollar"></i>
                        </div>
                        <div>
                            <div style="font-size:12px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.5px;">Total Active Quotes</div>
                            <div style="font-size:28px; font-weight:800; color:#0f172a; margin-top:2px;">\\\${totalActive}</div>
                        </div>
                    </div>
                    
                    <!-- Due Right Now -->
                    <div style="background:rgba(255,255,255,0.8); backdrop-filter:blur(10px); border:1px solid #e2e8f0; border-radius:16px; padding:20px; box-shadow:0 4px 6px -1px rgba(0,0,0,0.02); display:flex; align-items:center; gap:16px;">
                        <div style="width:56px; height:56px; border-radius:12px; background:#fef2f2; color:#ef4444; display:flex; align-items:center; justify-content:center; font-size:24px;">
                            <i class="fas fa-clock"></i>
                        </div>
                        <div>
                            <div style="font-size:12px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.5px;">Due For Follow-Up</div>
                            <div style="font-size:28px; font-weight:800; color:#ef4444; margin-top:2px;">\\\${totalDue}</div>
                        </div>
                    </div>

                    <!-- Pending Sign-offs -->
                    <div style="background:rgba(255,255,255,0.8); backdrop-filter:blur(10px); border:1px solid #e2e8f0; border-radius:16px; padding:20px; box-shadow:0 4px 6px -1px rgba(0,0,0,0.02); display:flex; align-items:center; gap:16px;">
                        <div style="width:56px; height:56px; border-radius:12px; background:#fff7ed; color:#f97316; display:flex; align-items:center; justify-content:center; font-size:24px;">
                            <i class="fas fa-user-shield"></i>
                        </div>
                        <div>
                            <div style="font-size:12px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.5px;">Pending Sign-offs</div>
                            <div style="font-size:28px; font-weight:800; color:#c2410c; margin-top:2px;">\\\${pendingCount}</div>
                        </div>
                    </div>
                </div>

                <!-- Charts Row -->
                <div style="display:grid; grid-template-columns: 1fr 2fr; gap:24px; margin-bottom:24px;">
                    <!-- Compliance Chart -->
                    <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:16px; padding:24px; box-shadow:0 10px 25px -5px rgba(0,0,0,0.02);">
                        <h3 style="margin:0 0 16px 0; font-size:14px; font-weight:800; color:#0f172a; text-transform:uppercase; letter-spacing:0.5px;">Overall Compliance</h3>
                        <div id="lifecycle_compliance_chart" style="min-height:220px; display:flex; align-items:center; justify-content:center;"></div>
                    </div>

                    <!-- Stages Breakdown Chart -->
                    <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:16px; padding:24px; box-shadow:0 10px 25px -5px rgba(0,0,0,0.02);">
                        <h3 style="margin:0 0 16px 0; font-size:14px; font-weight:800; color:#0f172a; text-transform:uppercase; letter-spacing:0.5px;">Active Quotes by Stage</h3>
                        <div id="lifecycle_stages_chart" style="min-height:220px;"></div>
                    </div>
                </div>

                <!-- Data Grid Row -->
                <div style="display:grid; grid-template-columns: 1fr 2fr; gap:24px;">
                    
                    <div style="display:flex; flex-direction:column; gap:24px;">
                        <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:16px; padding:24px; box-shadow:0 10px 25px -5px rgba(0,0,0,0.02);">
                            <h3 style="margin:0 0 20px 0; font-size:14px; font-weight:800; color:#0f172a; text-transform:uppercase; letter-spacing:0.5px;">Sales Team Leaderboard</h3>
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
                                    \\\${leaderboardHtml}
                                </tbody>
                            </table>
                        </div>
                        \\\${pendingApprovalsHtml}
                    </div>

                    <div style="display:flex; flex-direction:column; gap:24px;">
                        <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:16px; overflow:hidden; box-shadow:0 10px 25px -5px rgba(0,0,0,0.02);">
                            <div style="padding:16px 20px; border-bottom:1px solid #e2e8f0; background:#fef2f2; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px;">
                                <h3 style="margin:0; font-size:13px; font-weight:800; color:#991b1b; display:flex; align-items:center; gap:8px;">
                                    <i class="fas fa-clock" style="color:#ef4444;"></i> Global Due for Follow-Up
                                </h3>
                                <div style="display:flex; gap:10px; align-items:center;">
                                    <select id="cc_filter_company" onchange="window.salestrack.applyCommandCenterFilters()" style="padding:4px 8px; border:1px solid #fca5a5; border-radius:4px; font-size:11px; outline:none; background:white;">
                                        <option value="">All Companies</option>
                                        <option value="Sinopower">Sinopower</option>
                                        <option value="Machinery Exchange">Machinery Exchange</option>
                                    </select>
                                    <input type="date" id="cc_filter_date_from" onchange="window.salestrack.applyCommandCenterFilters()" style="padding:3px 8px; border:1px solid #fca5a5; border-radius:4px; font-size:11px; outline:none; background:white;" title="From Date">
                                    <input type="date" id="cc_filter_date_to" onchange="window.salestrack.applyCommandCenterFilters()" style="padding:3px 8px; border:1px solid #fca5a5; border-radius:4px; font-size:11px; outline:none; background:white;" title="To Date">
                                    <div id="cc_due_count_badge" style="font-size:11px; font-weight:800; color:#ef4444; background:#fee2e2; padding:4px 8px; border-radius:12px; margin-left:10px;">\\\${dueQuotes ? dueQuotes.length : 0} Quotes Due</div>
                                </div>
                            </div>
                            <div id="cc_global_due_container" style="max-height: 450px; overflow-y: auto;">
                                \\\${globalDueHtml}
                            </div>
                        </div>

                        <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:16px; overflow:hidden; box-shadow:0 10px 25px -5px rgba(0,0,0,0.02);">
                            <div style="padding:16px 20px; border-bottom:1px solid #e2e8f0; background:#f8fafc; display:flex; align-items:center; justify-content:space-between;">
                                <h3 style="margin:0; font-size:13px; font-weight:800; color:#0f172a; display:flex; align-items:center; gap:8px;">
                                    <i class="fas fa-envelope" style="color:#2563eb;"></i> Automated Dispatch Logs
                                </h3>
                            </div>
                            <div style="max-height: 350px; overflow-y: auto;">
                                \\\${emailsHtml}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        \\\`;
        
        setTimeout(() => {
            if (window.ApexCharts) {
                const donutOptions = {
                    series: [\\\${complianceRate}, \\\${100 - complianceRate}],
                    labels: ['Logged', 'Unlogged'],
                    chart: { type: 'donut', height: 250 },
                    colors: ['\\\${complianceColor}', '#e2e8f0'],
                    plotOptions: {
                        pie: { donut: { size: '75%', labels: { show: true, name: { show: false }, value: { show: true, fontSize: '24px', fontWeight: 800, color: '#0f172a', formatter: function (val) { return val + "%" } } } } }
                    },
                    dataLabels: { enabled: false },
                    legend: { show: false },
                    stroke: { width: 0 }
                };
                new window.ApexCharts(document.querySelector("#lifecycle_compliance_chart"), donutOptions).render();
                
                const barOptions = {
                    series: [{ name: 'Active Quotes', data: [\\\${stage1Count}, \\\${stage2Count}, \\\${stage3Count}] }],
                    chart: { type: 'bar', height: 220, toolbar: { show: false } },
                    plotOptions: { bar: { borderRadius: 6, horizontal: true, distributed: true, dataLabels: { position: 'right' } } },
                    colors: ['#3b82f6', '#8b5cf6', '#ec4899'],
                    dataLabels: { enabled: true, textAnchor: 'start', style: { colors: ['#0f172a'] }, formatter: function (val) { return val }, offsetX: 0 },
                    xaxis: { categories: ['Stage 1 (3-Day)', 'Stage 2 (7-Day)', 'Stage 3 (21-Day)'], labels: { show: false }, axisBorder: { show: false }, axisTicks: { show: false } },
                    yaxis: { labels: { style: { fontSize: '12px', fontWeight: 600, colors: '#475569' } } },
                    grid: { show: false },
                    legend: { show: false }
                };
                new window.ApexCharts(document.querySelector("#lifecycle_stages_chart"), barOptions).render();
            }
        }, 100);\`;

if (!content.includes(targetStr)) {
    console.error("Could not find the target string exactly!");
    process.exit(1);
}

const newContent = content.replace(targetStr, newHtmlTemplate);
fs.writeFileSync(file, newContent);
console.log("Successfully rebuilt the HTML using the exact extracted match.");
