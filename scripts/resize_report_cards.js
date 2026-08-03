const fs = require('fs');
const cheerio = require('cheerio');

let html = fs.readFileSync('systems/fleetrack/index.html', 'utf8');
const $ = cheerio.load(html);

// Find the report grid
// It's under #view-reports or we can find elements by style
$('[onclick^="showView(\'view-"]').each((i, el) => {
    let style = $(el).attr('style');
    if (style && style.includes('padding:24px 20px;') && style.includes('flex-direction:column;')) {
        // This is a report card
        // 1. Update card style
        style = style.replace('padding:24px 20px;', 'padding:16px 14px;');
        style = style.replace('gap:12px;', 'gap:8px;');
        $(el).attr('style', style);
        
        // 2. Update icon wrapper
        let iconWrapper = $(el).children().first();
        if (iconWrapper.length) {
            let iconStyle = iconWrapper.attr('style') || '';
            iconStyle = iconStyle.replace('width:44px;', 'width:32px;');
            iconStyle = iconStyle.replace('height:44px;', 'height:32px;');
            iconStyle = iconStyle.replace('font-size:22px;', 'font-size:16px;');
            iconWrapper.attr('style', iconStyle);
            
            // 3. Update SVG
            let svg = iconWrapper.find('svg');
            if (svg.length) {
                svg.attr('width', '18');
                svg.attr('height', '18');
            }
        }
        
        // 4. Update title font size
        let titleDiv = $(el).children().eq(1);
        if (titleDiv.length) {
            let titleStyle = titleDiv.attr('style') || '';
            titleStyle = titleStyle.replace('font-size:14px;', 'font-size:13px;');
            titleDiv.attr('style', titleStyle);
        }
        
        // 5. Update subtitle font size
        let subtitleDiv = $(el).children().eq(2);
        if (subtitleDiv.length) {
            let subtitleStyle = subtitleDiv.attr('style') || '';
            subtitleStyle = subtitleStyle.replace('font-size:11px;', 'font-size:10px;');
            // ensure it doesn't wrap weirdly if we want it compact, maybe set line-height
            subtitleStyle += 'line-height:1.2;';
            subtitleDiv.attr('style', subtitleStyle);
        }
        
        // 6. Update bottom label font size
        let labelDiv = $(el).children().eq(3);
        if (labelDiv.length) {
            let labelStyle = labelDiv.attr('style') || '';
            labelStyle = labelStyle.replace('margin-top:4px;', 'margin-top:2px;');
            labelStyle = labelStyle.replace('font-size:10px;', 'font-size:9px;');
            labelDiv.attr('style', labelStyle);
        }
    }
});

fs.writeFileSync('systems/fleetrack/index.html', $.html());
console.log('Successfully resized report cards.');
