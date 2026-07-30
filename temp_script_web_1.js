
          (function(){
            let _calYear, _calMonth;

            const statusColors = {
              'proposed':    '#6366f1',
              'planned':     '#f59e0b',
              'in progress': '#3b82f6',
              'completed':   '#10b981',
            };

            function colorFor(status) {
              return statusColors[(status||'').toLowerCase()] || '#64748b';
            }

            window.openFspFullCalendar = function() {
              const now = new Date();
              _calYear  = now.getFullYear();
              _calMonth = now.getMonth();
              const modal = document.getElementById('fsp-cal-modal');
              modal.style.display = 'flex';
              // If data already loaded, render immediately; otherwise load first
              if (window._fspRows && window._fspRows.length > 0) {
                renderFspCal();
              } else if (typeof window.loadFieldServicePlan === 'function') {
                // loadFieldServicePlan will set window._fspRows then we render
                const origRender = window.renderFspWeeklyCalendar;
                window._fspCalPendingRender = true;
                window.loadFieldServicePlan().then(function(){ renderFspCal(); }).catch(function(){ renderFspCal(); });
              } else {
                renderFspCal();
              }
            };

            window.closeFspFullCalendar = function() {
              document.getElementById('fsp-cal-modal').style.display = 'none';
            };

            window.fspCalNav = function(dir) {
              _calMonth += dir;
              if (_calMonth > 11) { _calMonth = 0; _calYear++; }
              if (_calMonth < 0)  { _calMonth = 11; _calYear--; }
              renderFspCal();
            };

            // Close on backdrop click
            document.getElementById('fsp-cal-modal').addEventListener('click', function(e){
              if (e.target === this) window.closeFspFullCalendar();
            });

            function renderFspCal() {
              const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
              document.getElementById('fsp-cal-title').textContent = monthNames[_calMonth] + ' ' + _calYear;

              // Read directly from the cached FSP rows (r.plan_for = date, r.customer, r.machine, r.status)
              const rows = window._fspRows || [];

              // Build a map: "YYYY-MM-DD" -> [{customer, machine, status, technician}]
              const jobMap = {};
              rows.forEach(function(r) {
                if (!r.plan_for) return;
                const d = new Date(r.plan_for);
                if (isNaN(d)) return;
                const key = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
                if (!jobMap[key]) jobMap[key] = [];
                jobMap[key].push({ customer: r.customer||'', machine: r.machine||'', status: r.status||'', technician: r.technician||'' });
              });

              const firstDay = new Date(_calYear, _calMonth, 1).getDay(); // 0=Sun
              const daysInMonth = new Date(_calYear, _calMonth + 1, 0).getDate();
              const today = new Date();
              const todayKey = today.getFullYear() + '-' + String(today.getMonth()+1).padStart(2,'0') + '-' + String(today.getDate()).padStart(2,'0');

              const grid = document.getElementById('fsp-cal-grid');
              grid.innerHTML = '';

              // Empty cells before first day
              for (let i = 0; i < firstDay; i++) {
                const empty = document.createElement('div');
                empty.style.cssText = 'min-height:90px; border-radius:8px;';
                grid.appendChild(empty);
              }

              // Day cells
              for (let d = 1; d <= daysInMonth; d++) {
                const key = _calYear + '-' + String(_calMonth+1).padStart(2,'0') + '-' + String(d).padStart(2,'0');
                const isToday = (key === todayKey);
                const dayJobs = jobMap[key] || [];

                const cell = document.createElement('div');
                cell.style.cssText = 'min-height:90px; background:' + (isToday ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.04)') + '; border:1px solid ' + (isToday ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.07)') + '; border-radius:8px; padding:6px 8px; overflow:hidden;';

                const dayNum = document.createElement('div');
                dayNum.style.cssText = 'font-size:11px; font-weight:' + (isToday ? '900' : '600') + '; color:' + (isToday ? '#ef4444' : '#94a3b8') + '; margin-bottom:4px;';
                dayNum.textContent = d;
                cell.appendChild(dayNum);

                dayJobs.slice(0, 3).forEach(function(job) {
                  const pill = document.createElement('div');
                  const c = colorFor(job.status);
                  pill.style.cssText = 'background:' + c + '22; border-left:2px solid ' + c + '; padding:2px 5px; border-radius:0 3px 3px 0; margin-bottom:2px; font-size:10px; color:#e2e8f0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;';
                  pill.textContent = job.customer || job.machine || job.status;
                  pill.title = (job.customer||'') + (job.machine ? ' · ' + job.machine : '') + (job.technician ? ' · ' + job.technician : '') + ' — ' + (job.status||'');
                  cell.appendChild(pill);
                });

                if (dayJobs.length > 3) {
                  const more = document.createElement('div');
                  more.style.cssText = 'font-size:9px; color:#64748b; margin-top:2px;';
                  more.textContent = '+' + (dayJobs.length - 3) + ' more';
                  cell.appendChild(more);
                }

                grid.appendChild(cell);
              }
            }
          })();
          