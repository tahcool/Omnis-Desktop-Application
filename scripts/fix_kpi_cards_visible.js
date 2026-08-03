const fs = require('fs');

let html = fs.readFileSync('systems/fleetrack/index.html', 'utf8');

const replacements = [
    { from: 'linear-gradient(145deg, #ffffff 0%, #fef2f2 100%)', to: 'linear-gradient(145deg, #ffffff 0%, #fee2e2 100%)' },
    { from: 'linear-gradient(145deg, #ffffff 0%, #fffbeb 100%)', to: 'linear-gradient(145deg, #ffffff 0%, #fef3c7 100%)' },
    { from: 'linear-gradient(145deg, #ffffff 0%, #eff6ff 100%)', to: 'linear-gradient(145deg, #ffffff 0%, #dbeafe 100%)' },
    { from: 'linear-gradient(145deg, #ffffff 0%, #f3e8ff 100%)', to: 'linear-gradient(145deg, #ffffff 0%, #e9d5ff 100%)' },
    { from: 'linear-gradient(145deg, #ffffff 0%, #ecfdf5 100%)', to: 'linear-gradient(145deg, #ffffff 0%, #d1fae5 100%)' },
    { from: 'linear-gradient(145deg, #ffffff 0%, #f0f9ff 100%)', to: 'linear-gradient(145deg, #ffffff 0%, #e0f2fe 100%)' }
];

let replacedCount = 0;

replacements.forEach(r => {
    let count = html.split(r.from).length - 1;
    if (count > 0) {
        html = html.split(r.from).join(r.to);
        replacedCount += count;
    }
});

if (replacedCount > 0) {
    fs.writeFileSync('systems/fleetrack/index.html', html);
    console.log(`Replaced ${replacedCount} instances to make card colors more visible.`);
} else {
    console.log('No matches found for replacements.');
}
