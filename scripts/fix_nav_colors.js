const fs = require('fs');
const cheerio = require('cheerio');

let html = fs.readFileSync('systems/fleetrack/index.html', 'utf8');

// 1. Make the black truly black
// Header black
html = html.replace(/background: rgba\(10, 10, 10, 0\.85\) !important;/g, 'background: #000000 !important;');
// Dropdown black
html = html.replace(/background: rgba\(10, 10, 10, 0\.95\);/g, 'background: #000000;');
// Remove backdrop filters if they are lightening it
html = html.replace(/backdrop-filter: blur\(16px\) saturate\(180%\) !important;/g, '');
html = html.replace(/-webkit-backdrop-filter: blur\(16px\) saturate\(180%\) !important;/g, '');
html = html.replace(/backdrop-filter: blur\(20px\) saturate\(180%\);/g, '');
html = html.replace(/-webkit-backdrop-filter: blur\(20px\) saturate\(180%\);/g, '');


// 2. Remove the red on selected items
// Replace the red gradient active state with a premium white/grey active state
const oldActiveRed1 = /background: linear-gradient\(135deg, rgba\(239, 68, 68, 0\.15\) 0%, rgba\(220, 38, 38, 0\.05\) 100%\) !important;/g;
const newActiveBg = 'background: rgba(255, 255, 255, 0.12) !important;';
html = html.replace(oldActiveRed1, newActiveBg);

const oldActiveBorder1 = /border-color: rgba\(239, 68, 68, 0\.3\) !important;/g;
const newActiveBorder = 'border-color: rgba(255, 255, 255, 0.15) !important;';
html = html.replace(oldActiveBorder1, newActiveBorder);

const oldActiveColor1 = /color: #fca5a5 !important;/g;
const newActiveColor = 'color: #ffffff !important;';
html = html.replace(oldActiveColor1, newActiveColor);

const oldActiveShadow1 = /box-shadow: 0 4px 12px rgba\(239, 68, 68, 0\.1\);/g;
const newActiveShadow = 'box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);';
html = html.replace(oldActiveShadow1, newActiveShadow);

const oldDropdownActiveBg = /background: rgba\(239, 68, 68, 0\.08\);/g;
const newDropdownActiveBg = 'background: rgba(255, 255, 255, 0.1);';
html = html.replace(oldDropdownActiveBg, newDropdownActiveBg);

const oldDropdownActiveHoverBg = /background: rgba\(239, 68, 68, 0\.12\);/g;
const newDropdownActiveHoverBg = 'background: rgba(255, 255, 255, 0.15);';
html = html.replace(oldDropdownActiveHoverBg, newDropdownActiveHoverBg);


// Load into Cheerio to remove inline red styles from PSV & CDV Review
const $ = cheerio.load(html);

const psvItem = $('#nav-psv-cdv-queue');
if (psvItem.length) {
    let style = psvItem.attr('style') || '';
    style = style.replace(/color:\s*#e53935;?/i, '');
    psvItem.attr('style', style);
    
    psvItem.find('svg').each((i, el) => {
        let svgStyle = $(el).attr('style') || '';
        svgStyle = svgStyle.replace(/color:\s*#e53935;?/i, '');
        $(el).attr('style', svgStyle);
    });
}

fs.writeFileSync('systems/fleetrack/index.html', $.html());
console.log('Successfully made header truly black and removed red from active states.');
