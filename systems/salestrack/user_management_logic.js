window.salestrack_users = {
    loadUsers: async function() {
        const tbody = document.getElementById('user-management-tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">Loading users...</td></tr>';
        
        try {
            const res = await window.electronAPI.invoke('supabase:getUsers');
            if (!res.ok) {
                tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px; color:red;">Error loading users: ${res.error}</td></tr>`;
                return;
            }
            
            this.renderUsers(res.users);
        } catch (e) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px; color:red;">Error: ${e.message}</td></tr>`;
        }
    },
    
    renderUsers: function(users) {
        const tbody = document.getElementById('user-management-tbody');
        tbody.innerHTML = '';
        
        const AVAILABLE_SYSTEMS = [
            'salestrack', 
            'powertrack', 
            'fleetrack', 
            'group_accounts', 
            'medicals',
            'support'
        ];
        
        users.forEach(u => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid #e2e8f0';
            
            const systems = u.systems || [];
            
            let systemCheckboxes = AVAILABLE_SYSTEMS.map(sys => {
                const checked = systems.includes(sys) ? 'checked' : '';
                return `
                    <label style="display:inline-flex; align-items:center; margin-right:12px; font-size:13px; cursor:pointer;">
                        <input type="checkbox" onchange="window.salestrack_users.toggleSystem('${u.id}', '${sys}', this.checked)" ${checked} style="margin-right:4px;">
                        ${sys}
                    </label>
                `;
            }).join('');
            
            tr.innerHTML = `
                <td style="padding: 16px; font-size: 14px; font-weight: 500; color: #0f172a;">${u.email}</td>
                <td style="padding: 16px;">
                    <select onchange="window.salestrack_users.toggleAdmin('${u.id}', this.value === 'true')" style="padding:4px; border-radius:4px; border:1px solid #cbd5e1; cursor:pointer;">
                        <option value="false" ${!u.is_admin ? 'selected' : ''}>User</option>
                        <option value="true" ${u.is_admin ? 'selected' : ''}>Admin</option>
                    </select>
                </td>
                <td style="padding: 16px;">
                    <div style="display:flex; flex-wrap:wrap; gap:4px;">
                        ${systemCheckboxes}
                    </div>
                </td>
                <td style="padding: 16px;">
                    <button onclick="window.salestrack_users.saveUser('${u.id}')" class="btn-primary" style="padding: 6px 12px; border-radius: 6px; font-size: 12px; display:none; cursor:pointer;" id="save-btn-${u.id}">Save</button>
                    <span id="status-${u.id}" style="font-size:12px; color:green; display:none; font-weight:600;">Saved!</span>
                </td>
            `;
            
            this.userStates[u.id] = {
                is_admin: u.is_admin,
                systems: [...systems]
            };
            
            tbody.appendChild(tr);
        });
    },
    
    userStates: {},
    
    toggleSystem: function(userId, sys, isChecked) {
        if (!this.userStates[userId]) return;
        
        let systems = this.userStates[userId].systems;
        if (isChecked && !systems.includes(sys)) {
            systems.push(sys);
        } else if (!isChecked && systems.includes(sys)) {
            systems = systems.filter(s => s !== sys);
        }
        
        this.userStates[userId].systems = systems;
        document.getElementById(`save-btn-${userId}`).style.display = 'inline-block';
    },
    
    toggleAdmin: function(userId, isAdmin) {
        if (!this.userStates[userId]) return;
        this.userStates[userId].is_admin = isAdmin;
        document.getElementById(`save-btn-${userId}`).style.display = 'inline-block';
    },
    
    saveUser: async function(userId) {
        const state = this.userStates[userId];
        if (!state) return;
        
        const btn = document.getElementById(`save-btn-${userId}`);
        const status = document.getElementById(`status-${userId}`);
        
        btn.disabled = true;
        btn.innerText = 'Saving...';
        
        try {
            const res = await window.electronAPI.invoke('supabase:updateUserAccess', {
                user_id: userId,
                is_admin: state.is_admin,
                systems: state.systems
            });
            
            if (res.ok) {
                btn.style.display = 'none';
                status.style.display = 'inline-block';
                status.innerText = 'Saved!';
                setTimeout(() => status.style.display = 'none', 3000);
            } else {
                alert('Error saving: ' + res.error);
                status.style.display = 'inline-block';
                status.style.color = 'red';
                status.innerText = 'Error';
            }
        } catch (e) {
            alert('Error saving: ' + e.message);
        } finally {
            btn.disabled = false;
            btn.innerText = 'Save';
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const originalSwitchToView = window.switchToView;
    if (originalSwitchToView) {
        window.switchToView = function(viewId, title) {
            originalSwitchToView(viewId, title);
            if (viewId === 'view-user-management') {
                window.salestrack_users.loadUsers();
            }
        };
    }
});
