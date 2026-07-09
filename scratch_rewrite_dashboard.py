import sys

js_code = """
let chartInstance = null;

async function loadStats() {
    if (!window.electron) return;
    try {
        const todayStr = new Date().toISOString().split('T')[0];

        // Fetch counts
        const pRes = await window.electron.invoke('supabase:query', { table: 'omnis_patients', method: 'select', params: { columns: 'id' } });
        const cRes = await window.electron.invoke('supabase:query', { table: 'omnis_consultations', method: 'select', params: { columns: 'id, consultation_date, omnis_patients(name, surname), diagnosis' } });
        const aRes = await window.electron.invoke('supabase:query', { table: 'omnis_appointments', method: 'select', params: { columns: 'id, appointment_date, appointment_time, reason, status, omnis_patients(name, surname)' } });
        const iRes = await window.electron.invoke('supabase:query', { table: 'omnis_inventory', method: 'select', params: { columns: 'item_name, quantity, min_stock_level' } });

        const patients = pRes.data || [];
        const consults = cRes.data || [];
        const appts = aRes.data || [];
        const inventory = iRes.data || [];

        // Calculate Today's numbers
        const consultsToday = consults.filter(c => c.consultation_date && c.consultation_date.startsWith(todayStr));
        const apptsToday = appts.filter(a => a.appointment_date === todayStr);
        const lowStock = inventory.filter(i => i.quantity <= i.min_stock_level);

        document.getElementById('stat-patients').innerText = patients.length;
        document.getElementById('stat-consults').innerText = consultsToday.length;
        document.getElementById('stat-appts').innerText = apptsToday.length;
        document.getElementById('stat-low-stock').innerText = lowStock.length;

        // Populate Feeds
        const feedAppts = document.getElementById('feed-todays-appts');
        if (apptsToday.length === 0) {
            feedAppts.innerHTML = '<span style="color:var(--text-light);font-size:12px;">No appointments today.</span>';
        } else {
            feedAppts.innerHTML = apptsToday.map(a => `
                <div style="padding:10px; border-left:3px solid var(--accent-blue); background:#f8fafc; border-radius:4px; font-size:12px;">
                    <strong>${a.appointment_time || ''}</strong> - ${escapeHtml(a.omnis_patients?.name || '')} ${escapeHtml(a.omnis_patients?.surname || '')}<br>
                    <span style="color:var(--text-light);">${escapeHtml(a.reason)}</span>
                </div>
            `).join('');
        }

        const feedStock = document.getElementById('feed-low-stock');
        if (lowStock.length === 0) {
            feedStock.innerHTML = '<span style="color:var(--text-light);font-size:12px;">All stock levels are optimal.</span>';
        } else {
            feedStock.innerHTML = lowStock.map(i => `
                <div style="padding:10px; border-left:3px solid var(--accent-red); background:#fef2f2; border-radius:4px; font-size:12px;">
                    <strong>${escapeHtml(i.item_name)}</strong><br>
                    <span style="color:var(--accent-red);">Qty: ${i.quantity} (Min: ${i.min_stock_level})</span>
                </div>
            `).join('');
        }

        const feedRecent = document.getElementById('feed-recent-consults');
        const recentConsults = [...consults].sort((a,b) => new Date(b.consultation_date) - new Date(a.consultation_date)).slice(0, 5);
        if (recentConsults.length === 0) {
            feedRecent.innerHTML = '<span style="color:var(--text-light);font-size:12px;">No recent activity.</span>';
        } else {
            feedRecent.innerHTML = recentConsults.map(c => `
                <div style="padding:10px; border-bottom:1px solid var(--border); font-size:12px;">
                    <strong>${escapeHtml(c.omnis_patients?.name || '')} ${escapeHtml(c.omnis_patients?.surname || '')}</strong>
                    <span style="float:right;color:var(--text-light);">${new Date(c.consultation_date).toLocaleDateString()}</span><br>
                    <span style="color:var(--text-light);">${escapeHtml(c.diagnosis || 'No diagnosis logged')}</span>
                </div>
            `).join('');
        }

        // Render Chart
        renderChart(consults);

    } catch (e) {
        console.error("Stats error", e);
    }
}

function renderChart(consults) {
    const ctx = document.getElementById('consultationsChart');
    if (!ctx) return;

    // Last 7 days data
    const labels = [];
    const counts = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dStr = d.toISOString().split('T')[0];
        labels.push(d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }));
        counts.push(consults.filter(c => c.consultation_date && c.consultation_date.startsWith(dStr)).length);
    }

    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Consultations',
                data: counts,
                borderColor: '#e11c2a',
                backgroundColor: 'rgba(225, 28, 42, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1 } },
                x: { grid: { display: false } }
            }
        }
    });
}
"""

with open(r'c:\Users\Administrator\omnis\systems\medicals\medicals_logic.js', 'r', encoding='utf-8') as f:
    content = f.read()

import re

# We will replace the existing loadStats function
pattern = re.compile(r"async function loadStats\(\) \{.*?\n\}", re.DOTALL)
content = pattern.sub(js_code, content)

with open(r'c:\Users\Administrator\omnis\systems\medicals\medicals_logic.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("JS updated")
