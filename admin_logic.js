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

  // System Switcher
  const sysSwitcher = document.getElementById('sys-switcher');
  const btnCloseSystem = document.getElementById('btn-close-system');
  const systemFrame = document.getElementById('system-frame');

  sysSwitcher.addEventListener('change', (e) => {
    const url = e.target.value;
    if (url) {
      systemFrame.src = url;
      frameWrapper.classList.add('active');
      btnCloseSystem.style.display = 'inline-block';
    }
  });

  btnCloseSystem.addEventListener('click', () => {
    frameWrapper.classList.remove('active');
    systemFrame.src = 'about:blank';
    sysSwitcher.selectedIndex = 0;
    btnCloseSystem.style.display = 'none';
  });

  // Logout
  document.getElementById('btn-logout').addEventListener('click', async () => {
    localStorage.removeItem("omnis_is_admin");
    localStorage.removeItem("omnis_admin_systems");
    localStorage.removeItem("omnisUser");
    localStorage.removeItem("supabase_access_token");
    if (window.electron && window.electron.invoke) {
       await window.electron.invoke('supabase:signOut');
    }
    window.location.href = 'index.html';
  });

  // User Management
  const btnRefresh = document.getElementById('btn-refresh-users');
  const tbody = document.getElementById('users-tbody');
  
  async function loadUsers() {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:32px; color:var(--text-muted);">Loading users...</td></tr>';
    try {
      if (!window.electron || !window.electron.invoke) throw new Error("Electron bridge not available");
      const res = await window.electron.invoke('supabase:getUsers');
      
      if (!res.ok) throw new Error(res.error);
      
      if (res.users.length === 0) {
         tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:32px; color:var(--text-muted);">No users found.</td></tr>';
         return;
      }
      
      tbody.innerHTML = res.users.map(u => {
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
              <button class="btn secondary" style="padding:4px 8px; font-size:11px;" onclick="alert('Edit user coming soon!')">Edit</button>
            </td>
          </tr>
        `;
      }).join('');
      
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

  // Initial Load
  setTimeout(loadUsers, 500);
});
