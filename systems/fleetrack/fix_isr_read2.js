const fs = require('fs');
let content = fs.readFileSync('isr_block.js', 'utf8');

const getStart = "const method = \"/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.get_signed_reports\";";
const startIndex = content.indexOf(getStart);
if (startIndex !== -1) {
    console.log(content.substring(Math.max(0, startIndex - 200), startIndex + 1500));
}
