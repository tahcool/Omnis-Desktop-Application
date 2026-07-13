/**
 * Unified Timeline Kanban Board
 * Categorizes Orders, Quotes, Trainings, and Stock Pipeline into time-based columns.
 */

window.DashboardTimeline = (function() {
    let _events = [];
    let currentCompanyFilter = "ALL";
    let hiddenCategories = new Set();

    const COLORS = {
        order: { bg: '#e0f2fe', text: '#0284c7', border: '#bae6fd', icon: 'fa-truck' },
        quote: { bg: '#fef3c7', text: '#d97706', border: '#fde68a', icon: 'fa-file-invoice-dollar' },
        training: { bg: '#dcfce7', text: '#16a34a', border: '#bbf7d0', icon: 'fa-graduation-cap' },
        stock: { bg: '#f3e8ff', text: '#9333ea', border: '#e9d5ff', icon: 'fa-box' }
    };

    async function loadEvents() {
        try {
            const rawEvents = [];

            // 1. Fetch Orders (Target Handover)
            try {
                if (window.electron) {
                    const orderRes = await window.electron.invoke('supabase:query', {
                        table: 'omnis_tracking_orders', method: 'select'
                    });
                    if (orderRes.ok && orderRes.data) {
                        orderRes.data.forEach(o => {
                            if (o.target_handover) {
                                rawEvents.push({
                                    type: 'order',
                                    date: new Date(o.target_handover),
                                    title: `Delivery: ${o.item_name || o.machine || o.machine_model || o.linked_sale_name || 'Machine'}`,
                                    customer: o.customer || o.customer_name || 'N/A',
                                    desc: `Handover Target`,
                                    raw: o
                                });
                            }
                        });
                    }
                }
            } catch (err) { console.error("Error fetching orders:", err); }

            // 2. Fetch Quotes (Next Follow Up)
            try {
                if (window.electron) {
                    const qRes = await window.electron.invoke('supabase:query', {
                        table: 'omnis_quote_lifecycle', method: 'select',
                        params: { columns: '*, frappe_quotation(name, customer_name, transaction_date)' }
                    });
                    if (qRes.ok && qRes.data) {
                        qRes.data.forEach(q => {
                            const fq = q.frappe_quotation || {};
                            if (q.next_follow_up) {
                                rawEvents.push({
                                    type: 'quote',
                                    date: new Date(q.next_follow_up),
                                    title: `Follow Up: ${q.quote_name || fq.name || 'Unknown'}`,
                                    customer: fq.customer_name || 'N/A',
                                    desc: `Status: ${q.status || 'Active'}`,
                                    raw: q
                                });
                            }
                        });
                    }
                }
            } catch (err) { console.error("Error fetching quotes:", err); }

            // 3. Fetch Stock Pipeline (ETAs)
            const baseUrl = (window.CURRENT_SYSTEM && window.CURRENT_SYSTEM.baseUrl) ? window.CURRENT_SYSTEM.baseUrl.replace(/\/$/, '') : 'https://fleetrack.machinery-exchange.com';
            try {
                if (window.callFrappeSequenced && baseUrl) {
                    const stockRes = await window.callFrappeSequenced(baseUrl, "powerstar_salestrack.omnis_dashboard.get_stock_pipeline", {});
                    const stockData = stockRes?.data || stockRes?.message?.data || [];
                    stockData.forEach(s => {
                        const etaDateStr = s.eta_site || s.eta_port || s.target_eta || s.eta || s.creation; 
                        if (etaDateStr) {
                            rawEvents.push({
                                type: 'stock',
                                date: new Date(etaDateStr),
                                title: `Stock Pipeline: ${s.item_name || s.machine_model || s.machine || s.name}`,
                                customer: 'Internal Stock',
                                desc: `Status: ${s.status || 'Transit'}`,
                                raw: s
                            });
                        }
                    });
                }
            } catch (err) { console.error("Error fetching stock:", err); }

            // 4. Fetch Trainings 
            try {
                if (window.callFrappeSequenced && baseUrl) {
                    const fmbRes = await window.callFrappeSequenced(baseUrl, "powerstar_salestrack.omnis_dashboard.get_all_fmb_reports_omnis", { limit: 500 });
                    let fmbData = [];
                    if (fmbRes && fmbRes.message) fmbData = fmbRes.message.rows || fmbRes.message.reports || [];
                    else if (Array.isArray(fmbRes)) fmbData = fmbRes;
                    
                    fmbData.forEach(r => {
                        if (r.training_date) {
                            rawEvents.push({
                                type: 'training',
                                date: new Date(r.training_date),
                                title: `Training: ${r.machine_id || r.item_name || 'Machine'}`,
                                customer: r.customer || r.company || 'N/A',
                                desc: `Operator Training`,
                                raw: r
                            });
                        }
                    });
                }
            } catch (err) { console.error("Error fetching trainings:", err); }

            _events = rawEvents.filter(e => !isNaN(e.date.getTime()));
            _events.sort((a, b) => a.date - b.date); // Sort chronologically

            renderKanban();

        } catch (e) {
            console.error("[DashboardTimeline] Error loading events:", e);
        }
    }

    function setCompanyFilter(val) {
        currentCompanyFilter = val;
        renderKanban();
    }

        function toggleCategory(cat) {
        if (hiddenCategories.has(cat)) {
            hiddenCategories.delete(cat);
            document.getElementById('kb-leg-' + cat).style.background = COLORS[cat].text;
            document.getElementById('kb-leg-txt-' + cat).style.opacity = '1';
        } else {
            hiddenCategories.add(cat);
            document.getElementById('kb-leg-' + cat).style.background = '#e2e8f0';
            document.getElementById('kb-leg-txt-' + cat).style.opacity = '0.5';
        }
        renderKanban();
    }

    function renderKanban() {
        const columns = {
            overdue: document.getElementById('dash-kb-overdue'),
            thisWeek: document.getElementById('dash-kb-this-week'),
            nextWeek: document.getElementById('dash-kb-next-week'),
            later: document.getElementById('dash-kb-later')
        };
        
        // Ensure all containers exist
        for(let key in columns) {
            if(!columns[key]) return;
            columns[key].innerHTML = ''; // Clear columns
        }

        const now = new Date();
        now.setHours(0,0,0,0); // Start of today
        
        const endOfToday = new Date(now);
        endOfToday.setHours(23,59,59,999);

        // This week ends in 7 days
        const endOfThisWeek = new Date(now);
        endOfThisWeek.setDate(endOfThisWeek.getDate() + 7);
        endOfThisWeek.setHours(23,59,59,999);

        // Next week ends in 14 days
        const endOfNextWeek = new Date(now);
        endOfNextWeek.setDate(endOfNextWeek.getDate() + 14);
        endOfNextWeek.setHours(23,59,59,999);

        let eventsByCol = { overdue: [], thisWeek: [], nextWeek: [], later: [] };

        _events.forEach(e => {
            if (hiddenCategories.has(e.type)) return;

            if (currentCompanyFilter !== "ALL") {
                const rawStr = JSON.stringify(e.raw).toLowerCase();
                const isSino = rawStr.includes("sinopower") || rawStr.includes("spz") || rawStr.includes("sino power");
                const isMxg = rawStr.includes("machinery exchange") || rawStr.includes("mxg") || rawStr.includes("machinery");

                if (currentCompanyFilter === "SinoPower" && !isSino) return;
                if (currentCompanyFilter === "Machinery Exchange" && !isMxg) return;
            }

            const eDate = new Date(e.date);
            eDate.setHours(0,0,0,0);

            let colId = '';
            if (eDate < now) {
                colId = 'overdue';
            } else if (eDate <= endOfThisWeek) {
                colId = 'thisWeek';
            } else if (eDate <= endOfNextWeek) {
                colId = 'nextWeek';
            } else {
                colId = 'later';
            }

            eventsByCol[colId].push(e);
        });

        // Update headers with counts
        document.getElementById('dash-kb-overdue-count').textContent = eventsByCol.overdue.length;
        document.getElementById('dash-kb-this-week-count').textContent = eventsByCol.thisWeek.length;
        document.getElementById('dash-kb-next-week-count').textContent = eventsByCol.nextWeek.length;
        document.getElementById('dash-kb-later-count').textContent = eventsByCol.later.length;

        // Fill empty states or render cards
        for(let key in columns) {
            const colEvents = eventsByCol[key];
            const total = colEvents.length;

            if(total === 0) {
                columns[key].innerHTML = `
                <div style="padding:20px; text-align:center; border:2px dashed #f1f5f9; border-radius:12px; margin-top:10px;">
                    <i class="fas fa-check-circle" style="color:#cbd5e1; font-size:20px; margin-bottom:8px;"></i>
                    <div style="font-size:11px; font-weight:700; color:#94a3b8;">All caught up!</div>
                </div>`;
            } else {
                let html = '';
                const initialCount = 3;
                const initialEvents = colEvents.slice(0, initialCount);
                const hiddenEvents = colEvents.slice(initialCount);

                initialEvents.forEach(e => {
                    html += createCardHtml(e);
                });

                if (hiddenEvents.length > 0) {
                    const hiddenId = 'kb-hidden-' + key + '-' + Date.now();
                    html += `<div id="${hiddenId}" style="display:none; margin-top: 10px;">`;
                    hiddenEvents.forEach(e => {
                        html += createCardHtml(e);
                    });
                    html += `</div>`;
                    html += `<button onclick="document.getElementById('${hiddenId}').style.display='block'; this.style.display='none';" style="width:100%; padding:10px; margin-top:10px; background:#f8fafc; border:1px dashed #cbd5e1; border-radius:8px; color:#64748b; font-size:11px; font-weight:600; cursor:pointer; transition:all 0.2s; display:flex; justify-content:center; align-items:center; gap:6px;" onmouseover="this.style.background='#f1f5f9'; this.style.color='#475569';" onmouseout="this.style.background='#f8fafc'; this.style.color='#64748b';">
                        <i class="fas fa-chevron-down"></i> View ${hiddenEvents.length} more
                    </button>`;
                }

                columns[key].innerHTML = html;
            }
        }
    }

    function createCardHtml(e) {
        const style = COLORS[e.type] || COLORS.quote;
        const formattedDate = e.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
        
        return `
        <div style="background:#fff; border:1px solid #e2e8f0; border-left:4px solid ${style.text}; border-radius:8px; padding:12px; margin-bottom:12px; box-shadow:0 1px 3px rgba(0,0,0,0.03); transition:all 0.2s; cursor:pointer;"
             onmouseover="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.06)'; this.style.transform='translateY(-1px)';" 
             onmouseout="this.style.boxShadow='0 1px 3px rgba(0,0,0,0.03)'; this.style.transform='none';">
            
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px;">
                <div style="display:flex; align-items:center; gap:6px;">
                    <div style="width:20px; height:20px; border-radius:5px; background:${style.bg}; color:${style.text}; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                        <i class="fas ${style.icon}" style="font-size:9px;"></i>
                    </div>
                    <span style="font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase;">${e.type}</span>
                </div>
                <div style="font-size:10px; font-weight:800; color:#0f172a; background:#f1f5f9; padding:2px 6px; border-radius:4px;">
                    <i class="far fa-calendar-alt" style="margin-right:3px;"></i>${formattedDate}
                </div>
            </div>

            <div style="font-size:12px; font-weight:800; color:#0f172a; margin-bottom:4px; line-height:1.3; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">
                ${e.title}
            </div>
            
            <div style="font-size:11px; font-weight:600; color:#64748b; margin-bottom:6px;">
                <i class="far fa-building" style="margin-right:4px;"></i>${e.customer}
            </div>
            
            <div style="font-size:10px; color:#94a3b8; background:#f8fafc; padding:4px 8px; border-radius:4px; display:inline-block;">
                ${e.desc}
            </div>
        </div>`;
    }

    return {
        setCompanyFilter,
        toggleCategory,
        initialize: function() {
            setTimeout(loadEvents, 500); // Load shortly after dashboard mounts
        },
        refresh: function() {
            loadEvents();
        }
    };
})();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { window.DashboardTimeline.initialize(); });
} else {
    window.DashboardTimeline.initialize();
}
