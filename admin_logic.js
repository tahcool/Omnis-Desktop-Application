document.addEventListener('DOMContentLoaded', () => {


  // Tab Switching
  const navItems = document.querySelectorAll('.nav-item');
  const viewPanels = document.querySelectorAll('.view-panel');
  const frameWrapper = document.getElementById('system-frame-wrapper');
  
  function switchTab(targetId) {
    // Hide iframe wrapper
    frameWrapper.classList.remove('active');
    
    // Update active nav
    navItems.forEach(n => {
      if (n.dataset.target === targetId) n.classList.add('active');
      else n.classList.remove('active');
    });
    
    // Update active panel
    viewPanels.forEach(p => {
      if (p.id === targetId) p.classList.add('active');
      else p.classList.remove('active');
    });
  }

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      switchTab(item.dataset.target);
    });
  });

  // Inner Tab Switching (for Salestrack settings)
  const innerTabs = document.querySelectorAll('.inner-tab');
  const innerPanels = document.querySelectorAll('.inner-panel');

  innerTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Deactivate all
      innerTabs.forEach(t => t.classList.remove('active'));
      innerPanels.forEach(p => p.classList.remove('active'));
      
      // Activate clicked
      tab.classList.add('active');
      const targetPanel = document.getElementById(tab.dataset.subtarget);
      if (targetPanel) targetPanel.classList.add('active');
    });
  });

  // System Switcher (button-based)
  const sysButtons = document.querySelectorAll('.sys-btn[data-system]');
  const btnCloseSystem = document.getElementById('btn-close-system');
  const systemFrame = document.getElementById('system-frame');

  sysButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const url = btn.dataset.system;
      // Toggle: if already active, close it
      if (btn.classList.contains('active')) {
        closeSystem();
        return;
      }
      // Deactivate all, activate this one
      sysButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      systemFrame.src = url;
      frameWrapper.classList.add('active');
      btnCloseSystem.style.display = 'inline-flex';
    });
  });

  function closeSystem() {
    frameWrapper.classList.remove('active');
    systemFrame.src = 'about:blank';
    sysButtons.forEach(b => b.classList.remove('active'));
    btnCloseSystem.style.display = 'none';
  }

  btnCloseSystem.addEventListener('click', closeSystem);

  // Logout
  document.getElementById('btn-logout').addEventListener('click', async () => {
    localStorage.removeItem("omnis_is_admin");
    localStorage.removeItem("omnis_admin_systems");
    localStorage.removeItem("omnisUser");
    localStorage.removeItem("supabase_access_token");
    if (window.electron && window.electron.invoke) {
       await window.electron.invoke('supabase:signOut');
       await window.electron.invoke('window:openLogin');
    } else {
       window.location.href = 'index.html';
    }
  });

  // User Management
  const btnRefresh = document.getElementById('btn-refresh-users');
  const tbody = document.getElementById('users-tbody');
  const searchInput = document.getElementById('users-search');
  const filterRole = document.getElementById('users-filter-role');
  const filterSystem = document.getElementById('users-filter-system');
  const btnClearFilters = document.getElementById('btn-clear-filters');
  const usersCount = document.getElementById('users-count');
  
  function getFilteredUsers() {
    if (!window.activeUsers) return [];
    const query = (searchInput.value || '').toLowerCase().trim();
    const role = filterRole.value;
    const system = filterSystem.value;
    
    return window.activeUsers.filter(u => {
      // Search filter
      if (query && !(u.email || '').toLowerCase().includes(query)) return false;
      // Role filter
      if (role === 'admin' && !u.is_admin) return false;
      if (role === 'standard' && u.is_admin) return false;
      // System filter
      if (system === 'none' && u.systems && u.systems.length > 0) return false;
      if (system && system !== 'none' && (!u.systems || !u.systems.includes(system))) return false;
      return true;
    });
  }
  
  function renderUsers(filtered) {
    if (!window.activeUsers || window.activeUsers.length === 0) return;
    
    // Update counter
    const total = window.activeUsers.length;
    const shown = filtered.length;
    usersCount.textContent = shown === total ? `${total} users` : `${shown} of ${total} users`;
    
    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:32px; color:var(--text-muted);"><i class="fas fa-filter" style="margin-right:6px;"></i>No users match the current filters.</td></tr>';
      return;
    }
    
    tbody.innerHTML = filtered.map(u => {
      // Find original index for editUser
      const index = window.activeUsers.indexOf(u);
      const roleHtml = u.is_admin 
        ? '<span class="pill admin">Admin</span>' 
        : '<span class="pill">Standard</span>';
      
      const sysHtml = u.systems && u.systems.length > 0
        ? u.systems.map(s => `<span class="pill">${s}</span>`).join('')
        : '<span style="font-size:11px; color:#94a3b8;">No Access</span>';
        
      return `
        <tr>
          <td style="font-weight:600;">${u.email}</td>
          <td>${roleHtml}</td>
          <td>${sysHtml}</td>
          <td>
            <button class="btn secondary" style="padding:4px 8px; font-size:11px;" onclick="window.editUser(${index})">Edit</button>
          </td>
        </tr>
      `;
    }).join('');
  }
  
  function applyFilters() {
    renderUsers(getFilteredUsers());
  }
  
  // Debounced search
  let searchTimer;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(applyFilters, 150);
  });
  filterRole.addEventListener('change', applyFilters);
  filterSystem.addEventListener('change', applyFilters);
  btnClearFilters.addEventListener('click', () => {
    searchInput.value = '';
    filterRole.value = '';
    filterSystem.value = '';
    applyFilters();
  });
  
  async function loadUsers() {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:32px; color:var(--text-muted);">Loading users...</td></tr>';
    usersCount.textContent = '';
    try {
      if (!window.electron || !window.electron.invoke) throw new Error("Electron bridge not available");
      const res = await window.electron.invoke('supabase:getUsers');
      
      if (!res.ok) throw new Error(res.error);
      
      if (res.users.length === 0) {
         tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:32px; color:var(--text-muted);">No users found.</td></tr>';
         usersCount.textContent = '0 users';
         return;
      }
      
      window.activeUsers = res.users;
      applyFilters();
      
    } catch(err) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:32px; color:var(--primary);">Error: ${err.message}</td></tr>`;
    }
  }

  btnRefresh.addEventListener('click', loadUsers);
  
  // Create User
  const btnCreate = document.getElementById('btn-create-user');
  const statusCreate = document.getElementById('create-user-status');
  
  btnCreate.addEventListener('click', async () => {
    const email = document.getElementById('new-user-email').value.trim();
    const password = document.getElementById('new-user-pwd').value;
    const isAdmin = document.getElementById('new-user-admin').checked;
    
    const checkboxes = document.querySelectorAll('#system-checkboxes input[type="checkbox"]:checked');
    const systems = Array.from(checkboxes).map(c => c.value);
    
    if (!email || password.length < 6) {
      statusCreate.style.color = 'var(--primary)';
      statusCreate.textContent = 'Please provide a valid email and password (min 6 chars).';
      return;
    }
    
    btnCreate.disabled = true;
    statusCreate.style.color = 'var(--text-muted)';
    statusCreate.textContent = 'Creating user...';
    
    try {
      const res = await window.electron.invoke('supabase:createUser', { email, password, is_admin: isAdmin, systems });
      if (!res.ok) throw new Error(res.error);
      
      statusCreate.style.color = '#10b981'; // green
      statusCreate.textContent = 'User created successfully!';
      
      // Clear form
      document.getElementById('new-user-email').value = '';
      document.getElementById('new-user-pwd').value = '';
      document.getElementById('new-user-admin').checked = false;
      document.querySelectorAll('#system-checkboxes input[type="checkbox"]').forEach(c => c.checked = false);
      
      loadUsers();
      
    } catch(err) {
      statusCreate.style.color = 'var(--primary)';
      statusCreate.textContent = 'Error: ' + err.message;
    } finally {
      btnCreate.disabled = false;
    }
  });

  // Edit User Modal Logic
  const editModal = document.getElementById('edit-user-modal');
  const btnCloseEditModal = document.getElementById('btn-close-edit-modal');
  const btnCancelEdit = document.getElementById('btn-cancel-edit');
  const btnSaveEdit = document.getElementById('btn-save-edit');
  const statusEdit = document.getElementById('edit-user-status');
  
  const pwdStatus = document.getElementById('password-action-status');
  const btnSendResetEmail = document.getElementById('btn-send-reset-email');
  const btnSetPassword = document.getElementById('btn-set-password');
  const btnTogglePwdVis = document.getElementById('btn-toggle-pwd-vis');
  const newPwdInput = document.getElementById('edit-user-new-pwd');
  
  function closeEditModal() {
    editModal.classList.remove('active');
    statusEdit.textContent = '';
    pwdStatus.textContent = '';
    newPwdInput.value = '';
    newPwdInput.type = 'password';
    btnTogglePwdVis.querySelector('i').className = 'fas fa-eye';
  }

  btnCloseEditModal.addEventListener('click', closeEditModal);
  btnCancelEdit.addEventListener('click', closeEditModal);

  window.editUser = function(index) {
    if (!window.activeUsers || !window.activeUsers[index]) return;
    const user = window.activeUsers[index];
    
    document.getElementById('edit-user-id').value = user.id;
    document.getElementById('edit-user-email').value = user.email;
    document.getElementById('edit-user-admin').checked = !!user.is_admin;
    
    document.querySelectorAll('#edit-system-checkboxes input[type="checkbox"]').forEach(c => {
      c.checked = user.systems && user.systems.includes(c.value);
    });
    
    statusEdit.textContent = '';
    pwdStatus.textContent = '';
    newPwdInput.value = '';
    editModal.classList.add('active');
  };

  btnSaveEdit.addEventListener('click', async () => {
    const userId = document.getElementById('edit-user-id').value;
    if (!userId) return;
    
    const isAdmin = document.getElementById('edit-user-admin').checked;
    const checkboxes = document.querySelectorAll('#edit-system-checkboxes input[type="checkbox"]:checked');
    const systems = Array.from(checkboxes).map(c => c.value);
    
    btnSaveEdit.disabled = true;
    statusEdit.style.color = 'var(--text-muted)';
    statusEdit.textContent = 'Saving changes...';
    
    try {
      const res = await window.electron.invoke('supabase:updateUserAccess', { user_id: userId, is_admin: isAdmin, systems });
      if (!res.ok) throw new Error(res.error || 'Failed to update user');
      
      statusEdit.style.color = '#10b981';
      statusEdit.textContent = 'Changes saved successfully!';
      
      setTimeout(() => {
        closeEditModal();
        loadUsers();
      }, 1000);
    } catch(err) {
      statusEdit.style.color = 'var(--primary)';
      statusEdit.textContent = 'Error: ' + err.message;
    } finally {
      btnSaveEdit.disabled = false;
    }
  });

  // Password visibility toggle
  btnTogglePwdVis.addEventListener('click', () => {
    const isHidden = newPwdInput.type === 'password';
    newPwdInput.type = isHidden ? 'text' : 'password';
    btnTogglePwdVis.querySelector('i').className = isHidden ? 'fas fa-eye-slash' : 'fas fa-eye';
  });

  // Send Password Reset Email
  btnSendResetEmail.addEventListener('click', async () => {
    const email = document.getElementById('edit-user-email').value;
    if (!email) return;
    
    btnSendResetEmail.disabled = true;
    pwdStatus.style.color = 'var(--text-muted)';
    pwdStatus.textContent = 'Sending reset email...';
    
    try {
      const res = await window.electron.invoke('supabase:resetUserPassword', { email });
      if (!res.ok) throw new Error(res.error || 'Failed to send reset email');
      
      pwdStatus.style.color = '#10b981';
      pwdStatus.innerHTML = '<i class="fas fa-check-circle"></i> Password reset email sent to ' + email;
    } catch(err) {
      pwdStatus.style.color = 'var(--primary)';
      pwdStatus.textContent = 'Error: ' + err.message;
    } finally {
      btnSendResetEmail.disabled = false;
    }
  });

  // Set Password Directly
  btnSetPassword.addEventListener('click', async () => {
    const userId = document.getElementById('edit-user-id').value;
    const password = newPwdInput.value;
    
    if (!userId) return;
    if (!password || password.length < 6) {
      pwdStatus.style.color = 'var(--primary)';
      pwdStatus.textContent = 'Password must be at least 6 characters.';
      return;
    }
    
    btnSetPassword.disabled = true;
    pwdStatus.style.color = 'var(--text-muted)';
    pwdStatus.textContent = 'Setting password...';
    
    try {
      const res = await window.electron.invoke('supabase:setPasswordDirect', { userId, password });
      if (!res.ok) throw new Error(res.error || 'Failed to set password');
      
      pwdStatus.style.color = '#10b981';
      pwdStatus.innerHTML = '<i class="fas fa-check-circle"></i> Password updated successfully!';
      newPwdInput.value = '';
    } catch(err) {
      pwdStatus.style.color = 'var(--primary)';
      pwdStatus.textContent = 'Error: ' + err.message;
    } finally {
      btnSetPassword.disabled = false;
    }
  });

  // Initial Load
  setTimeout(loadUsers, 500);
});
