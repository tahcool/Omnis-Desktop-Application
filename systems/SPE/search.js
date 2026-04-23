/**
 * SPE Parts & Dimensions Search Logic
 */

// Baseline Mock Data (Always available for fallback)
const MOCK_DATA = [
    {
        part_number: 'HYD-CYL-80',
        part_name: 'Hydraulic Cylinder',
        main_component: 'Actuators',
        model_name: 'MX-450 Forklift',
        stock: 'in-stock',
        icon: '⚙️',
        qty: 5
    },
    {
        part_number: 'BOLT-HEX-M12',
        part_name: 'Hex Bolt M12',
        main_component: 'Fasteners',
        model_name: 'General',
        stock: 'in-stock',
        icon: '🔩',
        qty: 50
    },
    {
        part_number: 'UPP-ARM-MX',
        part_name: 'Upper Control Arm',
        main_component: 'Suspension',
        model_name: 'MX-450 Forklift',
        stock: 'limited',
        icon: '🛠️',
        qty: 2
    },
    {
        part_number: 'GR-TRAN-200',
        part_name: 'Drive Gear',
        main_component: 'Transmission',
        model_name: 'T-800 Tractor',
        stock: 'limited',
        icon: '⚙️',
        qty: 1
    }
];

const S = {
    searching: false,
    results: MOCK_DATA, // Start with mock data as baseline
    showDimensions: false,
    showTrending: false,
    // Try multiple possible module paths based on folder structure
    apiUrls: [
        'https://omnis.spareparts-exchange.com/api/method/mxg_omnis.parts_api.get_om_parts',
        'https://omnis.spareparts-exchange.com/api/method/fleetrack.parts_api.get_om_parts',
        'https://omnis.spareparts-exchange.com/api/method/mxg_fleet_track.parts_api.get_om_parts'
    ],
    restUrl: 'https://omnis.spareparts-exchange.com/api/resource/OM%20Part'
};

const E = {};

document.addEventListener('DOMContentLoaded', () => {
    initSPE();
});

function initSPE() {
    // Cache Elements
    E.searchInput = document.getElementById('parts-search-input');
    E.dimToggle = document.getElementById('dimension-toggle');
    E.dimPanel = document.getElementById('dimension-panel');
    E.resultsGrid = document.getElementById('results-grid');
    E.resultsTitle = document.getElementById('results-title');
    E.resultsCount = document.getElementById('results-count');
    E.resultsSection = document.getElementById('results-section');
    E.trendingToggleBtn = document.getElementById('toggle-trending-btn');

    // Setup Event Listeners
    if (E.dimToggle) {
        E.dimToggle.addEventListener('change', (e) => {
            toggleDimensions(e.target.checked);
        });
    }

    if (E.searchInput) {
        E.searchInput.addEventListener('input', debounce((e) => {
            performSearch(e.target.value);
        }, 300));
    }

    if (E.trendingToggleBtn) {
        E.trendingToggleBtn.addEventListener('click', () => {
            toggleTrending();
        });
    }

    // Logout Listener
    const logoutBtn = document.getElementById('spe-logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm('Sign out of Omnis?')) {
                localStorage.clear();
                sessionStorage.clear();
                window.location.href = '../../index.html';
            }
        });
    }

    // Status & Load
    initStatusIndicators();
    loadInitialData();
    initDynamicHero();
}

function initStatusIndicators() {
    updateSyncTime();
    window.addEventListener('online', updateConnectivity);
    window.addEventListener('offline', updateConnectivity);
    setInterval(updateSyncTime, 60000);
}

