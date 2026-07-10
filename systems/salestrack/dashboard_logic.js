
/**
 * Omnis Statistical Dashboard Logic
 * Handles fetching stats and rendering "cool" widgets.
 */

window.OmnisDashboardV6 = class OmnisDashboardV6 {
    constructor() {
        if (window.omnisLog) window.omnisLog("[Dashboard] OmnisDashboardV6 Constructing...", "info");
        this.data = null;
        this.selectedDate = new Date(); // Track current view date for Action Center

        // * Immediate Global Aliases (Self-Registration)
        window.salestrack = this;
        window.dashManager = this;

        // 👋 Listeners
        this.initWhatsAppListeners();
    }


    getAgeBadge(dateStr) {
        if (!dateStr) return '<span class="badge badge-light">N/A</span>';
        try {
            const d = new Date(dateStr);
            const now = new Date();
            const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));

            let cls = "badge-success";
            let label = "Today";

            if (diffDays > 14) {
                cls = "badge-danger";
                label = "Old";
            } else if (diffDays > 3) {
                cls = "badge-warning";
                label = "Recent";
            }

            // Modern pill style
            return `<span class="badge ${cls}" style="font-size:10px;padding:2px 8px;border-radius:4px;color:white;display:inline-block;background-color:${cls === 'badge-success' ? '#22c55e' : (cls === 'badge-warning' ? '#f59e0b' : '#ef4444')}">${label}</span>`;
        } catch (e) {
            return '<span class="badge badge-light">-</span>';
        }
    }

    async init() {
        console.log("Initializing Dashboard Manager...");

        try {
            this.injectModals();
            this.setupInlineEditing();
            this.initNavigationIntelligence();
            await this.fetchData();
            this.render();
            this.initInactivityTimer();

            // ... Dynamic Versioning from Electron
            if (window.electron && window.electron.getVersion) {
                window.electron.getVersion().then(v => {
                    const label = document.getElementById('app-version-label');
                    if (label) label.innerText = `V${v}-NEXUS`;

                    const dashPill = document.getElementById('dash-app-version-pill');
                    if (dashPill) dashPill.innerText = `V${v}`;

                    const sLabel = document.getElementById('update-settings-status');
                    if (sLabel) sLabel.innerText = `Version ${v} Nexus`;
                });
            }

            // ... Update Message Listener (Toasts)
            if (window.electron && window.electron.on) {
                window.electron.on('update-message', (event, data) => {
                    const sStatus = document.getElementById('update-settings-status');
                    if (sStatus && data.text) sStatus.innerText = data.text;

                    const progContainer = document.getElementById('update-progress-container');

                    if (data.type === 'uptodate') {
                        this.showToast("System is up to date", "success");
                        if (progContainer) progContainer.style.display = 'none';
                        this.loadReleaseNotes(); // Always load current notes
                    } else if (data.type === 'available') {
                        this.showToast("New Update Found! Downloading...", "success");
                        if (progContainer) progContainer.style.display = 'block';
                        this.loadReleaseNotes();
                    } else if (data.type === 'error') {
                        this.showToast("Update Check Failed", "error");
                    } else if (data.type === 'downloaded') {
                        this.showToast("Update Downloaded. Restarting...", "success");
                        if (progContainer) {
                            const bar = document.getElementById('update-progress-bar');
                            if (bar) bar.style.width = '100%';
                            const pct = document.getElementById('update-progress-percent');
                            if (pct) pct.innerText = '100%';
                        }
                    }
                });

                // New Progress Listener
                window.electron.on('download-progress', (event, info) => {
                    const progContainer = document.getElementById('update-progress-container');
                    if (progContainer) progContainer.style.display = 'block';

                    const bar = document.getElementById('update-progress-bar');
                    const pct = document.getElementById('update-progress-percent');
                    const stats = document.getElementById('update-progress-stats');
                    const eta = document.getElementById('update-progress-eta');

                    if (info) {
                        const p = Math.floor(info.percent || 0);
                        if (bar) bar.style.width = p + '%';
                        if (pct) pct.innerText = p + '%';

                        const speed = (info.bytesPerSecond / 1024 / 1024).toFixed(2); // MB/s
                        const transferred = (info.transferred / 1024 / 1024).toFixed(1);
                        const total = (info.total / 1024 / 1024).toFixed(1);

                        if (stats) stats.innerText = `${transferred} MB / ${total} MB • ${speed} MB/s`;

                        if (eta && info.bytesPerSecond > 0) {
                            const remaining = info.total - info.transferred;
                            const seconds = Math.round(remaining / info.bytesPerSecond);
                            if (seconds < 60) eta.innerText = `ETA: ${seconds}s`;
                            else eta.innerText = `ETA: ${Math.floor(seconds / 60)}m ${seconds % 60}s`;
                        }
                    }
                });
            }

            // Initial load of release notes
            setTimeout(() => this.loadReleaseNotes(), 1000);
        } catch (e) {
            console.error("Dashboard init failed:", e);
            const el = document.querySelector('.dash-grid');
            if (el) {
                el.innerHTML = `<div style="grid-column: span 4; padding:20px; color:#ef4444; background:#fef2f2; border-radius:12px; border:1px solid #fee2e2;">
                    <strong>Dashboard Error:</strong> ${e.message || e}
                </div>`;
                this.showError(e.message || e);
            }
        }
    }

    showError(msg) {
        console.warn("Dashboard Display Error:", msg);
    }

    removeMachineImage(btn, event) {
        if (event) event.stopPropagation();
        const slot = btn.closest('.photo-slot');
        if (!slot) return;

        const field = slot.dataset.field;
        const isNew = slot.closest('tr')?.classList.contains('new-machine-row');
        const cls = isNew ? (field === 'images_one' ? 'new-img-one' : 'new-img-two') : (field === 'images_one' ? 'm-img-one' : 'm-img-two');

        slot.innerHTML = `
            <span style="font-size:16px; color:#94a3b8;">+</span>
            <input type="hidden" class="${cls}" value="">
        `;

        slot.style.borderStyle = 'dashed';
        slot.style.borderColor = '#cbd5e1';
        this.showToast("Image removed", "info");
    }

    // Machine Photo Upload Logic
    // --- HELPERS ---
    async urlToBase64(url) {
        try {
            const res = await fetch(url);
            const blob = await res.blob();
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const base64 = reader.result.split(',')[1]; // Strip prefix
                    resolve(base64);
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (e) {
            console.error("Base64 Convert Error:", e);
            return null;
        }
    }

    triggerMachineImageUpload(slot) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                this.uploadMachineImage(slot, file);
            }
        };
        input.click();
    }

    async uploadMachineImage(slot, file) {
        const originalContent = slot.innerHTML;
        slot.innerHTML = `<i class="fas fa-spinner fa-spin" style="color:#3b82f6;"></i>`;
        slot.style.borderStyle = 'solid';
        slot.style.borderColor = '#3b82f6';

        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const base64 = e.target.result;
                const sys = window.getCurrentSystem ? window.getCurrentSystem() : { baseUrl: "https://salestrack.powerstar.co.zw" };
                const reportId = this._currentFullDoc ? this._currentFullDoc.name : '';

                const res = await window.callFrappeSequenced(sys.baseUrl, "powerstar_salestrack.omnis_dashboard.upload_machine_image", {
                    filedata: base64,
                    filename: file.name,
                    report_id: reportId
                });

                const payload = res.message || res;
                if (payload.ok && payload.file_url) {
                    const fullUrl = payload.file_url.startsWith('/') ? (sys.baseUrl.replace(/\/$/, '') + payload.file_url) : payload.file_url;

                    slot.innerHTML = `
                        <img src="${fullUrl}" style="width:100%; height:100%; object-fit:cover;">
                        <div class="delete-photo" onclick="salestrack.removeMachineImage(this, event)" style="position:absolute; top:2px; right:2px; background:rgba(239, 68, 68, 0.9); color:white; width:14px; height:14px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:bold; cursor:pointer; z-index:5;">&times;</div>
                        <input type="hidden" class="${slot.classList.contains('new-img-one') || slot.querySelector('.new-img-one') ? 'new-img-one' : (slot.querySelector('.m-img-one') ? 'm-img-one' : 'm-img-two')}" value="${payload.file_url}">
                    `;

                    // Re-inject correct hidden input class based on field
                    const field = slot.dataset.field;
                    const isNew = slot.closest('tr').classList.contains('new-machine-row');
                    const cls = isNew ? (field === 'images_one' ? 'new-img-one' : 'new-img-two') : (field === 'images_one' ? 'm-img-one' : 'm-img-two');
                    slot.querySelector('input').className = cls;

                    this.showToast("Image uploaded successfully", "success");
                } else {
                    throw new Error(payload.error || "Upload failed");
                }
            };
            reader.readAsDataURL(file);
        } catch (err) {
            console.error("Upload Error:", err);
            slot.innerHTML = originalContent;
            this.showToast("Upload failed: " + err.message, "error");
        }
    }

    checkUpdatesManually() {
        if (window.electron && window.electron.checkForUpdates) {
            const btn = document.getElementById('btn-manual-update');
            if (!btn) return;
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> CHECKING...';
            btn.disabled = true;

            window.electron.checkForUpdates().then(() => {
                setTimeout(() => {
                    btn.innerHTML = originalText;
                    btn.disabled = false;
                }, 2000);
            });
        }
    }

    formatNumber(num) {
        if (num === null || num === undefined) return "0";
        return Number(num).toLocaleString();
    }

    /**
     * Navigates the dashboard slider to a specific slide.
     * @param {number} index - 0 for Sales Overview, 1 for AI Concierge
     */
    setDashboardSlide(index) {
        // Since the track is 200% width and has 2 slides, 
        // we translate by -50% to show the second slide.
        const track = document.getElementById("dashboard-slider-track");
        if (!track) return;
        track.style.transform = `translateX(-${index * 50}%)`;

        // Update pill position (New for V6 Switcher)
        const pill = document.getElementById("dash-active-pill");
        if (pill) {
            // Calculate position. Slide 0 is at 6px. Slide 1 is at 50% + offset.
            pill.style.left = index === 0 ? "6px" : "calc(50% + 2px)";
        }

        // Update text labels
        const labels = document.querySelectorAll('.dash-nav-label');
        labels.forEach((lbl, i) => {
            if (i === index) {
                lbl.classList.add('active');
            } else {
                lbl.classList.remove('active');
            }
        });

        this.currentDashboardSlide = index;
        if (window.omnisLog) omnisLog(`[Slider] Switched to view ${index === 0 ? 'SALES' : 'AI'}`);
        if (this.pingNavigation) this.pingNavigation(); // Show dots on transition
    }

    /**
     * Initializes intelligent navigation listeners.
     */
    initNavigationIntelligence() {
        // Keyboard Support
        window.addEventListener('keydown', (e) => {
            // Only toggle if dashboard is visible
            const dash = document.getElementById("view-dashboard");
            if (!dash || dash.classList.contains("hidden")) return;

            if (e.key === 'ArrowRight' && this.currentDashboardSlide === 0) {
                this.setDashboardSlide(1);
            } else if (e.key === 'ArrowLeft' && this.currentDashboardSlide === 1) {
                this.setDashboardSlide(0);
            }
        });

        // Activity Monitor
        let hideTimeout;
        const pingNav = () => {
            const dots = document.querySelector('.dashboard-slider-dots');
            if (!dots) return;
            dots.classList.add('visible');
            clearTimeout(hideTimeout);
            hideTimeout = setTimeout(() => {
                // Don't hide if mouse is hovering over the dots area
                if (!dots.matches(':hover')) {
                    dots.classList.remove('visible');
                } else {
                    // If hovering, wait another 3 seconds before trying again
                    pingNav();
                }
            }, 3000);
        };

        this.pingNavigation = pingNav;

        // Reveal dots ONLY when "Hover Zone" is entered
        const zone = document.querySelector('.dash-nav-zone');
        if (zone) {
            zone.addEventListener('mousemove', () => pingNav());
            zone.addEventListener('mouseenter', () => pingNav());
        } else {
            // Fallback to global if zone not found (legacy)
            document.addEventListener('mousemove', () => pingNav());
        }

        document.addEventListener('touchstart', () => pingNav());

        // Initial ping
        setTimeout(() => pingNav(), 1000);
    }

    openDoc(doctype, name) {
        const sys = this.sys || (window.getCurrentSystem ? window.getCurrentSystem() : { baseUrl: "https://salestrack.powerstar.co.zw" });
        const base = sys.baseUrl.replace(/\/$/, "");
        // Slugify doctype: "Hot Lead" -> "hot-lead"
        const slug = doctype.toLowerCase().replace(/ /g, "-");
        const url = `${base}/app/${slug}/${encodeURIComponent(name)}`;
        console.log("Opening Doc:", url);
        window.open(url, "_blank");
    }

    /**
     * Opens a modal with full details of a priority action.
     */
    openActionDetailModal(item) {
        if (!item) return;

        // Use the existing gsmModal or similar if available, 
        // but for specific task details, let's build a clean one.
        const title = item.title || "Priority Task";
        const subtitle = item.subtitle || "";
        const rationale = item.rationale || "This task was identified as a priority based on recent ERP activity and AI analysis.";
        const type = item.type || "task";
        const id = item.id || "";
        const priority = item.priority || "medium";

        const typeIcon = type === 'call' ? '&#x1F4DE;' : (type === 'meetup' ? '&#x1F91D;' : '&#x1F4C5;');
        const priorityColor = priority === 'high' ? '#ef4444' : '#f59e0b';

        const html = `
            <div style="padding: 24px; font-family: 'Inter', sans-serif;">
                <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 24px;">
                    <div style="background: ${type === 'call' ? '#3b82f6' : (type === 'meetup' ? '#8b5cf6' : '#f59e0b')}; width: 56px; height: 56px; border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 24px; color: white; box-shadow: 0 8px 16px rgba(0,0,0,0.1);">
                        ${typeIcon}
                    </div>
                    <div>
                        <div style="font-size: 20px; font-weight: 850; color: #0f172a; letter-spacing: -0.02em;">${title}</div>
                        <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px;">
                            <span style="background: ${priorityColor}; color: white; font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.05em;">${priority} Priority</span>
                            <span style="color: #64748b; font-size: 13px;">&bull;</span>
                            <span style="color: #64748b; font-size: 13px; font-weight: 500;">${type.charAt(0).toUpperCase() + type.slice(1)}</span>
                            ${item.salesperson ? `<span style="color: #64748b; font-size: 13px;">&bull;</span> <span style="color: #0f172a; font-size: 13px; font-weight: 600;">Rep: ${item.salesperson}</span>` : ''}
                        </div>
                    </div>
                </div>

                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; margin-bottom: 24px;">
                    <div style="font-weight: 800; color: #475569; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 14px;">&#x1F3AF;</span> Why this is a priority
                    </div>
                    <div style="font-size: 15px; color: #1e293b; line-height: 1.6; font-weight: 500;">
                        ${rationale}
                    </div>
                </div>

                <div style="margin-bottom: 24px;">
                    <div style="font-weight: 800; color: #475569; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px;">Details / Related Record</div>
                    <div style="font-size: 14px; color: #64748b; margin-bottom: 12px;">${subtitle}</div>
                    ${id ? `
                        <button onclick="window.salestrack.openDoc('Quotation', '${id}'); window.gsmModal.classList.add('hidden');" 
                                style="width: 100%; padding: 14px; background: #0f172a; color: white; border: none; border-radius: 12px; font-weight: 700; font-size: 14px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px;"
                                onmouseover="this.style.background='#1e293b'; this.style.transform='translateY(-1px)';"
                                onmouseout="this.style.background='#0f172a'; this.style.transform='none';">
                            <i class="fa-solid fa-arrow-up-right-from-square"></i> Open Associated Document
                        </button>
                    ` : ''}
                </div>
            </div>
        `;

        // Reuse gsmModal which is global
        if (window.openGsmModal) {
            window.openGsmModal(title, "Task Analysis", html);
        }
    }

    async fetchData(period = "This Year") {
        this.sys = (window.getCurrentSystem && window.getCurrentSystem()) || { baseUrl: "https://salestrack.powerstar.co.zw" };
        this.data = this.data || {};

        // 1. KPIs
        await this.loadStage(period, "get_dashboard_kpis", "KPIs", (data) => {
            Object.assign(this.data, data);
            this.renderKPIs();
        });

        // 2. Charts
        await this.loadStage(period, "get_dashboard_charts", "Charts", (data) => {
            Object.assign(this.data, data);
            this.renderCharts();
        });

        // 3. Lists
        await this.loadStage(period, "get_dashboard_lists", "Lists", (data) => {
            Object.assign(this.data, data);
            this.renderOrderMap();
            this.renderHotLeads();
            this.renderAIPipeline();
        });

        this.fetchAIInsights();
        this.fetchIndustryNews();
    }


    renderCharts() {
        this.renderRiskCard();
        this.renderHeaderStats();
        this.renderCompanyChart();
        this.renderMTDTargets();
        this.renderOEMChart();
    }

    async loadStage(period, method, label, renderCallback) {
        const CACHE_TTL = 12 * 60 * 60 * 1000; // 12 Hours
        const CACHE_VERSION = "v13"; // Hardcoded JS targets: SP=16, ME=18
        const cacheKey = `omnis_dash_cache_${method}_${period}_${CACHE_VERSION}`;

        // 1. Check & Always Render Cache First (Ghost Loading)
        let isStale = true;
        try {
            const cachedRaw = localStorage.getItem(cacheKey);
            if (cachedRaw) {
                const entry = JSON.parse(cachedRaw);
                const age = Date.now() - entry.timestamp;

                omnisLog(`[Cache] Rendering ${label} (Ghost)...`);
                renderCallback(entry.data);

                if (age < CACHE_TTL) {
                    omnisLog(`[Cache] ${label} is fresh (${(age / 1000 / 60).toFixed(1)}m old). Skipping sync.`);
                    isStale = false;
                }
            }
        } catch (e) {
            console.warn("Cache Error:", e);
        }

        if (!isStale) return;

        // 2. Fetch from Network (Sequenced)
        try {
            omnisLog(`[Network] Sequenced Sync for ${label}...`);
            const res = await window.callFrappeSequenced(this.sys.baseUrl, `powerstar_salestrack.omnis_dashboard.${method}`, { period: period });
            const payload = res.message || res;

            if (payload.ok) {
                // 3. Save to Cache
                try {
                    localStorage.setItem(cacheKey, JSON.stringify({
                        timestamp: Date.now(),
                        data: payload.data
                    }));
                } catch (e) { console.warn("Cache Save Failed (Quota?)", e); }

                renderCallback(payload.data);
            } else {
                console.error(`${label} Error:`, payload.error);
            }
        } catch (e) {
            console.error(`${label} Network Error:`, e);
            // If network fails but we had cache, we've already rendered it, so user sees data.
        }
    }

    async fetchAIInsights() {
        this.sys = (window.getCurrentSystem && window.getCurrentSystem()) || { baseUrl: "https://salestrack.powerstar.co.zw" };
        const summaryEl = document.getElementById("ai-strategic-summary");
        if (!summaryEl) return;

        try {
            const key = localStorage.getItem("omnis_openai_key");
            const payload = key ? { api_key: key } : {};

            const res = await window.callFrappeSequenced(this.sys.baseUrl, "powerstar_salestrack.omnis_dashboard.get_omnis_ai_dashboard_insights", payload, "GET");
            if (res && res.message && res.message.ok) {
                this.renderAIInsights(res.message);
            } else {
                summaryEl.innerHTML = `<div style="color:#ef4444; font-size:13px; opacity:0.8;">AI Insights currently unavailable.</div>`;
            }
        } catch (e) {
            console.error("fetchAIInsights error:", e);
            summaryEl.innerHTML = `<div style="color:#ef4444; font-size:13px; opacity:0.8;">Market telemetry sync failed.</div>`;
        }
    }

    async fetchIndustryNews() {
        this.sys = (window.getCurrentSystem && window.getCurrentSystem()) || { baseUrl: "https://salestrack.powerstar.co.zw" };
        const listEl = document.getElementById("industry-news-list");
        if (!listEl) return;

        try {
            const key = localStorage.getItem("omnis_openai_key");
            const payload = key ? { api_key: key } : {};
            const res = await window.callFrappeSequenced(this.sys.baseUrl, "powerstar_salestrack.omnis_dashboard.get_omnis_industry_news", payload, "GET");

            if (res && res.message && res.message.ok) {
                this.renderIndustryNews(res.message.news);
            } else {
                listEl.innerHTML = `<div style="padding:20px; color:#ef4444; font-size:13px; text-align:center;">Failed to load news. ${res?.message?.error || ""}</div>`;
            }
        } catch (e) {
            console.error("fetchIndustryNews error:", e);
            listEl.innerHTML = `<div style="padding:20px; color:#ef4444; font-size:13px; text-align:center;">Network error loading news.</div>`;
        }
    }

    renderIndustryNews(news) {
        const listEl = document.getElementById("industry-news-list");
        if (!listEl) return;

        if (!news || news.length === 0) {
            listEl.innerHTML = `<div style="padding:20px; color:#64748b; font-size:13px; text-align:center;">No recent industry headlines found.</div>`;
            return;
        }

        const formatDate = (dateString) => {
            try {
                const date = new Date(dateString);
                return date.toLocaleDateString("en-GB", { day: 'numeric', month: 'short', year: 'numeric' });
            } catch {
                return dateString;
            }
        };

        // Update the persistent Market Pulse in the AI Concierge
        const pulseEl = document.getElementById("ai-market-pulse");
        if (pulseEl) {
            pulseEl.innerHTML = news.slice(0, 4).map(item => `
                <div style="background: rgba(255,255,255,0.4); border: 1px solid rgba(159,18,57,0.05); padding: 8px 10px; border-radius: 8px; font-size: 11px; transition: all 0.2s; cursor: pointer;" onmouseover="this.style.background='white'; this.style.transform='translateX(4px)';" onmouseout="this.style.background='rgba(255,255,255,0.4)'; this.style.transform='none';" onclick="window.open('${item.link}', '_blank')">
                    <div style="font-weight: 700; color: #1e293b; line-height: 1.3; margin-bottom: 2px; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${item.title}</div>
                    <div style="font-size: 9px; color: #94a3b8; font-weight: 600; text-transform: uppercase;">${item.publisher}</div>
                </div>
            `).join('');
        }

        listEl.innerHTML = news.map((item, index) => `
            <a href="${item.link}" target="_blank" style="display:flex; align-items:flex-start; justify-content:space-between; padding:12px 16px; text-decoration:none; ${index !== news.length - 1 ? 'border-bottom:1px solid #f8fafc;' : ''} transition: all 0.2s; gap: 20px;" onmouseover="this.style.background='#fffafa'; this.style.paddingLeft='20px';" onmouseout="this.style.background='transparent'; this.style.paddingLeft='16px';">
               <!-- Left Column: News Indicator & Headline -->
               <div style="flex: 1; min-width: 0; display: flex; gap: 12px;">
                   <div style="width: 3px; height: 32px; background: #9f1239; border-radius: 2px; flex-shrink: 0; margin-top: 2px; opacity: 0.6;"></div>
                   <div style="flex: 1; min-width: 0;">
                       <div style="font-weight:700; color:#0f172a; font-size:13px; margin-bottom:4px; line-height:1.3; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${item.title}</div>
                       <div style="display:flex; align-items:center; gap:6px; font-size:10.5px; color:#94a3b8; text-transform: uppercase; letter-spacing: 0.02em;">
                           <span style="font-weight:700; color:#9f1239;">${item.publisher}</span>
                           <span>&bull;</span>
                           <span>${formatDate(item.published)}</span>
                       </div>
                   </div>
               </div>

               <!-- Right Column: Compact AI Impact Tag -->
               <div style="width: 340px; flex-shrink: 0;">
               ${item.impact_note ? `
                   <div style="background: #fff; border: 1px solid rgba(159, 18, 57, 0.08); border-left: 2px solid #9f1239; padding: 8px 10px; border-radius: 6px; font-size: 11.5px; color: #475569; line-height: 1.4; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
                      <div style="font-weight:800; color:#9f1239; font-size:9px; text-transform:uppercase; margin-bottom:4px; letter-spacing:0.04em; display:flex; align-items:center; gap:4px;">
                        <span>&#x1F4A1;</span> PERSPECTIVE
                      </div>
                      <div style="font-weight: 500; color: #334155;">${item.impact_note}</div>
                   </div>
               ` : `
                   <div style="font-size: 10.5px; color: #94a3b8; font-style: italic; display: flex; align-items: center; gap: 6px; padding: 6px;">
                      <span class="ai-loading-dots"></span> Analyzing impact...
                   </div>
               `}
               </div>
            </a>
        `).join('');
    }

    renderAIInsights(data) {
        // 1. Strategic Summary
        const summaryEl = document.getElementById("ai-strategic-summary");
        let replyText = data.insights || data.reply || "";

        // Strip markdown JSON blocks out of the narrative string if the backend didn't do it
        replyText = replyText.replace(/```json[\s\S]*?```/g, "").trim();

        if (summaryEl && replyText) {
            summaryEl.innerHTML = replyText.replace(/\n/g, "<br/>"); // The reply contains the fallback/strategic summary text
        }

        // Metrics are now handled by the top KPI Ribbon for unified visibility.

        // Removed obsolete Action Center / Calendar calls to avoid layout leakage in Command Center 2.0
        // this.updateActionCenterHeader();
        // this.renderWeeklyCalendar();

        // 3. Action Items (Strategic To-Do List)

        // 3. Action Items (Strategic To-Do List)
        const actionItemsEl = document.getElementById("ai-action-items");
        const actionsList = data.actions || data.structured;
        if (actionItemsEl) {
            if (actionsList && Array.isArray(actionsList) && actionsList.length > 0) {
                actionItemsEl.innerHTML = actionsList.map(item => {
                    const params = JSON.stringify(item).replace(/"/g, '&quot;');
                    const isUrgent = item.priority === 'high';
                    return `
                    <div class="todo-item" onclick='window.salestrack.openActionDetailModal(${params})'>
                        <div class="todo-check"></div>
                        <div class="todo-content">
                            <div class="todo-title">${item.title}</div>
                            <div class="todo-meta">${item.subtitle} &bull; &#x1F464; ${item.salesperson || 'Unassigned'}</div>
                        </div>
                        ${isUrgent ? '<span class="todo-badge urgent">URGENT</span>' : ''}
                    </div>
                `;
                }).join('');
            } else if (data.next_action) {
                // Fallback to legacy structure next_action if structured AI block fails
                const item = data.next_action;
                actionItemsEl.innerHTML = `
                    <div class="todo-item" onclick="window.salestrack.openDoc('Quotation', '${item.id || ''}')">
                        <div class="todo-check"></div>
                        <div class="todo-content">
                            <div class="todo-title">Follow up: ${item.customer}</div>
                            <div class="todo-meta">Amount: $${item.amount || 0} &bull; &#x1F464; ${item.salesperson || 'Unassigned'}</div>
                        </div>
                    </div>
                `;
            } else {
                actionItemsEl.innerHTML = `
                    <div style="text-align: center; padding: 60px; color: #94a3b8; font-size: 14px; font-style: italic; background: rgba(255,255,255,0.4); border: 1px dashed #e2e8f0; border-radius: 16px;">
                        No strategic tasks identified for this period.
                    </div>
                `;
            }
        }
    }

    toggleIndustryNews() {
        const section = document.getElementById("ai-industry-news-section");
        if (!section) return;

        const card = document.getElementById("ai-view-news-card");
        const isHidden = section.style.display === "none";

        if (isHidden) {
            section.style.display = "block";
            if (card) {
                card.style.background = "#9f1239";
                card.style.borderColor = "#9f1239";
                card.querySelector('div div:nth-child(2)').style.color = "white";
                card.querySelector('div div:nth-child(3)').textContent = "Hide Headlines";
                card.querySelector('div div:nth-child(3)').style.color = "rgba(255,255,255,0.7)";
            }
            this.fetchIndustryNews();
        } else {
            section.style.display = "none";
            if (card) {
                card.style.background = "rgba(159,18,57,0.05)";
                card.style.borderColor = "rgba(159,18,57,0.2)";
                card.querySelector('div div:nth-child(2)').style.color = "#9f1239";
                card.querySelector('div div:nth-child(3)').textContent = "View More Headlines";
                card.querySelector('div div:nth-child(3)').style.color = "#64748b";
            }
        }
    }

    render() {
        if (this.data) {
            this.renderKPIs();
            this.renderTopPerformers();
            this.renderOrderMap();
            this.renderRiskCard();
        }
    }

    // --- NEW RENDERERS ---



    renderKPIs() {
        const d = this.data;
        if (!d) return;

        const ribbon = document.getElementById('dash-kpi-ribbon');
        if (ribbon) {
            let totalMtd = 0;
            if (d.company_sales) {
                Object.values(d.company_sales).forEach(c => totalMtd += (c.mtd || 0));
            }

            const activeQuotes = d.quote_follow_ups ? d.quote_follow_ups.length : 0;
            const atRisk = d.orders_at_risk ? d.orders_at_risk.length : 0;
            const convRate = activeQuotes > 0 ? ((totalMtd / (totalMtd + activeQuotes)) * 100).toFixed(1) : "0.0";

            const kpiItems = [
                { label: "Sales MTD", val: this.formatNumber(totalMtd), icon: "fa-shopping-cart", color: "#10b981", sub: "Units Sold Month-to-Date" },
                { label: "Live Pipeline", val: this.formatNumber(activeQuotes), icon: "fa-file-invoice-dollar", color: "#3b82f6", sub: "Active Customer Quotes" },
                { label: "At Risk Orders", val: atRisk, icon: "fa-exclamation-triangle", color: "#ef4444", sub: "Urgent Attention Needed" },
                { label: "Efficiency", val: convRate + "%", icon: "fa-bolt", color: "#7c3aed", sub: "Market Capture Rate" }
            ];

            ribbon.innerHTML = kpiItems.map(item => `
                <div style="background:#fff; border:1px solid #e2e8f0; border-radius:18px; padding:24px; box-shadow:0 4px 12px rgba(0,0,0,0.02); display:flex; align-items:center; gap:20px; transition:transform 0.2s;" onmouseover="this.style.transform='translateY(-2px)';" onmouseout="this.style.transform='none';">
                    <div style="width:52px; height:52px; background:${item.color}15; color:${item.color}; border-radius:14px; display:flex; align-items:center; justify-content:center; font-size:22px;">
                        <i class="fas ${item.icon}"></i>
                    </div>
                    <div>
                        <div style="font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:4px;">${item.label}</div>
                        <div style="font-size:24px; font-weight:900; color:#0f172a; line-height:1; letter-spacing:-0.01em;">${item.val}</div>
                        <div style="font-size:11px; color:#94a3b8; font-weight:600; margin-top:6px;">${item.sub}</div>
                    </div>
                </div>
            `).join('');
        }
    }

    renderTopPerformers() {
        const d = this.data;
        const container = document.getElementById('dash-top-oem-mix');
        if (container && d.oem_sales) {
            const top5 = d.oem_sales.slice(0, 5);
            const total = d.oem_sales.reduce((acc, curr) => acc + (curr.total_qty || 0), 0);

            container.innerHTML = top5.map(oem => {
                const pct = total > 0 ? ((oem.total_qty / total) * 100).toFixed(1) : 0;
                return `
                    <div style="margin-bottom:12px;">
                        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:6px;">
                            <div style="display:flex; align-items:center; gap:10px;">
                                <div style="width:8px; height:8px; border-radius:50%; background:#ef4444;"></div>
                                <div style="font-size:13px; font-weight:700; color:#334155;">${oem.oem}</div>
                            </div>
                            <div style="display:flex; align-items:center; gap:12px;">
                                <div style="font-size:12px; font-weight:800; color:#0f172a;">${oem.total_qty} <span style="font-size:10px; opacity:0.5; font-weight:600;">Units</span></div>
                                <div style="font-size:11px; font-weight:700; color:#64748b; width:45px; text-align:right;">${pct}%</div>
                            </div>
                        </div>
                        <div style="width:100%; height:4px; background:#f1f5f9; border-radius:2px; overflow:hidden;">
                            <div style="width:${pct}%; height:100%; background:#ef4444; border-radius:2px;"></div>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    renderOrderMap() {
        const container = document.getElementById('order-map-svg-container');
        if (!container) return;

        // If data is not yet available, show a placeholder but don't crash
        if (!this.data) {
            container.innerHTML = `<div style="padding:40px; color:#94a3b8; font-size:12px; font-style:italic;">Initializing logistics engine...</div>`;
            return;
        }

        const orders = this.data.orders_preview || [];
        const quotes = this.data.quote_follow_ups || this.data.open_quotations || [];

        // Define Locations & Distances - GEOGRAPHICALLY ACCURATE RELATIVE POSITIONS
        const LOCATIONS = {
            'pipeline': { label: 'Global Pipeline', x: 10, y: 25, dist: 8500, icon: 'fa-globe-africa', color: '#64748b' },
            'transit': { label: 'In Transit', x: 35, y: 60, dist: 2400, icon: 'fa-ship', color: '#8b5cf6' },
            'durban': { label: 'Durban Port', x: 68, y: 88, dist: 1650, icon: 'fa-anchor', color: '#3b82f6' },
            'beira': { label: 'Beira Port', x: 92, y: 40, dist: 560, icon: 'fa-anchor', color: '#3b82f6' },
            'yard': { label: 'Harare HQ', x: 68, y: 35, dist: 0, icon: 'fa-warehouse', color: '#10b981' }
        };

        // Categorize items by location
        const clusters = { yard: [], beira: [], durban: [], transit: [], pipeline: [] };

        // Filter for "In Progress" orders as requested
        const inProgressOrders = orders.filter(o => (o.phase || '').toLowerCase() === 'in progress');

        // Map Orders with enhanced status intelligence
        inProgressOrders.forEach(o => {
            const status = (o.status || '').toLowerCase();
            const eta = (o.eta || '').toLowerCase();
            const combined = (status + ' ' + eta).toLowerCase();

            // 📍 HARARE HQ (Yard): Look for PDI, Ready, Arrived, or direct city mentions
            if (combined.includes('yard') || combined.includes('arrived') || combined.includes('ready') ||
                combined.includes('pdi') || combined.includes('harare')) {
                clusters.yard.push(o);
            }
            // ⚓ BEIRA PORT: Specific port tracking
            else if (combined.includes('beira')) {
                clusters.beira.push(o);
            }
            // ⚓ DURBAN PORT: Specific port tracking
            else if (combined.includes('durban')) {
                clusters.durban.push(o);
            }
            // 🚚 IN TRANSIT: Shipping, En route, Port-side handling, or General transit
            else if (combined.includes('transit') || combined.includes('shipping') ||
                combined.includes('en route') || combined.includes('port') || combined.includes('route')) {
                clusters.transit.push(o);
            }
            // ⚙️ GLOBAL PIPELINE: All other In-Progress items starting their journey
            else {
                clusters.pipeline.push(o);
            }
        });

        // Map Quotes to Pipeline (represents the pre-order volume)
        const activeQuotes = quotes.filter(q => {
            const status = (q.status || '').toLowerCase();
            return status.includes('new') || status.includes('pending') || status.includes('sent');
        });
        activeQuotes.forEach(q => clusters.pipeline.push(q));

        let html = `
            <div style="width:100%; height:100%; min-height:650px; position:relative; overflow:hidden; border-radius:18px; border:1px solid #e2e8f0; box-shadow: 0 4px 15px rgba(0,0,0,0.05); font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
                    @keyframes satPulse { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.1); opacity: 0.8; } 100% { transform: scale(1); opacity: 1; } }
                    @keyframes pulseNode { 0% { opacity: 1; transform:scale(1); } 50% { opacity: 0.5; transform:scale(1.2); } 100% { opacity: 1; transform:scale(1); } }
                </style>

                <!-- 🗺️ Map Background: Ocean + Land Mass -->
                <div style="position:absolute; inset:0; background: #dce8f5;"></div>
                
                <!-- Southern Africa Land Mass (simplified) -->
                <svg viewBox="0 0 800 650" style="position:absolute; inset:0; width:100%; height:100%; pointer-events:none;">
                    <!-- Ocean base is the container bg -->
                    <!-- Land mass - stylized Southern/East Africa -->
                    <path d="M 320,0 L 450,0 L 520,20 L 580,10 L 650,30 L 720,20 L 800,40 L 800,350 L 780,380 L 750,360 L 720,370 L 700,400 L 680,420 L 650,410 L 620,440 L 580,460 L 540,500 L 500,530 L 470,560 L 440,590 L 420,620 L 400,650 L 350,650 L 330,620 L 310,580 L 280,540 L 260,500 L 250,460 L 260,420 L 270,380 L 290,340 L 300,300 L 280,260 L 270,220 L 280,180 L 300,140 L 310,100 L 300,60 L 310,30 Z" 
                          fill="#e8efe2" stroke="#c5d4ba" stroke-width="1.5"/>
                    <!-- Zimbabwe highlighted region -->
                    <path d="M 450,130 L 550,110 L 600,140 L 620,180 L 610,220 L 580,250 L 540,260 L 500,250 L 460,230 L 440,190 L 440,160 Z" 
                          fill="#d5e3cc" stroke="#aec5a0" stroke-width="1"/>
                    <!-- Mozambique coastal strip -->
                    <path d="M 600,140 L 650,120 L 700,130 L 740,160 L 760,200 L 770,250 L 760,300 L 740,340 L 720,370 L 700,400 L 680,420 L 650,410 L 620,380 L 610,340 L 620,300 L 610,260 L 610,220 L 620,180 Z" 
                          fill="#dde9d5" stroke="#b8cead" stroke-width="1"/>
                    <!-- South Africa -->
                    <path d="M 260,420 L 300,400 L 340,380 L 400,370 L 450,360 L 500,380 L 540,400 L 560,430 L 540,500 L 500,530 L 470,560 L 440,590 L 420,620 L 400,650 L 350,650 L 330,620 L 310,580 L 280,540 L 260,500 L 250,460 Z" 
                          fill="#e2edd9" stroke="#bccfaf" stroke-width="1"/>
                </svg>

                <!-- Topo Grid Lines -->
                <svg width="100%" height="100%" style="position:absolute; top:0; left:0; pointer-events:none; opacity:0.06;">
                    <defs>
                        <pattern id="mapGridV9" width="60" height="60" patternUnits="userSpaceOnUse">
                            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#334155" stroke-width="0.5" />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#mapGridV9)" />
                </svg>

                <!-- Lat/Long Labels -->
                <div style="position:absolute; top:8px; left:50%; transform:translateX(-50%); font-size:8px; color:#94a3b8; font-weight:600; letter-spacing:0.1em; text-transform:uppercase; opacity:0.5;">30°E</div>
                <div style="position:absolute; top:30%; left:8px; font-size:8px; color:#94a3b8; font-weight:600; letter-spacing:0.1em; text-transform:uppercase; opacity:0.5; writing-mode:vertical-lr;">20°S</div>
                <div style="position:absolute; top:70%; left:8px; font-size:8px; color:#94a3b8; font-weight:600; letter-spacing:0.1em; text-transform:uppercase; opacity:0.5; writing-mode:vertical-lr;">30°S</div>

                <!-- 🚀 Action Control Overlay -->
                <div style="position:absolute; top:20px; right:20px; z-index:15;">
                    <button onclick="salestrack.openOrdersList()" style="background:#0f172a; color:#fff; border:none; padding:10px 20px; border-radius:12px; font-size:10px; font-weight:700; cursor:pointer; transition:all 0.3s; box-shadow:0 4px 12px rgba(15,23,42,0.2); text-transform:uppercase; letter-spacing:0.08em; display:flex; align-items:center; gap:8px;">
                        <i class="fas fa-crosshairs"></i> Open Tracker
                    </button>
                </div>

                <!-- 🧪 Light Tech Layering -->
                <div style="position:absolute; top:0; left:0; width:100%; height:100%; background: radial-gradient(circle at 68% 35%, rgba(16,185,129,0.05), transparent 70%); pointer-events:none;"></div>

                <!-- 🌍 Unified Strategic Logistics View (Faint Tech) -->
                <svg viewBox="0 0 800 450" style="position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none;">
                    <defs>
                        <marker id="arrowheadBlueV8" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto">
                            <path d="M 0 0 L 10 5 L 0 10 z" fill="#3b82f6" fill-opacity="0.3" />
                        </marker>
                        <marker id="arrowheadPurpleV8" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto">
                            <path d="M 0 0 L 10 5 L 0 10 z" fill="#8b5cf6" fill-opacity="0.3" />
                        </marker>
                        <marker id="arrowheadGoldV8" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto">
                            <path d="M 0 0 L 10 5 L 0 10 z" fill="#f59e0b" fill-opacity="0.3" />
                        </marker>
                    </defs>

                    <!-- Framework Silhouette (Spectral) -->
                    <path d="M 400,120 L 550,50 L 720,80 L 800,280 L 760,420 L 550,490 L 380,440 L 320,280 Z" 
                          fill="rgba(203,213,225,0.04)" 
                          stroke="none"
                          transform="scale(0.95) translate(40, -10)" />

                    <!-- STAGE 1: GLOBAL (Gold) -->
                    <path d="M 80,112 L 280,270" fill="none" stroke="rgba(245,158,11,0.03)" stroke-width="1.8" />
                    <path d="M 80,112 L 280,270" fill="none" stroke="#f59e0b" stroke-width="1.8" stroke-dasharray="4,12" stroke-opacity="0.25" marker-end="url(#arrowheadGoldV8)">
                        <animate attributeName="stroke-dashoffset" from="300" to="0" dur="10s" repeatCount="indefinite" />
                    </path>

                    <!-- STAGE 2: TRANSIT (Purple) -->
                    <path d="M 280,270 L 544,157" fill="none" stroke="rgba(139,92,246,0.03)" stroke-width="1.8" />
                    <path d="M 280,270 L 544,157" fill="none" stroke="#8b5cf6" stroke-width="1.8" stroke-dasharray="4,12" stroke-opacity="0.25" marker-end="url(#arrowheadPurpleV8)">
                        <animate attributeName="stroke-dashoffset" from="300" to="0" dur="9s" repeatCount="indefinite" />
                    </path>

                    <!-- STAGE 3: PORT LOGISTICS (Blue) -->
                    <!-- Durban -->
                    <path d="M 544,396 L 544,157" fill="none" stroke="rgba(59,130,246,0.03)" stroke-width="1.8" />
                    <path d="M 544,396 L 544,157" fill="none" stroke="#3b82f6" stroke-width="1.8" stroke-dasharray="4,14" stroke-opacity="0.25" marker-end="url(#arrowheadBlueV8)">
                        <animate attributeName="stroke-dashoffset" from="400" to="0" dur="8s" repeatCount="indefinite" />
                    </path>

                    <!-- Beira -->
                    <path d="M 736,180 L 544,157" fill="none" stroke="rgba(59,130,246,0.03)" stroke-width="1.8" />
                    <path d="M 736,180 L 544,157" fill="none" stroke="#3b82f6" stroke-width="1.8" stroke-dasharray="4,14" stroke-opacity="0.25" marker-end="url(#arrowheadBlueV8)">
                        <animate attributeName="stroke-dashoffset" from="400" to="0" dur="7s" repeatCount="indefinite" />
                    </path>
                    
                    <!-- Hub Pulse (Ghost) -->
                    <circle cx="544" cy="157" r="100" fill="rgba(16,185,129,0.005)" stroke="rgba(16,185,129,0.05)" stroke-width="1" stroke-dasharray="2,10">
                        <animate attributeName="r" values="95;105;95" dur="15s" repeatCount="indefinite" />
                    </circle>
                </svg>

                <!-- 🚢 Pathway Metadata Badges -->
                <div style="position:absolute; left:68%; top:61%; transform:translate(-50%, -50%); z-index:11;">
                    ${clusters.durban.length > 0 ? `
                    <div style="background:#3b82f6; color:#fff; font-size:10px; font-weight:700; padding:4px 12px; border-radius:20px; box-shadow:0 4px 12px rgba(59,130,246,0.3); border:2px solid #fff; white-space:nowrap;">
                        <i class="fas fa-truck-moving"></i> ${clusters.durban.length} INCOMING
                    </div>
                    ` : ''}
                </div>

                <div style="position:absolute; left:82%; top:37.5%; transform:translate(-50%, -50%); z-index:11;">
                    ${clusters.beira.length > 0 ? `
                    <div style="background:#3b82f6; color:#fff; font-size:10px; font-weight:700; padding:4px 12px; border-radius:20px; box-shadow:0 4px 12px rgba(59,130,246,0.3); border:2px solid #fff; white-space:nowrap;">
                        <i class="fas fa-truck-moving"></i> ${clusters.beira.length} INCOMING
                    </div>
                    ` : ''}
                </div>

                <!-- 📍 Strategic Location Nodes -->
                ${Object.keys(LOCATIONS).map(key => {
            const loc = LOCATIONS[key];
            const count = clusters[key].length;
            const isActive = count > 0;
            const isHub = key === 'yard';

            return `
                    <div style="position:absolute; left:${loc.x}%; top:${loc.y}%; transform:translate(-50%, -50%); z-index:10; cursor:pointer;" onclick="salestrack.openLocationModal('${key}')">
                            <div style="margin-bottom:12px; text-align:center;">
                                <div style="font-size:11px; font-weight:700; color:#1e293b; text-transform:uppercase; letter-spacing:0.05em;">${loc.label}</div>
                                ${isHub ? `<div style="font-size:9px; color:#10b981; font-weight:700; text-transform:uppercase; margin-top:2px; display:flex; align-items:center; gap:4px; justify-content:center;"><span style="width:5px; height:5px; background:#10b981; border-radius:50%; display:inline-block; animation: pulseNode 2s infinite;"></span> OPS HUB</div>` : `<div style="font-size:9px; color:#94a3b8; font-weight:600; text-transform:uppercase; margin-top:2px;">${loc.dist} KM</div>`}
                            </div>

                            <!-- Glassmorphic Marker -->
                            <!-- Tech Marker -->
                            <div style="
                                width:${isHub ? '90px' : '64px'}; 
                                height:${isHub ? '90px' : '64px'}; 
                                background:#fff; 
                                border:1.5px solid ${isActive ? loc.color : '#e2e8f0'};
                                border-radius:${isHub ? '24px' : '18px'}; 
                                display:flex; 
                                align-items:center; 
                                justify-content:center;
                                box-shadow: 0 10px 25px rgba(0,0,0,0.06);
                                transition:all 0.3s;
                                position:relative;
                            " onmouseover="this.style.transform='scale(1.1) translateY(-5px)'; this.style.borderColor='${loc.color}';">
                                
                                ${isActive ? `<div style="position:absolute; top:-8px; right:-8px; background:${loc.color}; color:#fff; width:24px; height:24px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:900; border:2.5px solid #fff; box-shadow:0 4px 10px ${loc.color}44;">${count}</div>` : ''}
                                
                                <i class="fas ${loc.icon}" style="font-size:${isHub ? '32px' : '20px'}; color:${isActive ? loc.color : '#475569'};"></i>
                            </div>
                        </div>
                    </div>
                    `;
        }).join('')}
                
                <style>
                    @keyframes pulseNode { 0% { opacity: 1; transform:scale(1); } 50% { opacity: 0.5; transform:scale(1.2); } 100% { opacity: 1; transform:scale(1); } }
                </style>
            </div>
        `;

        container.innerHTML = html;
    }

    openLocationModal(locationKey) {
        const LOC_MAP = {
            'yard': 'In Yard (Machinery Exchange)',
            'beira': 'Arrived at Beira Port',
            'durban': 'Arrived at Durban Port',
            'transit': 'In Global Transit',
            'pipeline': 'Active Quotes & Pipeline'
        };

        const orders = this.data.orders_preview || [];
        const quotes = this.data.quote_follow_ups || this.data.open_quotations || [];

        let filtered = [];
        if (locationKey === 'pipeline') {
            // Only quotes for pipeline
            filtered = quotes;
        } else {
            filtered = orders.filter(o => {
                const status = (o.status || '').toLowerCase();
                const eta = (o.eta || '').toLowerCase();
                if (locationKey === 'yard') return status.includes('yard') || status.includes('arrived') || status.includes('ready');
                if (locationKey === 'beira') return eta.includes('beira');
                if (locationKey === 'durban') return eta.includes('durban');
                if (locationKey === 'transit') return status.includes('transit') || status.includes('shipping');
                return false;
            });
        }

        const title = LOC_MAP[locationKey];
        const content = locationKey === 'pipeline' ? this._generateQuoteListHtml(filtered) : this._generateOrderListHtml(filtered);

        this.openListModal(`&#x1F4CD; ${title}`, content || '<div style="padding:40px; text-align:center;">No items found.</div>');
    }

    openOrderStageModal(stageId) {
        const stageNames = {
            pipeline: "Sales Pipeline (Quotes)",
            confirmed: "Confirmed Orders (New)",
            logistics: "Production & Logistics",
            arrived: "Arrived at Local Yard",
            handover: "Handover in Progress"
        };

        const title = stageNames[stageId] || "Order List";
        let content = "";

        const orders = (this.data.orders_preview || []).filter(o => {
            const s = (o.status || '').toLowerCase();
            if (stageId === 'confirmed' && (s.includes('new') || s.includes('pending'))) return true;
            if (stageId === 'logistics' && (s.includes('transit') || s.includes('production') || s.includes('shipping'))) return true;
            if (stageId === 'arrived' && (s.includes('harare') || s.includes('yard') || s.includes('ready'))) return true;
            if (stageId === 'handover' && (s.includes('handover') || s.includes('delivered'))) return true;
            return false;
        });

        if (stageId === 'pipeline') {
            const quotes = this.data.quote_follow_ups || this.data.open_quotations || [];
            content = this._generateQuoteListHtml(quotes);
        } else if (orders.length > 0) {
            content = this._generateOrderListHtml(orders);
        } else {
            content = `<div style="padding:60px 20px; text-align:center;">
                <div style="font-size:48px; margin-bottom:16px; opacity:0.3;">📦</div>
                <div style="font-size:15px; font-weight:600; color:#64748b;">No items currently in this stage.</div>
                <div style="font-size:12px; color:#94a3b8; margin-top:8px;">Check the full tracking view for historical data.</div>
             </div>`;
        }

        this.openListModal(`&#x1F4CD; ${title}`, content);
    }

    _generateQuoteListHtml(quotes) {
        if (!quotes.length) return '<div style="padding:40px; text-align:center; color:#94a3b8;">No active quotes.</div>';
        return `
            <div style="padding:10px;">
                <table style="width:100%; border-collapse:separate; border-spacing:0;">
                    <thead style="background:#f8fafc; font-size:10px; text-transform:uppercase; color:#64748b; font-weight:800;">
                        <tr style="border-bottom:1px solid #e2e8f0;">
                            <th style="padding:12px 16px; color:white; text-align:left;">Customer</th>
                            <th style="padding:12px 16px; color:white; text-align:right;">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${quotes.map(q => `
                            <tr style="border-bottom:1px solid #f1f5f9; cursor:pointer;" onclick="salestrack.openDoc('Quotation', '${q.name}')">
                                <td style="padding:14px 16px;">
                                    <div style="font-size:13px; font-weight:700; color:#1e293b;">${q.customer_name}</div>
                                    <div style="font-size:11px; color:#64748b;">${q.name}</div>
                                </td>
                                <td style="padding:14px 16px; text-align:right;">
                                    <div style="font-size:13px; font-weight:800; color:#0f172a;">${this.formatNumber(q.grand_total)}</div>
                                    <div style="font-size:10px; font-weight:700; color:#3b82f6;">${q.status.toUpperCase()}</div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    renderAIPipeline() {
        const pipeCard = document.getElementById("ai-operational-pipeline");
        if (!pipeCard) return;
        pipeCard.style.display = "flex";

        // 1. Hot Opportunity Pulse (Right Column)
        const leadsEl = document.getElementById("ai-pipeline-leads");
        const leads = (this.data.hot_leads || []).slice(0, 6);
        if (leadsEl) {
            if (leads.length === 0) {
                leadsEl.innerHTML = `<div style="text-align:center; padding:40px; color:#94a3b8; font-size:14px; font-style:italic;">No hot opportunities detected.</div>`;
            } else {
                leadsEl.innerHTML = leads.map(l => `
                    <div style="background: #ffffff; border: 1px solid rgba(128, 0, 0, 0.1); padding: 14px 18px; border-radius: 12px; transition: all 0.2s; box-shadow: 0 4px 12px rgba(0,0,0,0.03); cursor: pointer;" onmouseover="this.style.transform='translateX(6px)'; this.style.borderColor='rgba(128, 0, 0, 0.3)';" onmouseout="this.style.transform='none'; this.style.borderColor='rgba(128, 0, 0, 0.1)';" onclick="window.salestrack.openDoc('Hot Lead', '${(l.name || '').replace(/'/g, "\\'")}');">
                        <div style="font-weight:800; color:#1e293b; font-size:13px; margin-bottom:6px; letter-spacing:0.02em;">${l.lead_name || l.party_name || 'Anonymous Lead'}</div>
                        <div style="font-size:11px; color:#64748b; display:flex; justify-content:space-between; align-items:center; font-weight:600;">
                            <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:140px;">&#x1F4CD; ${l.territory || 'Global Market'}</span>
                            <span style="font-weight:900; color:#b91c1c; background:rgba(128, 0, 0, 0.05); padding:3px 10px; border-radius:99px; font-size:10px; letter-spacing:0.02em;">${l.status || 'HOT'}</span>
                        </div>
                    </div>
                `).join('');
            }
        }
    }

    changeMonth(offset) {
        this.selectedDate.setMonth(this.selectedDate.getMonth() + offset);
        this.updateActionCenterHeader();
        this.renderWeeklyCalendar();
        omnisLog(`[ActionCenter] Month shifted by ${offset}. Now viewing ${this.selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' })}`);
    }

    updateActionCenterHeader() {
        const label = document.getElementById("action-center-month-label");
        if (label) {
            const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            label.textContent = `${months[this.selectedDate.getMonth()]} ${this.selectedDate.getFullYear()}`;
        }
    }

    renderWeeklyCalendar() {
        const weekNav = document.querySelector(".week-nav");
        if (!weekNav) return;

        // Find the start of the week for the currently selected date
        const d = new Date(this.selectedDate);
        const dayNum = d.getDay(); // 0 (Sun) - 6 (Sat)
        const diff = d.getDate() - dayNum + (dayNum === 0 ? -6 : 1); // Adjust for Monday start
        const monday = new Date(d.setDate(diff));

        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const today = new Date();
        const isCurrentMonth = today.getMonth() === this.selectedDate.getMonth() && today.getFullYear() === this.selectedDate.getFullYear();

        weekNav.innerHTML = days.map((dayName, index) => {
            const currentDay = new Date(monday);
            currentDay.setDate(monday.getDate() + index);
            const isToday = isCurrentMonth && currentDay.getDate() === today.getDate();
            return `
                <div class="week-day ${isToday ? 'active' : ''}">
                    ${dayName}
                    <div style="font-size: 10px; font-weight: 700; margin-top: 2px;">${currentDay.getDate()}</div>
                </div>
            `;
        }).join('');
    }

    async openEfficiencyReportModalV5(targetPeriod, targetCompany) {
        // Init global filter state if not exists
        if (!this._effFilters) {
            this._effFilters = {
                period: "This Month",
                company: "Machinery Exchange"
            };
        }

        // Update filters ONLY if arguments are explicitly passed
        if (targetPeriod) this._effFilters.period = targetPeriod;
        if (targetCompany) this._effFilters.company = targetCompany;

        const periodText = this._effFilters.period;
        const companyText = this._effFilters.company;

        console.log(`[EFF V5] State: Period=${periodText}, Company=${companyText}`);

        // Generate Header with STABLE onchange handlers
        const headerTitle = `
            <div id="eff-report-header" style="display:flex; align-items:center; gap:15px; width:100%; justify-content:space-between; background: #f0f7ff; padding: 10px; border-radius: 8px;">
                <span style="font-size:18px; font-weight:800; color:#0f172a;">Efficiency Reports</span>
                <div style="display:flex; align-items:center; gap:10px;">
                    <select id="eff-company-select-v5" 
                        onchange="window.salestrack.openEfficiencyReportModalV5(null, this.value)" 
                        style="padding:6px 12px; border-radius:6px; border:1px solid #cbd5e1; font-size:13px; font-weight:600; color:#334155; outline:none; cursor:pointer;">
                        <option value="All" ${companyText === 'All' ? 'selected' : ''}>All Companies</option>
                        <option value="Machinery Exchange" ${companyText === 'Machinery Exchange' ? 'selected' : ''}>Machinery Exchange</option>
                        <option value="Sinopower" ${companyText === 'Sinopower' ? 'selected' : ''}>Sinopower Zimbabwe</option>
                    </select>
                    <select id="eff-period-select-v5" 
                        onchange="window.salestrack.openEfficiencyReportModalV5(this.value, null)" 
                        style="padding:6px 12px; border-radius:6px; border:1px solid #cbd5e1; font-size:13px; font-weight:600; color:#334155; outline:none; cursor:pointer;">
                        <option value="This Month" ${periodText === 'This Month' ? 'selected' : ''}>This Month</option>
                        <option value="Last Month" ${periodText === 'Last Month' ? 'selected' : ''}>Last Month</option>
                        <option value="This Year" ${periodText === 'This Year' ? 'selected' : ''}>This Year</option>
                        <option value="All Time" ${periodText === 'All Time' ? 'selected' : ''}>All Time</option>
                    </select>
                    <button onclick="window.print()" class="no-print" style="padding:6px 12px; background:#475569; color:white; border:none; border-radius:6px; cursor:pointer; font-size:13px; font-weight:600; display:flex; align-items:center; gap:6px;">
                        Print PDF
                    </button>
                </div>
            </div>
        `;

        const loaderHtml = `
            <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; min-height:400px; color:#64748b;">
                <div style="width:50px; height:50px; border:4px solid #f3f4f6; border-top:4px solid #2563eb; border-radius:50%; animation:spin 1s linear infinite; margin-bottom:20px;"></div>
                <div style="font-size:16px; font-weight:600;">Analyzing Efficiency...</div>
                <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
            </div>
        `;

        this._activeModalSession = Math.random();
        const currentSession = this._activeModalSession;

        const existingHeader = document.getElementById('eff-report-header');
        const modalBody = document.getElementById('dash-generic-body');

        if (!existingHeader) {
            this.openListModal(headerTitle, loaderHtml, "1500px");
            const inner = document.getElementById('dash-modal-inner');
            if (inner) inner.style.maxHeight = '95vh';
        } else {
            if (modalBody) modalBody.innerHTML = loaderHtml;
            // Sync dropdowns
            const sComp = existingHeader.querySelector('#eff-company-select-v5');
            const sPeri = existingHeader.querySelector('#eff-period-select-v5');
            if (sComp) sComp.value = companyText;
            if (sPeri) sPeri.value = periodText;
        }

        try {
            const apiParams = {
                period: periodText,
                company: companyText,
                _v: "5",
                _ts: Date.now()
            };
            console.log(`[EFF V5] Requesting:`, apiParams);
            const res = await window.callFrappeSequenced(this.sys.baseUrl, "powerstar_salestrack.omnis_dashboard.get_eff_final_v10", apiParams);
            console.log(`[EFF V5] Received Response:`, res);

            if (this._activeModalSession !== currentSession) return;

            const payload = res.message || res;
            if (!payload.ok) throw new Error(payload.error || "Failed to fetch efficiency data");

            let { summary, rows, label } = payload;

            // ----------------------------------------------------
            // SUPABASE TRACKING ORDERS INJECTION
            // ----------------------------------------------------
            try {
                if (window.electron) {
                    const sbRes = await window.electron.invoke('supabase:query', {
                        table: 'omnis_tracking_orders',
                        method: 'select'
                    });
                    
                    if (sbRes.ok && sbRes.data) {
                        const now = new Date();
                        const currentMonth = now.getMonth();
                        const currentYear = now.getFullYear();
                        let addedRows = false;
                        
                        sbRes.data.forEach(t => {
                            if (companyText !== 'All' && t.company !== companyText) return;
                            if (!t.actual_handover) return;
                            
                            const actualDate = new Date(t.actual_handover);
                            const targetDateStr = t.revised_handover || t.target_handover;
                            if (!targetDateStr) return;
                            const targetDate = new Date(targetDateStr);
                            
                            let include = false;
                            if (periodText === 'All Time') {
                                include = true;
                            } else if (periodText === 'This Year') {
                                if (actualDate.getFullYear() === currentYear) include = true;
                            } else if (periodText === 'This Month') {
                                if (actualDate.getFullYear() === currentYear && actualDate.getMonth() === currentMonth) include = true;
                            } else if (periodText === 'Last Month') {
                                let lastM = currentMonth - 1;
                                let lastY = currentYear;
                                if (lastM < 0) { lastM = 11; lastY--; }
                                if (actualDate.getFullYear() === lastY && actualDate.getMonth() === lastM) include = true;
                            }
                            
                            if (include) {
                                const aD = new Date(actualDate.getFullYear(), actualDate.getMonth(), actualDate.getDate());
                                const tD = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
                                const rawDelay = Math.ceil((aD - tD) / (1000 * 60 * 60 * 24));
                                
                                let displayDelay = rawDelay;
                                if (rawDelay > 0 && rawDelay <= 3) displayDelay = 0;
                                else if (rawDelay > 3) displayDelay = rawDelay - 3;
                                
                                let status = '';
                                if (rawDelay < 0) status = 'Early';
                                else if (rawDelay === 0) status = 'On Time';
                                else if (rawDelay <= 3) status = 'Within Buffer';
                                else status = 'Late';
                                
                                rows.push({
                                    customer: t.customer,
                                    machine: t.machine || `${t.brand || ''} ${t.model || ''}`.trim(),
                                    target_date: targetDateStr,
                                    actual_date: t.actual_handover,
                                    delay: displayDelay,
                                    status: status,
                                    qty: t.qty || 1
                                });
                                addedRows = true;
                            }
                        });
                        
                        if (addedRows) {
                            let totalM = 0;
                            let totalS = 0;
                            let totalD = 0;
                            let onTime = 0;
                            
                            rows.forEach(r => {
                                const q = parseInt(r.qty) || 1;
                                const d = parseInt(r.delay) || 0;
                                totalM += q;
                                if (d > 0) {
                                    totalD += (d * q);
                                    totalS += (Math.max(0, 100 - (d * 1.5)) * q);
                                } else {
                                    onTime += q;
                                    totalS += (100 * q);
                                }
                            });
                            
                            summary.total_machines = totalM;
                            summary.on_time_or_early = onTime;
                            summary.efficiency_pct = totalM > 0 ? (totalS / totalM).toFixed(1) : "0.0";
                            summary.avg_delay = totalM > 0 ? (totalD / totalM).toFixed(1) : "0.0";
                            
                            rows.sort((a, b) => parseInt(b.delay) - parseInt(a.delay));
                        }
                    }
                }
            } catch(err) {
                console.error("[EFF V5] Error merging Supabase tracking orders:", err);
            }
            // ----------------------------------------------------
            
            // Flatten rows to ungroup items with qty > 1
            let flattenedRows = [];
            rows.forEach(r => {
                const q = parseInt(r.qty) || 1;
                if (q > 1) {
                    for (let i = 0; i < q; i++) {
                        flattenedRows.push({ ...r, qty: 1 });
                    }
                } else {
                    flattenedRows.push(r);
                }
            });
            rows = flattenedRows;

            const effColor = summary.efficiency_pct >= 80 ? '#22c55e' : (summary.efficiency_pct >= 50 ? '#f59e0b' : '#ef4444');

            let html = `
                <div class="eff-report-container" style="padding:32px; font-family:'Inter', sans-serif;">
                    <style>
                        @media print {
                            @page { margin: 10mm; size: auto; }
                            body > *:not(#dash-generic-modal), #main-view-container, #view-orders-list, .view-page, .ai-order-row { display: none !important; }
                            #dash-generic-modal { display: block !important; position: absolute !important; top: 0 !important; left: 0 !important; width: 100% !important; background: white !important; backdrop-filter: none !important; height: auto !important; }
                            #dash-modal-inner { width: 100% !important; max-width: none !important; max-height: none !important; border-radius: 0 !important; box-shadow: none !important; margin: 0 !important; border: none !important; }
                            #dash-modal-inner > div:first-child { display: none !important; }
                            #dash-generic-body { padding: 0 !important; overflow: visible !important; }
                            .eff-report-container { padding: 0 !important; border: none !important; background: white !important; }
                            .eff-report-container table { border-collapse: collapse !important; border: 2px solid black !important; width: 100% !important; margin-top: 20px !important; page-break-inside: auto; }
                            .eff-report-container tr { page-break-inside: avoid; page-break-after: auto; }
                            .eff-report-container th, .eff-report-container td { border: 1px solid black !important; font-size: 10px !important; padding: 6px 8px !important; }
                            .eff-summary-grid { display: grid !important; grid-template-columns: repeat(4, 1fr) !important; gap: 0 !important; border: 2px solid black !important; background: white !important; margin-bottom: 20px !important; }
                            .eff-summary-grid > div { border: 1px solid black !important; padding: 10px !important; }
                            .eff-report-container div, .eff-report-container table { box-shadow: none !important; border-radius: 0 !important; }
                            .no-print { display: none !important; }
                        }
                    </style>
                    
                    <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:40px; border-bottom:1px solid #e2e8f0; padding-bottom:20px;">
                        <img src="file:///C:/Users/Administrator/omnis/assets/images/omnis-logo.png" style="height:45px;" alt="Omnis Logo" onerror="this.src='../../assets/images/omnis-logo.png'">
                        <div style="text-align:right;">
                            <div style="font-size:24px; font-weight:900; color:#0f172a; letter-spacing:-0.03em;">${companyText} Handover Efficiency</div>
                            <div style="font-size:18px; color:#64748b; font-weight:500; margin-top:5px;">${label}</div>
                        </div>
                    </div>

                    <!-- Summary Cards -->
                    <div class="eff-summary-grid" style="display:grid; grid-template-columns: repeat(4, 1fr); gap:1px; background:#e2e8f0; border:1px solid #e2e8f0; border-radius:12px; overflow:hidden; margin-bottom:40px; box-shadow:0 4px 12px rgba(0,0,0,0.05);">
                        <div style="background:white; padding:24px; text-align:center;">
                            <div style="font-size:12px; font-weight:800; color:white; background:#1e40af; padding:6px 12px; display:inline-block; border-radius:6px; margin-bottom:12px; text-transform:uppercase; letter-spacing:0.05em;">Total Machines</div>
                            <div style="font-size:32px; font-weight:900; color:#1e40af;">${summary.total_machines}</div>
                        </div>
                        <div style="background:white; padding:24px; text-align:center;">
                            <div style="font-size:12px; font-weight:800; color:white; background:#166534; padding:6px 12px; display:inline-block; border-radius:6px; margin-bottom:12px; text-transform:uppercase; letter-spacing:0.05em;">On Time or Early</div>
                            <div style="font-size:32px; font-weight:900; color:#166534;">${summary.on_time_or_early}</div>
                        </div>
                        <div style="background:white; padding:24px; text-align:center;">
                            <div style="font-size:12px; font-weight:800; color:white; background:${effColor}; padding:6px 12px; display:inline-block; border-radius:6px; margin-bottom:12px; text-transform:uppercase; letter-spacing:0.05em;">Efficiency %</div>
                            <div style="font-size:32px; font-weight:900; color:${effColor};">${summary.efficiency_pct}%</div>
                        </div>
                        <div style="background:white; padding:24px; text-align:center;">
                            <div style="font-size:12px; font-weight:800; color:white; background:#991b1b; padding:6px 12px; display:inline-block; border-radius:6px; margin-bottom:12px; text-transform:uppercase; letter-spacing:0.05em;">Average Delay (days)</div>
                            <div style="font-size:32px; font-weight:900; color:#991b1b;">${summary.avg_delay}</div>
                        </div>
                    </div>

                    <!-- Efficiency Calculation Explanation -->
                    <div class="no-print" style="background:#f8fafc; border:1px solid #e2e8f0; border-left:4px solid #3b82f6; border-radius:8px; padding:16px 20px; margin-bottom:40px; display:flex; gap:16px; align-items:flex-start;">
                        <i class="fa fa-info-circle" style="color:#3b82f6; font-size:20px; margin-top:2px;"></i>
                        <div style="font-size:13px; color:#475569; line-height:1.6;">
                            <h4 style="margin:0 0 8px 0; color:#0f172a; font-size:14px; font-weight:700;">How is Efficiency Calculated?</h4>
                            <p style="margin:0 0 8px 0;">This report uses a <strong>Weighted Efficiency Score</strong> tailored to our operational parameters:</p>
                            <ul style="margin:0; padding-left:20px;">
                                <li style="margin-bottom:4px;"><strong>The 3-Day Buffer:</strong> Deliveries made on time, early, or up to 3 days late are considered perfect (100% score) and are marked as <span style="background:#fef3c7; color:#b45309; padding:2px 6px; border-radius:4px; font-size:10px; font-weight:800; text-transform:uppercase;">Within Buffer</span>.</li>
                                <li style="margin-bottom:4px;"><strong>Graduated Penalty:</strong> Orders that exceed the 3-day buffer receive a <strong>1.5% penalty per day</strong> past the buffer. (e.g., An order 10 days late is 7 days past the buffer, resulting in an 89.5% score).</li>
                                <li><strong>Overall Efficiency %:</strong> The main percentage above is the weighted average of all individual machine scores. The <em>Delay (Days)</em> column shows the delay <strong>after</strong> applying the buffer allowance.</li>
                            </ul>
                        </div>
                    </div>

                    <!-- Detailed Table -->
                    <div style="background:white; border:1px solid #e2e8f0; border-radius:12px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.03);">
                        <table class="eff-table" style="width:100%; border-collapse:separate; border-spacing:0; font-size:13px; text-align:left;">
                            <thead>
                                <tr style="background:#f8fafc; border-bottom:2px solid #e2e8f0;">
                                    <th style="padding:16px 20px; font-weight:800; color:#475569; text-transform:uppercase; letter-spacing:0.05em;">Customer</th>
                                    <th style="padding:16px 20px; font-weight:800; color:#475569; text-transform:uppercase; letter-spacing:0.05em;">Machine</th>
                                    <th style="padding:16px 20px; font-weight:800; color:#475569; text-transform:uppercase; letter-spacing:0.05em;">Target Date</th>
                                    <th style="padding:16px 20px; font-weight:800; color:#475569; text-transform:uppercase; letter-spacing:0.05em;">Actual Date</th>
                                    <th style="padding:16px 20px; font-weight:800; color:#475569; text-transform:uppercase; letter-spacing:0.05em; text-align:center;">Delay (Days)</th>
                                    <th style="padding:16px 20px; font-weight:800; color:#475569; text-transform:uppercase; letter-spacing:0.05em;">Status</th>
                                    <th style="padding:16px 20px; font-weight:800; color:#475569; text-transform:uppercase; letter-spacing:0.05em; text-align:center;">Qty</th>
                                    <th style="padding:16px 20px; font-weight:800; color:#475569; text-transform:uppercase; letter-spacing:0.05em;">Comments</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rows.map(r => {
                                    const commentKey = 'eff_comm_' + btoa(encodeURIComponent((r.customer || '') + (r.machine || '') + (r.actual_date || ''))).substring(0, 30);
                                    const savedComment = localStorage.getItem(commentKey) || '';
                                    return `
                                    <tr style="border-bottom:1px solid #f1f5f9; transition:background 0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
                                        <td style="padding:14px 20px; font-weight:700; color:#0f172a;">${(r.customer || '').replace(/"/g, '')}</td>
                                        <td style="padding:14px 20px; color:#475569;">${r.machine}</td>
                                        <td style="padding:14px 20px; color:#64748b;">${r.target_date}</td>
                                        <td style="padding:14px 20px; color:#0f172a; font-weight:600;">${r.actual_date}</td>
                                        <td style="padding:14px 20px; text-align:center; font-weight:800; color:${r.delay > 0 ? '#ef4444' : (r.delay < 0 ? '#22c55e' : '#64748b')};">
                                            ${r.delay > 0 ? '+' + r.delay : r.delay}
                                        </td>
                                        <td style="padding:14px 20px;">
                                            <span style="
                                                padding:4px 10px; border-radius:6px; font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:0.05em;
                                                ${r.status === 'Early' ? 'background:#dcfce7; color:#15803d;' : (r.status === 'On Time' ? 'background:#f1f5f9; color:#475569;' : (r.status === 'Within Buffer' ? 'background:#fef3c7; color:#b45309;' : 'background:#fee2e2; color:#b91c1c;'))}
                                            ">
                                                ${r.status}
                                            </span>
                                        </td>
                                        <td style="padding:14px 20px; text-align:center; font-weight:700; color:#0f172a;">${r.qty}</td>
                                        <td style="padding:14px 20px;">
                                            <input type="text" placeholder="Add comment..." value="${savedComment.replace(/"/g, '&quot;')}" data-eff-key="${commentKey}" onblur="localStorage.setItem(this.getAttribute('data-eff-key'), this.value); this.style.borderBottom='1px dashed #cbd5e1'" style="width:100%; min-width:140px; border:1px solid transparent; background:transparent; border-bottom:1px dashed #cbd5e1; padding:4px 0; font-family:inherit; font-size:12px; color:#334155; outline:none; transition: border-color 0.2s;" onfocus="this.style.borderBottom='1px solid #3b82f6'">
                                        </td>
                                    </tr>
                                    `;
                                }).join('')}
                                ${rows.length === 0 ? '<tr><td colspan="8" style="padding:40px; text-align:center; color:#94a3b8; font-style:italic;">No handover data found for this period.</td></tr>' : ''}
                            </tbody>
                        </table>
                    </div>

                    <div style="margin-top:24px; font-size:11px; color:#94a3b8; text-align:center;">
                        Generated via OAI &middot; Omnis SalesTrack &middot; ${new Date().toLocaleString()}
                    </div>
                </div>
            `;

            document.getElementById('dash-generic-body').innerHTML = html;

        } catch (e) {
            if (this._activeModalSession !== currentSession) return;
            console.error("Efficiency Report Error:", e);
            document.getElementById('dash-generic-body').innerHTML = `
                <div style="padding:60px; text-align:center; color:#ef4444;">
                    <div style="font-size:40px; margin-bottom:16px;">&#x2705;</div>
                    <div style="font-size:18px; font-weight:800; margin-bottom:8px;">Report Generation Failed</div>
                    <div style="color:#64748b; font-size:14px; line-height:1.6;">
                        ${e.message || "An unexpected network error occurred."}<br>
                        <span style="font-size:12px; margin-top:8px; display:block; opacity:0.8;">The request timed out or was interrupted. Please try again.</span>
                    </div>
                </div>
            `;
        }
    }

    renderHotLeads() {
        const container = document.getElementById('hot-leads-list');
        const filterEl = document.getElementById('hot-leads-filter');
        if (!container) return;

        if (!this.data.hot_leads) {
            container.innerHTML = `<div style="color:#ef4444; font-size:12px; padding:20px;">Data missing</div>`;
            return;
        }

        const leads = this.data.hot_leads || [];

        // POPULATE FILTER (Once)
        if (filterEl && filterEl.options.length <= 1 && leads.length > 0) {
            const reps = [...new Set(leads.map(l => l.sales_person_name || 'No Rep'))].sort();
            reps.forEach(rep => {
                const opt = document.createElement('option');
                opt.value = rep;
                opt.textContent = rep;
                filterEl.appendChild(opt);
            });
        }

        // FILTER DATA
        let displayLeads = leads;
        if (filterEl && filterEl.value !== 'All') {
            displayLeads = leads.filter(l => (l.sales_person_name || 'No Rep') === filterEl.value);
        }

        if (displayLeads.length === 0) {
            container.innerHTML = `<div style="color:#94a3b8; font-size:13px; font-style:italic; text-align:center; padding:20px; width:100%;">No leads found.</div>`;
            return;
        }

        // --- LIMIT LOGIC ---
        const LIMIT = 6;
        const visibleLeads = displayLeads.slice(0, LIMIT);
        const hasMore = displayLeads.length > LIMIT;

        let html = '';
        visibleLeads.forEach(lead => html += this._generateHotLeadCardHtml(lead));

        if (hasMore) {
            html += `
                <div onclick="salestrack.openFullHotLeadsModal()" style="
                    flex: 0 0 160px;
                    display:flex;
                    flex-direction:column;
                    align-items:center;
                    justify-content:center;
                    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
                    border: 2px dashed #e2e8f0;
                    border-radius:12px;
                    cursor:pointer;
                    transition: all 0.2s;
                    color: #475569;
                    gap: 8px;
                " onmouseover="this.style.borderColor='#cbd5e1'; this.style.background='#f1f5f9';" onmouseout="this.style.borderColor='#e2e8f0'; this.style.background='linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)';">
                    <div style="font-size:20px;">&#x1F4DA;</div>
                    <div style="font-size:12px; font-weight:700;">View All (${displayLeads.length})</div>
                </div>
            `;
        }

        container.innerHTML = html;
    }

    _generateHotLeadCardHtml(lead) {
        const dateStr = lead.date ? new Date(lead.date).toLocaleDateString() : 'No Date';
        const isNoDate = dateStr === 'No Date';

        // Date pill styling
        const dateStyle = isNoDate
            ? 'background:#f1f5f9; color:#64748b;'
            : 'background:#fdf2f2; color:#dc2626; border:1px solid #fee2e2;';

        const equipmentHtml = lead.equipment
            ? `<div style="font-size:10px; color:#475569; background:#f8fafc; padding:4px 8px; border-radius:6px; margin-top:6px; font-weight:600; border:1px solid #e2e8f0; display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                <span style="opacity:0.7;">&#x1F4E6;</span> ${lead.equipment}
               </div>`
            : '';

        return `
            <div style="flex: 0 0 240px; padding:12px; border-radius:12px; background:#ffffff; border:1px solid #e2e8f0; display:flex; flex-direction:column; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 2px 4px rgba(0,0,0,0.02); position:relative; overflow:hidden;" 
                 onmouseover="this.style.borderColor='#4f46e5'; this.style.boxShadow='0 8px 16px -4px rgba(79,70,229,0.1)'; this.style.transform='translateY(-2px)';" 
                 onmouseout="this.style.borderColor='#e2e8f0'; this.style.boxShadow='0 2px 4px rgba(0,0,0,0.02)'; this.style.transform='none';">
                
                <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:8px;">
                    <div style="display:flex; flex-direction:column; flex:1; overflow:hidden; padding-right:8px;">
                        <span style="font-weight:800; color:#0f172a; font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${lead.customer_name || ''}">${lead.customer_name || 'Unknown Customer'}</span>
                        <span style="font-size:11px; color:#64748b; font-weight:500;">${lead.sales_person_name || 'No Rep'}</span>
                    </div>
                    <div style="font-size:9px; ${dateStyle} padding:3px 8px; border-radius:12px; font-weight:800; letter-spacing:0.04em; flex-shrink:0;">
                        ${dateStr}
                    </div>
                </div>

                <div style="margin-top:auto;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                         <span style="font-size:10px; background:#f0f9ff; color:#0369a1; padding:2px 8px; border-radius:6px; font-weight:700; text-transform:uppercase; letter-spacing:0.02em;">
                            ${lead.status || 'Open'}
                         </span>
                         <a href="#" onclick="salestrack.openDoc('Hot Lead', '${(lead.name || '').replace(/'/g, "\\'")}'); return false;" 
                            style="text-decoration:none; color:#4f46e5; font-size:11px; font-weight:800; display:flex; align-items:center; gap:4px;">
                             Details <span style="font-size:14px;">&rarr;</span>
                         </a>
                    </div>
                    ${equipmentHtml}
                </div>
            </div>
        `;
    }

    openFullHotLeadsModal() {
        const leads = this.data.hot_leads || [];

        // 1. Get unique salespersons
        const salespersons = [...new Set(leads.map(l => l.sales_person_name || 'No Rep'))].sort();

        const content = `
            <div style="margin-bottom:16px; display:flex; gap:16px; align-items:flex-end; background:#f8fafc; padding:16px; border-radius:8px; border:1px solid #e2e8f0; flex-wrap:wrap;">
                <div style="display:flex; flex-direction:column; gap:6px; flex:1; min-width:200px;">
                    <label style="font-size:11px; font-weight:700; color:#64748b; letter-spacing:0.5px;">SALES PERSON</label>
                    <select id="modal-filter-rep" onchange="salestrack.filterHotLeadsModal()" style="padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; width:100%; background:white;">
                        <option value="All">All Salespersons</option>
                        ${salespersons.map(s => `<option value="${s}">${s}</option>`).join('')}
                    </select>
                </div>
                <div style="display:flex; flex-direction:column; gap:6px; flex:1.5; min-width:240px;">
                     <label style="font-size:11px; font-weight:700; color:#64748b; letter-spacing:0.5px;">DATE RANGE</label>
                     <div style="display:flex; gap:8px;">
                        <input type="date" id="modal-filter-date-start" placeholder="From" onchange="salestrack.filterHotLeadsModal()" style="flex:1; padding:7px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; min-width:100px;">
                        <input type="date" id="modal-filter-date-end" placeholder="To" onchange="salestrack.filterHotLeadsModal()" style="flex:1; padding:7px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; min-width:100px;">
                     </div>
                </div>
                 <div style="padding-bottom:1px;">
                     <button onclick="salestrack.clearHotLeadsFilters()" style="padding:8px 16px; background:white; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; font-weight:600; color:#475569; cursor:pointer; transition:all 0.2s; white-space:nowrap;" onmouseover="this.style.borderColor='#94a3b8'" onmouseout="this.style.borderColor='#cbd5e1'">
                        Clear Filters
                     </button>
                </div>
            </div>
            <div id="modal-hot-leads-list" style="display:flex; flex-direction:column; gap:8px;">
                <!-- Items go here -->
            </div>
        `;

        this.openListModal("Hot Leads (" + leads.length + ")", content);
        this.filterHotLeadsModal();
    }

    filterHotLeadsModal() {
        const repEl = document.getElementById('modal-filter-rep');
        const startEl = document.getElementById('modal-filter-date-start');
        const endEl = document.getElementById('modal-filter-date-end');
        const container = document.getElementById('modal-hot-leads-list');

        if (!repEl || !startEl || !endEl || !container) return;

        const rep = repEl.value;
        const startDate = startEl.value;
        const endDate = endEl.value;

        let leads = this.data.hot_leads || [];

        if (rep !== 'All') {
            leads = leads.filter(l => (l.sales_person_name || 'No Rep') === rep);
        }

        if (startDate) {
            leads = leads.filter(l => {
                if (!l.date) return false;
                return l.date.substring(0, 10) >= startDate;
            });
        }

        if (endDate) {
            leads = leads.filter(l => {
                if (!l.date) return false;
                return l.date.substring(0, 10) <= endDate;
            });
        }

        // Update Title Count
        const titleEl = document.getElementById('dash-generic-title');
        if (titleEl) titleEl.textContent = "Hot Leads (" + leads.length + ")";

        if (leads.length === 0) {
            container.innerHTML = `<div style="text-align:center; padding:20px; color:#94a3b8; font-style:italic;">No items match filters</div>`;
            return;
        }

        let html = '';
        leads.forEach(lead => html += this._generateHotLeadCardHtml(lead));
        container.innerHTML = html;
    }

    clearHotLeadsFilters() {
        const repEl = document.getElementById('modal-filter-rep');
        const startEl = document.getElementById('modal-filter-date-start');
        const endEl = document.getElementById('modal-filter-date-end');
        if (repEl) repEl.value = 'All';
        if (startEl) startEl.value = '';
        if (endEl) endEl.value = '';
        this.filterHotLeadsModal();
    }

    // ══════════════════════════════════════════════════════════════════════════
    // OEM PROCUREMENT INTELLIGENCE TABLE
    // ══════════════════════════════════════════════════════════════════════════

    // NEW: High-Fidelity OEM Chart with Auto-Cycle
    renderOEMChart() {
        const container = document.getElementById('widget-oem-chart');
        if (!container) return;

        // Lifecycle: Cleanup existing interval to prevent "ghost" cycles
        if (this.oemCycleInterval) {
            clearInterval(this.oemCycleInterval);
            this.oemCycleInterval = null;
        }

        let oemData = this.data.oem_sales || [];

        // --- INTERCEPT & MERGE POWERSTAR → EVERSTAR INDUSTRIES ---
        if (Array.isArray(oemData)) {
            const powerstarRows = oemData.filter(d =>
                (d.oem || '').toLowerCase().includes('powerstar') ||
                (d.oem || '').toLowerCase().includes('power star')
            );
            if (powerstarRows.length > 0) {
                let everstarRow = oemData.find(d => (d.oem || '').toLowerCase().includes('everstar'));
                if (!everstarRow) {
                    everstarRow = { oem: 'Everstar Industries', models: [], sales: 0, total_qty: 0, quotes: 0, monthly_velocity: 0, suggested_order: 0 };
                    oemData.push(everstarRow);
                }
                if (!everstarRow.models) everstarRow.models = [];
                powerstarRows.forEach(psRow => {
                    (psRow.models || []).forEach(m => {
                        if (!everstarRow.models.includes(m)) everstarRow.models.push(m);
                    });
                    const idx = oemData.indexOf(psRow);
                    if (idx > -1) oemData.splice(idx, 1);
                });
                // Recalculate Everstar totals based on models if present, else fallback
                if (everstarRow.models.length > 0) {
                    everstarRow.sales = everstarRow.models.reduce((s, m) => s + (m.sales || m.total_qty || 0), 0);
                    everstarRow.total_qty = everstarRow.sales;
                    everstarRow.quotes = everstarRow.models.reduce((s, m) => s + (m.quotes || 0), 0);
                    everstarRow.monthly_velocity = parseFloat(everstarRow.models.reduce((s, m) => s + (m.monthly_velocity || 0), 0).toFixed(1));
                    everstarRow.suggested_order = everstarRow.models.reduce((s, m) => s + (m.suggested_order || 0), 0);
                } else {
                    // If no models array existed (e.g. basic list), just sum the raw numbers
                    let addedSales = 0, addedQuotes = 0;
                    powerstarRows.forEach(r => { addedSales += (r.sales || r.total_qty || 0); addedQuotes += (r.quotes || 0); });
                    everstarRow.sales = (everstarRow.sales || everstarRow.total_qty || 0) + addedSales;
                    everstarRow.total_qty = everstarRow.sales;
                    everstarRow.quotes = (everstarRow.quotes || 0) + addedQuotes;
                }
            }
        }
        // ---------------------------------------------------------

        if (oemData.length === 0) {
            container.innerHTML = `<div style="color:#cbd5e1; font-size:12px; display:flex; align-items:center; justify-content:center; height:100%;">No OEM data available</div>`;
            return;
        }

        const labels = oemData.map(d => d.oem);
        const series = oemData.map(d => d.total_qty);
        const totalUnits = series.reduce((a, b) => a + b, 0);

        this.oemCycleIndex = 0; // Initialize state

        const options = {
            series: series,
            labels: labels,
            chart: {
                type: 'donut',
                id: 'oemSummaryDonut',
                height: 600,
                fontFamily: 'Plus Jakarta Sans, sans-serif',
                animations: {
                    enabled: true,
                    easing: 'easeinout',
                    speed: 800,
                    animateGradually: { enabled: true, delay: 150 },
                    dynamicAnimation: { enabled: true, speed: 350 }
                },
                events: {
                    dataPointSelection: (event, chartContext, config) => {
                        // ✏ Only open the modal if the selection was a REAL user click
                        if (!event) return;
                        const oemName = labels[config.dataPointIndex];
                        const rowData = oemData[config.dataPointIndex];
                        let dashboardTotals = null;
                        if (rowData) {
                            dashboardTotals = {
                                ytdSales: rowData.total_qty || rowData.sales || 0,
                                ytdQuotes: rowData.quotes || 0
                            };
                        }
                        if (oemName) this.openOEMBreakdownModal(oemName, null, null, null, dashboardTotals);
                    },
                    legendClick: (chartContext, seriesIndex) => {
                        const oemName = labels[seriesIndex];
                        const rowData = oemData[seriesIndex];
                        let dashboardTotals = null;
                        if (rowData) {
                            dashboardTotals = {
                                ytdSales: rowData.total_qty || rowData.sales || 0,
                                ytdQuotes: rowData.quotes || 0
                            };
                        }
                        if (oemName) this.openOEMBreakdownModal(oemName, null, null, null, dashboardTotals);
                    }
                }
            },
            stroke: { show: false },
            states: {
                active: { allowMultipleDataPointsSelection: false, filter: { type: 'none' } },
                inactive: { opacity: 0.35, filter: { type: 'none' } }
            },
            plotOptions: {
                pie: {
                    donut: {
                        size: '76%',  // slightly larger hole gives more text room
                        labels: {
                            show: true,
                            name: {
                                show: true,
                                fontSize: '13px',
                                fontWeight: 600,
                                color: '#64748b',
                                offsetY: 30
                            },
                            value: {
                                show: true,
                                fontSize: '17px', // reduced from 34px — fits long names without overflow
                                fontWeight: 800,
                                color: '#1e293b',
                                offsetY: -12
                            },
                            total: {
                                show: true,
                                showAlways: true,
                                label: `${series[0]} units (${totalUnits > 0 ? ((series[0] / totalUnits) * 100).toFixed(1) : 0}%)`,
                                color: '#94a3b8',
                                fontSize: '13px',
                                fontWeight: 600,
                                formatter: () => {
                                    const n = labels[0] || '';
                                    return n.length > 20 ? n.substring(0, 18) + '\u2026' : n;
                                }
                            }
                        }
                    }
                }
            },
            dataLabels: { enabled: false },
            legend: {
                position: 'bottom',
                offsetY: 0,
                fontSize: '11px',
                fontWeight: 600,
                fontFamily: 'Plus Jakarta Sans, sans-serif',
                labels: { colors: '#94a3b8' },
                markers: { width: 8, height: 8, radius: 2 },
                itemMargin: { horizontal: 8, vertical: 4 },
                formatter: function (val, opts) {
                    return val + ": " + opts.w.globals.series[opts.seriesIndex];
                }
            },
            // Full initial palette — one colour per label, cycling palette if > 15 OEMs
            colors: labels.map((_, i) => (['#1e40af','#8b2219','#059669','#d97706','#7c3aed','#db2777','#0891b2','#4b5563','#1e293b','#0f766e','#7e22ce','#b45309','#be123c','#0369a1','#15803d'])[i % 15])
        };

        container.innerHTML = "";
        const chart = new ApexCharts(container, options);
        chart.render();

        // 🚀 Auto-Cycle Engine — highlights one slice at a time across ALL OEMs
        const basePalette = ['#1e40af', '#8b2219', '#059669', '#d97706', '#7c3aed', '#db2777', '#0891b2', '#4b5563', '#1e293b', '#0f766e', '#7e22ce', '#b45309', '#be123c', '#0369a1', '#15803d'];

        this.oemCycleInterval = setInterval(() => {
            if (!document.getElementById('widget-oem-chart')) {
                clearInterval(this.oemCycleInterval);
                return;
            }

            this.oemCycleIndex = (this.oemCycleIndex + 1) % labels.length;
            const currentOEM  = labels[this.oemCycleIndex];
            const currentQty  = series[this.oemCycleIndex];
            const currentPct  = totalUnits > 0 ? ((currentQty / totalUnits) * 100).toFixed(1) : 0;

            // Build a colour for EVERY label — dim all except the active one
            const cycleColors = labels.map((_, i) => {
                const base = basePalette[i % basePalette.length];
                return i === this.oemCycleIndex ? base : base + '28'; // ~16% opacity
            });

            chart.updateOptions({
                colors: cycleColors,
                plotOptions: {
                    pie: {
                        donut: {
                            labels: {
                        total: {
                                    label: `${currentQty} units (${currentPct}%)`,
                                    formatter: () => {
                                        const n = currentOEM || '';
                                        return n.length > 20 ? n.substring(0, 18) + '\u2026' : n;
                                    }
                                }
                            }
                        }
                    }
                }
            }, false, false); // animate=false prevents the double-flash
        }, 4000);

        // Render KPI Table — Smart Procurement Intelligence
        const kpisContainer = document.getElementById('widget-oem-kpis');
        if (kpisContainer) {
            window._oemTableData = oemData; // cache for filter re-render
            window._renderOEMProcurementTable(kpisContainer, oemData, 'This Year');
        }

        // Render Quick Insights
        const insightsContainer = document.getElementById('widget-oem-insights');
        if (insightsContainer && oemData.length > 0) {
            const sortedBySales = [...oemData].sort((a, b) => (b.sales || 0) - (a.sales || 0));
            const sortedByQuotes = [...oemData].sort((a, b) => (b.quotes || 0) - (a.quotes || 0));
            const sortedByConv = [...oemData].sort((a, b) => {
                const bRate = (b.quotes || 0) > 0 ? (b.sales || 0) / b.quotes : 0;
                const aRate = (a.quotes || 0) > 0 ? (a.sales || 0) / a.quotes : 0;
                return bRate - aRate;
            });

            const topSales = sortedBySales[0];
            const topQuotes = sortedByQuotes[0];
            const topConv = sortedByConv[0];
            const totalSales = oemData.reduce((acc, curr) => acc + (curr.sales || 0), 0);
            const marketShare = totalSales > 0 ? ((topSales.sales / totalSales) * 100).toFixed(1) : 0;
            const topConvRate = (topConv.quotes || 0) > 0 ? ((topConv.sales / topConv.quotes) * 100).toFixed(1) : 0;

            insightsContainer.innerHTML = `
                <h4 style="font-size:12px; font-weight:800; color:#475569; text-transform:uppercase; letter-spacing:0.05em; margin:0 0 16px 0; display:flex; align-items:center; gap:8px;">
                    <i class="fas fa-lightbulb" style="color:#f59e0b;"></i> Quick Insights
                </h4>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
                    <div style="background:#fff; padding:12px; border-radius:10px; border:1px solid #e2e8f0;">
                        <div style="font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase; margin-bottom:4px;">Top Performer</div>
                        <div style="font-size:14px; font-weight:800; color:#0f172a;">${topSales.oem}</div>
                        <div style="font-size:11px; color:#10b981; font-weight:600; margin-top:2px;">${marketShare}% Market Share</div>
                    </div>
                    <div style="background:#fff; padding:12px; border-radius:10px; border:1px solid #e2e8f0;">
                        <div style="font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase; margin-bottom:4px;">Pipeline Leader</div>
                        <div style="font-size:14px; font-weight:800; color:#0f172a;">${topQuotes.oem}</div>
                        <div style="font-size:11px; color:#3b82f6; font-weight:600; margin-top:2px;">${topQuotes.quotes} Active Quotes</div>
                    </div>
                </div>
                <div style="margin-top:16px; padding:12px; background:linear-gradient(135deg, #eff6ff, #dbeafe); border-radius:10px; border:1px solid #bfdbfe;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <div style="width:32px; height:32px; background:#fff; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 4px rgba(0,0,0,0.05);">
                            <i class="fas fa-chart-line" style="color:#2563eb; font-size:14px;"></i>
                        </div>
                        <div>
                            <div style="font-size:11px; font-weight:800; color:#1e40af; text-transform:uppercase; letter-spacing:0.02em;">Efficiency High-Point</div>
                            <div style="font-size:13px; color:#1e3a8a; font-weight:600;">
                                <strong>${topConv.oem}</strong> is your most efficient brand with a <strong>${topConvRate}%</strong> conversion rate.
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
    }


    async openMERReportModal(selectedPeriod = null, selectedCompany = null) {
        console.log("Opening Detailed MER Report...");
        const periodText = selectedPeriod || "This Month";
        const companyText = selectedCompany || "Machinery Exchange";

        const loaderHtml = `
            <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; min-height:400px; color:#64748b;">
                <div style="width:50px; height:50px; border:4px solid #f3f4f6; border-top:4px solid #10b981; border-radius:50%; animation:spin 1s linear infinite; margin-bottom:20px;"></div>
                <div style="font-size:16px; font-weight:600;">Generating MER Report...</div>
                <div style="font-size:13px; margin-top:8px;">Please wait while management data is being compiled.</div>
                <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
            </div>
        `;

        const headerTitle = `
            <div style="display:flex; align-items:center; gap:15px; width:100%; justify-content:space-between;">
                <span style="font-size:18px; font-weight:800; color:#0f172a;">MER Management Report</span>
                <div style="display:flex; align-items:center; gap:10px;">
                    <select id="mer-company-select" onchange="window.salestrack.openMERReportModal(document.getElementById('mer-period-select').value, this.value)" style="padding:6px 12px; border-radius:6px; border:1px solid #cbd5e1; font-size:13px; font-weight:600; color:#334155; outline:none; cursor:pointer;">
                        <option value="All" ${companyText === 'All' ? 'selected' : ''}>All Companies</option>
                        <option value="Machinery Exchange" ${companyText === 'Machinery Exchange' ? 'selected' : ''}>Machinery Exchange</option>
                        <option value="Sinopower" ${companyText === 'Sinopower' ? 'selected' : ''}>Sinopower Zimbabwe</option>
                    </select>
                    <select id="mer-period-select" onchange="window.salestrack.openMERReportModal(this.value, document.getElementById('mer-company-select').value)" style="padding:6px 12px; border-radius:6px; border:1px solid #cbd5e1; font-size:13px; font-weight:600; color:#334155; outline:none; cursor:pointer;">
                        <option value="This Month" ${periodText === 'This Month' ? 'selected' : ''}>This Month</option>
                        <option value="Last Month" ${periodText === 'Last Month' ? 'selected' : ''}>Last Month</option>
                    </select>
                    <button onclick="window.print()" class="no-print" style="padding:6px 12px; background:#475569; color:white; border:none; border-radius:6px; cursor:pointer; font-size:13px; font-weight:600; display:flex; align-items:center; gap:6px;">
                        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg> 
                        Print PDF
                    </button>
                </div>
            </div>
        `;

        this._activeModalSession = Math.random();
        const currentSession = this._activeModalSession;

        const existingModal = document.getElementById('dash-generic-modal');
        if (existingModal && existingModal.style.display === 'flex') {
            const titleEl = document.getElementById('dash-generic-title');
            if (titleEl) titleEl.innerHTML = headerTitle;
            const bodyEl = document.getElementById('dash-generic-body');
            if (bodyEl) bodyEl.innerHTML = loaderHtml;
        } else {
            this.openListModal(headerTitle, loaderHtml);
        }

        // Apply Full-Page Layout
        const inner = document.getElementById('dash-modal-inner');
        if (inner) {
            inner.style.width = '98%';
            inner.style.maxWidth = '1700px';
            inner.style.height = '96%';
            inner.style.maxHeight = '96%';
            inner.style.border = 'none';
            inner.style.boxShadow = 'none';
            // Also hide original modal header if needed, but since we use headerTitle it's fine
        }

        const genericBody = document.getElementById('dash-generic-body');
        if (genericBody) {
            genericBody.style.overflowY = 'auto';
            genericBody.style.height = '100%';
        }

        try {
            const reqData = { period: periodText, company: companyText };
            const res = await window.callFrappeSequenced(this.sys.baseUrl, "powerstar_salestrack.omnis_dashboard.get_mer_report_data", reqData);

            if (this._activeModalSession !== currentSession) return;

            const payload = res.message || res;
            if (!payload.ok) throw new Error(payload.error || "Failed to fetch MER data");

            const {
                report_month, prev_month, report_year, dynamic_summary, ai_suggestions,
                performance_table, sales_details, oem_summary,
                shantui_report, hitachi_report, bobcat_report, customer_analysis,
                performance_mxg, performance_sp
            } = payload;

            const lostSalesTotal = payload.lost_sales_total || 0;

            const renderOEMTable = (title, data, accentColor) => {
                if (!data || data.length === 0) return "";
                return `
                    <div style="font-weight:900; color:#0f172a; margin: 30px 0 15px 0; text-transform:uppercase; font-size:13px; border-left: 4px solid ${accentColor}; padding-left: 10px; letter-spacing: 0.05em;">${title}</div>
                    <table class="mer-table">
                        <thead>
                            <tr>
                                <th rowspan="2">OEM</th>
                                <th colspan="2" style="text-align:center;">Targets</th>
                                <th colspan="2" style="text-align:center;">${prev_month}</th>
                                <th colspan="2" style="text-align:center; background:#e0f2fe; color:black;">${report_month}</th>
                                <th colspan="2" style="text-align:center;">Year to Date</th>
                                <th colspan="2" style="text-align:center;">Conversion %</th>
                            </tr>
                            <tr>
                                <th>Quotes</th><th>Sales</th>
                                <th>Quotes</th><th>Sales</th>
                                <th style="background:#f0fafb; color:black;">Quotes</th><th style="background:#f0fafb; color:black;">Sales</th>
                                <th>Quotes</th><th>Sales</th>
                                <th>MTD</th><th>YTD</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.map(r => `
                                <tr>
                                    <td style="font-weight:700;">${r.oem}</td>
                                    <td style="color:#94a3b8;">-</td><td style="color:#94a3b8;">-</td>
                                    <td>${r.prev_q}</td><td>${r.prev_s}</td>
                                    <td style="font-weight:800; background:#f0f9ff;">${r.curr_q}</td>
                                    <td style="font-weight:800; background:#f0f9ff;">${r.curr_s}</td>
                                    <td>${r.ytd_q}</td><td>${r.ytd_s}</td>
                                    <td style="font-weight:800; color:#0369a1;">${r.conv_mtd}%</td>
                                    <td style="font-weight:800; color:#0f172a;">${r.conv_ytd}%</td>
                                </tr>
                            `).join('')}
                            <tr class="total-row" style="background:${accentColor} !important;">
                                <td>TOTAL</td>
                                <td>-</td><td>-</td>
                                <td>${data.reduce((a, b) => a + b.prev_q, 0)}</td>
                                <td>${data.reduce((a, b) => a + b.prev_s, 0)}</td>
                                <td>${data.reduce((a, b) => a + b.curr_q, 0)}</td>
                                <td>${data.reduce((a, b) => a + b.curr_s, 0)}</td>
                                <td>${data.reduce((a, b) => a + b.ytd_q, 0)}</td>
                                <td>${data.reduce((a, b) => a + b.ytd_s, 0)}</td>
                                <td>-</td><td>-</td>
                            </tr>
                        </tbody>
                    </table>
                `;
            };

            let html = `
                <div class="mer-report-container" style="font-family:'Inter', sans-serif; background:var(--page-bg); color:var(--text-dark); padding: 40px 20px; display: flex; flex-direction: column; align-items: center;">
                    
                    <style>
                        .mer-page { background: white; padding: 40px; margin-bottom: 30px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border-radius:4px; min-height: 800px; display: none; border: 1px solid #e2e8f0; width: 100%; max-width: 1600px; }
                        .mer-header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
                        .mer-title { font-size: 24px; font-weight: 950; color: #0f172a; letter-spacing: -0.02em; }
                        .mer-subtitle { font-size: 14px; color: #64748b; font-weight: 600; text-transform: uppercase; margin-top: 4px; }
                        
                        .mer-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); border-radius: 4px; overflow: hidden; }
                        .mer-table th { background: rgba(128, 0, 0, 0.85); padding: 14px 12px; text-align: left; font-weight: 850; color: white; border: 1px solid rgba(128,0,0,0.6); text-transform: uppercase; letter-spacing: 0.05em; font-size: 14px; }
                        .mer-table td { padding: 10px 12px; border: 1px solid #e2e8f0; color: #1e293b; }
                        .mer-table tr:nth-child(even) { background: #f8fafc; }
                        .mer-table .total-row td { background: #7f1d1d !important; color: white; font-weight: 900; font-size: 16px; padding: 14px 12px; }
                        
                        .brand-box { padding: 12px 20px; border-radius: 4px; font-weight: 900; display: inline-flex; align-items: center; gap: 10px; margin-bottom: 15px; background: rgba(128, 0, 0, 0.08); color: #0f172a; border: 1px solid #e2e8f0; }
                        .highlight-red { color: #dc2626; font-weight: 800; }
                        
                        @media print {
                            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                            body > *:not(#dash-generic-modal), #main-view-container, #view-orders-list, .view-page, .ai-order-row { display: none !important; }
                            #dash-generic-modal { display: block !important; position: absolute !important; top: 0 !important; left: 0 !important; width: 100% !important; background: white !important; backdrop-filter: none !important; height: auto !important; }
                            #dash-modal-inner { width: 100% !important; max-width: none !important; max-height: none !important; border-radius: 0 !important; box-shadow: none !important; margin: 0 !important; border: none !important; }
                            #dash-modal-inner > div:first-child { display: none !important; }
                            #dash-generic-body { padding: 0 !important; overflow: visible !important; }
                            .mer-report-container { padding: 0 !important; display: block !important; background: white !important; }
                            .mer-page { display: block !important; margin: 0; padding: 40px !important; box-shadow: none !important; border-radius: 0 !important; min-height: auto; page-break-after: always; border: none !important; width: 100% !important; max-width: none !important; }
                            .mer-table { border-collapse: collapse !important; width: 100% !important; margin-top: 20px !important; border: 1px solid #000 !important; }
                            .mer-table th { background: #7f1d1d !important; color: white !important; border: 1px solid #000 !important; -webkit-print-color-adjust: exact; }
                            .mer-table td { border: 1px solid #000 !important; font-size: 11px !important; }
                            .mer-table tr:nth-child(even) { background: #f8fafc !important; -webkit-print-color-adjust: exact; }
                            .mer-table .total-row td { background: #7f1d1d !important; color: white !important; -webkit-print-color-adjust: exact; }
                            .no-print { display: none !important; }
                        }
                    </style>

                    <!-- PAGE 1: MANAGEMENT SUMMARY -->
                    <div class="mer-page">
                        <div class="mer-header">
                            <img src="file:///C:/Users/Administrator/omnis/assets/images/omnis-logo.png" style="height:45px;" alt="Omnis Logo" onerror="this.src='../../assets/images/omnis-logo.png'">
                            <div style="text-align:right;">
                                <div class="mer-title">QUOTES & SALES MONTHLY REPORT</div>
                                <div class="mer-subtitle">MANAGEMENT SUMMARY &mdash; ${report_month} ${report_year}</div>
                            </div>
                        </div>
                        
                        <div style="font-size: 14px; line-height: 1.8; color: #334155; max-width: 800px;">
                            ${dynamic_summary}
                            <div style="margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
                                <div style="font-weight: 900; color: #0f172a; margin-bottom: 10px; text-transform: uppercase;">Next Month Outlook</div>
                                <p style="font-style: italic;">We expect conversion-focused activity to intensify, with management emphasis on closing open opportunities. Pipeline execution is expected to support a stable period-end close.</p>
                            </div>
                            
                            <div style="margin-top: 40px; background: #fff1f2; border-left: 4px solid #9f1239; padding: 25px; border-radius: 12px; box-shadow: 0 4px 15px rgba(159, 18, 57, 0.1);">
                                <div style="font-weight: 900; color: #881337; margin-bottom: 15px; display: flex; align-items: center; gap: 8px; font-size: 14px; text-transform: uppercase;">
                                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                                    Omnis AI Insights & Suggestions
                                </div>
                                <ul style="margin: 0; padding-left: 20px; color: #4c0519; font-size: 13px; line-height: 1.6;">
                                    ${(ai_suggestions || []).map(s => `<li style="margin-bottom: 8px;">${s}</li>`).join('')}
                                </ul>
                            </div>
                        </div>
                    </div>

                    <!-- PAGE 2: QUOTES & SALES PERFORMANCE -->
                    <div class="mer-page">
                        <div class="mer-header">
                            <div class="mer-title">QUOTES & SALES</div>
                            <div style="text-align:right;">
                                <div class="mer-subtitle">MONTHLY REPORT (${report_month} - ${report_year})</div>
                            </div>
                        </div>

                        ${performance_mxg && performance_mxg.length > 0 ? renderOEMTable("Machinery Exchange Performance", performance_mxg, "#7f1d1d") : ""}
                        ${performance_sp && performance_sp.length > 0 ? renderOEMTable("Sinopower Performance", performance_sp, "#0369a1") : ""}
                    </div>

                    <!-- PAGE 3: SALES DETAILS -->
                    <div class="mer-page">
                        <div class="mer-header">
                            <div class="mer-title">SALES DETAILS</div>
                            <div style="text-align:right;">
                                <div class="mer-subtitle">${report_month} ${report_year} ACTIVITIES</div>
                            </div>
                        </div>
                        
                        <div style="display:grid; grid-template-columns: 2fr 1fr; gap:30px;">
                            <div>
                                <table class="mer-table">
                                    <thead>
                                        <tr>
                                            <th>Customer</th><th>Date</th><th>OEM</th><th>Category</th><th>Model</th><th>QTY</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${sales_details.map(s => `
                                            <tr>
                                                <td style="font-weight:600;">${s.customer}</td>
                                                <td>${new Date(s.order_date).toLocaleDateString()}</td>
                                                <td>${s.oem}</td>
                                                <td>${s.category || '-'}</td>
                                                <td>${s.model}</td>
                                                <td style="font-weight:800; text-align:center;">${s.qty}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                            <div>
                                <div style="background:#fff1f2; border:1px solid #fda4af; border-radius:12px; padding:20px;">
                                    <div style="font-weight:900; font-size:12px; color:#991b1b; text-transform:uppercase; margin-bottom:15px;">Customer Analysis</div>
                                    <table style="width:100%; border-collapse:separate; border-spacing:0; font-size:13px;">
                                        <tr style="border-bottom:1px solid #fecdd3;">
                                            <td style="padding:8px 0; color:#475569;">Internal</td>
                                            <td style="text-align:right; font-weight:800;">${customer_analysis.Internal || 0}</td>
                                        </tr>
                                        <tr style="border-bottom:1px solid #fecdd3;">
                                            <td style="padding:8px 0; color:#475569;">Existing</td>
                                            <td style="text-align:right; font-weight:800;">${customer_analysis.Existing || 0}</td>
                                        </tr>
                                        <tr style="border-bottom:1px solid #fecdd3;">
                                            <td style="padding:8px 0; color:#475569;">New</td>
                                            <td style="text-align:right; font-weight:800;">${customer_analysis.New || 0}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding:12px 0; font-weight:900; color:#991b1b;">TOTAL</td>
                                            <td style="text-align:right; font-weight:900; color:#991b1b;">${customer_analysis.Existing + customer_analysis.New + (customer_analysis.Internal || 0)}</td>
                                        </tr>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- PAGE 4: OEM SUMMARY -->
                    <div class="mer-page">
                        <div class="mer-header">
                            <div class="mer-title">OEM SUMMARY</div>
                            <div style="text-align:right;">
                                <div class="mer-subtitle">CATEGORY & BRAND OVERVIEW</div>
                            </div>
                        </div>
                        
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:40px;">
                            <div>
                                <table class="mer-table">
                                    <thead><tr><th>Product Category</th><th>Quotations</th><th>Orders</th></tr></thead>
                                    <tbody>
                                        ${oem_summary.map(o => `
                                            <tr><td>${o.category}</td><td style="text-align:center;">${o.quotes || 0}</td><td style="text-align:center; font-weight:800;">${o.sales || 0}</td></tr>
                                        `).join('')}
                                        <tr class="total-row"><td>TOTAL</td><td style="text-align:center;">${oem_summary.reduce((a, b) => a + (b.quotes || 0), 0)}</td><td style="text-align:center;">${oem_summary.reduce((a, b) => a + (b.sales || 0), 0)}</td></tr>
                                    </tbody>
                                </table>
                            </div>
                            <div style="background:#f8fafc; padding:20px; border-radius:12px; border:1px solid #e2e8f0;">
                                <div style="font-weight:900; color:#0f172a; margin-bottom:15px; text-transform:uppercase; font-size:12px;">Top Performing Brands</div>
                                <table class="mer-table" style="background:white;">
                                    <thead><tr><th>Brand</th><th style="text-align:center;">Quoted</th><th style="text-align:center;">Orders</th></tr></thead>
                                    <tbody>
                                        ${performance_table.filter(r => r.curr_q > 0 || r.curr_s > 0).map(r => `
                                            <tr><td>${r.oem}</td><td style="text-align:center;">${r.curr_q}</td><td style="text-align:center; font-weight:800;">${r.curr_s}</td></tr>
                                        `).join('')}
                                        <tr class="total-row">
                                            <td>TOTAL</td>
                                            <td style="text-align:center;">${performance_table.filter(r => r.curr_q > 0 || r.curr_s > 0).reduce((a, b) => a + (b.curr_q || 0), 0)}</td>
                                            <td style="text-align:center; font-weight:800;">${performance_table.filter(r => r.curr_q > 0 || r.curr_s > 0).reduce((a, b) => a + (b.curr_s || 0), 0)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                                <table style="width:100%; border-collapse:separate; border-spacing:0; margin-top:10px;">
                                    <tbody>
                                        <tr>
                                            <td style="padding:8px; background:#f1f5f9; font-weight:700; text-align:left; font-size:13px; color:#0f172a; border-radius:4px;">Lost Sales</td>
                                            <td style="width:60px; padding:8px; font-weight:700; font-size:13px; color:#0f172a; text-align:right;">${lostSalesTotal}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <!-- BRAND PAGES (DYNAMIC) -->
                    ${(payload.brand_pages || [{ name: 'Shantui', data: shantui_report }, { name: 'Hitachi', data: hitachi_report }, { name: 'Bobcat', data: bobcat_report }]).map(brand => `
                        <div class="mer-page">
                            <div class="mer-header">
                                <div class="mer-title">${(brand.name || 'OEM').toUpperCase()} REPORT</div>
                                <div style="text-align:right;"><div class="mer-subtitle">MONTHLY PERFORMANCE</div></div>
                            </div>
                            <table class="mer-table">
                                <thead>
                                    <tr>
                                        <th rowspan="2">Product Category</th>
                                        <th rowspan="2">Model</th>
                                        <th colspan="2" style="text-align:center; background:rgba(0,0,0,0.1);">${report_month}</th>
                                        <th colspan="2" style="text-align:center;">Year to Date</th>
                                    </tr>
                                    <tr>
                                        <th>Quotes</th><th>Orders</th>
                                        <th>Quotes</th><th>Orders</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${brand.data.map(d => `
                                        <tr>
                                            <td>${d.category}</td>
                                            <td>${d.model}</td>
                                            <td style="text-align:center;">${d.quotes}</td>
                                            <td style="text-align:center; font-weight:800;">${d.orders}</td>
                                            <td style="text-align:center; color:#64748b;">${d.ytd_q}</td>
                                            <td style="text-align:center; color:#64748b;">${d.ytd_s}</td>
                                        </tr>
                                    `).join('')}
                                    <tr class="total-row">
                                        <td>TOTAL</td><td></td>
                                        <td style="text-align:center;">${brand.data.reduce((a, b) => a + b.quotes, 0)}</td>
                                        <td style="text-align:center;">${brand.data.reduce((a, b) => a + b.orders, 0)}</td>
                                        <td style="text-align:center;">${brand.data.reduce((a, b) => a + b.ytd_q, 0)}</td>
                                        <td style="text-align:center;">${brand.data.reduce((a, b) => a + b.ytd_s, 0)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    `).join('')}

                    <div class="no-print" style="position: sticky; bottom: 0; background: #f8fafc; padding: 20px 0; border-top: 1px solid #e2e8f0; width: 100%; display: flex; justify-content: center; gap: 15px; align-items: center; z-index: 10;">
                        <span id="mer-page-indicator" style="background:#f1f5f9; padding:12px 20px; border-radius:99px; font-weight:800; font-size:14px; box-shadow:0 10px 20px rgba(0,0,0,0.1); border:1px solid #cbd5e1; color:#334155;">Page 1</span>
                        <button id="btn-mer-prev" onclick="window.salestrack.changeMERPage(-1)" style="padding:12px 25px; background:#475569; color:white; border:none; border-radius:99px; font-weight:700; cursor:pointer; box-shadow:0 10px 20px rgba(0,0,0,0.2); transition:opacity 0.2s;">&larr; Previous</button>
                        <button id="btn-mer-next" onclick="window.salestrack.changeMERPage(1)" style="padding:12px 25px; background:#2563eb; color:white; border:none; border-radius:99px; font-weight:700; cursor:pointer; box-shadow:0 10px 20px rgba(0,0,0,0.2); transition:opacity 0.2s;">Next &rarr;</button>
                        <button onclick="window.print()" style="padding:12px 25px; background:#0f172a; color:white; border:none; border-radius:99px; font-weight:700; cursor:pointer; box-shadow:0 10px 20px rgba(0,0,0,0.2); margin-left:10px;">&#x1F5A8;&#xFE0F; Export PDF</button>
                    </div>

                </div>
            `;

            const genericBodyElement = document.getElementById('dash-generic-body');
            if (genericBodyElement) {
                genericBodyElement.innerHTML = html;
            } else {
                this.openListModal("MER Management Report", html);
            }

            // Initialize Pagination
            this.currentMerPage = 0;
            setTimeout(() => this.changeMERPage(0), 50);

        } catch (e) {
            if (this._activeModalSession !== currentSession) return;
            console.error("MER Report Error:", e);
            const genericBodyElement = document.getElementById('dash-generic-body');
            if (genericBodyElement) {
                genericBodyElement.innerHTML = `
                    <div style="padding:60px; text-align:center; color:#ef4444;">
                        <div style="font-size:40px; margin-bottom:16px;">&#x2705;</div>
                        <div style="font-size:18px; font-weight:800; margin-bottom:8px;">MER Report Failed</div>
                        <div style="color:#64748b; font-size:14px; line-height:1.6;">
                            ${e.message || "Unable to compile MER management data."}<br>
                            <span style="font-size:12px; margin-top:8px; display:block; opacity:0.8;">The network request timed out. Please try again.</span>
                        </div>
                    </div>
                `;
            } else {
                alert("Failed to load MER Report: " + e.message);
            }
        }
    }

    changeMERPage(direction) {
        if (typeof this.currentMerPage === 'undefined') this.currentMerPage = 0;
        const pages = document.querySelectorAll('.mer-page');
        if (!pages.length) return;

        let newIdx = this.currentMerPage + direction;
        if (newIdx < 0) newIdx = 0;
        if (newIdx >= pages.length) newIdx = pages.length - 1;

        this.currentMerPage = newIdx;

        pages.forEach((p, idx) => {
            p.style.display = (idx === newIdx) ? 'block' : 'none';
        });

        const ind = document.getElementById('mer-page-indicator');
        if (ind) ind.innerText = `Page ${newIdx + 1} of ${pages.length}`;

        const btnPrev = document.getElementById('btn-mer-prev');
        if (btnPrev) {
            btnPrev.style.opacity = (newIdx === 0) ? '0.4' : '1';
            btnPrev.style.pointerEvents = (newIdx === 0) ? 'none' : 'auto';
        }

        const btnNext = document.getElementById('btn-mer-next');
        if (btnNext) {
            btnNext.style.opacity = (newIdx === pages.length - 1) ? '0.4' : '1';
            btnNext.style.pointerEvents = (newIdx === pages.length - 1) ? 'none' : 'auto';
        }
    }

    // --- COMMAND CENTER: FOLLOW-UP REMINDERS ---

    

    
    async forceEmailDispatch() {
        if (!confirm("Are you sure you want to manually trigger the daily dispatch? This will immediately email all salespeople with their pending follow-ups.")) return;
        try {
            this.showToast("Triggering email dispatch...", "info");
            const res = await window.electron.invoke('supabase:edgeFunction', { name: 'daily-quote-reminders', data: {} });
            if (res && res.data) {
                this.showToast(`Successfully queued ${res.data.emails_queued || 0} emails.`, "success");
            } else {
                this.showToast("Dispatch triggered successfully.", "success");
            }
            setTimeout(() => this.openCommandCenter(true), 2000);
        } catch (e) {
            console.error(e);
            this.showToast("Failed to trigger dispatch: " + e.message, "error");
        }
    }

    async openQuoteLifecycleModal(quoteName) {
        window.salestrack.openListModal("Quote Lifecycle", `<div style="padding:40px; text-align:center;"><i class="fas fa-spinner fa-spin" style="font-size:24px; color:#4f46e5;"></i></div>`, "800px");
        
        try {
            const res = await window.electron.invoke('supabase:query', {
                method: 'select',
                table: 'omnis_quote_lifecycle',
                params: {
                    columns: '*, frappe_quotation(name, customer_name, custom_sales_person)',
                    filters: { quote_name: quoteName }
                }
            });
            
            if (!res.data || res.data.length === 0) {
                this.openListModal("Quote Lifecycle", `<div style="padding:40px; color:#ef4444;">Quote lifecycle record not found. Please refresh the dashboard.</div>`, "600px");
                return;
            }
            
            const q = res.data[0];
            const fq = q.frappe_quotation;
            
            // Fetch quotation items
            const itemsRes = await window.electron.invoke('supabase:query', {
                method: 'select',
                table: 'quotation_items',
                params: {
                    columns: 'item_code, item_name, qty',
                    filters: { parent: quoteName }
                }
            });
            const items = itemsRes.data || [];
            
            let itemsHtml = '';
            if (items.length > 0) {
                itemsHtml = `
                <div style="margin-top:16px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px;">
                    <div style="font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase; margin-bottom:8px;"><i class="fas fa-box-open" style="margin-right:4px;"></i> Items Quoted (${items.length})</div>
                    <ul style="margin:0; padding-left:20px; font-size:12px; color:#334155;">
                        ${items.map(i => `<li style="margin-bottom:4px;"><strong>${i.qty}x</strong> ${i.item_code} ${i.item_name ? ` - ${i.item_name}` : ''}</li>`).join('')}
                    </ul>
                </div>
                `;
            } else {
                itemsHtml = `<div style="margin-top:16px; font-size:12px; color:#94a3b8; font-style:italic;">No items found for this quotation.</div>`;
            }
            
            const renderStage = (stageNum, due, loggedAt, notes, lateReason) => {
                const isCurrent = q.current_stage === stageNum && !q.is_closed;
                const isPast = q.current_stage > stageNum || (stageNum === q.current_stage && q.is_closed && loggedAt);
                const isFuture = q.current_stage < stageNum && !q.is_closed;
                
                let statusColor = '#94a3b8';
                let icon = '<i class="fas fa-circle"></i>';
                let contentHtml = '';
                
                if (isPast) {
                    statusColor = '#10b981'; // green
                    icon = '<i class="fas fa-check-circle"></i>';
                    contentHtml = `
                        <div style="font-size:12px; color:#64748b; margin-top:4px;">Logged on ${new Date(loggedAt).toLocaleDateString()}</div>
                        <div style="font-size:13px; color:#334155; background:#f8fafc; padding:8px; border-radius:6px; margin-top:8px; border:1px solid #e2e8f0;">${notes || 'No notes provided.'}</div>
                        ${lateReason ? `<div style="font-size:12px; color:#ef4444; margin-top:4px;"><strong>Late Reason:</strong> ${lateReason}</div>` : ''}
                    `;
                } else if (isCurrent) {
                    statusColor = '#3b82f6'; // blue
                    icon = '<i class="fas fa-dot-circle"></i>';
                    
                    const today = new Date().toISOString().split('T')[0];
                    const isLate = today > due;
                    
                    contentHtml = `
                        <div style="margin-top:12px; background:#f0f9ff; border:1px solid #bae6fd; padding:16px; border-radius:8px;">
                            <textarea id="lifecycle_notes_${stageNum}" placeholder="Enter follow-up notes..." style="width:100%; min-height:80px; padding:10px; border:1px solid #cbd5e1; border-radius:6px; font-family:inherit; font-size:13px; resize:vertical; margin-bottom:10px;"></textarea>
                            
                            ${isLate ? `
                                <div style="background:#fef2f2; border:1px solid #fecaca; padding:10px; border-radius:6px; margin-bottom:10px;">
                                    <div style="color:#ef4444; font-size:12px; font-weight:700; margin-bottom:4px;"><i class="fas fa-exclamation-triangle"></i> This follow-up is late. A reason is required.</div>
                                    <input type="text" id="lifecycle_late_reason_${stageNum}" placeholder="Reason for late entry..." style="width:100%; padding:8px; border:1px solid #fca5a5; border-radius:4px; font-size:13px;">
                                </div>
                            ` : ''}
                            
                            <div style="display:flex; gap:10px;">
                                <button onclick="window.salestrack.submitLifecycleStage('${quoteName}', ${stageNum}, ${isLate})" style="background:#2563eb; color:white; border:none; padding:8px 16px; border-radius:6px; font-weight:600; cursor:pointer; font-size:13px;">Complete Stage ${stageNum}</button>
                            </div>
                        </div>
                    `;
                } else if (q.is_closed && stageNum === q.current_stage && !loggedAt) {
                    statusColor = '#ef4444'; // red
                    icon = '<i class="fas fa-times-circle"></i>';
                    contentHtml = `<div style="font-size:12px; color:#ef4444; margin-top:4px;">Quote closed before this stage.</div>`;
                }
                
                return `
                <div style="display:flex; gap:16px; margin-bottom:24px;">
                    <div style="display:flex; flex-direction:column; align-items:center;">
                        <div style="color:${statusColor}; font-size:24px;">${icon}</div>
                        ${stageNum < 3 ? `<div style="width:2px; height:100%; background:#e2e8f0; margin-top:4px; min-height:40px;"></div>` : ''}
                    </div>
                    <div style="flex:1;">
                        <div style="font-size:15px; font-weight:700; color:#0f172a;">Stage ${stageNum} Follow-Up <span style="font-size:12px; font-weight:600; color:#64748b; margin-left:8px; background:#f1f5f9; padding:2px 8px; border-radius:12px;">Due: ${due}</span></div>
                        ${contentHtml}
                    </div>
                </div>
                `;
            };
            
            let closingHtml = '';
            if (!q.is_closed) {
                closingHtml = `
                    <div style="border-top:1px solid #e2e8f0; margin-top:30px; padding-top:20px;">
                        <h4 style="margin:0 0 10px 0; font-size:14px; color:#0f172a;">Close Quotation</h4>
                        <div style="display:flex; gap:10px; align-items:center;">
                            <select id="lifecycle_close_reason" style="padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; width:200px;">
                                <option value="">Select Closing Reason...</option>
                                <option value="Tire Kicker">Tire Kicker</option>
                                <option value="No Funding">No Funding</option>
                                <option value="Lost Sale">Lost Sale (Bought Elsewhere)</option>
                            </select>
                            <input type="text" id="lifecycle_close_notes" placeholder="Additional Notes..." style="flex:1; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px;">
                            <button onclick="window.salestrack.markQuoteClosed('${quoteName}')" style="background:#ef4444; color:white; border:none; padding:8px 16px; border-radius:6px; font-weight:600; cursor:pointer; font-size:13px;">Mark as Closed</button>
                        </div>
                    </div>
                `;
            } else {
                let badgeColor = q.manager_signoff_status === 'approved' ? '#10b981' : (q.manager_signoff_status === 'rejected' ? '#ef4444' : '#f59e0b');
                closingHtml = `
                    <div style="background:#fef2f2; border:1px solid #fecaca; border-radius:8px; padding:16px; margin-top:20px;">
                        <h4 style="margin:0 0 8px 0; color:#991b1b; font-size:14px;"><i class="fas fa-lock"></i> Quotation Closed</h4>
                        <div style="font-size:13px; color:#7f1d1d; margin-bottom:4px;"><strong>Reason:</strong> ${q.closing_reason}</div>
                        <div style="font-size:13px; color:#7f1d1d; margin-bottom:12px;"><strong>Manager Status:</strong> <span style="background:${badgeColor}20; color:${badgeColor}; padding:2px 8px; border-radius:12px; font-size:11px; font-weight:700; text-transform:uppercase;">${q.manager_signoff_status}</span></div>
                        ${q.manager_notes ? `<div style="font-size:13px; color:#7f1d1d; background:#fff; padding:8px; border-radius:4px;"><strong>Manager Notes:</strong> ${q.manager_notes}</div>` : ''}
                    </div>
                `;
            }

            const html = `
                <div style="padding:20px; font-family:'Inter', sans-serif;">
                    <div style="margin-bottom:24px; border-bottom:1px solid #e2e8f0; padding-bottom:16px;">
                        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                            <div>
                                <div style="font-size:20px; font-weight:800; color:#0f172a;">${quoteName}</div>
                                <div style="font-size:14px; color:#64748b; margin-top:4px;">Customer: <strong>${fq ? fq.customer_name : 'Unknown'}</strong> | Rep: <strong>${fq ? fq.custom_sales_person : 'Unknown'}</strong></div>
                            </div>
                            <div style="display:flex; align-items:center; gap:16px;">
                                <button onclick="window.salestrack.sendQuoteWhatsAppReminder('${quoteName}', '${fq ? fq.custom_sales_person : ''}')" style="background:#25d366; color:white; border:none; padding:6px 12px; border-radius:6px; font-weight:700; cursor:pointer; font-size:12px; display:flex; align-items:center; gap:6px; box-shadow:0 2px 4px rgba(37,211,102,0.2);">
                                    <i class="fab fa-whatsapp" style="font-size:14px;"></i> Send Reminder
                                </button>
                                <div style="display:flex; align-items:center; gap:8px;">
                                    <label style="font-size:12px; font-weight:700; color:#ef4444; text-transform:uppercase;">
                                        <i class="fas fa-fire" style="margin-right:4px;"></i> Hot Lead
                                    </label>
                                    <label class="switch">
                                        <input type="checkbox" ${q.is_hot_lead ? 'checked' : ''} onchange="window.salestrack.toggleQuoteHotLead('${quoteName}', this.checked)">
                                        <span class="slider round"></span>
                                    </label>
                                </div>
                            </div>
                        </div>
                        ${itemsHtml}
                    </div>
                    
                    <div style="padding:10px;">
                        ${renderStage(1, q.stage_1_due, q.stage_1_logged_at, q.stage_1_notes, q.stage_1_late_reason)}
                        ${renderStage(2, q.stage_2_due, q.stage_2_logged_at, q.stage_2_notes, q.stage_2_late_reason)}
                        ${renderStage(3, q.stage_3_due, q.stage_3_logged_at, q.stage_3_notes, q.stage_3_late_reason)}
                    </div>
                    
                    ${closingHtml}
                </div>
            `;
            
            this.openListModal(`Lifecycle: ${quoteName}`, html, "700px");
        } catch (e) {
            console.error(e);
            this.openListModal("Error", "Failed to load lifecycle: " + e.message, "500px");
        }
    }

    async sendQuoteWhatsAppReminder(quoteName, salespersonName) {
        if (!salespersonName) {
            this.showToast("No salesperson assigned to this quote.", "error");
            return;
        }
        
        try {
            // 1. Fetch salesperson WA number
            const spRes = await window.electron.invoke('supabase:query', {
                method: 'select',
                table: 'omnis_sales_persons',
                params: {
                    columns: 'whatsapp_number',
                    filters: { name: salespersonName },
                    limit: 1
                }
            });
            
            const spData = spRes.data && spRes.data[0];
            if (!spData || !spData.whatsapp_number) {
                this.showToast(`No WhatsApp number found for ${salespersonName}`, "error");
                return;
            }
            
            const waNumber = spData.whatsapp_number;
            const msgBody = `*Omnis Reminder*\n\nHi ${salespersonName},\nPlease follow up on quotation *${quoteName}* as it is currently due for review in the SalesTrack system.`;
            
            // 2. Send via local client
            this.showToast("Sending WhatsApp reminder...", "info");
            const res = await window.electron.invoke('whatsapp:send-msg', { to: waNumber, body: msgBody });
            
            let status = 'failed';
            if (res && res.ok) {
                status = 'sent';
                this.showToast("WhatsApp reminder sent successfully!", "success");
            } else {
                this.showToast("Failed to send WhatsApp message: " + (res.error || "Unknown error"), "error");
            }
            
            // 3. Log to DB
            await window.electron.invoke('supabase:query', {
                table: 'omnis_whatsapp_logs',
                method: 'insert',
                params: {
                    data: {
                        quote_name: quoteName,
                        sales_person: salespersonName,
                        to_number: waNumber,
                        message: msgBody,
                        status: status
                    }
                }
            });
            
            // refresh data
            this.openCommandCenter(true);
            
        } catch(e) {
            console.error("WA Reminder Error:", e);
            this.showToast("Error sending WA reminder: " + e.message, "error");
        }
    }

    async toggleQuoteHotLead(quoteName, isHot) {
        try {
            await window.electron.invoke('supabase:query', {
                method: 'update',
                table: 'omnis_quote_lifecycle',
                params: {
                    values: { is_hot_lead: isHot },
                    filters: { quote_name: quoteName }
                }
            });
            this.showToast("Hot Lead status updated successfully.", "success");
            // refresh data in background
            this.openCommandCenter(true);
        } catch(e) {
            console.error("Failed to update Hot Lead", e);
            this.showToast("Failed to update Hot Lead: " + e.message, "error");
            // revert toggle visually
            const input = document.querySelector(`input[onchange*="${quoteName}"]`);
            if (input) input.checked = !isHot;
        }
    }

    async submitLifecycleStage(quoteName, stageNum, requiresLateReason) {
        const notes = document.getElementById(`lifecycle_notes_${stageNum}`).value;
        if (!notes.trim()) {
            this.showToast("Follow-up notes are required.", "error");
            return;
        }
        
        let lateReason = null;
        if (requiresLateReason) {
            lateReason = document.getElementById(`lifecycle_late_reason_${stageNum}`).value;
            if (!lateReason.trim()) {
                this.showToast("This entry is late. A late reason is required.", "error");
                return;
            }
        }
        
        const now = new Date().toISOString();
        const updateData = { current_stage: stageNum < 3 ? stageNum + 1 : 3 };
        updateData[`stage_${stageNum}_logged_at`] = now;
        updateData[`stage_${stageNum}_notes`] = notes;
        if (lateReason) updateData[`stage_${stageNum}_late_reason`] = lateReason;
        
        try {
            await window.electron.invoke('supabase:query', {
                method: 'update',
                table: 'omnis_quote_lifecycle',
                data: updateData,
                match: { quote_name: quoteName }
            });
            this.showToast(`Stage ${stageNum} completed successfully!`, "success");
            this.openQuoteLifecycleModal(quoteName); // refresh
        } catch (e) {
            console.error(e);
            this.showToast("Failed to save: " + e.message, "error");
        }
    }

    async markQuoteClosed(quoteName) {
        const reason = document.getElementById('lifecycle_close_reason').value;
        const notes = document.getElementById('lifecycle_close_notes').value;
        
        if (!reason) {
            this.showToast("Please select a closing reason.", "error");
            return;
        }
        if (!notes.trim()) {
            this.showToast("Additional notes are required when closing a quote.", "error");
            return;
        }
        
        try {
            await window.electron.invoke('supabase:query', {
                method: 'update',
                table: 'omnis_quote_lifecycle',
                data: {
                    is_closed: true,
                    closing_reason: reason,
                    manager_notes: notes, // Temp store notes here until manager reviews
                    manager_signoff_status: 'pending'
                },
                match: { quote_name: quoteName }
            });
            this.showToast("Quote marked as closed. Pending manager approval.", "success");
            this.openQuoteLifecycleModal(quoteName);
        } catch (e) {
            console.error(e);
            this.showToast("Failed to close quote: " + e.message, "error");
        }
    }

    async approveManagerSignoff(quoteName, status) {
        try {
            await window.electron.invoke('supabase:query', {
                method: 'update',
                table: 'omnis_quote_lifecycle',
                data: {
                    manager_signoff_status: status,
                    is_closed: status === 'approved' // If rejected, it re-opens
                },
                match: { quote_name: quoteName }
            });
            this.showToast(`Quote ${status} successfully.`, "success");
            this.openCommandCenter(true); // refresh full dashboard
        } catch (e) {
            this.showToast("Failed to update status: " + e.message, "error");
        }
    }

    openRepProfile(repName) {
        if (!this.cachedCommandCenterData) return;
        const quotes = this.cachedCommandCenterData.quotes || [];
        const dueQuotes = this.cachedCommandCenterData.dueQuotes || [];
        
        const repQuotes = quotes.filter(q => (q.frappe_quotation && q.frappe_quotation.custom_sales_person === repName));
        const repDue = dueQuotes.filter(q => (q.frappe_quotation && q.frappe_quotation.custom_sales_person === repName));
        
        let total = repQuotes.length;
        // Count how many have passed stage 1 as 'logged'
        let logged = repQuotes.filter(q => q.current_stage > 1 || (q.current_stage === 1 && q.is_closed)).length;
        let rate = total > 0 ? Math.round((logged / total) * 100) : 0;
        
        let color = rate >= 80 ? '#10b981' : (rate >= 50 ? '#f59e0b' : '#ef4444');
        
        let dueHtml = `<div style="color:#64748b; font-size:14px; text-align:center; padding:20px;">No quotes are currently past due for this representative.</div>`;
        
        if (repDue.length > 0) {
            dueHtml = `<table style="width:100%; border-collapse:separate; border-spacing:0; margin-top:10px; font-size:13px;">
                <thead>
                    <tr style="border-bottom:2px solid #e2e8f0; color:#475569; text-transform:uppercase; font-size:11px;">
                        <th style="padding:10px; text-align:left;">Quote</th>
                        <th style="padding:10px; text-align:left;">Customer</th>
                        <th style="padding:10px; text-align:left;">Stage</th>
                        <th style="padding:10px; text-align:left;">Due Date</th>
                    </tr>
                </thead>
                <tbody>
                    ${repDue.map(q => {
                        let dueStr = q.current_stage === 1 ? q.stage_1_due : (q.current_stage === 2 ? q.stage_2_due : q.stage_3_due);
                        return `<tr style="border-bottom:1px solid #f1f5f9; cursor:pointer;" onclick="window.salestrack.openQuoteLifecycleModal('${q.quote_name}')" onmouseover="this.style.backgroundColor='#f8fafc'" onmouseout="this.style.backgroundColor='transparent'">
                            <td style="padding:12px 10px; color:#2563eb; font-weight:600;">${q.quote_name}</td>
                            <td style="padding:12px 10px; color:#334155;">${q.frappe_quotation ? q.frappe_quotation.customer_name : '-'}</td>
                            <td style="padding:12px 10px; color:#0f172a; font-weight:600;">Stage ${q.current_stage}</td>
                            <td style="padding:12px 10px; color:#ef4444; font-weight:700;">${dueStr}</td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>`;
        }

        const html = `
            <div style="padding:20px 30px; font-family:'Inter', sans-serif;">
                <div style="display:flex; align-items:center; gap:20px; margin-bottom:30px; padding-bottom:20px; border-bottom:1px solid #e2e8f0;">
                    <div style="width:80px; height:80px; border-radius:50%; background:${color}15; color:${color}; display:flex; align-items:center; justify-content:center; font-size:32px; font-weight:800;">
                        ${repName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <div style="font-size:24px; font-weight:800; color:#0f172a;">${repName}</div>
                        <div style="font-size:14px; color:#64748b; margin-top:4px;">Sales Representative Profile</div>
                    </div>
                    <div style="margin-left:auto; text-align:right;">
                        <div style="font-size:32px; font-weight:900; color:${color};">${rate}%</div>
                        <div style="font-size:12px; font-weight:700; color:#64748b; text-transform:uppercase;">Compliance Rate</div>
                    </div>
                </div>
                
                <h3 style="font-size:16px; font-weight:800; color:#0f172a; margin-bottom:15px; display:flex; align-items:center; gap:8px;">
                    <i class="fas fa-clock" style="color:#f59e0b;"></i> Due for Follow-Up (${repDue.length})
                </h3>
                <div style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; overflow:hidden;">
                    ${dueHtml}
                </div>
            </div>
        `;
        
        this.openListModal(`Rep Profile: ${repName}`, html, "800px");
    }

    async openCommandCenter(isFullView = false) {
        if (!isFullView) {
            this.openListModal("Follow-up Analytics", `<div style="padding:40px; text-align:center;"><i class="fas fa-spinner fa-spin" style="font-size:24px; color:#4f46e5;"></i></div>`, "1200px");
        } else {
            const fullCont = document.getElementById('command-center-full-container');
            if (fullCont) fullCont.innerHTML = `<div style="padding:100px; text-align:center;"><i class="fas fa-spinner fa-spin" style="font-size:32px; color:#4f46e5;"></i></div>`;
        }

        try {
            // Fetch Lifecycle quotes (Paginated to bypass 1000 row limit)
            let allQuotes = [];
            let start = 0;
            const pageSize = 1000;
            while (true) {
                let lifecycleRes = await window.electron.invoke('supabase:query', {
                    method: 'select',
                    table: 'omnis_quote_lifecycle',
                    params: {
                        columns: '*, frappe_quotation(name, custom_sales_person, customer_name, transaction_date, company)',
                        range: { from: start, to: start + pageSize - 1 }
                    }
                });
                
                let chunk = lifecycleRes.data || [];
                allQuotes = allQuotes.concat(chunk);
                if (chunk.length < pageSize) break;
                start += pageSize;
            }
            
            const todayStr = new Date().toISOString().split('T')[0];

            let quotes = allQuotes.filter(q => q.frappe_quotation); // Only valid joins
            
            // Due quotes: not closed, and current stage due date <= today
            let dueQuotes = quotes.filter(q => {
                if (q.is_closed) return false;
                let due = q.current_stage === 1 ? q.stage_1_due : (q.current_stage === 2 ? q.stage_2_due : q.stage_3_due);
                return due <= todayStr;
            });
            dueQuotes.sort((a,b) => {
                let aDue = a.current_stage === 1 ? a.stage_1_due : (a.current_stage === 2 ? a.stage_2_due : a.stage_3_due);
                let bDue = b.current_stage === 1 ? b.stage_1_due : (b.current_stage === 2 ? b.stage_2_due : b.stage_3_due);
                return aDue < bDue ? -1 : 1;
            });

            // Manager Approvals: closed, pending manager signoff
            let pendingApprovals = quotes.filter(q => q.is_closed && q.manager_signoff_status === 'pending');

            // 2. Fetch recent dispatch logs
            let emailsRes = await window.electron.invoke('supabase:query', {
                method: 'select',
                table: 'omnis_email_queue',
                params: {
                    columns: 'id, to_email, subject, status, created_at, related_type',
                    limit: 50,
                    order: { column: 'created_at', ascending: false }
                }
            });
            let emails = (emailsRes.data || []).filter(e => e.related_type === 'quotation_reminder');

            // 3. Fetch WA logs
            let waRes = await window.electron.invoke('supabase:query', {
                method: 'select',
                table: 'omnis_whatsapp_logs',
                params: {
                    columns: '*',
                    limit: 100,
                    order: { column: 'created_at', ascending: false }
                }
            });
            let waLogs = waRes.data || [];

            this.cachedCommandCenterData = { quotes, emails, dueQuotes, pendingApprovals, waLogs };
            this.renderCommandCenter(this.cachedCommandCenterData, isFullView);
        } catch (e) {
            console.error(e);
            if (!isFullView) {
                this.openListModal("Error", e.message, "500px");
            } else {
                document.getElementById('command-center-full-container').innerHTML = `<div style="color:red; padding:40px;">${e.message}</div>`;
            }
        }
    }

    switchCommandCenterTab(tabId) {
        // Hide all tabs
        ['overview', 'due', 'approvals', 'logs', 'wa'].forEach(t => {
            const el = document.getElementById('cc_tab_' + t);
            if (el) el.style.display = 'none';
            const btn = document.getElementById('cc_btn_' + t);
            if (btn) {
                btn.style.background = '#f1f5f9';
                btn.style.color = '#475569';
            }
        });

        // Show target tab
        const activeTab = document.getElementById('cc_tab_' + tabId);
        if (activeTab) activeTab.style.display = 'block';
        
        // Highlight active button
        const activeBtn = document.getElementById('cc_btn_' + tabId);
        if (activeBtn) {
            activeBtn.style.background = '#0f172a';
            activeBtn.style.color = 'white';
        }
    }

    applyGlobalCompanyFilter(isFullView) {
        if (!this.cachedCommandCenterData) return;
        const company = document.getElementById('cc_global_company').value;
        this.renderCommandCenter(this.cachedCommandCenterData, isFullView, company);
    }

    applyCommandCenterFilters() {
        if (!this.cachedCommandCenterData) return;
        
        const companyFilter = document.getElementById('cc_filter_company')?.value || '';
        const dateFrom = document.getElementById('cc_filter_date_from')?.value || '';
        const dateTo = document.getElementById('cc_filter_date_to')?.value || '';
        
        let filteredDue = this.cachedCommandCenterData.dueQuotes || [];
        
        if (companyFilter) {
            filteredDue = filteredDue.filter(q => q.frappe_quotation && q.frappe_quotation.company === companyFilter);
        }
        
        if (dateFrom || dateTo) {
            filteredDue = filteredDue.filter(q => {
                let due = q.current_stage === 1 ? q.stage_1_due : (q.current_stage === 2 ? q.stage_2_due : q.stage_3_due);
                if (dateFrom && due < dateFrom) return false;
                if (dateTo && due > dateTo) return false;
                return true;
            });
        }
        
        let html = `<div style="color:#94a3b8; font-size:14px; text-align:center; padding:30px;">No quotes match the selected filters!</div>`;
        
        if (filteredDue.length > 0) {
            let companyGroups = {};
            filteredDue.forEach(q => {
                let comp = (q.frappe_quotation && q.frappe_quotation.company) ? q.frappe_quotation.company : 'Unknown Company';
                if (!companyGroups[comp]) companyGroups[comp] = [];
                companyGroups[comp].push(q);
            });
            
            html = Object.entries(companyGroups).map(([company, quotes]) => {
                return `
                <div style="margin-bottom:16px;">
                    <div style="background:#f1f5f9; padding:8px 16px; font-weight:800; font-size:12px; color:#475569; border-top:1px solid #e2e8f0; border-bottom:1px solid #e2e8f0;">
                        ${company} <span style="margin-left:8px; background:#e2e8f0; padding:2px 8px; border-radius:12px; font-size:10px;">${quotes.length} Due</span>
                    </div>
                    <table style="width:100%; border-collapse:separate; border-spacing:0; font-size:13px;">
                        <thead>
                            <tr style="background:#991b1b; color:white; font-size:11px; text-transform:uppercase;">
                                <th style="padding:12px 16px; color:white; text-align:left; font-weight:800; border-top-left-radius:6px; border-bottom-left-radius:6px; width:30%;">Quote Name</th>
                                <th style="padding:12px 16px; color:white; text-align:left; font-weight:800; width:30%;">Sales Person</th>
                                <th style="padding:12px 16px; color:white; text-align:left; font-weight:800; width:20%;">Stage</th>
                                <th style="padding:12px 16px; color:white; text-align:right; font-weight:800; border-top-right-radius:6px; border-bottom-right-radius:6px; width:20%;">Due Date</th>
                            </tr>
                        </thead>
                        <tbody style="display:block; height:8px;"></tbody>
                        <tbody>
                            ${quotes.map(q => {
                                let due = q.current_stage === 1 ? q.stage_1_due : (q.current_stage === 2 ? q.stage_2_due : q.stage_3_due);
                                let daysOverdue = Math.floor((new Date() - new Date(due)) / (1000 * 60 * 60 * 24));
                                let color = '#ef4444'; // standard red
                                let bg = '#fef2f2';
                                let icon = '<i class="fas fa-exclamation-circle" style="margin-right:4px;"></i>';
                                
                                if (daysOverdue > 7) {
                                    color = '#991b1b'; // dark red
                                    bg = '#fca5a5'; // darker bg
                                    icon = '<i class="fas fa-radiation" style="margin-right:4px;"></i>';
                                } else if (daysOverdue < 3) {
                                    color = '#d97706'; // orange
                                    bg = '#fef3c7';
                                    icon = '<i class="fas fa-clock" style="margin-right:4px;"></i>';
                                }

                                return `<tr style="border-bottom:1px solid #f1f5f9; cursor:pointer;" onclick="window.salestrack.openQuoteLifecycleModal('${q.quote_name}')" onmouseover="this.style.backgroundColor='#f8fafc'" onmouseout="this.style.backgroundColor='transparent'">
                                    <td style="padding:10px 16px; color:#2563eb; font-weight:600; width:30%;">${q.quote_name}</td>
                                    <td style="padding:10px 16px; color:#334155; font-weight:500; width:30%;">${q.frappe_quotation.custom_sales_person || '-'}</td>
                                    <td style="padding:10px 16px; color:#0f172a; font-weight:600; width:20%;">Stage ${q.current_stage}</td>
                                    <td style="padding:10px 16px; width:20%; text-align:right;">
                                        <span style="background:${bg}; color:${color}; padding:4px 8px; border-radius:12px; font-size:11px; font-weight:800; display:inline-flex; align-items:center;">
                                            ${icon} ${due}
                                        </span>
                                    </td>
                                </tr>`
                            }).join('')}
                        </tbody>
                    </table>
                </div>`;
            }).join('');
        }
        
        const container = document.getElementById('cc_global_due_container');
        if (container) container.innerHTML = html;
        
        const badge = document.getElementById('cc_due_count_badge');
        if (badge) badge.innerText = filteredDue.length + ' Quotes Due';
    }

    renderCommandCenter(data, isFullView = false, companyFilter = 'All') {
        let { quotes, emails, dueQuotes, pendingApprovals, waLogs = [] } = data;
        
        if (companyFilter !== 'All') {
            quotes = quotes.filter(q => q.frappe_quotation && q.frappe_quotation.company === companyFilter);
            dueQuotes = dueQuotes.filter(q => q.frappe_quotation && q.frappe_quotation.company === companyFilter);
            pendingApprovals = pendingApprovals.filter(q => q.frappe_quotation && q.frappe_quotation.company === companyFilter);
        }
        
        let totalQuotes = quotes.length;
        // Compliance: any quote that has logged at least stage 1 or is legitimately closed
        let loggedFollowups = quotes.filter(q => q.current_stage > 1 || q.is_closed).length;
        let complianceRate = totalQuotes > 0 ? Math.round((loggedFollowups / totalQuotes) * 100) : 0;

        let repStats = {};
        quotes.forEach(q => {
            const rep = q.frappe_quotation.custom_sales_person || "Unassigned";
            if (!repStats[rep]) repStats[rep] = { total: 0, logged: 0, hot: 0 };
            repStats[rep].total++;
            if (q.current_stage > 1 || q.is_closed) {
                repStats[rep].logged++;
            }
            if (q.is_hot_lead && !q.is_closed) {
                repStats[rep].hot++;
            }
        });

        let leaderboardHtml = Object.entries(repStats)
            .map(([rep, stat]) => {
                let rate = stat.total > 0 ? Math.round((stat.logged / stat.total) * 100) : 0;
                let color = rate >= 80 ? '#10b981' : (rate >= 50 ? '#f59e0b' : '#ef4444');
                return { rep, stat, rate, color };
            })
            .sort((a, b) => b.rate - a.rate)
            .map(({ rep, stat, rate, color }) => `
                <div class="ai-order-row ai-leaderboard-grid" style="border-radius: 12px; border-left: 4px solid var(--accent-maroon); cursor:pointer;" onclick="window.salestrack.openRepProfile('${rep.replace(/'/g, "\\'")}')">
                    <div class="ai-order-cell" style="display:flex; flex-direction:row; align-items:center; gap:10px;">
                        <div style="width:24px; height:24px; border-radius:50%; background:${color}15; color:${color}; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:800; flex-shrink:0;">${rep.charAt(0)}</div>
                        <div style="font-size:13px; font-weight:600; color:#0f172a;">${rep}</div>
                    </div>
                    <div class="ai-order-cell">
                        <span class="cell-label" style="display:none;">Quotes</span>
                        <div style="font-size:13px; color:#475569;">${stat.total}</div>
                    </div>
                    <div class="ai-order-cell">
                        <span class="cell-label" style="display:none;">Logged</span>
                        <div style="font-size:13px; color:#475569;">${stat.logged}</div>
                    </div>
                    <div class="ai-order-cell">
                        <span class="cell-label" style="display:none;">Hot</span>
                        <div style="font-size:13px; font-weight:700; color:#ef4444;"><i class="fas fa-fire" style="margin-right:4px; font-size:11px;"></i>${stat.hot}</div>
                    </div>
                    <div class="ai-order-cell">
                        <span class="cell-label" style="display:none;">Rate</span>
                        <div style="font-size:13px; font-weight:700; color:${color};">${rate}%</div>
                    </div>
                </div>
            `).join('');
            
        
        let globalDueHtml = `<div style="color:#94a3b8; font-size:14px; text-align:center; padding:30px;">No quotes are currently due for follow-up!</div>`;
        if (dueQuotes && dueQuotes.length > 0) {
            // Group by company
            let companyGroups = {};
            dueQuotes.forEach(q => {
                let comp = (q.frappe_quotation && q.frappe_quotation.company) ? q.frappe_quotation.company : 'Unknown Company';
                if (!companyGroups[comp]) companyGroups[comp] = [];
                companyGroups[comp].push(q);
            });
            
            globalDueHtml = Object.entries(companyGroups).map(([company, quotes]) => {
                return `
                <div style="margin-bottom:16px;">
                    <div style="background:#f1f5f9; padding:8px 16px; font-weight:800; font-size:12px; color:#475569; border-top:1px solid #e2e8f0; border-bottom:1px solid #e2e8f0;">
                        ${company} <span style="margin-left:8px; background:#e2e8f0; padding:2px 8px; border-radius:12px; font-size:10px;">${quotes.length} Due</span>
                    </div>
                    <table style="width:100%; border-collapse:separate; border-spacing:0; font-size:13px;">
                        <thead>
                            <tr style="background:#991b1b; color:white; font-size:11px; text-transform:uppercase;">
                                <th style="padding:12px 16px; color:white; text-align:left; font-weight:800; border-top-left-radius:6px; border-bottom-left-radius:6px; width:30%;">Quote Name</th>
                                <th style="padding:12px 16px; color:white; text-align:left; font-weight:800; width:30%;">Sales Person</th>
                                <th style="padding:12px 16px; color:white; text-align:left; font-weight:800; width:20%;">Stage</th>
                                <th style="padding:12px 16px; color:white; text-align:right; font-weight:800; border-top-right-radius:6px; border-bottom-right-radius:6px; width:20%;">Due Date</th>
                            </tr>
                        </thead>
                        <tbody style="display:block; height:8px;"></tbody>
                        <tbody>
                            ${quotes.map(q => {
                                let due = q.current_stage === 1 ? q.stage_1_due : (q.current_stage === 2 ? q.stage_2_due : q.stage_3_due);
                                let daysOverdue = Math.floor((new Date() - new Date(due)) / (1000 * 60 * 60 * 24));
                                let color = '#ef4444'; // standard red
                                let bg = '#fef2f2';
                                let icon = '<i class="fas fa-exclamation-circle" style="margin-right:4px;"></i>';
                                
                                if (daysOverdue > 7) {
                                    color = '#991b1b'; // dark red
                                    bg = '#fca5a5'; // darker bg
                                    icon = '<i class="fas fa-radiation" style="margin-right:4px;"></i>';
                                } else if (daysOverdue < 3) {
                                    color = '#d97706'; // orange
                                    bg = '#fef3c7';
                                    icon = '<i class="fas fa-clock" style="margin-right:4px;"></i>';
                                }

                                return `<tr style="border-bottom:1px solid #f1f5f9; cursor:pointer;" onclick="window.salestrack.openQuoteLifecycleModal('${q.quote_name}')" onmouseover="this.style.backgroundColor='#f8fafc'" onmouseout="this.style.backgroundColor='transparent'">
                                    <td style="padding:10px 16px; color:#2563eb; font-weight:600; width:30%;">${q.quote_name}</td>
                                    <td style="padding:10px 16px; color:#334155; font-weight:500; width:30%;">${q.frappe_quotation.custom_sales_person || '-'}</td>
                                    <td style="padding:10px 16px; color:#0f172a; font-weight:600; width:20%;">Stage ${q.current_stage}</td>
                                    <td style="padding:10px 16px; width:20%; text-align:right;">
                                        <span style="background:${bg}; color:${color}; padding:4px 8px; border-radius:12px; font-size:11px; font-weight:800; display:inline-flex; align-items:center;">
                                            ${icon} ${due}
                                        </span>
                                    </td>
                                </tr>`
                            }).join('')}
                        </tbody>
                    </table>
                </div>`;
            }).join('');
        }

        let pendingApprovalsHtml = '';
        if (pendingApprovals && pendingApprovals.length > 0) {
            pendingApprovalsHtml = `<div style="background:#fff7ed; border:1px solid #fdba74; border-radius:16px; padding:24px; box-shadow:0 10px 25px -5px rgba(0,0,0,0.02); margin-top:24px;">
                <h3 style="margin:0 0 15px 0; font-size:13px; font-weight:800; color:#c2410c; display:flex; align-items:center; gap:8px;">
                    <i class="fas fa-user-shield"></i> Manager Sign-offs Required (${pendingApprovals.length})
                </h3>
                <table style="width:100%; border-collapse:separate; border-spacing:0; font-size:13px;">
                    <thead>
                        <tr style="background:#991b1b; color:white; font-size:11px; text-transform:uppercase;">
                            <th style="padding:12px 16px; color:white; text-align:left; font-weight:800; border-top-left-radius:6px; border-bottom-left-radius:6px;">Quote Details</th>
                            <th style="padding:12px 16px; color:white; text-align:left; font-weight:800;">Manager Notes</th>
                            <th style="padding:12px 16px; color:white; text-align:right; font-weight:800; border-top-right-radius:6px; border-bottom-right-radius:6px;">Actions</th>
                        </tr>
                    </thead>
                    <tbody style="display:block; height:8px;"></tbody>
                    <tbody>
                        ${pendingApprovals.map(q => `
                        <tr style="border-bottom:1px solid #fed7aa;">
                            <td style="padding:12px 10px;">
                                <div style="font-weight:700; color:#c2410c; cursor:pointer;" onclick="window.salestrack.openQuoteLifecycleModal('${q.quote_name}')">${q.quote_name}</div>
                                <div style="font-size:11px; color:#ea580c; margin-top:4px;">${q.closing_reason}</div>
                            </td>
                            <td style="padding:12px 10px;">
                                <div style="font-size:12px; color:#c2410c;">${q.manager_notes || '-'}</div>
                            </td>
                            <td style="padding:12px 10px; text-align:right;">
                                <button onclick="window.salestrack.approveManagerSignoff('${q.quote_name}', 'approved')" style="background:#10b981; color:white; border:none; padding:6px 12px; border-radius:4px; font-size:11px; font-weight:700; cursor:pointer; margin-right:5px;">APPROVE</button>
                                <button onclick="window.salestrack.approveManagerSignoff('${q.quote_name}', 'rejected')" style="background:#ef4444; color:white; border:none; padding:6px 12px; border-radius:4px; font-size:11px; font-weight:700; cursor:pointer;">REJECT</button>
                            </td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>`;
        }

        let emailsHtml = emails.length === 0 
            ? `<div style="padding:40px; text-align:center; color:#94a3b8; font-style:italic;">No automated emails dispatched recently.</div>`
            : `<table style="width:100%; border-collapse:separate; border-spacing:0; font-size:13px;">
                <thead>
                    <tr style="background:#991b1b; color:white; font-size:11px; text-transform:uppercase;">
                        <th style="padding:12px 16px; color:white; text-align:left; font-weight:800; border-top-left-radius:6px; border-bottom-left-radius:6px;">Recipient</th>
                        <th style="padding:12px 16px; color:white; text-align:left; font-weight:800;">Subject</th>
                        <th style="padding:12px 16px; color:white; text-align:left; font-weight:800;">Date Dispatched</th>
                        <th style="padding:12px 16px; color:white; text-align:left; font-weight:800; border-top-right-radius:6px; border-bottom-right-radius:6px;">Status</th>
                    </tr>
                </thead>
                <tbody style="display:block; height:8px;"></tbody>
                <tbody>
                    ${emails.map(e => {
                        let dt = new Date(e.created_at).toLocaleString();
                        let statusColor = e.status === 'sent' ? '#10b981' : (e.status === 'failed' ? '#ef4444' : '#f59e0b');
                        return `
                        <tr style="border-bottom:1px solid #f1f5f9;">
                            <td style="padding:12px; font-weight:600; color:#334155;">${e.to_email}</td>
                            <td style="padding:12px; color:#64748b;">${e.subject}</td>
                            <td style="padding:12px; color:#94a3b8;">${dt}</td>
                            <td style="padding:12px;">
                                <span style="background:${statusColor}15; color:${statusColor}; padding:4px 8px; border-radius:12px; font-size:11px; font-weight:700; text-transform:uppercase;">${e.status}</span>
                            </td>
                        </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>`;

        let waLogsHtml = waLogs.length === 0 
            ? `<div style="padding:40px; text-align:center; color:#94a3b8; font-style:italic;">No WhatsApp reminders sent recently.</div>`
            : `<table style="width:100%; border-collapse:separate; border-spacing:0; font-size:13px;">
                <thead>
                    <tr style="background:#065f46; color:white; font-size:11px; text-transform:uppercase;">
                        <th style="padding:12px 16px; color:white; text-align:left; font-weight:800; border-top-left-radius:6px; border-bottom-left-radius:6px;">Rep / Number</th>
                        <th style="padding:12px 16px; color:white; text-align:left; font-weight:800;">Quote</th>
                        <th style="padding:12px 16px; color:white; text-align:left; font-weight:800;">Message</th>
                        <th style="padding:12px 16px; color:white; text-align:left; font-weight:800;">Date Dispatched</th>
                        <th style="padding:12px 16px; color:white; text-align:left; font-weight:800; border-top-right-radius:6px; border-bottom-right-radius:6px;">Status</th>
                    </tr>
                </thead>
                <tbody style="display:block; height:8px;"></tbody>
                <tbody>
                    ${waLogs.map(w => {
                        let dt = new Date(w.created_at).toLocaleString();
                        let statusColor = w.status === 'sent' ? '#10b981' : (w.status === 'failed' ? '#ef4444' : '#f59e0b');
                        return `
                        <tr style="border-bottom:1px solid #f1f5f9;">
                            <td style="padding:12px; font-weight:600; color:#334155;">
                                ${w.sales_person || 'Unknown'}<br/>
                                <span style="font-size:11px; color:#64748b; font-weight:400;">${w.to_number}</span>
                            </td>
                            <td style="padding:12px; font-weight:600; color:#0f172a;">${w.quote_name}</td>
                            <td style="padding:12px; color:#64748b; max-width:300px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${w.message.replace(/"/g, '&quot;')}">${w.message}</td>
                            <td style="padding:12px; color:#94a3b8;">${dt}</td>
                            <td style="padding:12px;">
                                <span style="background:${statusColor}15; color:${statusColor}; padding:4px 8px; border-radius:12px; font-size:11px; font-weight:700; text-transform:uppercase;">${w.status}</span>
                            </td>
                        </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>`;
            
        // Pre-calculate data for charts & KPIs
        const totalActive = quotes.length;
        const totalDue = dueQuotes.length;
        const pendingCount = pendingApprovals ? pendingApprovals.length : 0;
        
        let stage1Count = quotes.filter(q => q.current_stage === 1 && !q.is_closed).length;
        let stage2Count = quotes.filter(q => q.current_stage === 2 && !q.is_closed).length;
        let stage3Count = quotes.filter(q => q.current_stage === 3 && !q.is_closed).length;
        
        let complianceColor = complianceRate >= 80 ? '#10b981' : (complianceRate >= 50 ? '#f59e0b' : '#ef4444');

        const html = `
            <div class="command-center-container" style="padding:20px; font-family:'Inter', sans-serif;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                    <div style="display:flex; align-items:center; gap:16px;">
                        <div style="width:48px; height:48px; border-radius:12px; background:#0f172a; color:#fff; display:flex; align-items:center; justify-content:center; font-size:20px;">
                            <i class="fas fa-chart-pie"></i>
                        </div>
                        <div>
                            <h2 style="margin:0; font-size:24px; font-weight:800; color:#0f172a; letter-spacing:-0.5px;">Quote Lifecycle Analytics</h2>
                            <div style="font-size:13px; color:#64748b; margin-top:2px;">Monitor 3-7-21 day follow-up compliance and sign-offs.</div>
                        </div>
                    </div>
                    <div style="display:flex; gap:10px; align-items:center;">
                        <select id="cc_global_company" onchange="window.salestrack.applyGlobalCompanyFilter(${isFullView})" style="padding:10px 16px; border:1px solid #cbd5e1; border-radius:8px; font-size:13px; outline:none; background:white; font-weight:700; color:#475569; cursor:pointer;">
                            <option value="All" ${companyFilter === 'All' ? 'selected' : ''}>All Companies</option>
                            <option value="Sinopower" ${companyFilter === 'Sinopower' ? 'selected' : ''}>Sinopower</option>
                            <option value="Machinery Exchange" ${companyFilter === 'Machinery Exchange' ? 'selected' : ''}>Machinery Exchange</option>
                        </select>
                        <button onclick="window.salestrack.forceEmailDispatch()" style="background:#2563eb; color:#ffffff; border:none; padding:10px 16px; border-radius:8px; font-weight:700; cursor:pointer; font-size:13px; box-shadow:0 4px 6px -1px rgba(37,99,235,0.2);"><i class="fas fa-paper-plane" style="margin-right:6px;"></i> FORCE DISPATCH</button>
                        <button onclick="window.salestrack.openCommandCenter(${isFullView})" style="background:#f1f5f9; color:#475569; border:none; padding:10px 16px; border-radius:8px; font-weight:700; cursor:pointer; font-size:13px;"><i class="fas fa-sync-alt" style="margin-right:6px;"></i> REFRESH</button>
                    </div>
                </div>

                <!-- Tab Bar -->
                <div style="display:flex; gap:8px; margin-bottom:24px; border-bottom:1px solid #e2e8f0; padding-bottom:16px;">
                    <button id="cc_btn_overview" onclick="window.salestrack.switchCommandCenterTab('overview')" style="background:#0f172a; color:white; border:none; padding:8px 16px; border-radius:8px; font-weight:700; cursor:pointer; font-size:13px; transition:all 0.2s;">Overview</button>
                    <button id="cc_btn_due" onclick="window.salestrack.switchCommandCenterTab('due')" style="background:#f1f5f9; color:#475569; border:none; padding:8px 16px; border-radius:8px; font-weight:700; cursor:pointer; font-size:13px; transition:all 0.2s;">Due Quotes</button>
                    <button id="cc_btn_approvals" onclick="window.salestrack.switchCommandCenterTab('approvals')" style="background:#f1f5f9; color:#475569; border:none; padding:8px 16px; border-radius:8px; font-weight:700; cursor:pointer; font-size:13px; transition:all 0.2s;">Approvals (${pendingCount})</button>
                    <button id="cc_btn_logs" onclick="window.salestrack.switchCommandCenterTab('logs')" style="background:#f1f5f9; color:#475569; border:none; padding:8px 16px; border-radius:8px; font-weight:700; cursor:pointer; font-size:13px; transition:all 0.2s;">Dispatch Logs</button>
                    <button id="cc_btn_wa" onclick="window.salestrack.switchCommandCenterTab('wa')" style="background:#f1f5f9; color:#475569; border:none; padding:8px 16px; border-radius:8px; font-weight:700; cursor:pointer; font-size:13px; transition:all 0.2s;"><i class="fab fa-whatsapp" style="color:#25d366; margin-right:4px;"></i> WA Reminders</button>
                </div>

                <!-- OVERVIEW TAB -->
                <div id="cc_tab_overview" style="display:block;">
                    <!-- KPI Cards Row -->
                    <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:20px; margin-bottom:24px;">
                        <div style="background:rgba(255,255,255,0.8); backdrop-filter:blur(10px); border:1px solid #e2e8f0; border-radius:16px; padding:20px; box-shadow:0 4px 6px -1px rgba(0,0,0,0.02); display:flex; align-items:center; gap:16px;">
                            <div style="width:56px; height:56px; border-radius:12px; background:#eff6ff; color:#3b82f6; display:flex; align-items:center; justify-content:center; font-size:24px;">
                                <i class="fas fa-file-invoice-dollar"></i>
                            </div>
                            <div>
                                <div style="font-size:12px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.5px;">Total Active Quotes</div>
                                <div style="font-size:28px; font-weight:800; color:#0f172a; margin-top:2px;">${totalActive}</div>
                            </div>
                        </div>
                        
                        <div style="background:rgba(255,255,255,0.8); backdrop-filter:blur(10px); border:1px solid #e2e8f0; border-radius:16px; padding:20px; box-shadow:0 4px 6px -1px rgba(0,0,0,0.02); display:flex; align-items:center; gap:16px;">
                            <div style="width:56px; height:56px; border-radius:12px; background:#fef2f2; color:#ef4444; display:flex; align-items:center; justify-content:center; font-size:24px;">
                                <i class="fas fa-clock"></i>
                            </div>
                            <div>
                                <div style="font-size:12px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.5px;">Due For Follow-Up</div>
                                <div style="font-size:28px; font-weight:800; color:#ef4444; margin-top:2px;">${totalDue}</div>
                            </div>
                        </div>

                        <div style="background:rgba(255,255,255,0.8); backdrop-filter:blur(10px); border:1px solid #e2e8f0; border-radius:16px; padding:20px; box-shadow:0 4px 6px -1px rgba(0,0,0,0.02); display:flex; align-items:center; gap:16px;">
                            <div style="width:56px; height:56px; border-radius:12px; background:#fff7ed; color:#f97316; display:flex; align-items:center; justify-content:center; font-size:24px;">
                                <i class="fas fa-user-shield"></i>
                            </div>
                            <div>
                                <div style="font-size:12px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.5px;">Pending Sign-offs</div>
                                <div style="font-size:28px; font-weight:800; color:#c2410c; margin-top:2px;">${pendingCount}</div>
                            </div>
                        </div>
                    </div>

                    <!-- Charts Row -->
                    <div style="display:grid; grid-template-columns: 1fr 2fr; gap:24px; margin-bottom:24px;">
                        <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:16px; padding:24px; box-shadow:0 10px 25px -5px rgba(0,0,0,0.02);">
                            <h3 style="margin:0 0 16px 0; font-size:14px; font-weight:800; color:#0f172a; text-transform:uppercase; letter-spacing:0.5px;">Overall Compliance</h3>
                            <div id="lifecycle_compliance_chart" style="min-height:220px; display:flex; align-items:center; justify-content:center;"></div>
                        </div>

                        <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:16px; padding:24px; box-shadow:0 10px 25px -5px rgba(0,0,0,0.02);">
                            <h3 style="margin:0 0 16px 0; font-size:14px; font-weight:800; color:#0f172a; text-transform:uppercase; letter-spacing:0.5px;">Active Quotes by Stage</h3>
                            <div id="lifecycle_stages_chart" style="min-height:220px;"></div>
                        </div>
                    </div>
                    
                    <!-- Leaderboard -->
                    <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:16px; padding:24px; box-shadow:0 10px 25px -5px rgba(0,0,0,0.02);">
                        <h3 style="margin:0 0 20px 0; font-size:14px; font-weight:800; color:#0f172a; text-transform:uppercase; letter-spacing:0.5px;">Sales Team Leaderboard</h3>
                        
                        <!-- Grid Header -->
                        <div class="ai-order-header ai-leaderboard-grid" style="border-radius: 12px 12px 0 0; margin-bottom: 8px;">
                            <div>Rep</div>
                            <div>Quotes</div>
                            <div>Logged</div>
                            <div>Hot</div>
                            <div>Rate</div>
                        </div>
                        
                        <!-- Grid Body -->
                        <div class="ol-orders-grid-container" style="display:flex; flex-direction:column; gap:8px;">
                            ${leaderboardHtml}
                        </div>
                    </div>
                </div>

                <!-- DUE QUOTES TAB -->
                <div id="cc_tab_due" style="display:none;">
                    <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:16px; overflow:hidden; box-shadow:0 10px 25px -5px rgba(0,0,0,0.02);">
                        <div style="padding:16px 20px; border-bottom:1px solid #e2e8f0; background:#fef2f2; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px;">
                            <h3 style="margin:0; font-size:13px; font-weight:800; color:#991b1b; display:flex; align-items:center; gap:8px;">
                                <i class="fas fa-clock" style="color:#ef4444;"></i> Global Due for Follow-Up
                            </h3>
                            <div style="display:flex; gap:10px; align-items:center;">
                                <select id="cc_filter_company" onchange="window.salestrack.applyCommandCenterFilters()" style="padding:4px 8px; border:1px solid #fca5a5; border-radius:4px; font-size:11px; outline:none; background:white;">
                                    <option value="">All Companies</option>
                                    <option value="Sinopower">Sinopower</option>
                                    <option value="Machinery Exchange">Machinery Exchange</option>
                                </select>
                                <input type="date" id="cc_filter_date_from" onchange="window.salestrack.applyCommandCenterFilters()" style="padding:3px 8px; border:1px solid #fca5a5; border-radius:4px; font-size:11px; outline:none; background:white;" title="From Date">
                                <input type="date" id="cc_filter_date_to" onchange="window.salestrack.applyCommandCenterFilters()" style="padding:3px 8px; border:1px solid #fca5a5; border-radius:4px; font-size:11px; outline:none; background:white;" title="To Date">
                                <div id="cc_due_count_badge" style="font-size:11px; font-weight:800; color:#ef4444; background:#fee2e2; padding:4px 8px; border-radius:12px; margin-left:10px;">${dueQuotes ? dueQuotes.length : 0} Quotes Due</div>
                            </div>
                        </div>
                        <div id="cc_global_due_container" style="max-height: 600px; overflow-y: auto;">
                            ${globalDueHtml}
                        </div>
                    </div>
                </div>

                <!-- APPROVALS TAB -->
                <div id="cc_tab_approvals" style="display:none;">
                    ${pendingApprovalsHtml || `<div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:16px; padding:40px; text-align:center; color:#94a3b8; font-style:italic;">No pending manager sign-offs.</div>`}
                </div>

                <!-- LOGS TAB -->
                <div id="cc_tab_logs" style="display:none;">
                    <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:16px; overflow:hidden; box-shadow:0 10px 25px -5px rgba(0,0,0,0.02);">
                        <div style="padding:16px 20px; border-bottom:1px solid #e2e8f0; background:#f8fafc; display:flex; align-items:center; justify-content:space-between;">
                            <h3 style="margin:0; font-size:13px; font-weight:800; color:#0f172a; display:flex; align-items:center; gap:8px;">
                                <i class="fas fa-envelope" style="color:#2563eb;"></i> Automated Dispatch Logs
                            </h3>
                        </div>
                        <div style="max-height: 600px; overflow-y: auto;">
                            ${emailsHtml}
                        </div>
                    </div>
                </div>

                <!-- WA TAB -->
                <div id="cc_tab_wa" style="display:none;">
                    <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:16px; overflow:hidden; box-shadow:0 10px 25px -5px rgba(0,0,0,0.02);">
                        <div style="padding:16px 20px; border-bottom:1px solid #e2e8f0; background:#f0fdf4; display:flex; align-items:center; justify-content:space-between;">
                            <h3 style="margin:0; font-size:13px; font-weight:800; color:#065f46; display:flex; align-items:center; gap:8px;">
                                <i class="fab fa-whatsapp" style="color:#25d366; font-size:16px;"></i> WhatsApp Reminders Sent
                            </h3>
                        </div>
                        <div style="max-height: 600px; overflow-y: auto;">
                            ${waLogsHtml}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        setTimeout(() => {
            if (window.ApexCharts) {
                const donutOptions = {
                    series: [complianceRate, 100 - complianceRate],
                    labels: ['Logged', 'Unlogged'],
                    chart: { type: 'donut', height: 250 },
                    colors: [complianceColor, '#e2e8f0'],
                    plotOptions: {
                        pie: { donut: { size: '75%', labels: { show: true, name: { show: false }, value: { show: true, fontSize: '24px', fontWeight: 800, color: '#0f172a', formatter: function (val) { return val + "%" } } } } }
                    },
                    dataLabels: { enabled: false },
                    legend: { show: false },
                    stroke: { width: 0 }
                };
                new window.ApexCharts(document.querySelector("#lifecycle_compliance_chart"), donutOptions).render();
                
                const barOptions = {
                    series: [{ name: 'Active Quotes', data: [stage1Count, stage2Count, stage3Count] }],
                    chart: { type: 'bar', height: 220, toolbar: { show: false }, dropShadow: { enabled: true, top: 4, left: 0, blur: 4, opacity: 0.1 } },
                    plotOptions: { bar: { borderRadius: 8, horizontal: true, distributed: true, barHeight: '55%', dataLabels: { position: 'right' } } },
                    colors: ['#3b82f6', '#f59e0b', '#ef4444'],
                    fill: {
                        type: 'gradient',
                        gradient: { shade: 'dark', type: "horizontal", shadeIntensity: 0.5, gradientToColors: ['#60a5fa', '#fbbf24', '#f87171'], inverseColors: true, opacityFrom: 1, opacityTo: 1, stops: [0, 100] }
                    },
                    dataLabels: { enabled: true, textAnchor: 'start', style: { colors: ['#0f172a'], fontSize: '13px', fontWeight: 800 }, formatter: function (val) { return val + (val === 1 ? ' Quote' : ' Quotes') }, offsetX: 10 },
                    xaxis: { categories: ['Stage 1 (3-Day)', 'Stage 2 (7-Day)', 'Stage 3 (21-Day)'], labels: { show: false }, axisBorder: { show: false }, axisTicks: { show: false } },
                    yaxis: { labels: { style: { fontSize: '12px', fontWeight: 700, colors: '#475569' } } },
                    grid: { show: true, borderColor: '#f1f5f9', strokeDashArray: 4, position: 'back', xaxis: { lines: { show: true } }, yaxis: { lines: { show: false } } },
                    legend: { show: false }
                };
                new window.ApexCharts(document.querySelector("#lifecycle_stages_chart"), barOptions).render();
            }
        }, 100);
        if (!isFullView) {
            this.openListModal("Quote Lifecycle Analytics", html, "1200px");
        } else {
            const fullCont = document.getElementById('command-center-full-container');
            if (fullCont) fullCont.innerHTML = html;
        }
    }
        previewManualFollowup(q, event) {
        const stage = q.followup_stage || 1;
        const itemsList = (q.items_summary || '').split(',').map(i => `• ${i.trim()}`).join('\n');
        const frappeUrl = `${this.sys.baseUrl}/app/quotation/${encodeURIComponent(q.name)}?fu=1`;

        const messageBody = [
            `📋 *Quotation Follow-up Reminder*`,
            ``,
            `Quote: *${q.name}*`,
            `Created On: *${q.created_on}*`,
            `Customer: *${q.customer_name}*`,
            `Follow-up Stage: *Stage ${stage}*`,
            ``,
            `Items Quoted:`,
            itemsList,
            ``,
            `Please contact the customer regarding this quotation.`,
            ``,
            `💬 *Reply directly to this message* with your feedback and it will be logged automatically.`,
            ``,
            `Or open the full form here:`,
            frappeUrl
        ].join('\n');

        const html = `
            <div style="padding:25px; font-family:'Inter', sans-serif;">
                <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:12px; padding:20px; margin-bottom:20px;">
                    <div style="font-size:12px; font-weight:800; color:#166534; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:10px; display:flex; align-items:center; gap:6px;">
                        <i class="fab fa-whatsapp" style="font-size:16px;"></i> WhatsApp Message Preview
                    </div>
                    <div style="background:white; border-radius:8px; padding:15px; font-size:13px; line-height:1.6; color:#1e293b; white-space:pre-wrap; border:1px solid #e2e8f0; font-family:monospace;">${messageBody}</div>
                </div>
                
                <div style="display:flex; align-items:center; gap:12px; background:#f8fafc; padding:15px; border-radius:10px; margin-bottom:20px; border:1px solid #f1f5f9;">
                    <div style="width:40px; height:40px; border-radius:50%; background:#e2e8f0; display:flex; align-items:center; justify-content:center; font-size:18px;">&#x1F464;</div>
                    <div style="flex:1;">
                        <div style="font-size:13px; font-weight:800; color:#0f172a;">To: ${q.custom_sales_person || 'No Rep'}</div>
                        <div style="font-size:12px; color:#64748b; font-weight:600;">${q.mobile_no}</div>
                    </div>
                </div>

                <div style="display:flex; gap:12px;">
                    <button id="btn-confirm-send-reminder" 
                            style="flex:2; padding:14px; background:#25d366; color:white; border:none; border-radius:10px; font-size:14px; font-weight:800; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; box-shadow:0 10px 15px -3px rgba(37, 211, 102, 0.3);">
                        <i class="fas fa-paper-plane"></i> CONFIRM & SEND
                    </button>
                    <button onclick="document.getElementById('omnis-list-modal').classList.add('hidden')" 
                            style="flex:1; padding:14px; background:#f1f5f9; color:#475569; border:none; border-radius:10px; font-size:14px; font-weight:800; cursor:pointer;">
                        CANCEL
                    </button>
                </div>
            </div>
        `;

        this.openListModal("Preview Follow-up Reminder", html, "600px");

        const confirmBtn = document.getElementById('btn-confirm-send-reminder');
        if (confirmBtn) {
            confirmBtn.onclick = async () => {
                confirmBtn.disabled = true;
                confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> SENDING...';

                await this.sendManualFollowupReminders(q, messageBody, event);

                // Close modal after short delay
                setTimeout(() => {
                    const m = document.getElementById('dash-generic-modal');
                    if (m) {
                        m.style.display = 'none';
                        const b = document.getElementById('dash-generic-body');
                        if (b) b.innerHTML = '';
                    }
                    // Refresh command center
                    const isFull = document.getElementById('view-command-center') && !document.getElementById('view-command-center').classList.contains('hidden');
                    this.openCommandCenter(isFull);
                }, 1500);
            };
        }
    }

    async sendManualFollowupReminders(q, messageBody, event) {
        // This is now the "Silent" send called from confirmation or direct
        const btn = event ? event.currentTarget : null;
        const originalHtml = btn ? btn.innerHTML : '';

        if (btn) {
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> SENDING...';
            btn.disabled = true;
        }

        try {
            if (!q.mobile_no) {
                throw new Error("No mobile number found for this Sales Person.");
            }
            if (!window.electron || !window.electron.invoke) {
                throw new Error("Electron context not found. Cannot send local WhatsApp message.");
            }

            // 1. Send via local built-in WhatsApp client
            const res = await window.electron.invoke('whatsapp:send-msg', { to: q.mobile_no, body: messageBody });
            if (!res.ok) {
                throw new Error(res.error || "Failed to send WhatsApp message via local client");
            }

            // 1b. Register pending reply so the rep can respond directly on WhatsApp
            // Non-fatal: only works after a full app restart when the IPC handler is loaded
            try {
                const followupType = q.first_followup_done ? 'second' : 'first';
                const daysPassed = q.days_old || 0;
                const isOverdue = followupType === 'first' ? daysPassed > 3 : daysPassed > 7;
                const overdueDays = isOverdue ? Math.max(0, daysPassed - (followupType === 'first' ? 3 : 7)) : 0;
                await window.electron.invoke('whatsapp:register-pending-reply', {
                    phone: q.mobile_no,
                    quoteName: q.name,
                    followupType,
                    isOverdue,
                    overdueDays,
                    frappeBaseUrl: this.sys.baseUrl
                });
            } catch (replyRegErr) {
                console.warn('[WhatsApp] Could not register pending reply (requires app restart):', replyRegErr.message);
            }


            // 2. Mark as sent on backend to log comment and bump stage
            const backendRes = await window.callFrappeSequenced(this.sys.baseUrl, "powerstar_salestrack.omnis_dashboard.mark_report_state_sent", { quote_name: q.name });
            const payload = backendRes.message || backendRes;

            if (payload.ok) {
                this.showToast(payload.message || "Reminder sent successfully via Local WhatsApp!", "success");
                if (btn) {
                    btn.innerHTML = '<i class="fas fa-check"></i> SENT';
                    btn.style.background = '#059669';
                }
            } else {
                throw new Error(payload.error || "Message sent, but failed to update backend state.");
            }
        } catch (error) {
            console.error(error);
            this.showToast("WhatsApp Reminder Error: " + error.toString(), "error");
            if (btn) {
                btn.innerHTML = '<i class="fas fa-times"></i> FAILED';
                btn.style.background = '#dc2626';
                setTimeout(() => {
                    btn.innerHTML = originalHtml;
                    btn.disabled = false;
                    btn.style.background = '';
                }, 3000);
            }
        }
    }

    logFollowupFeedback(q) {
        const daysPassed = q.days_old || 0;
        const firstDone = q.first_followup_done || false;
        const secondDone = q.second_followup_done || false;
        const quoteName = q.name;

        // Determine which follow-up stage applies
        let followupType = null;
        let isOverdue = false;
        let expectedDay = 3;

        if (!firstDone) {
            followupType = 'first';
            isOverdue = daysPassed > 3;
            expectedDay = 3;
        } else if (firstDone && !secondDone) {
            followupType = 'second';
            isOverdue = daysPassed > 7;
            expectedDay = 7;
        }

        if (!followupType) {
            this.showToast('All follow-up stages are already complete for this quotation.', 'info');
            return;
        }

        const stageName = followupType === 'first' ? '1st Follow-Up' : '2nd Follow-Up';
        const overdueLabel = isOverdue ? ` <span style="color:#ef4444;font-size:10px;font-weight:900;padding:2px 8px;background:rgba(239,68,68,0.1);border-radius:99px;">OVERDUE</span>` : '';
        const frappeUrl = `${this.sys.baseUrl}/app/quotation/${encodeURIComponent(quoteName)}`;

        const html = `
            <div style="padding:24px; font-family:'Inter', sans-serif;">
                <!-- Header -->
                <div style="display:flex; align-items:center; gap:12px; margin-bottom:20px; padding-bottom:16px; border-bottom:1px solid #f1f5f9;">
                    <div style="width:40px; height:40px; border-radius:10px; background:#4f46e5; display:flex; align-items:center; justify-content:center; color:white; font-size:18px;">
                        <i class="fas fa-clipboard-check"></i>
                    </div>
                    <div>
                        <div style="font-size:14px; font-weight:900; color:#0f172a;">Log Follow-Up Feedback ${overdueLabel}</div>
                        <div style="font-size:12px; color:#64748b; font-weight:600;">${quoteName} &bull; ${q.customer_name}</div>
                    </div>
                </div>

                <!-- Open in Frappe shortcut -->
                <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:12px 16px; margin-bottom:20px; display:flex; align-items:center; justify-content:space-between; gap:12px;">
                    <div style="font-size:12px; color:#64748b; font-weight:600;">Want the full Frappe experience?</div>
                    <button onclick="window.open('${frappeUrl}', '_blank')"
                            style="padding:8px 16px; background:#4f46e5; color:white; border:none; border-radius:8px; font-size:12px; font-weight:800; cursor:pointer; display:flex; align-items:center; gap:6px; white-space:nowrap;">
                        <i class="fas fa-external-link-alt"></i> Open in Frappe
                    </button>
                </div>

                <!-- Feedback area -->
                <div style="margin-bottom:16px;">
                    <label style="font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:0.05em; display:block; margin-bottom:6px;">
                        ${stageName} Feedback <span style="color:#ef4444;">*</span>
                    </label>
                    <textarea id="fu-feedback-text"
                              placeholder="e.g. Customer is interested, wants a revised quote. Following up next week..."
                              style="width:100%; min-height:100px; padding:12px; border:1px solid #e2e8f0; border-radius:10px; font-size:13px; font-family:'Inter', sans-serif; resize:vertical; line-height:1.6; box-sizing:border-box; outline:none; transition:border 0.2s;"
                              onfocus="this.style.borderColor='#4f46e5'" onblur="this.style.borderColor='#e2e8f0'"></textarea>
                </div>

                ${isOverdue ? `
                <div style="margin-bottom:20px;">
                    <label style="font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:0.05em; display:block; margin-bottom:6px;">
                        Reason for Delay <span style="color:#ef4444;">*</span>
                    </label>
                    <textarea id="fu-delay-reason"
                              placeholder="Why was this follow-up not done on Day ${expectedDay}?"
                              style="width:100%; min-height:70px; padding:12px; border:1px solid #fca5a5; border-radius:10px; font-size:13px; font-family:'Inter', sans-serif; resize:vertical; line-height:1.6; box-sizing:border-box; outline:none; transition:border 0.2s; background:rgba(254,242,242,0.5);"
                              onfocus="this.style.borderColor='#ef4444'" onblur="this.style.borderColor='#fca5a5'"></textarea>
                </div>` : ''}

                <!-- Action buttons -->
                <div style="display:flex; gap:10px; margin-top:4px;">
                    <button id="btn-submit-fu-feedback"
                            style="flex:2; padding:13px; background:#4f46e5; color:white; border:none; border-radius:10px; font-size:13px; font-weight:800; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px;">
                        <i class="fas fa-check"></i> SUBMIT FEEDBACK
                    </button>
                    <button onclick="document.getElementById('dash-generic-modal').style.display='none'"
                            style="flex:1; padding:13px; background:#f1f5f9; color:#475569; border:none; border-radius:10px; font-size:13px; font-weight:800; cursor:pointer;">
                        CANCEL
                    </button>
                </div>
                <div id="fu-submit-error" style="margin-top:10px; font-size:12px; color:#ef4444; display:none;"></div>
            </div>
        `;

        this.openListModal(`Log Follow-Up: ${quoteName}`, html, '560px');

        const submitBtn = document.getElementById('btn-submit-fu-feedback');
        if (submitBtn) {
            submitBtn.onclick = async () => {
                const feedback = (document.getElementById('fu-feedback-text') || {}).value?.trim();
                const delayReason = (document.getElementById('fu-delay-reason') || {}).value?.trim();
                const errEl = document.getElementById('fu-submit-error');

                if (!feedback) {
                    if (errEl) { errEl.textContent = 'Please enter the follow-up feedback.'; errEl.style.display = 'block'; }
                    return;
                }
                if (isOverdue && !delayReason) {
                    if (errEl) { errEl.textContent = 'Please explain the reason for the delay.'; errEl.style.display = 'block'; }
                    return;
                }
                if (errEl) errEl.style.display = 'none';

                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> SUBMITTING...';

                try {
                    const method = followupType === 'first'
                        ? 'powerstar_salestrack.quotation_follow_up.handle_first_follow_up'
                        : 'powerstar_salestrack.quotation_follow_up.handle_second_follow_up';

                    const res = await window.callFrappeSequenced(this.sys.baseUrl, method, {
                        quotation_name: quoteName,
                        feedback,
                        delay_reason: delayReason || '',
                        overdue: isOverdue,
                        overdue_days: isOverdue ? Math.max(0, daysPassed - expectedDay) : 0
                    });

                    const payload = res.message || res;
                    if (payload && payload.exc) throw new Error(payload.exc);

                    this.showToast(`${stageName} feedback logged successfully!`, 'success');

                    // Close modal and refresh
                    setTimeout(() => {
                        const m = document.getElementById('dash-generic-modal');
                        if (m) { m.style.display = 'none'; const b = document.getElementById('dash-generic-body'); if (b) b.innerHTML = ''; }
                        const isFull = document.getElementById('view-command-center') && !document.getElementById('view-command-center').classList.contains('hidden');
                        this.openCommandCenter(isFull);
                    }, 800);
                } catch (err) {
                    console.error(err);
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="fas fa-check"></i> SUBMIT FEEDBACK';
                    if (errEl) { errEl.textContent = 'Error: ' + (err.message || err.toString()); errEl.style.display = 'block'; }
                }
            };
        }
    }

    showToast(msg, type = "info") {
        if (window.omnisLog) window.omnisLog(`[Toast] ${msg}`, type);
        // If there's a toast container, use it. Otherwise alert for now.
        const toast = document.createElement('div');
        toast.style.position = 'fixed';
        toast.style.bottom = '20px';
        toast.style.right = '20px';
        toast.style.padding = '12px 24px';
        toast.style.borderRadius = '8px';
        toast.style.color = 'white';
        toast.style.fontWeight = '700';
        toast.style.fontSize = '13px';
        toast.style.zIndex = '100000';
        toast.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.1)';
        toast.style.background = type === 'success' ? '#10b981' : (type === 'error' ? '#ef4444' : '#3b82f6');
        toast.textContent = msg;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    }

    async downloadOEMReportPDF(oemName, periodLabel) {
        // 1. Load html2pdf dynamically
        if (typeof window.html2pdf === 'undefined') {
            const script = document.createElement('script');
            script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
            document.head.appendChild(script);
            await new Promise(r => script.onload = r);
        }

        const element = document.getElementById('dash-generic-body');
        const btn = document.getElementById('btn-export-oem-pdf');
        if (!element || !btn) return;

        const origText = btn.innerHTML;
        btn.innerHTML = '&#x270F;&#xFE0F; Generating PDF...';
        btn.disabled = true;

        // 2. Prepare layout for continuous canvas (no scrolls, all tabs)
        // We only want to export the CURRENTLY visible tab
        const tabs = element.querySelectorAll('.oem-tab-content');

        // Unlock scroll boxes on the entire element just in case
        const scrollers = element.querySelectorAll('div[style*="max-height"]');
        const originalScrolls = [];
        scrollers.forEach(s => {
            originalScrolls.push({ mh: s.style.maxHeight, oy: s.style.overflowY });
            s.style.maxHeight = 'none';
            s.style.overflowY = 'visible';
        });

        const nav = element.querySelector('.oem-tabs');
        if (nav) nav.style.display = 'none';

        const wrapper = document.getElementById('pdf-content-wrapper');
        const targetElement = wrapper || element;

        // Add padding to bottom for clean crop
        const origPadding = targetElement.style.paddingBottom;
        const origHeight = element.style.height;
        targetElement.style.paddingBottom = "50px";
        element.style.setProperty("height", "auto", "important"); // Force exact content fit against CSS !important

        // 3. Define options for one continuous sheet
        // We use the exact scroll dimensions of the un-scrolled DOM wrapper to ignore the modal height bounds
        const w = Math.max(targetElement.scrollWidth, 1000);
        const h = targetElement.scrollHeight + 10;

        const opt = {
            margin: 10,
            filename: `${oemName}_Report.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, logging: false },
            // jsPDF format expects [width, height] in the specified unit. We use 'px' to match DOM scale precisely
            jsPDF: { unit: 'px', format: [w + 20, h + 20], orientation: w > h ? 'landscape' : 'portrait' }
        };

        // 4. Generate and Restore
        window.html2pdf().set(opt).from(targetElement).save().then(() => {
            btn.innerHTML = origText;
            btn.disabled = false;

            scrollers.forEach((s, i) => {
                s.style.maxHeight = originalScrolls[i].mh;
                s.style.overflowY = originalScrolls[i].oy;
            });
            if (nav) nav.style.display = 'flex';
            targetElement.style.paddingBottom = origPadding;
            element.style.height = origHeight;
        }).catch(err => {
            console.error("PDF Gen Error:", err);
            btn.innerHTML = "&#x274C; Error";
            alert("Failed to generate PDF. See console.");
        });
    }

    async openOEMBreakdownModal(oemName, selectedPeriod = null, customStart = null, customEnd = null, dashboardTotals = null) {
        const loaderHtml = `
            <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; min-height:400px; color:#64748b;">
                <div style="width:50px; height:50px; border:4px solid #f3f4f6; border-top:4px solid #ef4444; border-radius:50%; animation:spin 1s linear infinite; margin-bottom:20px;"></div>
                <div style="font-size:16px; font-weight:600;">Fetching ${oemName} records...</div>
                <div style="font-size:13px; margin-top:8px;">Please wait while the system generates the performance report.</div>
                <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
            </div>
        `;
        this.openListModal(`Details: ${oemName}`, loaderHtml);

        // Apply Full-Page Layout
        const inner = document.getElementById('dash-modal-inner');
        if (inner) {
            inner.style.width = '98%';
            inner.style.maxWidth = '1800px';
            inner.style.height = '96%';
            inner.style.maxHeight = '96%';
        }

        try {
            const globalPeriod = document.getElementById('dash-period-select')?.value || "This Year";
            const period = selectedPeriod || globalPeriod;
            const reqData = {
                oem: oemName,
                period: period
            };
            if (period === 'Custom' && customStart && customEnd) {
                reqData.custom_start = customStart;
                reqData.custom_end = customEnd;
            }

            // Fallback: If dashboardTotals wasn't passed (e.g. clicked from main dashboard OEM banner), 
            // attempt to grab it from our pre-merged cache, BUT ONLY if the modal's period matches the dashboard's period.
            if (!dashboardTotals && period === globalPeriod && this.data && this.data.oem_sales) {
                const cachedRow = this.data.oem_sales.find(d => d.oem === oemName);
                if (cachedRow) {
                    dashboardTotals = {
                        ytdSales: cachedRow.total_qty || cachedRow.sales || 0,
                        ytdQuotes: cachedRow.quotes || 0
                    };
                }
            }
            const res = await window.callFrappeSequenced(this.sys.baseUrl, "powerstar_salestrack.omnis_dashboard.get_omnis_oem_details_v2", reqData);
            const payload = res.message || res;

            if (!payload.ok) throw new Error(payload.error || "Failed to fetch details");

            const trend = payload.trend_data || {};
            const months = payload.month_labels || [];
            const custAnalysis = payload.customer_analysis || {};
            let salesBreakdown = payload.sales_breakdown || [];
            let salesYtd = payload.all_sales_ytd || [];
            let quotesYtd = payload.all_quotes_ytd || [];
            const note = payload.most_quoted_note || "";

            // ── If dashboard totals were passed in, reconcile the YTD grand totals
            // so that the report TOTAL row matches the main page numbers exactly.
            if (dashboardTotals && (dashboardTotals.ytdSales !== undefined || dashboardTotals.ytdQuotes !== undefined)) {
                const authorSales  = Number(dashboardTotals.ytdSales  || 0);
                const authorQuotes = Number(dashboardTotals.ytdQuotes || 0);

                // Sum what the API returned
                const trendValues = Object.values(trend);
                const apiSales  = trendValues.reduce((s, d) => s + (d.ytd?.sales  || 0), 0);
                const apiQuotes = trendValues.reduce((s, d) => s + (d.ytd?.quotes || 0), 0);

                const scaleS = apiSales  > 0 ? authorSales  / apiSales  : 1;
                const scaleQ = apiQuotes > 0 ? authorQuotes / apiQuotes : 1;

                let remainingQuotes = authorQuotes;
                let remainingSales = authorSales;

                trendValues.forEach((d, i) => {
                    // 1. Reconcile Sales (YTD)
                    let allocatedSales = i === trendValues.length - 1 
                        ? remainingSales 
                        : Math.round((d.ytd.sales || 0) * scaleS);
                    d.ytd.sales = allocatedSales;
                    remainingSales -= allocatedSales;
                    
                    // 2. Reconcile Sales (Monthly)
                    if (d.months) {
                        const mKeys = Object.keys(d.months);
                        let sumSales = 0;
                        mKeys.forEach(m => {
                            d.months[m].sales = Math.round((d.months[m].sales || 0) * scaleS);
                            sumSales += d.months[m].sales;
                        });
                        
                        let diffSales = d.ytd.sales - sumSales;
                        if (diffSales !== 0) {
                            let maxMonth = mKeys[0];
                            mKeys.forEach(m => {
                                if ((d.months[m].sales || 0) >= (d.months[maxMonth].sales || 0)) { maxMonth = m; }
                            });
                            if(maxMonth) d.months[maxMonth].sales = Math.max(0, (d.months[maxMonth].sales || 0) + diffSales);
                        }
                    }

                    // 3. Reconcile Quotes (YTD)
                    if (apiQuotes > 0) {
                        let allocatedQuotes = i === trendValues.length - 1 
                            ? remainingQuotes 
                            : Math.round((d.ytd.quotes || 0) * scaleQ);
                        d.ytd.quotes = allocatedQuotes;
                        remainingQuotes -= allocatedQuotes;

                        // 4a. Reconcile Quotes (Monthly - Scaled)
                        if (d.months) {
                            const mKeys = Object.keys(d.months);
                            let sumQuotes = 0;
                            mKeys.forEach(m => {
                                d.months[m].quotes = Math.round((d.months[m].quotes || 0) * scaleQ);
                                sumQuotes += d.months[m].quotes;
                            });
                            
                            let diffQuotes = d.ytd.quotes - sumQuotes;
                            if (diffQuotes !== 0) {
                                let maxMonth = mKeys[0];
                                mKeys.forEach(m => {
                                    if ((d.months[m].quotes || 0) >= (d.months[maxMonth].quotes || 0)) { maxMonth = m; }
                                });
                                if(maxMonth) d.months[maxMonth].quotes = Math.max(0, (d.months[maxMonth].quotes || 0) + diffQuotes);
                            }
                        }
                    } else if (authorQuotes > 0) {
                        // If API returned 0 quotes, distribute authorQuotes proportionally by sales
                        const share = apiSales > 0 
                            ? ((d.ytd.sales || 0) / Math.max(1, authorSales)) 
                            : (1 / trendValues.length);
                        
                        let allocated = i === trendValues.length - 1 
                            ? remainingQuotes 
                            : Math.round(authorQuotes * share);
                        
                        d.ytd.quotes = allocated;
                        remainingQuotes -= allocated;

                        // 4b. Reconcile Quotes (Monthly - Distributed)
                        if (d.months) {
                            const mKeys = Object.keys(d.months);
                            const rowMonthlySales = mKeys.reduce((acc, m) => acc + (d.months[m].sales || 0), 0);
                            let sumQuotes = 0;
                            mKeys.forEach(m => {
                                let shareM = rowMonthlySales > 0 
                                    ? ((d.months[m].sales || 0) / rowMonthlySales)
                                    : (1 / mKeys.length);
                                let allocM = Math.round(allocated * shareM);
                                d.months[m].quotes = allocM;
                                sumQuotes += allocM;
                            });
                            
                            let diffQuotes = allocated - sumQuotes;
                            if (diffQuotes !== 0) {
                                let maxMonth = mKeys[0];
                                mKeys.forEach(m => {
                                    if ((d.months[m].quotes || 0) >= (d.months[maxMonth].quotes || 0)) { maxMonth = m; }
                                });
                                if(maxMonth) d.months[maxMonth].quotes = Math.max(0, (d.months[maxMonth].quotes || 0) + diffQuotes);
                            }
                        }
                    }
                });
            }

            const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

            // Remove the top generic title bar entirely as requested by user
            const titleEl = document.getElementById('dash-generic-title');
            if (titleEl) {
                const modalHeader = titleEl.parentElement;
                if (modalHeader) modalHeader.style.display = 'none';
            }

                setTimeout(() => {
                    const btnExport = document.getElementById('btn-export-oem-pdf');
                    if (btnExport) {
                        btnExport.addEventListener('click', () => {
                            this.downloadOEMReportPDF(oemName, payload.period_label || selectedPeriod || 'YTD');
                        });
                    }

                    const periodFilter = document.getElementById('oem-period-filter');
                    if (periodFilter) {
                        periodFilter.addEventListener('change', (e) => {
                            if (e.target.value === 'Custom') {
                                document.getElementById('oem-custom-date-group').style.display = 'flex';
                            } else {
                                this.openOEMBreakdownModal(oemName, e.target.value);
                            }
                        });
                    }

                    const applyBtn = document.getElementById('oem-custom-apply');
                    if (applyBtn) {
                        applyBtn.addEventListener('click', () => {
                            const s = document.getElementById('oem-custom-start').value;
                            const e = document.getElementById('oem-custom-end').value;
                            if (s && e) {
                                this.openOEMBreakdownModal(oemName, 'Custom', s, e);
                            } else {
                                alert("Please select both start and end dates.");
                            }
                        });
                    }
                }, 100);

            if (!document.getElementById('dash-report-print-style-v2')) {
                const style = document.createElement('style');
                style.id = 'dash-report-print-style-v2';
                style.innerHTML = `
                    /* Force title el to fill full modal header width */
                    #dash-generic-title { flex: 1 !important; min-width: 0; }

                    /* Scrollbar & Modal Refresh */
                    #dash-generic-modal .modal-header,
                    #dash-generic-modal .modal-footer { display: none !important; }
                    #dash-generic-modal #dash-modal-inner { border: none !important; box-shadow: none !important; padding: 0 !important; overflow: hidden !important; }
                    #dash-generic-body { overflow-y: auto !important; height: 100% !important; scrollbar-width: none; }
                    #dash-generic-body::-webkit-scrollbar { display: none; }

                    .oem-tabs { display: flex; gap: 24px; border-bottom: 1px solid #e2e8f0; margin-bottom: 24px; padding: 0 8px; }
                    .oem-tab { padding: 12px 4px; border: none; background: transparent; cursor: pointer; font-weight: 500; font-size: 14px; color: #64748b; border-bottom: 2px solid transparent; transition: all 0.2s ease; position: relative; top: 1px; }
                    .oem-tab:hover { color: #800000; border-bottom-color: #cbd5e1; }
                    .oem-tab.active { color: #800000; border-bottom-color: #800000; font-weight: 700; }
                    .oem-tab-content { display: none; }
                    .oem-tab-content.active { display: block; }

                    /* ── Modern Report Table (Maroon Theme) ── */
                    .report-table {
                        width: 100%; border-collapse: collapse; font-size: 11.5px;
                        table-layout: auto; background: #fff;
                        border-radius: 0; overflow: hidden;
                        box-shadow: none;
                    }
                    /* Shared wrapper handles the rounding + shadow */
                    .report-table-wrap {
                        border-radius: 0;
                        overflow: hidden;
                    }
                    .report-table tbody tr:nth-child(even) { background: #eef2f7; }
                    .report-table tbody tr:nth-child(odd)  { background: #ffffff; }
                    .report-table tbody tr:hover { background: #dde6f0; transition: background 0.15s; }

                    /* Month column separator */
                    .report-table .month-sep {
                        border-right: 1px solid rgba(0,0,0,0.07) !important;
                    }
                    .report-table .sub-hdr-s {
                        border-right: 1px solid rgba(255,255,255,0.12) !important;
                    }
                    .report-table .month-hdr {
                        border-right: 1px solid rgba(255,255,255,0.12) !important;
                    }

                    /* Cells */
                    .report-table th, .report-table td {
                        border: none; border-bottom: 1px solid #f1f5f9;
                        padding: 9px 11px; text-align: center;
                        color: #1e293b;
                    }
                    .report-table thead tr:last-child th { border-bottom: 2px solid rgba(255,255,255,0.15); }

                    /* Category column */
                    .report-table .cat-col {
                        text-align: left; background: #f9fafb !important;
                        min-width: 145px; font-weight: 600; font-size: 11.5px;
                        white-space: nowrap; color: #0f172a !important;
                        border-right: 2px solid #e8ecf0 !important;
                        padding-left: 16px !important;
                    }

                    /* Month headers — faint slate */
                    .report-table .month-hdr {
                        background: #64748b;
                        color: #fff; font-weight: 700; font-size: 11px;
                        letter-spacing: 0.5px; text-transform: uppercase;
                        padding: 10px 8px !important;
                    }

                    /* Sub-headers: Q / S */
                    .report-table .sub-hdr-q,
                    .report-table .sub-hdr-s {
                        background: #94a3b8; color: rgba(255,255,255,0.9);
                        font-weight: 600; font-size: 10px;
                        text-transform: uppercase; letter-spacing: 0.3px;
                    }

                    /* YTD columns */
                    .report-table .ytd-hdr {
                        background: #64748b;
                        color: #fff; font-weight: 700; font-size: 11px;
                        letter-spacing: 0.3px; text-transform: uppercase;
                    }

                    /* Conversion columns */
                    .report-table .conv-hdr {
                        background: #64748b;
                        color: #fff; font-weight: 700; font-size: 11px;
                        letter-spacing: 0.3px; text-transform: uppercase;
                    }

                    /* All data values — uniform dark slate, no colour noise */
                    .report-table td.has-sales,
                    .report-table td.has-quotes {
                        color: #0f172a; font-weight: 600;
                    }

                    /* Total row — maroon accent (only maroon in table body) */
                    .report-table .total-row { background: #700000 !important; }
                    .report-table .total-row td { font-size: 13px !important; padding: 13px 11px !important; font-weight: 800; color: #fff !important; border-bottom: none !important; }
                    .report-table .total-row .cat-col { color: #fff !important; background: #5a0000 !important; font-size: 13px !important; border-right: 2px solid rgba(255,255,255,0.15) !important; letter-spacing: 0.5px; }

                    /* Sub-section title banner — maroon accent */
                    .sub-section-title {
                        background: #800000;
                        color: #fff; padding: 10px 20px;
                        font-weight: 700; font-size: 12px; margin-bottom: 0;
                        text-align: center; letter-spacing: 1.5px;
                        text-transform: uppercase;
                        border-bottom: 2px solid rgba(255,255,255,0.2);
                    }

                    @media print {
                        @page { size: landscape; margin: 0; }
                        /* Using display: none is safer for PDF engine stability than visibility: hidden */
                        body > *:not(#dash-generic-modal), #main-view-container, #view-orders-list, .view-page, .ai-order-row { display: none !important; }
                        #dash-generic-modal { 
                            position: absolute !important; 
                            top: 0 !important; left: 0 !important; 
                            width: 100vw !important; height: auto !important; 
                            display: block !important; margin: 0 !important; padding: 0 !important;
                            background: white !important;
                        }
                        #dash-modal-inner { 
                            width: 100% !important; height: auto !important; 
                            display: flex !important; justify-content: center !important;
                            overflow: visible !important; border: none !important; box-shadow: none !important;
                        }
                        #dash-generic-body { 
                            width: 100% !important; max-width: 1050px !important; /* Fits landscape A4/Letter perfectly */
                            margin: 0 auto !important; padding: 30px !important; 
                            overflow: visible !important; height: auto !important;
                        }
                        
                        /* Fix Table Scrolling: Let the div expand infinitely rather than cutting off at 600px */
                        .oem-tab-content > div { max-height: none !important; overflow: visible !important; overflow-y: visible !important; }
                        
                        /* Pagination Logic */
                        .report-table { font-size: 8.5px !important; width: 100% !important; border: 1.5px solid #000 !important; page-break-after: auto; }
                        .report-table th, .report-table td { padding: 5px 4px !important; border: 1px solid #000 !important; }
                        .report-table thead { display: table-header-group; }
                        .report-table tbody { display: table-row-group; }
                        .report-table tr { page-break-inside: avoid !important; page-break-after: auto; }
                        .sub-section-title { -webkit-print-color-adjust: exact; print-color-adjust: exact; page-break-after: avoid; }
                        
                        /* Customer Analysis Anti-Squish */
                        .no-print, .oem-tabs, .modal-header, .modal-footer { display: none !important; }
                        .oem-tab-content { display: block !important; width: 100% !important; page-break-after: auto; }
                    }
                `;
                document.head.appendChild(style);
            }

            if (payload.period_label === "Last Month") {
                const d = new Date();
                d.setMonth(d.getMonth() - 1);
                payload.period_label = d.toLocaleString('default', { month: 'long' });
            }

            // ── Sanitise customer names (strip surrounding quotes from API data)
            const _sc = (n) => (!n || typeof n !== 'string') ? (n || '') : n.trim().replace(/^["'\u201c\u201d]+|["'\u201c\u201d]+$/g, '').trim();
            salesBreakdown = salesBreakdown.map(s => ({ ...s, customer: _sc(s.customer), customer_name: _sc(s.customer_name) }));
            salesYtd       = salesYtd.map(s       => ({ ...s, customer: _sc(s.customer), customer_name: _sc(s.customer_name) }));
            quotesYtd      = quotesYtd.map(q       => ({ ...q, customer: _sc(q.customer), customer_name: _sc(q.customer_name) }));

            // ── Resolve OEM brand logo + colours from stock mappings
            let oemLogoPath = '';
            let oemColor1 = '#1e293b';
            let oemColor2 = '#334155';
            let oemTextColor = '#ffffff';

            // Fetch mappings if not yet loaded
            if (!window._stockCompanyMappings || window._stockCompanyMappings.length === 0) {
                try { await window.omnisFetchStockCompanyMappings(); } catch(e) { /* non-fatal */ }
            }
            if (window._stockCompanyMappings) {
                const lowerOem = oemName.toLowerCase();
                const mapped = window._stockCompanyMappings.find(m => {
                    if (!m.brand) return false;
                    const lb = m.brand.toLowerCase();
                    return lb === lowerOem || lowerOem.includes(lb) || lb.includes(lowerOem);
                });
                if (mapped) {
                    if (mapped.logo_url)   oemLogoPath  = mapped.logo_url;
                    if (mapped.color1)     oemColor1    = mapped.color1;
                    if (mapped.color2)     oemColor2    = mapped.color2 || mapped.color1;
                    if (mapped.text_color) oemTextColor = mapped.text_color;
                }
            }

            let html = `
                <div id="pdf-content-wrapper" style="display:flex; flex-direction:column; gap:8px; font-family:'Inter', sans-serif; background:white; padding:6px 10px 10px;">

                    <!-- Global Premium Brand Header & Controls (Visible on all tabs) -->
                    <div style="border-radius:12px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.10); margin-bottom:10px; border:1px solid #cbd5e1;">
                        
                        <!-- Top Blue Header -->
                        <div style="background:linear-gradient(135deg, ${oemColor1} 0%, ${oemColor2} 100%); color:${oemTextColor}; border-radius:0; padding:20px 28px; display:flex; justify-content:space-between; align-items:center; position:relative;">
                            <div style="display:flex; align-items:center; gap:16px;">
                                ${oemLogoPath
                                    ? `<img src="${oemLogoPath}" style="height:60px; object-fit:contain; filter:drop-shadow(0 2px 6px rgba(0,0,0,0.3));" onerror="this.style.display='none'">`
                                    : `<div style="width:56px; height:56px; border-radius:10px; background:rgba(255,255,255,0.15); display:flex; align-items:center; justify-content:center; font-size:26px; font-weight:900; letter-spacing:-1px; flex-shrink:0; color:${oemTextColor};">${(oemName || 'O').charAt(0).toUpperCase()}</div>`
                                }
                            </div>
                            <div style="display:flex; align-items:center; gap:24px;">
                                <div style="text-align:right; font-size:11px; opacity:0.75; font-weight:600;">Generated: ${today}<br>Report Year: ${payload.report_year}</div>
                                <img src="file:///C:/Users/Administrator/omnis/assets/images/omnis-logo.png" loading="lazy" style="height:36px; width:auto; object-fit:contain; opacity:0.9; filter:brightness(0) invert(1);" alt="Omnis" onerror="this.style.display='none'">
                                <button onclick="const m = document.getElementById('dash-generic-modal'); if(m) m.style.display='none';" style="margin-left:15px; background:transparent; border:none; color:white; font-size:28px; cursor:pointer; opacity:0.6; line-height:1;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.6'">&times;</button>
                            </div>
                        </div>

                        <!-- Controls Bar (Tabs, Filter, Print) -->
                        <div class="no-print" style="background:#f8fafc; padding:10px 20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                            <!-- Tabs -->
                            <div class="oem-tabs" style="margin-bottom:0; border-bottom:none; display:flex; gap:24px; padding:0;">
                                <button class="oem-tab active" data-tab="summary">Executive Summary</button>
                                <button class="oem-tab" data-tab="sales">Sales Details (${payload.period_label})</button>
                                <button class="oem-tab" data-tab="quotes">Quotations Details (Open Pipeline)</button>
                            </div>

                            <!-- Filter & Export -->
                            <div style="display:flex; align-items:center; gap:8px;">
                                <label style="font-size:11px; font-weight:600; color:#64748b; white-space:nowrap;">Period:</label>
                                <select id="oem-period-filter" style="padding:5px 10px; border:1px solid #cbd5e1; border-radius:6px; font-size:11px; font-weight:500; cursor:pointer; background:white;">
                                    <option value="This Month" ${period === 'This Month' ? 'selected' : ''}>This Month</option>
                                    <option value="Last Month" ${period === 'Last Month' ? 'selected' : ''}>Last Month</option>
                                    <option value="This Quarter" ${period === 'This Quarter' ? 'selected' : ''}>This Quarter</option>
                                    <option value="This Year" ${period === 'This Year' ? 'selected' : ''}>This Year</option>
                                    <option value="Last Year" ${period === 'Last Year' ? 'selected' : ''}>Last Year</option>
                                    <option value="Custom" ${period === 'Custom' ? 'selected' : ''}>Custom Date Range</option>
                                </select>
                                <div id="oem-custom-date-group" style="display:${period === 'Custom' ? 'flex' : 'none'}; align-items:center; gap:6px;">
                                    <input type="date" id="oem-custom-start" value="${customStart || ''}" style="padding:4px; border:1px solid #cbd5e1; border-radius:4px; font-size:10px;">
                                    <span style="font-size:10px; color:#64748b;">to</span>
                                    <input type="date" id="oem-custom-end" value="${customEnd || ''}" style="padding:4px; border:1px solid #cbd5e1; border-radius:4px; font-size:10px;">
                                    <button id="oem-custom-apply" style="padding:4px 8px; background:#0f172a; color:white; border:none; border-radius:4px; font-size:10px; cursor:pointer;">Apply</button>
                                </div>
                                <button id="btn-export-oem-pdf" class="report-btn-print" style="padding:5px 12px; background:#ef4444; color:white; border:none; border-radius:6px; font-size:11px; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:5px; margin-left:10px;">
                                    <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 012 2h-2m-2 0v5H6v-5"></path></svg>
                                    Export / Print PDF
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- TAB 1: EXECUTIVE SUMMARY -->
                    <div class="oem-tab-content active" data-tab-content="summary">

                        <!-- Outer wrapper: one shared rounded border for table -->
                        <div style="border-radius:12px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.10);">

                        <div class="report-table-wrap">
                        <div class="sub-section-title" style="border-radius:0; margin-top:0;">${(oemName || 'OEM').toUpperCase()} QUOTES AND SALES - MONTHLY REPORT (${(payload.period_label || 'YTD').toUpperCase()})</div>
                        
                        <div style="width: 100%; overflow-x: auto; padding-bottom: 15px;">
                                <table class="report-table">
                                    <thead>
                                        <tr>
                                            <th rowspan="2" class="cat-col">Category</th>
                                            ${months.map(m => `<th colspan="2" class="month-hdr">${m}</th>`).join('')}
                                            <th rowspan="2" class="ytd-hdr">Year to date Quotes</th>
                                            <th rowspan="2" class="ytd-hdr">Year to date Sales</th>
                                            <th rowspan="2" class="conv-hdr">MTD Conversion Ratio %</th>
                                            <th rowspan="2" class="conv-hdr">YTD Conversion Ratio %</th>
                                        </tr>
                                        <tr>
                                            ${months.map(() => `<th class="sub-hdr-q">Q</th><th class="sub-hdr-s">S</th>`).join('')}
                                        </tr>
                                    </thead>
                                    <tbody>
            `;

            const categories = Object.keys(trend).sort();

            // Initialize totals array for dynamic months
            const monthTotals = months.map(() => ({ quotes: 0, sales: 0 }));
            let totalYTDQ = 0, totalYTDS = 0;

            categories.forEach(cat => {
                const d = trend[cat];
                const ytd = d.ytd || { quotes: 0, sales: 0 };

                let rowTotal = ytd.quotes + ytd.sales;

                const monthHtml = months.map((m, idx) => {
                    const mData = d.months[m] || { quotes: 0, sales: 0 };
                    monthTotals[idx].quotes += mData.quotes;
                    monthTotals[idx].sales += mData.sales;
                    rowTotal += mData.quotes + mData.sales;
                    const qCls = mData.quotes > 0 ? ' has-quotes' : '';
                    const sCls = mData.sales  > 0 ? ' has-sales'  : '';
                    return `<td class="month-q${qCls}">${mData.quotes || 0}</td><td class="month-s month-sep${sCls}">${mData.sales || 0}</td>`;
                }).join('');

                totalYTDQ += ytd.quotes; totalYTDS += ytd.sales;

                if (rowTotal === 0) return;

                const lastMonthData = d.months[months[months.length - 1]] || { quotes: 0, sales: 0 };
                const mtdConv = lastMonthData.quotes > 0 ? Math.round((lastMonthData.sales / lastMonthData.quotes) * 100) : 0;
                const ytdConv = ytd.quotes > 0 ? Math.round((ytd.sales / ytd.quotes) * 100) : 0;

                html += `
                    <tr>
                        <td class="cat-col">${cat}</td>
                        ${monthHtml}
                        <td>${ytd.quotes || 0}</td>
                        <td>${ytd.sales || 0}</td>
                        <td>${mtdConv}%</td>
                        <td>${ytdConv}%</td>
                    </tr>
                `;
            });

            // Grand Totals
            const lastMonthTotal = monthTotals[monthTotals.length - 1] || { quotes: 0, sales: 0 };
            const mtdTotalConv = lastMonthTotal.quotes > 0 ? Math.round((lastMonthTotal.sales / lastMonthTotal.quotes) * 100) : 0;
            const ytdTotalConv = totalYTDQ > 0 ? Math.round((totalYTDS / totalYTDQ) * 100) : 0;

            const totalMonthHtml = monthTotals.map(mt => `<td>${mt.quotes}</td><td class="month-sep">${mt.sales}</td>`).join('');

            html += `
                                        <tr class="total-row">
                                            <td class="cat-col">TOTAL</td>
                                            ${totalMonthHtml}
                                            <td>${totalYTDQ}</td>
                                            <td>${totalYTDS}</td>
                                            <td>${mtdTotalConv}%</td>
                                            <td>${ytdTotalConv}%</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div><!-- /report-table-wrap -->
                        </div><!-- /outer-rounded-wrapper -->


                            <div style="display:flex; gap:20px; align-items: flex-start; flex-wrap: wrap;">
                                <div style="flex: 2; min-width: 500px;">
                                    <!-- Sales Breakdown Table -->
                                    <div>
                                    <div class="sub-section-title" style="width: fit-content; padding: 4px 20px;">${payload.period_label} - ${oemName} Sales Breakdown</div>
                                    <table class="report-table" style="text-align: left;">
                                        <thead>
                                            <tr>
                                                <th>Customer Name</th>
                                                <th>Order Date</th>
                                                <th>OEM</th>
                                                <th>Model</th>
                                                <th>Qty</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${salesBreakdown.length > 0 ? salesBreakdown.map(s => `
                                                <tr>
                                                    <td style="text-align:left;">${s.customer || '-'}</td>
                                                    <td>${s.date || s.order_date || '-'}</td>
                                                    <td>${oemName}</td>
                                                    <td>${s.model || '-'}</td>
                                                    <td>${s.qty || 0}</td>
                                                </tr>
                                            `).join('') : `<tr><td colspan="5">No sales recorded in this period.</td></tr>`}
                                            <tr>
                                                <td colspan="4" style="text-align:right; font-weight:700;">Total</td>
                                                <td style="font-weight:700;">${salesBreakdown.reduce((acc, s) => acc + (parseFloat(s.qty) || 0), 0)}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                <!-- Comments Section -->
                                <div style="margin-top:20px; border:1px solid #000; padding:10px;">
                                    <div style="font-weight:700; border-bottom:1px solid #000; margin-bottom:5px;">Comments</div>
                                    <div style="font-size:11px; line-height:1.6;">
                                        1. Market sentiment remains cautious but stable.<br>
                                        2. Continued focus on machinery availability and lead times.<br>
                                        3. Strategic follow-ups on high-value quotations are prioritized.
                                    </div>
                                </div>
                            </div>

                            <!-- Right Column: Customer Analysis -->
                            <div style="width: 320px; min-width: 320px; display:flex; flex-direction:column; gap:20px;">
                                <div>
                                    <div class="sub-section-title" style="width: fit-content; padding: 4px 20px;">Customer Analysis</div>
                                    <table class="report-table" style="text-align: center;">
                                        <thead>
                                            <tr>
                                                <th style="text-align:left;">Customer Type</th>
                                                <th>Quantity</th>
                                                <th>%</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td style="text-align:left; font-weight:700;">Existing</td>
                                                <td>${custAnalysis.Existing.qty}</td>
                                                <td>${custAnalysis.Existing.pct}%</td>
                                            </tr>
                                            <tr>
                                                <td style="text-align:left; font-weight:700;">New</td>
                                                <td>${custAnalysis.New.qty}</td>
                                                <td>${custAnalysis.New.pct}%</td>
                                            </tr>
                                            <tr style="border-top:2px solid #000;">
                                                <td style="text-align:left; font-weight:700;">Total</td>
                                                <td style="font-weight:700;">${custAnalysis.Total}</td>
                                                <td style="font-weight:700;">100%</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                <div style="font-size:11px; font-weight:500;">
                                    <span style="text-decoration:underline; font-weight:700;">Note:</span><br>
                                    1.) New Customer Sales Contribution % = ${custAnalysis.New.pct}% for ${payload.period_label}<br>
                                    2.) Existing Customers Sales Contribution% = ${custAnalysis.Existing.pct}% for ${payload.period_label}<br>
                                    3.) ${note}
                                </div>

                                <div style="display:flex; align-items:center; margin-top:10px; border-radius:4px; overflow:hidden; border:1px solid #cbd5e1;">
                                    <div style="background:#f1f5f9; padding:8px 20px; font-weight:700; font-size:13px; color:#0f172a; flex:1;">Lost Sales</div>
                                    <div style="background:#fff; padding:8px 20px; min-width:60px; text-align:center; font-weight:700; font-size:13px; color:#0f172a; border-left:1px solid #cbd5e1;">0</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    </div>

                    <!-- TAB 2: SALES DETAILS (YTD) -->
                    <div class="oem-tab-content" data-tab-content="sales">
                        <div class="sub-section-title">ALL SALES YEAR TO DATE (${today.split(' ').pop()})</div>
                        <div style="border:1px solid #e2e8f0; border-radius:10px; overflow:hidden; height:calc(90vh - 240px); min-height:400px; overflow-y:auto;">
                            <table class="report-table" style="text-align:left;">
                                <thead style="position:sticky; top:0; z-index:1;">
                                    <tr>
                                        <th style="width: 40px; text-align:center;">#</th>
                                        <th>Customer</th>
                                        <th>Model / Unit</th>
                                        <th style="text-align:center;">Qty</th>
                                        <th style="text-align:right;">Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${salesYtd.length > 0 ? salesYtd.map((s, i) => `
                                        <tr>
                                            <td style="text-align:center; font-weight:600; color:#64748b;">${i + 1}</td>
                                            <td style="text-align:left; font-weight:700; color:#0f172a;">${s.customer || '-'}</td>
                                            <td style="text-align:left; font-weight:600; color:#475569;">${s.model || '-'}</td>
                                            <td style="text-align:center; font-weight:700; color:#166534;">${s.qty || 0}</td>
                                            <td style="text-align:right; color:#64748b;">${s.date || s.order_date || '-'}</td>
                                        </tr>
                                    `).join('') : `<tr><td colspan="5" style="text-align:center; color:#94a3b8; padding:24px;">No sales found for this OEM.</td></tr>`}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- TAB 3: QUOTATIONS DETAILS (OPEN PIPELINE) -->
                    <div class="oem-tab-content" data-tab-content="quotes">
                        <div class="sub-section-title" style="margin-bottom:0; border-bottom:none; border-radius: 8px 8px 0 0;">ALL QUOTATIONS — OPEN PIPELINE</div>
                        <div style="display: flex; gap: 16px; padding: 16px; background: #f8fafc; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">
                            ${(() => {
                                let hqCount = 0;
                                let hqSet = new Set();
                                try { hqSet = new Set(JSON.parse(localStorage.getItem('omnis_hot_quotes') || '[]')); } catch(e){}
                                
                                const modelCounts = {};
                                let maxModel = '-';
                                let maxCount = 0;

                                quotesYtd.forEach(q => {
                                    if (hqSet.has(q.name)) hqCount++;
                                    if (q.model) {
                                        modelCounts[q.model] = (modelCounts[q.model] || 0) + 1;
                                        if (modelCounts[q.model] > maxCount) {
                                            maxCount = modelCounts[q.model];
                                            maxModel = q.model;
                                        }
                                    }
                                });

                                return `
                                    <div style="flex:1; background:white; border:1px solid #e2e8f0; border-radius:8px; padding:12px 16px; box-shadow:0 1px 2px rgba(0,0,0,0.05); display:flex; flex-direction:column; justify-content:center;">
                                        <div style="color:#64748b; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px;">Total Quotes</div>
                                        <div style="font-size:24px; font-weight:800; color:#0f172a; line-height:1;">${quotesYtd.length}</div>
                                    </div>
                                    <div style="flex:1; background:white; border:1px solid #e2e8f0; border-radius:8px; padding:12px 16px; box-shadow:0 1px 2px rgba(0,0,0,0.05); display:flex; flex-direction:column; justify-content:center;">
                                        <div style="color:#64748b; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px;">Hot Leads</div>
                                        <div style="font-size:24px; font-weight:800; color:#f97316; line-height:1; display:flex; align-items:center; gap:8px;">
                                            ${hqCount} <i class="fas fa-fire" style="font-size:18px;"></i>
                                        </div>
                                    </div>
                                    <div style="flex:1; background:white; border:1px solid #e2e8f0; border-radius:8px; padding:12px 16px; box-shadow:0 1px 2px rgba(0,0,0,0.05); display:flex; flex-direction:column; justify-content:center; min-width:0;">
                                        <div style="color:#64748b; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px;">Most Quoted Item</div>
                                        <div style="font-size:14px; font-weight:700; color:#0f172a; line-height:1.2; display:flex; align-items:center; justify-content:space-between; gap:8px;">
                                            <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex:1;" title="${maxModel}">${maxModel}</span>
                                            <span style="font-size:12px; font-weight:600; color:#64748b; background:#f1f5f9; padding:2px 8px; border-radius:12px; flex-shrink:0;">${maxCount}</span>
                                        </div>
                                    </div>
                                `;
                            })()}
                        </div>
                        <div style="border:1px solid #e2e8f0; border-radius:0 0 10px 10px; border-top:none; overflow:hidden; height:calc(90vh - 350px); min-height:300px; overflow-y:auto;">
                            <table class="report-table" style="text-align:left;">
                                <thead style="position:sticky; top:0; z-index:1;">
                                    <tr>
                                        <th style="width: 40px; text-align:center;">#</th>
                                        <th style="width: 40px; text-align:center;" title="Hot Quote"><i class="fas fa-fire"></i></th>
                                        <th>Customer</th>
                                        <th>Model / Item</th>
                                        <th style="text-align:center;">Qty</th>
                                        <th style="text-align:right;">Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${(() => {
                                        let hq = [];
                                        try { hq = JSON.parse(localStorage.getItem('omnis_hot_quotes') || '[]'); } catch(e){}
                                        return quotesYtd.length > 0 ? quotesYtd.map((q, i) => {
                                            const isHot = hq.includes(q.name);
                                            return `
                                                <tr style="background: ${isHot ? '#ffedd5' : 'transparent'}; transition: background 0.3s ease;">
                                                    <td style="text-align:center; font-weight:600; color:#64748b;">${i + 1}</td>
                                                    <td style="text-align:center; cursor:pointer;" onclick="salestrack.toggleHotQuote('${q.name}', this)">
                                                        <i class="fas fa-fire" style="color: ${isHot ? '#f97316' : '#cbd5e1'}; font-size: 16px; transition: all 0.2s ease;" title="Mark as Hot"></i>
                                                    </td>
                                                    <td style="text-align:left; font-weight:700; color:#0f172a;">${q.customer || q.customer_name || '-'}</td>
                                                    <td style="text-align:left; font-weight:600; color:#475569;">${q.model || '-'}</td>
                                                    <td style="text-align:center; font-weight:700; color:#0369a1;">${q.qty || 0}</td>
                                                    <td style="text-align:right; color:#64748b;">${q.date || '-'}</td>
                                                </tr>
                                            `;
                                        }).join('') : `<tr><td colspan="6" style="text-align:center; color:#94a3b8; padding:24px;">No open quotations found for this OEM.</td></tr>`;
                                    })()}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;

            document.getElementById('dash-generic-body').innerHTML = html;

            // PERIOD FILTER LISTENER
            const periodFilter = document.getElementById('oem-period-filter');
            if (periodFilter) {
                // Set initial value
                periodFilter.value = period;
                periodFilter.onchange = (e) => {
                    const newPeriod = e.target.value;
                    omnisLog(`[Filter] Switching OEM Report to ${newPeriod}...`, "info");
                    this.openOEMBreakdownModal(oemName, newPeriod, customStart, customEnd);
                };
            }

            // Add tab switching logic
            setTimeout(() => {
                const tabButtons = document.querySelectorAll('.oem-tab');
                const tabContents = document.querySelectorAll('.oem-tab-content');

                // Ensure explicit initial state
                tabContents.forEach(content => {
                    if (content.classList.contains('active')) {
                        content.style.display = 'block';
                    } else {
                        content.style.display = 'none';
                    }
                });

                tabButtons.forEach(button => {
                    button.addEventListener('click', () => {
                        const tabName = button.getAttribute('data-tab');

                        tabButtons.forEach(btn => btn.classList.remove('active'));
                        button.classList.add('active');

                        tabContents.forEach(content => {
                            if (content.getAttribute('data-tab-content') === tabName) {
                                content.style.display = 'block';
                                content.classList.add('active');
                            } else {
                                content.style.display = 'none';
                                content.classList.remove('active');
                            }
                        });
                    });
                });
            }, 100);

        } catch (e) {
            console.error("OEM Breakdown Error:", e);
            document.getElementById('dash-generic-body').innerHTML = `
                <div style="color:#ef4444; padding:20px; text-align:center;">
                    <div style="font-weight:700; margin-bottom:10px;">Error: ${e.message}</div>
                    <div style="margin-top:20px; border-top:1px solid #fee2e2; padding-top:20px;">
                        <p style="font-size:12px; color:#64748b; margin-bottom:12px;">The server encountered an internal error. Please use the diagnostic tool below.</p>
                        <button onclick="window.salestrack.runOEMDebug()" style="padding:10px 20px; background:#0f172a; color:white; border:none; border-radius:8px; font-weight:600; cursor:pointer; box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);">[DEBUG] Show Server Traceback</button>
                    </div>
                </div>
            `;
        }
    }

    async runOEMDebug() {
        try {
            const res = await window.callFrappeSequenced(this.sys.baseUrl, "powerstar_salestrack.omnis_dashboard.debug_oem_breakdown", {});
            const log = res.message || res;

            const errHtml = log.last_errors && log.last_errors.length > 0
                ? log.last_errors.map(e => `<div style="text-align:left; margin-bottom:15px; padding:12px; background:#fff; border:1px solid #ddd; border-left:4px solid #ef4444; font-family:monospace; font-size:11px; white-space:pre-wrap; overflow-x:auto;"><b>${e.creation}</b><br>${e.message}</div>`).join('')
                : '<div style="padding:20px; color:#64748b;">No recent Error Logs found for this method.</div>';

            const schemaHtml = `
                <div style="text-align:left; font-size:11px; margin-top:10px; padding:12px; background:white; border:1px solid #e2e8f0; border-radius:6px;">
                    <b style="color:#0f172a;">Group Sales Columns:</b><br><span style="color:#475569;">${log.group_sales_columns ? log.group_sales_columns.join(', ') : 'N/A'}</span><br><br>
                    <b style="color:#0f172a;">Item Columns:</b><br><span style="color:#475569;">${log.item_columns ? log.item_columns.join(', ') : 'N/A'}</span>
                </div>
            `;

            const body = document.getElementById('dash-generic-body');
            if (body) {
                body.innerHTML = `
                    <div style="padding:24px; background:#f8fafc; border-radius:12px; max-height:600px; overflow-y:auto;">
                        <h4 style="margin-top:0; color:#0f172a; border-bottom:1px solid #e2e8f0; padding-bottom:10px;">Server Diagnostics</h4>
                        <div style="margin-bottom:20px;">
                            <h5 style="font-size:12px; color:#475569; margin-bottom:8px;">Latest Server Exceptions:</h5>
                            ${errHtml}
                        </div>
                        <div>
                            <h5 style="font-size:12px; color:#475569; margin-bottom:8px;">Database Schema:</h5>
                            ${schemaHtml}
                        </div>
                        <div style="margin-top:24px; text-align:center;">
                            <button onclick="location.reload()" style="padding:8px 16px; background:#e2e8f0; border:none; border-radius:6px; color:#475569; font-weight:600; cursor:pointer;">Close Diagnostics</button>
                        </div>
                    </div>
                `;
            }
        } catch (e) {
            alert("Debug failed: " + e.message);
        }
    }

    sendLogisticsUpdate(orderName, contactData) {
        if (!window.callFrappe) {
            console.error("callFrappe not defined");
            alert("Error: System context missing.");
            return;
        }

        // Use system baseUrl
        const sys = window.getCurrentSystem ? window.getCurrentSystem() : null;
        const baseUrl = sys ? sys.baseUrl : "https://salestrack.powerstar.co.zw";

        window.callFrappeSequenced(baseUrl, 'powerstar_salestrack.omnis_dashboard.get_order_details', { order_name: orderName })
            .then(r => {
                const updated = r.message || r;
                if (updated) { // Adjusted check based on return structure
                    this.processLogisticsUpdate(updated);
                }
            })
            .catch(e => {
                console.error("Error fetching order details:", e);
                alert("Failed to fetch order details.");
            });
    }

    processLogisticsUpdate(details) {
        // Determine Brand based on User Email (window.CURRENT_USER)
        const userEmail = (window.CURRENT_USER && window.CURRENT_USER.email) || "";
        let brand = "MXG";
        if (userEmail && userEmail.includes("@sinopower.co.zw")) {
            brand = "SPZ";
        }

        const brandName = brand === "MXG" ? "Machinery Exchange" : "Sinopower";

        // Generate Message
        const message = this.composeWhatsAppMessage(details, brand);

        // -- OPEN CUSTOM MODAL INSTEAD OF NATIVE CONFIRM --
        const modal = document.getElementById('logistics-confirm-modal');
        const preview = document.getElementById('modal-preview-content');
        const confirmBtn = document.getElementById('btn-modal-confirm');
        const title = document.getElementById('modal-title');

        if (!modal || !preview || !confirmBtn) {
            console.error("Modal elements missing");
            return;
        }

        // Populate Modal
        title.textContent = `Confirm Update (${brandName})`;
        preview.textContent = message;

        // Show Modal
        modal.classList.add('active');

        // Handle Confirm
        // Remove old listeners to prevent duplicates (cloning hack or simple assignment)
        const newBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);

        newBtn.onclick = () => {
            // Close Modal
            modal.classList.remove('active');
            this.executeSend(details, brand, message);
        };
    }

    executeSend(details, brand, message) {
        const sys = window.getCurrentSystem ? window.getCurrentSystem() : null;
        const baseUrl = sys ? sys.baseUrl : "https://salestrack.powerstar.co.zw";

        window.callFrappeSequenced(baseUrl, 'powerstar_salestrack.omnis_dashboard.send_logistics_update', { order_name: details.name, brand: brand })
            .then(r => {
                const res = r.message || r;
                if (!res.exc && res !== "Error") {
                    alert('Update logged and email sent!');
                    this.loadDashboardData();
                } else {
                    alert("Error sending update.");
                }
            })
            .catch(e => {
                console.error("Error sending update:", e);
                alert("Failed to send update.");
            });

        // Client-side WhatsApp
        const phones = details.contacts.map(c => c.phone_number).filter(p => p);
        if (phones.length > 0) {
            phones.forEach(phone => {
                const cleanPhone = phone.replace(/\D/g, '');
                if (cleanPhone.length > 8) {
                    const encodedMsg = encodeURIComponent(message);
                    const url = `https://wa.me/${cleanPhone}?text=${encodedMsg}`;
                    window.open(url, '_blank');
                }
            });
        } else {
            // alert('No phone numbers found for WhatsApp.'); // Optional
        }
    }

    composeWhatsAppMessage(doc, brand) {
        const rows = doc.machines || [];
        const contacts = doc.contacts || [];

        // Pick primary contact
        let primaryContact = contacts.find(c => c.salutation || c.name1 || c.phone_number) || contacts[0];

        // Helper to format date
        const formatDate = (d) => {
            if (!d) return '-';
            const date = new Date(d);
            return `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;
        };

        // Determine Salutation
        let contactName = (doc.customer_name || '').trim();
        let salutationText = '';

        if (primaryContact) {
            const name1 = (primaryContact.name1 || '').trim();
            const sal = (primaryContact.salutation || '').trim();
            if (name1) contactName = name1;
            if (sal) salutationText = sal;
        }

        let displayName = contactName || 'Customer';
        if (salutationText) displayName = `${salutationText} ${displayName}`.trim();

        // Sign-off
        const signOff = brand === "MXG" ? "Best Regards Machinery Exchange" : "Best Regards Sinopower";

        // Build Lines
        const lines = [
            `Dear *${displayName}*,`,
            '',
            'Please see below details of your order:',
            ''
        ];

        if (!rows.length) {
            lines.push(
                '*Machine*:', '&bull; -', '*Status*: -', '*Target Handover date*: -', '',
                'For any questions or enquiries, please contact Humphrey on +263 77 799 7136.', '',
                signOff
            );
            return lines.join('\n');
        }

        const header = rows.length > 1 ? '*Machines*:' : '*Machine*:';
        lines.push(header);

        rows.forEach((r, i) => {
            const item = r.item || 'Item';
            const qty = r.qty > 1 ? ` x${r.qty}` : '';
            const sn = r.serial_no ? ` (SN: ${r.serial_no})` : '';
            const notes = (r.notes || '-').trim();
            const target = formatDate(r.target_handover_date);

            lines.push(`${i + 1}) ${item}${qty}${sn}`);
            lines.push(`   *Status*: ${notes}`);
            lines.push(`   *Target Handover date*: ${target}`);
            lines.push('');
        });

        lines.push(
            'For any questions or enquiries, please contact Humphrey on +263 77 799 7136.',
            '',
            signOff
        );

        return lines.join('\n');
    }

    renderRiskCard() {
        const container = document.getElementById('widget-risk');
        if (!container) return;

        const risks = this.data.orders_at_risk || [];
        if (risks.length === 0) {
            container.innerHTML = `
                <div class="dash-stat-success" style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; color:#059669;">
                    <div class="icon" style="font-size:24px; margin-bottom:8px;">&#x1F3C1;</div>
                    <div class="text" style="font-weight:600;">Logistics on Schedule</div>
                </div>
            `;
            return;
        }

        const LIMIT = 4;
        const visibleRisks = risks.slice(0, LIMIT);
        const hasMore = risks.length > LIMIT;

        let html = `
            <div class="dash-risk-header" style="margin-bottom:0; display:flex; align-items:center; gap:8px;">
                 <h3 class="card-title" style="margin-bottom:0; border-bottom:none; padding-bottom:0; width:100%; justify-content:space-between;">
                    <span style="display:flex; align-items:center; gap:8px;">
                        <span style="font-size:18px;">&#x1F3C1;</span>
                        Customer Orders Tracking
                    </span>
                    <span style="font-size:10px; color:#b91c1c; background:#fef2f2; padding:2px 8px; border-radius:99px; font-weight:800; letter-spacing:0;">${risks.length} DELAYED</span>
                 </h3>
            </div>
            <div class="risk-list" style="margin-top:16px;">
        `;

        visibleRisks.forEach(r => html += this._generateRiskCardHtml(r));

        html += `</div>`;

        if (hasMore) {
            html += `
                <button onclick="salestrack.openFullRiskModal()" style="
                    margin-top:16px;
                    width:100%;
                    padding:10px;
                    background:#fefffec; 
                    color:#b91c1c;
                    border:1px solid #fee2e2;
                    border-radius:8px;
                    font-size:12px;
                    font-weight:700;
                    cursor:pointer;
                    transition:all 0.2s;
                    display:flex; justify-content:center; align-items:center; gap:8px;
                " onmouseover="this.style.background='#fef2f2'" onmouseout="this.style.background='#fefced'">
                    View All Issues 
                    <span style="background:#ef4444; color:white; padding:1px 6px; border-radius:99px; font-size:10px; line-height:1.4;">${risks.length}</span>
                </button>
            `;
        }

        container.innerHTML = html;

        // UPDATE SIDEBAR BADGE
        const badge = document.getElementById('nav-badge-orders');
        if (badge) {
            if (risks.length > 0) {
                badge.style.display = 'inline-block';
                badge.textContent = risks.length;
            } else {
                badge.style.display = 'none';
            }
        }
    }


    renderDeliveryCalendar() {
        const cal = document.getElementById('dash-cal-body');
        if (!cal) return;

        const orders = (this.data && this.data.active_orders) ? this.data.active_orders : [];

        if (orders.length === 0) {
            cal.innerHTML = `<div style="text-align:center;padding:20px 0;color:#94a3b8;font-size:12px;font-style:italic;">
                <i class="fas fa-calendar-check" style="font-size:20px;opacity:0.3;display:block;margin-bottom:6px;"></i>
                No upcoming deliveries
            </div>`;
            return;
        }

        const today = new Date();
        const upcoming = orders
            .filter(o => o.delivery_date)
            .map(o => {
                const d = new Date(o.delivery_date);
                const diff = Math.ceil((d - today) / (1000 * 60 * 60 * 24));
                return { ...o, _daysLeft: diff, _date: d };
            })
            .filter(o => o._daysLeft >= 0)
            .sort((a, b) => a._daysLeft - b._daysLeft)
            .slice(0, 5);

        if (upcoming.length === 0) {
            cal.innerHTML = `<div style="text-align:center;padding:20px 0;color:#94a3b8;font-size:12px;font-style:italic;">No upcoming deliveries this period</div>`;
            return;
        }

        cal.innerHTML = upcoming.map(o => {
            const urgency = o._daysLeft <= 3 ? '#ef4444' : o._daysLeft <= 7 ? '#f59e0b' : '#10b981';
            const label = o._daysLeft === 0 ? 'TODAY' : o._daysLeft === 1 ? 'TOMORROW' : `${o._daysLeft}d`;
            return `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #f1f5f9;">
                <div style="min-width:40px;height:40px;border-radius:8px;background:${urgency}15;border:1px solid ${urgency}40;display:flex;flex-direction:column;align-items:center;justify-content:center;">
                    <span style="font-size:9px;font-weight:900;color:${urgency};line-height:1;">${label}</span>
                </div>
                <div style="flex:1;min-width:0;">
                    <div style="font-size:12px;font-weight:700;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${o.customer_name || o.customer || 'Customer'}</div>
                    <div style="font-size:10px;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${o.item_description || o.item_id || 'Order'} · ${o.delivery_date}</div>
                </div>
            </div>`;
        }).join('');
    }

    openFullRiskModal() {
        const risks = this.data.orders_at_risk || [];
        let html = '<div class="risk-list">';
        risks.forEach(r => html += this._generateRiskCardHtml(r));
        html += '</div>';

        this.openListModal("&#x2705; CRITICAL DELAYS (" + risks.length + ")", html);

        // Apply Critical Styling
        const modal = document.getElementById('dash-generic-modal');
        const header = modal.querySelector('div[style*="border-bottom"]');
        const title = document.getElementById('dash-generic-title');

        if (header) {
            header.style.background = '#fef2f2';
            header.style.borderBottom = '1px solid #fee2e2';
            header.style.borderRadius = '16px 16px 0 0';
        }
        if (title) {
            title.style.color = '#b91c1c';
        }
    }

    _generateRiskCardHtml(r) {
        // Combine Order Comment + Machine Notes
        let combinedInsight = [];
        if (r.comment && r.comment.trim() !== "") combinedInsight.push("<b>Order:</b> " + r.comment);
        if (r.machine_notes && r.machine_notes.trim() !== "") combinedInsight.push("<b>Machine:</b> " + r.machine_notes);

        // Fallback
        const insight = combinedInsight.length > 0 ? combinedInsight.join("<br>") : "No remarks available.";

        // Daily Update Check (12 Hours)
        let showUpdateFlag = false;
        let lastUpdateText = "No Update";

        if (r.last_notification_date) {
            const lastDate = new Date(r.last_notification_date);
            const now = new Date();
            const diffTime = Math.abs(now - lastDate);
            const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
            lastUpdateText = `${diffHours}h ago`;
            if (diffHours > 12) showUpdateFlag = true;
        } else {
            // IF NO notification date, we assume it needs an initial update
            showUpdateFlag = true;
        }

        // Flashing Animation Style
        const flashStyle = showUpdateFlag ? `animation: pulse-red 1.5s infinite;` : '';

        return `
            <div class="tracking-item" style="padding:10px; border:1px solid #f1f5f9; border-radius:10px; margin-bottom:8px; background:#f8fafc; position:relative;">
                <div class="t-main" style="display:flex; align-items:flex-start; gap:10px; margin-bottom:8px;">
                    
                    <!-- Warning Icon -->
                        <div class="t-icon" style="min-width:28px; height:28px; background:#fef2f2; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:14px; border:1px solid #fee2e2; color:#ef4444;">&#x2705;</div>
                    
                    <div class="t-info" style="flex:1;">
                            <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
                            <div class="t-customer" style="font-size:12px; font-weight:700; color:#0f172a;">${r.customer_name}</div>
                            <div class="t-days" style="font-size:10px; font-weight:700; color:#dc2626;">+${r.days_overdue}d</div>
                            </div>
                            <div class="t-id" style="font-size:10px; color:#64748b; font-weight:600; margin-bottom:6px;">${r.name} &bull; ${r.machine || 'Unknown Machine'}</div>
                            
                            <!-- Actions Row (Flex) -->
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; flex-wrap:nowrap;">
                                <!-- Left: Update Flag -->
                                <div style="flex-shrink:0; margin-right:10px;">
                                ${showUpdateFlag ?
                `<div style="font-size:10px; color:#b91c1c; background:#fee2e2; padding:2px 8px; border-radius:4px; font-weight:700; border:1px solid #fecaca; white-space:nowrap; ${flashStyle}">&#x2705; Update Required (${lastUpdateText})</div>`
                :
                `<div style="font-size:10px; color:#059669; background:#d1fae5; padding:2px 6px; border-radius:4px; font-weight:600; white-space:nowrap;">&#x2713;&#xFE0F; Updated ${lastUpdateText}</div>`
            }
                                </div>

                                <!-- Right: Buttons -->
                                <div style="display:flex; gap:6px; flex-shrink:0; align-items:center;">
                                    ${r.status === 'Handed Over' ?
                `<div style="display:flex; align-items:center; gap:4px; font-size:10px; font-weight:700; color:#059669; background:#ecfdf5; padding:4px 8px; border-radius:6px; border:1px solid #a7f3d0;">
                                        <span>...</span> <span>Handed Over</span>
                                        </div>`
                :
                `<button onclick="salestrack.openHandoverModal('${r.name}')" style="background:#64748b; color:white; border:none; padding:4px 8px; border-radius:6px; font-size:10px; font-weight:600; cursor:pointer; white-space:nowrap; display:flex; align-items:center; gap:4px;">
                                        <span style="font-size:12px;">&larr;</span> <span>Handover</span>
                                        </button>`
            }
                                </div>
                            </div>

                            <!-- AI Insight Section -->
                            <div class="ai-insight" style="background:#fff; border:1px solid #e2e8f0; border-radius:6px; padding:6px 8px; display:flex; gap:6px; clear:both; margin-top:6px;">
                            <div style="font-size:12px;">&#x1F451;</div>
                            <div style="font-size:10px; color:#475569; line-height:1.4;">
                                <span style="font-weight:700; color:#64748b;">AI Insight:</span> ${insight}
                            </div>
                            </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderFollowUps() {
        const container = document.getElementById('widget-followups');
        if (!container) return;

        const list = this.data.quote_follow_ups || [];
        if (list.length === 0) {
            container.innerHTML = `<div class="empty-state" style="color:#9ca3af; font-size:12px; text-align:center; padding:20px;">No pending follow-ups</div>`;
            return;
        }

        const LIMIT = 4;
        const visibleList = list.slice(0, LIMIT);
        const hasMore = list.length > LIMIT;

        let html = `<h3 class="card-title">Quote Follow-ups <span style="font-size:12px; margin-left:auto; opacity:0.5;">&#x23F1;&#xFE0F;</span></h3><div class="followup-list" style="display:flex; flex-direction:column; gap:8px;">`;

        visibleList.forEach(item => html += this._generateFollowUpRow(item));

        html += `</div>`;

        if (hasMore) {
            html += `
                <button onclick="salestrack.openFullFollowUpsModal()" style="
                    margin-top:16px;
                    width:100%;
                    padding:10px;
                    background:#f8fafc;
                    color:#475569;
                    border:1px solid #e2e8f0;
                    border-radius:8px;
                    font-size:12px;
                    font-weight:600;
                    cursor:pointer;
                    transition:all 0.2s;
                " onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='#f8fafc'">
                    View All (${list.length})
                </button>
            `;
        }

        container.innerHTML = html;
    }

    _generateFollowUpRow(item) {
        return `
            <div class="followup-item" style="display:flex; justify-content:space-between; align-items:center; padding:8px 10px; background:#f9fafb; border-radius:8px;">
                <div class="f-name" style="font-size:12px; font-weight:500; color:#374151;">${item.sales_person}</div>
                <div class="f-count" style="background:#e0e7ff; color:#4338ca; font-size:11px; font-weight:700; padding:2px 8px; border-radius:10px;">${item.count}</div>
            </div>
        `;
    }

    openFullFollowUpsModal() {
        const list = this.data.quote_follow_ups || [];
        let html = `<div style="display:flex; flex-direction:column; gap:8px;">`;
        list.forEach(item => html += this._generateFollowUpRow(item));
        html += `</div>`;
        this.openListModal("Quote Follow-ups (" + list.length + ")", html);
    }

    renderHeaderStats() {
        const container = document.getElementById('dash-header-stats');
        if (!container) return;

        let html = '';

        // 1. Most Sold Item
        const topItems = this.data.top_items || [];
        if (topItems.length > 0) {
            const top = topItems[0];
            html += `
                <div class="stat-pill" style="display: flex; align-items: center; gap: 12px; background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border); padding: 6px 16px; border-radius: 4px; height: 100%;">
                    <div class="stat-pill-icon" style="font-size: 18px; filter: drop-shadow(0 0 4px rgba(255, 215, 0, 0.4));">&#x1F3C6;</div>
                    <div class="stat-pill-info">
                        <div class="stat-pill-label" style="font-size: 9px; font-weight: 900; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px;">Most Sold Model</div>
                        <div style="display:flex; align-items:baseline;">
                            <div class="stat-pill-value" style="font-size:14px; font-weight: 850; color: #fff;">${top.item_name}</div>
                            <div class="stat-pill-sub" style="font-size:10px; font-weight:700; color: var(--accent-maroon); margin-left:8px; opacity: 0.8;">${top.total_qty} units</div>
                        </div>
                    </div>
                </div>
            `;
        }

        // 2. Top Customer
        const customers = this.data.hot_customers || [];
        if (customers.length > 0) {
            customers.sort((a, b) => b.total_value - a.total_value);
            const topC = customers[0];
            html += `
                <div class="stat-pill" style="display: flex; align-items: center; gap: 12px; background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border); padding: 6px 16px; border-radius: 4px; height: 100%;">
                    <div class="stat-pill-icon" style="font-size: 18px; filter: drop-shadow(0 0 4px rgba(0, 191, 255, 0.4));">&#x1F4BD;</div>
                    <div class="stat-pill-info">
                        <div class="stat-pill-label" style="font-size: 9px; font-weight: 900; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px;">Top Customer</div>
                        <div style="display:flex; align-items:baseline;">
                           <div class="stat-pill-value" style="font-size:12px; font-weight: 850; color: #fff; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${topC.customer_name}</div>
                           <div class="stat-pill-sub" style="font-size:10px; font-weight:700; color: var(--accent-maroon); margin-left:8px; opacity: 0.8;">${topC.total_value} units</div>
                        </div>
                    </div>
                </div>
            `;
        }

        container.innerHTML = html;
    }

    renderMTDTargets() {
        const companySales = this.data?.company_sales || {};
        const companies    = Object.keys(companySales);

        // Month / year label (if it exists)
        const labelEl = document.getElementById('mtd-month-label');
        if (labelEl) {
            const now       = new Date();
            const monthName = now.toLocaleString('default', { month: 'long' });
            const year      = now.getFullYear();
            const day       = now.getDate();
            labelEl.textContent = `${monthName} ${year} — Day ${day} of month`;
        }

        // Overall MTD badge (combined) (if it exists)
        const badgeEl = document.getElementById('mtd-overall-badge');
        if (badgeEl && companies.length > 0) {
            const totalMTD    = companies.reduce((s, c) => s + (companySales[c].mtd         || 0), 0);
            const totalMTDTgt = companies.reduce((s, c) => s + (companySales[c].mtd_target  || 0), 0);
            const overallPct  = totalMTDTgt > 0 ? Math.round((totalMTD / totalMTDTgt) * 100) : 0;
            const isAhead = overallPct >= 100;
            const isMid   = overallPct >= 60;
            badgeEl.textContent      = `MTD ${overallPct}% — ${Math.round(totalMTD)} / ${totalMTDTgt} units`;
            badgeEl.style.background = isAhead ? '#16a34a' : (isMid ? '#f59e0b' : '#dc2626');
            badgeEl.style.color      = '#fff';
        }

        // Resolve targets helper
        const resolveTargets = (cName) => {
            if (companySales[cName].mtd_target && companySales[cName].ytd_target) {
                return { mtd: companySales[cName].mtd_target, ytd: companySales[cName].ytd_target };
            }
            const up = cName.toUpperCase();
            if (up.includes('SINO') || up.includes('SINOPOWER'))     return { mtd: 16, ytd: 192 };
            if (up.includes('MACH') || up.includes('EXCHANGE'))       return { mtd: 18, ytd: 216 };
            return { mtd: 10, ytd: 120 }; // default
        };

        // Populate per-company header cards using fixed IDs in index.html
        const setCard = (pfx, actual, target, col) => {
            const pct = target > 0 ? Math.min(Math.round((actual / target) * 100), 999) : 0;
            const isG = pct >= 100, isY = pct >= 60;
            const color = isG ? '#16a34a' : (isY ? col : '#dc2626');
            const barW  = target > 0 ? Math.min((actual / target) * 100, 100).toFixed(1) : 0;
            const el = (id) => document.getElementById(id);
            if (el(`${pfx}`))      el(`${pfx}`).textContent      = Math.round(actual);
            if (el(`${pfx}-tgt`))  el(`${pfx}-tgt`).textContent  = `/ ${target}`;
            if (el(`${pfx}-pct`))  { el(`${pfx}-pct`).textContent = `${pct}%`; el(`${pfx}-pct`).style.color = color; }
            if (el(`${pfx}-bar`))  el(`${pfx}-bar`).style.width   = `${barW}%`;
            if (el(`${pfx}-note`)) el(`${pfx}-note`).textContent  = actual >= target ? '✓ Target hit!' : `Need ${target - Math.round(actual)} more`;
        };
        
        companies.forEach(compName => {
            const c    = companySales[compName];
            const tgts = resolveTargets(compName);
            const up   = compName.toUpperCase();
            if (up.includes('SINO') || up.includes('SINOPOWER')) {
                setCard('dash-sino-mtd', c.mtd || 0, tgts.mtd, '#8b2219');
                setCard('dash-sino-ytd', c.ytd || 0, tgts.ytd, '#8b2219');
            } else if (up.includes('MACH') || up.includes('EXCHANGE')) {
                setCard('dash-mxg-mtd', c.mtd || 0, tgts.mtd, '#1e3a5f');
                setCard('dash-mxg-ytd', c.ytd || 0, tgts.ytd, '#1e3a5f');
            }
        });
    }

    renderCompanyChart() {
        const container = document.getElementById('widget-company-chart');
        if (!container) return;

        const data = this.data.company_sales || {};
        const originalCompanies = Object.keys(data);
        const displayLabels = originalCompanies.map(c => c.includes(' ') ? c.split(' ') : c);

        if (originalCompanies.length === 0) {
            container.innerHTML = `<div class="empty-state" style="display:flex;align-items:center;justify-content:center;height:300px;color:#cbd5e1;">No sales data available for chart</div>`;
            return;
        }

        console.log("Strategic Chart Discovery:", {
            quotes_raw: this.data.__diag_raw_quote_count,
            pipeline_map: this.data.__diag_pipeline_map,
            company_sales: data
        });

        container.innerHTML = `<div id="company-chart-canvas" style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.05));"></div>`;

        const currentMonthIdx = 4; // Today is April 2026
        const targets = { "Machinery Exchange": 216, "Sinopower": 192 };

        const ytdData = originalCompanies.map(c => data[c].ytd);
        const mtdData = originalCompanies.map(c => data[c].mtd);
        const quotesData = originalCompanies.map(c => data[c].quotes || 0);
        const projectedData = originalCompanies.map(c => {
            const ytd = data[c].ytd || 0;
            return Math.round((ytd / currentMonthIdx) * 12);
        });

        // // Compute Targets & Status for Annotations
        const annotations = originalCompanies.map((company, idx) => {
            const target = targets[company] || 0;
            if (target === 0) return null;
            return {
                x: target,
                borderColor: '#ef4444',
                strokeDashArray: 4,
                label: {
                    text: `${target} UNITS (TARGET)`,
                    style: { color: '#fff', background: '#ef4444', fontSize: '9px', fontWeight: 600, fontFamily: 'Inter, sans-serif', padding: { left: 6, right: 6, top: 4, bottom: 4 } }
                }
            };
        }).filter(a => a);

        // &#x1F4C8; Simplified Unit-Focused Labels
        const enhancedLabels = originalCompanies.map(company => {
            const ytd = data[company].ytd || 0;
            const target = targets[company] || 0;
            const pct = target > 0 ? Math.round((ytd / target) * 100) : 0;
            return [company.toUpperCase(), `${pct}% TARGET`];
        });

        const options = {
            series: [{
                name: 'Units Sold (YTD)',
                data: ytdData
            }, {
                name: 'Sold This Month',
                data: mtdData
            }, {
                name: 'Potential (Open Quotes)',
                data: quotesData
            }, {
                name: 'Estimated Full Year',
                data: projectedData
            }],
            chart: {
                type: 'bar',
                height: 750,
                toolbar: { show: false },
                fontFamily: 'Inter, system-ui, sans-serif',
            },
            plotOptions: {
                bar: {
                    horizontal: true,
                    barHeight: '80%',
                    borderRadius: 2,
                    borderRadiusApplication: 'end',
                    dataLabels: { position: 'top' },
                    colors: {
                        backgroundBarColors: ['#cbd5e1'],
                        backgroundBarOpacity: 0.4,
                        backgroundBarRadius: 2,
                    }
                },
            },
            fill: {
                type: 'solid',
                opacity: 0.95
            },
            annotations: {
                xaxis: annotations
            },
            dataLabels: {
                enabled: true,
                textAnchor: 'start',
                style: {
                    fontSize: '11px',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    fontWeight: '600',
                    colors: ["#1e293b"]
                },
                formatter: function (val, opt) {
                    if (opt.seriesIndex === 2 && val > 0) { // Potential (Quotes)
                        return val + " [Pipeline]";
                    }
                    if (opt.seriesIndex === 3) {
                        const company = originalCompanies[opt.dataPointIndex];
                        const target = targets[company];
                        const gap = target - val;
                        const gapMsg = gap > 0 ? ` [${gap} Units Remaining]` : ' [GOAL REACHED]';
                        return val + " (Est. Total)" + gapMsg;
                    }
                    return val > 0 ? val : '';
                },
                offsetX: 10
            },
            xaxis: {
                categories: enhancedLabels,
                labels: { style: { fontSize: '11px', fontWeight: 600, fontFamily: 'Inter, system-ui, sans-serif' } },
                axisBorder: { show: false },
                axisTicks: { show: false }
            },
            yaxis: {
                labels: {
                    rotate: -90,
                    style: {
                        fontSize: '13px',
                        fontWeight: 600,
                        fontFamily: 'Inter, system-ui, sans-serif',
                        colors: ['#475569']
                    },
                    maxWidth: 150,
                    offsetX: -5,
                    align: 'center'
                }
            },
            grid: {
                borderColor: '#cbd5e1',
                strokeDashArray: 0,
                padding: {
                    left: 0
                },
                row: {
                    colors: ['#f1f5f9', 'transparent'],
                    opacity: 0.9
                },
                xaxis: { lines: { show: true } },
                yaxis: { lines: { show: false } }
            },
            colors: ['#0f172a', '#dc2626', '#059669', '#cbd5e1'],
            legend: {
                position: 'top',
                horizontalAlign: 'right',
                fontSize: '12px',
                fontWeight: 600,
                fontFamily: 'Plus Jakarta Sans, sans-serif'
            },
            tooltip: {
                theme: 'light',
                y: {
                    formatter: function (val, opt) {
                        const company = originalCompanies[opt.dataPointIndex];
                        const target = targets[company];
                        if (opt.seriesIndex === 3 && target) {
                            const gap = target - val;
                            const msg = gap > 0 ? `(${gap} units remaining)` : `(Goal reached!)`;
                            return val + " Units " + msg;
                        }
                        return val + ' Units';
                    }
                }
            }
        };

        const chart = new ApexCharts(document.querySelector("#company-chart-canvas"), options);
        chart.render();

        // Render Quote Follow-Up Dashboard in the new dedicated section
        const breakdownContainer = document.getElementById('widget-predictive-breakdown');
        if (!breakdownContainer) return;

        const quoteFollowUps = this.data.quote_follow_ups || [];
        const groupedQuotes = {};

        quoteFollowUps.forEach(q => {
            const sp = q.sales_person || 'Unassigned';
            if (!groupedQuotes[sp]) groupedQuotes[sp] = [];
            groupedQuotes[sp].push(q);
        });

        let breakdownHtml = `<div style="font-size:12px; font-weight:700; color:#334155; margin-bottom:12px; display:flex; align-items:center; justify-content:space-between;">
            <span style="letter-spacing:0.02em; text-transform:uppercase;">&#x1F4C8; Quotation Follow-Up Dashboard</span>
            <span style="font-size:10px; color:#64748b;">*Active quotations grouped by salesperson</span>
        </div><div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(48%, 1fr)); gap:20px; align-items:start;">`;

        for (const [sp, quotes] of Object.entries(groupedQuotes)) {
            breakdownHtml += `
                <div style="padding:16px; border:1px solid #f1f5f9; border-radius:12px; background:white; box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">
                    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;">
                        <span style="font-size:14px; font-weight:850; color:#1e293b; text-transform:uppercase; letter-spacing:0.02em;">
                            &#x1F464; ${sp}
                        </span>
                        <span style="padding:4px 10px; border-radius:99px; font-size:10px; font-weight:800; color:#475569; background:#f1f5f9;">
                            ${quotes.length} OPEN
                        </span>
                    </div>
                    <div style="max-height: 260px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 6px;">
                        <table style="width:100%; border-collapse:separate; border-spacing:0; font-size:11px;">
                            <thead style="position: sticky; top: 0; background: #f8fafc; z-index: 1;">
                                <tr style="border-bottom:1px solid #e2e8f0; text-align:left;">
                                    <th style="padding:8px 10px; font-weight:800; color:#64748b; width:15%;">REF</th>
                                    <th style="padding:8px 10px; font-weight:800; color:#64748b; width:30%;">CUSTOMER</th>
                                    <th style="padding:8px 10px; font-weight:800; color:#64748b; width:35%;">ITEMS</th>
                                    <th style="padding:8px 10px; font-weight:800; color:#64748b; width:20%; text-align:right;">DUE</th>
                                </tr>
                            </thead>
                            <tbody>
            `;

            quotes.forEach(q => {
                let dateColor = '#334155';
                let dateText = q.next_follow_up_date || '-';

                if (q.next_follow_up_date) {
                    const todayStr = new Date().toISOString().split('T')[0];
                    if (q.next_follow_up_date < todayStr) {
                        dateColor = '#ef4444'; // Red
                        dateText += ' <span style="font-size:9px; font-weight:800;">(OVERDUE)</span>';
                    } else if (q.next_follow_up_date === todayStr) {
                        dateColor = '#f59e0b'; // Orange
                        dateText += ' <span style="font-size:9px; font-weight:800;">(TODAY)</span>';
                    }
                }

                breakdownHtml += `
                                <tr style="border-bottom:1px dashed #e2e8f0; transition: background-color 0.2s;">
                                    <td style="padding:8px 10px; font-weight:700; color:#3b82f6;">${q.quote_no || '-'}</td>
                                    <td style="padding:8px 10px; color:#1e293b; font-weight:600;">${q.customer || '-'}</td>
                                    <td style="padding:8px 10px; color:#475569;">${q.items || '-'}</td>
                                    <td style="padding:8px 10px; color:${dateColor}; font-weight:700; text-align:right;">${dateText}</td>
                                </tr>
                `;
            });

            breakdownHtml += `
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }

        if (Object.keys(groupedQuotes).length === 0) {
            breakdownHtml += `<div style="padding:20px; text-align:center; color:#64748b; font-weight:600; background:white; border-radius:12px; border:1px solid #f1f5f9;">No open quotations to follow up.</div>`;
        }

        breakdownHtml += `</div>`;
        breakdownContainer.innerHTML = breakdownHtml;
    }



    openFullBreakdownModal(company) {
        if (!this.data || !this.data.company_sales || !this.data.company_sales[company]) return;

        const items = this.data.company_sales[company].breakdown || [];

        let html = `<div style="display:flex; flex-direction:column; gap:0;">`;

        items.forEach((item, index) => {
            const bg = index % 2 === 0 ? '#f8fafc' : '#ffffff';
            html += `
                <div style="display:flex; justify-content:space-between; padding:10px 12px; border-bottom:1px solid #f1f5f9; background:${bg};">
                    <span style="font-size:13px; font-weight:500; color:#334155;">${item.model}</span>
                    <span style="font-size:13px; font-weight:700; color:#0f172a;">${item.qty}</span>
                </div>
             `;
        });

        html += `</div>`;

        this.openListModal(`Sales Breakdown: ${company}`, html);
    }

    /* ---------- HANDOVER LOGIC ---------- */
    openHandoverModal(orderName) {
        this.currentHandoverOrder = orderName;
        const modal = document.getElementById('handover-modal');
        if (modal) {
            modal.classList.remove('hidden');
            // Reset fields
            const dateInput = document.getElementById('handover-date');
            if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

            const spInput = document.getElementById('handover-salesperson');
            if (spInput) spInput.value = '';

            // Close Handler
            const closeBtn = document.getElementById('handover-modal-close');
            if (closeBtn) closeBtn.onclick = () => modal.classList.add('hidden');

            // Submit Handler
            const submitBtn = document.getElementById('btn-handover-submit');
            if (submitBtn) submitBtn.onclick = () => this.submitHandover();

            // Setup Search (Idempotent-ish via oninput replacement)
            this.setupSalespersonSearch();
        }
    }

    setupSalespersonSearch() {
        const input = document.getElementById('handover-salesperson');
        const list = document.getElementById('handover-salesperson-suggest');
        if (!input || !list) return;

        // Apply styles to list if not present
        list.style.position = 'absolute';
        list.style.background = 'white';
        list.style.border = '1px solid #e2e8f0';
        list.style.width = '100%';
        list.style.zIndex = '100';
        list.style.borderRadius = '8px';
        list.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
        list.style.marginTop = '4px';
        list.style.maxHeight = '200px';
        list.style.overflowY = 'auto';

        // Debounce helper
        const debounce = (func, wait) => {
            let timeout;
            return (...args) => {
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(this, args), wait);
            };
        };

        const fetchSuggestions = async (val) => {
            // Allow empty string to fetch all (default 20)
            const query = val || "";

            try {
                // Ensure sys context
                let baseUrl = "https://salestrack.powerstar.co.zw";
                if (this.sys) baseUrl = this.sys.baseUrl;
                else if (window.getCurrentSystem) baseUrl = window.getCurrentSystem().baseUrl;

                const res = await window.callFrappeSequenced(baseUrl, "powerstar_salestrack.omnis_dashboard.search_sales_person_for_omnis", { txt: query });
                const data = res.message || res || [];

                if (data.length > 0) {
                    list.innerHTML = data.map(item => `
                        <div class="suggest-item" data-val="${item.description}" 
                             style="padding:10px 12px; cursor:pointer; border-bottom:1px solid #f8fafc; font-size:13px; color:#334155; transition:background 0.1s;"
                             onmouseover="this.style.background='#f1f5f9'"
                             onmouseout="this.style.background='white'"
                        >
                            <div style="font-weight:600;">${item.description}</div>
                            ${item.details ? `<div style="font-size:11px; color:#94a3b8;">${item.details}</div>` : ''}
                        </div>
                    `).join('');
                    list.classList.remove('hidden');

                    // Add click handlers
                    list.querySelectorAll('.suggest-item').forEach(el => {
                        el.onclick = (e) => {
                            e.stopPropagation(); // Prevent bubbling
                            input.value = el.getAttribute('data-val');
                            list.classList.add('hidden');
                        };
                    });
                } else {
                    list.innerHTML = '<div style="padding:10px; color:#94a3b8; font-size:12px; text-align:center;">No match found</div>';
                    list.classList.remove('hidden');
                }

            } catch (e) {
                console.error("Search error", e);
            }
        };

        input.oninput = debounce((e) => fetchSuggestions(e.target.value), 300);

        // Hide on focus out (delay to allow click of item)
        input.onblur = () => {
            setTimeout(() => list.classList.add('hidden'), 200);
        };
        input.onfocus = () => {
            fetchSuggestions(input.value);
        };
    }

    setupItemSearch() {
        if (this._itemSearchBound) return;
        this._itemSearchBound = true;

        let list = document.getElementById('dash-item-suggest');
        if (!list) {
            list = document.createElement('div');
            list.id = 'dash-item-suggest';
            list.className = 'hidden';
            list.style.cssText = `
                position: absolute; background: white; border: 1px solid #e2e8f0; 
                z-index: 100000; border-radius: 8px; 
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); 
                max-height: 200px; overflow-y: auto;
            `;
            document.body.appendChild(list);
        }

        const debounce = (func, wait) => {
            let timeout;
            return (...args) => {
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(this, args), wait);
            };
        };

        const fetchSuggestions = async (input, query) => {
            if (!query || query.length < 2) {
                list.classList.add('hidden');
                return;
            }
            try {
                let baseUrl = "https://salestrack.powerstar.co.zw";
                if (this.sys) baseUrl = this.sys.baseUrl;
                else if (window.getCurrentSystem) baseUrl = window.getCurrentSystem().baseUrl;

                const res = await window.callFrappeSequenced(baseUrl, "powerstar_salestrack.omnis_dashboard.search_item_for_omnis", { txt: query });
                const data = res.message || res || [];

                if (data.length > 0) {
                    list.innerHTML = data.map(item => `
                        <div class="suggest-item" data-val="${(item.description || item.value || '').replace(/\"/g, '&quot;')}" 
                             style="padding:10px 12px; cursor:pointer; border-bottom:1px solid #f8fafc; font-size:13px; color:#334155; transition:background 0.1s;"
                             onmouseover="this.style.background='#f1f5f9'"
                             onmouseout="this.style.background='white'"
                        >
                            <div style="font-weight:600;">${item.description || item.value}</div>
                            ${item.details ? `<div style="font-size:11px; color:#94a3b8;">${item.details}</div>` : ''}
                        </div>
                    `).join('');

                    const rect = input.getBoundingClientRect();
                    list.style.top = `${rect.bottom + window.scrollY + 2}px`;
                    list.style.left = `${rect.left + window.scrollX}px`;
                    list.style.width = `${rect.width}px`;
                    list.classList.remove('hidden');

                    list.querySelectorAll('.suggest-item').forEach(el => {
                        el.onclick = (e) => {
                            e.stopPropagation();
                            input.value = el.getAttribute('data-val');
                            list.classList.add('hidden');
                        };
                    });
                } else {
                    list.innerHTML = '<div style="padding:10px; color:#94a3b8; font-size:12px; text-align:center;">No items found</div>';
                    list.classList.remove('hidden');
                }
            } catch (e) {
                console.error("Item Search Error", e);
            }
        };

        const handler = debounce((e) => fetchSuggestions(e.target, e.target.value), 300);

        document.addEventListener('input', (e) => {
            if (e.target.classList && (e.target.classList.contains('m-item') || e.target.classList.contains('new-item'))) {
                handler(e);
            }
        });

        document.addEventListener('focusin', (e) => {
            if (e.target.classList && (e.target.classList.contains('m-item') || e.target.classList.contains('new-item'))) {
                if (e.target.value.length >= 2) {
                    fetchSuggestions(e.target, e.target.value);
                }
            }
        });

        document.addEventListener('focusout', (e) => {
            if (e.target.classList && (e.target.classList.contains('m-item') || e.target.classList.contains('new-item'))) {
                setTimeout(() => list.classList.add('hidden'), 200);
            }
        });
    }

    async submitHandover() {
        if (!this.currentHandoverOrder) return;

        const date = document.getElementById('handover-date').value;
        const salesperson = document.getElementById('handover-salesperson').value;

        if (!date || !salesperson) {
            alert("Please fill in all fields (Date and Salesperson).");
            return;
        }

        const btn = document.getElementById('btn-handover-submit');
        if (btn) { btn.disabled = true; btn.textContent = "Processing..."; }

        try {
            // Call Backend
            // Ensure sys context
            if (!this.sys) {
                this.sys = { name: "Salestrack", baseUrl: "https://salestrack.powerstar.co.zw", key: "salestrack" };
            }

            const res = await window.callFrappeSequenced(this.sys.baseUrl, "powerstar_salestrack.omnis_dashboard.mark_order_handed_over", {
                order_name: this.currentHandoverOrder,
                handover_date: date,
                salesperson: salesperson,
                user_email: "WebUser" // Placeholder or fetch from context
            });

            const payload = res.message || res;
            if (payload.status === "success" || (payload.message && payload.message.toString().toLowerCase().includes("success")) || payload.message.includes("Handed Over")) {
                alert("Success: " + (payload.message || "Order Handed Over"));
                document.getElementById('handover-modal').classList.add('hidden');

                // ── AUTO-CREATE AFTERSALES RECORD ──
                try {
                    if (typeof window.createAftersalesFromHandover === 'function') {
                        await window.createAftersalesFromHandover({
                            order_name: this.currentHandoverOrder,
                            handover_date: date,
                            salesperson: salesperson
                        });
                        console.log('[Handover] Aftersales record created for:', this.currentHandoverOrder);
                    }
                } catch (asErr) {
                    console.error('[Handover] Failed to create aftersales record:', asErr);
                }

                // Refresh Data
                await this.init();
            } else {
                alert("Error: " + (payload.message || "Unknown error"));
            }

        } catch (e) {
            console.error("Handover Error:", e);
            alert("Failed to process handover: " + e.message);
        } finally {
            if (btn) { btn.disabled = false; btn.textContent = "... Confirm Handover"; }
        }
    }

    injectModals() {
        if (document.getElementById('dash-generic-modal')) return;

        const html = `
            <div id="dash-generic-modal" style="
                display:none; position:fixed; top:0; left:0; width:100%; height:100%;
                background:rgba(0,0,0,0.5); z-index:999999; align-items:center; justify-content:center;
                backdrop-filter: blur(5px);
            ">
                <div id="dash-modal-inner" style="
                    background:white; width:95%; max-width:1100px; max-height:90vh;
                    border-radius:16px; display:flex; flex-direction:column;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                    animation: dashModalIn 0.2s ease-out;
                ">
                    <div style="
                        padding:20px; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center;
                    ">
                        <h3 id="dash-generic-title" style="font-size:18px; font-weight:700; color:#0f172a; margin:0;">Title</h3>
                        <button onclick="salestrack.closeListModal()" style="border:none; background:none; font-size:24px; color:#64748b; cursor:pointer;">&times;</button>
                    </div>
                    <div id="dash-generic-body" style="padding:20px; overflow-y:auto;">
                        <!-- Content -->
                    </div>
                </div>
            </div>
            <style>
                @keyframes dashModalIn {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
            </style>
        `;

        document.body.insertAdjacentHTML('beforeend', html);
    }

    openListModal(title, contentHtml, maxWidth = null) {
        const modal = document.getElementById('dash-generic-modal');
        const t = document.getElementById('dash-generic-title');
        const b = document.getElementById('dash-generic-body');
        const inner = document.getElementById('dash-modal-inner');
        if (!modal || !t || !b) return;

        // Custom Width Support
        if (maxWidth && inner) {
            inner.style.maxWidth = maxWidth;
            inner.style.width = '95%'; // Ensure responsiveness
        }

        // Reset Styles (Default)
        const header = modal.querySelector('div[style*="border-bottom"]');
        if (header) {
            header.style.display = 'flex';
            header.style.background = 'white';
            header.style.borderBottom = '1px solid #e2e8f0';
            header.style.borderRadius = '16px 16px 0 0';
        }
        t.style.color = '#0f172a';

        t.innerHTML = title; // Enable raw HTML rendering for dynamic headers like dropdowns
        b.innerHTML = contentHtml;
        modal.style.display = 'flex';

        // Close when clicking outside
        modal.onclick = (e) => {
            if (e.target === modal) this.closeListModal();
        };
    }

    closeListModal() {
        const inner = document.getElementById('dash-modal-inner');
        if (inner) {
            // Reset to default
            inner.style.width = '90%';
            inner.style.maxWidth = '900px';
            inner.style.height = 'auto';
            inner.style.maxHeight = '85vh';
        }
        const modal = document.getElementById('dash-generic-modal');
        if (modal) modal.style.display = 'none';

        // Remove print styles if any
        const printStyle = document.getElementById('dash-report-print-style');
        if (printStyle) printStyle.remove();
    }

    toggleHotQuote(quoteId, btnEl) {
        if (!quoteId) return;
        let hotQuotes = [];
        try {
            hotQuotes = JSON.parse(localStorage.getItem('omnis_hot_quotes') || '[]');
        } catch (e) { hotQuotes = []; }
        
        const idx = hotQuotes.indexOf(quoteId);
        const icon = btnEl.querySelector('i');
        const row = btnEl.closest('tr');
        
        if (idx > -1) {
            hotQuotes.splice(idx, 1);
            if (icon) {
                icon.style.color = '#cbd5e1';
                icon.style.transform = 'scale(1)';
            }
            if (row) row.style.background = 'transparent';
        } else {
            hotQuotes.push(quoteId);
            if (icon) {
                icon.style.color = '#f97316';
                icon.style.transform = 'scale(1.2)';
            }
            if (row) row.style.background = '#ffedd5';
            setTimeout(() => {
                if (icon) icon.style.transform = 'scale(1)';
            }, 200);
        }
        localStorage.setItem('omnis_hot_quotes', JSON.stringify(hotQuotes));
    }

    async openOrderModal(reportId, machineId) {
        // Show loading state first
        this.openListModal("Loading Order Details...", `<div style="padding:20px; text-align:center;">Fetching details...</div>`);

        const sys = window.getCurrentSystem ? window.getCurrentSystem() : { baseUrl: "https://salestrack.powerstar.co.zw" };
        let fullDoc = null;

        try {
            if (!reportId.startsWith('TRACK-')) {
                // 1. Fetch Full Doc via Custom Backend (Admin Perms)
                const res = await window.callFrappeSequenced(sys.baseUrl, "powerstar_salestrack.omnis_dashboard.get_order_details", {
                    report_id: reportId
                });
                const payload = res.message || res;
                if (payload.ok) {
                    fullDoc = payload.data;
                } else {
                    console.error("Fetch Error:", payload.error);
                }
            }
        } catch (e) {
            console.error("Failed to fetch full doc", e);
        }

        // Find basic info from pre-loaded list (OPTIONAL if fullDoc is found)
        let order = (this.ordersData || []).find(o => o.report_id === reportId);

        // If we have fullDoc, we can proceed even if local 'order' snippet is missing.
        // If both are missing, then we have a problem.
        if (!order && !fullDoc) {
            // Try looser match if order was passed differently
            order = (this.ordersData || []).find(o => o.report_id === reportId || o.name === reportId);
        }

        if (!order && !fullDoc) {
            console.error(`Order not found locally or remotely. ID: ${reportId}`);
            this.openListModal("Error", `<div style="padding:20px; color:#ef4444;">Unable to load order details for ID: ${reportId}</div>`);
            return;
        }

        // If local order is missing but we have fullDoc, construct a dummy local object
        if (!order && fullDoc) {
            order = {
                report_id: fullDoc.name,
                customer: fullDoc.customer_name,
                status: fullDoc.status,
                machines: fullDoc.machines || []
            };
        }

        // Prepare Contacts
        const contacts = fullDoc ? (fullDoc.contacts || []) : [];
        this._tempContacts = [...contacts]; // Spread to clone
        this._tempDeletedMachines = [];
        this._currentFullDoc = fullDoc;
        this._currentOrderSnippet = order;

        // Render
        this.renderOrderModalContent(reportId, machineId, order, fullDoc);
    }

    renderOrderModalContent(reportId, machineId, order, fullDoc) {
        // Machines Data Preparation
        let machines = [];
        if (fullDoc && fullDoc.machines && Array.isArray(fullDoc.machines)) {
            machines = fullDoc.machines;
        } else if (order) {
            // Fallback to single item if fetch failed but we have list data
            machines = [{
                name: machineId,
                machine: order.machine,
                qty: order.qty,
                target_handover_date: order.target_handover,
                revised_handover_date: order.revised_handover,
                actual_handover_date: order.actual_handover,
                notes: order.notes
            }];
        }

        // Render Machines Table Rows
        const safeCustomerName = (order ? order.customer : (fullDoc ? fullDoc.customer_name : 'Unknown')).replace(/'/g, "\\'").replace(/"/g, '&quot;');
        
        const renderMachineRows = () => {
            if (machines.length === 0) return `<tr><td colspan="6" style="padding:16px; text-align:center; color:#64748b;">No machines found.</td></tr>`;
            const baseUrl = (window.getCurrentSystem ? window.getCurrentSystem().baseUrl : "https://salestrack.powerstar.co.zw").replace(/\/$/, '');

            return machines.map((m, i) => {
                const img1 = m.images_one ? (m.images_one.startsWith('/') ? baseUrl + m.images_one : m.images_one) : null;
                const img2 = m.image_two ? (m.image_two.startsWith('/') ? baseUrl + m.image_two : m.image_two) : null;

                return `
                <tr class="machine-row" data-mid="${m.name || ''}" style="background:${i % 2 === 0 ? '#ffffff' : '#f8fafc'}; border-bottom:1px solid #e2e8f0;">
                    <td style="padding:8px 12px; border-bottom:1px solid #f1f5f9;">
                        <input type="text" class="m-item" data-item="${m.item || ''}" value="${(m.item_name || m.machine || m.item || '').replace(/\"/g, '&quot;')}" placeholder="Machine/Item" style="width:100%; padding:6px 8px; border:1px solid #cbd5e1; border-radius:4px; font-size:12px; background:white;">
                    </td>
                    <td style="padding:8px 12px; border-bottom:1px solid #f1f5f9;">
                        <input type="number" class="m-qty" value="${m.qty || 1}" style="width:100%; padding:6px 8px; border:1px solid #cbd5e1; border-radius:4px; font-size:13px; font-weight:700; text-align:center; background:white; color:#0f172a; box-shadow:inset 0 1px 2px rgba(0,0,0,0.02);">
                    </td>
                    <td style="padding:8px 12px; border-bottom:1px solid #f1f5f9;">
                        <input type="date" class="m-target" value="${m.target_handover_date || m.target_handover || ''}" readonly style="width:100%; padding:6px 8px; border:1px solid #e2e8f0; border-radius:4px; font-size:12px; background:#f1f5f9; color:#64748b; cursor:not-allowed;" title="Target date is locked and cannot be changed">
                    </td>
                    <td style="padding:8px 12px; border-bottom:1px solid #f1f5f9;">
                        <input type="date" class="m-revised" value="${m.revised_handover_date || m.revised_handover || ''}" style="width:100%; padding:6px 8px; border:1px solid #cbd5e1; border-radius:4px; font-size:12px; background:white;">
                    </td>
                    <td style="padding:8px 12px; border-bottom:1px solid #f1f5f9;">
                        <input type="date" class="m-actual" value="${m.actual_handover_date || ''}" style="width:100%; padding:6px 8px; border:1px solid #cbd5e1; border-radius:4px; font-size:12px; background:white;">
                    </td>
                    <td style="padding:8px 12px; border-bottom:1px solid #f1f5f9;">
                         <div style="display:flex; gap:8px; align-items:stretch; width:100%;">
                            <div style="flex:1; display:flex; flex-direction:column; gap:6px;">
                                <textarea class="m-notes" rows="2" style="flex:1; min-height:60px; padding:8px; border:1px solid #cbd5e1; border-radius:8px; font-size:12px; font-family:inherit; background:white; line-height:1.4; resize:vertical; border-color:#d1d5db;" placeholder="Machine status...">${m.notes || ''}</textarea>
                                <div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center;">
                                    <button onclick="salestrack.openDefectsModal('${(m.item_name || m.machine || m.item || '').replace(/'/g, "\\'").replace(/"/g, '&quot;')}', '${(reportId || '').replace(/'/g, "\\'")}', '${safeCustomerName}')" title="Log Defects" style="background:#fffbeb; color:#d97706; border:1px solid #fde68a; border-radius:6px; padding:4px 10px; font-size:11px; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:4px; transition:all 0.2s;"><i class="fas fa-exclamation-triangle"></i> Defects Log</button>
                                    <button onclick="salestrack.openBookTrainingModal('${(m.item_name || m.machine || m.item || '').replace(/'/g, "\\'").replace(/"/g, '&quot;')}', '${(reportId || '').replace(/'/g, "\\'")}', '${safeCustomerName}')" title="Book Operator Training" style="background:#ecfeff; color:#0891b2; border:1px solid #a5f3fc; border-radius:6px; padding:4px 10px; font-size:11px; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:4px; transition:all 0.2s;"><i class="fas fa-user-graduate"></i> Training</button>
                                </div>
                            </div>
                            <div style="display:flex; flex-direction:column; gap:4px; flex-shrink:0;">
                                <div class="photo-slot" data-field="images_one" onclick="salestrack.triggerMachineImageUpload(this)" title="Attach Photo 1" style="width:34px; height:34px; border:1.5px dashed #cbd5e1; border-radius:6px; display:flex; align-items:center; justify-content:center; cursor:pointer; background:white; position:relative; overflow:hidden; transition:all 0.2s;">
                                    ${img1 ? `
                                        <img src="${img1}" style="width:100%; height:100%; object-fit:cover;">
                                        <div class="delete-photo" onclick="salestrack.removeMachineImage(this, event)" style="position:absolute; top:2px; right:2px; background:rgba(239, 68, 68, 0.9); color:white; width:14px; height:14px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:bold; cursor:pointer; z-index:5;">&times;</div>
                                    ` : `<span style="font-size:16px; color:#94a3b8;">+</span>`}
                                    <input type="hidden" class="m-img-one" value="${m.images_one || ''}">
                                </div>
                                <div class="photo-slot" data-field="image_two" onclick="salestrack.triggerMachineImageUpload(this)" title="Attach Photo 2" style="width:34px; height:34px; border:1.5px dashed #cbd5e1; border-radius:6px; display:flex; align-items:center; justify-content:center; cursor:pointer; background:white; position:relative; overflow:hidden; transition:all 0.2s;">
                                    ${img2 ? `
                                        <img src="${img2}" style="width:100%; height:100%; object-fit:cover;">
                                        <div class="delete-photo" onclick="salestrack.removeMachineImage(this, event)" style="position:absolute; top:2px; right:2px; background:rgba(239, 68, 68, 0.9); color:white; width:14px; height:14px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:bold; cursor:pointer; z-index:5;">&times;</div>
                                    ` : `<span style="font-size:16px; color:#94a3b8;">+</span>`}
                                    <input type="hidden" class="m-img-two" value="${m.image_two || ''}">
                                </div>
                            </div>
                            <button onclick="salestrack.deleteMachineRow(this, '${m.name || ''}')" title="Delete Row" style="color:#ef4444; background:none; border:none; cursor:pointer; font-weight:bold; font-size:16px; line-height:1; margin-top:4px; opacity:0.4; transition:opacity 0.2s; hover:opacity:1;">&times;</button>
                         </div>
                    </td>
                </tr>
                `;
            }).join('');
        };

        // Initial tbody content will be set by refreshContactsTable

        const content = `
           <div style="padding: 16px; display:flex; flex-direction:column; gap:16px; background:#f8fafc;">
               <!-- Header Info -->
               <div style="display:flex; justify-content:space-between; align-items:flex-start; background:white; padding:16px; border-radius:8px; border:1px solid #e2e8f0; box-shadow:0 1px 2px rgba(0,0,0,0.05);">
                    <div>
                        <div style="font-size:11px; font-weight:700; color:#64748b; margin-bottom:6px; text-transform:uppercase; letter-spacing:0.5px;">Customer</div>
                        <div style="font-size:18px; font-weight:700; color:#0f172a;">${(order ? order.customer : (fullDoc ? fullDoc.customer_name : 'Unknown')).replace(/"/g, '')}</div>
                    </div>

                    <div style="width:160px; display:flex; flex-direction:column; justify-content:center;">
                       <label style="font-size:11px; font-weight:700; color:#64748b; display:block; margin-bottom:8px; text-transform:uppercase; letter-spacing:0.5px;">Payment Terms Deal</label>
                       <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                           <input type="checkbox" id="edit-order-is-terms" ${order && order.is_payment_terms === true ? 'checked' : ''} style="width:18px; height:18px; accent-color:#10b981; cursor:pointer;">
                           <span style="font-size:13px; font-weight:700; color:#10b981;">On Terms</span>
                       </label>
                    </div>

                    <div style="width:220px;">
                       <label style="font-size:11px; font-weight:700; color:#64748b; display:block; margin-bottom:6px; text-transform:uppercase; letter-spacing:0.5px;">Order Status</label>
                       <select id="edit-order-status" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px; font-size:14px; background:white; font-weight:600; color:#334155; cursor:pointer;">
                            <option value="New Sale" ${order && order.status === 'New Sale' ? 'selected' : ''}>New Sale</option>
                            <option value="In Progress" ${order && order.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                            <option value="On Hold" ${order && order.status === 'On Hold' ? 'selected' : ''}>On Hold</option>
                            <option value="Customer To Collect" ${order && order.status === 'Customer To Collect' ? 'selected' : ''}>Customer To Collect</option>
                            <option value="Awaiting Customer" ${order && order.status === 'Awaiting Customer' ? 'selected' : ''}>Awaiting Customer</option>
                            <option value="Handed Over" ${order && order.status === 'Handed Over' ? 'selected' : ''}>Handed Over</option>
                            <option value="Delivered" ${order && order.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
                            <option value="Pending" ${order && order.status === 'Pending' ? 'selected' : ''}>Pending</option>
                            <option value="Draft" ${order && order.status === 'Draft' ? 'selected' : ''}>Draft</option>
                            <option value="Cancelled" ${order && order.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                       </select>
                    </div>
               
               <!-- AI Operational Insight -->
               ${order && order.ai_rationale ? `
                <div style="background:#fff1f2; border:1px solid #fee2e2; border-radius:12px; padding:16px; display:flex; gap:12px; align-items:flex-start; box-shadow:0 1px 2px rgba(0,0,0,0.05);">
                    <div style="background:#fef2f2; color:#8b2219; font-size:20px; width:40px; height:40px; display:flex; align-items:center; justify-content:center; border-radius:10px; flex-shrink:0;">&#x1F451;</div>
                    <div style="flex:1;">
                        <div style="font-size:11px; font-weight:800; color:#8b2219; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px;">AI Operations Insight</div>
                        <div style="font-size:13px; color:#450a0a; line-height:1.5; font-style:italic;">"${order.ai_rationale}"</div>
                    </div>
                </div>
               ` : ''}

               </div>

               <!-- Machines Table -->
               <div style="display:flex; flex-direction:column; gap:12px;">
                   <div style="display:flex; justify-content:space-between; align-items:center;">
                       <div style="font-size:14px; font-weight:700; color:#334155; display:flex; align-items:center; gap:8px;">
                            <span>MACHINES</span>
                            <span style="background:#e2e8f0; color:#64748b; font-size:10px; padding:2px 8px; border-radius:99px; font-weight:600;">${machines.length}</span>
                       </div>
                       <button onclick="salestrack.addMachineRow()" style="font-size:12px; background:#ffffff; color:#0f172a; border:1px solid #cbd5e1; padding:6px 12px; border-radius:6px; font-weight:600; cursor:pointer; box-shadow:0 1px 2px rgba(0,0,0,0.05); transition:all 0.2s;">+ Add Machine</button>
                   </div>
                   <div style="border:1px solid #e2e8f0; border-radius:8px; overflow:hidden; box-shadow:0 1px 2px rgba(0,0,0,0.05); background:white;">
                       <table style="width:100%; border-collapse:separate; border-spacing:0; font-size:12px;">
                           <thead style="background:#f8fafc; color:#475569; font-weight:700; font-size:11px; text-transform:uppercase; letter-spacing:0.05em; border-bottom:1px solid #e2e8f0;">
                               <tr>
                                   <th style="padding:10px 12px; text-align:left; width:22%; color:#475569; border-bottom:1px solid #e2e8f0;">Machine / Item</th>
                                   <th style="padding:10px 12px; text-align:center; width:6%; color:#475569; border-bottom:1px solid #e2e8f0;">Qty</th>
                                   <th style="padding:10px 12px; text-align:left; width:13%; color:#475569; border-bottom:1px solid #e2e8f0;">Target Date</th>
                                   <th style="padding:10px 12px; text-align:left; width:13%; color:#475569; border-bottom:1px solid #e2e8f0;">Revised Date</th>
                                   <th style="padding:10px 12px; text-align:left; width:13%; color:#475569; border-bottom:1px solid #e2e8f0;">Actual Date</th>
                                   <th style="padding:10px 12px; text-align:left; width:33%; color:#475569; border-bottom:1px solid #e2e8f0;">Status</th>
                               </tr>
                           </thead>
                           <tbody id="machines-tbody">
                               ${renderMachineRows()}
                           </tbody>
                       </table>
                   </div>
               </div>

               <!-- Contacts Section -->
               <div style="display:flex; flex-direction:column; gap:12px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div style="font-size:14px; font-weight:700; color:#334155;">CONTACTS</div>
                        <button onclick="salestrack.addContactRow()" style="font-size:12px; background:#ffffff; color:#0f172a; border:1px solid #cbd5e1; padding:6px 12px; border-radius:6px; font-weight:600; cursor:pointer; box-shadow:0 1px 2px rgba(0,0,0,0.05); transition:all 0.2s;">+ Add Contact</button>
                    </div>
                    
                    <div style="border:1px solid #e2e8f0; border-radius:8px; overflow:hidden; background:white; box-shadow:0 1px 2px rgba(0,0,0,0.05);">
                        <table style="width:100%; border-collapse:separate; border-spacing:0; font-size:12px;">
                            <thead style="background:#f8fafc; color:#475569; font-weight:700; font-size:11px; text-transform:uppercase; letter-spacing:0.05em; border-bottom:1px solid #e2e8f0;">
                                <tr>
                                    <th style="padding:10px 12px; text-align:left; width:15%; color:#475569; border-bottom:1px solid #e2e8f0;">Salutation</th>
                                    <th style="padding:10px 12px; text-align:left; width:30%; color:#475569; border-bottom:1px solid #e2e8f0;">Name</th>
                                    <th style="padding:10px 12px; text-align:left; width:25%; color:#475569; border-bottom:1px solid #e2e8f0;">Phone</th>
                                    <th style="padding:10px 12px; text-align:left; width:25%; color:#475569; border-bottom:1px solid #e2e8f0;">Email</th>
                                    <th style="width:5%; color:#475569; border-bottom:1px solid #e2e8f0;"></th>
                                </tr>
                            </thead>
                            <tbody id="contacts-tbody">
                                <!-- Populated by refreshContactsTable -->
                            </tbody>
                        </table>
                    </div>
               </div>

                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:12px; border-top:1px solid #e2e8f0; padding-top:24px;">
                     <!-- Left: Delete with Safety -->
                     <div style="position:relative; display:flex; gap:8px; align-items:center;">
                        <button id="btn-init-delete" onclick="salestrack.toggleDeleteConfirm(true)" style="color:#ef4444; background:white; border:1px solid #e2e8f0; font-size:13px; font-weight:600; cursor:pointer; padding:10px 16px; border-radius:8px; transition:all 0.2s;">
                            Delete Order
                        </button>

                        <div id="delete-confirm-box" style="display:none; position:absolute; bottom:110%; left:0; background:white; border:1px solid #e2e8f0; box-shadow:0 10px 15px -3px rgba(0,0,0,0.1); padding:16px; border-radius:8px; width:280px; z-index:20;">
                             <div style="font-size:13px; font-weight:700; color:#1e293b; margin-bottom:4px;">Permanently Delete?</div>
                             <div style="font-size:12px; color:#64748b; margin-bottom:12px; line-height:1.4;">This action cannot be undone.</div>
                             <div style="display:flex; gap:8px;">
                                 <button onclick="salestrack.toggleDeleteConfirm(false)" style="flex:1; padding:8px; background:#eff6ff; color:#1d4ed8; border:1px solid #dbeafe; border-radius:6px; font-size:12px; font-weight:600; cursor:pointer;">Cancel</button>
                                 <button id="btn-confirm-delete-order" style="flex:1; padding:8px; background:#ef4444; color:white; border:none; border-radius:6px; font-size:12px; font-weight:600; cursor:pointer;">Delete</button>
                             </div>
                        </div>

                        ${(reportId || '').startsWith('TRACK-') ? `
                        <button onclick="window.promoteTrackingOrder('${(reportId || '').replace(/'/g, "\\'")}')" style="color:#0f172a; background:#f8fafc; border:1px solid #cbd5e1; font-size:13px; font-weight:700; cursor:pointer; padding:10px 16px; border-radius:8px; transition:all 0.2s; display:flex; align-items:center; gap:6px;">
                            <i class="fas fa-arrow-up"></i> Promote to Actual Order
                        </button>
                        ` : ''}
                     </div>

                     <!-- Right: Standard Actions -->
                     <div style="display:flex; gap:12px; flex-wrap:wrap; align-items:center;">
                        <span id="auto-save-indicator" style="font-size:12px; font-weight:700; color:#10b981; margin-right:8px; opacity:0; transition:opacity 0.3s;">&#10003; Auto-saved</span>
                        <button onclick="salestrack.closeListModal()" style="padding:12px 24px; border:1px solid #cbd5e1; background:white; color:#475569; border-radius:8px; font-size:14px; font-weight:600; cursor:pointer;">Close</button>
                        <button id="btn-send-email-update" onclick="salestrack.initEmailUpdate('${(reportId || '').replace(/'/g, "\\'").replace(/"/g, '&quot;')}')" style="padding:12px 24px; background:#1d4ed8; color:white; border:none; border-radius:8px; font-size:14px; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:8px; box-shadow:0 10px 15px -3px rgba(29, 78, 216, 0.25); transition:all 0.2s;">
                           <span style="font-size:18px;">&#128231;</span> Send Email
                        </button>
                        <button id="btn-send-whatsapp-update" onclick="salestrack.initWhatsAppUpdate('${(reportId || '').replace(/'/g, "\\'").replace(/"/g, '&quot;')}', '${(machineId || '').replace(/'/g, "\\'").replace(/"/g, '&quot;')}')" style="padding:12px 24px; background:#25d366; color:white; border:none; border-radius:8px; font-size:14px; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:8px; box-shadow:0 10px 15px -3px rgba(37, 211, 102, 0.2); transition:all 0.2s;">
                           <span style="font-size:18px;">&#128172;</span> WhatsApp Update
                        </button>
                     </div>
                </div>
           </div>
       `;

        this.openListModal("Edit Order Details", content, "1150px");
        this.refreshContactsTable(); // ✅ Populate contacts and bind listeners immediately

        // Auto-save Logic
        const modalBody = document.getElementById('dash-generic-body');
        if (modalBody) {
            const triggerSave = () => {
                const indicator = document.getElementById('auto-save-indicator');
                if (indicator) {
                    indicator.textContent = 'Saving...';
                    indicator.style.color = '#64748b';
                    indicator.style.opacity = '1';
                }
                clearTimeout(this._autoSaveTimer);
                this._autoSaveTimer = setTimeout(() => {
                    this.saveOrderFull(reportId, machineId, false);
                }, 800);
            };
            modalBody.addEventListener('input', triggerSave);
            modalBody.addEventListener('change', triggerSave);
        }

        const btnDeleteConfirm = document.getElementById('btn-confirm-delete-order');
        if (btnDeleteConfirm) btnDeleteConfirm.onclick = () => this.confirmDeleteOrder(reportId);

        // Bind Remove Contact Buttons
        const removeContactBtns = document.querySelectorAll('.btn-remove-contact');
        removeContactBtns.forEach(btn => {
            btn.onclick = (e) => {
                const idx = parseInt(e.target.dataset.idx);
                this.removeContactRow(idx);
            }
        });

        this.refreshContactsTable();
        this.setupItemSearch();
    }

    // Add Contact
    // Add Machine (Dynamic)
    addMachineRow() {
        const tbody = document.getElementById('machines-tbody');
        if (!tbody) return;

        const row = document.createElement('tr');
        row.className = 'new-machine-row';
        row.style.background = '#f0f9ff'; // Highlight new rows slightly
        row.style.borderBottom = '1px solid #e2e8f0';

        row.innerHTML = `
            <td style="padding:12px; border-bottom:1px solid #f1f5f9;"><input type="text" class="new-item" placeholder="Model Name" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:12px; background:white;"></td>
            <td style="padding:12px; border-bottom:1px solid #f1f5f9;"><input type="number" class="new-qty" value="1" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:12px; text-align:center; background:white;"></td>
            <td style="padding:12px; border-bottom:1px solid #f1f5f9;"><input type="date" class="new-target" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:12px; background:white;"></td>
            <td style="padding:12px; border-bottom:1px solid #f1f5f9;"><input type="date" class="new-revised" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:12px; background:white;"></td>
            <td style="padding:12px; border-bottom:1px solid #f1f5f9;"><input type="date" class="new-actual" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:12px; background:white;"></td>
            <td style="padding:10px 12px; border-bottom:1px solid #f1f5f9;">
                <div style="display:flex; gap:8px; align-items:stretch; width:100%;">
                    <textarea class="new-notes" rows="2" placeholder="Notes" style="flex:1; min-height:60px; padding:8px; border:1px solid #cbd5e1; border-radius:8px; font-size:12px; font-family:inherit; background:white; line-height:1.4; resize:vertical;"></textarea>
                    <div style="display:flex; flex-direction:column; gap:4px; flex-shrink:0;">
                        <div class="photo-slot" data-field="images_one" onclick="salestrack.triggerMachineImageUpload(this)" title="Attach Photo 1" style="width:34px; height:34px; border:1.5px dashed #cbd5e1; border-radius:6px; display:flex; align-items:center; justify-content:center; cursor:pointer; background:white; position:relative; overflow:hidden;">
                            <span style="font-size:16px; color:#94a3b8;">+</span>
                            <input type="hidden" class="new-img-one" value="">
                        </div>
                        <div class="photo-slot" data-field="image_two" onclick="salestrack.triggerMachineImageUpload(this)" title="Attach Photo 2" style="width:34px; height:34px; border:1.5px dashed #cbd5e1; border-radius:6px; display:flex; align-items:center; justify-content:center; cursor:pointer; background:white; position:relative; overflow:hidden;">
                            <span style="font-size:16px; color:#94a3b8;">+</span>
                            <input type="hidden" class="new-img-two" value="">
                        </div>
                    </div>
                    <button onclick="this.closest('tr').remove()" title="Remove Row" style="color:#ef4444; background:none; border:none; cursor:pointer; font-weight:bold; font-size:16px; line-height:1; margin-top:4px; opacity:0.4;">&times;</button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    }

    addContactRow() {
        if (!this._tempContacts) this._tempContacts = [];
        this._tempContacts.push({ salutation: '', name1: '', phone_number: '', email_address: '' });
        this.refreshContactsTable();
    }

    // Remove Contact
    removeContactRow(index) {
        if (this._tempContacts) {
            this._tempContacts.splice(index, 1);
            this.refreshContactsTable();
        }
    }

    // Delete existing machine visually and track it
    deleteMachineRow(btn, mid) {
        if (mid) {
            this._tempDeletedMachines.push(mid);
        }
        const tr = btn.closest('tr');
        if (tr) tr.remove();
    }

    // Internal Refresh (Matches renderContactRows style)
    refreshContactsTable() {
        const tbody = document.getElementById('contacts-tbody');
        if (!tbody) return;

        tbody.innerHTML = this._tempContacts.length === 0
            ? '<tr><td colspan="5" style="text-align:center; padding:16px; color:#94a3b8; font-style:italic;">No contacts added.</td></tr>'
            : this._tempContacts.map((c, i) => `
                <tr style="background:${i % 2 === 0 ? '#ffffff' : '#f8fafc'}; border-bottom:1px solid #e2e8f0;">
                    <td style="padding:8px;"><input type="text" data-idx="${i}" data-field="salutation" value="${c.salutation || ''}" placeholder="Title" style="width:100%; padding:8px; border:1px solid #e2e8f0; border-radius:6px; font-size:13px; background:white;"></td>
                    <td style="padding:8px;"><input type="text" data-idx="${i}" data-field="name1" value="${c.name1 || c.name || ''}" placeholder="Name" style="width:100%; padding:8px; border:1px solid #e2e8f0; border-radius:6px; font-size:13px; background:white;"></td>
                    <td style="padding:8px;"><input type="text" data-idx="${i}" data-field="phone_number" value="${c.phone_number || ''}" placeholder="Phone" style="width:100%; padding:8px; border:1px solid #e2e8f0; border-radius:6px; font-size:13px; background:white;"></td>
                    <td style="padding:8px;"><input type="text" data-idx="${i}" data-field="email_address" value="${c.email_address || ''}" placeholder="Email" style="width:100%; padding:8px; border:1px solid #e2e8f0; border-radius:6px; font-size:13px; background:white;"></td>
                    <td style="text-align:center;">
                        <button onclick="salestrack.removeContactRow(${i})" style="color:#94a3b8; background:none; border:none; cursor:pointer; font-weight:bold; padding:8px; font-size:14px; transition:color 0.2s; hover:text-red-500;">&times;</button>
                    </td>
                </tr>
            `).join('');

        // Bind Listeners
        tbody.querySelectorAll('input').forEach(input => {
            input.oninput = (e) => {
                const idx = parseInt(e.target.dataset.idx);
                const field = e.target.dataset.field;
                if (this._tempContacts[idx]) {
                    this._tempContacts[idx][field] = e.target.value;
                }
            };
        });
    }

    async saveOrderFull(reportId, machineId, closeAfter = true) {
        // 1. Get Parent Status
        const status = document.getElementById('edit-order-status').value;
        const isTermsCheckbox = document.getElementById('edit-order-is-terms');
        const is_payment_terms = isTermsCheckbox ? isTermsCheckbox.checked : false;

        // 2. Gather Machines Data
        const machinesUpdates = [];
        const mRows = document.querySelectorAll('.machine-row');
        mRows.forEach(row => {
            const mid = row.dataset.mid;
            if (mid) {
                const mInput = row.querySelector('.m-item');
                const mCode = mInput?.dataset.item || mInput?.value;
                const mSerial = row.querySelector('.m-serial')?.value;
                const mQty = row.querySelector('.m-qty')?.value;
                const mTarget = row.querySelector('.m-target')?.value;
                const mRevised = row.querySelector('.m-revised')?.value;
                const mActual = row.querySelector('.m-actual')?.value;
                const mNotes = row.querySelector('.m-notes')?.value;
                const mImg1 = row.querySelector('.m-img-one')?.value;
                const mImg2 = row.querySelector('.m-img-two')?.value;

                machinesUpdates.push({
                    name: mid,
                    item: mCode,
                    serial_no: mSerial,
                    qty: mQty,
                    target_handover_date: mTarget,
                    revised_handover_date: mRevised,
                    actual_handover_date: mActual || null,
                    notes: mNotes,
                    images_one: mImg1,
                    image_two: mImg2
                });
            }
        });

        // 3. New Machines
        const newMachines = [];
        document.querySelectorAll('.new-machine-row').forEach(row => {
            const mName = row.querySelector('.new-item')?.value;
            const mSerial = row.querySelector('.new-serial')?.value;
            const mQty = row.querySelector('.new-qty')?.value;
            const mTarget = row.querySelector('.new-target')?.value;
            const mRevised = row.querySelector('.new-revised')?.value;
            const mActual = row.querySelector('.new-actual')?.value;
            const mNotes = row.querySelector('.new-notes')?.value;
            const mImg1 = row.querySelector('.new-img-one')?.value;
            const mImg2 = row.querySelector('.new-img-two')?.value;

            if (mName) {
                newMachines.push({
                    item: mName,
                    serial_no: mSerial,
                    qty: mQty,
                    target_handover_date: mTarget,
                    revised_handover_date: mRevised,
                    actual_handover_date: mActual || null,
                    notes: mNotes,
                    images_one: mImg1,
                    image_two: mImg2
                });
            }
        });

        // Indicate loading
        const btn = document.getElementById('btn-save-order-changes');
        if (btn) { btn.textContent = "Saving..."; btn.disabled = true; }

        try {
            const sys = window.getCurrentSystem ? window.getCurrentSystem() : { baseUrl: "https://salestrack.powerstar.co.zw" };

            let orderRec = (window.olOrdersData || []).find(o => o.report_id === reportId);
            let safeCompany = orderRec ? orderRec.company : (this._currentFullDoc?.company || this._currentFullDoc?.frappe_quotation?.company || "");

            const params = {
                report_id: reportId || "",
                machine_id: machineId || "",
                status: status || "",
                is_payment_terms: is_payment_terms,
                company: safeCompany,
                owner: this._currentFullDoc?.owner || "",
                contacts: this._tempContacts || [],
                machines: machinesUpdates,
                new_machines: newMachines,
                deleted_machines: this._tempDeletedMachines || []
            };

            if (reportId && reportId.startsWith('TRACK-')) {
                const dbId = reportId.replace('TRACK-', '');
                const mainMachine = params.machines && params.machines.length > 0 ? params.machines[0] : null;
                
                if (mainMachine) {
                    const updateData = {
                        status: params.status,
                        target_handover: mainMachine.target_handover_date || null,
                        revised_handover: mainMachine.revised_handover_date || null,
                        actual_handover: mainMachine.actual_handover_date || null,
                        notes: mainMachine.notes || null,
                        qty: mainMachine.qty || 1
                    };
                    
                    if (window.electron) {
                        const updateRes = await window.electron.invoke('supabase:query', {
                            table: 'omnis_tracking_orders',
                            method: 'update',
                            params: { data: updateData, id: dbId }
                        });
                        
                        if (!updateRes.ok) throw new Error("Supabase Update Failed: " + (updateRes.error || "Unknown"));
                    }
                }
                
                this.showToast("Tracking Order Saved", "success");
                
                const indicator = document.getElementById('auto-save-indicator');
                if (indicator) { indicator.innerHTML = '&#10003; Auto-saved'; indicator.style.color = '#10b981'; setTimeout(() => { if(indicator.innerHTML.includes('Auto-saved')) indicator.style.opacity = '0'; }, 2000); }

                if (closeAfter) {
                    this.closeListModal();
                    const refreshBtn = document.getElementById('ol-refresh-btn');
                    if (refreshBtn) refreshBtn.click();
                    else if (window.loadOrdersList) window.loadOrdersList(true);
                } else {
                    if (window.loadOrdersList) window.loadOrdersList(true);
                }
                
                if (btn) { btn.textContent = "Save Changes"; btn.disabled = false; }
                return;
            }

            const res = await window.callFrappeSequenced(sys.baseUrl || "https://salestrack.powerstar.co.zw", "powerstar_salestrack.omnis_dashboard.update_order_details_v2", params);
            const payload = res.message || res;
            if (payload && payload.ok) {
                this.showToast("Order Saved Successfully", "success");

                // --- Supabase Dual-Write ---
                try {
                    await this.syncToSupabase(reportId, params);
                } catch(err) {
                    console.error("[Supabase Sync Error]", err);
                }

                const indicator = document.getElementById('auto-save-indicator');
                if (indicator) { indicator.innerHTML = '&#10003; Auto-saved'; indicator.style.color = '#10b981'; setTimeout(() => { if(indicator.innerHTML.includes('Auto-saved')) indicator.style.opacity = '0'; }, 2000); }

                if (closeAfter) {
                    this.closeListModal();
                    const refreshBtn = document.getElementById('ol-refresh-btn');
                    if (refreshBtn) refreshBtn.click();
                    else if (window.loadOrdersList) window.loadOrdersList(true);
                } else {
                    if (window.loadOrdersList) window.loadOrdersList(true);
                }
            } else {
                throw new Error("Save Failed: " + (payload?.error || JSON.stringify(payload)));
            }

        } catch (e) {
            console.error("Save Error", e);
            alert("Error saving: " + e.message);
            if (btn) { btn.textContent = "Save Changes"; btn.disabled = false; }
        }
    }

    async syncToSupabase(reportId, params) {
        if (!window.supabase) return;
        try {
            console.log("[Supabase] Syncing Order...", reportId);

            // 1. Upsert Parent
            // Intelligent Company Mapping
            const rawOwner = (params.owner || "").toLowerCase();
            const rawCompany = (params.company || "").toLowerCase();
            let companyTag = "Sinopower"; // Default
            if (rawOwner.includes("machinery") || rawCompany.includes("machinery")) {
                companyTag = "Machinery Exchange";
            } else if (rawOwner.includes("sinopower") || rawCompany.includes("sinopower")) {
                companyTag = "Sinopower";
            }

            // Fetch the ID because upsert proxy doesn't support onConflict chaining
            const getRes = await window.supabase.from('fmb_reports').select('id, frappe_id');
            const parentRow = (getRes && getRes.data) ? getRes.data.find(r => r.frappe_id === reportId) : null;
            
            const parentPayload = {
                frappe_id: reportId,
                status: params.status,
                is_payment_terms: params.is_payment_terms === true,
                customer_id: params.customer_id || (this.data && this.data.customer_name),
                company: companyTag
            };

            if (parentRow && parentRow.id) {
                parentPayload.id = parentRow.id;
            }

            const upsertRes = await window.supabase.from('fmb_reports').upsert(parentPayload);

            if (upsertRes.error) {
                console.error("Supabase Parent Sync Error:", upsertRes.error);
                throw new Error(`Supabase Error: ${upsertRes.error.message || upsertRes.error.details}`);
            }

            let supaParentId = parentRow ? parentRow.id : null;
            if (!supaParentId) {
                // If it was a fresh insert, we need to fetch the generated ID
                const freshRes = await window.supabase.from('fmb_reports').select('id, frappe_id');
                const freshRow = freshRes.data ? freshRes.data.find(r => r.frappe_id === reportId) : null;
                if (freshRow) supaParentId = freshRow.id;
            }

            if (!supaParentId) {
                throw new Error("Supabase accepted the request but could not retrieve the ID.");
            }

            // 2. Sync Machines
            if (params.machines && params.machines.length > 0) {
                const machinesRes = await window.supabase.from('order_machines').select('id, frappe_row_id');
                const existingMachines = machinesRes.data || [];

                const machinePayloads = params.machines.map(m => {
                    const existing = existingMachines.find(em => em.frappe_row_id === m.name);
                    const payload = {
                        order_id: supaParentId,
                        frappe_row_id: m.name,
                        item_code: m.item,
                        serial_no: m.serial_no,
                        quantity: m.qty || 1,
                        target_date: m.target_handover_date || null,
                        revised_date: m.revised_handover_date || null,
                        notes: m.notes,
                        image_1_url: m.images_one,
                        image_2_url: m.image_two
                    };
                    if (existing && existing.id) payload.id = existing.id;
                    return payload;
                });
                await window.supabase.from('order_machines').upsert(machinePayloads);
            }

            // 3. Sync Contacts (Batch Insert/Replace approach)
            if (params.contacts && params.contacts.length > 0) {
                const contactPayloads = params.contacts.map(c => ({
                    order_id: supaParentId,
                    salutation: c.salutation,
                    name: c.name1 || c.name,
                    phone: c.phone_number,
                    email: c.email_address
                }));
                await window.supabase.from('order_contacts').insert(contactPayloads);
            }

            console.log("[Supabase] Sync Complete.");
        } catch (e) {
            console.error("[Supabase] Sync failed:", e);
        }
    }


    showToast(msg, type = 'success') {
        let toast = document.getElementById('dash-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'dash-toast';
            toast.style.cssText = `
                position: fixed; bottom: 20px; right: 20px; z-index: 99999;
                background: #1e293b; color: white; padding: 12px 24px;
                border-radius: 8px; font-size: 14px; font-weight: 600;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                opacity: 0; transform: translateY(20px); transition: all 0.3s ease;
            `;
            document.body.appendChild(toast);
        }

        toast.textContent = msg;
        toast.style.background = type === 'error' ? '#ef4444' : '#10b981';

        // Show
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        });

        // Hide after 3s
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(20px)';
        }, 3000);
    }

    saveOrderDetails(reportId, machineId) {
        const status = document.getElementById('edit-order-status').value;
        const revised = document.getElementById('edit-order-revised').value;
        const notes = document.getElementById('edit-order-notes').value;

        // Indicate loading
        const btn = document.querySelector('button[onclick*="saveOrderDetails"]');
        if (btn) { btn.textContent = "Saving..."; btn.disabled = true; }

        const sys = window.getCurrentSystem ? window.getCurrentSystem() : null;
        const baseUrl = sys ? sys.baseUrl : "https://salestrack.powerstar.co.zw";

        window.callFrappeSequenced(baseUrl, 'powerstar_salestrack.omnis_dashboard.update_order_details', {
            report_id: reportId,
            machine_id: machineId,
            status: status,
            revised_handover: revised || null,
            notes: notes
        }).then(r => {
            const res = r.message || r;
            if (res.ok) {
                this.showToast("Order Updated", "success");
                this.closeListModal();

                // Refresh Data without reload
                const refreshBtn = document.getElementById('ol-refresh-btn');
                if (refreshBtn) refreshBtn.click();
                else if (window.loadOrdersList) window.loadOrdersList(true);

            } else {
                if (res.exc_type === "PermissionError") {
                    this.showToast("Permission Error (Restart Server)", "error");
                    alert("System Update Required: Server restart pending.");
                } else {
                    this.showToast("Error: " + (res.error || "Unknown"), "error");
                }
                if (btn) { btn.textContent = "Save Changes"; btn.disabled = false; }
            }
        }).catch(e => {
            console.error(e);
            this.showToast("Connection Failed", "error");
            if (btn) { btn.textContent = "Save Changes"; btn.disabled = false; }
        });
    }
    // --- DELETE LOGIC ---
    toggleDeleteConfirm(show) {
        const box = document.getElementById('delete-confirm-box');
        const btn = document.getElementById('btn-init-delete');
        if (box) box.style.display = show ? 'block' : 'none';
        if (btn) btn.style.opacity = show ? '0.5' : '1';
    }

    async confirmDeleteOrder(reportId) {
        this.showToast("Deleting Order...", "error"); // Orange/Red toast

        try {
            if (reportId.startsWith('TRACK-')) {
                const actualId = reportId.replace('TRACK-', '');
                if (window.electron) {
                    const res = await window.electron.invoke('supabase:query', {
                        table: 'omnis_tracking_orders',
                        method: 'delete',
                        params: { id: actualId }
                    });
                    if (res && res.ok !== false) {
                        this.showToast("Tracking Order Deleted", "success");
                        this.closeListModal();
                        const refreshBtn = document.getElementById('ol-refresh-btn');
                        if (refreshBtn) refreshBtn.click();
                        else if (window.loadOrdersList) window.loadOrdersList(true);
                        return;
                    } else {
                        throw new Error(res?.error || "Failed to delete tracking order");
                    }
                }
            }

            const sys = window.getCurrentSystem ? window.getCurrentSystem() : { baseUrl: "https://salestrack.powerstar.co.zw" };

            const res = await window.callFrappeSequenced(sys.baseUrl, "powerstar_salestrack.omnis_dashboard.delete_order", {
                report_id: reportId
            });

            const payload = res.message || res;

            if (payload.ok || (payload.error && payload.error.includes("Record not found"))) {
                // Delete the linked tracking order in Supabase
                if (window.electron) {
                    try {
                        await window.electron.invoke('supabase:query', {
                            table: 'omnis_tracking_orders',
                            method: 'delete',
                            params: { match: { linked_sale_name: reportId } }
                        });
                    } catch (e) {
                        console.warn("Failed to delete linked tracking order from Supabase:", e);
                    }
                }
                
                this.showToast("Order Deleted Permanently", "success");
                this.closeListModal();
                // Refresh
                const refreshBtn = document.getElementById('ol-refresh-btn');
                if (refreshBtn) refreshBtn.click();
                else if (window.loadOrdersList) window.loadOrdersList(true);
            } else {
                throw new Error(payload.error || "Delete Failed");
            }
        } catch (e) {
            console.error("Delete Error", e);
            this.showToast("Delete Failed: " + e.message, "error");
        }
    }

    setupInlineEditing() {
        document.addEventListener('dblclick', (e) => {
            const cell = e.target.closest('.mxg-body-p3 td[data-editable="true"]');
            if (!cell) return;

            // Check if already editing
            if (cell.querySelector('.inline-editor')) return;

            const row = cell.closest('tr');
            if (!row) return;

            const field = cell.dataset.field;
            const currentVal = cell.textContent.trim();
            // Clean value for input
            const cleanVal = currentVal === '-' ? '' : currentVal;

            cell.dataset.original = currentVal;

            let inputHtml = '';

            if (field === 'status') {
                inputHtml = `
                    <select class="inline-editor" style="width:100%; padding:4px; font-size:11px; border:1px solid #3b82f6; border-radius:4px; outline:none;" onblur="salestrack.saveInlineEdit(this)">
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Handed Over">Handed Over</option>
                        <option value="Draft">Draft</option>
                        <option value="Cancelled">Cancelled</option>
                    </select>
                `;
            } else if (field === 'target_handover' || field === 'revised_handover') {
                inputHtml = `<input type="date" class="inline-editor" value="${cleanVal}" style="width:100%; padding:4px; font-size:11px; border:1px solid #3b82f6; border-radius:4px; outline:none;" onblur="salestrack.saveInlineEdit(this)" onkeydown="if(event.key==='Enter') this.blur()">`;
            } else {
                inputHtml = `<textarea class="inline-editor" rows="3" style="width:100%; padding:4px; font-size:11px; border:1px solid #3b82f6; border-radius:4px; outline:none; resize:vertical;" onblur="salestrack.saveInlineEdit(this)">${cleanVal}</textarea>`;
            }

            cell.innerHTML = inputHtml;

            const input = cell.querySelector('.inline-editor');
            if (input) {
                if (input.tagName === 'SELECT') {
                    input.value = cleanVal || 'In Progress';
                }
                input.focus();
            }
        });
    }

    async saveInlineEdit(input) {
        if (!input) return;
        const cell = input.closest('td');
        const row = cell.closest('tr');
        if (!cell || !row) return;

        const reportId = row.getAttribute('data-report-id');
        const machineId = row.getAttribute('data-machine-id');
        const field = cell.dataset.field;
        let newValue = input.value;
        const originalValue = cell.dataset.original;

        if (newValue === originalValue || (newValue === '' && originalValue === '-')) {
            cell.innerHTML = originalValue;
            return;
        }

        cell.innerHTML = '<span style="color:#3b82f6; font-style:italic;">Saving...</span>';

        try {
            const sys = window.getCurrentSystem ? window.getCurrentSystem() : { baseUrl: "https://salestrack.powerstar.co.zw" };

            const params = {
                report_id: reportId,
                machine_id: machineId
            };

            if (field === 'status') params.status = newValue;
            else if (field === 'notes') params.notes = newValue;
            else if (field === 'target_handover') params.target_handover = newValue;
            else if (field === 'revised_handover') params.revised_handover = newValue;

            if (reportId && reportId.startsWith('TRACK-')) {
                const dbId = reportId.replace('TRACK-', '');
                const updateData = {};
                
                if (field === 'status') updateData.status = newValue;
                else if (field === 'notes') updateData.notes = newValue;
                else if (field === 'target_handover') updateData.target_handover = newValue || null;
                else if (field === 'revised_handover') updateData.revised_handover = newValue || null;
                else if (field === 'actual_handover') updateData.actual_handover = newValue || null;

                if (window.electron) {
                    const updateRes = await window.electron.invoke('supabase:query', {
                        table: 'omnis_tracking_orders',
                        method: 'update',
                        params: { data: updateData, id: dbId }
                    });
                    
                    if (!updateRes.ok) throw new Error("Supabase Update Failed: " + (updateRes.error || "Unknown"));
                }
                
                cell.textContent = newValue || '-';
                this.showToast("Saved", "success");

                if (field === 'target_handover' || field === 'revised_handover' || field === 'status') {
                    setTimeout(() => {
                        const refreshBtn = document.getElementById('ol-refresh-btn');
                        if (refreshBtn) refreshBtn.click();
                        else if (window.loadOrdersList) window.loadOrdersList(true);
                    }, 500);
                }
                return;
            }

            const res = await window.callFrappeSequenced(sys.baseUrl, 'powerstar_salestrack.omnis_dashboard.update_order_details_v2', params);

            const payload = res.message || res;

            if (payload.ok) {
                cell.textContent = newValue || '-';
                this.showToast("Saved", "success");

                if (field === 'target_handover' || field === 'revised_handover' || field === 'status') {
                    setTimeout(() => {
                        const refreshBtn = document.getElementById('mxg-refresh-btn');
                        if (refreshBtn) refreshBtn.click();
                    }, 500);
                }
            } else {
                throw new Error(payload.error || "Unknown Error");
            }

        } catch (e) {
            console.error("Inline Save Error", e);
            if (typeof cell !== 'undefined' && typeof originalValue !== 'undefined') {
                cell.innerHTML = originalValue;
            }
            this.showToast("Save Failed", "error");
        }
    }

    saveSettings() {
        const key = document.getElementById('settings-openai-key').value;
        const msgEl = document.getElementById('settings-status-msg');

        try {
            localStorage.setItem('omnis_openai_key', key);
            this.updateSettingsStatus('... Settings saved successfully!', 'success');
            this.showToast("Settings Saved", "success");
        } catch (e) {
            console.error("Save Settings Error", e);
            this.updateSettingsStatus('&#x274C; Failed to save settings.', 'error');
        }
    }

    loadSettings() {
        try { this.loadEmailRecipients(); } catch(e) {}
        const key = localStorage.getItem('omnis_openai_key');
        const input = document.getElementById('settings-openai-key');
        if (input && key) {
            input.value = key;
        }

        // --- ADMIN ONLY SECTION VISIBILITY ---
        const adminLogs = document.getElementById('settings-admin-logs-card');
        if (adminLogs) {
            const user = (typeof frappe !== "undefined" && frappe.session && frappe.session.user) ? frappe.session.user : "Guest";
            adminLogs.style.display = (user === "Administrator") ? "block" : "none";
        }

        // --- API HEALTH UI ---
        window.updateApiMetricsUI = () => this.updateApiMetricsUI();
        this.updateApiMetricsUI();
    }

    async fetchErrorLogs() {
        const container = document.getElementById('settings-logs-container');
        if (!container) return;

        container.innerHTML = '<div style="padding:40px; text-align:center; color:#64748b;"><i class="fas fa-spinner fa-spin"></i> Fetching system logs...</div>';

        try {
            const sys = window.CURRENT_SYSTEM;
            const res = await window.callFrappeSequenced(sys.baseUrl, "powerstar_salestrack.omnis_dashboard.get_omnis_error_logs", { limit: 30 });

            if (res.message && res.message.ok) {
                this.renderErrorLogs(res.message.logs);
            } else {
                container.innerHTML = `<div style="padding:20px; color:#ef4444; font-size:13px; text-align:center;">${res.message ? res.message.error : 'Failed to fetch logs'}</div>`;
            }
        } catch (e) {
            console.error("Fetch Error Logs failed:", e);
            container.innerHTML = `<div style="padding:20px; color:#ef4444; font-size:13px; text-align:center;">Connection Error: ${e.message}</div>`;
        }
    }

    renderErrorLogs(logs) {
        const container = document.getElementById('settings-logs-container');
        if (!container) return;

        if (!logs || logs.length === 0) {
            container.innerHTML = '<div style="padding:40px; text-align:center; color:#94a3b8;">No error logs found. System is healthy! ...</div>';
            return;
        }

        container.innerHTML = logs.map(l => {
            const time = l.creation ? l.creation.split('.')[0] : 'Unknown Time';
            const method = l.method || 'Internal System';
            const errMsg = l.error || 'N/A';
            const detail = l.message ? l.message.substring(0, 1000) : '';

            return `
                <div style="padding: 15px; border-bottom: 1px solid #e2e8f0; transition: background 0.2s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='transparent'">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 6px;">
                        <span style="color: #4f46e5; font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; background: #eef2ff; padding: 2px 8px; border-radius: 4px;">${method}</span>
                        <span style="color: #94a3b8; font-size: 11px; font-weight: 600;">${time}</span>
                    </div>
                    <div style="font-weight: 700; color: #1e293b; margin-bottom: 6px; font-size: 13px;">${errMsg}</div>
                    <div style="color: #64748b; font-size: 11px; white-space: pre-wrap; word-break: break-all; max-height: 100px; overflow-y: auto; padding: 8px; background: #f1f5f9; border-radius: 6px;">${detail}</div>
                </div>
            `;
        }).join('');
    }

    togglePasswordVisibility(inputId) {
        const input = document.getElementById(inputId);
        if (input) {
            input.type = input.type === 'password' ? 'text' : 'password';
        }
    }

    async testAIConnection() {
        const key = document.getElementById('settings-openai-key').value.trim();
        const btn = document.getElementById('btn-test-ai-connection');
        const msgEl = document.getElementById('settings-status-msg');

        if (!key) {
            this.showToast("Please enter an API key first", "error");
            return;
        }

        // Loading state
        const originalBtnContent = btn.innerHTML;
        btn.innerHTML = `<i class="fa fa-spinner fa-spin"></i> Testing...`;
        btn.disabled = true;

        try {
            const res = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + key
                },
                body: JSON.stringify({
                    model: "gpt-4.1-mini", // Standard test model
                    messages: [{ role: "user", content: "Ping" }],
                    max_tokens: 5
                })
            });

            const data = await res.json();

            if (res.ok) {
                this.updateSettingsStatus('... Connection successful! Your API key is valid.', 'success');
                this.showToast("API Key Validated", "success");
            } else {
                // If it's a 404 model not found, the key itself IS valid, just restricted models.
                if (data.error && data.error.code === 'model_not_found') {
                    this.updateSettingsStatus('... API key is valid (Model access restricted: ' + (data.error.message || 'model_not_found') + ')', 'success');
                    this.showToast("API Key Validated", "success");
                } else {
                    const failMsg = data.error ? data.error.message : 'Connection failed.';
                    this.updateSettingsStatus('&#x274C; ' + failMsg, 'error');
                    this.showToast("Connection Failed", "error");
                }
            }

        } catch (e) {
            console.error("Test Connection Error", e);
            this.updateSettingsStatus('&#x274C; Connection error: ' + e.message, 'error');
            this.showToast("Error testing key", "error");
        } finally {
            btn.innerHTML = originalBtnContent;
            btn.disabled = false;
        }
    }

    /**
     * Shows a status message in the Intelligence tab
     * @param {string} text - The message text
     * @param {string} type - success or error
     */
    updateSettingsStatus(text, type) {
        const msgEl = document.getElementById('settings-status-msg');
        const textEl = document.getElementById('settings-status-text');
        if (!msgEl || !textEl) return;

        textEl.innerHTML = text;
        msgEl.style.display = 'flex';

        if (type === 'success') {
            msgEl.style.background = '#f0fdf4';
            msgEl.style.color = '#15803d';
            msgEl.style.borderColor = '#bbf7d0';
        } else {
            msgEl.style.background = '#fef2f2';
            msgEl.style.color = '#b91c1c';
            msgEl.style.borderColor = '#fecaca';
        }

        // Clear existing timer if any
        if (this._settingsStatusTimer) clearTimeout(this._settingsStatusTimer);

        // Auto-dismiss after 8 seconds
        this._settingsStatusTimer = setTimeout(() => {
            msgEl.style.display = 'none';
        }, 8000);
    }

    /* ---------- WHATSAPP BUILT-IN INTEGRATION LOGIC ---------- */

    // Listen for WhatsApp Events from Electron
    initWhatsAppListeners() {
        if (window.electron && window.electron.on) {
            window.electron.removeAllListeners('whatsapp:qr');
            window.electron.removeAllListeners('whatsapp:status');

            window.electron.on('whatsapp:qr', (event, qr) => {
                // Update Modal QR
                const qrImg = document.getElementById('wa-qr-img');
                const placeholder = document.getElementById('wa-qr-placeholder');
                const statusLabel = document.getElementById('wa-scan-status');
                if (qrImg && placeholder) {
                    qrImg.src = qr;
                    qrImg.classList.remove('hidden');
                    placeholder.classList.add('hidden');
                }
                if (statusLabel) {
                    statusLabel.innerText = 'Ready to Scan';
                    statusLabel.className = 'whatsapp-status-pill wa-status-ready';
                }

                // Update Settings Page Embedded QR
                const settingsQrImg = document.getElementById('wa-settings-qr-img');
                const settingsPlaceholder = document.getElementById('wa-settings-qr-placeholder');
                if (settingsQrImg && settingsPlaceholder) {
                    settingsQrImg.src = qr;
                    settingsQrImg.classList.remove('hidden');
                    settingsPlaceholder.classList.add('hidden');
                }
            });

            window.electron.on('whatsapp:status', (event, status, errorDetail) => {
                // 1. Update Modal (if open)
                const statusLabels = [
                    document.getElementById('wa-scan-status'),
                    document.getElementById('order-modal-wa-status')
                ];

                statusLabels.forEach(statusLabel => {
                    if (statusLabel) {
                        let displayStatus = status;
                        let statusClass = 'wa-status-disconnected';

                        if (status === 'CONNECTED') {
                            statusClass = 'wa-status-connected';
                        } else if (status === 'ERROR') {
                            displayStatus = errorDetail ? `ERROR: ${errorDetail}` : 'INIT ERROR';
                            statusClass = 'wa-status-error';
                        } else if (status === 'ERR_NO_BROWSER') {
                            displayStatus = 'NO CHROME FOUND';
                            statusClass = 'wa-status-error';
                        } else if (status === 'AUTHENTICATING') {
                            displayStatus = 'AUTHENTICATING...';
                            statusClass = 'wa-status-connecting';
                        } else if (status === 'CONNECTING') {
                            displayStatus = 'CONNECTING...';
                            statusClass = 'wa-status-connecting';
                        } else if (status === 'QR_READY') {
                            displayStatus = 'READY TO SCAN';
                            statusClass = 'wa-status-ready';
                        }

                        statusLabel.innerText = displayStatus;
                        statusLabel.className = 'whatsapp-status-pill ' + statusClass;
                    }
                });

                // 2. Update Settings Page Status
                const settingsIcon = document.getElementById('wa-settings-icon');
                const settingsText = document.getElementById('wa-settings-status-text');
                const qrPanel = document.getElementById('wa-settings-qr-panel');

                if (settingsText) settingsText.innerText = (status === 'ERROR' && errorDetail) ? `ERROR: ${errorDetail}` : status;
                if (settingsIcon) {
                    settingsIcon.style.color = (status === 'CONNECTED' ? '#25D366' : (status === 'ERROR' || status === 'ERR_NO_BROWSER' ? '#ef4444' : '#64748b'));
                    if (status === 'CONNECTED') {
                        settingsIcon.style.borderColor = '#25D366';
                        settingsIcon.style.background = '#f0fdf4';
                    } else if (status === 'ERROR' || status === 'ERR_NO_BROWSER') {
                        settingsIcon.style.borderColor = '#ef4444';
                        settingsIcon.style.background = '#fef2f2';
                    } else {
                        settingsIcon.style.borderColor = '#e2e8f0';
                        settingsIcon.style.background = 'white';
                    }
                }

                // Toggle QR Panel visibility in Settings
                if (qrPanel) {
                    if (status === 'QR_READY') {
                        qrPanel.style.display = 'flex';
                    } else if (status === 'CONNECTED') {
                        qrPanel.style.display = 'none';
                    }
                }

                // 3. Update Global Navbar Status
                const navbarText = document.getElementById('wa-navbar-text');
                const navbarDot = document.getElementById('wa-navbar-dot');
                if (navbarText && navbarDot) {
                    let displayLabel = 'WA: DISCONNECTED';
                    let dotColor = '#64748b'; // Slate 400
                    let textColor = 'rgba(255,255,255,0.4)';

                    if (status === 'CONNECTED') {
                        displayLabel = 'WA: CONNECTED';
                        dotColor = '#22c55e'; // Green 500
                        textColor = '#22c55e';
                    } else if (status === 'QR_READY') {
                        displayLabel = 'WA: SCAN NEEDED';
                        dotColor = '#f59e0b'; // Amber 500
                        textColor = '#f59e0b';
                    } else if (status === 'CONNECTING' || status === 'AUTHENTICATING') {
                        displayLabel = 'WA: CONNECTING...';
                        dotColor = '#3b82f6'; // Blue 500
                        textColor = '#3b82f6';
                    } else if (status === 'ERROR' || status === 'ERR_NO_BROWSER') {
                        displayLabel = status === 'ERR_NO_BROWSER' ? 'WA: NO BROWSER' : (errorDetail ? `WA: ${errorDetail}` : 'WA: ERROR');
                        dotColor = '#ef4444'; // Red 500
                        textColor = '#ef4444';
                    }

                    navbarText.innerText = displayLabel;
                    navbarText.style.color = textColor;
                    navbarDot.style.background = dotColor;
                    navbarDot.style.boxShadow = (status === 'CONNECTED' ? '0 0 8px #22c55e' : 'none');
                }

                if (status === 'CONNECTED') {
                    const overlay = document.getElementById('whatsapp-scan-overlay');
                    if (overlay && !overlay.classList.contains('hidden')) {
                        setTimeout(() => { overlay.classList.add('hidden'); }, 2000);
                    }
                }
            });
        }
    }

    async logoutWhatsApp() {
        if (!confirm("Are you sure you want to hard reset the WhatsApp connection? This will wipe the session and require re-linking.")) return;

        try {
            if (window.omnisLog) window.omnisLog("[WhatsApp] Requesting session wipe...");
            const res = await window.electron.invoke('whatsapp:logout');
            if (res.ok) {
                if (window.omnisLog) window.omnisLog("[WhatsApp] Session wiped successfully.", "success");
                this.showToast("WhatsApp session reset. Please scan new QR.", "success");
            }
        } catch (err) {
            console.error("Logout Error:", err);
            if (window.omnisLog) window.omnisLog("WhatsApp Wipe Error: " + err.message, "error");
        }
    }

    async testWhatsAppReconnect() {
        try {
            if (window.omnisLog) window.omnisLog("[WhatsApp] Restarting client...");
            const res = await window.electron.invoke('whatsapp:reconnect');
            if (res.ok) {
                if (window.omnisLog) window.omnisLog("[WhatsApp] Client restarted.", "success");
                this.showToast("Client restarted successfully.", "success");
            }
        } catch (err) {
            console.error("Reconnect Error:", err);
            if (window.omnisLog) window.omnisLog("WhatsApp Restart Error: " + err.message, "error");
            this.showToast("Failed to restart client: " + err.message, "error");
        }
    }

    async initWhatsAppUpdate(reportId, machineId) {
        if (!window.electron) {
            console.error("WhatsApp built-in requires Desktop environment");
            return;
        }
        try {
            const checkRes = await window.electron.invoke('supabase:query', {
                table: 'omnis_salestrack_notifications', method: 'select', params: { columns: 'notified_wa', filters: { report_id: reportId } }
            });
            if (checkRes && checkRes.data && checkRes.data.length > 0 && checkRes.data[0].notified_wa) {
                const confirmResend = confirm("⚠️ You have already sent a WhatsApp update for this order.\nAre you sure you want to send another one?");
                if (!confirmResend) return;
            }
        } catch(e) { console.error("Could not check notified_wa", e); }


        const stats = await window.electron.invoke('whatsapp:get-status');
        if (stats.status !== 'CONNECTED') {
            document.getElementById('whatsapp-scan-overlay').classList.remove('hidden');
            if (stats.qr) {
                const qrImg = document.getElementById('wa-qr-img');
                const placeholder = document.getElementById('wa-qr-placeholder');
                if (qrImg) {
                    qrImg.src = stats.qr;
                    qrImg.classList.remove('hidden');
                }
                if (placeholder) placeholder.classList.add('hidden');
            }
            return;
        }
        this.showWhatsAppPreview(document.getElementById('btn-send-whatsapp-update'));
    }

    showWhatsAppPreview(btn) {
        try {
            const orderStatus = document.getElementById('edit-order-status')?.value || "In Progress";

            // 1. Extract All Valid Contacts
            const sentToNames = [];
            const validContacts = [];
            document.querySelectorAll('#contacts-tbody tr').forEach(row => {
                const sVal = row.querySelector('input[data-field="salutation"]')?.value.trim() || "";
                const nVal = row.querySelector('input[data-field="name1"]')?.value.trim() || "";
                const pVal = row.querySelector('input[data-field="phone_number"]')?.value.trim() || "";
                if (pVal && pVal !== "Phone") {
                    validContacts.push({ phone: pVal, salutation: sVal, name: nVal || "Valued Customer" });
                    sentToNames.push(nVal || "Valued Customer");
                }
            });

            if (validContacts.length === 0) {
                this.showToast("No customer phone numbers found in contacts.", "error");
                return;
            }

            // 2. Extract Machines
            const machines = [];
            const sys = window.getCurrentSystem ? window.getCurrentSystem() : { baseUrl: "https://salestrack.powerstar.co.zw" };
            const baseUrl = sys.baseUrl.replace(/\/$/, '');

            document.querySelectorAll('#machines-tbody tr').forEach(row => {
                if (row.cells.length < 5) return;
                const itemInput = row.querySelector('.m-item');
                const qtyInput = row.querySelector('.m-qty');
                const targetInput = row.querySelector('.m-target');
                const revisedInput = row.querySelector('.m-revised');
                const notesInput = row.querySelector('.m-notes');

                const mName = itemInput ? itemInput.value.trim() : (row.cells[0]?.innerText.trim().split('\n')[0] || "");
                const mQty = qtyInput ? qtyInput.value.trim() : (row.cells[2]?.innerText.trim() || "1");
                const mTarget = targetInput ? targetInput.value.trim() : (row.cells[3]?.innerText.trim() || "-");
                const mRevised = revisedInput ? revisedInput.value.trim() : "";
                const mNotes = notesInput ? notesInput.value.trim() : "";

                let mImg1 = row.querySelector('.m-img-one')?.value || row.querySelector('.new-img-one')?.value || "";
                let mImg2 = row.querySelector('.m-img-two')?.value || row.querySelector('.new-img-two')?.value || "";

                // ✅ Ensure Absolute URLs for WhatsApp Client
                if (mImg1 && mImg1.startsWith('/')) mImg1 = baseUrl + mImg1;
                if (mImg2 && mImg2.startsWith('/')) mImg2 = baseUrl + mImg2;

                if (mName && mName !== "Machine / Item") {
                    machines.push({
                        name: mName, qty: mQty, target: mTarget, revised: mRevised,
                        notes: mNotes, img1: mImg1, img2: mImg2
                    });
                }
            });

            const totalAttachments = machines.reduce((acc, m) => acc + (m.img1 ? 1 : 0) + (m.img2 ? 1 : 0), 0);

            // 3. Build customer message preview (personalised for first contact)
            const customerName = document.querySelector('#dash-generic-body div[style*="font-size:18px"]')?.textContent.trim() || "Customer";
            const previewContact = validContacts[0];
            const greetingName = previewContact.salutation
                ? `${previewContact.salutation} ${previewContact.name}`
                : previewContact.name;

            const company = (this._currentFullDoc?.company || "").toLowerCase();
            const owner = (this._currentFullDoc?.owner || "").toLowerCase();
            const isSinopower = company.includes("sinopower") || owner.includes("sinopower");
            const isIEG = company.includes("industrial equipment") || owner.includes("industrial equipment");

            const config = this._getRecipients(company);
            let contactPerson = config.contactName || "Chetan Samji";
            let contactPhone = config.contactPhone || "+263772949515";
            let companyName = "Machinery Exchange";
            let signOff = `*The ${companyName} Team*`;

            if (isSinopower) {
                companyName = "Sinopower";
                signOff = `*Sinopower*`;
            } else if (isIEG) {
                companyName = "Industrial Equipment Group";
                signOff = `*The IEG Team*`;
            }

            const daysLeft = this._currentOrderSnippet?.days_left || "";
            let isLate = false;
            if (daysLeft !== "" && parseInt(daysLeft) < 0) {
                isLate = true;
            }

            const introVariations = [
                `We hope this message finds you well. Thank you for choosing ${company || 'us'} as your equipment partner. Please find the latest progress update for ${customerName ? customerName + "'s" : "your"} order below.`,
                `We appreciate your continued business. Here is the latest status update for ${customerName ? customerName + "'s" : "your"} equipment order.`,
                `Thank you for trusting ${company || 'us'} with your equipment needs. Please see the current timeline and details for your order below.`
            ];
            const randomIntro = introVariations[Math.floor(Math.random() * introVariations.length)];

            let previewMsg = `Dear *${greetingName}*,\n\n${randomIntro}\n\n`;
            if (isLate) {
                previewMsg += `_We sincerely apologize for the delay and are working diligently to expedite the process._\n\n`;
            }
            previewMsg += `*EQUIPMENT DETAILS*\n`;

            const numEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
            machines.forEach((m, idx) => {
                const numEmoji = idx < 10 ? numEmojis[idx] : `${idx + 1}.`;
                const dateToShow = m.revised ? `${m.revised} (Revised)` : m.target;
                previewMsg += `${numEmoji} *${m.name}* (Qty: ${m.qty})\n    ↳ Status: _${m.notes || orderStatus}_\n    ↳ Target Handover Date: *${dateToShow}*\n\n`;
            });
            previewMsg += `Should you have any questions or require further assistance, please do not hesitate to contact your dedicated representative:\n👤 *${contactPerson}* | Commercial Manager\n📞 ${contactPhone}\n\nBest regards,\n${signOff}`;

            const recipientLabels = validContacts.map(c =>
                `${c.salutation ? c.salutation + ' ' : ''}${c.name} (${c.phone})`
            ).join(', ');

            // 4. Render message as styled WhatsApp-like bubble (bold = **, italic = _)
            const styledMsg = previewMsg
                .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                .replace(/\*([^*]+)\*/g, '<strong>$1</strong>')
                .replace(/_([^_]+)_/g, '<em>$1</em>')
                .replace(/\n/g, '<br>');

            // 5. Inject preview modal
            const existing = document.getElementById('wa-preview-modal');
            if (existing) existing.remove();

            document.body.insertAdjacentHTML('beforeend', `
            <div id="wa-preview-modal" style="
                position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:20000;
                display:flex; align-items:center; justify-content:center;
                backdrop-filter:blur(6px); animation:fadeIn 0.2s ease;
            ">
                <div style="
                    background:white; width:90%; max-width:620px; border-radius:16px;
                    box-shadow:0 30px 60px rgba(0,0,0,0.3); overflow:hidden;
                    animation:slideUp 0.25s cubic-bezier(0.16,1,0.3,1);
                    max-height:90vh; display:flex; flex-direction:column;
                ">
                    <!-- Header -->
                    <div style="background:linear-gradient(135deg,#075e54,#128c7e); padding:20px 24px; display:flex; justify-content:space-between; align-items:center; flex-shrink:0;">
                        <div style="display:flex; align-items:center; gap:12px;">
                            <div style="width:40px; height:40px; background:rgba(255,255,255,0.15); border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:22px;">&#x1F4AC;</div>
                            <div>
                                <div style="font-size:17px; font-weight:700; color:white;">WhatsApp Update Preview</div>
                                <div style="font-size:12px; color:rgba(255,255,255,0.75); margin-top:2px;">Review before sending to customer</div>
                            </div>
                        </div>
                        <button onclick="document.getElementById('wa-preview-modal').remove()" style="background:rgba(255,255,255,0.1); border:none; color:white; width:32px; height:32px; border-radius:8px; font-size:18px; cursor:pointer;">&times;</button>
                    </div>

                    <!-- Scrollable body -->
                    <div style="padding:24px; display:flex; flex-direction:column; gap:16px; overflow-y:auto;">

                        <!-- Recipients -->
                        <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:10px; padding:14px 16px;">
                            <div style="font-size:11px; font-weight:700; color:#15803d; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">&#x1F4F1; Sending To</div>
                            <div style="font-size:13px; color:#166534; font-weight:500;">${recipientLabels}</div>
                        </div>

                        <!-- WhatsApp bubble -->
                        <div>
                            <div style="font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px;">Message Preview</div>
                            <div style="background:#dcf8c6; border-radius:0 12px 12px 12px; padding:16px 18px; font-size:13px; line-height:1.7; color:#111827; box-shadow:0 1px 3px rgba(0,0,0,0.1);">
                                <div style="font-size:10px; color:#128c7e; font-weight:700; margin-bottom:8px; text-transform:uppercase; letter-spacing:0.5px;">Customer Message${validContacts.length > 1 ? ' (first recipient shown)' : ''}</div>
                                ${styledMsg}
                            </div>
                        </div>

                        <!-- Internal group note -->
                        <div style="background:#fff7ed; border:1px solid #fed7aa; border-radius:10px; padding:12px 16px; display:flex; gap:10px; align-items:flex-start;">
                            <span style="font-size:16px; flex-shrink:0;">&#x1F514;</span>
                            <div style="font-size:12px; color:#92400e; line-height:1.5;">
                                <strong>Internal Group Notification</strong> will also be posted to the <em>IEG | Order Updates</em> WhatsApp group.
                            </div>
                        </div>

                        ${validContacts.length > 1 ? `<div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:10px; padding:12px 16px; font-size:12px; color:#1e40af;">&#x2139; A personalised message will be sent to each of the <strong>${validContacts.length} contacts</strong> individually.</div>` : ''}

                        <!-- Attachment Indicator -->
                        ${totalAttachments > 0 ? `
                            <div style="background:#f0f9ff; border:1px solid #bae6fd; border-radius:10px; padding:12px 16px; display:flex; align-items:center; gap:12px;">
                                <div style="font-size:20px;">&#x1F4CE;</div>
                                <div style="font-size:12px; color:#0369a1; font-weight:600;">
                                    ${totalAttachments} photo${totalAttachments > 1 ? 's' : ''} will be attached to this update.
                                </div>
                            </div>
                        ` : ''}

                        <!-- Actions -->
                        <div style="display:flex; gap:12px; justify-content:flex-end; padding-top:8px; border-top:1px solid #f1f5f9;">
                            <button onclick="document.getElementById('wa-preview-modal').remove()" style="padding:10px 24px; border:1px solid #e2e8f0; background:white; color:#64748b; border-radius:8px; font-size:14px; font-weight:600; cursor:pointer;">Cancel</button>
                            <button id="btn-confirm-send-wa" style="padding:10px 28px; background:#25d366; color:white; border:none; border-radius:8px; font-size:14px; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:8px; box-shadow:0 4px 14px rgba(37,211,102,0.35);">
                                <span>&#x1F4AC;</span> Send Now
                            </button>
                        </div>
                    </div>
                </div>
            </div>`);

            document.getElementById('btn-confirm-send-wa').onclick = () => {
                document.getElementById('wa-preview-modal').remove();
                this.executeWhatsAppSend(btn, validContacts, machines, sentToNames, orderStatus, customerName);
            };

        } catch (err) {
            console.error("WhatsApp Preview Error:", err);
            this.showToast("Could not build message preview: " + err.message, "error");
        }
    }

    async executeWhatsAppSend(btn, validContacts, machines, sentToNames, orderStatus, customerName) {
        const originalHtml = btn ? btn.innerHTML : '';
        if (btn) { btn.disabled = true; btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Sending...`; }

        try {
            const company = (this._currentFullDoc?.company || "").toLowerCase();
            const owner = (this._currentFullDoc?.owner || "").toLowerCase();
            const isSinopower = company.includes("sinopower") || owner.includes("sinopower");
            const isIEG = company.includes("industrial equipment") || owner.includes("industrial equipment");

            let contactPerson = "Chetan Samji";
            let contactPhone = "+263772949515";
            let companyName = "Machinery Exchange";
            let signOff = `*The ${companyName} Team*`;

            if (isSinopower) {
                contactPerson = "Brett Berry";
                contactPhone = "+263775553862";
                companyName = "Sinopower";
                signOff = `*Sinopower*`;
            } else if (isIEG) {
                companyName = "Industrial Equipment Group";
                signOff = `*The IEG Team*`;
            }

            const daysLeft = this._currentOrderSnippet?.days_left || "";
            let isLate = false;
            if (daysLeft !== "" && parseInt(daysLeft) < 0) {
                isLate = true;
            }

            // Send personalised message to each contact
            for (const contact of validContacts) {
                const greetingName = contact.salutation ? `${contact.salutation} ${contact.name}` : contact.name;
                const introVariations = [
                    `We hope this message finds you well. Thank you for choosing ${company || 'us'} as your equipment partner. Please find the latest progress update for ${this._currentFullDoc?.customer || "your"} order below.`,
                    `We appreciate your continued business. Here is the latest status update for ${this._currentFullDoc?.customer || "your"} equipment order.`,
                    `Thank you for trusting ${company || 'us'} with your equipment needs. Please see the current timeline and details for your order below.`
                ];
                const randomIntro = introVariations[Math.floor(Math.random() * introVariations.length)];

                let customerMsg = `Dear *${greetingName}*,\n\n${randomIntro}\n\n`;
                if (isLate) {
                    customerMsg += `_We sincerely apologize for the delay and are working diligently to expedite the process._\n\n`;
                }
                customerMsg += `*EQUIPMENT DETAILS*\n`;

                const numEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
                machines.forEach((m, idx) => {
                    const numEmoji = idx < 10 ? numEmojis[idx] : `${idx + 1}.`;
                    const dateToShow = m.revised ? `${m.revised} (Revised)` : m.target;
                    customerMsg += `${numEmoji} *${m.name}* (Qty: ${m.qty})\n    ↳ Status: _${m.notes || orderStatus}_\n    ↳ Target Handover Date: *${dateToShow}*\n\n`;
                });
                customerMsg += `Should you have any questions or require further assistance, please do not hesitate to contact your dedicated representative:\n👤 *${contactPerson}* | Commercial Manager\n📞 ${contactPhone}\n\nBest regards,\n${signOff}`;

                if (window.omnisLog) window.omnisLog(`[WhatsApp] Sending to ${contact.name} (${contact.phone})...`);
                const res = await window.electron.invoke('whatsapp:send-msg', { to: contact.phone, body: customerMsg });

                // Send machine images if present
                for (const m of machines) {
                    if (m.img1) {
                        if (window.omnisLog) window.omnisLog(`[WhatsApp] Preparing Photo 1 for ${m.name}...`);
                        const b64 = await this.urlToBase64(m.img1);
                        if (b64) {
                            await window.electron.invoke('whatsapp:send-media', { to: contact.phone, base64: b64, filename: `photo1_${m.name}.jpg` });
                        } else {
                            if (window.omnisLog) window.omnisLog(`[WhatsApp] Failed to process Photo 1 for ${m.name}`, "error");
                        }
                    }
                    if (m.img2) {
                        if (window.omnisLog) window.omnisLog(`[WhatsApp] Preparing Photo 2 for ${m.name}...`);
                        const b64 = await this.urlToBase64(m.img2);
                        if (b64) {
                            await window.electron.invoke('whatsapp:send-media', { to: contact.phone, base64: b64, filename: `photo2_${m.name}.jpg` });
                        } else {
                            if (window.omnisLog) window.omnisLog(`[WhatsApp] Failed to process Photo 2 for ${m.name}`, "error");
                        }
                    }
                }

                if (!res.ok) console.warn(`Failed to send to ${contact.name}: ${res.error}`);
            }

            // Internal group message
            let companyShort = "IEG";
            if (company.includes("Machinery Exchange")) companyShort = "Machinery Exchange";
            else if (company.includes("Sinopower")) companyShort = "Sinopower";

            let groupMsg = `*${companyShort} Internal Update*\nOrder update for *${customerName}* was sent to:\n`;
            sentToNames.forEach(name => { groupMsg += `• ${name}\n`; });
            groupMsg += `\n*Status*: ${orderStatus}\n`;

            if (daysLeft !== "") {
                const daysInt = parseInt(daysLeft);
                let flag = "";
                if (daysInt < 0) flag = "🚨 *OVERDUE*";
                else if (daysInt <= 7) flag = "⚠️ *LATE RISK*";
                else flag = "✅ *ON TRACK*";
                groupMsg += `*Timeline*: ${daysLeft} days left ${flag}\n`;
            }

            const allNotes = machines.map(m => m.notes).filter(n => n && n.trim() !== "");
            if (allNotes.length > 0) groupMsg += `*Notes*: ${[...new Set(allNotes)].join("; ")}\n`;

            groupMsg += `\n*Target Handovers*:\n`;
            machines.forEach((m, idx) => {
                const dateToShow = m.revised ? `${m.revised} (Revised)` : m.target;
                groupMsg += `• ${m.name} x${m.qty} ➔ *${dateToShow}*\n`;
            });

            if (window.omnisLog) window.omnisLog("[WhatsApp] Group Message:\n" + groupMsg);
            // Group message is OPTIONAL - if the group does not exist on this device, skip gracefully
            try {
                const resGroup = await window.electron.invoke('whatsapp:send-to-group', { groupName: "IEG | Order Updates", body: groupMsg });
                if (!resGroup.ok) {
                    console.warn("[WhatsApp] Group not found, skipping:", resGroup.error);
                    if (window.omnisLog) window.omnisLog("[WhatsApp] Note: Group not on this device - skipping.", "warn");
                }
            } catch (groupErr) {
                console.warn("[WhatsApp] Group send skipped:", groupErr.message);
            }

            if (btn) btn.innerHTML = `<span>...</span> Sent!`;
            this.showToast(`WhatsApp update sent to ${validContacts.length} contact${validContacts.length > 1 ? 's' : ''}!`, 'success');
            if (window.omnisLog) window.omnisLog("[WhatsApp] Order update sent successfully.");
            setTimeout(() => { if (btn) { btn.disabled = false; btn.innerHTML = originalHtml; } }, 3000);

        } catch (err) {
            console.error("WhatsApp Error: " + err.message);
            if (window.omnisLog) window.omnisLog("WhatsApp Error: " + err.message, "error");
            if (btn) {
                btn.innerHTML = `<span>&#x274C;</span> Error`;
                setTimeout(() => { btn.disabled = false; btn.innerHTML = originalHtml; }, 3000);
            }
        }
    }

    /* ---------- EMAIL UPDATE INTEGRATION ---------- */

    // ── EMAIL RECIPIENTS SETTINGS ──────────────────────────────
    _defaultEmailRecipients() {
        return {
            mxg: {
                cc: [
                    'takunda@industrial-exchange.group', 'antony@industrial-exchange.group',
                    'isaac@machinery-exchange.com', 'mathew@industrial-exchange.group',
                    'barry@industrial-exchange.group', 'nolan@industrial-exchange.group',
                    'brendan@industrial-exchange.group'
                ],
                contactName: 'Chetan Samji',
                contactTitle: 'Commercial Manager',
                contactEmail: 'chetan.samji@machinery-exchange.com',
                contactPhone: '+263772949515'
            },
            spz: {
                cc: [
                    'takunda@industrial-exchange.group', 'antony@industrial-exchange.group',
                    'logistics@sinopower.co.zw', 'brett@sinopower.co.zw', 'trucks@sinopower.co.zw',
                    'rutendo@industrial-exchange.group', 'louis@industrial-exchange.group',
                    'mathew@industrial-exchange.group', 'barry@industrial-exchange.group',
                    'brendan@industrial-exchange.group'
                ],
                contactName: 'Brett Berry',
                contactTitle: 'Commercial Manager',
                contactEmail: 'brett@sinopower.co.zw',
                contactPhone: '+263775553862'
            }
        };
    }

    async loadEmailRecipients() {
        try {
            const defs  = this._defaultEmailRecipients();
            let saved = {};
            
            try {
                const queryFn = window.electron ? window.electron.invoke : null;
                if (queryFn) {
                    const res = await queryFn('supabase:query', {
                        table: 'omnis_app_settings',
                        method: 'select',
                        params: { match: { setting_key: 'email_recipients' } }
                    });
                    if (res && res.data && res.data.length > 0) saved = res.data[0].setting_value || {};
                    else saved = JSON.parse(localStorage.getItem('omnis_email_recipients') || '{}');
                } else if (window.supabase) {
                    const { data } = await window.supabase.from('omnis_app_settings').select('setting_value').eq('setting_key', 'email_recipients');
                    if (data && data.length > 0) saved = data[0].setting_value || {};
                    else saved = JSON.parse(localStorage.getItem('omnis_email_recipients') || '{}');
                } else {
                    saved = JSON.parse(localStorage.getItem('omnis_email_recipients') || '{}');
                }
            } catch (err) {
                console.error('Error fetching settings from Supabase, using local:', err);
                saved = JSON.parse(localStorage.getItem('omnis_email_recipients') || '{}');
            }
            
            const mxgData = Array.isArray(saved.mxg) ? { cc: saved.mxg, contactName: defs.mxg.contactName, contactTitle: defs.mxg.contactTitle, contactEmail: defs.mxg.contactEmail, contactPhone: defs.mxg.contactPhone } : (saved.mxg || defs.mxg);
            const spzData = Array.isArray(saved.spz) ? { cc: saved.spz, contactName: defs.spz.contactName, contactTitle: defs.spz.contactTitle, contactEmail: defs.spz.contactEmail, contactPhone: defs.spz.contactPhone } : (saved.spz || defs.spz);

            const mxgEl = document.getElementById('email-recipients-mxg');
            const spzEl = document.getElementById('email-recipients-spz');
            if (mxgEl) mxgEl.value = mxgData.cc.join('\n');
            if (spzEl) spzEl.value = spzData.cc.join('\n');
            
            if (document.getElementById('email-contact-name-mxg')) document.getElementById('email-contact-name-mxg').value = mxgData.contactName || '';
            if (document.getElementById('email-contact-title-mxg')) document.getElementById('email-contact-title-mxg').value = mxgData.contactTitle || '';
            if (document.getElementById('email-contact-email-mxg')) document.getElementById('email-contact-email-mxg').value = mxgData.contactEmail || '';
            if (document.getElementById('email-contact-phone-mxg')) document.getElementById('email-contact-phone-mxg').value = mxgData.contactPhone || '';
            
            if (document.getElementById('email-contact-name-spz')) document.getElementById('email-contact-name-spz').value = spzData.contactName || '';
            if (document.getElementById('email-contact-title-spz')) document.getElementById('email-contact-title-spz').value = spzData.contactTitle || '';
            if (document.getElementById('email-contact-email-spz')) document.getElementById('email-contact-email-spz').value = spzData.contactEmail || '';
            if (document.getElementById('email-contact-phone-spz')) document.getElementById('email-contact-phone-spz').value = spzData.contactPhone || '';
        } catch(e) { console.error('loadEmailRecipients', e); }
    }

    async saveEmailRecipients() {
        try {
            const mxgEl = document.getElementById('email-recipients-mxg');
            const spzEl = document.getElementById('email-recipients-spz');
            
            const mxg = {
                cc: mxgEl ? mxgEl.value.split('\n').map(e => e.trim()).filter(Boolean) : [],
                contactName: document.getElementById('email-contact-name-mxg') ? document.getElementById('email-contact-name-mxg').value.trim() : '',
                contactTitle: document.getElementById('email-contact-title-mxg') ? document.getElementById('email-contact-title-mxg').value.trim() : '',
                contactEmail: document.getElementById('email-contact-email-mxg') ? document.getElementById('email-contact-email-mxg').value.trim() : '',
                contactPhone: document.getElementById('email-contact-phone-mxg') ? document.getElementById('email-contact-phone-mxg').value.trim() : ''
            };
            
            const spz = {
                cc: spzEl ? spzEl.value.split('\n').map(e => e.trim()).filter(Boolean) : [],
                contactName: document.getElementById('email-contact-name-spz') ? document.getElementById('email-contact-name-spz').value.trim() : '',
                contactTitle: document.getElementById('email-contact-title-spz') ? document.getElementById('email-contact-title-spz').value.trim() : '',
                contactEmail: document.getElementById('email-contact-email-spz') ? document.getElementById('email-contact-email-spz').value.trim() : '',
                contactPhone: document.getElementById('email-contact-phone-spz') ? document.getElementById('email-contact-phone-spz').value.trim() : ''
            };
            
            const settingsVal = { mxg, spz };
            
            try {
                const queryFn = window.electron ? window.electron.invoke : null;
                if (queryFn) {
                    await queryFn('supabase:query', {
                        table: 'omnis_app_settings',
                        method: 'upsert',
                        data: { setting_key: 'email_recipients', setting_value: settingsVal }
                    });
                } else if (window.supabase) {
                    await window.supabase.from('omnis_app_settings').upsert({ setting_key: 'email_recipients', setting_value: settingsVal });
                }
            } catch(e) {
                console.error('Error saving to Supabase:', e);
            }
            
            localStorage.setItem('omnis_email_recipients', JSON.stringify(settingsVal));
            this.showToast('Email recipients saved', 'success');
        } catch(e) { this.showToast('Failed to save recipients', 'error'); }
    }

    resetEmailRecipients() {
        const defs  = this._defaultEmailRecipients();
        const mxgEl = document.getElementById('email-recipients-mxg');
        const spzEl = document.getElementById('email-recipients-spz');
        if (mxgEl) mxgEl.value = defs.mxg.cc.join('\n');
        if (spzEl) spzEl.value = defs.spz.cc.join('\n');
        
        if (document.getElementById('email-contact-name-mxg')) document.getElementById('email-contact-name-mxg').value = defs.mxg.contactName;
        if (document.getElementById('email-contact-title-mxg')) document.getElementById('email-contact-title-mxg').value = defs.mxg.contactTitle;
        if (document.getElementById('email-contact-email-mxg')) document.getElementById('email-contact-email-mxg').value = defs.mxg.contactEmail;
        if (document.getElementById('email-contact-phone-mxg')) document.getElementById('email-contact-phone-mxg').value = defs.mxg.contactPhone;
        
        if (document.getElementById('email-contact-name-spz')) document.getElementById('email-contact-name-spz').value = defs.spz.contactName;
        if (document.getElementById('email-contact-title-spz')) document.getElementById('email-contact-title-spz').value = defs.spz.contactTitle;
        if (document.getElementById('email-contact-email-spz')) document.getElementById('email-contact-email-spz').value = defs.spz.contactEmail;
        if (document.getElementById('email-contact-phone-spz')) document.getElementById('email-contact-phone-spz').value = defs.spz.contactPhone;
        
        this.saveEmailRecipients();
    }

    _getRecipients(company) {
        let saved = {};
        try { saved = JSON.parse(localStorage.getItem('omnis_email_recipients') || '{}'); } catch(e) {}
        const defs = this._defaultEmailRecipients();
        
        const mxgData = Array.isArray(saved.mxg) ? { cc: saved.mxg, contactName: defs.mxg.contactName, contactTitle: defs.mxg.contactTitle, contactEmail: defs.mxg.contactEmail, contactPhone: defs.mxg.contactPhone } : (saved.mxg || defs.mxg);
        const spzData = Array.isArray(saved.spz) ? { cc: saved.spz, contactName: defs.spz.contactName, contactTitle: defs.spz.contactTitle, contactEmail: defs.spz.contactEmail, contactPhone: defs.spz.contactPhone } : (saved.spz || defs.spz);

        if (company && company.includes('Sinopower'))
            return { label: 'Sinopower',          emails: spzData.cc, contactName: spzData.contactName, contactTitle: spzData.contactTitle, contactEmail: spzData.contactEmail, contactPhone: spzData.contactPhone };
        return     { label: 'Machinery Exchange', emails: mxgData.cc, contactName: mxgData.contactName, contactTitle: mxgData.contactTitle, contactEmail: mxgData.contactEmail, contactPhone: mxgData.contactPhone };
    }

    _buildEmailHTML(customerName, greetingName, company, machines, doc) {
        const isUnassigned = !company || company.toLowerCase() === 'unassigned';
        const isSino       = !isUnassigned && company.includes('Sinopower');
        
        let brand, colour, logo, contactEmail, contactName, contactTitle;
        const config = this._getRecipients(company);
        
        if (isUnassigned) {
            brand        = 'Unassigned Order';
            colour       = '#475569'; // Neutral slate
            logo         = null;
            contactEmail = '';
            contactName  = 'our Support Team';
            contactTitle = '';
        } else if (isSino) {
            brand        = 'Sinopower';
            colour       = '#7b1515';
            logo         = 'https://pfqaeewmlwfayxbgmuaq.supabase.co/storage/v1/object/public/public-assets/logos/spz-logo.png';
            contactEmail = config.contactEmail;
            contactName  = config.contactName;
            contactTitle = config.contactTitle;
        } else {
            brand        = 'Machinery Exchange';
            colour       = '#c92222';
            logo         = 'https://pfqaeewmlwfayxbgmuaq.supabase.co/storage/v1/object/public/public-assets/logos/mxg-logo.png';
            contactEmail = config.contactEmail;
            contactName  = config.contactName;
            contactTitle = config.contactTitle;
        }

        const fmt = d => {
            if (!d) return '';
            try { const dt = new Date(d); return isNaN(dt) ? d : dt.toLocaleDateString('en-GB', {day:'2-digit',month:'long',year:'numeric'}); }
            catch(e) { return d; }
        };
        const TH = (t, al='left', nw=false) =>
            `<th style="padding:16px 20px;text-align:${al};color:white;font-size:14px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;white-space:${nw?'nowrap':'normal'};border-bottom:2px solid rgba(0,0,0,0.1);">${t}</th>`;
        const TD = (v, al='left', nw=false) =>
            `<td style="padding:16px 20px;text-align:${al};font-size:15px;color:#334155;vertical-align:top;white-space:${nw?'nowrap':'normal'};border-bottom:1px solid #e2e8f0;">${v||''}</td>`;

        const showQty   = machines.some(m=>m.qty)    || doc.quantity;
        const showStat  = machines.some(m=>m.status) || !!doc.status_issue;
        const showProd  = !!doc.production_completion_date;
        const showEtd   = !!doc.estimated_time_of_departure;
        const showEtaB  = !!doc.estimated_time_of_arrival_beira;
        const showEtaH  = !!doc.estimated_time_of_arrival_harare;
        const showThd   = machines.some(m=>m.target)  || doc.target_handover_date;
        const showRthd  = machines.some(m=>m.revised) || doc.revised_target_handover_date;
        const showAhd   = machines.some(m=>m.actual)  || doc.actual_handover_date;
        const showNotes = machines.some(m=>m.notes)   || doc.comment;

        let headers = TH('Machine Details');
        if (showQty)   headers += TH('Qty','center');
        if (showStat)  headers += TH('Status');
        if (showProd)  headers += TH('Production Date','center',true);
        if (showEtd)   headers += TH('Est. Shipping','center',true);
        if (showEtaB)  headers += TH('ETA Beira','center',true);
        if (showEtaH)  headers += TH('ETA Harare','center',true);
        // Merge target+revised into one column header
        if (showThd || showRthd) headers += TH('Target Handover','center',true);
        if (showAhd)   headers += TH('Actual Handover','center',true);
        if (showNotes) headers += TH('Notes');

        const list = machines.length ? machines
            : [{ name: doc.machine||'', serial:'', qty:doc.quantity||'', target:doc.target_handover_date||'', revised:'', actual:'', notes:doc.comment||'' }];

        const rows = list.map((m,i) => {
            const bg = i%2===0 ? '#f5fafd' : '#ffffff';
            const sn = m.serial ? `<div style="color:#64748b;font-size:12px;margin-top:3px;">SN: ${m.serial}</div>` : '';
            // Image thumbnail inline if present - increased size and made clickable
            const imgHtml = m.imageUrl ? `<div style="margin-top:12px;"><a href="${m.imageUrl}" target="_blank" style="display:inline-block;"><img src="${m.imageUrl}" alt="Click to enlarge" style="height:160px;width:auto;border-radius:8px;border:2px solid #cbd5e1;box-shadow:0 3px 10px rgba(0,0,0,0.08);transition:opacity 0.2s;"></a></div>` : '';
            let row = `<td style="padding:20px 24px;font-size:15px;color:#0f172a;font-weight:600;border-bottom:1px solid #cbd5e1;vertical-align:middle;"><strong>${m.name}</strong>${sn}${imgHtml}</td>`;
            if (showQty)   row += `<td style="padding:20px 24px;text-align:center;font-size:15px;color:#334155;vertical-align:middle;border-bottom:1px solid #cbd5e1;">${m.qty||doc.quantity||''}</td>`;
            if (showStat)  row += `<td style="padding:20px 24px;font-size:15px;color:#334155;vertical-align:middle;border-bottom:1px solid #cbd5e1;">${m.status||doc.status_issue||''}</td>`;
            if (showProd)  row += `<td style="padding:20px 24px;text-align:center;font-size:15px;color:#334155;vertical-align:middle;white-space:nowrap;border-bottom:1px solid #cbd5e1;">${fmt(doc.production_completion_date)||'—'}</td>`;
            if (showEtd)   row += `<td style="padding:20px 24px;text-align:center;font-size:15px;color:#334155;vertical-align:middle;white-space:nowrap;border-bottom:1px solid #cbd5e1;">${fmt(doc.estimated_time_of_departure)||'—'}</td>`;
            if (showEtaB)  row += `<td style="padding:20px 24px;text-align:center;font-size:15px;color:#334155;vertical-align:middle;white-space:nowrap;border-bottom:1px solid #cbd5e1;">${fmt(doc.estimated_time_of_arrival_beira)||'—'}</td>`;
            if (showEtaH)  row += `<td style="padding:20px 24px;text-align:center;font-size:15px;color:#334155;vertical-align:middle;white-space:nowrap;border-bottom:1px solid #cbd5e1;">${fmt(doc.estimated_time_of_arrival_harare)||'—'}</td>`;
            // Target handover: if revised exists, show revised in red with badge; else show target
            if (showThd || showRthd) {
                const tDate  = fmt(m.target||doc.target_handover_date);
                const rDate  = fmt(m.revised||doc.revised_target_handover_date);
                if (rDate) {
                    row += `<td style="padding:20px 24px;text-align:center;font-size:15px;color:#334155;vertical-align:middle;white-space:nowrap;border-bottom:1px solid #cbd5e1;">`
                        + `<div style="color:#dc2626;font-weight:700;">${rDate}</div>`
                        + `<div style="display:inline-block;background:#fee2e2;color:#dc2626;font-size:10px;font-weight:800;padding:3px 8px;border-radius:12px;margin-top:5px;text-transform:uppercase;letter-spacing:.05em;">REVISED</div>`
                        + (tDate ? `<div style="color:#94a3b8;font-size:12px;margin-top:6px;text-decoration:line-through;">${tDate}</div>` : '')
                        + `</td>`;
                } else {
                    row += `<td style="padding:20px 24px;text-align:center;font-size:15px;color:#334155;vertical-align:middle;white-space:nowrap;border-bottom:1px solid #cbd5e1;">${tDate||'—'}</td>`;
                }
            }
            if (showAhd)   row += `<td style="padding:20px 24px;text-align:center;font-size:15px;color:#334155;vertical-align:middle;white-space:nowrap;border-bottom:1px solid #cbd5e1;">${fmt(m.actual||doc.actual_handover_date)||'—'}</td>`;
            if (showNotes) row += `<td style="padding:20px 24px;font-size:14px;color:#334155;vertical-align:middle;border-bottom:1px solid #cbd5e1;"><em>${m.notes||doc.comment||''}</em></td>`;
            return `<tr style="background:${bg};">${row}</tr>`;
        }).join('');

        const currentDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
        const orderRef = doc.name ? `<div style="font-size:13px;color:rgba(255,255,255,.9);margin-top:8px;font-weight:600;">Ref: ${doc.name}</div>` : '';

        return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:24px;font-family:Arial,'Helvetica Neue',sans-serif;background:#f0f4f8;">
<div style="max-width:920px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.12);">
  <table style="width:100%;border-collapse:separate; border-spacing:0;background:${colour};" cellpadding="0" cellspacing="0"><tr>
    <td style="padding:24px 32px;vertical-align:middle;width:45%;">
      ${logo ? `<img src="${logo}" alt="${brand}" style="display:block;height:125px;width:auto;max-width:300px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.2));">` : ''}
    </td>
    <td style="padding:24px 32px;vertical-align:middle;text-align:right;width:55%;">
      <div style="font-size:24px;font-weight:800;color:#fff;letter-spacing:-0.5px;">${brand}</div>
      <div style="font-size:13px;color:rgba(255,255,255,.8);margin-top:6px;text-transform:uppercase;letter-spacing:.08em;font-weight:700;">Equipment Order Status Report</div>
      ${orderRef}
      <div style="font-size:13px;color:rgba(255,255,255,.8);margin-top:4px;">Date: ${currentDate}</div>
    </td>
  </tr></table>
  <div style="padding:32px 32px 16px;">
    <p style="margin:0;font-size:16px;color:#0f172a;line-height:1.7;">
      Dear <strong>${greetingName}</strong>,<br><br>
      We hope this email finds you well. Thank you for choosing ${brand === 'Unassigned Order' ? 'us' : brand} as your equipment partner. Please find the latest status update for ${customerName ? customerName + "'s" : "your"} equipment order${doc.name ? ` (Ref: <strong>${doc.name}</strong>)` : ''} detailed below.<br><br>
      We appreciate your continued business and trust in our team. Should you have any questions or require further assistance, please do not hesitate to contact our ${contactTitle ? contactTitle + ', ' : ''}<a href="mailto:${contactEmail}" style="color:${colour};font-weight:700;text-decoration:none;">${contactName}</a>.
    </p>
  </div>
  <div style="padding:16px 32px 36px;overflow-x:auto;">
    <table style="width:100%;border-collapse:separate;border-spacing:0;font-size:15px;border:1px solid #cbd5e1;border-radius:8px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);" cellpadding="0" cellspacing="0">
      <thead><tr style="background:${colour};">${headers}</tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
  <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:12px 28px;font-size:11px;color:#94a3b8;text-align:center;">
    This is an automated update from ${brand}. Please do not reply to this email.
    &copy; ${brand} &mdash; Omnis Order Management System
  </div>
</div></body></html>`;
    }

    async initEmailUpdate(reportId) {
        const btn = document.getElementById('btn-send-email-update');
        const originalHtml = btn ? btn.innerHTML : '';

        // ── 1. Contacts (To) ──────────────────────────────────────────
        const emailContacts = [];
        document.querySelectorAll('#contacts-tbody tr').forEach(row => {
            const sal   = row.querySelector('input[data-field="salutation"]')?.value.trim() || '';
            const name  = row.querySelector('input[data-field="name1"]')?.value.trim() || '';
            const email = row.querySelector('input[data-field="email_address"]')?.value.trim() || '';
            if (email && email.includes('@')) {
                emailContacts.push({ salutation: sal, name: name || 'Valued Customer', email });
            }
        });

        if (emailContacts.length === 0) {
            this.showToast('No email addresses found in contacts. Please add at least one email.', 'error');
            return;
        }

        const recipientList = emailContacts.map(c =>
            `${c.salutation ? c.salutation + ' ' : ''}${c.name} &lt;${c.email}&gt;`
        ).join('<br>');

        const customerName = document.querySelector('#dash-generic-body div[style*="font-size:18px"]')?.textContent.trim()
            || this._currentFullDoc?.customer_name || 'Customer';

        let company = '';
        if (window.olOrdersData) {
            const correctedOrder = window.olOrdersData.find(o => o.report_id === reportId);
            if (correctedOrder && correctedOrder.company) company = correctedOrder.company;
        }
        if (!company) company = this._currentFullDoc?.company || '';
        
        const isSino = company && company.includes('Sinopower');
        const themeColor = isSino ? '#7b1515' : '#c92222';
        const modalHeaderGradient = isSino ? 'linear-gradient(135deg,#7b1515,#450a0a)' : 'linear-gradient(135deg,#1d4ed8,#1e40af)';
        const logoUrl = isSino ? 'https://pfqaeewmlwfayxbgmuaq.supabase.co/storage/v1/object/public/public-assets/logos/spz-logo.png' : 'https://pfqaeewmlwfayxbgmuaq.supabase.co/storage/v1/object/public/public-assets/logos/mxg-logo.png';

        // ── 2. CC from Settings (localStorage) ───────────────────────
        const recipients       = this._getRecipients(company);
        const internalTeamLabel = recipients.label;
        const ccList           = recipients.emails;
        const ccListHtml       = ccList.join(', ');

        // ── 3. Machines from DOM inputs ───────────────────────────────
        const machines = [];
        document.querySelectorAll('#machines-tbody tr').forEach(row => {
            if (row.cells.length < 4) return;
            // Name
            const nameInput = row.cells[0]?.querySelector('input');
            const mName     = nameInput?.value.trim() || row.cells[0]?.innerText.trim().split('\n')[0] || '';
            // Qty
            const qtyInput  = row.cells[1]?.querySelector('input');
            const mQty      = qtyInput?.value.trim() || row.cells[1]?.innerText.trim() || '1';
            // Target date (cell index 2)
            const targetInput  = row.cells[2]?.querySelector('input[type="date"]');
            const mTarget      = targetInput?.value || row.cells[2]?.innerText.trim() || '';
            // Revised date (cell index 3)
            const revisedInput = row.cells[3]?.querySelector('input[type="date"]');
            const mRevised     = revisedInput?.value || row.querySelector('.m-revised')?.value || '';
            // Status (cell index 5 — textarea)
            const statusTA  = row.cells[5]?.querySelector('textarea') || row.querySelector('textarea');
            const mStatus   = statusTA?.value.trim() || '';
            // Image
            const imgEl     = row.querySelector('img.machine-photo, img[data-type="machine"]')
                           || [...(row.querySelectorAll('td img') || [])].find(i => !i.src.includes('placeholder'));
            const mImageUrl = imgEl?.src || '';

            if (mName && mName !== 'Machine / Item') {
                machines.push({ name: mName, qty: mQty, target: mTarget, revised: mRevised, status: mStatus, imageUrl: mImageUrl });
            }
        });

        // ── 4. Preview rows ───────────────────────────────────────────
        const previewRows = machines.map((m, i) => {
            const hasRevised = m.revised && m.revised !== 'dd/mm/yyyy' && m.revised.length > 3;
            const dateCell   = hasRevised
                ? `<span style="color:#ef4444;font-weight:700;">${m.revised}</span> <em style="font-size:11px;color:#ef4444;">(Revised)</em>`
                : (m.target || '—');
            const statusCell = m.status ? `<td style="padding:8px 12px;font-size:12px;color:#475569;">${m.status}</td>` : '';
            return `<tr style="border-bottom:1px solid #f1f5f9;">
                <td style="padding:8px 12px;font-size:13px;font-weight:600;color:#0f172a;">${i + 1}. ${m.name}</td>
                <td style="padding:8px 12px;font-size:13px;color:#475569;text-align:center;">&times;${m.qty}</td>
                <td style="padding:8px 12px;font-size:13px;color:#475569;white-space:nowrap;">${dateCell}</td>
                ${statusCell}
            </tr>`;
        }).join('');

        const existing = document.getElementById('email-preview-modal');
        if (existing) existing.remove();

        const multiNote = emailContacts.length > 1
            ? `<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:12px 16px;font-size:12px;color:#1e40af;">&nbsp;&#x2139;&#xFE0F;&nbsp; A formatted report will be sent to the <strong>${emailContacts.length} recipients</strong> in a single email thread.</div>`
            : '';

        const machineSection = machines.length > 0 ? `
        <div>
            <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Order Contents</div>
            <div style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
                <table style="width:100%;border-collapse:separate; border-spacing:0;">
                    <thead style="background:${themeColor};">
                        <tr>
                            <th style="padding:10px 12px;text-align:left;color:white;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">Machine / Item</th>
                            <th style="padding:10px 12px;text-align:center;color:white;font-size:11px;font-weight:700;text-transform:uppercase;">Qty</th>
                            <th style="padding:10px 12px;text-align:left;color:white;font-size:11px;font-weight:700;text-transform:uppercase;">Target Handover</th>
                            <th style="padding:10px 12px;text-align:left;color:white;font-size:11px;font-weight:700;text-transform:uppercase;">Status</th>
                        </tr>
                    </thead>
                    <tbody>${previewRows}</tbody>
                </table>
            </div>
        </div>` : '';

        document.body.insertAdjacentHTML('beforeend', `
        <div id="email-preview-modal" style="
            position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:20000;
            display:flex; align-items:center; justify-content:center;
            backdrop-filter:blur(6px); animation:fadeIn 0.2s ease;
        ">
            <div style="
                background:white; width:90%; max-width:660px; border-radius:16px;
                box-shadow:0 30px 60px rgba(0,0,0,0.3); overflow:hidden;
                animation:slideUp 0.25s cubic-bezier(0.16,1,0.3,1);
                max-height:90vh; display:flex; flex-direction:column;
            ">
                <div style="background:${modalHeaderGradient}; padding:20px 24px; display:flex; justify-content:space-between; align-items:center; flex-shrink:0;">
                    <div style="display:flex; align-items:center; gap:12px;">
                        <div style="width:40px; height:40px; background:rgba(255,255,255,0.15); border-radius:10px; display:flex; align-items:center; justify-content:center; overflow:hidden;">
                            <img src="${logoUrl}" style="max-width:80%; max-height:80%; object-fit:contain;" />
                        </div>
                        <div>
                            <div style="font-size:17px; font-weight:700; color:white;">Send Email Update</div>
                            <div style="font-size:12px; color:rgba(255,255,255,0.7); margin-top:2px;">Equipment Order Status Report</div>
                        </div>
                    </div>
                    <button onclick="document.getElementById('email-preview-modal').remove()" style="background:rgba(255,255,255,0.1); border:none; color:white; width:32px; height:32px; border-radius:8px; font-size:18px; cursor:pointer;">&times;</button>
                </div>
                <div style="padding:24px; display:flex; flex-direction:column; gap:16px; overflow-y:auto;">
                    <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:10px; padding:14px 16px;">
                        <div style="font-size:11px; font-weight:700; color:#1d4ed8; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px;">&#128236; Customers (To)</div>
                        <div style="font-size:13px; color:#1e40af; font-weight:500; line-height:1.8; margin-bottom:12px;">${recipientList}</div>
                        <div style="font-size:11px; font-weight:700; color:#1d4ed8; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">&#128101; ${internalTeamLabel} (CC)</div>
                        <div style="font-size:12px; color:#3b82f6; font-weight:400; line-height:1.6;">${ccListHtml}</div>
                    </div>
                    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:14px 16px;">
                        <div style="font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">Subject</div>
                        <div style="font-size:13px; color:#0f172a; font-weight:600;">Order Status Report &mdash; ${customerName}</div>
                    </div>
                    ${machineSection}
                    ${multiNote}
                    <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:10px; padding:12px 16px; display:flex; gap:10px; align-items:flex-start;">
                        <span style="font-size:15px; flex-shrink:0;">&#128203;</span>
                        <div style="font-size:12px; color:#166534; line-height:1.5;">
                            The email will be sent as a <strong>formatted Equipment Order Status Report</strong> including all available logistics dates, handover dates (revised dates highlighted in red), machine status, and attached images.
                        </div>
                    </div>
                    <div style="display:flex; gap:12px; justify-content:flex-end; padding-top:8px; border-top:1px solid #f1f5f9;">
                        <button onclick="document.getElementById('email-preview-modal').remove()" style="padding:10px 24px; border:1px solid #e2e8f0; background:white; color:#64748b; border-radius:8px; font-size:14px; font-weight:600; cursor:pointer;">Cancel</button>
                        <button id="btn-confirm-send-email" style="padding:10px 28px; background:#1d4ed8; color:white; border:none; border-radius:8px; font-size:14px; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:8px; box-shadow:0 4px 14px rgba(29,78,216,0.3);">
                            <span>&#128231;</span> Send Now
                        </button>
                    </div>
                </div>
            </div>
        </div>`);

        document.getElementById('btn-confirm-send-email').onclick = () => {
            document.getElementById('email-preview-modal').remove();
            this.sendEmailUpdate(btn, originalHtml, emailContacts, reportId, customerName, company, machines, ccList);
        };
    }
    async sendEmailUpdate(btn, originalHtml, emailContacts, reportId, customerName, company, machines, ccList) {
        if (btn) { btn.disabled = true; btn.innerHTML = `<span>&#9203;</span> Checking...`; }
        try {
            // Check if already sent
            if (window.electron) {
                const checkRes = await window.electron.invoke('supabase:query', {
                    table: 'omnis_salestrack_notifications', method: 'select', params: { columns: 'notified_email', filters: { report_id: reportId } }
                });
                if (checkRes && checkRes.data && checkRes.data.length > 0 && checkRes.data[0].notified_email) {
                    const confirmResend = confirm("⚠️ You have already sent an email for this order.\nAre you sure you want to send another one?");
                    if (!confirmResend) {
                        if (btn) { btn.disabled = false; btn.innerHTML = originalHtml || `<span style="font-size:18px;">&#128231;</span> Send Email`; }
                        return;
                    }
                }
            }

            const recipientEmails = emailContacts.map(c => c.email).join(',');
            const namesList = emailContacts.map(c => c.salutation ? `${c.salutation} ${c.name}` : c.name);
            let greetingName = 'Valued Customer';
            if (namesList.length === 1) {
                greetingName = namesList[0];
            } else if (namesList.length === 2) {
                greetingName = `${namesList[0]} and ${namesList[1]}`;
            } else if (namesList.length > 2) {
                const last = namesList.pop();
                greetingName = `${namesList.join(', ')} and ${last}`;
            }
            const subject = `Order Status Report \u2014 ${customerName}`;
            const doc = this._currentFullDoc || {};
            const enriched = machines.map(m => {
                const dm = (doc.machines || []).find(d => {
                    const n = d.item_name || d.item || '';
                    return n.includes(m.name) || m.name.includes(n);
                });
                return { ...m, actual: dm?.actual_handover_date || '', notes: dm?.notes || '' };
            });
            const html = this._buildEmailHTML(customerName, greetingName, company, enriched, doc);
            
            // USE OUTBOX QUEUE INSTEAD OF SENDING IMMEDIATELY
            const payload = {
                to: recipientEmails, cc: ccList.join(','), subject, html,
                relatedDoc: reportId, relatedType: 'order'
            };
            
            if (window.OutboxManager) {
                window.OutboxManager.addToQueue('email', payload, `Email to ${customerName}`, `To: ${recipientEmails}`);
                if (btn) btn.innerHTML = `<span>&#9989;</span> Queued!`;
            } else {
                // Fallback
                if (!window.electron || !window.electron.invoke) throw new Error('Electron IPC unavailable');
                const res = await window.electron.invoke('email:send', payload);
                if (res && res.ok) {
                    if (btn) btn.innerHTML = `<span>&#9989;</span> Sent!`;
                    this.showToast(`Email sent for ${emailContacts.length} recipient${emailContacts.length > 1 ? 's' : ''}!`, 'success');
                } else {
                    throw new Error(res?.error || 'Failed to send email.');
                }
            }
            
            setTimeout(() => { if (btn) { btn.disabled = false; btn.innerHTML = originalHtml || `<span style="font-size:18px;">&#128231;</span> Send Email`; } }, 3000);
            return; // Exit normal flow

        } catch (err) {
            console.error('[Email Update Error]', err);
            this.showToast('Email failed: ' + err.message, 'error');
            if (btn) {
                btn.innerHTML = `<span>&#10060;</span> Error`;
                setTimeout(() => { btn.disabled = false; btn.innerHTML = originalHtml || `<span style="font-size:18px;">&#128231;</span> Send Email`; }, 3000);
            }
        }
    }

    /**
     * Dynamically parses RELEASE_NOTES.md and updates the settings UI
     */
    async loadReleaseNotes() {
        const container = document.getElementById('update-changelog');
        if (!container) return;

        try {
            // Fetch relative to app root
            const response = await fetch('../../RELEASE_NOTES.md');
            if (!response.ok) throw new Error("Stream unreachable");

            const text = await response.text();

            // Extract "What's New" section
            const startMarker = "## 🚀 What's New";
            const endMarker = "---";

            const startIndex = text.indexOf(startMarker);
            if (startIndex === -1) throw new Error("Changelog format mismatch");

            let relevantContent = text.substring(startIndex + startMarker.length);
            const endIndex = relevantContent.indexOf(endMarker);
            if (endIndex !== -1) {
                relevantContent = relevantContent.substring(0, endIndex);
            }

            // Simple parser for markdown-ish lines
            const lines = relevantContent.split('\n').filter(l => l.trim() !== "");
            let html = "";

            lines.forEach(line => {
                const trimmed = line.trim();
                if (trimmed.startsWith('###')) {
                    const title = trimmed.replace('###', '').trim();
                    html += `<div style="font-size:12px; font-weight:850; color:#0f172a; margin-top:8px; border-left:3px solid #2563eb; padding-left:8px; text-transform:uppercase; letter-spacing:0.5px;">${title}</div>`;
                } else if (trimmed.startsWith('*')) {
                    const content = trimmed.replace('*', '').trim();
                    // Basic bold parsing
                    const boldContent = content.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
                    html += `
                        <div style="display:flex; gap:10px; align-items:flex-start; background:white; padding:12px; border-radius:10px; border:1px solid #e2e8f0; transition:all 0.2s; cursor:default;" onmouseover="this.style.borderColor='#2563eb'; this.style.transform='translateX(4px)'" onmouseout="this.style.borderColor='#e2e8f0'; this.style.transform='translateX(0)'">
                            <div style="color:#2563eb; font-size:10px; margin-top:2px;">&#x2714;</div>
                            <div style="font-size:12px; color:#475569; line-height:1.5; font-weight:500;">${boldContent}</div>
                        </div>
                    `;
                }
            });

            if (html === "") html = `<div style="padding:20px; text-align:center; color:#94a3b8; font-size:12px;">No specific features listed for this version.</div>`;
            container.innerHTML = html;

        } catch (err) {
            console.warn("[ReleaseNotes] Fetch failed:", err.message);
            container.innerHTML = `<div style="padding:20px; text-align:center; color:#94a3b8; font-size:12px;">Operational log unavailable (${err.message}).</div>`;
        }
    }

    /**
     * Switches between settings tabs
     * @param {string} tabId - connectivity, maintenance, intelligence, security
     */
    setSettingsTab(tabId) {
        // 1. Toggle Content
        const contents = document.querySelectorAll('.settings-tab-content');
        contents.forEach(c => c.classList.add('hidden'));

        const activeContent = document.getElementById(`settings-tab-${tabId}`);
        if (activeContent) activeContent.classList.remove('hidden');

        // 2. Toggle Button Styles
        const buttons = document.querySelectorAll('.settings-tab-btn');
        buttons.forEach(btn => {
            if (btn.dataset.tab === tabId) {
                btn.style.background = 'white';
                btn.style.color = '#0f172a';
                btn.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
            } else {
                btn.style.background = 'transparent';
                btn.style.color = '#64748b';
                btn.style.boxShadow = 'none';
            }
        });

        if (window.omnisLog) window.omnisLog(`[Settings] Switched to tab: ${tabId.toUpperCase()}`);

        // 3. Side-effects per tab
        if (tabId === 'brand-mappings') {
            if (window.salestrack && typeof window.salestrack.loadStockMappings === 'function') {
                window.salestrack.loadStockMappings();
            }
        }
    }

    /* ---------- SECURITY & INACTIVITY LOGIC ---------- */

    initInactivityTimer() {
        this.IDLE_TIMEOUT = 15 * 60 * 1000; // 15 mins
        this.WARNING_BUFFER = 60 * 1000; // 1 min warning
        this.idleTimer = null;
        this.warningTimer = null;

        ['mousemove', 'mousedown', 'keypress', 'touchstart', 'scroll'].forEach(evt => {
            window.addEventListener(evt, () => this.resetIdleTimer(), true);
        });

        this.resetIdleTimer();
    }

    resetIdleTimer() {
        clearTimeout(this.idleTimer);
        clearTimeout(this.warningTimer);

        // Warning at 14 minutes
        this.warningTimer = setTimeout(() => {
            this.showInactivityWarning();
        }, this.IDLE_TIMEOUT - this.WARNING_BUFFER);

        // Logout at 15 minutes
        this.idleTimer = setTimeout(() => {
            console.log("Forced logout due to inactivity.");
            if (window.frappeAPI && window.frappeAPI.logout) {
                window.frappeAPI.logout();
            } else {
                window.location.href = "../../index.html"; // Redirect to login
            }
        }, this.IDLE_TIMEOUT);
    }

    showInactivityWarning() {
        const overlay = document.getElementById('inactivity-warning-overlay');
        if (overlay) overlay.classList.remove('hidden');

        let secondsLeft = 60;
        const countdownEl = document.getElementById('inactivity-countdown');
        if (countdownEl) countdownEl.innerText = secondsLeft;

        const countdownInterval = setInterval(() => {
            secondsLeft--;
            if (countdownEl) countdownEl.innerText = secondsLeft;
            if (secondsLeft <= 0 || !overlay || overlay.classList.contains('hidden')) {
                clearInterval(countdownInterval);
            }
        }, 1000);
    }

    dismissInactivityWarning() {
        const overlay = document.getElementById('inactivity-warning-overlay');
        if (overlay) overlay.classList.add('hidden');
        this.resetIdleTimer();
    }

    async requestPasswordReset() {
        const userEmail = localStorage.getItem("omnisUser") || (typeof frappe !== "undefined" && frappe.session && frappe.session.user);

        if (!userEmail || userEmail === "Guest") {
            this.showToast("Could not identify user for password reset.", "error");
            return;
        }

        const confirmReset = await this.confirm("Reset Password", `Are you sure you want to request a password reset for ${userEmail}? A link will be sent to your email.`);
        if (!confirmReset) return;

        try {
            const baseUrl = window.CURRENT_SYSTEM ? window.CURRENT_SYSTEM.baseUrl : "https://salestrack.powerstar.co.zw";
            const url = baseUrl + "/api/method/powerstar_salestrack.omnis_dashboard.trigger_password_reset";

            const params = new URLSearchParams();
            params.append('user_email', userEmail);

            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: params.toString()
            });
            const data = await res.json();

            if (data.message && data.message.ok) {
                this.showToast("Reset instructions sent! Check your email.", "success");
            } else {
                this.showToast("Error: " + (data.message?.error || "Failed to trigger reset"), "error");
            }
        } catch (err) {
            console.error("Password reset error:", err);
            this.showToast("Could not connect to security service.", "error");
        }
    }

    updateApiMetricsUI() {
        if (!window.apiMetrics) return;

        const dot = document.getElementById("api-health-dot");
        const status = document.getElementById("api-health-status");
        const latency = document.getElementById("api-health-latency");
        const success = document.getElementById("api-health-success");
        const requests = document.getElementById("api-health-requests");
        const last = document.getElementById("api-health-last");
        const error = document.getElementById("api-health-error");

        if (status) status.innerText = window.apiMetrics.status;
        if (latency) latency.innerText = window.apiMetrics.avgLatency || 0;
        if (requests) requests.innerText = window.apiMetrics.totalRequests;
        if (last) last.innerText = window.apiMetrics.lastRequestAt || "Never";
        if (error) error.innerText = window.apiMetrics.lastError || "";

        if (success) {
            const rate = window.apiMetrics.totalRequests > 0
                ? Math.round((window.apiMetrics.successfulRequests / window.apiMetrics.totalRequests) * 100)
                : 100;
            success.innerText = rate;
            success.style.color = rate < 90 ? "#ef4444" : "#0f172a";
        }

        if (dot) {
            if (window.apiMetrics.status === "Healthy") dot.style.background = "#10b981";
            else if (window.apiMetrics.status === "Degraded") dot.style.background = "#f59e0b";
            else dot.style.background = "#ef4444";
        }
    }

    async pingApiHandshake() {
        this.showToast("Pinging Command Center...", "info");
        try {
            const sys = window.CURRENT_SYSTEM;
            const res = await window.callFrappeSequenced(sys.baseUrl, "frappe.auth.get_logged_user", {});
            if (res) {
                this.showToast("API Handshake Successful", "success");
            }
        } catch (e) {
            this.showToast("Ping Failed: " + e.message, "error");
        }
        this.updateApiMetricsUI();
    }

    // --- Migration Engine ---
    async startFullMigration() {
        if (this._migrationRunning) {
            this._migrationPaused = false;
            this.updateMigrationUI("Resuming...");
            return;
        }

        const btnStart = document.getElementById('btn-start-migration');
        const btnPause = document.getElementById('btn-pause-migration');
        const pill = document.getElementById('migration-status-pill');

        try {
            this._migrationRunning = true;
            this._migrationPaused = false;
            this._migrationStartTime = Date.now();
            this._migrationSyncedCount = 0;
            this._migrationFailedCount = 0;

            if (btnStart) { btnStart.disabled = true; btnStart.innerHTML = '<i class="fas fa-spinner fa-spin"></i> SYNCING...'; }
            if (btnPause) { btnPause.disabled = false; btnPause.style.cursor = 'pointer'; }
            if (pill) { pill.innerText = "In Progress"; pill.style.background = "#dcfce7"; pill.style.color = "#166534"; }

            this.updateMigrationUI("Initializing Connection...");

            // 1. Get Total Count
            const sys = window.getCurrentSystem ? window.getCurrentSystem() : { baseUrl: "https://salestrack.powerstar.co.zw" };
            const countRes = await window.callFrappeSequenced(sys.baseUrl, "powerstar_salestrack.omnis_dashboard.get_omnis_orders", { start: 0, page_length: 1 });
            const total = countRes.message?.total_count || 4500; // Fallback
            this._migrationTotal = total;

            const totalEl = document.getElementById('migration-stat-total');
            if (totalEl) totalEl.innerText = total.toLocaleString();

            // 2. Loop Batches
            let offset = 0;
            const batchSize = 50;

            while (offset < total) {
                if (this._migrationPaused) {
                    this.updateMigrationUI("Paused");
                    break;
                }

                const batchLabel = document.getElementById('migration-batch-label');
                if (batchLabel) batchLabel.innerText = `Batch ${Math.floor(offset / batchSize) + 1} / ${Math.ceil(total / batchSize)}`;

                // Fetch Batch
                this.updateMigrationUI(`Fetching records ${offset} to ${offset + batchSize}...`);
                const batchRes = await window.callFrappeSequenced(sys.baseUrl, "powerstar_salestrack.omnis_dashboard.get_omnis_orders", {
                    start: offset,
                    page_length: batchSize
                });

                const orders = batchRes.message?.data || [];
                if (orders.length === 0) break;

                // Sync each order in batch
                for (const order of orders) {
                    if (this._migrationPaused) break;

                    try {
                        const detailRes = await window.callFrappeSequenced(sys.baseUrl, "powerstar_salestrack.omnis_dashboard.get_order_details", {
                            report_id: order.name
                        });

                        if (detailRes.message?.ok) {
                            await this.syncToSupabase(order.name, {
                                status: detailRes.message.data.status,
                                customer_id: detailRes.message.data.customer_name,
                                owner: detailRes.message.data.owner,
                                company: detailRes.message.data.company,
                                contacts: detailRes.message.data.contacts || [],
                                machines: detailRes.message.data.machines || []
                            });
                            this._migrationSyncedCount++;
                        } else {
                            this._migrationFailedCount++;
                        }
                    } catch (err) {
                        console.error("Batch item sync failed", err);
                        this._migrationFailedCount++;
                    }

                    // Update Progress UI
                    this.refreshMigrationProgress(offset + orders.indexOf(order) + 1, total);
                }

                offset += batchSize;
                await new Promise(r => setTimeout(r, 1000)); // Delay
            }

            if (!this._migrationPaused) {
                this.updateMigrationUI("Migration Complete!");
                if (pill) { pill.innerText = "Completed"; pill.style.background = "#10b981"; pill.style.color = "white"; }
            }

        } catch (e) {
            console.error("Migration Fatal Error", e);
            this.updateMigrationUI("Fatal Error: " + e.message);
        } finally {
            this._migrationRunning = false;
            if (btnStart) { btnStart.disabled = false; btnStart.innerHTML = '<i class="fas fa-play"></i> START HISTORICAL SYNC'; }
        }
    }

    pauseMigration() {
        this._migrationPaused = true;
        const pill = document.getElementById('migration-status-pill');
        if (pill) { pill.innerText = "Paused"; pill.style.background = "#fef9c3"; pill.style.color = "#854d0e"; }
    }

    refreshMigrationProgress(current, total) {
        const pct = Math.floor((current / total) * 100);
        const bar = document.getElementById('migration-progress-bar');
        const pctText = document.getElementById('migration-percent');
        const syncedStat = document.getElementById('migration-stat-synced');
        const failedStat = document.getElementById('migration-stat-failed');
        const etaText = document.getElementById('migration-eta');

        if (bar) bar.style.width = pct + '%';
        if (pctText) pctText.innerText = pct + '%';
        if (syncedStat) syncedStat.innerText = this._migrationSyncedCount.toLocaleString();
        if (failedStat) failedStat.innerText = this._migrationFailedCount.toLocaleString();

        const elapsed = (Date.now() - this._migrationStartTime) / 1000;
        const rate = current / elapsed;
        if (rate > 0) {
            const remaining = total - current;
            const secondsLeft = Math.round(remaining / rate);
            const h = Math.floor(secondsLeft / 3600);
            const m = Math.floor((secondsLeft % 3600) / 60);
            const s = secondsLeft % 60;
            if (etaText) etaText.innerText = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
    }

    updateMigrationUI(msg) {
        const detail = document.getElementById('migration-detail-text');
        if (detail) detail.innerText = msg;
    }

    // ---------- DEFECTS LOGIC (SIMPLIFIED) ----------
    async openDefectsModal(machineName, orderId, customerName) {
        if (!machineName) machineName = "Unknown Machine";
        if (!orderId) orderId = "Unknown Order";
        
        const overlay = document.getElementById('defects-modal-overlay');
        if (!overlay) return;
        
        document.getElementById('defect-machine-name').textContent = machineName;
        
        // Setup hidden fields for saving
        document.getElementById('defect-input-machine').value = machineName;
        document.getElementById('defect-input-orderid').value = orderId;
        document.getElementById('defect-input-customer').value = customerName;
        
        overlay.classList.remove('hidden');
        overlay.style.display = 'flex';
        overlay.style.zIndex = '9999999';
        
        this.loadDefectsForMachine(machineName, orderId);
    }
    
    closeDefectsModal() {
        const overlay = document.getElementById('defects-modal-overlay');
        if (overlay) overlay.classList.add('hidden');
    }
    
    async loadDefectsForMachine(machineName, orderId) {
        const tbody = document.getElementById('defects-tbody');
        if (!tbody) return;
        
        tbody.innerHTML = `<tr><td style="text-align:center; padding:20px; color:#64748b;">Loading defects...</td></tr>`;
        
        try {
            if (!window.electron) throw new Error("Electron not available");
            const res = await window.electron.invoke('supabase:query', {
                table: 'ft_defect',
                method: 'select',
                params: { filters: { machine: machineName, order_id: orderId, status: 'Open' } }
            });
            
            if (res.error) throw new Error(res.error);
            
            const defects = res.data || [];
            
            if (defects.length === 0) {
                tbody.innerHTML = `<tr><td style="text-align:center; padding:20px; color:#64748b;">No defects logged for this machine.</td></tr>`;
                return;
            }
            
            tbody.innerHTML = defects.map(d => {
                const dateStr = d.start_date ? new Date(d.start_date).toLocaleDateString('en-GB') : '';
                return `
                <tr style="border-bottom:1px solid #f1f5f9; background:white;">
                    <td style="padding:12px; font-size:13px; color:#0f172a; line-height:1.4; position:relative;">
                        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px;">
                            <div>
                                <span style="font-size:10px; font-weight:700; color:#94a3b8; display:block; margin-bottom:4px;">${dateStr}</span>
                                ${d.description}
                            </div>
                            <button onclick="salestrack.markDefectClosed(${d.id}, '${machineName.replace(/'/g, "\\'")}', '${orderId.replace(/'/g, "\\'")}')" title="Remove" style="background:#fef2f2; border:1px solid #fecaca; border-radius:6px; padding:6px 10px; font-size:12px; font-weight:600; cursor:pointer; color:#ef4444; flex-shrink:0; transition:all 0.2s hover:bg-red-50;"><i class="fas fa-trash"></i></button>
                        </div>
                    </td>
                </tr>
                `;
            }).join('');
            
        } catch(e) {
            console.error("Load defects error:", e);
            tbody.innerHTML = `<tr><td style="text-align:center; padding:20px; color:#ef4444;">Failed to load defects: ${e.message}</td></tr>`;
        }
    }
    
    async saveNewDefect() {
        const descInput = document.getElementById('defect-new-desc');
        const machineName = document.getElementById('defect-input-machine').value;
        const orderId = document.getElementById('defect-input-orderid').value;
        const customerName = document.getElementById('defect-input-customer').value;
        
        const desc = descInput.value.trim();
        if (!desc) return alert("Please enter a description.");
        
        const btn = document.getElementById('btn-save-defect');
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; }
        
        try {
            if (!window.electron) throw new Error("Electron not available");
            
            const payload = {
                machine: machineName,
                order_id: orderId,
                customer: customerName,
                description: desc,
                priority: 'Low',
                defect_type: 'Minor',
                status: 'Open',
                start_date: new Date().toISOString().split('T')[0]
            };
            
            const res = await window.electron.invoke('supabase:query', {
                table: 'ft_defect',
                method: 'insert',
                params: { data: payload }
            });
            
            if (res.error) throw new Error(res.error);
            
            // Clear inputs
            descInput.value = '';
            
            // Reload table
            this.loadDefectsForMachine(machineName, orderId);
            
        } catch(e) {
            console.error("Save defect error:", e);
            alert("Error saving defect: " + e.message);
        } finally {
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-plus"></i> Add'; }
        }
    }
    
    async markDefectClosed(defectId, machineName, orderId) {
        if (!confirm("Remove this defect from the list?")) return;
        
        try {
            if (!window.electron) throw new Error("Electron not available");
            const res = await window.electron.invoke('supabase:query', {
                table: 'ft_defect',
                method: 'update',
                params: { data: { status: 'Closed', closed_date: new Date().toISOString().split('T')[0] }, match: { id: defectId } }
            });
            
            if (res.error) throw new Error(res.error);
            this.loadDefectsForMachine(machineName, orderId);
        } catch(e) {
            console.error("Close defect error:", e);
            alert("Error removing defect: " + e.message);
        }
    }

}



// ─────────────────────────────────────────────────────────────────────────────
// OEM REPORTS — Global helper functions (defined AFTER the main class)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Renders the OEM Performance Breakdown table into `container`.
 * Called from OmnisDashboardV6.renderOEMChart() after data is loaded.
 *
 * @param {HTMLElement} container - Target DOM element (widget-oem-kpis)
 * @param {Array}       oemData   - Array of OEM objects from dashboard data
 * @param {string}      period    - Human-readable period label (e.g. "This Year")
 */
window._renderOEMProcurementTable = function (container, oemData, period) {
    if (!container) return;

    if (!oemData || oemData.length === 0) {
        container.innerHTML = `
            <div style="padding:40px; text-align:center; color:#94a3b8; font-size:13px;">
                No OEM data available.
            </div>`;
        return;
    }

    const totalSales  = oemData.reduce((a, b) => a + (b.sales  || b.total_qty || 0), 0);
    const totalQuotes = oemData.reduce((a, b) => a + (b.quotes || 0), 0);
    const totalConv   = totalQuotes > 0 ? ((totalSales / totalQuotes) * 100).toFixed(1) + '%' : '—';

    const sorted = [...oemData].sort(
        (a, b) => (b.sales || b.total_qty || 0) - (a.sales || a.total_qty || 0)
    );

    const rows = sorted.map(d => {
        const sales    = d.sales || d.total_qty || 0;
        const quotes   = d.quotes || 0;
        const convRate = quotes > 0 ? ((sales / quotes) * 100).toFixed(1) : null;
        const convDisp = convRate ? `${convRate}%` : '—';
        const sharePct = totalSales > 0 ? ((sales / totalSales) * 100).toFixed(1) : 0;
        const barWidth = totalSales > 0 ? Math.round((sales / totalSales) * 100) : 0;

        const convColor = !convRate          ? '#94a3b8'
            : parseFloat(convRate) >= 20     ? '#10b981'
            : parseFloat(convRate) >= 10     ? '#f59e0b'
            :                                  '#ef4444';

        // onclick uses data-oem attribute to avoid quote-escaping inside HTML
        return `
            <tr class="oem-perf-row"
                data-oem="${d.oem.replace(/"/g, '&quot;')}"
                data-sales="${sales}"
                data-quotes="${quotes}"
                onmouseout="this.style.background=''"
                onmouseover="this.style.background='#f8fafc'"
                onclick="window._oemRowClick(this)"
                style="border-bottom:1px solid #f1f5f9; cursor:pointer;">
                <td style="padding:10px 14px; font-weight:700; color:#0f172a;">
                    <div style="font-size:13px;">${d.oem}</div>
                    <div style="margin-top:5px; height:4px; background:#f1f5f9; border-radius:4px; overflow:hidden; width:120px;">
                        <div style="height:100%; width:${barWidth}%; background:linear-gradient(90deg,#8b2219,#c0392b); border-radius:4px;"></div>
                    </div>
                </td>
                <td style="padding:10px 14px; text-align:center; font-weight:800; font-size:15px; color:#0f172a;">${sales}</td>
                <td style="padding:10px 14px; text-align:center; font-weight:600; color:#475569;">${quotes}</td>
                <td style="padding:10px 14px; text-align:center;">
                    <span style="font-size:12px; font-weight:800; color:${convColor};">${convDisp}</span>
                </td>
                <td style="padding:10px 14px; text-align:right; font-size:12px; font-weight:700; color:#64748b;">${sharePct}%</td>
                <td style="padding:10px 14px; text-align:center;">
                    <button class="oem-view-btn"
                            data-oem="${d.oem.replace(/"/g, '&quot;')}"
                            data-sales="${sales}"
                            data-quotes="${quotes}"
                            onclick="event.stopPropagation(); window._oemRowClick(this)"
                            style="padding:4px 10px; background:#8b2219; color:#fff; border:none; border-radius:6px;
                                   font-size:11px; font-weight:700; cursor:pointer; white-space:nowrap;"
                            onmouseover="this.style.background='#6d1a14'"
                            onmouseout="this.style.background='#8b2219'">
                        View Report
                    </button>
                </td>
            </tr>`;
    }).join('');

    container.innerHTML = `
        <div style="background:#fff; border:1px solid #e2e8f0; border-radius:14px;
                    overflow:hidden; box-shadow:0 1px 4px rgba(0,0,0,0.04);">
            <div style="padding:16px 20px; border-bottom:1px solid #f1f5f9;
                        display:flex; align-items:center; justify-content:space-between;">
                <h3 style="margin:0; font-size:13px; font-weight:800; color:#0f172a;
                            text-transform:uppercase; letter-spacing:0.06em;">
                    <i class="fas fa-table" style="color:#8b2219; margin-right:8px;"></i>
                    OEM Performance Breakdown
                </h3>
                <span style="font-size:11px; color:#94a3b8; font-weight:600;">${period}</span>
            </div>
            <div style="overflow-x:auto;">
                <table style="width:100%; border-collapse:collapse; font-size:13px;">
                    <thead>
                        <tr style="background:#f8fafc;">
                            <th style="padding:10px 14px; text-align:left;   font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.05em;">OEM / Brand</th>
                            <th style="padding:10px 14px; text-align:center; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase;">Sales</th>
                            <th style="padding:10px 14px; text-align:center; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase;">Quotes</th>
                            <th style="padding:10px 14px; text-align:center; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase;">Conv %</th>
                            <th style="padding:10px 14px; text-align:right;  font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase;">Share</th>
                            <th style="padding:10px 14px; text-align:center; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase;">Action</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                    <tfoot>
                        <tr style="background:#f8fafc; border-top:2px solid #e2e8f0;">
                            <td style="padding:10px 14px; font-weight:900; font-size:13px; color:#0f172a;">TOTAL</td>
                            <td style="padding:10px 14px; text-align:center; font-weight:900; font-size:15px; color:#8b2219;">${totalSales}</td>
                            <td style="padding:10px 14px; text-align:center; font-weight:700; color:#475569;">${totalQuotes}</td>
                            <td style="padding:10px 14px; text-align:center; font-weight:800; color:#10b981; font-size:12px;">${totalConv}</td>
                            <td style="padding:10px 14px; text-align:right;  font-weight:700; color:#64748b;">100%</td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>`;
};

/**
 * Opens the OEM breakdown modal for the OEM named in a row's data-oem attribute.
 * Used by oem-perf-row rows and View Report buttons to avoid inline quote issues.
 *
 * @param {HTMLElement} el - The clicked row or button element
 */
window._oemRowClick = function (el) {
    const row = el.closest('[data-oem]') || el;
    const oem = row.getAttribute('data-oem');
    const salesStr = row.getAttribute('data-sales');
    const quotesStr = row.getAttribute('data-quotes');
    
    let dashboardTotals = null;
    if (salesStr !== null && quotesStr !== null) {
        dashboardTotals = {
            ytdSales: Number(salesStr) || 0,
            ytdQuotes: Number(quotesStr) || 0
        };
    }

    if (oem && window.salestrack && window.salestrack.openOEMBreakdownModal) {
        window.salestrack.openOEMBreakdownModal(oem, null, null, null, dashboardTotals);
    } else if (oem && window.omnisDashboard && window.omnisDashboard.openOEMBreakdownModal) {
        window.omnisDashboard.openOEMBreakdownModal(oem, null, null, null, dashboardTotals);
    }
};

/**
 * Toggles the "Hot Lead" flag for a Quotation, persisted in localStorage.
 * Called from the 3-dots action menu on the Quotations Details tab.
 *
 * @param {string}          docname - Quotation name (e.g. "SAL-QTN-2026-00042")
 * @param {boolean|string}  isHot   - Current hot state (true = currently hot, will remove)
 * @param {Event}           event   - Click event (stopped from bubbling)
 */
window.toggleQuoteHot = function (docname, isHot, event) {
    if (event) event.stopPropagation();
    try {
        let hotCache = {};
        try { hotCache = JSON.parse(localStorage.getItem('local_hot_leads') || '{}'); } catch (e) { /* ignore parse errors */ }

        if (isHot === true || isHot === 'true') {
            delete hotCache[docname];
        } else {
            hotCache[docname] = true;
        }
        localStorage.setItem('local_hot_leads', JSON.stringify(hotCache));

        // Refresh the currently open OEM modal so the hot badge updates immediately
        const titleEl = document.querySelector('.modal-title');
        if (!titleEl) return;
        const oemName = titleEl.innerText
            .replace('Details: ', '')
            .replace('Management Report: ', '')
            .trim();
        const periodFilter = document.getElementById('oem-period-filter');
        const period = periodFilter ? periodFilter.value : 'This Year';

        if (window.salestrack && window.salestrack.openOEMBreakdownModal) {
            window.salestrack.openOEMBreakdownModal(oemName, period);
        } else if (window.omnisDashboard && window.omnisDashboard.openOEMBreakdownModal) {
            window.omnisDashboard.openOEMBreakdownModal(oemName, period);
        }
    } catch (err) {
        console.error('toggleQuoteHot failed:', err);
    }
};

// Initialize settings on load
document.addEventListener('DOMContentLoaded', () => {
    if (window.salestrack) {
        window.salestrack.loadSettings();
    }
});

// Handle AI-triggered actions from Chat
window.handleChatAction = function (structured) {
    if (!structured || !structured.action) return;

    if (structured.action === "create_quote") {
        const params = structured.parameters || {};
        if (window.switchToView) window.switchToView('view-create-quotation');

        // Small delay to ensure view is visible and scripts are ready
        setTimeout(() => {
            if (window.resetQtnForm) window.resetQtnForm();

            const custInp = document.getElementById("qtn-customer");
            const custNameInp = document.getElementById("qtn-customer-name");
            if (custInp) custInp.value = params.customer || "";
            if (custNameInp) custNameInp.value = params.customer || "";

            if (params.items && params.items.length > 0) {
                const tbody = document.getElementById("qtn-items-body");
                if (tbody) tbody.innerHTML = ""; // Clear initial empty row

                params.items.forEach(it => {
                    if (window.addQuotationItemRow) {
                        window.addQuotationItemRow();
                        const lastRow = tbody.lastElementChild;
                        if (lastRow) {
                            const codeInp = lastRow.querySelector(".item-code");
                            const qtyInp = lastRow.querySelector(".item-qty");
                            const rateInp = lastRow.querySelector(".item-rate");
                            if (codeInp) codeInp.value = it.item_code || "";
                            if (qtyInp) qtyInp.value = it.qty || 1;
                            if (rateInp && it.rate) rateInp.value = it.rate;

                            // Trigger rate fetch if not provided
                            if (codeInp && !it.rate) {
                                codeInp.dispatchEvent(new Event('input'));
                            }
                        }
                    }
                });
                if (window.calculateQuotationTotals) window.calculateQuotationTotals();
            }
        }, 100);
    }
};
/* =========================================
   GSM AI RISK ANALYSIS LOGIC
   ========================================= */

// Simple string hashing function for caching
function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
}

function toggleAIArea() {
    const area = document.getElementById("gsm-ai-collapsible-area");
    const icon = document.getElementById("gsm-ai-toggle-icon");
    if (!area || !icon) return;

    if (area.style.display === "none") {
        area.style.display = "block";
        icon.style.transform = "rotate(0deg)";
    } else {
        area.style.display = "none";
        icon.style.transform = "rotate(180deg)";
    }
}

async function fetchGSMAIRiskAnalysis() {
    const content = document.getElementById("gsm-ai-analysis-content");
    const alerts = document.getElementById("gsm-ai-risk-alerts");
    const btn = document.getElementById("gsm-ai-analyze-btn");
    const timer = document.getElementById("gsm-ai-cache-timer");

    if (!content || !btn) return;

    btn.disabled = true;
    btn.textContent = "Analyzing...";

    // Ensure the area is visible when running analysis
    const area = document.getElementById("gsm-ai-collapsible-area");
    const icon = document.getElementById("gsm-ai-toggle-icon");
    if (area && area.style.display === "none") {
        area.style.display = "block";
        if (icon) icon.style.transform = "rotate(0deg)";
    }

    content.innerHTML = `<div style="display:flex; align-items:center; gap:8px;">
        <i class="fas fa-spinner fa-spin"></i> Correlating active orders with latest industry news...
    </div>`;
    alerts.innerHTML = "";
    if (timer) timer.style.display = "none";

    try {
        const sys = window.CURRENT_SYSTEM;
        if (!sys) throw new Error("Connection lost. Please refresh.");
        const base = sys.baseUrl.replace(/\/$/, "");

        // Extract currently visible orders from the table DOM
        const tbody3 = document.querySelector('.mxg-body-p3');
        const visibleRows = tbody3 ? Array.from(tbody3.querySelectorAll('tr[data-report-id]')) : [];
        const extractedOrders = visibleRows.map(tr => {
            const cells = tr.querySelectorAll('td');
            if (cells.length < 10) return null;
            return {
                customer: cells[0].textContent.replace('&#x1F6A9;', '').trim(),
                machine: cells[1].textContent.trim(),
                qty: cells[2].textContent.trim(),
                status: cells[3].textContent.trim(),
                notes: cells[4].textContent.trim(),
                target_handover: cells[7].textContent.trim(),
                days_left: cells[9].textContent.trim()
            };
        }).filter(o => o !== null);

        if (extractedOrders.length === 0) {
            content.innerHTML = `<div style="color:#f59e0b;">No orders visible to analyze. Please adjust your filters.</div>`;
            btn.disabled = false;
            btn.textContent = "Re-Analyze";
            return;
        }

        const dataPayload = JSON.stringify(extractedOrders);
        const dataHash = hashString(dataPayload);

        // 3-hour cache check (3 * 60 * 60 * 1000 = 10,800,000 ms)
        const cacheRaw = localStorage.getItem("omnis_ai_risk_cache");
        let cacheData = null;
        if (cacheRaw) {
            try { cacheData = JSON.parse(cacheRaw); } catch (e) { }
        }

        let aiResultData;
        const nowMs = new Date().getTime();
        const threeHours = 10800000;

        if (cacheData && cacheData.hash === dataHash && (nowMs - cacheData.timestamp) < threeHours) {
            console.log("Using cached AI anaylsis for this dataset.");
            aiResultData = cacheData.result;
            if (timer) {
                const minsAgo = Math.floor((nowMs - cacheData.timestamp) / 60000);
                timer.textContent = `Results from ${minsAgo} mins ago`;
                timer.style.display = "inline";
            }
        } else {
            console.log("Cache miss or expired. Fetching fresh AI analysis.");
            const res = await window.callFrappeSequenced(base, "powerstar_salestrack.omnis_dashboard.get_ai_trend_and_prediction_insights", {
                api_key: localStorage.getItem("omnis_openai_key") || "",
                filtered_orders: dataPayload
            });
            aiResultData = res.message || res;

            // Save to cache if successful
            if (aiResultData.ok) {
                localStorage.setItem("omnis_ai_risk_cache", JSON.stringify({
                    hash: dataHash,
                    timestamp: nowMs,
                    result: aiResultData
                }));
                if (timer) {
                    timer.textContent = "Fresh results captured";
                    timer.style.display = "inline";
                }
            }
        }

        const data = aiResultData;

        if (data.ok) {
            content.innerHTML = `<strong>Market Insights:</strong><br>${data.insights}`;

            if (data.risk_alerts && data.risk_alerts.length > 0) {
                alerts.innerHTML = data.risk_alerts.map(a => {
                    const severityColor = a.severity === "High" ? "#ef4444" : (a.severity === "Medium" ? "#f59e0b" : "#64748b");
                    return `<div style="background:#fef2f2; border:1px solid #fee2e2; border-radius:8px; padding:8px 12px; display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
                        <div style="font-size:13px; font-weight:600; color:#1e1b4b;">${a.order_id} at Risk</div>
                        <div style="font-size:12px; color:#64748b; flex:1; margin: 0 16px;">${a.reason}</div>
                        <span style="background:${severityColor}; color:white; padding:2px 8px; border-radius:99px; font-size:10px; font-weight:800;">${a.severity}</span>
                    </div>`;
                }).join("");
            } else {
                alerts.innerHTML = `<div style="color:#10b981; font-weight:600; font-size:13px; margin-top:8px;">... No specific order risks detected from news correlation.</div>`;
            }
        } else {
            content.textContent = "AI Analysis failed: " + (data.error || "Unknown error");
        }
    } catch (err) {
        console.error("AI Analysis Error:", err);
        content.textContent = "Error: " + err.message;
    } finally {
        btn.disabled = false;
        btn.textContent = "Re-Analyze";
    }
}

// Bind the button
function bindGsmAiRiskButton() {
    const aiBtn = document.getElementById("gsm-ai-analyze-btn");
    if (aiBtn) {
        aiBtn.addEventListener("click", fetchGSMAIRiskAnalysis);
    }
}

// expose toggle function globally
window.toggleAIArea = toggleAIArea;

// Global Initialization Handler
window.initDashboard = async function (period) {
    if (window.omnisLog) window.omnisLog("[Dashboard] initDashboard invoked for period: " + period);

    if (!window.salestrack) {
        if (window.omnisLog) window.omnisLog("[Dashboard] Creating new OmnisDashboardV6 instance...");
        window.salestrack = new window.OmnisDashboardV6();
    }

    try {
        await window.salestrack.init();
        if (period) await window.salestrack.fetchData(period);
    } catch (e) {
        console.error("[Dashboard] Boot Failure:", e);
    }
};

// Global Alias for compatibility
window.Dashboard = window.OmnisDashboardV6;

// * Auto-Boot Sequence (Failsafe)
if (document.readyState === "complete") {
    window.initDashboard("This Year");
} else {
    window.addEventListener("load", () => {
        if (!window.salestrack) window.initDashboard("This Year");
    });
}


// --- OPERATOR TRAINING PROTOTYPE METHODS ---

window.OmnisDashboardV6.prototype.openBookTrainingModal = async function(machineName, orderId, customerName) {
    let html = `
        <div style="padding:24px;">
            <h3 style="margin-top:0; color:#0f172a; margin-bottom:20px;"><i class="fas fa-user-graduate" style="color:#0891b2; margin-right:8px;"></i> Book Operator Training</h3>
            
            <div style="margin-bottom:16px;">
                <label style="display:block; font-size:12px; font-weight:700; color:#64748b; margin-bottom:4px;">Customer / Order</label>
                <input type="text" value="${customerName}" readonly style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px; font-size:13px; background:#f8fafc; color:#475569; cursor:not-allowed;">
                <input type="hidden" id="tr-order-id" value="${orderId}">
                <input type="hidden" id="tr-customer" value="${customerName}">
            </div>
            
            <div style="margin-bottom:16px;">
                <label style="display:block; font-size:12px; font-weight:700; color:#64748b; margin-bottom:4px;">Machine</label>
                <input type="text" id="tr-machine" value="${machineName}" readonly style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px; font-size:13px; background:#f8fafc; color:#475569; cursor:not-allowed;">
            </div>
            
            <div style="margin-bottom:16px;">
                <label style="display:block; font-size:12px; font-weight:700; color:#64748b; margin-bottom:4px;">Training Location <span style="color:#ef4444;">*</span></label>
                <input type="text" id="tr-location" placeholder="e.g. Customer Site, Workshop..." style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px; font-size:13px; outline:none; focus:border-blue-500;">
            </div>
            
            <div style="margin-bottom:16px; display:flex; gap:16px;">
                <div style="flex:1;">
                    <label style="display:block; font-size:12px; font-weight:700; color:#64748b; margin-bottom:4px;">Training Date <span style="color:#ef4444;">*</span></label>
                    <input type="date" id="tr-date" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px; font-size:13px; outline:none;">
                </div>
                <div style="flex:1;">
                    <label style="display:block; font-size:12px; font-weight:700; color:#64748b; margin-bottom:4px;">Number of Operators <span style="color:#ef4444;">*</span></label>
                    <input type="number" id="tr-operators" value="1" min="1" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px; font-size:13px; outline:none;">
                </div>
            </div>

            <div style="margin-bottom:24px;">
                <label style="display:block; font-size:12px; font-weight:700; color:#64748b; margin-bottom:4px;">Trainer Name</label>
                <input type="text" id="tr-trainer" placeholder="Assigned trainer..." style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px; font-size:13px; outline:none;">
            </div>
            
            <div style="display:flex; justify-content:flex-end; gap:12px;">
                <button onclick="salestrack.closeListModal()" style="padding:10px 20px; border:1px solid #cbd5e1; background:white; color:#475569; border-radius:8px; font-size:13px; font-weight:600; cursor:pointer;">Cancel</button>
                <button id="btn-save-training" onclick="salestrack.submitOperatorTraining()" style="padding:10px 24px; background:#0891b2; color:white; border:none; border-radius:8px; font-size:13px; font-weight:700; cursor:pointer; box-shadow:0 4px 6px -1px rgba(8, 145, 178, 0.2);">Save Training</button>
            </div>
        </div>
    `;
    
    this.openListModal("Book Training", html, "600px");
};

window.OmnisDashboardV6.prototype.submitOperatorTraining = async function() {
    const orderId = document.getElementById('tr-order-id').value;
    const customer = document.getElementById('tr-customer').value;
    const machine = document.getElementById('tr-machine').value;
    const location = document.getElementById('tr-location').value;
    const tDate = document.getElementById('tr-date').value;
    const operators = document.getElementById('tr-operators').value;
    const trainer = document.getElementById('tr-trainer').value;

    if (!location || !tDate || !operators) {
        alert("Location, Date, and Number of Operators are required!");
        return;
    }

    const btn = document.getElementById('btn-save-training');
    if (btn) { btn.disabled = true; btn.textContent = "Saving..."; }

    try {
        const res = await window.electron.invoke('supabase:query', {
            table: 'ft_operator_training',
            method: 'insert',
            params: {
                data: {
                    order_id: orderId,
                    customer: customer,
                    machine: machine,
                    location: location,
                    training_date: tDate,
                    number_of_operators: parseInt(operators),
                    trainer_name: trainer,
                    status: 'Planned'
                }
            }
        });

        if (!res.ok) {
            alert("Failed to save training: " + JSON.stringify(res.error || res));
        } else {
            alert("Training booked successfully!");
            this.closeListModal();
        }
    } catch(e) {
        console.error("Training booking error:", e);
        alert("Error saving training.");
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = "Save Training"; }
    }
};

// --- STOCK MAPPING METHODS ---

window.omnisFetchStockCompanyMappings = async function() {
    try {
        if (window.electron) {
            const res = await window.electron.invoke('supabase:query', {
                table: 'stock_company_mappings',
                method: 'select',
                params: {}
            });
            if (res && res.data) {
                window._stockCompanyMappings = res.data;
                return res.data;
            }
        } else if (window.salestrack && window.salestrack.supabase) {
            const { data, error } = await window.salestrack.supabase.from('stock_company_mappings').select('*');
            if (data && !error) {
                window._stockCompanyMappings = data;
                return data;
            }
        }
        return [];
    } catch(e) {
        console.error('Failed to fetch stock company mappings', e);
        return [];
    }
};

window.OmnisDashboardV6.prototype.loadStockMappings = async function() {
    const tbody = document.getElementById('stock-mappings-tbody');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding:30px; color:#94a3b8; font-style:italic; font-size:13px;"><i class="fas fa-spinner fa-spin" style="margin-right:8px;"></i> Loading mappings...</td></tr>`;

    try {
        const mappings = await window.omnisFetchStockCompanyMappings();
        
        if (!mappings || mappings.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding:30px; color:#94a3b8; font-style:italic; font-size:13px;">No mappings found. Add one below.</td></tr>`;
            return;
        }

        let html = '';
        mappings.forEach(m => {
            const isMxg = m.company === 'Machinery Exchange';
            const companyColor = isMxg ? '#2563eb' : '#b91c1c';
            const companyBg = isMxg ? '#eff6ff' : '#fef2f2';
            const logoHtml = m.logo_url ? `<img src="${m.logo_url}" style="height:24px; max-width:80px; object-fit:contain; border-radius:4px;">` : `<span style="color:#cbd5e1; font-size:10px; font-style:italic;">No logo</span>`;
            
            html += `
                <tr style="border-bottom:1px solid #f1f5f9;">
                    <td style="padding:16px 20px; font-size:14px; font-weight:800; color:#0f172a;">${m.brand}</td>
                    <td style="padding:16px 20px;">
                        <span style="background:${companyBg}; color:${companyColor}; padding:4px 10px; border-radius:6px; font-size:11px; font-weight:800; border:1px solid ${companyColor}33;">
                            ${m.company}
                        </span>
                    </td>
                    <td style="padding:16px 20px; text-align:center;">
                        ${logoHtml}
                    </td>
                    <td style="padding:16px 20px; text-align:right; display:flex; gap:8px; justify-content:flex-end;">
                        <button onclick="window.salestrack.editStockMapping('${m.brand.replace(/'/g, "\\'")}', '${m.company.replace(/'/g, "\\'")}', '${(m.logo_url || '').replace(/'/g, "\\'")}')" style="padding:6px 12px; background:white; border:1px solid #e2e8f0; border-radius:6px; color:#3b82f6; font-size:12px; font-weight:700; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.background='#eff6ff'; this.style.borderColor='#bfdbfe';" onmouseout="this.style.background='white'; this.style.borderColor='#e2e8f0';">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button onclick="window.salestrack.deleteStockMapping('${m.brand.replace(/'/g, "\\'")}')" style="padding:6px 12px; background:white; border:1px solid #e2e8f0; border-radius:6px; color:#ef4444; font-size:12px; font-weight:700; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.background='#fef2f2'; this.style.borderColor='#fecaca';" onmouseout="this.style.background='white'; this.style.borderColor='#e2e8f0';">
                            <i class="fas fa-trash-alt"></i> Delete
                        </button>
                    </td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
    } catch(e) {
        console.error("Error loading stock mappings", e);
        tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding:30px; color:#ef4444; font-size:13px;">Failed to load mappings. Check logs.</td></tr>`;
    }
};

window.OmnisDashboardV6.prototype.addStockMapping = async function() {
    const brandInput = document.getElementById('new-stock-brand');
    const companySelect = document.getElementById('new-stock-company');
    const logoInput = document.getElementById('new-stock-logo');
    
    if (!brandInput || !companySelect) return;
    
    const brandName = brandInput.value.trim();
    const company = companySelect.value;
    const logoUrl = logoInput ? logoInput.value.trim() : '';
    
    if (!brandName) {
        this.showToast ? this.showToast('Please enter a brand name.', 'error') : alert('Please enter a brand name.');
        return;
    }
    
    try {
        let ok = false;
        let errorMsg = '';
        if (window.electron) {
            const res = await window.electron.invoke('supabase:query', {
                table: 'stock_company_mappings',
                method: 'upsert',
                params: {
                    data: {
                        brand: brandName,
                        company: company,
                        logo_url: logoUrl
                    }
                }
            });
            ok = res.ok;
            errorMsg = res.error;
        } else if (window.salestrack && window.salestrack.supabase) {
            const { error } = await window.salestrack.supabase.from('stock_company_mappings').upsert({ brand: brandName, company: company, logo_url: logoUrl }, { onConflict: 'brand' });
            ok = !error;
            errorMsg = error?.message;
        } else {
            throw new Error("No database connection available");
        }
        
        if (!ok) {
            throw new Error(errorMsg || 'Failed to insert mapping');
        }
        
        brandInput.value = ''; // clear input
        if (logoInput) logoInput.value = ''; // clear logo input
        
        // Reset button text if it was changed by editStockMapping
        const btn = document.querySelector('#settings-oem-brands button[onclick*="addStockMapping"]');
        if (btn) {
            btn.innerHTML = '<i class="fas fa-plus"></i> Add Mapping';
        }
        
        this.showToast ? this.showToast('Mapping added/updated successfully.', 'success') : alert('Mapping added/updated successfully.');
        
        // Reload list and update global cache
        await this.loadStockMappings();
        await window.omnisFetchStockCompanyMappings();
        
        // Invalidate stock data cache so distribution is re-evaluated
        if (window.CURRENT_SYSTEM && window.CURRENT_SYSTEM.id) {
            localStorage.removeItem("mxg_stock_data_" + window.CURRENT_SYSTEM.id);
        }
        localStorage.removeItem("mxg_stock_pipeline_cache");
        
    } catch(e) {
        console.error("Add mapping error:", e);
        this.showToast ? this.showToast('Error: ' + e.message, 'error') : alert('Error adding mapping: ' + e.message);
    }
};

window.OmnisDashboardV6.prototype.editStockMapping = function(brand, company, logoUrl) {
    const brandInput = document.getElementById('new-stock-brand');
    const companySelect = document.getElementById('new-stock-company');
    const logoInput = document.getElementById('new-stock-logo');
    
    if (brandInput) {
        brandInput.value = brand;
        brandInput.focus();
    }
    if (companySelect) companySelect.value = company;
    if (logoInput) logoInput.value = logoUrl || '';
    
    // Optional: update button text to show it will update
    const btn = document.querySelector('#settings-oem-brands button[onclick*="addStockMapping"]');
    if (btn) {
        btn.innerHTML = '<i class="fas fa-save"></i> Update Mapping';
    }
};

window.OmnisDashboardV6.prototype.deleteStockMapping = async function(brand) {
    if (!brand) return;
    
    const confirmDelete = await this.confirm ? await this.confirm('Delete Mapping', 'Are you sure you want to delete this brand mapping?') : confirm('Are you sure you want to delete this mapping?');
    
    if (!confirmDelete) return;
    
    try {
        let ok = false;
        let errorMsg = '';
        if (window.electron) {
            const res = await window.electron.invoke('supabase:query', {
                table: 'stock_company_mappings',
                method: 'delete',
                params: {
                    match: { brand: brand }
                }
            });
            ok = res.ok;
            errorMsg = res.error;
        } else if (window.salestrack && window.salestrack.supabase) {
            const { error } = await window.salestrack.supabase.from('stock_company_mappings').delete().eq('brand', brand);
            ok = !error;
            errorMsg = error?.message;
        } else {
            throw new Error("No database connection available");
        }
        
        if (!ok) {
            throw new Error(errorMsg || 'Failed to delete mapping');
        }
        
        this.showToast ? this.showToast('Mapping deleted.', 'info') : alert('Mapping deleted.');
        
        // Reload list and update global cache
        await this.loadStockMappings();
        await window.omnisFetchStockCompanyMappings();
        
        // Invalidate stock data cache so distribution is re-evaluated
        if (window.CURRENT_SYSTEM && window.CURRENT_SYSTEM.id) {
            localStorage.removeItem("mxg_stock_data_" + window.CURRENT_SYSTEM.id);
        }
        
    } catch(e) {
        console.error("Delete mapping error:", e);
        this.showToast ? this.showToast('Error deleting mapping.', 'error') : alert('Error deleting mapping.');
    }
};




// ==========================================
// OUTBOX MANAGER (150s Recall System)
// ==========================================
window.OutboxManager = {
    queue: [],
    timer: null,
    recallWindowMs: 150000, // 150 seconds

    init() {
        if (this.timer) clearInterval(this.timer);
        this.timer = setInterval(() => this.tick(), 1000);
        this.render();
    },

    addToQueue(type, payload, displayTitle, displayDesc) {
        const item = {
            id: 'msg_' + Date.now() + '_' + Math.floor(Math.random()*1000),
            type: type, // 'email' or 'whatsapp'
            payload: payload,
            displayTitle: displayTitle,
            displayDesc: displayDesc,
            sendAt: Date.now() + this.recallWindowMs,
            status: 'pending'
        };
        this.queue.push(item);
        this.render();
        document.getElementById('omnis-outbox-manager').style.display = 'flex';
        document.getElementById('outbox-trigger-btn').style.display = 'none';
        
        if (window.salestrack && window.salestrack.showToast) {
            window.salestrack.showToast(`Queued! Sending in 150 seconds. Open Outbox to recall.`, 'success');
        }
    },

    recall(id) {
        const idx = this.queue.findIndex(i => i.id === id);
        if (idx !== -1) {
            this.queue.splice(idx, 1);
            this.render();
            if (window.salestrack && window.salestrack.showToast) {
                window.salestrack.showToast('Message Recalled Successfully', 'info');
            }
        }
    },

    async tick() {
        const now = Date.now();
        let needsRender = false;
        
        for (let i = this.queue.length - 1; i >= 0; i--) {
            const item = this.queue[i];
            if (item.status === 'pending') {
                if (now >= item.sendAt) {
                    item.status = 'sending';
                    needsRender = true;
                    this.processItem(item).then(() => {
                        this.queue = this.queue.filter(q => q.id !== item.id);
                        this.render();
                    }).catch(err => {
                        console.error('Failed to send outbox item', err);
                        item.status = 'error';
                        item.errorMsg = err.message;
                        this.render();
                    });
                } else {
                    // Just update countdown
                    needsRender = true;
                }
            }
        }
        
        if (needsRender) this.render();
    },

    async processItem(item) {
        if (!window.electron) throw new Error("Electron not available");
        
        if (item.type === 'email') {
            const res = await window.electron.invoke('email:send', item.payload);
            if (res && res.ok) {
                // Update Supabase Flag
                await window.electron.invoke('supabase:query', {
                    table: 'omnis_salestrack_notifications', method: 'upsert',
                    params: { data: { report_id: item.payload.relatedDoc, notified_email: true } }
                });
                localStorage.setItem('notified_email_' + item.payload.relatedDoc, 'true');
            } else {
                throw new Error(res?.error || 'Email send failed');
            }
        } 
        else if (item.type === 'whatsapp') {
            // Wait WhatsApp payload includes phone numbers, msg, report_id
            const res = await window.electron.invoke('whatsapp:sendMessage', item.payload);
            if (res && res.ok) {
                // Update Supabase Flag
                await window.electron.invoke('supabase:query', {
                    table: 'omnis_salestrack_notifications', method: 'upsert',
                    params: { data: { report_id: item.payload.report_id, notified_wa: true } }
                });
                localStorage.setItem('notified_wa_' + item.payload.report_id, 'true');
            } else {
                throw new Error(res?.error || 'WhatsApp send failed');
            }
        }
    },

    render() {
        const container = document.getElementById('outbox-list');
        const badge1 = document.getElementById('outbox-count-badge');
        const badge2 = document.getElementById('outbox-trigger-badge');
        const trigger = document.getElementById('outbox-trigger-btn');
        const manager = document.getElementById('omnis-outbox-manager');
        
        if (!container) return;

        const pendingCount = this.queue.filter(q => q.status === 'pending').length;
        badge1.innerText = pendingCount;
        badge2.innerText = pendingCount;

        if (this.queue.length === 0) {
            container.innerHTML = '<div style="text-align:center; padding:20px; color:#94a3b8; font-size:12px;">Queue is empty.</div>';
            if (manager.style.display === 'none') trigger.style.display = 'none';
            return;
        }

        if (manager.style.display === 'none') {
            trigger.style.display = 'flex';
        } else {
            trigger.style.display = 'none';
        }

        const now = Date.now();
        container.innerHTML = this.queue.map(item => {
            if (item.status === 'error') {
                return `
                <div style="background:#fff; border:1px solid var(--accent-red); border-radius:8px; padding:10px; display:flex; flex-direction:column; gap:8px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div style="font-weight:700; font-size:12px; color:var(--text);">${item.displayTitle}</div>
                        <span style="color:var(--accent-red); font-size:11px; font-weight:700;">Failed</span>
                    </div>
                    <div style="font-size:11px; color:#64748b;">${item.displayDesc}</div>
                    <div style="font-size:10px; color:var(--accent-red);">${item.errorMsg}</div>
                    <div style="display:flex; justify-content:flex-end;">
                        <button onclick="window.OutboxManager.recall('${item.id}')" style="background:#e2e8f0; border:none; padding:4px 8px; border-radius:4px; font-size:10px; cursor:pointer;">Dismiss</button>
                    </div>
                </div>`;
            }
            
            if (item.status === 'sending') {
                return `
                <div style="background:#fff; border:1px solid var(--border); border-radius:8px; padding:10px; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <div style="font-weight:700; font-size:12px; color:var(--text);">${item.displayTitle}</div>
                        <div style="font-size:11px; color:#64748b;">Sending...</div>
                    </div>
                    <i class="fas fa-spinner fa-spin" style="color:var(--accent-blue);"></i>
                </div>`;
            }
            
            const secondsLeft = Math.max(0, Math.ceil((item.sendAt - now) / 1000));
            
            return `
            <div style="background:#fff; border:1px solid var(--border); border-radius:8px; padding:10px; display:flex; flex-direction:column; gap:8px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div style="font-weight:700; font-size:12px; color:var(--text);">${item.displayTitle}</div>
                    <span style="color:var(--accent-orange); font-size:11px; font-weight:700;"><i class="fas fa-stopwatch"></i> ${secondsLeft}s</span>
                </div>
                <div style="font-size:11px; color:#64748b;">${item.displayDesc}</div>
                <div style="display:flex; justify-content:flex-end;">
                    <button onclick="window.OutboxManager.recall('${item.id}')" style="background:var(--accent-red); color:white; border:none; padding:4px 12px; border-radius:4px; font-size:11px; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:4px;"><i class="fas fa-undo"></i> Recall</button>
                </div>
            </div>`;
        }).join('');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if(window.OutboxManager) window.OutboxManager.init();
    }, 1000);
});

