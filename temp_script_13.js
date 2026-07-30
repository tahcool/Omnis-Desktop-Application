
    (function () {
      let cachedGsmTasks = []; // Shared cache for tasks
      // --- TASK DATABASE ---
      class TaskDB {
        static async getTasks() {
          try {
            const sys = window.getCurrentSystem ? window.getCurrentSystem() : null;
            const baseUrl = sys ? sys.baseUrl : "https://salestrack.powerstar.co.zw";
            const method = 'powerstar_salestrack.omnis_dashboard.get_gsm_tasks';

            const res = await window.callFrappeSequenced(baseUrl, method, {}, "GET");

            if (res && res.ok && res.tasks) {
              return res.tasks.map(t => ({
                id: t.name,
                name: t.task,
                assignee: t.assignee,
                assigneeId: t.assignee,
                timeAssigned: t.date_assigned,
                dueDate: t.ted,
                status: t.status,
                comment: t.comment,
                category: (t.category || 'GENERAL').toUpperCase().trim(),
                isUrgent: t.is_urgent === 1 || t.is_urgent === true,
                assignedBy: t.owner
              }));
            }
            return [];
          } catch (e) {
            console.error("Error fetching tasks:", e);
            return [];
          }
        }
        static async saveTask(task) {
          try {
            const sys = window.getCurrentSystem ? window.getCurrentSystem() : null;
            const baseUrl = sys ? sys.baseUrl : "https://salestrack.powerstar.co.zw";
            const method = 'powerstar_salestrack.omnis_dashboard.save_gsm_task';
            const data = {
              task: task.name,
              assignee: task.assigneeId || task.assignee,
              date_assigned: task.timeAssigned,
              ted: task.dueDate,
              status: task.status,
              comment: task.comment,
              category: task.category,
              is_urgent: task.isUrgent ? 1 : 0
            };

            const res = await window.callFrappeSequenced(baseUrl, method, data);
            const success = res && res.ok;
            return { ok: success, error: success ? null : (res.error || "Unknown server error") };
          } catch (e) {
            console.error("Error saving task:", e);
            return { ok: false, error: e.message };
          }
        }
        static async updateTask(task) {
          try {
            const sys = window.getCurrentSystem ? window.getCurrentSystem() : null;
            const baseUrl = sys ? sys.baseUrl : "https://salestrack.powerstar.co.zw";
            const method = 'powerstar_salestrack.omnis_dashboard.save_gsm_task';
            const data = {
              id: task.id,
              task: task.name,
              assignee: task.assigneeId || task.assignee,
              date_assigned: task.timeAssigned,
              ted: task.dueDate,
              status: task.status,
              comment: task.comment,
              category: task.category,
              is_urgent: task.isUrgent ? 1 : 0
            };

            const res = await window.callFrappeSequenced(baseUrl, method, data);
            const success = res && res.ok;
            return { ok: success, error: success ? null : (res.error || "Unknown server error") };
          } catch (e) {
            console.error("Error updating task:", e);
            return { ok: false, error: e.message };
          }
        }
        static async deleteTask(id) {
          try {
            const sys = window.getCurrentSystem ? window.getCurrentSystem() : null;
            const baseUrl = sys ? sys.baseUrl : "https://salestrack.powerstar.co.zw";
            const method = 'powerstar_salestrack.omnis_dashboard.delete_gsm_task';

            const res = await window.callFrappeSequenced(baseUrl, method, { id: id });
            return res && res.ok;
          } catch (e) {
            console.error("Error deleting task:", e);
            return false;
          }
        }
      }

      class EmployeeDB {
        static getEmployees() {
          const employees = localStorage.getItem('taskManager_employees');
          if (!employees) {
            const seed = [
              { id: 'IEG001', name: 'Austin', surname: 'Salestrack', title: 'GSM Manager', ibu: 'GSM', division: 'Management', email: 'austin@powerstar.co.zw' },
              { id: 'IEG002', name: 'John', surname: 'Doe', title: 'Sales Rep', ibu: 'GSM', division: 'IEG', email: 'john@powerstar.co.zw' },
              { id: 'IEG003', name: 'Jane', surname: 'Smith', title: 'Sales Rep', ibu: 'GSM', division: 'MXG', email: 'jane@powerstar.co.zw' }
            ];
            localStorage.setItem('taskManager_employees', JSON.stringify(seed));
            return seed;
          }
          return JSON.parse(employees);
        }
      }

      const gsmCategories = [
        'GENERAL',
        'SALES PERFORMANCE',
        'CURRENT ORDERS',
        'STOCK ON HAND',
        'STOCK IN TRANSIT',
        'STOCK IN PRODUCTION',
        'LATE, POTENTIAL & PROBLEM ORDERS',
        'WARRANTY ISSUES',
        'RENTAL PERFORMANCE',
        'CPA,S',
        'PLANNED VISITS',
        'GSM ADMIN & DEALS',
        'MARKETING PLAN FOR THE WEEK',
        'OMNIS UPDATES/ PROGRESS',
        'TRAINING ADMIN FOR GSM',
        'AD NOTES FOR THE WEEK & ACTIONS'
      ];

      const collapsedCategories = new Set();

      function getStatusColor(status) {
        if (status === 'Done' || status === 'Complete') return '#4CAF50';
        if (status === 'Cancelled') return '#f44336';
        if (status === 'In progress') return '#ffcc00';
        return '#cbd5e1';
      }

      function showToast(message, type = 'success') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        const bgColor = type === 'error' ? '#f44336' : (type === 'warning' ? '#ffcc00' : '#4CAF50');
        const icon = type === 'error' ? 'fa-circle-exclamation' : (type === 'warning' ? 'fa-triangle-exclamation' : 'fa-check');
        toast.style.cssText = `background: ${bgColor}; color: white; padding: 1rem 1.5rem; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); display: flex; align-items: center; gap: 0.8rem; font-weight: 500; min-width: 300px; margin-bottom: 0.5rem;`;
        toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
      }

      function renderAssigneePerformance(gsmTasks) {
        const container = document.getElementById('gsmAssigneePerfContainer');
        if (!container) return;
        container.innerHTML = '';
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const assigneeStats = {};
        gsmTasks.forEach(task => {
          const name = task.assignee || 'Unassigned';
          if (!assigneeStats[name]) {
            assigneeStats[name] = { total: 0, completed: 0, pending: 0, overdue: 0, id: task.assigneeId || '-', tasks: [] };
          }
          assigneeStats[name].total++;
          assigneeStats[name].tasks.push(task);
          if (task.status === 'Complete') { assigneeStats[name].completed++; }
          else {
            assigneeStats[name].pending++;
            if (task.dueDate) { const dDate = new Date(task.dueDate); if (dDate < today) { assigneeStats[name].overdue++; } }
          }
        });
        const sortedAssignees = Object.entries(assigneeStats).map(([name, stats]) => {
          const emp = EmployeeDB.getEmployees().find(e => String(e.id) === String(stats.id));
          return { name, ...stats, title: emp ? emp.title : '-', email: emp ? emp.email : '-', ibu: emp ? emp.ibu : '-', division: emp ? emp.division : '-', rate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0 };
        }).sort((a, b) => b.rate - a.rate);

        sortedAssignees.forEach(assignee => {
          const card = document.createElement('div');
          card.className = 'task-row-clickable';
          card.style.cssText = `background: rgba(255, 255, 255, 0.03); padding: 1.2rem; border-radius: 16px; border: 1px solid rgba(255,255,255,0.08); display: flex; flex-direction: column; gap: 0.8rem; cursor: pointer; transition: all 0.2s;`;
          card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div>
                        <div style="color: white; font-weight: 600; font-size: 1rem;">${assignee.name}</div>
                        <div style="color: #a6a6a6; font-size: 0.75rem;">ID: ${assignee.id}</div>
                    </div>
                    <div style="background: ${assignee.rate >= 80 ? '#4CAF50' : assignee.rate >= 50 ? '#ffcc00' : '#f44336'}20; color: ${assignee.rate >= 80 ? '#4CAF50' : assignee.rate >= 50 ? '#ffcc00' : '#f44336'}; padding: 4px 8px; border-radius: 6px; font-size: 0.8rem; font-weight: 700;">${assignee.rate}%</div>
                </div>
                <div style="height: 6px; background: rgba(255,255,255,0.05); border-radius: 3px; overflow: hidden;">
                    <div style="height: 100%; width: ${assignee.rate}%; background: ${assignee.rate >= 80 ? '#4CAF50' : assignee.rate >= 50 ? '#ffcc00' : '#f44336'}; transition: width 0.5s ease;"></div>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 0.75rem;">
                    <span style="color: #a6a6a6;">Total: <strong style="color: white;">${assignee.total}</strong></span>
                    <span style="color: #f44336; opacity: ${assignee.overdue > 0 ? 1 : 0.3};">Overdue: <strong>${assignee.overdue}</strong></span>
                </div>
            `;
          card.addEventListener('click', () => openIndividualPerfModal(assignee));
          container.appendChild(card);
        });
      }

      function openIndividualPerfModal(assignee) {
        document.getElementById('perfModalAssigneeName').innerText = assignee.name;
        document.getElementById('perfModalAssigneeId').innerText = `Employee ID: ${assignee.id}`;
        document.getElementById('perfModalTotal').innerText = assignee.total;
        document.getElementById('perfModalCompleted').innerText = assignee.completed;
        document.getElementById('perfModalPending').innerText = assignee.pending;
        document.getElementById('perfModalOverdue').innerText = assignee.overdue;

        const initial = assignee.name.split(' ').map(n => n[0]).join('').toUpperCase();
        document.getElementById('perfModalInitial').innerText = initial;

        const periodFilter = document.getElementById('perfModalPeriodFilter');
        const periodLabel = document.getElementById('perfModalPeriodLabel');
        const periodTotal = document.getElementById('perfModalPeriodTotal');
        const periodRate = document.getElementById('perfModalPeriodRate');

        const updateModalStats = () => {
          const val = periodFilter.value;
          const now = new Date();
          const startOfDay = new Date(now.setHours(0, 0, 0, 0));
          const tempDate = new Date();
          const startOfWeek = new Date(tempDate.setDate(tempDate.getDate() - tempDate.getDay()));
          startOfWeek.setHours(0, 0, 0, 0);
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          const startOfYear = new Date(now.getFullYear(), 0, 1);

          let filtered = assignee.tasks || [];
          if (val !== 'ALL') {
            filtered = filtered.filter(t => {
              if (!t.timeAssigned) return false;
              const d = new Date(t.timeAssigned);
              if (val === 'daily') return d >= startOfDay;
              if (val === 'weekly') return d >= startOfWeek;
              if (val === 'monthly') return d >= startOfMonth;
              if (val === 'yearly') return d >= startOfYear;
              return true;
            });
          }
          periodLabel.innerText = val === 'ALL' ? "All Time Tasks" : (val.charAt(0).toUpperCase() + val.slice(1) + " Tasks");
          periodTotal.innerText = filtered.length;
          const comp = filtered.filter(t => t.status === 'Complete').length;
          periodRate.innerText = filtered.length > 0 ? Math.round((comp / filtered.length) * 100) + '%' : '0%';
        };

        periodFilter.onchange = updateModalStats;
        updateModalStats();

        document.getElementById('perfModalTitle').innerText = assignee.title || '-';
        document.getElementById('perfModalEmail').innerText = assignee.email || '-';
        document.getElementById('perfModalIbu').innerText = assignee.ibu || '-';
        document.getElementById('perfModalDivision').innerText = assignee.division || '-';

        const listContainer = document.getElementById('perfModalTaskList');
        listContainer.innerHTML = '';
        assignee.tasks.forEach(task => {
          const item = document.createElement('div');
          item.style.cssText = `padding: 1rem; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center;`;
          const statusColor = getStatusColor(task.status);
          item.innerHTML = `
                <div style="flex: 1;">
                    <div style="color: var(--text-main); font-weight: 500; font-size: 0.9rem;">${task.name}</div>
                    <div style="color: var(--text-muted); font-size: 0.75rem; margin-top: 2px;">${task.category || 'General'} • Due: ${task.dueDate || '-'}</div>
                </div>
                <div><span class="status-badge" style="background: ${statusColor}20; color: ${statusColor}; border: 1px solid ${statusColor}50;">${task.status}</span></div>
            `;
          listContainer.appendChild(item);
        });

        document.getElementById('individualPerfModal').classList.add('active');

        document.getElementById('nudgeEmployeeBtn').onclick = () => {
          showToast(`Nudge sent to ${assignee.name}!`);
        };
      }

      async function fetchGsmTasks(isInitial = false) {
        if (!isInitial) showToast('Refreshing tasks...', 'info');
        const tasks = await TaskDB.getTasks();
        cachedGsmTasks = tasks;
        if (!isInitial) {
          if (tasks.length === 0) {
            showToast('No tasks found in database.', 'info');
          } else {
            showToast(`Loaded ${tasks.length} tasks.`, 'success');
          }
        }
        renderGsmTasks();
      }

      function renderGsmTasks() {
        let gsmTasks = [...cachedGsmTasks];
        // Note: The backend filter might be added later, 
        // for now we'll do client-side filtering as before.

        const filterEmp = document.getElementById('gsmFilterEmployee');
        const filterTask = document.getElementById('gsmFilterTask');
        const filterHead = document.getElementById('gsmFilterHeading');
        const filterStatus = document.getElementById('gsmFilterStatus');
        const filterUrgent = document.getElementById('gsmFilterUrgent');

        if (!filterEmp) return;

        const empVal = filterEmp.value.toLowerCase();
        const taskVal = filterTask.value.toLowerCase();
        const headVal = filterHead.value;
        const statusVal = filterStatus.value;
        const urgentOnly = filterUrgent.checked;

        gsmTasks = gsmTasks.filter(t => {
          const matchesEmp = (t.assignee || '').toLowerCase().includes(empVal) || (t.assigneeId || '').toLowerCase().includes(empVal);
          const matchesTask = (t.name || '').toLowerCase().includes(taskVal);
          const matchesHead = headVal === 'ALL' || t.category === headVal;
          const matchesUrgent = !urgentOnly || t.isUrgent === true;
          return matchesEmp && matchesTask && matchesHead && matchesUrgent;
        });

        const total = gsmTasks.length;
        const completed = gsmTasks.filter(t => t.status === 'Done' || t.status === 'Complete').length;
        const pending = total - completed;
        const perf = total > 0 ? Math.round((completed / total) * 100) : 0;

        document.getElementById('gsmStatTotal').innerText = total;
        document.getElementById('gsmStatCompleted').innerText = completed;
        document.getElementById('gsmStatPending').innerText = pending;
        document.getElementById('gsmStatProductivity').innerText = perf + '%';

        let displayTasks = gsmTasks;
        if (statusVal !== 'ALL') {
          displayTasks = (statusVal === 'Pending') ? gsmTasks.filter(t => t.status !== 'Done' && t.status !== 'Complete') : gsmTasks.filter(t => t.status === 'Done' || t.status === 'Complete');
          // Removed the per-render status filter toast to avoid noise during live search
        }

        renderAssigneePerformance(gsmTasks);

        const tbody = document.getElementById('gsmTaskTableBody');
        if (!tbody) return;
        tbody.innerHTML = '';

        gsmCategories.forEach(cat => {
          if (headVal !== 'ALL' && headVal !== cat) return;
          let catTasks = displayTasks.filter(t => {
            const tCat = t.category || 'GENERAL';
            if (cat === 'GENERAL') {
              return tCat === 'GENERAL' || !gsmCategories.includes(tCat) || tCat === 'OTHERS';
            }
            return tCat === cat;
          });
          const isCollapsed = collapsedCategories.has(cat);

          const headRow = document.createElement('tr');
          headRow.className = 'category-header-row';
          headRow.innerHTML = `<td colspan="10"><i class="fa-solid ${isCollapsed ? 'fa-square-plus' : 'fa-square-minus'}" style="margin-right:10px;"></i> ${cat} (${catTasks.length})</td>`;
          headRow.onclick = () => { isCollapsed ? collapsedCategories.delete(cat) : collapsedCategories.add(cat); renderGsmTasks(); };
          tbody.appendChild(headRow);

          if (!isCollapsed) {
            if (catTasks.length === 0) {
              const emptyRow = document.createElement('tr');
              emptyRow.innerHTML = `<td colspan="10" style="padding:10px; text-align:center; color:#a6a6a6; font-size:0.8rem;">No tasks in this category</td>`;
              tbody.appendChild(emptyRow);
            } else {
              catTasks.forEach(task => {
                const statusColor = getStatusColor(task.status);
                const row = document.createElement('tr');
                row.className = 'task-row-clickable';
                row.innerHTML = `
                            <td>${task.assigneeId || '-'}</td>
                            <td>${task.assignee || '-'}</td>
                            <td>${task.ibu || '-'}</td>
                            <td>${task.assignedBy || 'Austin'}</td>
                            <td>${task.isUrgent ? '<span style="color:#f44336; font-weight:bold;">[URGENT] </span>' : ''}${task.name}</td>
                            <td>${task.timeAssigned || '-'}</td>
                            <td style="color:#f44336; font-weight:bold;">${task.dueDate || '-'}</td>
                            <td style="max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${task.comment || '-'}</td>
                            <td style="text-align:center;"><span class="status-badge" style="background:${statusColor}20; color:${statusColor}; border:1px solid ${statusColor}50;">${task.status}</span></td>
                            <td style="text-align:center;"><div style="display:flex; gap:5px; justify-content:center;">
                                <button class="edit-gsm-btn action-btn-sm" data-id="${task.id}"><i class="fa-solid fa-pen"></i></button>
                                <button class="delete-gsm-btn action-btn-sm delete-btn-sm" data-id="${task.id}"><i class="fa-solid fa-trash"></i></button>
                            </div></td>
                        `;
                row.onclick = (e) => { if (!e.target.closest('button')) openViewModal(task); };
                tbody.appendChild(row);
              });
            }
          }
        });

        tbody.querySelectorAll('.edit-gsm-btn').forEach(btn => {
          btn.onclick = async (e) => {
            e.stopPropagation();
            const tasks = await TaskDB.getTasks();
            const t = tasks.find(t => String(t.id) === String(btn.dataset.id));
            if (t) openModal(t);
          };
        });
        tbody.querySelectorAll('.delete-gsm-btn').forEach(btn => {
          btn.onclick = async (e) => {
            e.stopPropagation();
            if (confirm('Delete task?')) {
              await TaskDB.deleteTask(btn.dataset.id);
              fetchGsmTasks();
            }
          };
        });
      }

      let isEditing = false;
      let currentEditingId = null;

      function openModal(task = null) {
        isEditing = !!task;
        currentEditingId = task ? task.id : null;
        const modal = document.getElementById('taskModal');
        const form = document.getElementById('newTaskForm');
        modal.classList.add('active');
        if (task) {
          document.getElementById('taskName').value = task.name;
          document.getElementById('assignee').value = task.assignee;
          document.getElementById('empId').value = task.assigneeId;
          document.getElementById('timeAssigned').value = task.timeAssigned;
          document.getElementById('dueDate').value = task.dueDate;
          document.getElementById('taskStatus').value = task.status;
          document.getElementById('taskUrgent').checked = task.isUrgent;
          document.getElementById('taskComment').value = task.comment;
          document.getElementById('taskCategory').value = task.category || '';
        } else {
          form.reset();
          document.getElementById('timeAssigned').value = new Date().toISOString().split('T')[0];
        }
      }

      function closeModal() { document.getElementById('taskModal').classList.remove('active'); }
      function openViewModal(task) {
        document.getElementById('viewTaskName').innerText = task.name;
        document.getElementById('viewTaskId').innerText = task.id;
        document.getElementById('viewAssignee').innerText = task.assignee;
        document.getElementById('viewAssigneeId').innerText = task.assigneeId;
        document.getElementById('viewTimeAssigned').innerText = task.timeAssigned;
        document.getElementById('viewDueDate').innerText = task.dueDate;
        document.getElementById('viewAssignedBy').innerText = task.assignedBy;
        document.getElementById('viewComment').innerText = task.comment;
        document.getElementById('taskViewModal').classList.add('active');
      }

      const setupBtn = (id, fn) => {
        const el = document.getElementById(id);
        if (el) el.onclick = fn;
      };

      setupBtn('gsmNewTaskBtn', () => openModal());
      setupBtn('gsmRefreshTasksBtn', () => fetchGsmTasks());
      setupBtn('closeModalBtn', closeModal);
      setupBtn('cancelModalBtn', closeModal);
      setupBtn('closeViewModalBtn', () => document.getElementById('taskViewModal').classList.remove('active'));
      setupBtn('closeViewBtn', () => document.getElementById('taskViewModal').classList.remove('active'));
      setupBtn('closePerfModalBtn', () => document.getElementById('individualPerfModal').classList.remove('active'));
      setupBtn('closePerfModalBtn2', () => document.getElementById('individualPerfModal').classList.remove('active'));

      const taskForm = document.getElementById('newTaskForm');
      if (taskForm) {
        taskForm.onsubmit = async (e) => {
          e.preventDefault();
          const data = {
            id: isEditing ? currentEditingId : null,
            name: document.getElementById('taskName').value,
            assignee: document.getElementById('assignee').value,
            assigneeId: document.getElementById('empId').value,
            timeAssigned: document.getElementById('timeAssigned').value,
            dueDate: document.getElementById('dueDate').value,
            status: document.getElementById('taskStatus').value,
            isUrgent: document.getElementById('taskUrgent').checked,
            comment: document.getElementById('taskComment').value,
            category: document.getElementById('taskCategory').value,
            assignedBy: 'Austin'
          };
          const response = isEditing ? await TaskDB.updateTask(data) : await TaskDB.saveTask(data);
          if (response && response.ok) {
            showToast('Task saved successfully!');
            closeModal();
            fetchGsmTasks();
          } else {
            showToast('Failed: ' + (response.error || 'Server rejected request'), 'error');
          }
        };
      }

      const assigneeEl = document.getElementById('assignee');
      if (assigneeEl) {
        assigneeEl.addEventListener('input', (e) => {
          const name = e.target.value.toLowerCase();
          const emp = EmployeeDB.getEmployees().find(e => `${e.name} ${e.surname}`.toLowerCase() === name);
          const empIdEl = document.getElementById('empId');
          if (empIdEl) empIdEl.value = emp ? emp.id : '';
        });
      }

      document.addEventListener('click', (e) => {
        const btn = e.target.closest('.mxg-page-btn');
        if (btn && btn.dataset.page === '2') {
          setTimeout(() => fetchGsmTasks(true), 100);
        }
      });

      // Populate Datalist
      const employeeList = document.getElementById('employeeList');
      if (employeeList) {
        EmployeeDB.getEmployees().forEach(emp => {
          const opt = document.createElement('option');
          opt.value = `${emp.name} ${emp.surname}`;
          employeeList.appendChild(opt);
        });
      }

      // Add filter item listeners
      ['gsmFilterEmployee', 'gsmFilterTask', 'gsmFilterHeading', 'gsmFilterStatus'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', renderGsmTasks);
      });
      const filterUrgent = document.getElementById('gsmFilterUrgent');
      if (filterUrgent) filterUrgent.addEventListener('change', renderGsmTasks);

      // Initial Load
      fetchGsmTasks(true);

      window.renderGsmTasks = renderGsmTasks;

      /* ---------- DIAGNOSTICS & DEBUG ---------- */
      window.debugLog = function (msg, type = 'info') {
        const log = document.getElementById("debug-sync-log");
        if (!log) return;
        const entry = document.createElement("div");
        entry.style.marginTop = "4px";
        entry.style.borderBottom = "1px solid rgba(0,0,0,0.05)";
        entry.style.paddingBottom = "4px";

        let color = "#334155";
        if (type === 'error') color = "#ef4444";
        if (type === 'success') color = "#10b981";
        if (type === 'sync') color = "#3b82f6";

        const time = new Date().toLocaleTimeString();
        entry.innerHTML = `<span style="color:#64748b; font-weight:700;">[${time}]</span> <span style="color:${color}">${msg}</span>`;
        log.prepend(entry);
      };

      window.loadDebugInfo = async function () {
        try {
          if (!window.frappeAPI) return;
          const status = await window.frappeAPI.getSyncStatus();

          // Update Overall Stats
          const onlineEl = document.getElementById("debug-online-state");
          const syncTimeEl = document.getElementById("debug-last-sync");
          const queueEl = document.getElementById("debug-pending-queue");

          if (onlineEl) {
            onlineEl.textContent = status.online ? "ONLINE" : "OFFLINE";
            onlineEl.className = status.online ? "badge-blue" : "badge-red";
          }
          if (syncTimeEl) syncTimeEl.textContent = status.lastSync ? new Date(status.lastSync).toLocaleString() : "Never";
          if (queueEl) queueEl.textContent = status.pendingCount || "0";

          // Update Cache Stats
          const statsEl = document.getElementById("debug-cache-stats");
          if (statsEl) {
            const stats = status.stats || {};
            const keys = {
              'hot_leads': '🔥 Hot Leads',
              'machine_stock': '📦 Machine Stock',
              'quotations': '📄 Quotations',
              'orders': '📦 Orders (FMB)',
              'customers': '👥 Customers',
              'group_sales': '📊 Sales',
              'enquiries': '❓ Enquiries',
              'products': '📦 Products Catalog',
              'brands': '🏷️ Brands',
              'item_groups': '📁 Item Groups'
            };

            statsEl.innerHTML = "";
            Object.entries(keys).forEach(([key, label]) => {
              const count = stats[key] || 0;
              const row = document.createElement("div");
              row.style.display = "flex";
              row.style.justifyContent = "space-between";
              row.style.padding = "8px 0";
              row.style.borderBottom = "1px solid rgba(0,0,0,0.05)";
              row.innerHTML = `<span>${label}</span><span style="font-weight:800; color:var(--accent);">${count}</span>`;
              statsEl.appendChild(row);
            });
          }
        } catch (e) {
          window.debugLog(`Error loading diagnostics: ${e.message}`, 'error');
        }
      };

      window.runFullSync = async function () {
        window.debugLog("Starting full system sync...", 'sync');
        try {
          if (!window.frappeAPI) throw new Error("API not available");
          const res = await window.frappeAPI.fullSync();
          if (res.ok) {
            window.debugLog("Full sync completed successfully!", 'success');
            await window.loadDebugInfo();
          } else {
            throw new Error(res.error || "Sync failed");
          }
        } catch (e) {
          window.debugLog(`Sync failed: ${e.message}`, 'error');
        }
      };

      window.clearLocalCache = async function () {
        if (!confirm("Clear entire LOCAL CACHE?")) return;
        alert("Feature requires main process restart. Please restart Omnis.");
      };

      // ---------------------------------------------------------
      //  UI Restoration: Sidebar Triggers for Stock & GSM
      // ---------------------------------------------------------
      document.addEventListener('DOMContentLoaded', () => {
        // GSM Report trigger
        const gsmNavItem = document.querySelector('.nav-item[data-view="view-salestrack-reports"]');
        if (gsmNavItem) {
          gsmNavItem.addEventListener('click', () => {
            if (window.loadReport) window.loadReport(true);
          });
        }

        // Stock Pipeline trigger
        const stockNavItem = document.querySelector('.nav-item[data-view="view-stock"]');
        if (stockNavItem) {
          stockNavItem.addEventListener('click', () => {
            if (window.renderStockTab) window.renderStockTab();
          });
        }
      });
    })();
  