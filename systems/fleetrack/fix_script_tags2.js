const fs = require('fs');
let c = fs.readFileSync('index.html', 'utf8');

c = c.replace(`    window.openISRReport = function() {
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
    };`, `<script>
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
</script>`);

fs.writeFileSync('index.html', c, 'utf8');
console.log("Fixed script tags");