function updateSyncTime() {
    const el = document.getElementById('sync-time-val');
    if (!el) return;
    const now = new Date();
    el.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function updateConnectivity() {
    const dot = document.getElementById('conn-dot');
    const text = document.getElementById('conn-status');
    if (!dot || !text) return;

    if (navigator.onLine) {
        dot.className = 'status-dot online';
        text.textContent = 'Connected';
    } else {
        dot.className = 'status-dot offline';
        text.textContent = 'Offline';
    }
}

function initDynamicHero() {
    const words = ["Parts", "Filters", "Fans", "Bolts", "Pistons"];
    const span = document.getElementById('dynamic-word');
    if (!span) return;

    let index = 0;
    setInterval(() => {
        span.style.opacity = '0';
        span.style.transform = 'translateY(-20px)';

        setTimeout(() => {
            index = (index + 1) % words.length;
            span.textContent = words[index];
            span.style.transition = 'none';
            span.style.transform = 'translateY(20px)';
            void span.offsetHeight;
            span.style.transition = '';
            span.style.opacity = '1';
            span.style.transform = 'translateY(0)';
        }, 500);
    }, 4000);
}

function toggleDimensions(show) {
    S.showDimensions = show;
    if (show) {
        E.dimPanel.classList.remove('hidden');
        E.dimPanel.style.display = 'block';
    } else {
        E.dimPanel.classList.add('hidden');
        setTimeout(() => {
            if (!S.showDimensions) E.dimPanel.style.display = 'none';
        }, 400);
    }
}

function toggleTrending() {
    S.showTrending = !S.showTrending;

    if (S.showTrending) {
        E.resultsSection.classList.remove('hidden');
        E.trendingToggleBtn.querySelector('.btn-text').textContent = 'Hide Trending Parts';
        E.trendingToggleBtn.querySelector('.btn-icon').textContent = '📉';
        document.querySelector('.spe-main').style.justifyContent = 'flex-start';
        document.querySelector('.spe-hero').style.paddingTop = '60px';
        loadInitialData();
    } else {
        E.resultsSection.classList.add('hidden');
        E.trendingToggleBtn.querySelector('.btn-text').textContent = 'Show Trending Parts';
        E.trendingToggleBtn.querySelector('.btn-icon').textContent = '📈';
        document.querySelector('.spe-main').style.justifyContent = 'center';
        document.querySelector('.spe-hero').style.paddingTop = '40px';
    }
}

async function loadInitialData() {
    if (!S.showTrending && !S.searching) return;

    for (const url of S.apiUrls) {
        try {
            console.log("Fetching trending parts via GET:", url);

            const headers = { 'Accept': 'application/json' };
            // Try to add CSRF token if available (handles logged-in Electron case)
            if (window.csrf_token && window.csrf_token !== 'None') {
                headers['X-Frappe-CSRF-Token'] = window.csrf_token;
            }

            const response = await fetch(url, {
                method: 'GET',
                headers: headers,
                // If we have a token, we likely want to send cookies (include). 
                // If not, 'omit' to be safe as guest.
                credentials: (window.csrf_token && window.csrf_token !== 'None') ? 'include' : 'omit'
            });

            if (response.ok) {
                const result = await response.json();
                if (result.message && result.message.data) {
                    S.results = result.message.data;
                    renderResults(S.results);
                    // Update active URL if successful for future searches
                    S.activeUrl = url;
                    return;
                }
            }
        } catch (err) {
            console.warn(`Failed to fetch from ${url}:`, err);
        }
    }
    console.warn("All Server endpoints failed. Using local baseline.");

    // Fallback to baseline
    S.results = MOCK_DATA;
    renderResults(MOCK_DATA);
}

async function performSearch(query) {
    if (!query && !S.showDimensions) {
        S.searching = false;
        if (!S.showTrending) {
            E.resultsSection.classList.add('hidden');
            document.querySelector('.spe-main').style.justifyContent = 'center';
        } else {
            loadInitialData();
        }
        return;
    }

    S.searching = true;
    E.resultsSection.classList.remove('hidden');
    document.querySelector('.spe-main').style.justifyContent = 'flex-start';
    E.resultsTitle.textContent = query ? `Search Results for "${query}"` : "Filtered Results";
    E.resultsGrid.innerHTML = '<div class="loading-state">Searching catalog...</div>';

    try {
        const targetUrl = S.activeUrl || S.apiUrls[0];
        console.log(`[DEBUG] performSearch called for "${query}"`);
        console.log(`[DEBUG] CSRF Token present: ${!!(window.csrf_token && window.csrf_token !== 'None')}`);

        console.log(`Searching via Custom API: ${targetUrl}`);

        const response = await fetch(`${targetUrl}?query=${encodeURIComponent(query)}`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            credentials: (window.csrf_token && window.csrf_token !== 'None') ? 'include' : 'omit'
        });

        if (response.ok) {
            const result = await response.json();
            if (result.message && result.message.data) {
                console.log("Custom API Success");
                renderResults(result.message.data);
                return;
            }
        }

        console.warn(`Custom API failed (${response.status}). Attempting Authenticated RPC Fallback...`);

        // Authenticated RPC Fallback (The "Nuclear Option" for logged-in users)
        if (window.csrf_token && window.csrf_token !== 'None') {
            const rpcUrl = 'https://omnis.spareparts-exchange.com/api/method/frappe.client.get_list';
            console.log(`[DEBUG] Attempting RPC to ${rpcUrl}`);

            const rpcResponse = await fetch(rpcUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Frappe-CSRF-Token': window.csrf_token
                },
                body: JSON.stringify({
                    doctype: 'OM Part',
                    fields: ['name', 'part_name', 'part_number', 'model', 'qty', 'stock', 'image', 'main_component'],
                    filters: [['part_name', 'like', `%${query}%`]],
                    or_filters: [['part_number', 'like', `%${query}%`]],
                    limit_page_length: 50
                }),
                credentials: 'include'
            });

            if (rpcResponse.ok) {
                const rpcResult = await rpcResponse.json();
                if (rpcResult.message) {
                    console.log("Authenticated RPC Success");
                    const normalized = rpcResult.message.map(p => ({
                        ...p,
                        model_name: p.model || 'General'
                    }));
                    renderResults(normalized);
                    return;
                }
            } else {
                console.warn(`RPC Fallback failed (${rpcResponse.status}).`);
            }
        }

    } catch (err) {
        console.warn("Online Search failed. Using local filter.", err);
    }

    // Local filter fallback (runs ONLY if fetch fails)
    // Local filter fallback (runs ONLY if fetch fails)
    setTimeout(() => {
        console.log("Filtering local results for:", query);
        const title = query ? `Search Results for "${query}"` : "Filtered Results";
        E.resultsTitle.innerHTML = title + ' <span style="font-size: 12px; color: var(--spe-orange); vertical-align: middle; margin-left: 10px;">(Offline Catalog)</span>';

        const results = S.results.filter(p =>
            p.part_name.toLowerCase().includes(query.toLowerCase()) ||
            p.part_number.toLowerCase().includes(query.toLowerCase()) ||
            (p.model_name || "").toLowerCase().includes(query.toLowerCase())
        );
        renderResults(results);
    }, 200);
}

function renderResults(parts) {
    if (!E.resultsGrid) return;

    if (parts.length === 0) {
        E.resultsGrid.innerHTML = '<div class="loading-state">No parts found matching your criteria.</div>';
        E.resultsCount.textContent = '0 items found';
        return;
    }

    E.resultsCount.textContent = `Showing ${parts.length} items`;

    E.resultsGrid.innerHTML = parts.map(p => `
        <div class="part-card" onclick="openPartDetail('${p.part_number}')">
            <span class="stock-badge badge-${p.stock || 'limited'}">${(p.stock || 'limited').replace('-', ' ')}</span>
            <div class="part-card-img">${p.icon || '⚙️'}</div>
            <div class="part-info">
                <div class="part-model-tag">${p.model_name || 'General'}</div>
                <h3>${p.part_name}</h3>
                <div class="part-number">P/N: <span>${p.part_number}</span></div>
                <div class="part-meta">
                    <span class="meta-item">Comp: ${p.main_component || 'General'}</span>
                    <span class="meta-item">Qty req: ${p.qty || 1}</span>
                </div>
            </div>
        </div>
    `).join('');
}

function openPartDetail(id) {
    console.log("Opening part details for:", id);
}

function debounce(func, wait) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}
