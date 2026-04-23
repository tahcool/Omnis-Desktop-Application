
/**
 * Omnis Statistical Dashboard Logic
 * Handles fetching stats and rendering "cool" widgets.
 */
 
window.OmnisDashboardV6 = class OmnisDashboardV6 {
    constructor() {
        if (window.omnisLog) window.omnisLog("[Dashboard] OmnisDashboardV6 Constructing...", "info");
        this.data = null;
        this.selectedDate = new Date(); // Track current view date for Action Center
        
        // ⚡ Immediate Global Aliases (Self-Registration)
        window.salestrack = this;
        window.dashManager = this;
        
        // 🛠️ Listeners
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
        } catch(e) {
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

            // ✅ Dynamic Versioning from Electron
            if (window.electron && window.electron.getVersion) {
                window.electron.getVersion().then(v => {
                    const label = document.getElementById('app-version-label');
                    if (label) label.innerText = `V${v}-STABLE`;
                    
                    const sLabel = document.getElementById('update-settings-status');
                    if (sLabel) sLabel.innerText = `Version ${v} Stable`;
                });
            }

            // ✅ Update Message Listener (Toasts)
            if (window.electron && window.electron.on) {
                window.electron.on('update-message', (event, data) => {
                    // Update settings UI text if present
                    const sStatus = document.getElementById('update-settings-status');
                    if (sStatus && data.text) sStatus.innerText = data.text;

                    if (data.type === 'uptodate') {
                        this.showToast("System is up to date", "success");
                    } else if (data.type === 'available') {
                        this.showToast("New Update Found! Downloading...", "success");
                    } else if (data.type === 'error') {
                        this.showToast("Update Check Failed", "error");
                    } else if (data.type === 'downloaded') {
                        this.showToast("Update Downloaded. Restarting...", "success");
                    }
                });
            }
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

        const typeIcon = type === 'call' ? '📞' : (type === 'meetup' ? '🤝' : '📝');
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
                            <span style="color: #64748b; font-size: 13px;">•</span>
                            <span style="color: #64748b; font-size: 13px; font-weight: 500;">${type.charAt(0).toUpperCase() + type.slice(1)}</span>
                            ${item.salesperson ? `<span style="color: #64748b; font-size: 13px;">•</span> <span style="color: #0f172a; font-size: 13px; font-weight: 600;">Rep: ${item.salesperson}</span>` : ''}
                        </div>
                    </div>
                </div>

                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; margin-bottom: 24px;">
                    <div style="font-weight: 800; color: #475569; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 14px;">🧠</span> Why this is a priority
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
            this.renderLists();
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
        this.renderOEMChart();
    }

    async loadStage(period, method, label, renderCallback) {
        const CACHE_TTL = 12 * 60 * 60 * 1000; // 12 Hours
        const cacheKey = `omnis_dash_cache_${method}_${period}`;

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
        const heroCard = document.getElementById("ai-concierge-hero");
        if (!heroCard) return;
        heroCard.style.display = "flex"; // Show the UI container

        try {
            const key = localStorage.getItem("omnis_openai_key");
            const aiMethod = "/api/method/powerstar_salestrack.omnis_dashboard.get_omnis_ai_dashboard_insights";

            // Build simple payload object since callFrappeSequenced usually takes dict
            const payload = key ? { api_key: key } : {};

            const res = await window.callFrappeSequenced(this.sys.baseUrl, "powerstar_salestrack.omnis_dashboard.get_omnis_ai_dashboard_insights", payload);
            if (res && res.message && res.message.ok) {
                this.renderAIInsights(res.message);
            } else {
                document.getElementById("ai-strategic-summary").innerHTML = `<div style="color:#ef4444;">AI Insights unavailable. ${res?.message?.error || ""}</div>`;
                document.getElementById("ai-action-items").innerHTML = "";
            }
        } catch (e) {
            console.error("fetchAIInsights error:", e);
            document.getElementById("ai-strategic-summary").innerHTML = `<div style="color:#ef4444;">Failed to load AI Insights.</div>`;
            document.getElementById("ai-action-items").innerHTML = "";
        }
    }

    async fetchIndustryNews() {
        this.sys = (window.getCurrentSystem && window.getCurrentSystem()) || { baseUrl: "https://salestrack.powerstar.co.zw" };
        const listEl = document.getElementById("industry-news-list");
        if (!listEl) return;

        try {
            const key = localStorage.getItem("omnis_openai_key");
            const payload = key ? { api_key: key } : {};
            const res = await window.callFrappeSequenced(this.sys.baseUrl, "powerstar_salestrack.omnis_dashboard.get_omnis_industry_news", payload);

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
                           <span>•</span>
                           <span>${formatDate(item.published)}</span>
                       </div>
                   </div>
               </div>

               <!-- Right Column: Compact AI Impact Tag -->
               <div style="width: 340px; flex-shrink: 0;">
               ${item.impact_note ? `
                   <div style="background: #fff; border: 1px solid rgba(159, 18, 57, 0.08); border-left: 2px solid #9f1239; padding: 8px 10px; border-radius: 6px; font-size: 11.5px; color: #475569; line-height: 1.4; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
                      <div style="font-weight:800; color:#9f1239; font-size:9px; text-transform:uppercase; margin-bottom:4px; letter-spacing:0.04em; display:flex; align-items:center; gap:4px;">
                        <span>💡</span> PERSPECTIVE
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

        // 2. Efficiency Metrics
        const quoteEff = data.efficiencies?.quote ?? data.quote_efficiency;
        if (quoteEff !== undefined) {
            document.getElementById("ai-metric-quote").textContent = quoteEff + "%";
            document.getElementById("ai-metric-quote").style.color = quoteEff >= 80 ? "#4ade80" : (quoteEff >= 50 ? "#facc15" : "#f87171");
        }
        const orderEff = data.efficiencies?.order ?? data.order_efficiency;
        if (orderEff !== undefined) {
            document.getElementById("ai-metric-order").textContent = orderEff + "%";
            document.getElementById("ai-metric-order").style.color = orderEff >= 80 ? "#4ade80" : (orderEff >= 50 ? "#facc15" : "#f87171");
        }

        // 2.4 Update Action Center Month Label
        this.updateActionCenterHeader();
        this.renderWeeklyCalendar();

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
                            <div class="todo-meta">${item.subtitle} • 👤 ${item.salesperson || 'Unassigned'}</div>
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
                            <div class="todo-meta">Amount: $${item.amount || 0} • 👤 ${item.salesperson || 'Unassigned'}</div>
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
        // Render logic is now distributed in fetchData stages.
        // This method remains as a potential re-render entry point if data exists.
        if (this.data) {
            if (this.data.active_customers_total !== undefined) this.renderKPIs();
            if (this.data.orders_at_risk) this.renderRiskCard();
            if (this.data.latest_quotations) this.renderLists();
        }
    }

    // --- NEW RENDERERS ---



    renderKPIs() {
        const d = this.data;
        if (!d || !d.kpis) return;
        const k = d.kpis;

        const setText = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };

        setText('kpi-active-customers', this.formatNumber(k.active_customers_total));
        setText('kpi-quotations', this.formatNumber(k.quotations_total));
        setText('kpi-products', this.formatNumber(k.products_total));
        setText('kpi-group-sales', this.formatNumber(k.group_sales));
        setText('kpi-orders-open', this.formatNumber(k.orders_open));
        setText('kpi-orders-overdue', this.formatNumber(k.orders_overdue));

        let avg = "-";
        if (k.current_orders && k.orders_machines_total) {
            avg = (Number(k.orders_machines_total) / Number(k.current_orders)).toFixed(1);
        }
        setText('kpi-orders-avg', avg);

        setText('orders-leadtime-summary', k.leadtime_recommendation || "");
    }

    renderLists() {
        // 1. Latest Quotations
        const qBody = document.getElementById('open-quotes-body');
        if (qBody) {
            qBody.innerHTML = "";
            const quotes = this.data.latest_quotations || [];
            if (quotes.length === 0) {
                qBody.innerHTML = '<tr><td colspan="5" style="padding:10px;color:#888;">No open quotations found.</td></tr>';
            } else {
                quotes.slice(0, 10).forEach(q => {
                    const tr = document.createElement("tr");
                    tr.style.borderBottom = "1px solid #f3f4f6";
                    tr.innerHTML = `
                              <td><span class="ce-id">${q.name}</span></td>
                              <td style="padding:10px;font-weight:500;">${q.customer_name || '-'}</td>
                              <td style="padding:10px;">${this.getAgeBadge(q.transaction_date)}</td>
                              <td style="padding:10px;color:#6b7280;">${q.custom_sales_person || '-'}</td>
                              <td style="padding:10px;text-align:right;font-weight:600;">${this.formatNumber(q.grand_total)}</td>
                            `;
                    qBody.appendChild(tr);
                });
            }
        }

        // 2. Customer Enquiries
        const cesTbody = document.getElementById('open-ces-body');
        if (cesTbody) {
            cesTbody.innerHTML = "";
            const openCEs = this.data.latest_ces || [];
            if (openCEs.length === 0) {
                cesTbody.innerHTML = '<tr><td colspan="6" style="padding:10px;color:#888;">No open customer enquiries found.</td></tr>';
            } else {
                openCEs.slice(0, 10).forEach(ce => {
                    const tr = document.createElement("tr");
                    tr.style.borderBottom = "1px solid #f3f4f6";
                    tr.innerHTML = `
                      <td><span class="ce-id">${ce.name}</span></td>
                      <td style="padding:10px;font-weight:500;">${ce.customer_name || ce.party_name || '-'}</td>
                      <td style="padding:10px;color:#6b7280;" class="muted">${ce.title || '-'}</td>
                      <td style="padding:10px;">${this.getAgeBadge(ce.transaction_date)}</td>
                      <td style="padding:10px;color:#6b7280;" class="muted">${ce.custom_salesperson || '-'}</td>
                      <td style="padding:10px;color:#6b7280;" class="muted">${ce.company || '-'}</td>
                  `;
                    cesTbody.appendChild(tr);
                });
            }
        }

        // 3. Orders Preview
        const ordersPreviewDiv = document.getElementById('orders-preview-div');
        if (ordersPreviewDiv) {
            ordersPreviewDiv.innerHTML = "";
            const orders = this.data.orders_preview || [];
            if (orders.length === 0) {
                ordersPreviewDiv.innerHTML = '<div style="padding:20px;text-align:center;color:#6b7280;font-size:12px;">No active orders found in this period.</div>';
            } else {
                const table = document.createElement("table");
                table.style.width = "100%";
                table.style.borderCollapse = "collapse";
                table.innerHTML = `
                    <thead style="background:#f8fafc; font-size:10px; text-transform:uppercase; color:#64748b; font-weight:800;">
                        <tr style="border-bottom:1px solid #e2e8f0;">
                            <th style="padding:10px; text-align:left;">Order ID</th>
                            <th style="padding:10px; text-align:left;">Customer</th>
                            <th style="padding:10px; text-align:center;">Qty</th>
                            <th style="padding:10px; text-align:left;">Target</th>
                            <th style="padding:10px; text-align:left;">Status</th>
                            <th style="padding:10px; text-align:right;">Actions</th>
                        </tr>
                    </thead>
                `;
                const opBody = document.createElement("tbody");
                opBody.id = "orders-preview-body";
                table.appendChild(opBody);
                ordersPreviewDiv.appendChild(table);
                
                const fmtDate = (d) => d ? d.split(' ')[0] : '-';

                orders.forEach(o => {
                    const tr = document.createElement("tr");
                    tr.style.borderBottom = "1px solid #f1f5f9";
                    tr.style.fontSize = "12px";

                    let flags = "";
                    if (o.is_overdue) flags += '<span style="background:#fee2e2; color:#ef4444; padding:2px 6px; border-radius:4px; font-size:9px; font-weight:700;">OVERDUE</span> ';
                    else if (o.is_stale) flags += '<span style="background:#fef3c7; color:#f59e0b; padding:2px 6px; border-radius:4px; font-size:9px; font-weight:700;">STALE</span>';
                    else flags = '<span style="background:#f0fdf4; color:#22c55e; padding:2px 6px; border-radius:4px; font-size:9px; font-weight:700;">ACTIVE</span>';

                    tr.innerHTML = `
                      <td style="padding:12px 10px;"><span style="font-weight:700; color:#1e293b;">${o.id || o.name}</span></td>
                      <td style="padding:12px 10px; font-weight:500;">${o.customer_name || '-'}</td>
                      <td style="padding:12px 10px; text-align:center;"><span style="background:#f1f5f9; padding:2px 8px; border-radius:4px;">${o.total_qty || 0}</span></td>
                      <td style="padding:12px 10px; color:#64748b;">${fmtDate(o.delivery_date)}</td>
                      <td style="padding:12px 10px;">${flags}</td>
                      <td style="padding:12px 10px; text-align:right;">
                        <button type="button" onclick="salestrack.openDoc('Sales Order', '${o.name}')" style="background:white; border:1px solid #e2e8f0; color:#1e293b; padding:4px 10px; border-radius:6px; font-size:10px; font-weight:700; cursor:pointer; transition:all 0.2s;">View</button>
                      </td>
                    `;
                    opBody.appendChild(tr);
                });
            }
        }
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
                            <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:140px;">📍 ${l.territory || 'Global Market'}</span>
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
            this.openListModal(headerTitle, loaderHtml, "1200px");
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

            const { summary, rows, label } = payload;

            const effColor = summary.efficiency_pct >= 80 ? '#22c55e' : (summary.efficiency_pct >= 50 ? '#f59e0b' : '#ef4444');

            let html = `
                <div class="eff-report-container" style="padding:32px; font-family:'Inter', sans-serif;">
                    <style>
                        @media print {
                            body > *:not(#dash-generic-modal) { display: none !important; }
                            #dash-generic-modal { display: block !important; position: absolute !important; top: 0 !important; left: 0 !important; width: 100% !important; background: white !important; backdrop-filter: none !important; height: auto !important; }
                            #dash-modal-inner { width: 100% !important; max-width: none !important; max-height: none !important; border-radius: 0 !important; box-shadow: none !important; margin: 0 !important; border: none !important; }
                            #dash-modal-inner > div:first-child { display: none !important; }
                            #dash-generic-body { padding: 0 !important; overflow: visible !important; }
                            .eff-report-container { padding: 20px !important; border: 2px solid black !important; background: white !important; }
                            .eff-report-container table { border-collapse: collapse !important; border: 2px solid black !important; width: 100% !important; margin-top: 20px !important; }
                            .eff-report-container th, .eff-report-container td { border: 1px solid black !important; font-size: 11px !important; padding: 8px 10px !important; }
                            .eff-summary-grid { display: grid !important; grid-template-columns: repeat(4, 1fr) !important; gap: 0 !important; border: 2px solid black !important; background: white !important; }
                            .eff-summary-grid > div { border: 1px solid black !important; padding: 15px !important; }
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

                    <!-- Detailed Table -->
                    <div style="background:white; border:1px solid #e2e8f0; border-radius:12px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.03);">
                        <table class="eff-table" style="width:100%; border-collapse:collapse; font-size:13px; text-align:left;">
                            <thead>
                                <tr style="background:#f8fafc; border-bottom:2px solid #e2e8f0;">
                                    <th style="padding:16px 20px; font-weight:800; color:#475569; text-transform:uppercase; letter-spacing:0.05em;">Customer</th>
                                    <th style="padding:16px 20px; font-weight:800; color:#475569; text-transform:uppercase; letter-spacing:0.05em;">Machine</th>
                                    <th style="padding:16px 20px; font-weight:800; color:#475569; text-transform:uppercase; letter-spacing:0.05em;">Target Date</th>
                                    <th style="padding:16px 20px; font-weight:800; color:#475569; text-transform:uppercase; letter-spacing:0.05em;">Actual Date</th>
                                    <th style="padding:16px 20px; font-weight:800; color:#475569; text-transform:uppercase; letter-spacing:0.05em; text-align:center;">Delay (Days)</th>
                                    <th style="padding:16px 20px; font-weight:800; color:#475569; text-transform:uppercase; letter-spacing:0.05em;">Status</th>
                                    <th style="padding:16px 20px; font-weight:800; color:#475569; text-transform:uppercase; letter-spacing:0.05em; text-align:center;">Qty</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rows.map(r => `
                                    <tr style="border-bottom:1px solid #f1f5f9; transition:background 0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
                                        <td style="padding:14px 20px; font-weight:700; color:#0f172a;">${r.customer}</td>
                                        <td style="padding:14px 20px; color:#475569;">${r.machine}</td>
                                        <td style="padding:14px 20px; color:#64748b;">${r.target_date}</td>
                                        <td style="padding:14px 20px; color:#0f172a; font-weight:600;">${r.actual_date}</td>
                                        <td style="padding:14px 20px; text-align:center; font-weight:800; color:${r.delay > 0 ? '#ef4444' : (r.delay < 0 ? '#22c55e' : '#64748b')};">
                                            ${r.delay > 0 ? '+' + r.delay : r.delay}
                                        </td>
                                        <td style="padding:14px 20px;">
                                            <span style="
                                                padding:4px 10px; border-radius:6px; font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:0.05em;
                                                ${r.status === 'Early' ? 'background:#dcfce7; color:#15803d;' : (r.status === 'On Time' ? 'background:#f1f5f9; color:#475569;' : 'background:#fee2e2; color:#b91c1c;')}
                                            ">
                                                ${r.status}
                                            </span>
                                        </td>
                                        <td style="padding:14px 20px; text-align:center; font-weight:700; color:#0f172a;">${r.qty}</td>
                                    </tr>
                                `).join('')}
                                ${rows.length === 0 ? '<tr><td colspan="7" style="padding:40px; text-align:center; color:#94a3b8; font-style:italic;">No handover data found for this period.</td></tr>' : ''}
                            </tbody>
                        </table>
                    </div>

                    <div style="margin-top:24px; font-size:11px; color:#94a3b8; text-align:center;">
                        Generated via OAI · Omnis SalesTrack · ${new Date().toLocaleString()}
                    </div>
                </div>
            `;

            document.getElementById('dash-generic-body').innerHTML = html;

        } catch (e) {
            if (this._activeModalSession !== currentSession) return;
            console.error("Efficiency Report Error:", e);
            document.getElementById('dash-generic-body').innerHTML = `
                <div style="padding:60px; text-align:center; color:#ef4444;">
                    <div style="font-size:40px; margin-bottom:16px;">⚠️</div>
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
                    <div style="font-size:20px;">📂</div>
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
                <span style="opacity:0.7;">📦</span> ${lead.equipment}
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

    // NEW: High-Fidelity OEM Chart with Auto-Cycle
    renderOEMChart() {
        const container = document.getElementById('widget-oem-chart');
        if (!container) return;

        // Lifecycle: Cleanup existing interval to prevent "ghost" cycles
        if (this.oemCycleInterval) {
            clearInterval(this.oemCycleInterval);
            this.oemCycleInterval = null;
        }

        const oemData = this.data.oem_sales || [];

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
                height: 480,
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
                        // ✋ Only open the modal if the selection was a REAL user click
                        if (!event) return; 
                        
                        const oemName = labels[config.dataPointIndex];
                        if (oemName) {
                            this.openOEMBreakdownModal(oemName);
                        }
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
                        size: '72%',
                        labels: {
                            show: true,
                            name: { show: true, fontSize: '15px', fontWeight: 600, color: '#64748b', offsetY: 45 }, // More space
                            value: { show: true, fontSize: '34px', fontWeight: 800, color: '#1e293b', offsetY: -20 }, // Pushed up & slightly smaller
                            total: {
                                show: true,
                                showAlways: true,
                                label: `${series[0]} units (${totalUnits > 0 ? ((series[0] / totalUnits) * 100).toFixed(1) : 0}%)`,
                                color: '#94a3b8', // Consistent muted slate
                                fontSize: '15px',
                                fontWeight: 600,
                                formatter: () => {
                                    return labels[0];
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
            // High-Contrast Vivid Management Palette (Theme-Aligned)
            colors: ['#1e40af', '#8b2219', '#059669', '#d97706', '#7c3aed', '#db2777', '#0891b2', '#4b5563', '#1e293b']
        };

        container.innerHTML = "";
        const chart = new ApexCharts(container, options);
        chart.render();

        // 🚀 Auto-Cycle Engine with Slice Highlighting (Theme Merged)
        this.oemCycleInterval = setInterval(() => {
            if (!document.getElementById('widget-oem-chart')) {
                clearInterval(this.oemCycleInterval);
                return;
            }

            this.oemCycleIndex = (this.oemCycleIndex + 1) % labels.length;
            const currentOEM = labels[this.oemCycleIndex];
            const currentQty = series[this.oemCycleIndex];
            const currentPct = totalUnits > 0 ? ((currentQty / totalUnits) * 100).toFixed(1) : 0;

            // 🔦 Highlight the current slice (using theme-native opacity)
            const basePalette = ['#1e40af', '#8b2219', '#059669', '#d97706', '#7c3aed', '#db2777', '#0891b2', '#4b5563', '#1e293b'];
            const cycleColors = basePalette.map((c, i) => i === this.oemCycleIndex ? c : c + '22'); // 22 is ~13% opacity for a cleaner look

            chart.updateOptions({
                colors: cycleColors,
                plotOptions: {
                    pie: {
                        donut: {
                            labels: {
                                total: {
                                    label: `${currentQty} units (${currentPct}%)`,
                                    formatter: () => currentOEM
                                }
                            }
                        }
                    }
                }
            }, false, true); 
        }, 4000);
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
            inner.style.maxWidth = '1400px';
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
                shantui_report, hitachi_report, bobcat_report, customer_analysis
            } = payload;

            let html = `
                <div class="mer-report-container" style="font-family:'Inter', sans-serif; background:var(--page-bg); color:var(--text-dark);">
                    
                    <style>
                        .mer-page { background: var(--card-bg); padding: 40px; margin-bottom: 30px; box-shadow: 0 4px 20px rgba(0,0,0,0.2); border-radius:4px; min-height: 800px; display: none; border: 1px solid var(--card-border); }
                        .mer-header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid var(--glass-border); padding-bottom: 20px; margin-bottom: 30px; }
                        .mer-title { font-size: 24px; font-weight: 950; color: #fff; letter-spacing: -0.02em; }
                        .mer-subtitle { font-size: 14px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; margin-top: 4px; }
                        
                        .mer-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border-radius: 4px; overflow: hidden; }
                        .mer-table th { background: rgba(128, 0, 0, 0.4); padding: 14px 12px; text-align: left; font-weight: 850; color: white; border: 1px solid var(--glass-border); text-transform: uppercase; letter-spacing: 0.05em; font-size: 14px; }
                        .mer-table td { padding: 10px 12px; border: 1px solid var(--glass-border); color: #f8fafc; }
                        .mer-table tr:nth-child(even) { background: rgba(255, 255, 255, 0.02); }
                        .mer-table .total-row td { background: var(--accent-gradient) !important; color: white; font-weight: 900; font-size: 16px; padding: 14px 12px; }
                        
                        .brand-box { padding: 12px 20px; border-radius: 4px; font-weight: 900; display: inline-flex; align-items: center; gap: 10px; margin-bottom: 15px; background: rgba(128, 0, 0, 0.1); color: #fff; border: 1px solid var(--glass-border); }
                        .highlight-red { color: #dc2626; font-weight: 800; }
                        
                        @media print {
                            body > *:not(#dash-generic-modal) { display: none !important; }
                            #dash-generic-modal { display: block !important; position: absolute !important; top: 0 !important; left: 0 !important; width: 100% !important; background: white !important; backdrop-filter: none !important; height: auto !important; }
                            #dash-modal-inner { width: 100% !important; max-width: none !important; max-height: none !important; border-radius: 0 !important; box-shadow: none !important; margin: 0 !important; border: none !important; }
                            #dash-modal-inner > div:first-child { display: none !important; }
                            #dash-generic-body { padding: 0 !important; overflow: visible !important; }
                            .mer-report-container { padding: 20px !important; }
                            .mer-page { display: block !important; margin: 0; padding: 0; box-shadow: none !important; border-radius: 0 !important; min-height: auto; page-break-after: always; border: none !important; }
                            .mer-table { border-collapse: collapse !important; border: 2px solid black !important; width: 100% !important; margin-top: 20px !important; }
                            .mer-table th, .mer-table td { border: 1px solid black !important; font-size: 10px !important; padding: 6px 8px !important; background: transparent !important; color: black !important; }
                            .mer-title { border-bottom: 2px solid black !important; }
                            .mer-header { border-bottom: 1px solid black !important; margin-bottom: 20px !important; }
                            .no-print { display: none !important; }
                        }
                    </style>

                    <!-- PAGE 1: MANAGEMENT SUMMARY -->
                    <div class="mer-page">
                        <div class="mer-header">
                            <img src="file:///C:/Users/Administrator/omnis/assets/images/omnis-logo.png" style="height:45px;" alt="Omnis Logo" onerror="this.src='../../assets/images/omnis-logo.png'">
                            <div style="text-align:right;">
                                <div class="mer-title">QUOTES & SALES MONTHLY REPORT</div>
                                <div class="mer-subtitle">MANAGEMENT SUMMARY – ${report_month} ${report_year}</div>
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
                                ${performance_table.map(r => `
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
                                <tr class="total-row">
                                    <td>TOTAL</td>
                                    <td>-</td><td>-</td>
                                    <td>${performance_table.reduce((a, b) => a + b.prev_q, 0)}</td>
                                    <td>${performance_table.reduce((a, b) => a + b.prev_s, 0)}</td>
                                    <td>${performance_table.reduce((a, b) => a + b.curr_q, 0)}</td>
                                    <td>${performance_table.reduce((a, b) => a + b.curr_s, 0)}</td>
                                    <td>${performance_table.reduce((a, b) => a + b.ytd_q, 0)}</td>
                                    <td>${performance_table.reduce((a, b) => a + b.ytd_s, 0)}</td>
                                    <td>-</td><td>-</td>
                                </tr>
                            </tbody>
                        </table>
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
                                    <table style="width:100%; border-collapse:collapse; font-size:13px;">
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
                            </div>
                        </div>
                    </div>

                    <!-- BRAND PAGES (SHANTUI, HITACHI, BOBCAT) -->
                    ${[{ name: 'Shantui', data: shantui_report }, { name: 'Hitachi', data: hitachi_report }, { name: 'Bobcat', data: bobcat_report }].map(brand => `
                        <div class="mer-page">
                            <div class="mer-header">
                                <div class="mer-title">${(brand.name || 'OEM').toUpperCase()} REPORT</div>
                                <div style="text-align:right;"><div class="mer-subtitle">MONTHLY PERFORMANCE</div></div>
                            </div>
                            <table class="mer-table">
                                <thead><tr><th>Product Category</th><th>Model</th><th>Quotes</th><th>Orders</th></tr></thead>
                                <tbody>
                                    ${brand.data.map(d => `
                                        <tr><td>${d.category}</td><td>${d.model}</td><td style="text-align:center;">${d.quotes}</td><td style="text-align:center; font-weight:800;">${d.orders}</td></tr>
                                    `).join('')}
                                    <tr class="total-row">
                                        <td>TOTAL</td><td></td>
                                        <td style="text-align:center;">${brand.data.reduce((a, b) => a + b.quotes, 0)}</td>
                                        <td style="text-align:center;">${brand.data.reduce((a, b) => a + b.orders, 0)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    `).join('')}

                    <div class="no-print" style="position: sticky; bottom: 0; background: #f8fafc; padding: 20px 0; border-top: 1px solid #e2e8f0; width: 100%; display: flex; justify-content: center; gap: 15px; align-items: center; z-index: 10;">
                        <span id="mer-page-indicator" style="background:#f1f5f9; padding:12px 20px; border-radius:99px; font-weight:800; font-size:14px; box-shadow:0 10px 20px rgba(0,0,0,0.1); border:1px solid #cbd5e1; color:#334155;">Page 1</span>
                        <button id="btn-mer-prev" onclick="window.salestrack.changeMERPage(-1)" style="padding:12px 25px; background:#475569; color:white; border:none; border-radius:99px; font-weight:700; cursor:pointer; box-shadow:0 10px 20px rgba(0,0,0,0.2); transition:opacity 0.2s;">◀ Previous</button>
                        <button id="btn-mer-next" onclick="window.salestrack.changeMERPage(1)" style="padding:12px 25px; background:#2563eb; color:white; border:none; border-radius:99px; font-weight:700; cursor:pointer; box-shadow:0 10px 20px rgba(0,0,0,0.2); transition:opacity 0.2s;">Next ▶</button>
                        <button onclick="window.print()" style="padding:12px 25px; background:#0f172a; color:white; border:none; border-radius:99px; font-weight:700; cursor:pointer; box-shadow:0 10px 20px rgba(0,0,0,0.2); margin-left:10px;">🖨️ Export PDF</button>
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
                        <div style="font-size:40px; margin-bottom:16px;">⚠️</div>
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

        // Scroll back to top
        const container = document.getElementById('dash-generic-body');
        if (container) container.scrollTop = 0;
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
        btn.innerHTML = '⚙️ Generating PDF...';
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
            btn.innerHTML = "❌ Error";
            alert("Failed to generate PDF. See console.");
        });
    }

    async openOEMBreakdownModal(oemName, selectedPeriod = null, customStart = null, customEnd = null) {
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
            inner.style.maxWidth = '1400px';
            inner.style.height = '96%';
            inner.style.maxHeight = '96%';
        }

        try {
            const period = selectedPeriod || document.getElementById('dash-period-select')?.value || "This Year";
            const reqData = {
                oem: oemName,
                period: period
            };
            if (period === 'Custom' && customStart && customEnd) {
                reqData.custom_start = customStart;
                reqData.custom_end = customEnd;
            }
            const res = await window.callFrappeSequenced(this.sys.baseUrl, "powerstar_salestrack.omnis_dashboard.get_omnis_oem_details_v2", reqData);
            const payload = res.message || res;

            if (!payload.ok) throw new Error(payload.error || "Failed to fetch details");

            const trend = payload.trend_data || {};
            const months = payload.month_labels || [];
            const custAnalysis = payload.customer_analysis || {};
            const salesBreakdown = payload.sales_breakdown || [];
            const salesYtd = payload.all_sales_ytd || [];
            const quotesYtd = payload.all_quotes_ytd || [];
            const note = payload.most_quoted_note || "";
            const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

            // Add Title with Period Filter and Print Button
            const titleEl = document.getElementById('dash-generic-title');
            if (titleEl) {
                titleEl.innerHTML = `
                    <div style="display:flex; align-items:center; justify-content:space-between; width:100%;">
                        <div style="display:flex; align-items:center; gap:20px;">
                            <span>Management Report: ${oemName}</span>
                            <button id="btn-export-oem-pdf" style="
                                padding:6px 14px; background:#ef4444; color:white; border:none; 
                                border-radius:6px; font-size:12px; font-weight:600; cursor:pointer;
                                display:flex; align-items:center; gap:6px; transition: all 0.2s;
                            " class="no-print report-btn-print">
                                <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 012 2h-2m-2 0v5H6v-5"></path></svg>
                                Export / Print PDF
                            </button>
                        </div>
                        <div class="no-print" style="display:flex; align-items:center; gap:12px; margin-right:40px;">
                            <label style="font-size:12px; font-weight:600; color:#64748b;">Period:</label>
                            <select id="oem-period-filter" style="
                                padding:6px 12px; border:1px solid #e2e8f0; border-radius:6px; 
                                font-size:12px; font-weight:500; color:#1e293b; cursor:pointer;
                                background:white;
                            ">
                                <option value="This Month" ${period === 'This Month' ? 'selected' : ''}>This Month</option>
                                <option value="Last Month" ${period === 'Last Month' ? 'selected' : ''}>Last Month</option>
                                <option value="This Quarter" ${period === 'This Quarter' ? 'selected' : ''}>This Quarter</option>
                                <option value="This Year" ${period === 'This Year' ? 'selected' : ''}>This Year</option>
                                <option value="Last Year" ${period === 'Last Year' ? 'selected' : ''}>Last Year</option>
                                <option value="Custom" ${period === 'Custom' ? 'selected' : ''}>Custom Date Range</option>
                            </select>
                            
                            <div id="oem-custom-date-group" style="display:${period === 'Custom' ? 'flex' : 'none'}; align-items:center; gap:8px;">
                                <input type="date" id="oem-custom-start" value="${customStart || ''}" style="padding:5px; border:1px solid #e2e8f0; border-radius:4px; font-size:11px;">
                                <span style="font-size:11px; color:#64748b;">to</span>
                                <input type="date" id="oem-custom-end" value="${customEnd || ''}" style="padding:5px; border:1px solid #e2e8f0; border-radius:4px; font-size:11px;">
                                <button id="oem-custom-apply" style="padding:5px 10px; background:#3b82f6; color:white; border:none; border-radius:4px; font-size:11px; cursor:pointer;">Apply</button>
                            </div>
                        </div>
                    </div>
                `;

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
            }

            if (!document.getElementById('dash-report-print-style-v2')) {
                const style = document.createElement('style');
                style.id = 'dash-report-print-style-v2';
                style.innerHTML = `
                    /* Scrollbar & Modal Refresh */
                    #dash-generic-modal .modal-header,
                    #dash-generic-modal .modal-footer { display: none !important; }
                    #dash-generic-modal #dash-modal-inner { border: none !important; box-shadow: none !important; padding: 0 !important; overflow: hidden !important; }
                    #dash-generic-body { overflow-y: auto !important; height: 100% !important; scrollbar-width: none; }
                    #dash-generic-body::-webkit-scrollbar { display: none; }

                    .oem-tabs { display: flex; gap: 8px; border-bottom: 2px solid var(--glass-border); margin-bottom: 20px; padding: 0 10px; }
                    .oem-tab { padding: 12px 24px; border: none; background: transparent; cursor: pointer; font-weight: 600; font-size: 13px; color: var(--text-muted); border-bottom: 3px solid transparent; transition: all 0.2s; position: relative; top: 2px; }
                    .oem-tab:hover { color: var(--accent-maroon); }
                    .oem-tab.active { color: var(--accent-maroon); border-bottom-color: var(--accent-maroon); }
                    .oem-tab-content { display: none; }
                    .oem-tab-content.active { display: block; }
                    
                    .report-table { width: 100%; border-collapse: collapse; font-size: 11px; table-layout: auto; background: var(--card-bg); color: var(--text-dark); }
                    .report-table th, .report-table td { border: 1px solid var(--glass-border); padding: 8px 10px; text-align: center; }
                    .report-table th { background: rgba(255, 255, 255, 0.05); font-weight: 850; font-size: 10px; text-transform: uppercase; color: var(--text-muted); }
                    .report-table .cat-col { text-align: left; background: rgba(255, 255, 255, 0.03); min-width: 140px; font-weight: 750; font-size: 11px; white-space: nowrap; color: #fff; }
                    .report-table .month-hdr { background: #304a1a; color: #fff; font-style: italic; font-weight: 850; }
                    .report-table .ytd-hdr { background: #800000; color: #fff; font-weight: 850; }
                    .report-table .conv-hdr { background: #4a0000; color: #fff; font-weight: 850; }
                    .report-table .total-row { background: var(--accent-gradient) !important; color: #fff !important; font-weight: 900; }
                    .report-table .total-row td { color: #fff !important; background: var(--accent-gradient) !important; border: 1px solid var(--accent-maroon) !important; }
                    
                    .sub-section-title { 
                        background: #ff0000; color: #fff; padding: 8px 15px; 
                        font-weight: 800; font-size: 14px; margin-bottom: 15px; 
                        text-align: center; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                        text-transform: uppercase; letter-spacing: 0.5px;
                    }

                    @media print {
                        @page { size: landscape; margin: 0; }
                        /* Using display: none is safer for PDF engine stability than visibility: hidden */
                        body > *:not(#dash-generic-modal) { display: none !important; }
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

            let html = `
                <div id="pdf-content-wrapper" style="display:flex; flex-direction:column; gap:25px; font-family:'Inter', sans-serif; background:white; padding:10px;">
                    
                    <!-- TAB NAVIGATION -->
                    <div class="oem-tabs no-print">
                        <button class="oem-tab active" data-tab="summary">📊 Executive Summary</button>
                        <button class="oem-tab" data-tab="sales">📦 Sales Details (${payload.period_label})</button>
                        <button class="oem-tab" data-tab="quotes">💼 Quotations Details (${payload.period_label})</button>
                    </div>

                    <!-- TAB 1: EXECUTIVE SUMMARY -->
                    <div class="oem-tab-content active" data-tab-content="summary">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                            <div style="flex:1; text-align:left;">
                                <img src="file:///C:/Users/Administrator/omnis/assets/images/omnis-logo.png" loading="lazy" style="height:32px; width:auto; object-fit:contain;" alt="Omnis Logo" onerror="this.src='/assets/images/omnis-logo.png'">
                            </div>
                            <div style="flex:2; text-align:center; font-size:22px; font-weight:900; color:#1e293b; text-transform:uppercase; letter-spacing:1px;">
                                ${oemName} Performance Report<br>
                                <span style="font-size:14px; color:#ef4444;">(${(payload.period_label || 'YTD').toUpperCase()})</span>
                            </div>
                            <div style="flex:1; text-align:right; font-size:11px; color:#64748b; font-weight:600;">
                                Generated: ${today}<br>
                                Report Year: ${payload.report_year}
                            </div>
                        </div>
                        <div class="sub-section-title">${(oemName || 'OEM').toUpperCase()} QUOTES AND SALES - MONTHLY REPORT (${(payload.period_label || 'YTD').toUpperCase()})</div>
                        
                        <div style="display:flex; gap:20px; align-items: flex-start; flex-wrap: wrap; justify-content: center;">
                            <div style="flex: 2; min-width: 600px;">
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
                                            ${months.map(() => `<th>Quotes</th><th>Sales</th>`).join('')}
                                        </tr>
                                    </thead>
                                    <tbody>
            `;

            const categories = Object.keys(trend).sort();
            let totalM1Q = 0, totalM1S = 0, totalM2Q = 0, totalM2S = 0, totalM3Q = 0, totalM3S = 0;
            let totalYTDQ = 0, totalYTDS = 0;

            categories.forEach(cat => {
                const d = trend[cat];
                const m1 = d.months[months[0]] || { quotes: 0, sales: 0 };
                const m2 = d.months[months[1]] || { quotes: 0, sales: 0 };
                const m3 = d.months[months[2]] || { quotes: 0, sales: 0 };
                const ytd = d.ytd || { quotes: 0, sales: 0 };

                totalM1Q += m1.quotes; totalM1S += m1.sales;
                totalM2Q += m2.quotes; totalM2S += m2.sales;
                totalM3Q += m3.quotes; totalM3S += m3.sales;
                totalYTDQ += ytd.quotes; totalYTDS += ytd.sales;

                // Check if row has any non-zero data
                const rowTotal = m1.quotes + m1.sales + m2.quotes + m2.sales + m3.quotes + m3.sales + ytd.quotes + ytd.sales;
                if (rowTotal === 0) return;

                const mtdConv = m3.quotes > 0 ? Math.round((m3.sales / m3.quotes) * 100) : 0;
                const ytdConv = ytd.quotes > 0 ? Math.round((ytd.sales / ytd.quotes) * 100) : 0;

                html += `
                    <tr>
                        <td class="cat-col">${cat}</td>
                        <td>${m1.quotes || 0}</td><td>${m1.sales || 0}</td>
                        <td>${m2.quotes || 0}</td><td>${m2.sales || 0}</td>
                        <td>${m3.quotes || 0}</td><td>${m3.sales || 0}</td>
                        <td>${ytd.quotes || 0}</td>
                        <td>${ytd.sales || 0}</td>
                        <td>${mtdConv}%</td>
                        <td>${ytdConv}%</td>
                    </tr>
                `;
            });

            // Grand Totals
            const mtdTotalConv = totalM3Q > 0 ? Math.round((totalM3S / totalM3Q) * 100) : 0;
            const ytdTotalConv = totalYTDQ > 0 ? Math.round((totalYTDS / totalYTDQ) * 100) : 0;

            html += `
                                        <tr class="total-row">
                                            <td class="cat-col" style="background:#ff0000; color:#fff;">Total</td>
                                            <td>${totalM1Q}</td><td>${totalM1S}</td>
                                            <td>${totalM2Q}</td><td>${totalM2S}</td>
                                            <td>${totalM3Q}</td><td>${totalM3S}</td>
                                            <td>${totalYTDQ}</td>
                                            <td>${totalYTDS}</td>
                                            <td>${mtdTotalConv}%</td>
                                            <td>${ytdTotalConv}%</td>
                                        </tr>
                                    </tbody>
                                </table>

                                <!-- Sales Breakdown Table -->
                                <div style="margin-top:20px;">
                                    <div class="sub-section-title" style="width: fit-content; padding: 4px 20px;">${payload.period_label} - ${oemName} Sales Breakdown</div>
                                    <table class="report-table" style="text-align: left;">
                                        <thead>
                                            <tr>
                                                <th>Customer Name</th>
                                                <th>Order Date</th>
                                                <th>OEM</th>
                                                <th>Model</th>
                                                <th>Qty</th>
                                                <th>Description</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${salesBreakdown.length > 0 ? salesBreakdown.map(s => `
                                                <tr>
                                                    <td style="text-align:left;">${s.customer || '-'}</td>
                                                    <td>${s.order_date || '-'}</td>
                                                    <td>${oemName}</td>
                                                    <td>${s.model || '-'}</td>
                                                    <td>${s.qty || 0}</td>
                                                    <td style="text-align:left;">${s.description || '-'}</td>
                                                </tr>
                                            `).join('') : `<tr><td colspan="6">No sales recorded in this period.</td></tr>`}
                                            <tr>
                                                <td colspan="4" style="text-align:right; font-weight:700;">Total</td>
                                                <td style="font-weight:700;">${salesBreakdown.reduce((acc, s) => acc + (parseFloat(s.qty) || 0), 0)}</td>
                                                <td></td>
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
                                <div style="border:1px solid #000; padding:1px;">
                                    <div style="background:#d9d9d9; font-weight:700; text-align:center; padding:2px;">Customer Analysis</div>
                                    <table class="report-table" style="border:none;">
                                        <thead>
                                            <tr>
                                                <th style="background:#ff0000; color:#fff; text-align:left;">Customer Type</th>
                                                <th style="background:#fff;">Quantity</th>
                                                <th style="background:#fff;">%</th>
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
                                    1.) New Customer Sales Contribution % = ${custAnalysis.New.pct}% for ${months[2]} ${payload.report_year}<br>
                                    2.) Existing Customers Sales Contribution% = ${custAnalysis.Existing.pct}% for ${months[2]} ${payload.report_year}<br>
                                    3.) ${note}
                                </div>

                                <div style="display:flex; align-items:center;">
                                    <div style="background:#d9d9d9; border:1px solid #000; padding:4px 20px; font-weight:700; flex:1;">Lost Sales</div>
                                    <div style="border:1px solid #000; border-left:none; padding:4px 20px; min-width:60px; text-align:center;">0</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- TAB 2: SALES DETAILS (YTD) -->
                    <div class="oem-tab-content" data-tab-content="sales">
                        <div class="sub-section-title">ALL SALES YEAR TO DATE (${today.split(' ').pop()})</div>
                        <div style="border:1px solid #e2e8f0; border-radius:10px; overflow:hidden; max-height:600px; overflow-y:auto;">
                            <table class="report-table" style="text-align:left;">
                                <thead style="position:sticky; top:0; z-index:1;">
                                    <tr>
                                        <th>Model / Unit</th>
                                        <th>Customer</th>
                                        <th>Salesperson</th>
                                        <th style="text-align:center;">Qty</th>
                                        <th style="text-align:right;">Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${salesYtd.map((s, i) => `
                                        <tr>
                                            <td style="text-align:left; font-weight:600;">${s.model || '-'}</td>
                                            <td style="text-align:left;">${s.customer || '-'}</td>
                                            <td style="text-align:left;">${s.salesperson || '-'}</td>
                                            <td style="text-align:center; font-weight:700; color:#166534;">${s.qty || 0}</td>
                                            <td style="text-align:right;">${s.order_date || '-'}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- TAB 3: QUOTATIONS DETAILS (YTD) -->
                    <div class="oem-tab-content" data-tab-content="quotes">
                        <div class="sub-section-title">ALL QUOTATIONS YEAR TO DATE (${today.split(' ').pop()})</div>
                        <div style="border:1px solid #e2e8f0; border-radius:10px; overflow:hidden; max-height:600px; overflow-y:auto;">
                            <table class="report-table" style="text-align:left;">
                                <thead style="position:sticky; top:0; z-index:1;">
                                    <tr>
                                        <th>Ref #</th>
                                        <th>Model / Item</th>
                                        <th>Customer</th>
                                        <th>Salesperson</th>
                                        <th style="text-align:center;">Qty</th>
                                        <th style="text-align:right;">Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${quotesYtd.map((q, i) => `
                                        <tr>
                                            <td style="text-align:left; font-weight:700; color:#3b82f6;">${q.name || '-'}</td>
                                            <td style="text-align:left; font-weight:600;">${q.model || '-'}</td>
                                            <td style="text-align:left;">${q.customer || '-'}</td>
                                            <td style="text-align:left;">${q.person || '-'}</td>
                                            <td style="text-align:center; font-weight:700; color:#0369a1;">${q.qty || 0}</td>
                                            <td style="text-align:right;">${q.date || '-'}</td>
                                        </tr>
                                    `).join('')}
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

                tabButtons.forEach(button => {
                    button.addEventListener('click', () => {
                        const tabName = button.getAttribute('data-tab');
                        tabButtons.forEach(btn => btn.classList.remove('active'));
                        tabContents.forEach(content => content.classList.remove('active'));
                        button.classList.add('active');
                        const targetContent = document.querySelector(`[data-tab-content="${tabName}"]`);
                        if (targetContent) targetContent.classList.add('active');
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
                '*Machine*:', '• —', '*Status*: —', '*Target Handover date*: -', '',
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
            const notes = (r.notes || '—').trim();
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
                    <div class="icon" style="font-size:24px; margin-bottom:8px;">🚚</div>
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
                        <span style="font-size:18px;">🚚</span>
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

    openFullRiskModal() {
        const risks = this.data.orders_at_risk || [];
        let html = '<div class="risk-list">';
        risks.forEach(r => html += this._generateRiskCardHtml(r));
        html += '</div>';

        this.openListModal("⚠️ CRITICAL DELAYS (" + risks.length + ")", html);

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
                        <div class="t-icon" style="min-width:28px; height:28px; background:#fef2f2; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:14px; border:1px solid #fee2e2; color:#ef4444;">⚠️</div>
                    
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
                `<div style="font-size:10px; color:#b91c1c; background:#fee2e2; padding:2px 8px; border-radius:4px; font-weight:700; border:1px solid #fecaca; white-space:nowrap; ${flashStyle}">⚠️ Update Required (${lastUpdateText})</div>`
                :
                `<div style="font-size:10px; color:#059669; background:#d1fae5; padding:2px 6px; border-radius:4px; font-weight:600; white-space:nowrap;">✔️ Updated ${lastUpdateText}</div>`
            }
                                </div>

                                <!-- Right: Buttons -->
                                <div style="display:flex; gap:6px; flex-shrink:0; align-items:center;">
                                    ${r.status === 'Handed Over' ?
                `<div style="display:flex; align-items:center; gap:4px; font-size:10px; font-weight:700; color:#059669; background:#ecfdf5; padding:4px 8px; border-radius:6px; border:1px solid #a7f3d0;">
                                        <span>✅</span> <span>Handed Over</span>
                                        </div>`
                :
                `<button onclick="salestrack.openHandoverModal('${r.name}')" style="background:#64748b; color:white; border:none; padding:4px 8px; border-radius:6px; font-size:10px; font-weight:600; cursor:pointer; white-space:nowrap; display:flex; align-items:center; gap:4px;">
                                        <span style="font-size:12px;">⬜</span> <span>Handover</span>
                                        </button>`
            }
                                </div>
                            </div>

                            <!-- AI Insight Section -->
                            <div class="ai-insight" style="background:#fff; border:1px solid #e2e8f0; border-radius:6px; padding:6px 8px; display:flex; gap:6px; clear:both; margin-top:6px;">
                            <div style="font-size:12px;">🤖</div>
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

        let html = `<h3 class="card-title">Quote Follow-ups <span style="font-size:12px; margin-left:auto; opacity:0.5;">⏱️</span></h3><div class="followup-list" style="display:flex; flex-direction:column; gap:8px;">`;

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
                    <div class="stat-pill-icon" style="font-size: 18px; filter: drop-shadow(0 0 4px rgba(255, 215, 0, 0.4));">🏆</div>
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
                    <div class="stat-pill-icon" style="font-size: 18px; filter: drop-shadow(0 0 4px rgba(0, 191, 255, 0.4));">💎</div>
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

        // 🎯 Compute Targets & Status for Annotations
        const annotations = originalCompanies.map((company, idx) => {
            const target = targets[company] || 0;
            if (target === 0) return null;
            return {
                x: target,
                borderColor: '#ef4444',
                strokeDashArray: 4,
                label: {
                    text: `${target} UNITS (TARGET)`,
                    style: { color: '#fff', background: '#ef4444', fontSize: '9px', fontWeight: 800, padding: { left: 5, right: 5, top: 3, bottom: 3 } }
                }
            };
        }).filter(a => a);

        // 📊 Simplified Unit-Focused Labels
        const enhancedLabels = originalCompanies.map(company => {
            const ytd = data[company].ytd || 0;
            const target = targets[company] || 0;
            const pct = target > 0 ? Math.round((ytd / target) * 100) : 0;
            return [company.toUpperCase(), `${pct}% TARGET` ];
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
                fontFamily: 'Plus Jakarta Sans, sans-serif',
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
                type: 'gradient',
                gradient: {
                    shade: 'light',
                    type: "horizontal",
                    shadeIntensity: 0.25,
                    gradientToColors: undefined,
                    inverseColors: true,
                    opacityFrom: 0.85,
                    opacityTo: 1,
                    stops: [50, 0, 100, 100]
                }
            },
            annotations: {
                xaxis: annotations
            },
            dataLabels: {
                enabled: true,
                textAnchor: 'start',
                style: {
                    fontSize: '11px',
                    fontFamily: 'Plus Jakarta Sans, sans-serif',
                    fontWeight: '800',
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
                labels: { style: { fontSize: '11px', fontWeight: 600, fontFamily: 'Plus Jakarta Sans, sans-serif' } },
                axisBorder: { show: false },
                axisTicks: { show: false }
            },
            yaxis: {
                labels: { 
                    rotate: -90,
                    style: { 
                        fontSize: '13px', 
                        fontWeight: 800, 
                        fontFamily: 'Plus Jakarta Sans, sans-serif',
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
                    formatter: function(val, opt) {
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

        // Render Breakdown with Likelihood Badges in the new dedicated section
        const breakdownContainer = document.getElementById('widget-predictive-breakdown');
        if (!breakdownContainer) return;

        let breakdownHtml = `<div style="font-size:12px; font-weight:700; color:#334155; margin-bottom:12px; display:flex; align-items:center; justify-content:space-between;">
            <span style="letter-spacing:0.02em; text-transform:uppercase;">📊 Predictive Performance & Sales Breakdown</span>
            <span style="font-size:10px; color:#64748b;">*Projection based on 4-month weighted run-rate</span>
        </div><div style="display:flex; gap:20px; flex-wrap:wrap;">`;

        originalCompanies.forEach(company => {
            const ytd = data[company].ytd || 0;
            const target = targets[company] || 0;
            const projection = Math.round((ytd / 4) * 12);
            const pctOfTarget = target > 0 ? (projection / target) * 100 : 0;
            
            let status = "UNLIKELY";
            let sColor = "#ef4444";
            if (pctOfTarget >= 100) { status = "EXCEEDING"; sColor = "#10b981"; }
            else if (pctOfTarget >= 92) { status = "ON TRACK"; sColor = "#10b981"; }
            else if (pctOfTarget >= 80) { status = "PROBABLE"; sColor = "#f59e0b"; }
            else if (pctOfTarget >= 70) { status = "AT RISK"; sColor = "#f97316"; }

            const items = data[company].breakdown || [];
            
            breakdownHtml += `
                <div style="flex:1; min-width:400px; padding:16px; border:1px solid #f1f5f9; border-radius:12px; background:white; box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">
                    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px;">
                        <span style="font-size:14px; font-weight:850; color:#1e293b; letter-spacing:0.02em;">${company.toUpperCase()}</span>
                        <span style="padding:4px 12px; border-radius:99px; font-size:11px; font-weight:800; color:white; background:${sColor};">${status} (${pctOfTarget.toFixed(0)}%)</span>
                    </div>
            `;
            if (items.length > 0) {
                const LIMIT = 10;
                const visibleItems = items.slice(0, LIMIT);
                const hasMore = items.length > LIMIT;

                breakdownHtml += `
                    <div style="flex:1; min-width:200px; background:#f8fafc; padding:10px; border-radius:8px;">
                        <div style="font-size:11px; font-weight:800; color:#64748b; margin-bottom:6px; text-transform:uppercase;">${company}</div>
                        <div style="display:flex; flex-direction:column; gap:4px;">
                `;

                visibleItems.forEach(item => {
                    breakdownHtml += `
                        <div style="display:flex; justify-content:space-between; font-size:12px; color:#334155; border-bottom:1px dashed #e2e8f0; padding-bottom:2px;">
                            <span>${item.model}</span>
                            <span style="font-weight:600;">${item.qty}</span>
                        </div>
                    `;
                });

                if (hasMore) {
                    breakdownHtml += `
                      <button onclick="window.salestrack.openFullBreakdownModal('${company}')" style="
                          margin-top:8px; width:100%; padding:6px; background:#ffffff; border:1px solid #cbd5e1; 
                          border-radius:6px; font-size:11px; font-weight:700; color:#475569; cursor:pointer;
                      ">View More (${items.length - LIMIT} more)</button>
                    `;
                }

                breakdownHtml += `</div></div>`;
            }
        });

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
        // Show all on focus
        input.onfocus = () => {
            fetchSuggestions(input.value);
        };
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
                // Refresh Data
                await this.init();
            } else {
                alert("Error: " + (payload.message || "Unknown error"));
            }

        } catch (e) {
            console.error("Handover Error:", e);
            alert("Failed to process handover: " + e.message);
        } finally {
            if (btn) { btn.disabled = false; btn.textContent = "✅ Confirm Handover"; }
        }
    }

    injectModals() {
        if (document.getElementById('dash-generic-modal')) return;

        const html = `
            <div id="dash-generic-modal" style="
                display:none; position:fixed; top:0; left:0; width:100%; height:100%;
                background:rgba(0,0,0,0.5); z-index:10000; align-items:center; justify-content:center;
                backdrop-filter: blur(5px);
            ">
                <div id="dash-modal-inner" style="
                    background:white; width:90%; max-width:900px; max-height:85vh;
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

    async openOrderModal(reportId, machineId) {
        // Show loading state first
        this.openListModal("Loading Order Details...", `<div style="padding:20px; text-align:center;">Fetching details...</div>`);

        const sys = window.getCurrentSystem ? window.getCurrentSystem() : { baseUrl: "https://salestrack.powerstar.co.zw" };
        let fullDoc = null;

        try {
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
        this._currentFullDoc = fullDoc;
        this._currentOrderSnippet = order;

        // Render
        this.renderOrderModalContent(reportId, machineId, order, fullDoc, contacts);
    }

    renderOrderModalContent(reportId, machineId, order, fullDoc, contacts) {
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
                notes: order.notes
            }];
        }

        // Render Machines Table Rows
        const renderMachineRows = () => {
            if (machines.length === 0) return `<tr><td colspan="6" style="padding:16px; text-align:center; color:#64748b;">No machines found.</td></tr>`;
            return machines.map((m, i) => `
                <tr class="machine-row" data-mid="${m.name || ''}" style="background:${i % 2 === 0 ? '#ffffff' : '#f8fafc'}; border-bottom:1px solid #e2e8f0;">
                    <td style="padding:12px; border-bottom:1px solid #f1f5f9; font-size:13px; font-weight:600; color:#1e293b;">
                        ${m.item_name || m.machine || m.item || '-'}
                        <div style="font-size:10px; color:#64748b; margin-top:2px; font-weight:400;">${m.item_code || m.item || ''}</div>
                    </td>
                     <td style="padding:12px; border-bottom:1px solid #f1f5f9; font-size:12px; color:#475569; white-space:nowrap;">
                        ${m.serial_no || '-'}
                    </td>
                    <td style="padding:12px; border-bottom:1px solid #f1f5f9; font-size:13px; font-weight:600; text-align:center; color:#0f172a;">
                        ${m.qty || 1}
                    </td>
                    <td style="padding:12px; border-bottom:1px solid #f1f5f9; font-size:12px; color:#475569;">
                        ${m.target_handover_date || m.target_handover || '-'}
                    </td>
                    <td style="padding:12px; border-bottom:1px solid #f1f5f9;">
                        <input type="date" class="m-revised" value="${m.revised_handover_date || m.revised_handover || ''}" 
                               style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:12px; background:white; font-family:inherit;">
                    </td>
                    <td style="padding:12px; border-bottom:1px solid #f1f5f9;">
                         <textarea class="m-notes" rows="2" 
                                   style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:12px; font-family:inherit; resize:vertical; background:white;"
                                   placeholder="Add notes...">${m.notes || ''}</textarea>
                    </td>
                </tr>
             `).join('');
        };

        // Render Contacts Rows
        const renderContactRows = () => {
            if (contacts.length === 0) return `<tr><td colspan="5" style="text-align:center; padding:16px; color:#94a3b8; font-style:italic;">No contacts added.</td></tr>`;
            return contacts.map((c, i) => `
                <tr style="background:${i % 2 === 0 ? '#ffffff' : '#f8fafc'}; border-bottom:1px solid #e2e8f0;">
                    <td style="padding:8px;"><input type="text" data-idx="${i}" data-field="salutation" value="${c.salutation || ''}" placeholder="Title" style="width:100%; padding:8px; border:1px solid #e2e8f0; border-radius:6px; font-size:13px; background:white;"></td>
                    <td style="padding:8px;"><input type="text" data-idx="${i}" data-field="name1" value="${c.name1 || c.name || ''}" placeholder="Name" style="width:100%; padding:8px; border:1px solid #e2e8f0; border-radius:6px; font-size:13px; background:white;"></td>
                    <td style="padding:8px;"><input type="text" data-idx="${i}" data-field="phone_number" value="${c.phone_number || ''}" placeholder="Phone" style="width:100%; padding:8px; border:1px solid #e2e8f0; border-radius:6px; font-size:13px; background:white;"></td>
                    <td style="padding:8px;"><input type="text" data-idx="${i}" data-field="email_address" value="${c.email_address || ''}" placeholder="Email" style="width:100%; padding:8px; border:1px solid #e2e8f0; border-radius:6px; font-size:13px; background:white;"></td>
                    <td style="text-align:center;">
                        <button class="btn-remove-contact" data-idx="${i}" style="color:#94a3b8; background:none; border:none; cursor:pointer; font-weight:bold; padding:8px; font-size:14px; transition:color 0.2s; hover:text-red-500;">&times;</button>
                    </td>
                </tr>
            `).join('');
        };

        const content = `
           <div style="padding: 24px; display:flex; flex-direction:column; gap:24px; background:#f8fafc;">
               <!-- Header Info -->
               <div style="display:flex; justify-content:space-between; align-items:flex-start; background:white; padding:20px; border-radius:12px; border:1px solid #e2e8f0; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                    <div>
                        <div style="font-size:11px; font-weight:700; color:#64748b; margin-bottom:6px; text-transform:uppercase; letter-spacing:0.5px;">Customer</div>
                        <div style="font-size:18px; font-weight:700; color:#0f172a;">${order ? order.customer : (fullDoc ? fullDoc.customer_name : 'Unknown')}</div>
                    </div>
                    <div style="width:220px;">
                       <label style="font-size:11px; font-weight:700; color:#64748b; display:block; margin-bottom:6px; text-transform:uppercase; letter-spacing:0.5px;">Order Status</label>
                       <select id="edit-order-status" style="width:100%; padding:10px; border:1px solid #cbd5e1; border-radius:8px; font-size:14px; background:white; font-weight:600; color:#334155; cursor:pointer;">
                            <option value="New Sale" ${order && order.status === 'New Sale' ? 'selected' : ''}>New Sale</option>
                            <option value="In Progress" ${order && order.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                            <option value="On Hold" ${order && order.status === 'On Hold' ? 'selected' : ''}>On Hold</option>
                            <option value="Customer To Collect" ${order && order.status === 'Customer To Collect' ? 'selected' : ''}>Customer To Collect</option>
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
                    <div style="background:#fef2f2; color:#8b2219; font-size:20px; width:40px; height:40px; display:flex; align-items:center; justify-content:center; border-radius:10px; flex-shrink:0;">🤖</div>
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
                       <button onclick="salestrack.addMachineRow()" style="font-size:12px; background:#8b2219; color:white; border:none; padding:8px 16px; border-radius:6px; font-weight:700; cursor:pointer; box-shadow:0 1px 2px rgba(0,0,0,0.1); transition:all 0.2s;">+ Add Machine</button>
                   </div>
                   <div style="border:1px solid #e2e8f0; border-radius:8px; overflow:hidden; box-shadow:0 4px 6px -1px rgba(0,0,0,0.05); background:white;">
                       <table style="width:100%; border-collapse:collapse; font-size:13px;">
                           <thead style="background:#8b2219; color:white; font-weight:800; font-size:11px; text-transform:uppercase; letter-spacing:0.05em;">
                               <tr>
                                   <th style="padding:16px 12px; text-align:left; width:22%; color:white;">Machine / Item</th>
                                   <th style="padding:16px 12px; text-align:left; width:15%; color:white;">Serial No</th>
                                   <th style="padding:16px 12px; text-align:center; width:6%; color:white;">Qty</th>
                                   <th style="padding:16px 12px; text-align:left; width:15%; color:white;">Target Date</th>
                                   <th style="padding:16px 12px; text-align:left; width:15%; color:white;">Revised Date</th>
                                   <th style="padding:16px 12px; text-align:left; width:27%; color:white;">Status</th>
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
                        <button onclick="salestrack.addContactRow()" style="font-size:12px; background:white; color:#8b2219; border:1px solid #8b2219; padding:8px 16px; border-radius:6px; font-weight:700; cursor:pointer; transition:all 0.2s;">+ Add Contact</button>
                    </div>
                    
                    <div style="border:1px solid #e2e8f0; border-radius:8px; overflow:hidden; background:white; box-shadow:0 1px 2px rgba(0,0,0,0.05);">
                        <table style="width:100%; border-collapse:collapse; font-size:13px;">
                            <thead style="background:#8b2219; color:white; font-weight:800; font-size:11px; text-transform:uppercase; letter-spacing:0.05em; border-bottom:2px solid #641a13;">
                                <tr>
                                    <th style="padding:12px; text-align:left; width:15%; color:white;">Salutation</th>
                                    <th style="padding:12px; text-align:left; width:30%; color:white;">Name</th>
                                    <th style="padding:12px; text-align:left; width:25%; color:white;">Phone</th>
                                    <th style="padding:12px; text-align:left; width:25%; color:white;">Email</th>
                                    <th style="width:5%; color:white;"></th>
                                </tr>
                            </thead>
                            <tbody id="contacts-tbody">
                                ${renderContactRows()}
                            </tbody>
                        </table>
                    </div>
               </div>

                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:12px; border-top:1px solid #e2e8f0; padding-top:24px;">
                     <!-- Left: Delete with Safety -->
                     <div style="position:relative;">
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
                     </div>

                     <!-- Right: Standard Actions -->
                     <div style="display:flex; gap:12px;">
                        <button onclick="salestrack.closeListModal()" style="padding:12px 24px; border:1px solid #cbd5e1; background:white; color:#475569; border-radius:8px; font-size:14px; font-weight:600; cursor:pointer;">Cancel</button>
                        <button id="btn-send-whatsapp-update" onclick="salestrack.initWhatsAppUpdate('${reportId}', '${machineId}')" style="padding:12px 24px; background:#25d366; color:white; border:none; border-radius:8px; font-size:14px; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:8px; box-shadow:0 10px 15px -3px rgba(37, 211, 102, 0.2); transition:all 0.2s;">
                           <span style="font-size:18px;">💬</span> Update WhatsApp
                        </button>
                        <button id="btn-save-order-changes" class="btn-primary" style="padding:12px 32px; background:#8b2219; color:white; border:none; border-radius:8px; font-size:14px; font-weight:700; cursor:pointer; box-shadow:0 10px 15px -3px rgba(139, 34, 25, 0.25);">Save Changes</button>
                     </div>
                </div>
           </div>
       `;

        // Store contacts temporary context
        this._tempContacts = contacts;
        this.openListModal("Edit Order Details", content, "1100px");

        // Bind Listeners (Safe method for quotes)
        const btnSave = document.getElementById('btn-save-order-changes');
        if (btnSave) btnSave.onclick = () => this.saveOrderFull(reportId, machineId);

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
            <td style="padding:12px; border-bottom:1px solid #f1f5f9;"><input type="text" class="new-serial" placeholder="Serial" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:12px; background:white;"></td>
            <td style="padding:12px; border-bottom:1px solid #f1f5f9;"><input type="number" class="new-qty" value="1" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:12px; text-align:center; background:white;"></td>
            <td style="padding:12px; border-bottom:1px solid #f1f5f9;"><input type="date" class="new-target" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:12px; background:white;"></td>
            <td style="padding:12px; border-bottom:1px solid #f1f5f9;"><input type="date" class="new-revised" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:12px; background:white;"></td>
            <td style="padding:12px; border-bottom:1px solid #f1f5f9; display:flex; gap:8px; align-items:flex-start;">
                <textarea class="new-notes" rows="1" placeholder="Notes" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:12px; font-family:inherit; background:white;"></textarea>
                <button onclick="this.closest('tr').remove()" style="color:#ef4444; background:none; border:none; cursor:pointer; font-weight:bold; font-size:18px; line-height:1;">&times;</button>
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

    async saveOrderFull(reportId, machineId) {
        // 1. Get Parent Status
        const status = document.getElementById('edit-order-status').value;
        // const revised = document.getElementById('edit-order-revised').value; // OLD (single)
        // const notes = document.getElementById('edit-order-notes').value; // OLD (single)

        // 2. Gather Machines Data
        const machinesUpdates = [];
        const mRows = document.querySelectorAll('.machine-row');
        mRows.forEach(row => {
            const mid = row.dataset.mid;
            console.log("Processing Row:", mid, row);
            if (mid) {
                const rev = row.querySelector('.m-revised').value;
                const note = row.querySelector('.m-notes').value;
                machinesUpdates.push({
                    name: mid,
                    revised_handover_date: rev,
                    notes: note
                });
            } else {
                console.warn("Row missing mid!", row);
            }
        });
        console.log("Machines Updates Payload:", machinesUpdates);

        // 3. Gather New Machines
        const newMachines = [];
        document.querySelectorAll('.new-machine-row').forEach(row => {
            const item = row.querySelector('.new-item').value;
            if (item) {
                newMachines.push({
                    item: item,
                    serial_no: row.querySelector('.new-serial').value,
                    qty: row.querySelector('.new-qty').value,
                    target_handover_date: row.querySelector('.new-target').value,
                    revised_handover_date: row.querySelector('.new-revised').value,
                    notes: row.querySelector('.new-notes').value
                });
            }
        });

        // Indicate loading
        const btn = document.getElementById('btn-save-order-changes');
        if (btn) { btn.textContent = "Saving..."; btn.disabled = true; }

        try {
            const sys = window.getCurrentSystem ? window.getCurrentSystem() : { baseUrl: "https://salestrack.powerstar.co.zw" };

            // Use Custom Backend Endpoint
            // Base64 Encode payloads to bypass WAF 417 Errors on special chars
            console.log("Encoding payload with Base64...");
            // alert("DEBUG: Code override active. Saving..."); // Temporary debug

            const safeEncode = (obj) => {
                try {
                    return btoa(unescape(encodeURIComponent(JSON.stringify(obj || []))));
                } catch (e) { return "[]"; }
            };

            // BYPASS MAIN.JS AXIOS TO FIX 417 EXPECT ERROR
            // Browser fetch does not send Expect: 100-continue, unlike the stale main.js process
            console.log("Using Direct Fetch Bypass for Save... ReportID:", reportId);
            
            if (!reportId) {
                console.error("CRITICAL: saveOrderFull called without a valid Report ID!");
                this.showToast("Save Failed: Missing Report ID in context", "error");
                if (btn) { btn.textContent = "Save Changes"; btn.disabled = false; }
                return;
            }

            const params = new URLSearchParams();
            // params.append('cmd', 'powerstar_salestrack.omnis_dashboard.update_order_details_v2'); // Not needed if in URL
            params.append('report_id', reportId || "");
            params.append('machine_id', machineId || "");
            params.append('status', status || "");
            params.append('contacts', safeEncode(this._tempContacts || []));
            params.append('machines', safeEncode(machinesUpdates));
            params.append('new_machines', safeEncode(newMachines));
            // params.append('notes', ""); // Legacy

            const url = (sys.baseUrl || "https://salestrack.powerstar.co.zw") + "/api/method/powerstar_salestrack.omnis_dashboard.update_order_details_v2";

            const res = await window.callFrappeSequenced(sys.baseUrl || "https://salestrack.powerstar.co.zw", "powerstar_salestrack.omnis_dashboard.update_order_details_v2", Object.fromEntries(params));
            const payload = res.message || res;
            if (payload && payload.ok) {
                this.showToast("Order Saved Successfully", "success");
                this.closeListModal();
                const refreshBtn = document.getElementById('ol-refresh-btn');
                if (refreshBtn) refreshBtn.click();
                else if (window.loadOrdersList) window.loadOrdersList(true);
            } else {
                throw new Error("Save Failed: " + (payload?.error || JSON.stringify(payload)));
            }

        } catch (e) {
            console.error("Save Error", e);
            alert("Error saving: " + e.message);
            if (btn) { btn.textContent = "Save Changes"; btn.disabled = false; }
        }
    }


    showToast(msg, type = 'success') {
        let toast = document.getElementById('dash-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'dash-toast';
            toast.style.cssText = `
                position: fixed; bottom: 20px; right: 20px; z-index: 9999;
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
        if (!confirm("Are you absolutely sure via Browser Check?")) return; // Extra safety layer (optional, but good for "Red Button")

        this.showToast("Deleting Order...", "error"); // Orange/Red toast

        try {
            const sys = window.getCurrentSystem ? window.getCurrentSystem() : { baseUrl: "https://salestrack.powerstar.co.zw" };

            const res = await window.callFrappeSequenced(sys.baseUrl, "powerstar_salestrack.omnis_dashboard.delete_order", {
                report_id: reportId
            });

            const payload = res.message || res;

            if (payload.ok) {
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

            // Provide feedback
            msgEl.style.display = 'block';
            msgEl.style.background = '#f0fdf4';
            msgEl.style.color = '#15803d';
            msgEl.style.border = '1px solid #bbf7d0';
            msgEl.textContent = '✅ Settings saved successfully!';

            setTimeout(() => {
                msgEl.style.display = 'none';
            }, 3000);

            this.showToast("Settings Saved", "success");
        } catch (e) {
            console.error("Save Settings Error", e);
            msgEl.style.display = 'block';
            msgEl.style.background = '#fef2f2';
            msgEl.style.color = '#b91c1c';
            msgEl.style.border = '1px solid #fecaca';
            msgEl.textContent = '❌ Failed to save settings.';
        }
    }

    loadSettings() {
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
            container.innerHTML = '<div style="padding:40px; text-align:center; color:#94a3b8;">No error logs found. System is healthy! ✅</div>';
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

            msgEl.style.display = 'block';
            if (res.ok) {
                msgEl.style.background = '#f0fdf4';
                msgEl.style.color = '#15803d';
                msgEl.style.border = '1px solid #bbf7d0';
                msgEl.textContent = '✅ Connection successful! Your API key is valid.';
                this.showToast("API Key Validated", "success");
            } else {
                // If it's a 404 model not found, the key itself IS valid, just restricted models.
                if (data.error && data.error.code === 'model_not_found') {
                    msgEl.style.background = '#f0fdf4';
                    msgEl.style.color = '#15803d';
                    msgEl.style.border = '1px solid #bbf7d0';
                    msgEl.textContent = '✅ API key is valid (Model access restricted: ' + (data.error.message || 'model_not_found') + ')';
                    this.showToast("API Key Validated", "success");
                } else {
                    msgEl.style.background = '#fef2f2';
                    msgEl.style.color = '#b91c1c';
                    msgEl.style.border = '1px solid #fecaca';
                    msgEl.textContent = '❌ ' + (data.error ? data.error.message : 'Connection failed.');
                    this.showToast("Connection Failed", "error");
                }
            }

        } catch (e) {
            console.error("Test Connection Error", e);
            msgEl.style.display = 'block';
            msgEl.style.background = '#fef2f2';
            msgEl.style.color = '#b91c1c';
            msgEl.style.border = '1px solid #fecaca';
            msgEl.textContent = '❌ Connection error: ' + e.message;
            this.showToast("Error testing key", "error");
        } finally {
            btn.innerHTML = originalBtnContent;
            btn.disabled = false;
        }
    }

    /* ---------- WHATSAPP BUILT-IN INTEGRATION LOGIC ---------- */
    
    // Listen for WhatsApp Events from Electron
    initWhatsAppListeners() {
        if (window.electron && window.electron.on) {
            window.electron.removeAllListeners('whatsapp:qr');
            window.electron.removeAllListeners('whatsapp:status');

            window.electron.on('whatsapp:qr', (event, qr) => {
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
            });

            window.electron.on('whatsapp:status', (event, status) => {
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
                            displayStatus = 'INIT ERROR';
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
                const logoutBtn = document.getElementById('wa-settings-logout');
                
                if (settingsText) settingsText.innerText = status;
                if (settingsIcon) {
                    settingsIcon.style.color = (status === 'CONNECTED' ? '#25D366' : '#64748b');
                    if (status === 'CONNECTED') {
                        settingsIcon.style.borderColor = '#25D366';
                        settingsIcon.style.background = '#f0fdf4';
                    } else {
                        settingsIcon.style.borderColor = '#e2e8f0';
                        settingsIcon.style.background = 'white';
                    }
                }
                if (logoutBtn) {
                    logoutBtn.style.display = (status === 'CONNECTED' ? 'block' : 'none');
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
        if (!confirm("Are you sure you want to logout of WhatsApp and unlink this device?")) return;
        
        try {
            if (window.omnisLog) window.omnisLog("[WhatsApp] Requesting session logout...");
            const res = await window.electron.invoke('whatsapp:logout');
            if (res.ok) {
                if (window.omnisLog) window.omnisLog("[WhatsApp] Logged out successfully.", "success");
            }
        } catch (err) {
            console.error("Logout Error:", err);
            if (window.omnisLog) window.omnisLog("WhatsApp Logout Error: " + err.message, "error");
        }
    }

    async initWhatsAppUpdate(reportId, machineId) {
        if (!window.electron) {
            console.error("WhatsApp built-in requires Desktop environment");
            return;
        }

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
        this.sendWhatsAppUpdate(document.getElementById('btn-send-whatsapp-update'));
    }

    async sendWhatsAppUpdate(btn) {
        const originalHtml = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Preparing...`;

        try {
            const orderStatus = document.getElementById('edit-order-status')?.value || "In Progress";
            
            // 1. Extract All Valid Contacts
            const sentToNames = [];
            const validContacts = [];
            
            const contactRows = document.querySelectorAll('#contacts-tbody tr');
            for (let row of contactRows) {
                const sInp = row.querySelector('input[data-field="salutation"]');
                const nInp = row.querySelector('input[data-field="name1"]');
                const pInp = row.querySelector('input[data-field="phone_number"]');
                
                const sVal = sInp ? sInp.value.trim() : "";
                const nVal = nInp ? nInp.value.trim() : "";
                const pVal = pInp ? pInp.value.trim() : "";
                
                if (pVal && pVal !== "Phone") {
                    validContacts.push({
                        phone: pVal,
                        salutation: sVal,
                        name: nVal || "Valued Customer"
                    });
                    sentToNames.push(nVal || "Valued Customer");
                }
            }

            if (validContacts.length === 0) throw new Error("No customer phone numbers found in contacts.");

            // 2. Extract Machines
            const machines = [];
            document.querySelectorAll('#machines-tbody tr').forEach(row => {
                if (row.cells.length < 5) return;
                
                const nameCell = row.cells[0];
                const qtyCell = row.cells[2];
                const targetCell = row.cells[3];
                const revisedInp = row.querySelector('.m-revised');
                const notesInp = row.querySelector('.m-notes');
                
                const mNameRaw = nameCell ? nameCell.innerText.trim().split('\n')[0] : "Unknown Machine";
                const mQty = qtyCell ? qtyCell.innerText.trim() : "1";
                const mTarget = targetCell ? targetCell.innerText.trim() : "-";
                const mRevised = revisedInp ? revisedInp.value : "";
                const mNotes = notesInp ? notesInp.value.trim() : "";
                
                if (mNameRaw && mNameRaw !== "Machine / Item") {
                    machines.push({
                        name: mNameRaw,
                        qty: mQty,
                        target: mTarget,
                        revised: mRevised,
                        notes: mNotes
                    });
                }
            });

            // 3. Send to each contact
            const customerName = document.querySelector('div[style*="font-size:18px; font-weight:700;"]') ?.textContent.trim() || "Customer";
            
            for (const contact of validContacts) {
                const greetingName = contact.salutation ? `${contact.salutation} ${contact.name}` : contact.name;
                let customerMsg = `Dear *${greetingName}*,\n\nPlease see below details of your order:\n\n*Machine*:\n`;
                
                machines.forEach((m, idx) => {
                    const dateToShow = m.revised ? `${m.revised} (Revised)` : m.target;
                    const displayStatus = m.notes || orderStatus;
                    customerMsg += `${idx + 1}) ${m.name} x${m.qty}\n   *Status*: ${displayStatus}\n   *Target Handover*: ${dateToShow}\n\n`;
                });
                
                if (window.omnisLog) window.omnisLog(`[WhatsApp] Sending to ${contact.name} (${contact.phone})...`);
                const res = await window.electron.invoke('whatsapp:send-msg', { to: contact.phone, body: customerMsg });
                if (!res.ok) console.warn(`Failed to send to ${contact.name}: ${res.error}`);
            }

            // 4. Construct Internal Group Message
            const company = this._currentFullDoc?.company || "";
            let teamLabel = "Team";
            if (company.includes("Machinery Exchange")) teamLabel = "Machinery Exchange Team";
            else if (company.includes("Sinopower")) teamLabel = "Sinopower Team";
            else if (company.includes("Industrial Equipment")) teamLabel = "Industrial Equipment Group Team";

            let groupMsg = `Hi *${teamLabel}*,\n\n`;
            groupMsg += `*Internal Update*: An order update for *${customerName}* has been sent.\n\n`;
            
            // Recipients List
            groupMsg += `*Recipients*:\n`;
            sentToNames.forEach(name => {
                groupMsg += `• ${name}\n`;
            });
            groupMsg += `\n`;

            groupMsg += `*Current Status*: ${orderStatus}\n`;

            // Days Left Flagging
            const daysLeft = this._currentOrderSnippet?.days_left || "";
            if (daysLeft !== "") {
                const daysInt = parseInt(daysLeft);
                const flag = daysInt < 0 ? "🚩 OVERDUE" : (daysInt <= 7 ? "⚠️ SOON" : "✅");
                groupMsg += `*Days Left*: ${daysLeft} ${flag}\n`;
            }

            // Extract unique non-empty notes from machines
            const allNotes = machines.map(m => m.notes).filter(n => n && n.trim() !== "");
            if (allNotes.length > 0) {
                const uniqueNotes = [...new Set(allNotes)];
                groupMsg += `*Notes*: ${uniqueNotes.join("; ")}\n`;
            }

            groupMsg += `\n*Machine Details*:\n`;
            
            machines.forEach((m, idx) => {
                const dateToShow = m.revised ? `${m.revised} (Revised)` : m.target;
                groupMsg += `${idx + 1}) ${m.name} x${m.qty} (Target: ${dateToShow})\n`;
            });

            if (window.omnisLog) window.omnisLog("[WhatsApp] Group Message Preview:\n" + groupMsg);

            // 5. Send to Group
            const resGroup = await window.electron.invoke('whatsapp:send-to-group', { groupName: "IEG | Order Updates", body: groupMsg });
            if (!resGroup.ok) throw new Error("Failed to send to group: " + resGroup.error);

            btn.innerHTML = `<span>✅</span> Sent!`;
            if (window.omnisLog) window.omnisLog("[WhatsApp] Order update sent successfully.");
            setTimeout(() => { btn.disabled = false; btn.innerHTML = originalHtml; }, 3000);
        } catch (err) {
            console.error("WhatsApp Error: " + err.message);
            if (window.omnisLog) window.omnisLog("WhatsApp Error: " + err.message, "error");
            btn.disabled = false;
            btn.innerHTML = `<span>❌</span> Error`;
            setTimeout(() => { btn.innerHTML = originalHtml; }, 3000);
        }
    }
}

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
                customer: cells[0].textContent.replace('🚩', '').trim(),
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
                alerts.innerHTML = `<div style="color:#10b981; font-weight:600; font-size:13px; margin-top:8px;">✅ No specific order risks detected from news correlation.</div>`;
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
window.initDashboard = async function(period) {
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

// ⚡ Auto-Boot Sequence (Failsafe)
if (document.readyState === "complete") {
    window.initDashboard("This Year");
} else {
    window.addEventListener("load", () => {
        if (!window.salestrack) window.initDashboard("This Year");
    });
}
