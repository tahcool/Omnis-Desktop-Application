
// ── Load PSV/CDV KPI count on dashboard boot ───────────────────────────────
(function() {
    async function loadPsvQueueKpi() {
        try {
            let psvCount = 0, cdvCount = 0;
            if (window.electron && window.electron.ipcRenderer) {
                const [pr, cr] = await Promise.all([
                    window.electron.ipcRenderer.invoke('supabase:query', {
                        table: 'psv_logs', method: 'select',
                        params: { match: { action_required: true } }
                    }),
                    window.electron.ipcRenderer.invoke('supabase:query', {
                        table: 'cdv_logs', method: 'select',
                        params: { match: { action_required: true } }
                    })
                ]);
                psvCount = pr.ok && pr.data ? pr.data.filter(r => !r.ft_defect_logged).length : 0;
                cdvCount = cr.ok && cr.data ? cr.data.filter(r => !r.ft_defect_logged).length : 0;
            }
            const total = psvCount + cdvCount;
            window.updatePsvKpiCard && window.updatePsvKpiCard(total);
        } catch(e) {
            console.warn('[PSV KPI] Could not load count:', e.message);
            const subEl = document.getElementById('kpi-psv-queue-sub');
            if (subEl) subEl.textContent = 'Unable to connect';
            const countEl = document.getElementById('kpi-psv-queue-count');
            if (countEl) countEl.textContent = '?';
        }
    }

    // Run after a short delay to let the dashboard finish loading
    document.addEventListener('DOMContentLoaded', () => setTimeout(loadPsvQueueKpi, 2500));
    // Also expose so other parts can trigger a refresh
    window.loadPsvQueueKpi = loadPsvQueueKpi;
})();
