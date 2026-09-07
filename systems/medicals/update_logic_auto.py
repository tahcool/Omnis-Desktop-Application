# -*- coding: utf-8 -*-
import os

file_path = r'c:\Users\Administrator\omnis\systems\medicals\medicals_logic.js'

with open(file_path, 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Add getWeekdaysInMonth outside the function
helper = '''
function getWeekdaysInMonth(year, month) {
    let count = 0;
    const daysInMonth = new Date(year, month, 0).getDate();
    for (let i = 1; i <= daysInMonth; i++) {
        const d = new Date(year, month - 1, i);
        if (d.getDay() !== 0 && d.getDay() !== 6) {
            count++;
        }
    }
    return count;
}

// Report Generator
async function generateSHEReport() {
'''
js = js.replace('// Report Generator\nasync function generateSHEReport() {', helper)

# 2. Add holidays parsing
search_month = '''    const month = parseInt(monthVal.split('-')[1]);
    const monthName = new Date(year, month - 1, 1).toLocaleString('default', { month: 'long' }).toUpperCase();'''
replace_month = search_month + '''
    
    const holidaysInput = document.getElementById('she-report-holidays');
    const publicHolidays = (holidaysInput && holidaysInput.value) ? parseInt(holidaysInput.value) : 0;
    const weekdaysInMonth = getWeekdaysInMonth(year, month);
'''
js = js.replace(search_month, replace_month)

# 3. Add omnis_patients fetch
search_fetch = '''        // 3. Stats
        const statsRes = await window.electron.invoke('supabase:query', {
            table: 'omnis_she_stats', method: 'select',
            params: { columns: '*' }
        });'''
replace_fetch = search_fetch + '''
        // 5. Patients (for Manpower)
        const patientsRes = await window.electron.invoke('supabase:query', {
            table: 'omnis_patients', method: 'select',
            params: { columns: 'id, division' }
        });'''
js = js.replace(search_fetch, replace_fetch)

search_all = '''        const allNotes = notesRes.data || [];
        const allBreath = breathRes.data || [];
        const allStats = statsRes.data || [];'''
replace_all = search_all + '''
        const allPatients = patientsRes.data || [];'''
js = js.replace(search_all, replace_all)

# 4. Modify the stats calculation logic
search_stats = '''        divisions.forEach(div => {
            const mStat = mStats.find(s => s.division === div) || { manpower_level: 0, manhours_worked: 0 };
            const yStatSum = yStats.filter(s => s.division === div).reduce((acc, curr) => acc + curr.manhours_worked, 0);
            
            manpowers.push(mStat.manpower_level);
            monthHours.push(mStat.manhours_worked);
            yearHours.push(yStatSum);

            sumManpower += mStat.manpower_level;
            sumMonthHours += mStat.manhours_worked;
            sumYearHours += yStatSum;
        });'''

replace_stats = '''        // Dynamically compute manpower and manhours
        divisions.forEach(div => {
            // Manpower Level (count of active patients in this division)
            const divManpower = allPatients.filter(p => p.division === div).length;
            
            // Total Sick Leave Days for this division in this month
            const divSickDaysThisMonth = mNotes.filter(n => n.omnis_patients?.division === div).reduce((acc, n) => acc + (n.days_off || 0), 0);
            
            // Monthly Manhours = Manpower * (Weekdays - Holidays) * 8 - (Sick Leave * 8)
            const baseManhours = divManpower * (weekdaysInMonth - publicHolidays) * 8;
            const lostHours = divSickDaysThisMonth * 8;
            const divManhoursThisMonth = Math.max(0, baseManhours - lostHours);
            
            // Yearly Manhours = Sum of calculated monthly manhours for the year
            // To simplify without running full historical loop, we calculate YTD based on months passed * avg working days
            // But actually we have allNotes for the year, so we can calculate exact YTD:
            let divSickDaysThisYear = yNotes.filter(n => n.omnis_patients?.division === div).reduce((acc, n) => acc + (n.days_off || 0), 0);
            
            // Get total weekdays from Jan to current month
            let totalWeekdaysYTD = 0;
            for(let m = 1; m <= month; m++) {
                totalWeekdaysYTD += getWeekdaysInMonth(year, m);
            }
            // For yearly holidays, we can't easily guess historical without a table. We'll use the month's holidays * months passed as a rough estimate, or just zero since it's just YTD stats
            // For now, let's just do exact calculation minus exact sick leave
            const baseYTDManhours = divManpower * totalWeekdaysYTD * 8; // Assuming manpower was constant
            const lostYTDHours = divSickDaysThisYear * 8;
            const divManhoursThisYear = Math.max(0, baseYTDManhours - lostYTDHours);
            
            manpowers.push(divManpower);
            monthHours.push(divManhoursThisMonth);
            yearHours.push(divManhoursThisYear);

            sumManpower += divManpower;
            sumMonthHours += divManhoursThisMonth;
            sumYearHours += divManhoursThisYear;
        });'''
js = js.replace(search_stats, replace_stats)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(js)
print('Logic update for stats complete')
