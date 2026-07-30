
(function MigrationModal() {
  window.openMigrationModal = function() {
    // Pre-populate counts from current state
    var machines = window.FT_MACHINE_ROWS || [];
    var imgCount = machines.filter(function(m) {
      return m.machine_picture && !m.machine_picture.includes('supabase.co/storage');
    }).length;
    var libCount = 0;
    var cache = window.FT_MACHINE_DETAIL_CACHE || {};
    Object.values(cache).forEach(function(m) {
      if (!window.LIB_FIELDS) return;
      window.LIB_FIELDS.forEach(function(f) {
        var field = f[1];
        var val = m[field];
        if (!val) return;
        var sbUrl = (window.LIB_SUPABASE_MAP && window.LIB_SUPABASE_MAP[m.name] && window.LIB_SUPABASE_MAP[m.name][field]) || '';
        if (!sbUrl || !sbUrl.includes('supabase.co/storage')) libCount++;
      });
    });

    var el = function(id, v) { var e = document.getElementById(id); if (e) e.textContent = v; };
    el('mig-count-machines', machines.length);
    el('mig-count-images', imgCount + ' pending');
    el('mig-count-lib', libCount + ' pending (from loaded)');
    el('mig-progress-label', 'Ready to start');
    el('mig-progress-pct', '0%');
    el('mig-stat', '');
    var bar = document.getElementById('mig-progress-bar');
    if (bar) bar.style.width = '0%';
    var log = document.getElementById('mig-log');
    if (log) log.innerHTML = '';
    var startBtn = document.getElementById('mig-start-btn');
    if (startBtn) { startBtn.disabled = false; startBtn.textContent = 'Start Migration'; startBtn.style.background = 'linear-gradient(135deg,#7c3aed,#6d28d9)'; }

    document.getElementById('mig-overlay').style.display = 'flex';
  };

  window.closeMigrationModal = function() {
    document.getElementById('mig-overlay').style.display = 'none';
  };

  document.getElementById('mig-overlay').addEventListener('click', function(e) {
    if (e.target === this) closeMigrationModal();
  });
})();
