
    const OMNIS_SYSTEMS = [
      { key: "fleetrack", name: "Fleetrack", baseUrl: "https://fleetrack.machinery-exchange.com" },
      { key: "salestrack", name: "Salestrack", baseUrl: "https://salestrack.powerstar.co.zw" },
      { key: "engtrack", name: "Engtrack", baseUrl: "https://engtrack.machinery-exchange.com" },
      { key: "powertrack", name: "Powertrack", baseUrl: "https://powertrack.powerstar.co.zw" },
      { key: "spe", name: "SPE", baseUrl: "https://omnis.spareparts-exchange.com" },
      { key: "medicals", name: "Clinic / Medicals", baseUrl: "https://salestrack.powerstar.co.zw" },
    ];

    const LS_REMEMBER = "omnisRemember";
    const LS_USER = "omnisUser";
    const LS_PWD = "omnisPwd";

    const loginView = document.getElementById("login-view");
    const form = document.getElementById("omnis-login");
    const emailInput = document.getElementById("login-email");
    const pwdInput = document.getElementById("login-password");
    const showPw = document.getElementById("show-password");
    const rememberMe = document.getElementById("remember-me");
    const forgotLink = document.getElementById("forgot-password-link");
    const statusEl = document.getElementById("login-status");
    const submitBtn = document.getElementById("login-submit");
    const splashOverlay = document.getElementById("splash-overlay");
    const splashText = document.getElementById("splash-text");
    const splashBar = document.getElementById("splash-bar-inner");

    /* ---------- SECURITY & IDLE LOGIC ---------- */
    const IDLE_TIMEOUT = 15 * 60 * 1000; // 15 minutes
    const WARNING_BUFFER = 60 * 1000; // 1 minute warning
    let idleTimer;
    let warningTimer;

    function resetIdleTimer() {
        if (!loginView.classList.contains('hidden')) return; 
        
        clearTimeout(idleTimer);
        clearTimeout(warningTimer);

        // Warning at 14 minutes
        warningTimer = setTimeout(() => {
            showInactivityWarning();
        }, IDLE_TIMEOUT - WARNING_BUFFER);

        // Logout at 15 minutes
        idleTimer = setTimeout(() => {
            console.log("Idle timeout reached. Logging out...");
            window.frappeAPI.close(); 
        }, IDLE_TIMEOUT);
    }

    function showInactivityWarning() {
        const overlay = document.getElementById('inactivity-warning-overlay');
        if (overlay) overlay.classList.remove('hidden');
        
        let secondsLeft = 60;
        const countdownEl = document.getElementById('inactivity-countdown');
        if (countdownEl) countdownEl.innerText = secondsLeft;

        const countdownInterval = setInterval(() => {
            secondsLeft--;
            if (countdownEl) countdownEl.innerText = secondsLeft;
            if (secondsLeft <= 0 || overlay.classList.contains('hidden')) {
                clearInterval(countdownInterval);
            }
        }, 1000);
    }

    function dismissInactivityWarning() {
        const overlay = document.getElementById('inactivity-warning-overlay');
        if (overlay) overlay.classList.add('hidden');
        resetIdleTimer();
    }

    // Interaction listeners for idle tracking
    ['mousemove', 'mousedown', 'keypress', 'touchstart', 'scroll'].forEach(evt => {
        window.addEventListener(evt, resetIdleTimer, true);
    });

    const securityModal = document.getElementById('security-reminder');
    const SECURITY_TIPS = [
        "Never share your password with anyone, including support staff.",
        "Always lock your machine when stepping away from your desk.",
        "Verify the source of emails before clicking any suspicious links.",
        "Use multi-factor authentication where available for maximum security.",
        "Report any suspicious system activity to your administrator immediately."
    ];

    function checkSecurityReminder() {
        const lastShown = localStorage.getItem('omnis_security_last');
        const today = new Date().toDateString();

        if (lastShown !== today) {
            // Pick a random tip
            const tip = SECURITY_TIPS[Math.floor(Math.random() * SECURITY_TIPS.length)];
            document.getElementById('security-tip').innerText = tip;
            
            securityModal.classList.add('active');
        } else {
            // Already shown today, proceed
            onSecurityAcknowledged();
        }
    }

    function acknowledgeSecurity() {
        const today = new Date().toDateString();
        localStorage.setItem('omnis_security_last', today);
        securityModal.classList.remove('active');
        onSecurityAcknowledged();
    }

    function onSecurityAcknowledged() {
        if (!pendingUrl) return;
        const target = pendingUrl;
        pendingUrl = null;

        if (window.frappeAPI && window.frappeAPI.openDashboard) {
            window.frappeAPI.openDashboard(target);
        } else {
            window.location.href = target;
        }
    }

    let pendingUrl = null;
    
    // ✅ AUTO-UPDATER LISTENER
    let isDownloadingUpdate = false;
    if (window.electron && window.electron.on) {
      window.electron.on('update-message', (event, data) => {
        const txt = document.getElementById('inline-update-text');
        const bar = document.getElementById('inline-update-progress-bar');
        const container = document.getElementById('inline-update-progress-container');
        const loginBtn = document.getElementById('login-submit');

        if (!txt) return;

        if (data.text && data.type !== 'progress') {
            txt.innerText = data.text;
        }

        if (data.type === 'progress') {
          isDownloadingUpdate = true;
          if (loginBtn) {
              loginBtn.disabled = true;
              loginBtn.innerText = "Downloading Update...";
          }
          container.style.display = 'block';
          if (data.progress) {
             let downloadedMB = (data.progress.transferred / 1048576).toFixed(2);
             let totalMB = (data.progress.total / 1048576).toFixed(2);
             let speedMBps = (data.progress.bytesPerSecond / 1048576).toFixed(2);
             
             let etaSeconds = 0;
             if (data.progress.bytesPerSecond > 0) {
                 etaSeconds = Math.round((data.progress.total - data.progress.transferred) / data.progress.bytesPerSecond);
             }
             let etaFormatted = etaSeconds > 60 ? Math.floor(etaSeconds/60) + 'm ' + (etaSeconds%60) + 's' : etaSeconds + 's';

             txt.innerText = `${downloadedMB}MB / ${totalMB}MB | ${speedMBps} MB/s | ETA: ${etaFormatted}`;
             bar.style.width = data.progress.percent + '%';
          }
        } else if (data.type === 'downloaded') {
          isDownloadingUpdate = true; // Keep it blocked
          container.style.display = 'none';
          txt.style.color = '#34d399';
          txt.innerText = "Update Downloaded. Restarting...";
          if (loginBtn) {
              loginBtn.disabled = true;
              loginBtn.innerText = "Restarting to Update...";
          }
        } else if (data.type === 'uptodate' || data.type === 'error') {
          isDownloadingUpdate = false;
          if (loginBtn && loginBtn.innerText.includes("Update")) {
              loginBtn.disabled = false;
              loginBtn.innerText = "Sign in";
          }
          txt.innerText = data.type === 'uptodate' ? "System is up to date" : "Update check complete";
          setTimeout(() => {
              const updaterUI = document.getElementById('inline-updater');
              if (updaterUI && !isDownloadingUpdate) {
                  updaterUI.style.transition = 'opacity 0.5s ease';
                  updaterUI.style.opacity = '0';
                  setTimeout(() => {
                      updaterUI.style.display = 'none';
                  }, 500);
              }
          }, 2500);
        } else if (data.type === 'checking-for-update' || data.type === 'update-available') {
            isDownloadingUpdate = true; // Prevent the 5s safety from hiding it just yet
        }
      });

      // SAFETY: Hide update text after 5s ONLY if we are not actively downloading
      setTimeout(() => {
          if (isDownloadingUpdate) return;
          const updaterUI = document.getElementById('inline-updater');
          if (updaterUI && updaterUI.style.display !== 'none') {
              updaterUI.style.transition = 'opacity 0.5s ease';
              updaterUI.style.opacity = '0';
              setTimeout(() => { updaterUI.style.display = 'none'; }, 500);
          }
      }, 5000);
    }

    // ✅ Dynamic Version Update
    if (window.electron && window.electron.getVersion) {
        window.electron.getVersion().then(v => {
            const vLabel = document.getElementById('login-version');
            if (vLabel) vLabel.innerText = `V${v}-STABLE`;
        });
    }

    const TECHNICAL_JARGON = [
      "Establishing cryptographic handshake…",
      "Requesting TGT from Kerberos…",
      "Validating JWT signature…",
      "Parsing BGP routing tables…",
      "Handshaking with node clusters…",
      "Initializing secure tunnel (TLS 1.3)…",
      "Querying distributed Hashmap…",
      "Verifying zero-knowledge proofs…",
      "Synchronizing entropy pools…",
      "Executing cold-start routines…"
    ];

    function getRandomJargon() {
      return TECHNICAL_JARGON[Math.floor(Math.random() * TECHNICAL_JARGON.length)];
    }

    function setStatus(text, cls) {
      statusEl.textContent = text || "";
      statusEl.className = "login-status" + (cls ? " " + cls : "");
    }

    function showSplash(message, progress) {
      splashOverlay.classList.remove("hidden");
      splashText.textContent = message || "Connecting to Omnis…";
      if (typeof progress === "number") {
        const clamped = Math.max(0, Math.min(100, progress));
        splashBar.style.width = clamped + "%";
      }
    }

    function updateSplash(message, progress) {
      if (message) splashText.textContent = message;
      if (typeof progress === "number") {
        const clamped = Math.max(0, Math.min(100, progress));
        splashBar.style.width = clamped + "%";
      }
    }

    function hideSplash() { splashOverlay.classList.add("hidden"); }

    function runInitialSplash() {
      const messages = [
        "Booting Omnis engine…",
        "Initialising secure session…",
        "Syncing dashboards…",
        "Linking systems…",
        "Ready."
      ];
      let i = 0;
      showSplash(messages[0], 10);
      const interval = setInterval(() => {
        i++;
        if (i >= messages.length) {
          clearInterval(interval);
          setTimeout(() => hideSplash(), 400);
          return;
        }
        updateSplash(messages[i], (i / messages.length) * 100);
      }, 500);
    }

    // Initial
    runInitialSplash();

    /* Login interactions */
    showPw.addEventListener("change", () => { pwdInput.type = showPw.checked ? "text" : "password"; });
    forgotLink.addEventListener("click", async (e) => { 
        e.preventDefault(); 
        const email = prompt("Please enter your email address to receive password reset instructions:");
        if (!email) return;

        setStatus("Sending reset instructions...", "info");
        try {
            // Try Supabase reset first (for Fleetrack users)
            if (window.electron && window.electron.invoke) {
                const res = await window.electron.invoke('supabase:resetPwd', { email });
                if (res.ok) {
                    setStatus("Reset instructions sent! Check your inbox.", "success");
                    return;
                }
            }
            // Fallback: Salestrack Frappe reset
            const sys = OMNIS_SYSTEMS.find(s => s.key === "salestrack") || OMNIS_SYSTEMS[0];
            const url = sys.baseUrl + "/api/method/powerstar_salestrack.omnis_dashboard.trigger_password_reset";
            const params = new URLSearchParams();
            params.append('user_email', email);
            const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: params.toString() });
            const data = await res.json();
            if (data.message && data.message.ok) {
                setStatus("Instructions sent! Check your inbox.", "success");
            } else {
                setStatus("Error: " + (data.message?.error || "User not found"), "error");
            }
        } catch (err) {
            setStatus("Could not connect to reset service.", "error");
        }
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const usr = emailInput.value.trim();
      const pwd = pwdInput.value.trim();
      if (!usr || !pwd) {
        setStatus("Please enter email and password.", "error");
        return;
      }
      submitBtn.disabled = true;
      tryLoginSequentially(usr, pwd, false);
    });

    async function tryLoginSequentially(usr, pwd, silentAuto = false) {
      const total = OMNIS_SYSTEMS.length;
      showSplash(getRandomJargon(), 10);
      
      const feed = document.getElementById("system-feed");
      feed.innerHTML = OMNIS_SYSTEMS.map(s => `
        <div class="system-item" id="sys-row-${s.key}">
          <span>${s.name}</span>
          <span class="status-indicator">...</span>
        </div>
      `).join('');

      let lastError = "";

      // 🔐 ADMIN / GH05T: Intercept login for Admin Dashboard
      if (usr === "gh05t") {
        const adminEmail = "gh05t@omnis.local";
        let res = await window.electron.invoke('supabase:signIn', { email: adminEmail, password: pwd });
        if (!res.ok && res.error && res.error.includes("Invalid login credentials")) {
           const createRes = await window.electron.invoke('supabase:createUser', { 
             email: adminEmail, password: pwd, is_admin: true, 
             systems: ["fleetrack", "salestrack", "powertrack", "engtrack", "spe", "medicals"] 
           });
           if (createRes.ok) {
               res = await window.electron.invoke('supabase:signIn', { email: adminEmail, password: pwd });
           } else {
               setStatus("Admin Setup Failed: " + createRes.error, "error");
               submitBtn.disabled = false;
               return;
           }
        }
        if (!res.ok) {
            setStatus(res.error || "Invalid credentials", "error");
            submitBtn.disabled = false;
            return;
        }
        
        localStorage.setItem("omnisUser", usr);
        localStorage.setItem("supabase_access_token", res.access_token);
        localStorage.setItem("omnis_is_admin", "true");
        localStorage.setItem("omnis_admin_systems", JSON.stringify(res.user.systems || []));
        
        if (rememberMe.checked || silentAuto) {
          localStorage.setItem(LS_REMEMBER, "1");
          localStorage.setItem(LS_USER, usr);
          localStorage.setItem(LS_PWD, pwd);
        }
        
        setStatus("Admin Login Successful! Loading dashboard...", "success");
        setTimeout(() => {
           if (window.electron && window.electron.invoke) {
               window.electron.invoke('window:openDashboard', 'admin_dashboard.html');
           } else {
               window.location.href = "admin_dashboard.html";
           }
        }, 800);
        return; 
      }
      let supabaseEmail = usr.includes('@') ? usr : `${usr}@omnis.local`;
      let supabaseRes = null;
      
      // Step 1: Authenticate with Supabase
      if (window.electron && window.electron.invoke) {
          supabaseRes = await window.electron.invoke('supabase:signIn', { email: supabaseEmail, password: pwd });
          
          if (!supabaseRes.ok) {
              // Try migration fallback by authenticating with Frappe first
              const baseSys = OMNIS_SYSTEMS.find(s => s.key === "salestrack") || OMNIS_SYSTEMS[0];
              try {
                  const loginUrl = baseSys.baseUrl + "/api/method/login";
                  let frappeRes = null;
                  
                  if (window.frappeAPI && window.frappeAPI.request) {
                      frappeRes = await window.frappeAPI.request({ url: loginUrl, method: 'POST', data: { usr, pwd }, syncCookies: true });
                  } else {
                      const params = new URLSearchParams();
                      params.append('usr', usr);
                      params.append('pwd', pwd);
                      let fetchUrl = window.location.protocol.startsWith('http') ? 'omnis-proxy.php?url=' + encodeURIComponent(loginUrl) : loginUrl;
                      const req = await fetch(fetchUrl, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: params.toString(), credentials: "include" });
                      frappeRes = { data: JSON.parse(await req.text()) };
                  }
                  
                  if (frappeRes && frappeRes.data && frappeRes.data.message && String(frappeRes.data.message).toLowerCase().includes("logged")) {
                      setStatus("Migrating account to secure vault...", "info");
                      const migrateRes = await fetch("https://pfqaeewmlwfayxbgmuaq.supabase.co/functions/v1/migrate-frappe-user", {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ email: supabaseEmail, frappe_usr: usr, password: pwd, frappe_url: baseSys.baseUrl })
                      });
                      if (migrateRes.ok) {
                          supabaseRes = await window.electron.invoke('supabase:signIn', { email: supabaseEmail, password: pwd });
                      }
                  }
              } catch (e) {
                  console.error("Migration fallback failed", e);
              }
          }
      }

      if (!supabaseRes || !supabaseRes.ok) {
          setStatus(supabaseRes ? supabaseRes.error : "Invalid credentials", "error");
          submitBtn.disabled = false;
          hideSplash();
          return;
      }

      // Step 2: RBAC Check & System Provisioning
      const userSysList = supabaseRes.user.systems || [];
      const isAdmin = supabaseRes.user.is_admin === true;
      let successfulLogins = [];
      const jargonInterval = setInterval(() => { updateSplash(getRandomJargon()); }, 1500);

      if (isAdmin) {
          localStorage.setItem("omnis_is_admin", "true");
          localStorage.setItem("omnis_admin_systems", JSON.stringify(userSysList));
      }

      for (let i = 0; i < OMNIS_SYSTEMS.length; i++) {
        const sys = OMNIS_SYSTEMS[i];
        const row = document.getElementById(`sys-row-${sys.key}`);
        if (row) row.classList.add('active');
        updateSplash(null, ((i + 1) / total) * 100);

        // Check if user has explicit access or is admin
        const hasAccess = isAdmin || userSysList.includes(sys.key);
        
        if (!hasAccess) {
            if (row) {
               row.classList.remove('active');
               row.classList.add('error');
               row.querySelector('.status-indicator').textContent = 'UNAUTHORIZED';
            }
            continue;
        }

        // Setup Legacy Frappe Cookies if required
        if (sys.key !== "fleetrack" && sys.key !== "medicals") {
            try {
                const loginUrl = sys.baseUrl + "/api/method/login";
                if (window.frappeAPI && window.frappeAPI.request) {
                    const reqHeaders = {};
                    if (sys.key === "spe" || loginUrl.includes('spareparts-exchange')) reqHeaders['Host'] = 'omnis.spareparts-exchange.com';
                    await window.frappeAPI.request({ url: loginUrl, method: 'POST', data: { usr, pwd }, headers: reqHeaders, syncCookies: true });
                } else {
                    const params = new URLSearchParams(); params.append('usr', usr); params.append('pwd', pwd);
                    let fetchUrl = window.location.protocol.startsWith('http') ? 'omnis-proxy.php?url=' + encodeURIComponent(loginUrl) : loginUrl;
                    await fetch(fetchUrl, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: params.toString(), credentials: "include" });
                }
            } catch (err) {
                console.warn(`[Login] Frappe cookie sync failed for ${sys.name}`, err);
            }
        }

        // Mark Authorized
        if (row) {
            row.classList.remove('active');
            row.classList.add('done');
            row.querySelector('.status-indicator').innerHTML = 'AUTHORIZED';
        }

        localStorage.setItem("omnisUser", usr);
        localStorage.setItem("omnisSystemKey", sys.key);
        localStorage.setItem("supabase_access_token", supabaseRes.access_token);
        if (supabaseRes.refresh_token) localStorage.setItem("supabase_refresh_token", supabaseRes.refresh_token);
        
        if (sys.key === "fleetrack") localStorage.setItem("ft_user_email", supabaseRes.user.email);

        if (rememberMe.checked || silentAuto) {
            localStorage.setItem(LS_REMEMBER, "1");
            localStorage.setItem(LS_USER, usr);
            localStorage.setItem(LS_PWD, pwd);
        }

        successfulLogins.push(sys);
      }

      // After checking all systems, handle redirects
      if (successfulLogins.length > 0) {
        clearInterval(jargonInterval);
        
        // Save accessible modules to localStorage for the dropdown switcher
        const modules = successfulLogins.map(sys => {
            let url = "";
            if (sys.key === "powertrack") url = "systems/powertrack/dashboard.html";
            else if (sys.key === "fleetrack") url = "systems/fleetrack/index.html";
            else if (sys.key === "salestrack") url = "systems/salestrack/index.html";
            else if (sys.key === "medicals") url = "systems/medicals/index.html";
            else url = "systems/group_accounts/index.html";
            return { name: sys.name, key: sys.key, url: url };
        });
        localStorage.setItem('omnis_modules', JSON.stringify(modules));
        
        const isSwitchMode = window.location.search.includes("switch=1");
        
        if (isSwitchMode && successfulLogins.length > 1) {
            hideSplash();
            const box = document.querySelector('.login-card');
            box.innerHTML = `
                <div style="text-align: center; margin-bottom: 20px;">
                    <h2 style="margin: 0; color: white; font-size: 24px; font-weight: 600;">Select Module</h2>
                    <p style="margin: 5px 0 0; color: #9ca3af; font-size: 14px;">Choose an application to launch</p>
                </div>
                <div style="display:flex; flex-direction:column; gap:12px; margin-top:20px;">
                    ${successfulLogins.map(sys => {
                        let url = "";
                        if (sys.key === "powertrack") url = "systems/powertrack/dashboard.html";
                        else if (sys.key === "fleetrack") url = "systems/fleetrack/index.html";
                        else if (sys.key === "salestrack") url = "systems/salestrack/index.html";
                        else if (sys.key === "medicals") url = "systems/medicals/index.html";
                        else url = "systems/group_accounts/index.html";
                        
                        return `<button onclick="window.location.href='${url}'" class="btn-primary" style="padding:14px; text-align:left; display:flex; align-items:center; justify-content:space-between; font-size:15px; background:linear-gradient(135deg, #1e293b, #0f172a); border:1px solid rgba(255,255,255,0.1); transition:all 0.2s;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 10px 20px rgba(0,0,0,0.2)'" onmouseout="this.style.transform='none'; this.style.boxShadow='none'">
                            <span style="display:flex; align-items:center; gap:12px;"><i class="fas fa-cube" style="color:#8b2219;"></i> ${sys.name}</span>
                            <i class="fas fa-chevron-right" style="font-size:12px; opacity:0.5;"></i>
                        </button>`;
                    }).join('')}
                </div>
                <div style="margin-top:24px; text-align:center;">
                    <a href="javascript:void(0)" onclick="localStorage.removeItem('omnis_remember'); window.location.href='index.html'" style="color:#64748b; font-size:13px; text-decoration:none; display:flex; align-items:center; justify-content:center; gap:6px;"><i class="fas fa-sign-out-alt"></i> Sign out completely</a>
                </div>
            `;
            return;
        }

        // Use the primary successful login for redirection
        const primarySys = successfulLogins[0];
        
        localStorage.setItem("omnisSystemKey", primarySys.key);
        
        setTimeout(() => {
            updateSplash(`Handshake Finalized. Redirecting to ${primarySys.name}...`, 100);
            setTimeout(() => {
              let url = "";
              if (primarySys.key === "powertrack") {
                url = "systems/powertrack/dashboard.html";
              } else if (primarySys.key === "fleetrack") {
                url = "systems/fleetrack/index.html";
              } else if (primarySys.key === "salestrack") {
                url = "systems/salestrack/index.html";
              } else if (primarySys.key === "medicals") {
                url = "systems/medicals/index.html";
              } else {
                url = "systems/group_accounts/index.html";
              }

              pendingUrl = url;
              hideSplash();
              checkSecurityReminder();
            }, 800);
        }, 600);
        return;
      }

      // If we reach here, ALL systems failed
      clearInterval(jargonInterval);
      hideSplash();
      if (!silentAuto) {
        setStatus(`Access Denied: You do not have access to any modules.`, "error");
        // Shake animation for the form
        form.style.animation = 'none';
        form.offsetHeight; // trigger reflow
        form.style.animation = 'shake 0.5s cubic-bezier(.36,.07,.19,.97) both';
      } else {
        setStatus("Auto-login failed. Please sign in manually.", "error");
      }
      submitBtn.disabled = false;
    }

    function autoLoginIfRemembered() {
      const remembered = localStorage.getItem(LS_REMEMBER) === "1";
      if (!remembered) return;

      const savedUser = localStorage.getItem(LS_USER) || "";
      const savedPwd = localStorage.getItem(LS_PWD) || "";
      if (!savedUser || !savedPwd) return;

      emailInput.value = savedUser;
      pwdInput.value = savedPwd;
      rememberMe.checked = true;

      submitBtn.disabled = true;
      tryLoginSequentially(savedUser.trim(), savedPwd.trim(), true);
    }

    let updateCheckCompleted = false;
    
    // We listen to update events to delay auto-login
    if (window.electron && window.electron.on) {
      window.electron.on('update-message', (event, data) => {
        if (data.type === 'uptodate' || data.type === 'error') {
          if (!updateCheckCompleted) {
            updateCheckCompleted = true;
            autoLoginIfRemembered();
          }
        } else if (data.type === 'available') {
          updateCheckCompleted = true; // Stop waiting to login, let it download
        }
      });
    }

    // Fallback: If no update event fires within 3.5 seconds, just try login
    setTimeout(() => {
      if (!updateCheckCompleted) {
        updateCheckCompleted = true;
        autoLoginIfRemembered();
      }
    }, 3500);
  