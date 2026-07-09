import re

with open(r'c:\Users\Administrator\omnis\systems\salestrack\timeline_logic.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace block 1
block1_old = """            // 1. Fetch Orders (Target Handover)
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
                                title: `Delivery: ${o.linked_sale_name || o.machine_model || 'Unknown'}`,
                                customer: o.customer_name || 'N/A',
                                desc: `Handover Target`,
                                raw: o
                            });
                        }
                    });
                }
            }"""
block1_new = """            // 1. Fetch Orders (Target Handover)
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
                                    title: `Delivery: ${o.linked_sale_name || o.machine_model || 'Unknown'}`,
                                    customer: o.customer_name || 'N/A',
                                    desc: `Handover Target`,
                                    raw: o
                                });
                            }
                        });
                    }
                }
            } catch (err) { console.error("Error fetching orders:", err); }"""
content = content.replace(block1_old, block1_new)

# Replace block 2
block2_old = """            // 2. Fetch Quotes (Next Follow Up)
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
            }"""
block2_new = """            // 2. Fetch Quotes (Next Follow Up)
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
            } catch (err) { console.error("Error fetching quotes:", err); }"""
content = content.replace(block2_old, block2_new)

# Replace block 3
block3_old = """            // 3. Fetch Stock Pipeline (ETAs)
            const baseUrl = (window.CURRENT_SYSTEM && window.CURRENT_SYSTEM.baseUrl) ? window.CURRENT_SYSTEM.baseUrl.replace(/\/$/, '') : 'https://fleetrack.machinery-exchange.com';
            if (window.callFrappeSequenced && baseUrl) {
                const stockRes = await window.callFrappeSequenced(baseUrl, "powerstar_salestrack.omnis_dashboard.get_stock_pipeline", {});
                const stockData = stockRes?.data || stockRes?.message?.data || [];
                stockData.forEach(s => {
                    const etaDateStr = s.eta_site || s.eta_port || s.target_eta || s.eta || s.creation; 
                    if (etaDateStr) {
                        rawEvents.push({
                            type: 'stock',
                            date: new Date(etaDateStr),
                            title: `Stock Pipeline: ${s.machine_model || s.machine || s.name}`,
                            customer: 'Internal Stock',
                            desc: `Status: ${s.status || 'Transit'}`,
                            raw: s
                        });
                    }
                });
            }"""
block3_new = """            // 3. Fetch Stock Pipeline (ETAs)
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
                                title: `Stock Pipeline: ${s.machine_model || s.machine || s.name}`,
                                customer: 'Internal Stock',
                                desc: `Status: ${s.status || 'Transit'}`,
                                raw: s
                            });
                        }
                    });
                }
            } catch (err) { console.error("Error fetching stock:", err); }"""
content = content.replace(block3_old, block3_new)

# Replace block 4
block4_old = """            // 4. Fetch Trainings 
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
            }"""
block4_new = """            // 4. Fetch Trainings 
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
            } catch (err) { console.error("Error fetching trainings:", err); }"""
content = content.replace(block4_old, block4_new)

with open(r'c:\Users\Administrator\omnis\systems\salestrack\timeline_logic.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Wrapped fetches in try...catch blocks")
