const fs = require('fs');
let c = fs.readFileSync('index.html', 'utf8');

const globalJs = `
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

if(!c.includes('window.openISRReport = function')) {
    const endIdx = c.lastIndexOf('</body>');
    if(endIdx >= 0) {
        c = c.substring(0, endIdx) + globalJs + c.substring(endIdx);
        console.log("Injected JS");
        fs.writeFileSync('index.html', c, 'utf8');
    }
} else {
    console.log("Already has openISRReport");
}
