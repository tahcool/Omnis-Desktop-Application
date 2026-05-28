const fs = require('fs');
let c = fs.readFileSync('index.html', 'utf8');

// Strip out ALL previous injections of openISRReport
const regexRaw = /    window\.openISRReport = function\(\) \{[\s\S]*?\};\n/g;
const regexScript = /<script>\s*window\.openISRReport = function\(\) \{[\s\S]*?\};\s*<\/script>/g;

c = c.replace(regexRaw, '');
c = c.replace(regexScript, '');

const properJs = `
<script>
    window.openISRReport = function() {
        console.log('[ISR] openISRReport called');
        const views = document.querySelectorAll('.view-page, .view-item');
        views.forEach(v => v.classList.add('hidden'));
        
        const isrView = document.getElementById('view-isr');
        if (isrView) {
            isrView.classList.remove('hidden');
            window.scrollTo(0,0);
            if (typeof loadISR === 'function') loadISR();
        } else {
            console.error('view-isr not found');
        }
    };
</script>
`;

const lastBody = c.lastIndexOf('</body>');
if (lastBody !== -1) {
    c = c.substring(0, lastBody) + properJs + c.substring(lastBody);
    fs.writeFileSync('index.html', c, 'utf8');
    console.log('Cleaned and re-injected properly at the very end!');
} else {
    console.log('Could not find </body>');
}
