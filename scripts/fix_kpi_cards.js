const fs = require('fs');
const cheerio = require('cheerio');

let html = fs.readFileSync('systems/fleetrack/index.html', 'utf8');
const $ = cheerio.load(html);

// We'll target the stat-cards. 
// They have class "stat-card". But wait, the first one "Critical Overdue" might not have stat-card class if it's styled inline differently.
// Actually, let's look at the html output: it doesn't have "stat-card" on line 3593 (which wasn't printed, but we can assume).
// Wait, I didn't see line 3593. Let's just find them by the label text.

const cards = [
  { label: 'Critical Overdue', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>' },
  { label: 'Active Machines', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>' },
  { label: 'Open Defects', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>' },
  { label: 'Open Breakdowns', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>' },
  { label: 'Field Jobs Today', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>' },
  { label: 'PSV/CDV Reviews', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>' },
  { label: 'After-Sales', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>' }
];

$('.stat-label').each((i, el) => {
    let text = $(el).text().trim();
    let cardInfo = cards.find(c => text.includes(c.label));
    if (cardInfo) {
        let parentCard = $(el).parent();
        
        // Update background and border to greyscale
        let style = parentCard.attr('style') || '';
        style = style.replace(/background:linear-gradient\([^)]+\)/g, 'background:linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)');
        style = style.replace(/border:1px solid [^;]+/g, 'border:1px solid #e2e8f0');
        style = style.replace(/box-shadow:[^;]+/g, 'box-shadow:0 4px 6px -1px rgba(0,0,0,0.03), 0 2px 4px -1px rgba(0,0,0,0.02)');
        parentCard.attr('style', style);
        
        // Also update hover effects for the card
        let onmouseover = parentCard.attr('onmouseover');
        if (onmouseover) {
            onmouseover = onmouseover.replace(/boxShadow='[^']+'/g, "boxShadow='0 10px 25px -5px rgba(0,0,0,0.05)'");
            parentCard.attr('onmouseover', onmouseover);
        }
        let onmouseout = parentCard.attr('onmouseout');
        if (onmouseout) {
            onmouseout = onmouseout.replace(/boxShadow='[^']+'/g, "boxShadow='0 4px 6px -1px rgba(0,0,0,0.03), 0 2px 4px -1px rgba(0,0,0,0.02)'");
            parentCard.attr('onmouseout', onmouseout);
        }

        // Make labels slate-500
        let labelStyle = $(el).attr('style') || '';
        labelStyle = labelStyle.replace(/color:#[a-zA-Z0-9]+/g, 'color:#64748b');
        $(el).attr('style', labelStyle);

        // Find value and sub
        let value = parentCard.find('.stat-value');
        let valueStyle = value.attr('style') || '';
        valueStyle = valueStyle.replace(/color:#[a-zA-Z0-9]+/g, 'color:#0f172a');
        value.attr('style', valueStyle);

        let sub = parentCard.find('.stat-sub');
        let subStyle = sub.attr('style') || '';
        subStyle = subStyle.replace(/color:#[a-zA-Z0-9]+/g, 'color:#94a3b8');
        sub.attr('style', subStyle);

        // Find the emoji div (usually the first child, or has font-size:82px)
        let iconDiv = parentCard.children().filter((idx, child) => {
            let childStyle = $(child).attr('style') || '';
            return childStyle.includes('opacity:0.09') || childStyle.includes('opacity:0.1') || childStyle.includes('font-size:82px') || childStyle.includes('transform:rotate');
        }).first();

        if (iconDiv.length) {
            // Replace with SVG
            // Update styles for the SVG container
            iconDiv.attr('style', 'position:absolute; right:-10px; bottom:-10px; opacity:0.05; width:80px; height:80px; color:#0f172a; transform:rotate(-10deg); pointer-events:none;');
            iconDiv.html(cardInfo.icon);
        }
        
        // Remove inner icons if any (like the red wrench inside PSV)
        $(el).find('svg').remove();
    }
});

// There is also the "Critical Overdue" which might not have stat-label class. Let's verify.
// Wait, in the output earlier, line 3601 had class="stat-label". Line 3594 had class="stat-label".
// So they all have stat-label.

fs.writeFileSync('systems/fleetrack/index.html', $.html());
console.log('Successfully made KPI cards black and grey and replaced playful icons with professional SVGs.');
