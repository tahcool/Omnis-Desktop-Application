const fs = require('fs');
let content = fs.readFileSync('index.html', 'utf8');

const getStart = "const res = await callFrappe(\"/api/method/mxg_fleet_track.omnis_dashboard.ft_breakdown_dashboard.archive_signed_report\"";
const startIndex = content.indexOf(getStart);
if (startIndex !== -1) {
    console.log(content.substring(Math.max(0, startIndex - 500), startIndex + 1500));
}
