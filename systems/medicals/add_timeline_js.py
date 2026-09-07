# -*- coding: utf-8 -*-
import os
import re

file_path = r'c:\Users\Administrator\omnis\systems\medicals\medicals_logic.js'

with open(file_path, 'r', encoding='utf-8') as f:
    js = f.read()

# Add the renderAppointmentsTimeline call inside loadAppointments()
js = js.replace('renderAppointmentsTable(appointmentsList);', 'renderAppointmentsTable(appointmentsList);\n        if (typeof renderAppointmentsTimeline === "function") renderAppointmentsTimeline();')

timeline_fn = '''
function renderAppointmentsTimeline() {
    const grid = document.getElementById("dash-appointments-grid");
    if (!grid) return;
    
    let rows = window.appointmentsList || [];
    
    // Group by date
    const jobMap = {};
    rows.forEach(r => {
        if (!r.appointment_date) return;
        const d = new Date(r.appointment_date);
        if (isNaN(d)) return;
        const key = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
        if (!jobMap[key]) jobMap[key] = [];
        jobMap[key].push(r);
    });

    const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    
    const today = new Date();
    today.setHours(0,0,0,0);
    
    let gridHtml = '';
    
    for (let i = 0; i < 7; i++) {
        const dateObj = new Date(today);
        dateObj.setDate(today.getDate() + i);
        
        const dateKey = dateObj.getFullYear() + '-' + String(dateObj.getMonth()+1).padStart(2,'0') + '-' + String(dateObj.getDate()).padStart(2,'0');
        const isToday = i === 0;
        const dayName = dayNames[dateObj.getDay()];
        const dateNum = dateObj.getDate();
        
        const dayJobs = jobMap[dateKey] || [];
        
        // Build job chips
        let jobsHtml = '';
        if (dayJobs.length === 0) {
            jobsHtml = <div style="display:flex;align-items:center;gap:6px;color:#94a3b8;font-size:11px;font-weight:600;"><i class="far fa-calendar-times"></i> No appointments</div>;
        } else {
            dayJobs.forEach(job => {
                const patName = job.omnis_patients ? ${job.omnis_patients.name}  : 'Unknown';
                const tColor = job.status === 'Completed' ? '#10b981' : '#3b82f6';
                const bColor = job.status === 'Completed' ? '#dcfce7' : '#eff6ff';
                jobsHtml += 
                    <div style="background:\; color:\; padding:8px; border-radius:8px; margin-bottom:8px; font-size:11px; font-weight:700; line-height:1.3; box-shadow:0 1px 2px rgba(0,0,0,0.02);">
                        <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                            <span style="opacity:0.8;">\</span>
                            <i class="fas \"></i>
                        </div>
                        <div style="color:#0f172a;">\</div>
                        <div style="font-weight:500; opacity:0.8; margin-top:2px; font-size:10px;">\</div>
                    </div>
                ;
            });
        }
        
        const colBg = isToday ? 'linear-gradient(180deg, #3b82f6 0%, #4f46e5 100%)' : '#fff';
        const colText = isToday ? '#fff' : '#0f172a';
        const shadow = isToday ? '0 10px 25px -5px rgba(59,130,246,0.5)' : '0 4px 6px -1px rgba(0,0,0,0.05)';
        const border = isToday ? 'none' : '1px solid #e2e8f0';
        const todayBadge = isToday ? <span style="background:#fff; color:#3b82f6; font-size:9px; font-weight:900; padding:2px 8px; border-radius:99px; margin-left:6px;">TODAY</span> : '';
        
        gridHtml += 
            <div style="display:flex; flex-direction:column; gap:16px;">
                <div style="text-align:center; font-size:12px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:0.05em; display:flex; align-items:center; justify-content:center;">
                    \ \
                </div>
                <div style="flex:1; background:\; border:\; border-radius:16px; padding:16px; box-shadow:\; position:relative; overflow:hidden; min-height:160px;">
                    <div style="position:absolute; bottom:-10px; right:-10px; font-size:120px; font-weight:900; color:\; line-height:1; pointer-events:none; z-index:0;">
                        \
                    </div>
                    
                    <div style="position:relative; z-index:1; margin-bottom:12px; display:flex; align-items:baseline; gap:4px;">
                        <span style="font-size:24px; font-weight:900; color:\;">\</span>
                        <span style="font-size:13px; font-weight:700; color:\;">\</span>
                    </div>
                    
                    <div style="position:relative; z-index:1;">
                        \
                    </div>
                </div>
            </div>
        ;
    }
    
    grid.innerHTML = gridHtml;
}
'''

with open(file_path, 'a', encoding='utf-8') as f:
    f.write("\n" + timeline_fn)

print("Added renderAppointmentsTimeline function to medicals_logic.js")
